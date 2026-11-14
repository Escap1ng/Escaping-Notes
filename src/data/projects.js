// 项目页种子数据。
// 卡面四字段（name / desc / year / url）与介绍三件（detail 段落 / points 要点 / stack 一行技术栈）
// 都只在这里改——站点是构建期定稿的静态产物，没有后台表单，改完提交即生效。
// 数组顺序就是页面顺序：按 GitHub star 降序（并列按最近推送）；不收录 fork。
//
// 2026-11-14 按 GitHub 公开数据复核了一遍（star / pushed_at / fork 标记逐仓对过）：
//   math-modeling-skill 19 · mathmodel-studio 7 · VisualLaTeX 5 · Escaping-Notes 5
//   · kaggle-store-sales-timesfm 3 · altiora-agent 2 · deai-writing 2 · yijing-atlas 1
// 并列的两组按最近推送排：VisualLaTeX(11-13) 在 Escaping-Notes(11-09) 前，
// altiora-agent(11-14) 在 deai-writing(11-13) 前。
// 未收录：Escap1ng/Escap1ng 是个人资料页不是项目；Keep-Vibe-Brot-Away 与 DailyLikeTrees
// 是 fork（按上面那条规矩不收）；readback 建于 09-21 后无推送、0 star，先不摆上来。
export const projects = [
  {
    name: 'math-modeling-skill',
    desc: '数学建模竞赛全流程 AI 辅助，PDF + Word 双格式交付',
    year: '2026',
    url: 'https://github.com/Escap1ng/math-modeling-skill',
    detail: [
      '一道赛题进去，一篇排好版的论文出来。中间的分析、建模、求解、画图按顺序带着走完，最后同时交付 PDF 与 Word 两份——Word 那份是给需要手工微调、以及只收 Word 模板的场合留的出口。',
      '双格式是这一套里最实在的一条：多数竞赛的提交口要的是 Word 或指定模板，纯 LaTeX 交付往往在最后一步才卡住，所以那一步直接在这套流程里补上。',
      '它面向的是三天里一个人做完全部环节的场景：把重复劳动（排版、图表规范、参考文献格式）交给流程，人留在建模与写作判断上。',
    ],
    points: [
      '全流程按顺序走完，不是只帮其中一环',
      'PDF 与 Word 同时产出，交付口不需要再手动转换',
      '图表与公式随正文一起排好，交前不再整篇调版式',
      '与 mathmodel-studio 的分工：这一套管一条流程跑完，那一套把判断点做成桌面工作台',
    ],
    stack: 'AI 技能流程 · LaTeX 与 Word 双出口',
  },
  {
    name: 'mathmodel-studio',
    desc: '面向数学建模竞赛的本地桌面 Agent：能校验的交给门禁，需要判断的留给人',
    year: '2026',
    url: 'https://github.com/Escap1ng/mathmodel-studio',
    detail: [
      '把赛题到论文的一整条链路放进同一个工作台。0.1.0 起默认进通用对话，底部「通用 | 数模」分段切换：通用模式只有问答与文件页，切到数模才出现题面确认 → 选模 → 基线 → 论文的七阶段引导，落在过程总览页。选模那一步给三张候选卡，附五维雷达（创新、解释、精度、速度、易做，难度与耗时已反向归一），点一张就按它继续，阶段四真跑基线并把图登记成版本。',
      '桌面端是 Electron + React，Python 运行时也在本机跑，两者走回环 HTTP + SSE 通道。模型由使用者自己接入，五类入口（DeepSeek、通义千问、Kimi、智谱 GLM、OpenAI 格式端点），Key 只经主进程 safeStorage 加密，数据不出本机。七个内置技能由注册表、JSON Schema 与 CLI 退出码约束，界面按注册表生成，不写死技能清单；技能本身也能被别的宿主单独加载。',
      '论文链路是 xelatex 两遍 → pandoc 转 DOCX → Word 版式后处理，再接去 AI 措辞、结构指标、章节结构三道门禁，PDF 用 pdf.js 逐页预览。每条门禁都配反向用例——只会报通过的检查器不算证据。0.1.0 在本机与 CI 都跑过完整门禁与真启动冒烟；NSIS 安装包尚未构建，干净机安装仍是未证项。仓库整体 AGPL-3.0-only，技能文件保留 Apache-2.0。',
    ],
    points: [
      '判断点做成界面：选模五维雷达、评分扣分明细、门禁结论可追问，重启后仍停在原决策点',
      '本地优先：桌面端与运行时都在本机，模型 Key 加密存放，数据不出本机',
      '通用与数模双模式，七阶段管线按状态着色，产物芯片直达对应页',
      '交付链路直达 Word 与 PDF：xelatex → pandoc → 版式后处理 → 三道门禁，每条门禁带反向用例',
    ],
    stack: 'Electron · React · Python 3.12+ · pandoc / xelatex',
  },
  {
    name: 'VisualLaTeX',
    desc: '可视化改 LaTeX：多文件项目、公式与引用点开即改，编译与 PDF 预览走本机服务',
    year: '2026',
    url: 'https://github.com/Escap1ng/VisualLaTeX',
    detail: [
      '导入一份现成的 LaTeX 文档，直接在排版后的样子上改：文字、标题、格式用工具栏调，公式单击进图形输入框改分式与上下标，引用和标签显示成可读条目、点开就能换。只重写改动的区段，其余源码逐字节保留——这是它和"重新生成一遍文档"那类工具的根本区别。',
      'v2.1 起是 Studio 工作台：多文件项目、ZIP 导入导出、完整源码模式随时可切，内置 MathLive 0.111.1 及其字体（本地资源，不走 CDN）。同一套前端有两种跑法：双击 index.html 或用 Pages 在线版，只做编辑；需要编译、PDF 预览和导出时启动本机服务（Node 22+，Tectonic 或 XeLaTeX，加 Ghostscript 做分页图片预览）。',
      '本机服务只绑回环地址，校验 Host、Origin 与会话令牌，Tectonic 用 --untrusted、XeLaTeX 关 shell-escape、Ghostscript 用 SAFER。这些不是操作系统沙箱，所以只编译自己信得过的项目，别把它改成公网编译服务。前端零 npm 依赖，node --test 331 例通过；XeLaTeX 分支尚未在真实发行版上验证。',
    ],
    points: [
      '可视化改动只重写选中区段，未编辑的 LaTeX 源码原样保留',
      '公式、引用、标签点开即改；自定义宏与复杂结构随时切源码模式',
      '编辑完全离线；编译、PDF 预览与导出由回环本机服务提供',
      '多文件项目与 ZIP 往返，内置 MathLive 固定版本，前端不依赖 npm 与 CDN',
    ],
    stack: '原生 JavaScript · MathLive · Tectonic / XeLaTeX · Ghostscript',
  },
  {
    name: 'Escaping Notes',
    desc: '本站：一张逃逸轨迹图',
    year: '2026',
    url: 'https://github.com/Escap1ng/Escaping-Notes',
    detail: [
      '一个个人博客与记录站，写过的文章按时间排在这里。前端是 Vue 3 + Vite 的单页应用，10 条路由全部懒加载；文章用带 frontmatter 的 Markdown 存在仓库里，构建时打包进产物，站点没有服务端。',
      '首页架着一台一直开着快门的相机：星轨由 Canvas 2D 的离屏累积缓冲逐帧画出，滚动和光标都在改变它的曝光速度；沉积是全站累积的，换页不重铺，回到首页还是那圈越积越密的弧。首屏之下是一条照片地景横带，深色与浅色用的是同一取景，切主题不换山。',
      '设计上能核的部分都写进了 docs/design.md——界面唯一依据。颜色、字号、间距全部走令牌，四道门禁脚本在提交前对拍：发文内容、文档里的引用与路由表、命名规约、主题令牌的 WCAG 对比度。测试用 Node 内置 test runner，零测试框架。',
    ],
    points: [
      '运行时依赖只有 Vue 与 Vue Router；展示字体是一枚自托管 woff2，全站不引 CDN',
      '整站是构建期定稿的静态产物：文章与配置随构建进 dist，页面加载后不再请求任何接口',
      '抽屉与看片框都有焦点陷阱（关闭后焦点回到触发它的那一枚），减弱动效下有完整的静态降级',
      '已绑自定义域名 escaping.top；Vercel 上另有一份只读镜像',
    ],
    stack: 'Vue 3 · Vite 5 · Vue Router 4 · Canvas 2D',
  },
  {
    name: 'kaggle-store-sales-timesfm',
    desc: 'Kaggle 门店销量预测：TimesFM-3 零样本 + 递归 LightGBM 融合，公榜 0.38980',
    year: '2026',
    url: 'https://github.com/Escap1ng/kaggle-store-sales-timesfm',
    detail: [
      '赛题是给厄瓜多尔 Favorita 超市 54 家门店 × 33 个商品家族预测未来 16 天日销售额，指标 RMSLE。最终公榜 0.38980，来自 TimesFM-3 零样本 70% 与递归 LightGBM 30% 在 log1p 空间的加权融合——单模型最好成绩是 0.39257，融合是这次唯一超过单模型的改动。',
      'TimesFM 那侧把训练数据转成 1782 列宽表，每列一条日序列，喂全部 1688 天历史一次预测 16 天，取 9 个分位的中位数。LightGBM 那侧 37 个特征全部只用到预测原点及之前的数据，预测时逐日回灌滚动 16 步，训练与推理口径一致。',
      '仓库里记了四条否定结论，比成绩本身更值得留：TimesFM 的协变量通道在这题无效（onpromotion 让验证集变好、公榜反而变差）；use_znorm 完全无效果；LightGBM 加轮数上限没用；以及单窗口验证会骗人——LGBM 在 2017 年两个窗口领先约 0.009，公榜却落后 0.10，换 2015/2016 同日历窗口复核才看清是 8 月开学季的年际方差。',
    ],
    points: [
      '公榜 RMSLE 0.38980，融合权重由四个留出窗口扫描确定',
      'TimesFM-3 零样本逐序列预测，GPU 单趟 1782 条约 40 秒',
      '递归 LightGBM 逐日回灌，37 个特征无前瞻',
      '否定结论一并入库：协变量、推理旋钮、容量与单窗口陷阱',
    ],
    stack: 'Python · TimesFM-3 · LightGBM',
  },
  {
    name: 'altiora-agent',
    desc: '以会话日志为准的编码 Agent：CLI + Windows 桌面端，权限由程序判定',
    year: '2026',
    url: 'https://github.com/Escap1ng/altiora-agent',
    detail: [
      '一个 headless 优先的编码 Agent 骨架，命令行与 Windows 桌面端共用同一个循环。它让模型对着真实工作目录跑：流式出一轮、执行工具、判权限，全过程写进一份只追加的 JSONL 会话日志。模型的上下文是从这份日志投影出来的，所以续跑、分叉、回放读的是同一份数据，被打断的工具调用在续跑时会被结清而不是悄悄丢掉。',
      '权限不写在提示里，由骨架执行：规则按 deny → ask → allow 首次匹配，无人值守模式下 ask 直接变 deny，plan 模式禁掉所有写入，路径解析后越出工作区就拒。子 Agent 拿到的工具集里没有 task 本身，所以不能递归套娃；webfetch 只收公网 http(s)，回环、私网、链路本地与元数据地址一律拒，重定向再查一遍，响应封顶 5MB。',
      '桌面端是 Electron 壳，循环跑在主进程，通过 IPC 把事件流给窗口，中间没有 HTTP 监听。npm 上已发 0.1.0，命令是 altiora。当前只实现 OpenAI 兼容适配器，MCP、技能、hooks 与检查点还没做（排在 M9–M11）；安装包未签名，首次运行 SmartScreen 会拦一下。',
    ],
    points: [
      '会话日志是唯一事实源：续跑、分叉、回放与崩溃恢复都读它',
      '权限 deny → ask → allow 首次匹配，无人值守时 ask 即 deny',
      '子 Agent 不可递归；webfetch 拒私网与元数据地址并复查重定向',
      'CLI 与 Electron 桌面端共用一个循环，窗口与循环之间无 HTTP 监听',
    ],
    stack: 'TypeScript · Node 22+ · Electron',
  },
  {
    name: 'deai-writing',
    desc: '中英文稿件的三道门禁：词表、结构、字符——去 AI 味，也去看不见的隐写字符',
    year: '2026',
    url: 'https://github.com/Escap1ng/deai-writing',
    detail: [
      '每一层各一支能跑的检查器：词表级查模板腔、套话、伪洞察，21 条中英规则，命中即退出 1；结构级量六项指标（过长被动句、句式重复、过渡词密度、长短句比例、相邻段落节奏、结果小数位），风险判到「高」或「极高」不得交付；字符级清零宽字符、bidi 控制、tag 字符、变体选择符这类看不见的 Unicode，覆盖 tex/docx/pdf 与纯文本。',
      '判据是复检得过的才算：每一条命中都附上改法提示，照着改完再跑，词表与结构两支都退出 0 才交付。仓库自带 12 项回归自检和刻意写坏的反例样本，规则改动能被复算，不靠通读时的感觉。规则与提示都能切英文输出，词表是单一事实源，加词只改一处 JSON。',
      '边界写在明面上：只处理表述与字符，不动事实、数据与结论。去 AI 味不等于口语化，判据是「只有这位作者写得出」——具体判断、具体数值、具体边界。另有一个 desktop/ 目录，是同一套三关引擎的无边框 Qt 工作台，带本地体检、模型改写与学术翻译，可打包成 exe。',
    ],
    points: [
      '三道门禁分级执行：21 条词表规则 / 6 项结构指标 / 不可见字符清理',
      '每条命中附带改法，改完复检全绿才算过',
      '12 项回归自检与反例样本，规则可复算；提示与规则标签可切英文',
      '只动表述不动事实；另有 Qt 桌面工作台与 exe 打包',
    ],
    stack: 'Python 3.13 / 3.14 · 21 条中英规则 · Qt 桌面端',
  },
  {
    name: 'yijing-atlas',
    desc: '周易揲蓍与卦象图谱：四十九策分步演算，二十八宿星阵同轴',
    year: '2026',
    url: 'https://github.com/Escap1ng/yijing-atlas',
    detail: [
      '一个把揲蓍过程摊开给你看的解释器。分二、挂一、揲四、归奇逐步执行，每一步给出动作、数的变化、象征与校验——一变后余策必为 44 或 40，二变后 40/36/32，三变后 36/32/28/24，这些不变量在页面上随时可对。六爻自下而上，老变少不变，本卦与之卦并列，114 步可完整回放。',
      '经文用通行本的卦辞、大象、爻辞、小象，另附三层：现代白话（取自 MIT 许可的开源译本）、王弼注（四库本，公有领域，可展开）、以及本项目自撰的今解。三层各自标注来源，不混同——今解按现代处境重述卦义，不作吉凶预测，也不冒充经文原义。',
      '星阵把二十八宿、二十四气、六十卦气三环同轴画在一起，宿度用汉制（斗宿含 26¼），合计 365.25 古度。拖动节气环可以做拟合实验：最优旋转 φ=76.5 时 RMS 4.74 古度，而等宽基线是 3.77——最优旋转仍差于等宽，说明两者没有隐藏对齐，共享的 365.25 才是可验证的那部分。纯静态，离线可用，无构建无后端。',
    ],
    points: [
      '揲蓍每一步都给出余策校验，三变余策与爻值可对照',
      '经文、白话、王弼注、今解四层分别标注出处，不选一家冒充唯一答案',
      '二十八宿按汉制距度合计 365.25 古度，与节气环做拟合实验并给出 RMS',
      '拟合结论如实写：最优旋转差于等宽基线，不存在隐藏对齐',
    ],
    stack: '原生 JavaScript · Canvas · 纯静态离线',
  },
]
