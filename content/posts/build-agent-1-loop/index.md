---
title: Agent 不是魔法：从一次模型调用到闭环
date: 2026-11-01
tags: [Agent, LLM, Python]
collection: build-agent
order: 1
summary: 从聊天机器人和工作流的区别讲起，用一百多行 Python 写出“模型选工具、程序执行、结果回灌”的最小闭环。
alt: 深蓝底上一圈细金线围成闭环，左侧是白色标题“Agent 不是魔法”
---

你大概见过这样的演示：对着聊天框说“帮我查一下明天北京的天气，再算一下出差预算”，模型回答得头头是道。但它没有查天气，也没有算预算，只是在续写一段看起来合理的文本。Agent 的第一步，不是换一个更聪明的模型，而是让模型的决定能落到程序里，再把程序的结果送回模型。

这一篇只做一件事：把最小闭环写出来。不依赖框架，不接数据库，只用 Python 标准库和一个兼容 OpenAI 接口的模型服务。读完你应该能回答三个问题：Agent 和工作流差在哪、一次工具调用到底发生了什么、为什么这个循环会有效，又会在哪里失效。

## 先把三个词分开

聊天机器人、工作流、Agent 经常被混着叫。差别不在“用不用大模型”，而在**谁决定下一步做什么**。

| 形态 | 谁决定下一步 | 典型例子 | 出错时 |
| --- | --- | --- | --- |
| 单次调用 | 没有下一步 | 分类、摘要、改写 | 直接返回错误 |
| 工作流 | 代码里写死的路径 | 固定三步的报销审核 | 某一步失败就停 |
| Agent | 模型在循环里决定 | 查资料、改代码、跑测试 | 换工具、重试或求助 |

Anthropic 在《Building effective agents》里给了一组很清楚的区分：工作流是“LLM 和工具按预先写好的代码路径被编排”，Agent 是“LLM 自己决定流程和工具的使用”。OpenAI 的实践指南则把 Agent 拆成三个核心部件：模型、工具、指令，并强调它要在循环里运行到某个退出条件。两家的措辞不同，但都指向同一件事：**控制流从代码手里部分交给了模型**。

这不是一个非黑即白的分类。只调用一次搜索再回答，可以叫工具调用；连续十几步自己找资料、写文件、跑测试，才更接近大家口中的 Agent。自主性是一个程度问题，不必在定义上吵架。对写代码的人来说，一个够用的工作定义是：

> Agent 是一个由模型控制循环、能调用工具、能读取工具结果并继续决策的系统。

## 一次工具调用，模型到底做了什么

很多人第一次看工具调用，会以为模型“执行”了函数。没有。模型只输出了一段结构化的文本，真正执行的是你的程序。

一次完整的往返通常是这样：

1. 你的程序把对话历史和工具清单发给模型。工具清单里每个工具都有名字、说明和 JSON Schema 参数。
2. 模型返回两种东西之一：一段给用户的文本，或者一个 `tool_calls` 列表。后者包含工具名和 JSON 参数，但不包含执行结果。
3. 你的程序解析参数，找到对应函数，执行它，把返回值作为一条 `tool` 消息追加到对话里。
4. 你的程序再次调用模型。模型这次能看到工具结果，再决定是继续调工具，还是给出最终回答。

这里有一条很重要的边界：**模型提出调用，程序负责执行**。参数可能缺字段，工具可能超时，返回值可能是恶意内容；这些都不是模型能替你处理的。把工具执行放在自己的代码里，你才有机会校验、限权、记录和拒绝。

## 把一次往返摊开看

上面的四步听起来抽象，写成实际消息就很具体。为了看清并行调用，问题里放两件互不依赖的事：查天气、算票钱。第一轮请求的 `messages` 大致是这样（同一个请求还带着下文的两个工具 schema）：

```json
{
  "model": "your-model",
  "messages": [
    {"role": "system", "content": "你是一个办事助手。需要外部信息或算术时调用工具。"},
    {"role": "user", "content": "明天去北京出差要带伞吗？另外三张 102 元的票一共多少钱？"}
  ]
}
```

模型可能一次返回两个调用：

```json
{
  "role": "assistant",
  "content": null,
  "tool_calls": [
    {
      "id": "call_1",
      "type": "function",
      "function": {
        "name": "get_weather",
        "arguments": "{\"city\": \"北京\"}"
      }
    },
    {
      "id": "call_2",
      "type": "function",
      "function": {
        "name": "calculator",
        "arguments": "{\"expression\": \"102*3\"}"
      }
    }
  ]
}
```

注意 `content` 是 `null`，真正的动作在 `tool_calls` 里；两个调用各有自己的 `id`。程序执行后，把两条结果分别回填：

```json
[
  {"role": "tool", "tool_call_id": "call_1", "content": "北京：多云，18–24°C，降水概率 20%"},
  {"role": "tool", "tool_call_id": "call_2", "content": "306"}
]
```

再发一次请求，模型看到两条观察，才能给出最终回答：

```json
{"role": "assistant", "content": "北京明天多云，18–24°C，降水概率 20%，不用带伞；三张票一共 306 元。"}
```

第一篇的循环里 `for call in calls` 就是在处理这种一次返回多个调用的情形。并行调用能省一轮往返，但会带来几个工程问题：两个调用里一个失败、一个成功怎么办；结果要不要按调用顺序回填；写操作能不能并行。比较稳的默认是：只读、彼此独立的工具可以并行；有依赖的调用让模型分步走；写操作按业务要求串行或加幂等键。别让“并行”变成“同时改两个互相依赖的状态”。

## 最小实现

下面三段代码拼起来就是一个完整文件。它做四件事：定义工具、跑循环、接模型、演示一次调用。只需要 Python 3.10 以上和标准库；真实模型需要一个兼容 OpenAI Chat Completions 的地址和 key。

先写工具和循环：

```python
import ast
import json
import operator
import urllib.request
from dataclasses import dataclass
from typing import Callable


@dataclass
class Tool:
    name: str
    description: str
    parameters: dict
    run: Callable[[dict], str]

    def schema(self) -> dict:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }


class Agent:
    def __init__(self, model, tools, system, max_steps=8):
        self.model = model
        self.tools = {tool.name: tool for tool in tools}
        self.system = system
        self.max_steps = max_steps

    def run(self, question: str) -> str:
        messages = [
            {"role": "system", "content": self.system},
            {"role": "user", "content": question},
        ]
        for _ in range(self.max_steps):
            reply = self.model.chat(messages, [t.schema() for t in self.tools.values()])
            calls = reply.get("tool_calls") or []
            assistant = {"role": "assistant", "content": reply.get("content")}
            if calls:
                assistant["tool_calls"] = calls
            messages.append(assistant)
            if not calls:
                return reply.get("content") or ""
            for call in calls:
                name = call["function"]["name"]
                try:
                    args = json.loads(call["function"]["arguments"] or "{}")
                    result = self.tools[name].run(args)
                except Exception as exc:
                    result = f"工具调用失败：{type(exc).__name__}: {exc}"
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call["id"],
                        "content": str(result),
                    }
                )
        return f"超过 {self.max_steps} 步仍未完成，已停止。"
```

循环本身只有二十来行。`max_steps` 不是可选项：模型可能一直调工具、一直失败，或者陷入两个工具之间的来回。没有上限，程序就可能替它付一晚上的账单。

再接模型。下面这个适配器不绑定某一家厂商，只要对方兼容 Chat Completions 的 `tools` 与 `tool_calls` 字段：

```python
class OpenAIModel:
    def __init__(self, model: str, base_url: str, api_key: str):
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key

    def chat(self, messages, tools):
        body = json.dumps(
            {
                "model": self.model,
                "messages": messages,
                "tools": tools,
                "tool_choice": "auto",
                "temperature": 0,
            }
        ).encode("utf-8")
        request = urllib.request.Request(
            self.base_url + "/chat/completions",
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            data = json.load(response)
        return data["choices"][0]["message"]


class ScriptedModel:
    """离线演示：按剧本返回，不联网。"""

    def __init__(self, replies):
        self.replies = list(replies)
        self.index = 0

    def chat(self, messages, tools):
        reply = self.replies[self.index]
        self.index += 1
        return reply
```

`ScriptedModel` 不是玩具。没有它，你每次改循环都要花一次 API 调用才能验证；有了它，循环、参数解析、错误处理都能在本地反复跑。真实模型负责“决定”，剧本模型负责“可重复地测试决定之后的代码”。

最后是两个工具和入口。计算器用 `ast` 白名单，只允许数字和四则运算，不用 `eval`：

```python
OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.USub: operator.neg,
}


def safe_eval(node):
    if isinstance(node, ast.Expression):
        return safe_eval(node.body)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in OPS:
        return OPS[type(node.op)](safe_eval(node.left), safe_eval(node.right))
    if isinstance(node, ast.UnaryOp) and type(node.op) in OPS:
        return OPS[type(node.op)](safe_eval(node.operand))
    raise ValueError("只支持数字与 + - * / 和括号")


def calculator(args):
    expression = str(args["expression"])
    if len(expression) > 100:
        raise ValueError("表达式太长")
    return safe_eval(ast.parse(expression, mode="eval"))


def get_weather(args):
    city = args["city"]
    return f"{city}：多云，18–24°C，降水概率 20%"


tools = [
    Tool(
        name="calculator",
        description="计算四则运算表达式。只在需要精确算术时调用。",
        parameters={
            "type": "object",
            "properties": {
                "expression": {"type": "string", "description": "例如 (120-18)*3"}
            },
            "required": ["expression"],
        },
        run=calculator,
    ),
    Tool(
        name="get_weather",
        description="查询某座城市明天的天气。返回温度和降水概率。",
        parameters={
            "type": "object",
            "properties": {"city": {"type": "string", "description": "城市名，例如 北京"}},
            "required": ["city"],
        },
        run=get_weather,
    ),
]

SYSTEM = "你是一个办事助手。需要外部信息或算术时调用工具；拿到结果后再回答。"

if __name__ == "__main__":
    import os
    import sys

    script = [
        {
            "role": "assistant",
            "content": None,
            "tool_calls": [
                {
                    "id": "call_1",
                    "type": "function",
                    "function": {
                        "name": "get_weather",
                        "arguments": '{"city": "北京"}',
                    },
                }
            ],
        },
        {
            "role": "assistant",
            "content": "北京明天多云，18–24°C，降水概率 20%，不用带伞。",
        },
    ]
    if os.getenv("OPENAI_API_KEY"):
        model_name = os.environ.get("MODEL")
        if not model_name:
            raise SystemExit("设置了 OPENAI_API_KEY 时还要设置 MODEL")
        model = OpenAIModel(
            model_name,
            os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
            os.environ["OPENAI_API_KEY"],
        )
    else:
        model = ScriptedModel(script)
    agent = Agent(model, tools, SYSTEM)
    question = sys.argv[1] if len(sys.argv) > 1 else "明天去北京出差，要带伞吗？"
    print(agent.run(question))
```

不联网直接运行，会走剧本模型，输出“北京明天多云……不用带伞”。把 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`MODEL` 换成真实服务，同一个循环就会自己决定要不要调 `get_weather`。注意 `base_url` 要包含 `/v1` 这类前缀，具体以服务商文档为准。

这段代码里最值得抄走的不是某个 API 字段，而是三个习惯：工具执行永远在自己的代码里；每次工具结果都带 `tool_call_id` 回灌；循环有步数上限。

## 为什么这个循环有效

这套“想一步、做一步、看结果”的写法，在 2022 年的 ReAct 论文里被系统化过。论文让模型交错生成推理轨迹和动作：推理帮助它规划、处理异常，动作让它接触外部知识库或环境；环境返回观察，再进入下一轮。论文在 ALFWorld 和 WebShop 上分别取得 34% 和 10% 的绝对成功率提升，只用了 1 到 2 个上下文示例。HotpotQA 和 FEVER 上的结果更微妙：ReAct 与思维链各有胜负；论文还试了两种组合，ReAct 拿不到答案时退回 CoT 自洽投票，或 CoT 置信度不足时转去 ReAct，两种组合分别在 HotpotQA 和 FEVER 上最好。

这段历史值得知道，但不要把 ReAct 当成必须套用的模板。今天模型厂商提供的工具调用已经把“输出动作”做成了结构化字段，你不需要让模型输出 `Action: search[...]` 再自己用正则解析。真正保留下来的是循环：**模型的决定要能被环境检验，环境的反馈要能改变下一步**。

反过来说，如果一个任务不需要环境反馈，循环就是多余的开销。让模型直接写一段摘要、做一次分类，或者用检索增强生成查一段资料，通常比 Agent 更便宜、更稳定。

## 什么时候不该做 Agent

Anthropic 的建议很直接：先找最简单的方案，只在需要时增加复杂度。下面这张表可以当作第一道筛子：

| 你的需求 | 先试什么 | 什么时候才升级成 Agent |
| --- | --- | --- |
| 固定三步的审批 | 工作流 | 步骤会随输入变化，且无法穷举 |
| 从文档里找答案 | 检索加一次生成 | 需要多轮查证、交叉比对 |
| 格式转换、摘要 | 单次模型调用 | 需要调用外部系统才能完成 |
| 高风险的资金操作 | 确定性代码加人工 | 只让 Agent 做只读分析和建议 |

还有一个常被忽略的边界：**模型不执行工具，也不承担后果**。工具能做什么，取决于你给了它什么权限。第一篇的代码把所有工具都放在同一个进程里，没有任何权限区分；这在本地演示没问题，一旦接上文件系统、数据库或网络，就需要第二篇和第三篇里的那些约束。

## 动手改一改

在读下一篇之前，建议做三个小实验：

1. 加一个 `search_notes` 工具，从一个字典里查关键词，观察模型会不会在回答前调用它。
2. 把 `get_weather` 改成故意抛异常，看模型收到错误后会不会换个参数重试，还是会重复同样的调用。
3. 把 `max_steps` 改成 2，问一个需要三次工具调用的问题，确认程序会停下来，而不是静默地给出半截答案。

这三个实验分别对应后面要讲的三件事：工具设计、失败处理、停止条件。下一篇会把它们补成一套能交付的工程约束。

## 参考资料

- [Anthropic：Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- [OpenAI：A practical guide to building agents](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)
- [ReAct：Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)
- [OpenAI：Function calling 指南](https://platform.openai.com/docs/guides/function-calling)
