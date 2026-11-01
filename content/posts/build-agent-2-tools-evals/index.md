---
title: 把 Agent 做可靠：工具、上下文与评测
date: 2026-11-01
tags: [Agent, 工程, 评测]
collection: build-agent
order: 2
summary: 工具怎么设计、上下文怎么裁剪、失败怎么停、效果怎么量：把能跑的 demo 变成能交付的 Agent。
alt: 深蓝格纸上几枚蓝色节点由细线相连，左侧是白色标题“把 Agent 做可靠”
---

第一篇的 Agent 在演示里能跑，换几个问题就露馅：该查天气的时候去算算术，参数少一个字段，工具报错后它继续用同样的参数重试，对话一长就忘了前面查过什么。你问它“行不行”，它总能给一个像样的回答；但你没有证据。

可靠性不是靠换一个更强的模型自动获得的。它来自一圈工程约束：工具怎么描述、上下文怎么裁、失败怎么停、效果怎么量。这一篇按这四件事往下走，代码仍然接着第一篇的 `Tool` 和 `Agent` 改。

## 工具是给模型用的接口，不是 API 的包装

很多人的第一个工具，是把内部 API 原样包一层：`search(query)`、`get_user(id)`、`update_record(payload)`。对人来说够用，对模型来说信息太少：搜什么、返回多少条、`id` 是用户名还是数据库主键、`payload` 里哪些字段必填，全靠猜。

Anthropic 在《Writing effective tools for agents》里给了一条很实用的标准：**为 Agent 的工作流设计工具，而不是为现有 API 做一层薄包装**。能合并的就合并，比如用 `schedule_event` 代替“列出日程”和“创建日程”两个工具；工具名要能看出归属，比如 `asana_search` 和 `jira_search`；描述要像给新同事写交接文档，把隐藏约定、查询格式、边界条件都写出来。

几个具体的改法：

| 不好的写法 | 模型会怎么误解 | 更好的写法 |
| --- | --- | --- |
| `search(q)` | 不知道搜什么库、返回多少条 | `search_notes(query, limit=5)` |
| `user` | 是名字、ID 还是整个对象 | `user_id`，并在描述里给示例 |
| 返回整行数据库记录 | 上下文被无关字段撑爆 | 只返回标题、摘要、链接 |
| `Error 500` | 不知道该改参数还是该放弃 | `缺少 city；请传城市名，例如 北京` |
| 让模型自己拼 SQL | 注入、越权、语法错误 | 提供受限的查询工具和枚举参数 |

JSON Schema 不只是发给模型看的，它也应该是你自己校验参数的依据。模型可能漏字段、传错类型、加一个不存在的参数；这些错误应该在进入业务函数之前被拦下，并且返回一句能指导下一步的错误，而不是一个堆栈。

在第一篇的 `Tool` 上补一个 `call` 方法。下面是方法片段，字段定义沿用第一篇；完整文件把 `ToolError` 和这个方法加进去即可。

```python
class ToolError(Exception):
    def __init__(self, message: str, hint: str = ""):
        super().__init__(message)
        self.hint = hint


# 把下面这个方法加进第一篇的 Tool 类
def call(self, args: dict) -> str:
    if not isinstance(args, dict):
        raise ToolError("参数必须是一个 JSON 对象", '例如 {"query": "..."}')
    properties = self.parameters.get("properties", {})
    missing = [k for k in self.parameters.get("required", []) if k not in args]
    if missing:
        raise ToolError(
            f"缺少参数：{', '.join(missing)}",
            f"这个工具需要：{list(properties)}",
        )
    unknown = [k for k in args if k not in properties]
    if unknown:
        raise ToolError(
            f"不认识的参数：{', '.join(unknown)}",
            f"可用参数：{list(properties)}",
        )
    for key, value in args.items():
        expected = properties[key].get("type")
        if expected == "string" and not isinstance(value, str):
            raise ToolError(f"参数 {key} 应该是字符串", f"收到的是 {type(value).__name__}")
        if expected == "integer" and (not isinstance(value, int) or isinstance(value, bool)):
            raise ToolError(f"参数 {key} 应该是整数", "不要传字符串或小数")
    return self.run(args)
```

然后把循环里的 `self.tools[name].run(args)` 换成 `self.tools[name].call(args)`。这一步看起来只是多了一层校验，实际改变的是失败的位置：参数错误在工具边界被翻译成模型能读懂的话，而不是在业务代码深处变成一个它看不见的异常。

还有一条容易被忽略：**工具返回的内容也要省 token**。一个搜索工具返回五十条完整记录，模型可能只用到第三条，但剩下四十九条都要付费、都要占注意力。分页、`limit`、字段裁剪、错误信息只保留必要部分，这些都应该在工具层做掉，而不是指望模型自己忽略噪音。

## 上下文是有限资源

Anthropic 把上下文工程定义为“在推理过程中整理和维护最优 token 集合的策略”。核心判断很朴素：上下文不是越多越好，它是一个有边际递减的资源；token 越多，模型准确回忆起某一段的能力越弱。目标不是把所有资料塞进去，而是“用尽可能少的高信号 token，最大化想要结果的可能性”。

Agent 的上下文增长得特别快。每一轮都有用户消息、助手消息、工具调用、工具结果；工具结果往往还是最长的那部分。一个查资料的 Agent 跑十步，上下文里可能已经躺着十页网页正文，而当前真正需要的只是其中三行。

可以按下面的顺序处理：

| 手段 | 做什么 | 要注意什么 |
| --- | --- | --- |
| 工具层裁剪 | 分页、限制条数、只返回需要的字段 | 别把关键错误也裁掉 |
| 历史压缩 | 旧轮次变成摘要，保留最近几轮 | 不能在工具调用和结果之间切 |
| 结构化笔记 | 把计划、结论、待办写到文件里 | 需要读写权限和清理策略 |
| 子 Agent | 隔离搜索过程，只返回摘要 | 多一层成本和信息损失 |
| 示例 | 放少量典型示例 | 不要堆一长串边界案例 |

系统提示也要找对“高度”：写得太具体，等于把脆弱的 if-else 硬编码进提示；写得太空，模型只能猜。比较稳的做法是写清楚目标、可用工具、边界和输出格式，把具体分支留给模型和工具。

历史压缩最常见的错误，是直接 `messages[-10:]`。如果切点落在一条带 `tool_calls` 的助手消息和它的 `tool` 结果之间，下一次请求就会缺少对应的工具结果，很多接口会直接报错。按“用户轮次”切更安全：

```python
def compact_history(messages, keep_turns=2, max_tool_chars=2000):
    system = messages[0]
    turns = []
    for message in messages[1:]:
        if message["role"] == "user":
            turns.append([message])
        elif turns:
            turns[-1].append(message)
    old, recent = turns[:-keep_turns], turns[-keep_turns:]
    summary = "；".join(t[0]["content"][:80] for t in old)
    head = system["content"]
    if summary:
        head += "\n\n早前对话摘要：" + summary
    out = [{"role": "system", "content": head}]
    for turn in recent:
        for message in turn:
            if message["role"] == "tool" and len(message["content"]) > max_tool_chars:
                message = {
                    **message,
                    "content": message["content"][:max_tool_chars] + "\n…（已截断）",
                }
            out.append(message)
    return out
```

这个版本只保留最近两轮，把更早的用户问题压成一句摘要，并对过长的工具结果做截断。它不是通用解：摘要会丢细节，截断可能切掉关键错误。生产系统通常会把“计划、已确认的事实、未解决的问题”单独写进结构化状态，而不是指望一段自然语言摘要记住所有东西。

## 失败要分类，停止要有条件

模型调用工具失败时，最危险的反应是“再试一次”。有些错误重试有用，有些错误重试一百次也没用，还有些错误越重试越糟。

| 失败类型 | 例子 | 合理反应 |
| --- | --- | --- |
| 选错工具 | 该查天气却调用计算器 | 改工具描述或加示例，不要只加重试 |
| 参数错误 | 缺 `city`、类型不对 | 返回可执行的提示，让模型改参数 |
| 暂时性故障 | 超时、429、连接断开 | 有限次重试，加退避 |
| 永久性故障 | 404、权限拒绝、文件不存在 | 停止或换路径，不要原地重试 |
| 任务不可能 | 数据源里没有这条记录 | 明确告诉用户缺什么 |
| 策略拒绝 | 越权写文件、访问工作区外 | 记录并告知，不要绕路 |

第一篇的循环对所有异常一视同仁，只把错误文本塞回去。第二篇要加两个计数器：总步数和连续工具失败次数。连续失败达到阈值就停，成功一次就清零。同时给 `Agent.__init__` 加上 `self.events = []` 和 `self.max_tool_failures = 3`，在每步把模型决定与工具结果记进 `events`；下面的片段省略了模型调用与消息追加，只保留失败处理：

```python
failures = 0
for step in range(1, self.max_steps + 1):
    # ... 调用模型、追加 assistant 消息 ...
    for call in calls:
        name = call["function"]["name"]
        raw_args = call["function"]["arguments"]
        try:
            args = json.loads(raw_args or "{}")
            result = self.tools[name].call(args)
            ok = True
        except KeyError:
            result = f"错误：没有名为 {name} 的工具。可用工具：{list(self.tools)}"
            ok = False
        except json.JSONDecodeError as exc:
            result = f"错误：参数不是合法 JSON（{exc.msg}）。请重新生成完整的参数对象。"
            ok = False
        except ToolError as exc:
            result = f"错误：{exc}"
            if exc.hint:
                result += f"\n建议：{exc.hint}"
            ok = False
        except Exception as exc:
            result = f"工具内部错误：{type(exc).__name__}: {exc}"
            ok = False
        self.events.append({"type": "tool_call", "name": name, "args": raw_args, "ok": ok})
        messages.append(
            {"role": "tool", "tool_call_id": call["id"], "content": str(result)}
        )
        failures = 0 if ok else failures + 1
        if failures >= self.max_tool_failures:
            return "连续多次工具调用失败，已停止。请检查工具描述或参数。"
```

除了失败计数，至少还要有：单次工具超时、单次运行的总 token 或金额上限、最大步数。写操作还需要幂等键，否则“超时后重试”可能变成重复扣款、重复发信。只读工具可以放心重试，写工具不能靠“应该没事”来判断。

### 重试要有限制，写操作要幂等

“模型会自己纠正”不等于“程序可以无限重试”。重试只对暂时性故障有用；参数错、权限拒绝、404 这类错误，重试只会浪费钱。一个最小的重试包装只捕获暂时性异常，并且次数有限：

```python
import time

TRANSIENT = (TimeoutError, ConnectionError)


def call_with_retry(tool, args, attempts=3, base_delay=0.5):
    for i in range(attempts):
        try:
            return tool.call(args)
        except TRANSIENT:
            if i == attempts - 1:
                raise
            time.sleep(base_delay * (2 ** i))
```

只读工具这样重试问题不大。写工具要额外想一步：请求超时了，服务端到底做成没有？没有幂等键，重试可能变成重复扣款、重复发信。把幂等键放进参数，让工具自己识别重复：

```python
done = set()


def refund(args):
    key = args["request_id"]
    if key in done:
        return "这笔退款之前已经处理过，未重复提交"
    # 这里调用支付服务的退款接口
    done.add(key)
    return "退款已提交"
```

这里的 `done` 只是演示；生产环境要把它换成持久化存储，并保证多实例下同一把幂等键只生效一次。

对应到工具设计，最好在 schema 里就把 `request_id` 标成 required；读工具可以没有。重试策略也要按工具类型分开：

| 工具类型 | 自动重试 | 还需要什么 |
| --- | --- | --- |
| 只读查询 | 可以 | 超时、退避、次数上限 |
| 幂等写 | 可以 | 幂等键、去重记录 |
| 非幂等写 | 不要自动重试 | 先查询状态，或交给人确认 |

这段 `call_with_retry` 只处理 `TimeoutError` 和 `ConnectionError`；实际项目里要把服务商的 429、5xx 映射成自己的暂时性异常，把 4xx 参数错误映射成 `ToolError`。分类错了，重试策略就会反过来放大故障。

OpenAI 的实践指南把人工介入的触发条件归成两类：超过失败阈值，以及高风险动作。前者是“它试了几次都不行”，后者是“它要做的事不可逆”。第二类不应该等模型自己判断，应该由代码在工具执行前拦住，第三篇会展开。

## 没有评测，就没有可靠性

演示只能证明“至少有一次能跑”。Agent 是非确定性的，同一个问题跑两次可能选不同工具、走不同路径；你需要一个能重复执行、能失败、能比较的评测集。

先定义量什么。不要只盯最终回答，过程指标往往更能定位问题：

| 指标 | 问的问题 | 怎么量 |
| --- | --- | --- |
| 任务成功率 | 最终结果对不对 | 断言、数据库最终状态、人工 rubric |
| 工具选择 | 有没有调该调的工具 | 期望的工具序列 |
| 参数正确率 | 参数是否完整、合法 | schema 校验加针对性断言 |
| 轨迹长度 | 是否绕路 | 步数、工具调用数 |
| 成本与延迟 | 一次任务多少钱、多久 | token 计数、计时 |
| 稳定性 | 同一任务重复 k 次是否都成功 | pass^k |
| 安全性 | 是否越权、泄露、被注入 | 策略测试、红队用例 |

τ-bench 提供了一个值得借用的指标：`pass^k`。它不是“跑 k 次平均成功率”，而是“同一条任务连续 k 次都成功的概率”。论文里，gpt-4o 在零售域的任务成功率不到一半，`pass^8` 低于 25%。这组数字是 2024 年论文的结果，不代表今天的模型排名；但它说明一件事：**一次成功和稳定成功之间差得很远**。

评测集不用一开始就很大。Anthropic 在多 Agent 系统的复盘里提到，大约 20 条真实查询就能暴露很大的效果差异；关键不是数量，而是任务要真实、结果可验证、并且留一份不拿来看的保留集。题目要覆盖：正常路径、参数错误、工具超时、模糊请求、应该拒绝的请求。只测“顺利情况”的评测集，会给你一种危险的安心。

下面是一个最小评测器，沿用第一篇的 `TOOLS` 与 `SYSTEM`。每个用例带一份剧本、期望的工具序列和最终回答里的关键词：

```python
from dataclasses import dataclass


@dataclass
class EvalCase:
    name: str
    question: str
    replies: list
    expect_tools: list
    expect_text: str
    expect_ok: bool = True


def run_case(case: EvalCase):
    agent = Agent(ScriptedModel(case.replies), TOOLS, SYSTEM)
    answer = agent.run(case.question)
    calls = [e for e in agent.events if e["type"] == "tool_call"]
    passed = (
        [e["name"] for e in calls] == case.expect_tools
        and case.expect_text in answer
        and all(e["ok"] for e in calls) == case.expect_ok
    )
    return {"name": case.name, "passed": passed, "answer": answer, "calls": calls}


def run_eval(cases):
    results = [run_case(case) for case in cases]
    passed = sum(result["passed"] for result in results)
    print(f"{passed}/{len(results)} 通过")
    for result in results:
        mark = "PASS" if result["passed"] else "FAIL"
        print(f"  {mark} {result['name']}: {result['answer']}")
    return results
```

三个用例分别测天气查询、算术、参数类型错误，跑出来是 `3/3 通过`。这还不能说明 Agent 可靠，只能说明这三条路径没坏。真正有用的下一步，是故意把一条用例的期望工具改错，确认评测器会报 `FAIL`。一个永远不会失败的评测器，比没有评测更危险。

### 一份评测报告长什么样

评测器只给一个通过率，信息量不够。一次运行至少要留下这些读数，并且能按失败类型拆开：

| 读数 | 示例 | 用来看什么 |
| --- | --- | --- |
| pass@1 | 17/24（70.8%） | 一次运行的基本盘 |
| pass^k | 12/24（50.0%，k=3） | 同一任务重复跑是否稳定 |
| 工具错误 | 6 次（超时 4、参数 2） | 是模型问题还是工具问题 |
| 平均步数 | 4.2 步 | 是否绕路 |
| p95 延迟 | 8.6 秒 | 用户能不能等 |
| 单任务 token | 3.1k | 成本是否可接受 |

一份具体的报告可以写成：

```text
run 2026-11-01 14:20  model=...
cases 24  pass@1 17/24 (70.8%)  pass^3 12/24 (50.0%)
tool errors 6 (timeout 4, invalid_args 2)
steps avg 4.2  latency p95 8.6s  tokens avg 3.1k
failures
  - 课程退费: 调用了 search_orders 而不是 get_order，3/3 失败
  - 论文引用: 回答里引用了不存在的条目，2/3 失败
  - 跨文件总结: 第二次运行漏读一个文件，1/3 失败
```

`pass@1` 和 `pass^3` 差得远，说明系统不是“不会”，而是“不稳定”；这比单看平均分有用。失败项按工具、参数、上下文、任务理解分组，下一轮改动才有方向。每次改提示、改工具描述或换模型，都用同一套用例重跑；不要只挑跑通的那几条看。

如果要做语义判断，可以让另一个模型按 rubric 打分，但要注意两点：评分标准要写清楚，最好一次给出分数和通过与否；模型的自我解释不能当作证据。Anthropic 的建议是直接看原始对话记录，因为“模型并不总是说到做到”。人工抽查几十条原始 trace，通常比看一堆聚合分数更快发现系统性问题。

## 上线前的检查表

| 层面 | 至少要有 |
| --- | --- |
| 工具 | 清楚的命名与描述、严格 schema、可执行的错误、分页与字段裁剪 |
| 循环 | 最大步数、连续失败上限、单次超时、token 或金额预算 |
| 上下文 | 工具结果截断、按轮次压缩、长任务的结构化笔记 |
| 评测 | 20 条以上真实任务、保留集、`pass^k`、失败用例 |
| 观测 | 每步的工具名、参数、结果、耗时、错误、token |
| 人工 | 高风险写操作审批、连续失败升级 |
| 安全 | 最小权限、工作区隔离、拒绝路径、审计日志 |

这张表里，工具和循环决定“能不能跑”，上下文决定“跑得贵不贵”，评测决定“你知道不知道它在变好还是变坏”。下一篇处理最后一块：当系统从单个 Agent 长成多 Agent、接上外部工具协议之后，权限和攻击面会发生什么变化。

## 参考资料

- [Anthropic：Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents)
- [Anthropic：Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [OpenAI：A practical guide to building agents](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)
- [τ-bench：A Benchmark for Tool-Agent-User Interaction in Real-World Domains](https://arxiv.org/abs/2406.12045)
- [OpenAI Agents SDK：Tracing](https://openai.github.io/openai-agents-python/tracing/)
