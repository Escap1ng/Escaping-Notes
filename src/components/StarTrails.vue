<script setup>
// StarTrails · 长曝光星轨装置（只服务首页主视觉——次级页那台已撤，全站就这一个挂载点）
// 概念：首屏是一台架在三脚架上的相机正在长曝光——
//   数千条同心星轨弧绕一枚偏心天极刚体旋转累积（恒星周日视运动 = 全场一致 ω）；
//   滚动 = 时间流速（下潜越深，曝光窗口越长、天空转得越快）；
//   流星 = 环境叙事（偶掠夜空的瞬时光迹；播放器在响时更密）；
//   指针 = 引力时间膨胀（半径内轨迹局部加速卷曲，光绘 torch 感）。
//   （2026-10-09：「文章 = 变星」的入轨装置整体撤除——骑在轨迹上的星读成贴在光弧上的
//    脏点；文章入口归折线以下的精选卡，`drawStar` 只剩流星一个用户。）
// 管线：ACC 累积离屏缓冲（destination-out 衰减 pass + 每星短弧增量 pass，尾迹自然累积）
//       → 主画布每帧：底 → drawImage(ACC) → 流星（当帧层，不累积，保持锐利）
//       → 首页相机末尾 destination-in 一张山脊遮罩（src/lib/ridge.js）：山体不吃星轨，
//         脊线以上再按高度渐淡（大气透视）。遮罩在绘制时裁、不在沉积时裁——
//         底片是跨路由常驻的一张共底，沉积时切弧会把缺角写进底片。
// 天与相机：底片与星群在 src/lib/sky.js 里全站一份，本组件只是取景器——
//       离开首页底片不清零，回到首页接着长，"一夜连续曝光"因此才成立。
// 主题：深色=冷白/暖白/琥珀（lighter 发光）；浅色=板岩/石墨/朱砂（source-over）。
//       色温跟星等走（暗星冷、亮星少数抽暖），色相承载层次，不是第三路独立随机。
// 工程约定：像素预算封顶、rAF 单循环、三重停帧闸门（标签页隐藏 / 划出视口 / 取景权被接走）、
//       reduced-motion 静态快进底片、颜色读 CSS 变量。
import { onMounted, onUnmounted, ref } from 'vue'
import { debounce } from '../lib/debounce.js'
import { music } from '../lib/music.js'
import { claimPlate, ensurePlate, ownsPlate, plateSpace, releasePlate, resetPlate, sky } from '../lib/sky.js'
import { buildRidgeMask } from '../lib/ridge.js'

// 取景权凭据：每个组件实例一份，fall 转场期间两机并存时只有最后挂载的那个往底片上画。
const self = {}

const cvs = ref(null)
const TAU = Math.PI * 2

/* ---------------- 常量（手感/性能参数集中，便于调优） ---------------- */
// 稳态亮度 ≈ 每帧沉积 DEP ÷ 每帧衰减 fade；因为沉积也乘了 step（见 accPass 的 sc），这条现在
// 在任何刷新率上都成立（改之前只在 60fps 成立，见 docs/design.md §3.1 / §9 第 7 条）。
//
// 这一对数值在 2026-10-07 被整体抬高 20 倍，为的是绕开 **8 位底片的量化地板**（docs/design.md §9 第 6 条）：
// destination-out 每帧把像素 α 乘 (1−fd)，而画布是 RGBA8 —— 一旦 α·round(fd·255) < 0.5 LSB，
// 取整就把这一帧的衰减整个吞掉，那个像素**再也掉不下去**。地板高度 = 0.5/(255·fd)：旧的
// fd=0.012 冻在 α≈0.17，于是每颗星 150s 扫过的一整圈永久留在底片上（按点积分复刻 accPass
// 跑 9000 帧实测：残留覆盖 6.3% 像素、10 条半径行覆盖率 >55%、最强一圈 99%，Δ灰 31）。
// 这就是"浓度怎么收都不轻"的真因——前几轮为了拉长尾迹把衰减一路调到 FADE_1=0.0038，
// 那一档 round(fd·255)=1，地板直接抬到 α≈0.5：收参数等于把底片焊死，越调越浓。
// 沉积与衰减同时 ×20 → 稳态亮度 al/(al+fd) 逐位不变，地板压到 Δ灰 2 以下。
//
// 代价：尾迹长度不能再挂在衰减窗口上（1/fd 只剩 0.2°），改由弧长承载，见 accPass 的 len。
const OMEGA = 0.042 // 基础角速度 rad/s（刚体旋转，全场一致；越小天空转得越从容）
// 沉积基准 alpha（深色，60fps 那一档）。2026-10-07 第六轮随线宽**等墨**缩放：线宽中位 ×1.55，
// 单位弧长的墨 = α·lw 要保持不变（⑮ 刚把深色的脏灰压下去，加粗若不同时减 α 就是把那份墨还回去），
// 所以 0.168 → 0.108。`FADE_*` 不动：地板 = 0.5/(255·fd) 只跟 fd 有关，与这一对的比例无关。
// 2026-11-14 三次调整（作者评「太浓了，没有足够的留白」）：0.132 → 0.082。
// 上一轮为了"效果明显"把浓度、星数、显示增益一起往上推，结果满屏密纹、天空没有呼吸的地方。
// 这一轮反过来：减墨、减星、收窄辉光，让星环回到"疏朗的几笔"。留白是这一版的主题。
// 四次（「过于稀疏」）：0.082 → 0.104，回到二次(0.132)与三次(0.082)的中档。
const DEP = 0.104
const FADE_0 = 0.172 // 页顶衰减/帧
const FADE_1 = 0.104 // 最深衰减/帧（与 FADE_0 的比值沿用旧版 0.604：下潜越深窗口越长）
const FLOW_MAX = 2.2 // 下潜最深处的时间流速加成
const HEAD_GAIN = 2.0 // 头部亮段的 alpha 倍率：让拖痕前沿比尾巴亮（2.6→2.0，随整体减墨一起收）
const FEAT_MIN = 8000 // 独立尾部消失的最小间隔 ms（2026-09-17 是 5.2s；10-30 弱化随机放回 8s）
const FEAT_MAX = 14000
const FEAT_DUR = 4.2 // 独立尾部消失时长 s（量级与整体旋转周期协调，避免突兀）
const LENS_R = 180 // 指针时间膨胀半径 px
// 星数。220→180 是 ⑫ 那轮按"太密"收的，但那时底片上还叠着一层永久残留（⑭）——
// 地板没了才看得见真实浓度，所以往回补到 280。2026-10-30 作者要"减少拖尾的细丝、降低加载压力"：
// 收到 220 / 110（深色再乘 N_DEEP_K，= 143 / 72），每帧笔数 −21%，同时把最淡的那批"细丝"
// 交给线宽与弧长去收（见 LW_BASE / SHEAR_*）。窄屏单独一档，见 §3.1 的手机读数。
// 2026-11-14 四次（作者评「这回有点过于稀疏」）：132/68 → 176/90，取三次的疏朗与二次的
// 饱满之间的中档。深色 114 / 浅色 176，环与环之间仍有天空，但不再只剩零星几笔。
// 五次：176/90 → 124/64。配额已把根数让给中亮两档，总数再收一档，
// 于是"能看清的弧"数量基本不变，而背景灰丝少了六成。
// 七次：110/58 → 96/50。中+亮 = 84 根（与上一版逐根相等），暗档 26 → 12 根。
const N_BIG = 96
const N_SMALL = 50
// 星数必须**分主题**：同一套 α 在两个主题上的可见面积差着一个数量级。浅色是墨压浅底
// （底亮度 245），α<0.05 的抗锯齿羽化按 Weber 律根本看不见；深色是冷白加在近黑底上
// （实测底亮度 2.2 级），一条 α=0.037 的羽化边就是 7 级 = 320% 对比 → 220 根的羽化叠起来
// 读成"一片脏灰的轨迹"。量法见 docs/design.md §9 第 8 条。
const N_DEEP_K = 0.65 // 深色主题的星数倍率（浅色=1）
// 线宽。旧值 `0.6 + z·1.2` 的中位数只有 0.94 CSS px，而他那块屏是 1× 缩放——**上屏的采样网格
// 就是 1 CSS px = 1 设备像素**，一根不到一格的线必然沿程明暗跳：按面积积分量过，脊的谷/峰只有
// 0.33（同一条线自己亮 30 级、暗 10 级交替）。底片内部超采样治不了它（p=1.645 时 0.34、p=2 时
// 0.24，等于没修，见 docs/design.md §9 第 9、10 条），只有把线本身加粗才行。中位 0.94→1.45 px 后谷/峰回到 0.52。
// 2026-10-30 再抬 0.1：星数收了两成，单价（线宽）补一点，"细丝"读成笔画而不是丝线。
const LW_BASE = 1.15
const LW_SPAN = 1.15 // 中位 1.55 / p90 1.91 / 最粗 2.30 CSS px
/* 最小线宽（2026-11-14 八次，根治「细密的淡线太多」）。
 * 淡线的物理来源不是数量而是**亚像素笔画**：暗档 lw≈0.7 CSS px，在 1× 屏上被采样成
 * 断续的灰点，眼睛读成"底片脏了"。前几轮靠减暗档数量去治，减到 12% 仍有残留，
 * 而且再减就要动可见弧的密度（作者四次评过"过于稀疏"）。
 * 现在从结构上兜底：任何笔画都不细于 1.25 CSS px，暗档改由**颜色**退成背景。
 * 于是"淡线"这个类别不存在了——每一笔都是实在的弧，只有颜色深浅之分。 */
const LW_MIN = 1.25
// 衰减窗口被 ⑭ 压到 4 帧之后，尾迹长度就**等于**弧长，所以下面这几个数是"长不长"的主旋钮，
// README 配图也从源码读它们。历史：曾按幂分布让每根弧长短不一（中位 18.7°/最长 54°/亮星 81°），
// 那一版读成螺旋臂，已于 2026-11-14 整体退役，见下。
/* 曝光窗口 = 每根弧的角长基准（2026-11-14 重建，修「更像漩涡而不是星环」）。
 * 真实长曝光里，同一张照片上**所有恒星在同一时段走过相同的角度**——这是周日视运动的刚体
 * 性质。弧长各不相同在物理上就不成立，而它正是漩涡感的第二个来源：一圈圈长短不一的短弧，
 * 每根只覆盖 19°~81°，眼睛把它们连成螺旋臂，而不是一组同心环。
 * 现在所有星共享同一个基准角长（`EXPOSURE_DEG`），只留 ±`SHEAR_JIT` 的极窄抖动当作云幕/
 * 快门的微小不匀——不再有"每根都不一样长"。层次改由星等（线宽/亮度/星核）承担，那才是
 * 真实照片里区分恒星的东西。
 * 2026-11-14 三次（留白）：84° → 46°。弧太长是"满"的另一半来源——即便星数减了，
 * 每道弧扫过近四分之一圈，环与环之间就没有天空。收短到 46°，每道弧是一段明确的短弧，
 * 弧与弧、环与环之间留出呼吸的空。仍保持等长（不回到长短不一的漩涡）。 */
// 四次：46° → 64°，中档。46° 的短弧在减星之后读成零星几笔；64° 让每道弧有足够走向。
const EXPOSURE_DEG = 64
const SHEAR_JIT = 0.05 // 角长的相对抖动（±5%）：几乎等长，只避免机械感
// 基准角长 rad = EXPOSURE_DEG·π/180 = 64°。写成字面量是因为离线复算脚本的常数正则
// 只认数字（scripts/build_readme_art.mjs 的 num()），算式会读不到而判"图与代码分叉"。
// 改曝光长度时两处一起改：EXPOSURE_DEG 给人读，SHEAR_MIN 给机器读。
const SHEAR_MIN = 1.1170107212763709
const SHEAR_SPAN = 0 // 已退役：角长不再按幂分布抽取，保留常量名供复算脚本读取
const SHEAR_POW = 1 // 已退役（同上）
/* 最短弧的**像素**下限（2026-11-14）。弧长 = 角长 × 半径，所以同一个 5.2° 在外圈是几十 px、
 * 在内圈（r≈40px）只有 3.6px——加上圆头线帽就成了一枚短划，整片内圈读成碎点噪声，
 * 这是"一部分轨迹很脏乱"的另一半来源（第一半是星等与角度的数列共振，见 CLS_BRIGHT）。
 * 抬到 9px：约中位线宽的 6 倍，足以读出走向，又不至于把内圈画成一圈实线。
 * 只抬下限、不动上限，外圈的长短错落照旧由 shear 承载。 */
const ARC_MIN_PX = 9
/* 弧尾相位的错开幅度（占曝光窗口的比例）。
 * 注意：尾端**不会**对齐成放射状断口——每颗星的起始角 θ 本来就铺满圆周，尾端 θ−L 同样铺满，
 * 所以等长弧天然没有断口。这一项只留一点点自然不匀（云幕/快门），不是用来防断口的。
 * 0.34 曾把弧长压到 53°~88°，落差太大又读回"长短不一的短弧"、削弱环的读感；
 * 收到 0.12 → 74°~88%，几乎等长，同心环最清楚。 */
const ARC_LAG = 0.12
// 全局角速度呼吸：两个不可通约的慢波相乘，±14% 非周期起伏。刚体 ω 保证几何正确，
// 但恒定 ω 读起来像节拍器；加呼吸之后天空是"被风推着"的，时紧时松，而全场一致 ω 的
// 周日视运动叙事不变（所有星共享同一个 gust，不做差速旋转）。
const GUST_A = 0.14 // 2026-10-30 收：0.22 的转速起伏在长弧上读成"抽动"，弱化随机后留 0.14
const GUST_W = TAU / 47 // 主周期 ≈47s
// 下潜越深，弧拖得越长：len = (flow·FADE_0/fade)^LEN_POW。括号里就是"曝光窗口 × 转速"，
// 物理上尾迹 ∝ 它，但直接线性会在最深档给出 5.3 倍（25.6°→136°），一眼看出是同一根被拽长，
// 所以按 LEN_POW 压一档。0.28 给页顶→最深 1.0→1.58 倍。
const LEN_POW = 0.28
const METEOR_MIN = 6000 // 流星最短间隔 ms
const METEOR_MAX = 9000
const PLATE_STEPS = 380 // reduced-motion 静态底片快进步数
const PLATE_OM = 0.17 // 快进角速度 rad/s
// 静态底片是减弱动效用户**唯一**能看到的东西，所以它的浓淡必须跟着 live 的 fade 走：
// PLATE_FADE : FADE_0 这个比例（≈0.58）自 2026-09-17 起就没变，上面那轮 FADE_0 降了就跟着降。
// 尾迹长度靠 PLATE_LEN 撑：衰减窗口只有 1/0.1 ≈ 10 帧（≈1.6°），旧的"快进 4 倍角速度换 33°
// 长尾"这一条在 ×20 之后不成立了，所以静态版直接把弧放长 1.6 倍（5.2°~53.8° → 8°~86°），
// 比 live 页顶那一档长一些——它是一张"冲好的长曝光"，该比实时那一眼更满。
const PLATE_FADE = 0.1
/* 静态底片的弧长倍率。基准角长已抬到 84°（EXPOSURE_DEG），再乘 1.6 会到 134°——
 * 半圈以上就不是"一段弧"而读成闭合环了。收回 1.0：静态版与实时页顶同一口径的曝光，
 * 它本来就是一张冲好的长曝光，不需要额外拉长。 */
const PLATE_LEN = 1.0
/* ---- 星核（当帧层，不进底片）----
 * 长曝光照片里每道弧的前沿都有一颗**点状的星**：弧是它这一夜走过的路，星是它此刻在的地方。
 * 底片里的 HEAD_GAIN 只是把前沿那一段画亮，累积之后仍是一段弧、读不出"一个点"。所以星核
 * 画在当帧层（与流星同层）：锐利、随闪烁呼吸、不累积——累积了就又变成一道弧。
 * 三档半径跟星等走，透明度直接取 z，于是暗档几乎看不见、亮档是几枚明确的亮点。
 * 浅色是干版上的墨点（不带光晕，浅底忌糊），深色是辉光加白芯。 */
const CORE_R = [0.9, 1.45, 2.4] // 星核半径 CSS px（暗 / 中 / 亮）：四次取中档
/* 透明度增益。实测教训：山脊遮罩在天极附近只保留约 0.62–0.75 的 alpha（大气透视，
 * ridge.js 的 RIDGE_ALT_FLOOR/K），星核画在遮罩之前，所以会被同比例压暗。
 * 原先增益 1.15 时整张画布最高 alpha 只有 ~200、超过 200 的像素仅 0–1 个——
 * 星核淡到读不出"一个点"。抬到 1.5 让亮档（z≥0.75）在乘遮罩之前就顶到 1，
 * 衰减后仍落在 160–255，亮星于是成为明确可辨的亮点。 */
const CORE_A = 1.5
const CORE_HALO = 5.2 // 深色辉光半径 = 核半径 × 此值
/* ---- 冲印增益（显示端，2026-11-14）----
 * 底片按站点常数算出来就是"多数暗、极少数亮"（z 的幂分布）。离线出图脚本一直带着
 * DEV_DEEP=2.8 / DEV_PAPER=1.6 的提亮，而**实时页面没有**——于是配图看着是一圈明确的星环，
 * 页面上却淡得几乎读不出来。这正是"星环效果不明显"的真因：不是几何问题，是显示端少了一道工序。
 * 现在实时合成补上等效增益：深色用加色叠绘（lighter 下叠 k 次 ≈ 亮度 ×(k+1)，且天然不截顶
 * 漂色），浅色用同一张底片再压一遍墨（source-over 下 α 合成 1−(1−α)^n，墨色更实）。
 * 只动显示，不动底片：底片仍是那份可复算的曝光记录，离线脚本与站点的算术不分叉。 */
// 2026-11-14 三次：1.9/0.85 → 0.55/0.22。上一轮补的这道提亮把"不明显"治过头了，
// 现在只留一点点，让底片本来的浓淡说话。配图脚本读同一对常数，两边不再各调一套。
// 四次：0.55/0.22 → 1.0/0.42，中档（二次 1.9/0.85，三次 0.55/0.22）。
const DEV_DEEP = 1.0 // 深色：额外叠绘次数（≈ ×2.0）
const DEV_PAPER = 0.42 // 浅色：额外压墨的 alpha（≈ ×1.42）
/* 换主题的交叉显影：旧底片先拍一张快照，在新底片重新长出来的这几百毫秒里淡出。
 * 原先 resetPlate() 一清，整夜的曝光当场归零、要盯着空天好几秒才重新长出弧来。 */
const GHOST_FADE = 620 // ms
const PLATE_REDEV = 200 // 换主题后重新显影的步数（比首次的 PLATE_STEPS 短，旧底片还在垫着）
/* 再次进首页时把逐帧累积押后的时长。原值 520ms 是按"首页转场带整页 blur"定的；
 * 2026-11-08 首页已收成纯 opacity 交叉淡化，进入方不再逐帧重栅格化，没必要让星环
 * 静止整整半秒——那半秒里星核不闪、弧不长，读作"卡住了"。 */
const RETURN_HOLD = 240 // ms
/* 半径取样：等距槽 + 槽内抖动 + 单调弯折。
 * 为什么不再用独立随机：n 条环自由落体必然结块——实测（n=180，12 次取均值）"最挤 10 条的跨度 ÷
 * 最松 10 条的跨度"是 5.81，且最小间距 0.0px（两条环几乎重合，读起来就是一根粗线旁边一大片空）。
 * 分层抖动保住槽内的随机，把结块比压到 1.65、50 个半径桶里的空桶从 3.3 个降到 1 个。
 * 上一版的"3 段重叠环带 + 三成完全随机"是为了消灭更早那版"4 段互不重叠、中间留 3 道空隙 = 太规整"，
 * 结果矫枉过正成了不均匀。中段略密的倾向由 MID_BIAS 继承（旧环带中段约比两端密 1.4 倍）。 */
const R_MIN = 0.065 // 最内圈占 maxR 的比例：四次取中档（0.03 → 0.1 → 0.065）
const SLOT_JIT = 0.56 // 抖动占槽宽的比例：四次取中档（0.62 → 0.5 → 0.56）
const MID_BIAS = 0.1 // 中段偏密强度：0.2→0.1，不再把环挤向中段
/* 角度：黄金角序列 + 抖动。2026-10-30 作者评"不够分散，一堆线条堆叠在一起"。
 * 根因是纯随机的 θ（`Math.random()*TAU`）：上百个点撒在圆周上必然有几处挤成一串，而半径相邻的
 * 两根若角度也相近，1~2px 的间距就会糊成一道粗线。改成一条低差异序列——相邻下标的起始角差
 * 137.5°，半径挨着的两根永远不在同一段弧上；0.16 圈的抖动（±28.8°）把序列的机械感打散。
 * 半径分布不动（R_MIN/等距槽/MID_BIAS 照旧）：用户说的是"分散"，不是"内外密度"。 */
const TH_GOLD = 0.6180339887498949
const TH_JIT = 0.16
/* 星等配额与角度分层（2026-11-14 修「一边多一边少、一部分轨迹很脏乱」）。
 * 旧写法 `cr = (i·0.3819660112501051) % 1` 有一个致命巧合：0.381966… = 1 − 0.618034…，
 * 正是**角度序列的补数**。于是 cr 与起始角严格反相关（两者相加恒为 1），星等完全由角度决定，
 * 三档各自挤进一段圆弧。实测（8 扇区计数 + 圆统计集中度 R，R=1 即全挤在一处）：
 *   n=220：亮 12 根 R=0.996、全部落在同一个 45° 扇区；中 49 根 R=0.921 只占三个扇区；
 *          暗 159 根反而避开那三个扇区。n=143/110/72 同形。
 * 这就是"右侧全是又粗又长的亮弧、左侧只剩细淡弧"的来源——不是随机，是数列共振。
 * 现在：① 每档根数按星数**精确配额**（亮 6% / 中 22%，与旧比例一致）；
 *      ② 亮星与中星的起始角**等分圆周**（第 k 根落在 (k+0.5)/n 圈），暗星保留黄金角。
 * 中亮两档为什么不能也用黄金角或固定周期：它们根数少（4–47 根），任何固定步长都会与黄金角
 * 共振——实测按 50 根分组时 50×0.618≈30.9 几乎回到原点，亮星最大间隙冲到 194°。等分圆周
 * 与星数无关地成立：亮星最大间隙 = 360/n，正好理论最优。实测 220/143/110/72 四档，
 * 亮星间隙 28°/40°/51°/90°，与理想值逐档相等；中星 38°/46°/15°/23°。 */
/* 2026-11-14 五次（作者「细密的淡线太多了」）：暗档从 67% 砍到 38%。
 * 细密淡线的来源就是暗档——它占三分之二的根数，z 只有 0.10–0.32，画出来全是
 * 一两像素宽、 barely 可见的灰丝，叠在一起读成"底片脏了"而不是星空。
 * 现在把根数让给中亮两档：中 44% 撑起可读的蓝弧，亮 18% 做朱砂点睛，
 * 暗档只留 38% 当气氛。总根数同时再收一档（见 N_BIG），画面于是"少而清楚"。 */
/* 七次（「细密的淡线太多了」的根治）：暗档 24% → 12%。
 * 关键是**可见弧数量不变**：上一版 110 根里中+亮 = 84 根、暗档灰丝 26 根；
 * 这一版 96 根里中+亮仍是 84 根，灰丝只剩 12 根。所以画面不会变稀（作者四次评过"过于稀疏"），
 * 少的全是那批亚像素淡线。暗档从此只当纸纹气氛，不承担密度。 */
/* 九次（作者「蓝色太多红色太少」）：亮 16% → 24%、中 72% → 60%。
 * 朱砂从"点睛"升为第二主角；配合暖色概率 WARM_P 0.3 → 0.65，红弧数量约三倍。 */
const CLS_BRIGHT = 0.24 // 亮档配额：朱砂成为第二主角
const CLS_MID = 0.6 // 中档配额：72% → 60%，把画面让给红与留白
const WARM_P = 0.65 // 亮星抽暖档的概率：0.3 → 0.65，红弧要真的看得见（复算脚本读它）
const TH_TIER_JIT = 0.3 // 等分圆周的槽内抖动（占槽宽比例）：留 0.7 的缝，不排成机械刻度
/* 半径与角度的解耦（同日，修「更像漩涡」的主因）。
 * 上一版把中亮两档的角度按**档内序号 s** 等分圆周，可它们的**半径也是按同一个序号递增**的
 * （tierPlan 的槽位 i≈(s+0.5)·n/cnt，而 pickRn 的半径随 i 单调增）。半径与角度同步增长，
 * 数学上就是一条阿基米德螺线：实测相关系数 亮 **0.998** / 中 **0.999**，亮星逐根
 * (r=0.075,θ=10°) → (r=0.955,θ=345°) 一路盘出去——这正是漩涡臂。
 * 修法：角度槽位先过一道**与档内根数互质的步长排列** `q=(s·step) mod cnt`，把"第 s 根"与
 * "第 q 个角度槽"的对应打散，而槽位集合不变（角向均匀性一分不丢）。step 取 cnt·0.618 再
 * 向上找到第一个与 cnt 互质的整数，于是四档星数都成立：
 *   n=220 亮相关 0.998→**0.205**、中 0.999→**−0.015**；n=143 0.106/0.111；
 *   n=110 0.523/0.065；n=72 0.236/0.287。最大间隙仍是 33/47/61/107°（理想 28/40/51/90）。 */

let ctx = null
let W = 0 // 本相机的盒子尺寸（CSS px）；底片尺寸在 sky.w/h
let H = 0
let dpr = 1
let reduced = false
// 预曝光只做一次：底片跨路由常驻，回到首页不该把已经感光的这一夜倒掉重冲。
// 本组件只有一个挂载点（首页），所以模块级就够，不需要挂到 sky 上。
let warmed = false
let raf = 0
let last = 0
let visible = true // 标签页是否可见（visibilitychange）
let onScreen = true // 本机盒子是否在视口内（仅首页相机有意义）

// 时间流速 / 衰减（滚动驱动，带惯性）
let flow = 1
let flowT = 1
let fade = FADE_0
let fadeT = FADE_0

let meteors = []
let nextMeteor = 0
let px = 0
let py = 0
let pxT = 0
let pyT = 0
let hasPointer = false
// 指针影响力的淡入淡出（0..1）。原先 hasPointer 一翻就是全强度：指针离开 180px 边界时
// 那一圈的转速/亮度**跳变**，读作一块硬边光斑。现在半径内的形状不变，整体强度按惯性收放。
let ptrK = 0
/* 星核贴图：每个「色档 × 星等」预烘一张小画布，draw 里只做 drawImage。
   逐星 createRadialGradient 是每帧 220 次渐变分配，纯属浪费——星核长得一样，只有位置不同。 */
let coreSprites = null
/* 换主题时的旧底片快照（见 GHOST_FADE）。只留一张，用完即释放。 */
let ghost = null
let ghostT0 = 0
let ridgeMask = null // 首页相机的山脊遮罩（alpha 画布），见 src/lib/ridge.js
// 遮罩按"视口 + 主题 + 地景盒子"缓存：底片跨路由共享，遮罩没有理由每次挂载重画。
// 切回首页时那张半分辨率画布 + 逐列两条渐变正撞在转场上，是"回首页一卡"的一小块。
let ridgeCache = { key: '', mask: null }
// 再次进首页时把逐帧累积推到转场之后：fall 那 380ms 里整页都在逐帧重栅格化，
// 画布没必要在这段里同时开工。
let warmUntil = 0
let kickTimer = 0
let warming = false // 分片预曝光进行中：此时 kick() 一律不接，等 done 回调自己开循环
let disposed = false // 分片预曝光是跨帧跑的，卸载后必须自己停下

// 颜色
const C = {
  cold: [142, 201, 255],
  hot: [255, 92, 57],
  white: [255, 247, 237],
  ink: [244, 241, 234],
  trail: [],
  boost: 0,
  ghostBoost: 0, // 快照属于哪个主题（换主题淡出时要按它自己的合成模式画）
}

function hex2rgb(h) {
  const s = String(h).replace('#', '').trim()
  const n = s.length === 3 ? s.split('').map((c) => c + c).join('') : s
  if (n.length < 6) return null
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)]
}
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
const mix = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
]
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

function readColors() {
  const cs = getComputedStyle(document.documentElement)
  const get = (n, fb) => hex2rgb(cs.getPropertyValue(n).trim()) || fb
  const theme = document.documentElement.getAttribute('data-theme') || ''
  C.cold = get('--cold', C.cold)
  C.hot = get('--hot', C.hot)
  C.white = get('--white', C.white)
  C.ink = get('--text-0', C.ink)
  C.boost = theme === 'out' ? 1 : 0
  /* 星轨色板：色相承载星等（2026-11-14 五次，作者「颜色也优化一下」）。
   * 旧值浅色是 [ink×cold 0.42, ink×cold 0.12, hot]：暗档与中档只差 30% 的兑蓝量，
   * 两档都落在同一片灰蓝里，整屏读成"一种灰线的浓淡"，没有色彩层次。
   * 现在三档在**色相与明度上同时拉开**：
   *   浅色（墨压干版）：暗=极淡的冷灰蓝（退成纸纹背景）、中=明确的普鲁士蓝、亮=朱砂；
   *   深色（光加夜空）：暗=冷蓝微光、中=暖白、亮=琥珀。
   * 暗档不再是"中档调淡"，而是另一个色相位置——它负责气氛，不负责被看清。 */
  /* 八次：三档在**色相**上分开，不再靠"同一种蓝的浓淡"。
   *   浅色（墨压干版）：暗=石板灰蓝（ink 兑 34% cold，明确可见但不抢戏）、
   *                    中=普鲁士蓝（兑 62%）、亮=朱砂；
   *   深色（光加夜空）：暗=冷蓝微光、中=暖白、亮=琥珀。
   * 暗档兑蓝量从 0.2 抬到 0.34：配合 LW_MIN 的线宽下限，它现在是"淡而清楚的一道弧"，
   * 而不是"几乎看不见的灰丝"。层次由色相 + 线宽 + 浓度三者共同承担。 */
  C.trail = C.boost
    ? [mix(C.ink, C.cold, 0.34), mix(C.ink, C.cold, 0.5), C.hot]
    : [mix(C.white, C.cold, 0.6), C.white, mix(C.white, C.hot, 0.72)]
  // 只有真的换了主题才重铺底片（防串色）。同主题下挂载、换页都继续用这张——
  const themeChanged = theme !== sky.theme
  if (themeChanged) {
    // 先把旧底片拍下来：新底片要几百毫秒才重新长出弧，这段里让旧的那张淡出，
    // 而不是当场清空成一片空天。快照按旧主题的合成模式画（deep=lighter / out=source-over）。
    ghost = null
    C.ghostBoost = sky.theme === 'out' ? 1 : 0 // 旧底片的主题，快照按它的模式淡出
    // 减弱动效下不留快照：那条路没有 rAF 循环，淡出永远推不动，旧底片会停在满不透明
    // 一直盖着新底片。静态底片本来就是一次冲好的，直接换过去即可。
    if (!reduced && sky.acc && sky.acc.width > 2) {
      ghost = document.createElement('canvas')
      ghost.width = sky.acc.width
      ghost.height = sky.acc.height
      const g = ghost.getContext('2d')
      if (g) g.drawImage(sky.acc, 0, 0)
      else ghost = null
    }
    ghostT0 = performance.now()
    sky.theme = theme
    resetPlate() // 重铺以 sky.theme 比对挡下：同一主题的重复通知在这里走早返回，幂等
    seedStars() // 底片反正要重铺，星数按新主题重定（深色/浅色差 N_DEEP_K 倍）
    rebuildRidge() // 首屏地景随主题换底（同一取景的压暗版），折线复算一遍
    // 换主题 = 重新显影：新底片是空的，用与首次同一条分片快进路径长出这一夜，
    // 旧快照在上面淡出。不这么做的话切一次主题就要盯着空天等好几秒。
    if (!reduced) redevelop()
  }
  // 星核贴图跟着色板走：这里只作废，真正的烘焙在 resize() 里——贴图要按底片 DPR 出，
  // 而首次 readColors() 跑在 resize() 之前，那时 sky.dpr 还是初值。
  coreSprites = null
  // 但 reduced-motion 没有 rAF 循环，重绘只能挂在这一串事件上：若把它留在上面的分支里，
  // 观察器竞争失败的那台会永远显示旧配色那一帧。重绘是幂等的，每台都刷自己这一份。
  if (reduced) {
    ensureStaticPlate()
    draw(performance.now())
  }
}

/* 星核贴图：3 色档 × 3 星等 = 9 张小画布，挂载与换主题时各烘一次。
   尺寸按底片 DPR 出，draw 时按 CSS 尺寸贴回去，1× 与 2× 屏都锐。 */
function bakeCores() {
  const d = Math.min(2, Math.max(1, sky.dpr || 1))
  return C.trail.map((col) =>
    CORE_R.map((r) => {
      const R = C.boost ? r * 1.6 : r * CORE_HALO // 浅色只要一枚墨点，深色带辉光
      const size = Math.max(4, Math.ceil(R * 2 + 2))
      const c = document.createElement('canvas')
      c.width = c.height = Math.ceil(size * d)
      const g = c.getContext('2d')
      if (!g) return null
      g.setTransform(d, 0, 0, d, 0, 0)
      const m = size / 2
      if (!C.boost) {
        const rg = g.createRadialGradient(m, m, 0, m, m, R)
        rg.addColorStop(0, rgba(col, 0.5))
        rg.addColorStop(0.34, rgba(col, 0.16))
        rg.addColorStop(1, rgba(col, 0))
        g.fillStyle = rg
        g.fillRect(0, 0, size, size)
        g.fillStyle = rgba(col, 0.95)
        g.beginPath()
        g.arc(m, m, r, 0, TAU)
        g.fill()
        g.fillStyle = 'rgba(255,255,255,0.9)'
        g.beginPath()
        g.arc(m, m, r * 0.45, 0, TAU)
        g.fill()
      } else {
        // 干版墨点：实色小圆 + 极淡的一圈墨晕，不发光。
        // 核给满不透明：浅色是 source-over 压墨，淡了就只剩一道灰痕、读不出点。
        g.fillStyle = rgba(col, 0.12)
        g.beginPath()
        g.arc(m, m, R, 0, TAU)
        g.fill()
        g.fillStyle = rgba(col, 1)
        g.beginPath()
        g.arc(m, m, r, 0, TAU)
        g.fill()
      }
      return { c, size }
    })
  )
}

// reduced-motion 的静态底片：全站只冲一次，换页/第二台相机都不重冲
function ensureStaticPlate() {
  if (!reduced || sky.plateBuilt || !sky.acc) return
  buildPlate()
  sky.plateBuilt = true
}

/* ---------------- 山脊遮罩（只首页相机） ---------------- */
function rebuildRidge() {
  const key = C.boost ? 'out' : 'deep'
  if (!W || !H || !cvs.value) {
    ridgeMask = null
    return
  }
  // 地景横带的几何取 .hero-plate 自己的盒子：cover + 顶边钉死由 buildRidgeMask 复算，
  // 这里只交盒子。量盒子而不是按 H 的固定比例算——横带高度现在跟着照片走（HorizonHero 的
  // --band-h），而且 .hero 是 100svh，手机上与 innerHeight 不一致（canvas 尺寸已经踩过这个差）。
  const el = cvs.value.parentElement?.querySelector('.hero-plate')
  if (!el) {
    ridgeMask = null
    return
  }
  const a = el.getBoundingClientRect()
  const b = cvs.value.getBoundingClientRect()
  const box = { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height }
  const k = `${key}|${W}x${H}|${box.x},${box.y},${box.w},${box.h}`
  if (ridgeCache.key !== k) {
    ridgeCache = { key: k, mask: buildRidgeMask(key, W, H, box) }
  }
  ridgeMask = ridgeCache.mask
}

/* ---------------- 尺寸 ---------------- */
function resize() {
  // 相机一律取**视口**尺寸：底片就是视口大小，于是 kx/ky 恒为 1。
  // 首页相机不再量 hero 的盒子——它是 100svh，手机上比 innerHeight 小最多 ~17%，
  // 拿它当相机等于把底片非等比压扁：同心弧在首页变椭圆、进文章页又跳回正圆，
  // 正是统一天极要消灭的那种穿帮。多出来的一截由 .hero{overflow:hidden} 裁掉，
  // 代价只是取景范围少几十像素，几何不再错。
  W = innerWidth
  H = innerHeight
  if (!W || !H || !cvs.value) return
  ensurePlate() // 天区尺寸没变就沿用同一张底片（换页正属于这种情况）
  dpr = sky.dpr // 底片已按像素预算定过 DPR，相机跟随它即可，画上去 1:1 最锐
  const pw = Math.max(2, Math.round(W * dpr))
  const ph = Math.max(2, Math.round(H * dpr))
  cvs.value.width = pw
  cvs.value.height = ph
  cvs.value.style.width = `${W}px`
  cvs.value.style.height = `${H}px`
  ctx = cvs.value.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  onFlowScroll()
  seedStars()
  rebuildRidge()
  // 贴图按底片 DPR 烘；换主题时 readColors 已把它作废，这里补上
  if (!coreSprites) coreSprites = bakeCores()
  if (reduced) {
    ensureStaticPlate()
    draw(performance.now())
  }
}

function pickRn(i, n) {
  const u = (i + 0.12 + Math.random() * SLOT_JIT) / n
  const g = u + (MID_BIAS / TAU) * Math.sin(TAU * u)
  return R_MIN + (1 - R_MIN) * Math.min(1, Math.max(0, g))
}

/* 星等分层表：按星数精确配额，亮/中两档的槽位等距铺在序号上。
 * 只在星数变化时算一次（seedStars 调），不是每帧、也不是每颗星都算。
 * 返回 { cls: Int8Array, slot: Int16Array }：cls 是档位，slot 是该星在自己档内的序号
 * （暗档不用 slot，仍走黄金角）。见 CLS_BRIGHT 上方那段共振实测。 */
/* 与 m 互质的步长：取 m·0.618 附近第一个互质整数。(s·step) mod m 是 0..m−1 的一个排列，
 * 既打散"序号↔角度"的单调对应（那是螺线的来源），又完整保留等分槽位集合。 */
function coprimeStep(m) {
  let st = Math.max(2, Math.round(m * TH_GOLD))
  const gcd = (a, b) => (b ? gcd(b, a % b) : a)
  while (gcd(st, m) !== 1) st++
  return st
}

function tierPlan(n) {
  const nb = Math.max(1, Math.round(n * CLS_BRIGHT))
  const nm = Math.max(1, Math.round(n * CLS_MID))
  const cls = new Int8Array(n) // 默认 0 = 暗档
  const slot = new Int16Array(n)
  const bright = new Set()
  for (let k = 0; k < nb; k++) {
    const i = Math.min(n - 1, Math.floor(((k + 0.5) * n) / nb))
    bright.add(i)
  }
  // 亮档先占位；中档撞上亮档的槽就往后找一个空位，保证两档根数都不被吃掉
  let bi = 0
  for (const i of [...bright].sort((a, b) => a - b)) {
    cls[i] = 2
    slot[i] = bi++
  }
  let mi = 0
  for (let k = 0; k < nm; k++) {
    let i = Math.min(n - 1, Math.floor(((k + 0.5) * n) / nm))
    while (cls[i] !== 0 && i < n - 1) i++
    if (cls[i] !== 0) continue
    cls[i] = 1
    slot[i] = mi++
  }
  // 角度槽位 = 档内序号过一道互质步长排列：解耦半径与角度（见 TH_TIER_JIT 下方实测）
  const qb = coprimeStep(nb)
  const qm = coprimeStep(Math.max(1, mi))
  const ang = new Int16Array(n)
  for (let i = 0; i < n; i++) {
    if (cls[i] === 2) ang[i] = (slot[i] * qb) % nb
    else if (cls[i] === 1) ang[i] = (slot[i] * qm) % Math.max(1, mi)
  }
  return { cls, slot, ang, nb, nm: mi }
}

function mkStar(i, n, plan) {
  // 星等三档：暗多数（72%）铺底密度，中档（22%）撑层次，亮少数（6%）承担冲击力——
  // 真实长曝光照片读得出结构的正是那几根亮拖痕。三档的 z / 线宽 / 弧长 / 沉积各走各的区间，
  // 档间差大于档内抖动，层次一眼可分。
  // 档位由 tierPlan 按配额分层给出（不再用 (i·0.381966)%1——那与角度序列是补数，
  // 会把三档各自锁进一段圆弧，见 CLS_BRIGHT 上方的实测）。
  const cls = plan.cls[i]
  // 五次：暗档 z 上限 0.32 → 0.22，中档下限 0.34 → 0.42。
  // 档间差要大于档内抖动——暗档再亮一点就与中档糊成一片，那正是"细密淡线"的观感来源。
  const z =
    cls === 0
      ? 0.07 + Math.pow(Math.random(), 1.8) * 0.15
      : cls === 1
        ? 0.42 + Math.random() * 0.26
        : 0.78 + Math.random() * 0.22
  const rr = Math.random()
  // 起始角：暗档走黄金角（根数多，低差异序列最匀）；中亮两档等分圆周 + 槽内抖动。
  // 抖动量取各自槽宽的比例，于是根数少时抖得少、不会把等距优势抖没。
  // 注意 Math.random() 的调用次数与顺序必须与旧版一致（离线复算脚本按同一序列对齐）。
  const jitter = Math.random()
  /* 槽内抖动也走低差异序列，不用纯随机：13 根亮星时纯随机会让相邻间隙在 0.4×–1.6× 理想值
   * 之间摆，等分槽位白铺——出图实测仍读成"亮弧偏在一侧"。按档内序号取黄金角小数部分，
   * 相邻两根的抖动量必然差 0.618 圈（折到 ±0.5 后是 ±0.382），于是间隙稳定在 1±0.19 槽宽，
   * 既有错落又不成簇。随机数照旧取一次（离线复算按同一序列对齐），只是不再用它定角度。 */
  const q = plan.ang[i]
  const tj = ((q * TH_GOLD) % 1) - 0.5
  const th =
    cls === 0
      ? ((((i * TH_GOLD + (jitter - 0.5) * TH_JIT) % 1) + 1) % 1) * TAU
      : (((q + 0.5 + tj * TH_TIER_JIT) / (cls === 2 ? plan.nb : Math.max(1, plan.nm))) % 1) * TAU
  return {
    rn: pickRn(i, n),
    r: 0,
    th,
    z,
    // 色温跟星等走：暗=冷档、中=中性档，亮星里三成抽暖档点睛（配色见 readColors）
    tier: cls === 0 ? 0 : cls === 1 ? 1 : rr < WARM_P ? 2 : 1,
    // 八次：暗档不再压细（0.62 → 0.9）——亚像素笔画才是淡线的来源，压细等于制造淡线。
    // 三档的粗细差交给 LW_MIN 兜底后的自然差，退让改由颜色承担。
    lw: (LW_BASE + z * LW_SPAN) * (cls === 2 ? 1.55 : cls === 1 ? 1.2 : 0.9),
    head: cls === 2 || (cls === 1 && z > 0.55), // 头部亮段：亮星全给，中档只给偏亮的那半
    bleed: cls === 2, // 亮星外圈再叠一笔宽而淡的弧：墨晕/辉光，冲击力的主要来源
    dk: cls === 2 ? 1.75 : cls === 1 ? 1.25 : 0.5, // 五次：暗档再收一半，把墨全让给中亮两档
    ta: 0.04 + 0.08 * Math.min(1, z), // 闪烁幅度随星等增大；2026-10-30 减半——整屏眨眼读成噪点
    tw: 0.3 + Math.random() * 1.3,
    ph: Math.random() * TAU,
    // 云幕慢包络：周期 40~126s、幅度 5~12% 的缓变暗化。与快闪烁（tw）、独立尾部消失
    // （feat）叠成三个时间尺度，天空才不像齐步走；单看任何一个周期都太长，读不出循环。
    ca: 0.05 + Math.random() * 0.07, // 云幕幅度：0.10–0.22 → 0.05–0.12（弱化随机，别整片忽明忽暗）
    cw: 0.05 + Math.random() * 0.11,
    cp: Math.random() * TAU,
    // 曝光角长：所有星共享同一基准（刚体周日视运动 → 同一时段走过相同角度），
    // 只留 ±SHEAR_JIT 的窄抖动当作快门/云幕的微小不匀。星等不再改弧长——层次交给
    // 线宽/亮度/星核，那才是真实照片里区分恒星的东西（见 EXPOSURE_DEG）。
    shear: SHEAR_MIN * (1 + (Math.random() - 0.5) * 2 * SHEAR_JIT),
    /* 曝光起点相位（占曝光窗口的比例）。等长弧如果都从同一时刻起算，尾端会齐刷刷落在
     * 同一角度上，天球上就多出一道放射状断口。给每颗星一个固定的相位偏移，等于它们各自
     * 在夜里不同的时刻进入画面——尾端于是散开，而每根弧仍然一样长。 */
    lag: Math.random(),
  }
}

function seedStars() {
  if (!sky.maxR) return
  // 星群是天空的属性，不是相机的；挂载形态不影响它，按视口宽度定一次数。
  // 主题倍率在这里生效：深色近黑底会把每条线的羽化边都放大成可见的灰轨，星数要收一档
  const n = Math.round((innerWidth <= 720 ? N_SMALL : N_BIG) * (C.boost ? 1 : N_DEEP_K))
  if (sky.stars && sky.stars.length === n) {
    for (const s of sky.stars) s.r = s.rn * sky.maxR // 数量未变 → 保留状态，仅重算半径
    return
  }
  const plan = tierPlan(n) // 分层表按星数算一次，逐颗建星时查表
  sky.stars = Array.from({ length: n }, (_, i) => mkStar(i, n, plan))
  for (const s of sky.stars) s.r = s.rn * sky.maxR
  sky.feat = [] // 星群重建：清空独立消失标记，索引已失效
  sky.featNext = 0
}

/* ---------------- 独立尾部消失（随机 1-2 根星轨，周期性换角） ---------------- */
function pickFeat(tSec) {
  sky.feat = []
  const r = Math.random()
  // 2026-10-30 由 1/2/3 根收到 1–2 根（30% / 70%）：三根同时换角在整屏密度降下来之后太抢眼。
  const count = r < 0.3 ? 1 : 2
  const set = new Set()
  let guard = 0
  while (set.size < count && guard++ < 60 && set.size < sky.stars.length) {
    set.add((Math.random() * sky.stars.length) | 0)
  }
  for (const i of set) sky.feat.push({ i, t0: tSec + 0.4 + Math.random() * 1.8 })
}

/* ---------------- 滚动 = 时间流速 ---------------- */
function onFlowScroll() {
  if (!H) return
  const k = clamp01(scrollY / (H * 1.1))
  flowT = 1 + k * FLOW_MAX
  fadeT = FADE_0 - k * (FADE_0 - FADE_1)
}

/* ---------------- 累积缓冲：衰减 + 沉积 ---------------- */

// om: 角速度 rad/s；fd: 每帧衰减；dtS: 帧时长 s；tAbs: 绝对时间 s；dep: 沉积基准 alpha
// sc: 帧时长比例（update 里的 step = dt/16.7），**承重**。衰减乘了 step、星角走 dtS，沉积若也不乘
// step，浓淡就随刷新率漂移：120Hz 上同一点每秒被叠两倍次数，未饱和处稳态亮度翻倍——最深档实测
// 中位亮度 0.216→0.283、顶到 α=1 的实心像素 0.72%→1.95%、环间黑隙 27px→20px（读成一片密纹），
// 那几轮"收参数没见轻"就是这个原因。乘上 step 后浓淡只由时间决定；60Hz 下 step=1，观感逐位不变。
// len: 弧长倍率。尾迹长度 = 弧长(≈shear·len) + 衰减尾(≈dth/fd)，而衰减尾在 8 位底片上被量化
// 地板限死在 1~2°（见 docs/design.md §9 第 6 条），所以"下潜越深、曝光越久"这条现在由 len 承载。
function accPass(om, fd, dtS, tAbs, dep, sc = 1, len = 1) {
  // 逐帧热路径：把 sky 上的对象先绑成局部引用，省掉满屏循环里的重复属性查找
  const a = sky.accCtx
  const acc = sky.acc
  const stars = sky.stars
  const feat = sky.feat
  const { x: polx, y: poly } = sky.pole
  // 衰减 pass：destination-out 均匀削掉底片透明度 → 决定"擦得多快"，并在弧的尾端留一段
  // 指数尾（长度 = dth/fd，量级只有 1° 上下）。尾迹本身的长度是弧长，见下面 dthLen。
  a.setTransform(1, 0, 0, 1, 0, 0)
  a.globalCompositeOperation = 'destination-out'
  a.globalAlpha = 1
  a.fillStyle = `rgba(0,0,0,${fd})`
  a.fillRect(0, 0, acc.width, acc.height)
  plateSpace()

  // 增量 pass：每颗星画本帧的短弧 → 长曝光自然累积
  for (let tier = 0; tier < 3; tier++) {
    a.strokeStyle = rgba(C.trail[tier], 1)
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i]
      if (s.tier !== tier) continue
      const x = polx + Math.cos(s.th) * s.r
      const y = poly + Math.sin(s.th) * s.r
      let boost = 1
      let ab = 1
      // 指针时间膨胀：局部转速加快 + 提亮 → 轨迹卷曲（光绘 torch）。
      // ptrK 是整体强度的惯性包络（见 update）：进出光锥不再硬跳一档。
      if (ptrK > 0.002) {
        const d = Math.hypot(x - px, y - py)
        if (d < LENS_R) {
          const f = (1 - d / LENS_R) * ptrK
          boost = 1 + 1.8 * f * f
          ab = 1 + 0.9 * f
        }
      }
      const dth = om * boost * dtS
      // 独立尾部渐隐：随机 1-2 根在 4.2s 里暗下去再回来，像云过。
      // 2026-10-07 去掉了另一条"转满前 20% 整体收尾"（SETTLE_*）：它按笔尖所在角统一削沉积，
      // 等于在天球上留出一道 72° 的系统性暗楔——所有半径在同一角度同时缺角，读起来就是"密度
      // 很奇怪 + 弧被切断"。衰减窗口缩短之后闭合环本来就不可能形成，那道楔子只剩副作用。
      let vk = 0
      for (let f = 0; f < feat.length; f++) {
        if (feat[f].i !== i) continue
        const p = clamp01((tAbs - feat[f].t0) / FEAT_DUR)
        vk = Math.max(vk, (0.5 - 0.5 * Math.cos(TAU * p)) * 0.45) // 0→0.45→0 的柔和独立渐隐（不整星熄灭，避免环口）
      }
      s.th += dth
      /* 本帧沉积的弧长。除了 shear·len，还要按半径兜一个**像素下限**：
       * 角长换算成弧长要乘半径，内圈 r 只有几十 px 时 5° 的弧不足 5px，加上圆头线帽
       * 就读成一枚短划/碎点——那是"一部分轨迹很脏乱"的另一半来源（第一半是星等共振）。
       * 这里把最短弧抬到 ARC_MIN_PX，内圈于是也是一道读得出走向的短弧而不是点。
       * 只抬下限、不动上限：外圈的长短错落照旧由 shear 承载。 */
      const raw = (s.shear * len + dth) * boost
      // lag：各星的曝光起点相位不同 → 等长弧的尾端不齐刷刷落在同一角度（见 mkStar.lag）
      const arcLen = raw * (1 - s.lag * ARC_LAG)
      const dthLen = s.r > 1 ? Math.max(arcLen, ARC_MIN_PX / s.r) : arcLen
      const tw =
        (1 - s.ta + s.ta * Math.sin(tAbs * s.tw + s.ph)) *
        (1 - s.ca + s.ca * Math.sin(tAbs * s.cw + s.cp))
      const al = Math.min(1, dep * s.z * s.dk * ab * tw * (1 - vk) * sc)
      // 墨晕/辉光：亮星在主弧之外先垫一笔宽而淡的同弧。浅色读成干版墨晕、深色在
      // lighter 下读成辉光，同一笔两种主题各取所需；只有 6% 的星走到这里。
      if (s.bleed) {
        // 辉光收窄：2.6→1.9 倍线宽、0.16→0.11 浓度。宽而淡的墨晕是"满屏发糊"的一半来源
        a.globalAlpha = Math.min(1, al * 0.11)
        a.lineWidth = s.lw * 1.9
        a.beginPath()
        a.arc(polx, poly, s.r, s.th - dthLen, s.th)
        a.stroke()
      }
      a.globalAlpha = al
      // 最小线宽：亚像素笔画在 1× 屏上会被采样成断续灰点，那是"细密淡线"的物理来源。
      // 兜到 LW_MIN 之后，每一笔都是实在的一道弧，暗档靠**颜色**退让而不是靠画不清楚。
      a.lineWidth = Math.max(LW_MIN, s.lw)
      a.beginPath()
      a.arc(polx, poly, s.r, s.th - dthLen, s.th)
      a.stroke()
      // 头部亮段：等亮的长弧只是一根光棒，前沿再叠一笔短而亮的弧才有"自尾向头递增"，
      // 读起来才是一颗正在划过的星。累积稳态的 头/尾 实测 1.3~1.6 倍（HEAD_GAIN 2.6 看着大，
      // 但每帧增量要走完 al/(al+fade) 才显现）——要更突出就同时动 HEAD_GAIN 和这里的比例。
      // 亮星的头段比中档长一截（0.30 vs 0.22），"彗头"感更重。
      if (s.head) {
        a.globalAlpha = Math.min(1, al * HEAD_GAIN)
        a.lineWidth = s.lw * 0.72
        a.beginPath()
        a.arc(polx, poly, s.r, s.th - dthLen * (s.bleed ? 0.3 : 0.22), s.th)
        a.stroke()
      }
    }
  }

  a.globalAlpha = 1
}

// reduced-motion：一次性快进生成静态长曝光底片，不启动 rAF
function buildPlate() {
  if (!sky.accCtx) return
  resetPlate()
  const dtS = 1 / 60
  for (let i = 0; i < PLATE_STEPS; i++) accPass(PLATE_OM, PLATE_FADE, dtS, i * dtS, DEP * (C.boost ? 1.5 : 1), 1, PLATE_LEN)
}

// 首次进首页的预曝光：同一条快进路径，但按 5ms 一片摊到若干帧里——
// 380 步全屏合成连做一次是几百毫秒的长任务，正好压在首屏照片淡入与路由转场上。
// 片与片之间让出主线程；跑完再开循环，于是"已经拍了一阵"的底片是分几帧长出来的。
function warmPlate(done) {
  if (!sky.accCtx) return done()
  resetPlate()
  const dtS = 1 / 60
  let i = 0
  const slice = () => {
    if (disposed) return
    const t0 = performance.now()
    while (i < PLATE_STEPS && performance.now() - t0 < 5) {
      accPass(PLATE_OM, PLATE_FADE, dtS, i * dtS, DEP * (C.boost ? 1.5 : 1), 1, PLATE_LEN)
      i++
    }
    // 每片都贴一帧：底片是"分几帧长出来"的，而不是先空着再整张跳出。
    // 一片 5ms + 一帧贴图仍在 16.7ms 内；转场 blur 期间它的读者只有这块首屏画布。
    draw(performance.now())
    if (i < PLATE_STEPS) requestAnimationFrame(slice)
    else done()
  }
  slice()
}

/* 换主题的重新显影：与 warmPlate 同一条分片快进路径，只是步数短一档（旧快照还在垫着，
   不需要一次冲满）。跑完把控制权交回逐帧循环；期间 warming 立起，kick() 不接，
   卸载时 disposed 会把它停掉——两条守卫与首次预曝光共用，不另开一套。 */
function redevelop() {
  if (!sky.accCtx || warming) return
  warming = true
  const dtS = 1 / 60
  let i = 0
  const slice = () => {
    if (disposed) return
    const t0 = performance.now()
    while (i < PLATE_REDEV && performance.now() - t0 < 5) {
      accPass(PLATE_OM, PLATE_FADE, dtS, i * dtS, DEP * (C.boost ? 1.5 : 1), 1, PLATE_LEN)
      i++
    }
    draw(performance.now())
    if (i < PLATE_REDEV) requestAnimationFrame(slice)
    else {
      warming = false
      kick()
    }
  }
  slice()
}

/* ---------------- 流星 ---------------- */
function spawnMeteor(delay) {
  if (meteors.length > 8) return
  const dir = Math.random() < 0.5 ? 1 : -1 // 右下 / 左下入射
  const sx = dir > 0 ? Math.random() * W * 0.7 : W - Math.random() * W * 0.7
  const sy = Math.random() * H * 0.4
  const a = (dir > 0 ? 0.42 : Math.PI - 0.42) + (Math.random() - 0.5) * 0.24
  const sp = 900 + Math.random() * 600
  meteors.push({ x: sx, y: sy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t0: performance.now() + (delay || 0) })
}

/* ---------------- 帧 ---------------- */
function update(dt, now) {
  const step = Math.min(3, dt / 16.7)
  // 流速/衰减/指针光锥的惯性推进。0.9 时约 1/3 秒就贴到目标，改滚动速度的瞬间会"弹"一下；
  // 放到 0.94（约 1 秒收敛）让天空是被慢慢推动的，而不是被拽过去的。
  const sp = 1 - Math.pow(0.94, step)
  flow += (flowT - flow) * sp
  fade += (fadeT - fade) * sp
  if (hasPointer) {
    px += (pxT - px) * sp
    py += (pyT - py) * sp
  }
  // 指针强度同一条惯性：进入时约 1 秒涨满、离开时约 1 秒收干，光斑边界不再是硬跳
  ptrK += ((hasPointer ? 1 : 0) - ptrK) * sp
  const tSec = (now - sky.t0) / 1000
  // 只有底片的主人能改天空：抽独立尾部、以及 accPass 里推进的星角。
  // 非主人照常往下走并 draw()：这条互斥是护栏（docs/design.md §3.1）——如今只挂一台相机
  // 实际不会并存，但交出取景权的相机不许冻在半帧上（那是切换顿挫感的真正来源）。
  if (ownsPlate(self)) {
    // 独立尾部消失：定时随机挑 1-3 根，周期独立、与整体旋转周期量级协调
    if (now > sky.featNext && sky.stars.length) {
      pickFeat(tSec)
      sky.featNext = now + FEAT_MIN + Math.random() * (FEAT_MAX - FEAT_MIN)
    }
    if (sky.feat.length) sky.feat = sky.feat.filter((f) => tSec - f.t0 < FEAT_DUR + 0.6)
    const dep = DEP * (C.boost ? 1.5 : 1)
    // 角速度呼吸：见 GUST_*。两个慢波不可通约，gust 在几分钟内不重复，
    // 恒定 ω 的节拍器感就是这么破掉的；全场星共享同一个 gust，刚体叙事不变。
    const gust = 1 + GUST_A * Math.sin(tSec * GUST_W) * Math.sin(tSec * GUST_W * 0.37 + 1.3)
    // len：曝光窗口越长（下潜越深）弧拖得越长，压缩幂见 LEN_POW。
    accPass(OMEGA * flow * gust, fade * (C.boost ? 1.4 : 1) * step, dt / 1000, tSec, dep, step, Math.pow((flow * FADE_0) / fade, LEN_POW))
  }
  if (now > nextMeteor) {
    spawnMeteor()
    // 播放中把随机间隔压向最短值 → 流星更密；停下后下一次生成即自然回弹。
    // 这里只是读一个普通属性（在 rAF 内），不会给 Vue 建立依赖。
    const span = (METEOR_MAX - METEOR_MIN) * (music.playing ? 0.4 : 1)
    nextMeteor = now + METEOR_MIN + Math.random() * span
  }
  for (let i = meteors.length - 1; i >= 0; i--) if ((now - meteors[i].t0) / 900 > 1) meteors.splice(i, 1)
}

// 衍射星芒绘制（流星亮头）：柔晕 + 锥形芒，随脉动呼吸；rot 让芒随飞行方向旋转
function drawStar(x, y, o) {
  const halo = o.halo
  const core = o.core
  const pu = o.pu
  const bl = o.bl
  const alpha = o.alpha ?? 1
  const rot = o.rot || 0
  const boost = C.boost
  const co = Math.cos(rot)
  const si = Math.sin(rot)
  // 锥形衍射芒：宽柔晕 + 亮锐芯；主/副 = 1:0.45，呼吸由 pu 驱动
  const ray = (0.26 + 0.32 * pu) * (1 + 0.55 * bl)
  const L = (boost ? 22 : 27) * (0.5 + 0.4 * pu + 0.5 * bl)
  const a0 = (boost ? 0.5 : 0.62) * ray * alpha
  for (const [dx, dy, k] of [
    [1, 0, 1],
    [0, 1, 1],
    [-1, 0, 1],
    [0, -1, 1],
    [0.7071, 0.7071, 0.45],
    [-0.7071, 0.7071, 0.45],
    [0.7071, -0.7071, 0.45],
    [-0.7071, -0.7071, 0.45],
  ]) {
    const rx = (dx * co - dy * si) * k
    const ry = (dx * si + dy * co) * k
    const g2 = ctx.createLinearGradient(x, y, x + rx * L, y + ry * L)
    g2.addColorStop(0, rgba(core, a0 * 0.42))
    g2.addColorStop(0.6, rgba(core, a0 * 0.12))
    g2.addColorStop(1, rgba(core, 0))
    ctx.strokeStyle = g2
    ctx.globalAlpha = 1
    ctx.lineWidth = 2.6
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + rx * L, y + ry * L)
    ctx.stroke()
    // 亮锐芯：略短，增强中心通透感
    const g3 = ctx.createLinearGradient(x, y, x + rx * L * 0.7, y + ry * L * 0.7)
    g3.addColorStop(0, rgba(core, a0))
    g3.addColorStop(1, rgba(core, 0))
    ctx.strokeStyle = g3
    ctx.lineWidth = 0.85
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + rx * L * 0.7, y + ry * L * 0.7)
    ctx.stroke()
  }
  // 光晕：深色主题两层辉光（近芯亮、外缘渐隐）；浅色干版忌糊不带光晕
  if (!boost) {
    const R = (2.6 + 1.6 * bl) * (0.82 + 0.36 * pu)
    const g = ctx.createRadialGradient(x, y, 0, x, y, R * 5)
    g.addColorStop(0, rgba(halo, (0.36 + 0.24 * pu + 0.4 * bl) * alpha))
    g.addColorStop(0.35, rgba(halo, (0.16 + 0.12 * pu + 0.18 * bl) * alpha))
    g.addColorStop(1, rgba(halo, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, R * 5, 0, TAU)
    ctx.fill()
  }
  // 星核 + 内芯高光（深色主题加点白芯提亮）
  ctx.fillStyle = rgba(core, alpha * (0.9 + 0.1 * bl))
  ctx.beginPath()
  ctx.arc(x, y, 1.7 + 0.7 * bl, 0, TAU)
  ctx.fill()
  if (!boost) {
    ctx.fillStyle = rgba([255, 255, 255], alpha * 0.92)
    ctx.beginPath()
    ctx.arc(x, y, 0.85 + 0.3 * bl, 0, TAU)
    ctx.fill()
  }
}

/* 星核层（当帧层，不累积）：把每颗星此刻的位置画成一枚点。
   与底片同一个合成模式（深色 lighter 发光 / 浅色 source-over 墨点），画在山脊遮罩之前，
   于是山后的星核和星轨一起被裁掉——它们都是天空的现象。
   闪烁直接复用星自己的 tw/ph，星核与它那道弧因此同步呼吸，不是两套节拍。 */
function drawCores(now) {
  if (!coreSprites || !sky.stars) return
  const tSec = (now - sky.t0) / 1000
  const { x: polx, y: poly } = sky.pole
  const stars = sky.stars
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i]
    // 档位：亮星（bleed）用最大那枚，中档用中号，暗档最小——与线宽/弧长的分档同向
    const sp = coreSprites[s.tier]?.[s.bleed ? 2 : s.head ? 1 : 0]
    if (!sp) continue
    const tw = 1 - s.ta + s.ta * Math.sin(tSec * s.tw + s.ph)
    ctx.globalAlpha = clamp01(s.z * CORE_A * tw)
    const x = polx + Math.cos(s.th) * s.r
    const y = poly + Math.sin(s.th) * s.r
    const h = sp.size / 2
    ctx.drawImage(sp.c, x - h, y - h, sp.size, sp.size)
  }
  ctx.globalAlpha = 1
}

function draw(now) {
  if (!ctx || !W || !sky.acc) return

  // 底
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.clearRect(0, 0, W, H)

  // 换主题的交叉显影：旧底片按**它自己那一主题**的合成模式先铺，再随时间淡出，
  // 新底片在下面同时长出来。淡出曲线取 (1-p)²，前段留住旧夜、后段收得快。
  const gp = ghost ? clamp01((now - ghostT0) / GHOST_FADE) : 1
  if (ghost && gp < 1) {
    ctx.globalCompositeOperation = C.ghostBoost ? 'source-over' : 'lighter'
    ctx.globalAlpha = (1 - gp) * (1 - gp)
    ctx.drawImage(ghost, 0, 0, W, H)
    ctx.globalAlpha = 1
  } else if (ghost) {
    ghost = null // 淡完即释放这张全尺寸画布
  }

  // 底片（长曝光星轨）：drawImage 顺带把天区坐标缩放进本相机的盒子（首页 hero ≈ 视口，比例≈1）
  ctx.globalCompositeOperation = C.boost ? 'source-over' : 'lighter'
  ctx.drawImage(sky.acc, 0, 0, W, H)
  /* 冲印增益：把底片再叠几遍，补上离线出图一直有、而实时端一直缺的那道提亮。
     深色 lighter 是加色，叠 n 遍亮度 ≈ ×(n+1) 且逐通道自然截顶在 255（不会像线性增益那样
     把冷蓝/朱砂漂成奶白）；浅色 source-over 是墨压干版，再压一遍 α 合成 1−(1−α)²，墨更实。
     整数遍用 globalAlpha=1，最后不足一遍的零头用 globalAlpha 补，倍数才连续可调。 */
  const dev = C.boost ? DEV_PAPER : DEV_DEEP
  const whole = Math.floor(dev)
  for (let k = 0; k < whole; k++) ctx.drawImage(sky.acc, 0, 0, W, H)
  const frac = dev - whole
  if (frac > 0.001) {
    ctx.globalAlpha = frac
    ctx.drawImage(sky.acc, 0, 0, W, H)
    ctx.globalAlpha = 1
  }

  /* --- 星核：每道弧前沿的那颗星 --- */
  drawCores(now)

  /* --- 流星 --- */
  for (const m of meteors) {
    const age = (now - m.t0) / 900
    if (age < 0 || age > 1) continue
    const tt = (age * 900) / 1000
    const x = m.x + m.vx * tt
    const y = m.y + m.vy * tt
    const tx = x - m.vx * 0.24
    const ty = y - m.vy * 0.24
    const env = Math.sin(Math.PI * age)
    const head = C.boost ? C.hot : C.white
    const tail = C.boost ? mix(C.ink, C.hot, 0.4) : C.cold
    const g = ctx.createLinearGradient(tx, ty, x, y)
    g.addColorStop(0, rgba(tail, 0))
    g.addColorStop(0.72, rgba(tail, 0.3 * env))
    g.addColorStop(1, rgba(head, 0.95 * env))
    ctx.strokeStyle = g
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.lineTo(x, y)
    ctx.stroke()
    // 亮头：锥形衍射星芒，随飞行方向旋转
    const rot = Math.atan2(m.vy, m.vx)
    drawStar(x, y, { halo: C.boost ? C.hot : C.cold, core: head, pu: 0.9, bl: 0.4, alpha: env, rot })
  }

  /* --- 山脊遮罩 --- */
  // 山体不吃星轨（流星同裁——它也是天空的现象，本该躲在山后）。
  // destination-in 只保留遮罩 alpha 非零处；遮罩是半分辨率平滑梯度，上采样不回引入台阶。
  if (ridgeMask) {
    ctx.globalCompositeOperation = 'destination-in'
    ctx.globalAlpha = 1
    ctx.drawImage(ridgeMask, 0, 0, W, H)
  }
  ctx.globalCompositeOperation = 'source-over'
}

function tick(now) {
  raf = 0
  // 停帧只看在不在看：标签页隐藏、或首页 hero 整块滚出视口。
  // 取景权不在这里判——那只管沉积，见 update()；否则交出底片的相机会冻在半帧上。
  if (reduced || !visible || !onScreen) return
  raf = requestAnimationFrame(tick)
  // 下界也要夹：kick() 里 last 取 performance.now()，而下一帧的 rAF 时间戳是帧起始时刻，
  // 可能比它更早 → 首帧 dt<0 → step<0 → 衰减 fillStyle 成 rgba(0,0,0,-x) 被静默丢弃，
  // 那一帧会沿用上一帧的衰减量、且短弧反向扫。
  const dt = Math.max(0, Math.min(48, now - last))
  last = now
  update(dt, now)
  draw(now)
}

function kick() {
  if (reduced || !visible || !onScreen || warming) return
  const wait = warmUntil - performance.now()
  if (wait > 0) {
    if (!kickTimer) {
      kickTimer = setTimeout(() => {
        kickTimer = 0
        kick()
      }, wait)
    }
    return
  }
  if (!raf) {
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }
}

function stopLoop() {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
}

/* ---------------- 交互 ---------------- */
// 指针要落回"天区坐标"：时间膨胀半径的那一侧是底片空间
function toSky(clientX, clientY) {
  const r = cvs.value?.getBoundingClientRect()
  if (!r || !W || !H) return null
  return [(clientX - r.left) * (sky.w / W), (clientY - r.top) * (sky.h / H)]
}

function onMove(e) {
  const p = toSky(e.clientX, e.clientY)
  if (!p) return
  hasPointer = true
  pxT = p[0]
  pyT = p[1]
  if (reduced) {
    px = pxT
    py = pyT
    ptrK = 1 // 无循环可推包络，静态档直接给满强度
    draw(performance.now())
  }
}

function onLeave() {
  hasPointer = false
  // 减弱动效没有逐帧循环，ptrK 不会被 update 推回 0——这里直接收干，
  // 否则指针离开后那圈提亮会永久留在静态底片上。
  if (reduced) {
    ptrK = 0
    draw(performance.now())
  }
}

function onDown(e) {
  const p = toSky(e.clientX, e.clientY)
  if (!p) return
  hasPointer = true
  pxT = px = p[0]
  pyT = py = p[1]
  if (reduced) {
    ptrK = 1
    draw(performance.now())
  }
}

function onVisibility() {
  visible = !document.hidden
  if (visible) kick()
}

// resize 要重建画布 + 重播星群，拖拽窗口时逐像素触发代价过高 → 去抖
const onResize = debounce(() => {
  resize()
  if (!reduced) kick()
}, 150)

let observer = null
let io = null // 视口可见性观察（仅首页相机）

onMounted(() => {
  reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  claimPlate(self) // 后挂载者接管底片（转场重叠期靠它防止双份沉积）
  if (!sky.t0) sky.t0 = performance.now() // 时钟全站一次：换页不清零，星角接着长
  const now = performance.now()
  nextMeteor = now + 2600
  if (!sky.featNext) sky.featNext = now + 3200 // 首根独立尾部消失约在 3.2s 后出现
  readColors()
  resize()
  observer = new MutationObserver(readColors)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  document.addEventListener('visibilitychange', onVisibility)
  addEventListener('scroll', onFlowScroll, { passive: true })
  addEventListener('resize', onResize)
  // 相机挂在 hero 100svh 流内：整块滚出视口后就没人看了，停帧。
  // rootMargin 外扩 200px：留一点余量，回滚时不会先看到一帧停滞的画面。
  io = new IntersectionObserver(
    ([e]) => {
      onScreen = e.isIntersecting
      if (onScreen) kick()
      else stopLoop()
    },
    { rootMargin: '200px' },
  )
  io.observe(cvs.value)
  if (reduced) {
    ensureStaticPlate()
    draw(performance.now())
  } else if (!warmed) {
    // 预曝光：首帧就交出一张"已经拍了一阵"的底片，而不是从空盘开始慢慢长。
    // 复用减弱动效那条快进路径（warmPlate 跑 PLATE_STEPS 步 accPass，星角与弧长都由它推进），
    // 它本来就是"冲好的长曝光"；区别是分片跑，不让它变成一个几百毫秒的长任务。
    warming = true
    warmPlate(() => {
      warming = false
      warmed = true
      draw(performance.now())
      kick()
    })
    draw(performance.now())
  } else {
    // 再次进首页：底片、星群、遮罩都还在。先贴一帧已有曝光（一次 drawImage），
    // 再把逐帧累积押后 RETURN_HOLD——首页转场已是纯 opacity，不再逐帧重栅格化整页，
    // 所以只让开进入方的头一小段，星核与弧很快就接着长（原 520ms 是按带 blur 的旧转场定的）。
    draw(performance.now())
    warmUntil = performance.now() + RETURN_HOLD
    kick()
  }
})

onUnmounted(() => {
  disposed = true
  warming = false
  if (raf) cancelAnimationFrame(raf)
  if (kickTimer) clearTimeout(kickTimer)
  kickTimer = 0
  observer?.disconnect()
  io?.disconnect()
  document.removeEventListener('visibilitychange', onVisibility)
  removeEventListener('scroll', onFlowScroll)
  removeEventListener('resize', onResize)
  onResize.cancel()
  // 只交还取景权，不动底片：acc 是全站共享的，置 null 等于每次导航重铺一张
  releasePlate(self)
})
</script>

<template>
  <canvas
    ref="cvs"
    class="st st-abs"
    aria-hidden="true"
    @pointermove="onMove"
    @pointerleave="onLeave"
    @pointerdown="onDown"
  ></canvas>
</template>

<style scoped>
.st {
  display: block;
}

.st-abs {
  position: absolute;
  inset: 0;
  z-index: 1;
  touch-action: pan-y;
}

@media (prefers-reduced-motion: reduce) {
  .st {
    opacity: 0.9;
  }
}
</style>
