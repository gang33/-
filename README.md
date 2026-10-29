# 林增宇 · 品牌设计师 / 作品集网站

React 18 + Vite 5 实现的单页作品集。瑞典 / 国际主义排版风格：米白纸感底色、Hairline 分割线、以字号与字距建立层级、唯一的赭红强调色，版心 1700px，面向 PC 大屏。

## 运行

```bash
npm install
npm run dev      # 开发预览，默认 http://127.0.0.1:5173
npm run build    # 生产构建，输出 dist/
npm run preview  # 预览构建产物
```

> 本机若 `node` 不在 PATH 中，可用 `"<node目录>\node.exe" "node_modules\vite\bin\vite.js"` 直接启动。

## 页面结构

| 顺序 | 模块 | 组件 |
| --- | --- | --- |
| 1 | 首屏 · 会翻的作品集封面：滚轮驱动，亚克力封面绕左侧装订轴向后翻开，露出内页（姓名 / 数据 / 目录） | `src/components/CoverBook.jsx` + `src/styles/cover-book.css` |
| — | 打字机封面（**备选版**，`?cover=type` 打开；两版同时保留，见 `_versions/README.md`） | `src/components/Hero.jsx` + `src/components/TypeWord.jsx` |
| 2 | 个人经历：人物图 / 自我介绍 / 联系方式 / 项目数据 / 工作与教育经历 | `src/components/Profile.jsx` |
| — | 关键词滚动条（放在个人经历之后，不再切断「翻书 → 见内页」这个动作） | `src/components/Marquee.jsx` |
| 3 | 作品轨道：6 个项目的实拍图绕椭圆轨道旋转（可拖动、点击转到最前、悬停减速） | `src/components/ProjectOrbit.jsx` + `src/components/OrbitImages.jsx` |
| — | ~~精选项目卡片区~~（已停用：项目展示由作品轨道 + 点击详情承担，`Projects.jsx` 保留在仓库里，需要时放回 App.jsx） | `src/components/Projects.jsx` |
| — | 设计准则整段陈述 | `src/components/Statement.jsx` |
| 5 | 个人优势：发丝线分隔的 2×2 卡片，悬停反白 | `src/components/Capability.jsx` |
| 6 | AI 工作流：6 步方法论 + 长引言 | `src/components/AiWorkflow.jsx` |
| 7 | 联系方式：整屏收尾页（墨底、超大标题、可点击邮箱、合作信息） | `src/components/Contact.jsx` |

## 首屏怎么翻的（CoverBook.jsx）

滚动不是「播动画」，而是**把滚动距离当成翻开的角度**，所以上下滚、快速滚、中途停下都跟手。

1. **行程**：`.bk-stage` 高 `100svh + 160svh`，里面 `.bk-pin` 用 `position: sticky; top: 0` 钉住一屏。
   进度 `p = -stage.top / (stage.height - innerHeight)`，被夹在 0~1。
2. **不是直接跟 p，而是过一道弹簧**：`K = 130`、`D = 2·√K·0.7` 做阻尼积分，
   所以快速滚动会有轻微过冲再回弹，停下来不会硬切。`prefers-reduced-motion` 时直通不插值。
3. **翻开**：`turnP = smoothstep(0.08, 0.86, p)`，封面 `rotateY(turnP × 104deg)`。
   注意**必须是正角度**——CSS 里 `rotateY(+θ)` 是把 +x 轴转离观者，
   写成负角度封面会朝观者鼓出来、透视放大糊满屏（踩过）。
4. **轴与透视**：`.bk-cover` 的 `transform-origin` 和 `.bk-persp` 的 `perspective-origin`
   都落在 `6.64%`（装订环的位置），两者必须一致，否则翻起来像在撕纸。
5. **内页浮现**：`--reveal = smoothstep(0.5, 0.88, p)` 写到 `.bk-page__inner` 上，
   CSS 里各元素用 `opacity: clamp(0, calc(var(--reveal) * N - M), 1)` 错峰浮出。
   起点必须晚于翻页中段，否则文字会和还在翻的封面叠在一起。
6. **装订环不跟着翻**：`.bk-mech` 是独立的静态图片，压在最上层。

素材在 `public/media/cover/`：`cover.webp`（2400×1227，162KB）、`mech.webp`（30KB）。
封面上的字（Brand Designer / 作品集 / Portfolio / 胶带）是 HTML 画的，不是印在图里的，
所以能随时改文案——改 `CoverBook.jsx` 顶部的 `COVER_TEXT` / `BIG_WORD` / `TAPE`，
坐标都以书宽 `--bw` 为基准等比缩放。

**这套坐标是量 `_素材/个人经历/封面.pdf` 的文字层来的**，不是凭手感摆的：
PDF 里那张封面照片的图框是 `(74.6, 107.4)–(1488.5, 830.9)`，所以
`nx = (x-74.6)/1413.9`、`ny = (y-107.4)/723.5`、`ns = 字号/1413.9`，
换算结果直接就是 `cover.webp` 的归一化坐标（两张图同源）。改动前请对着 PDF 复核。
两个坑：① `.bk-print__big` 的 `line-height: 0.78` 会让文字溢出到行盒上方，
所以 `BIG_WORD.y` 存的是「上升部线」而非行盒顶（0.6514 = PDF 的 0.562 + 溢出量）；
② PDF 里「作品」和「集」之间空着一个多字，拆成两个 span 才量得准。

> 手机（≤720px）只保留「名字 + 身份」一页：16:9 的书塞进竖屏只有 240px 高，
> 那套两栏排版读不了，其余信息交给下面正常排版的「个人经历」段。
> 书宽取 `1.05 ×` 屏宽：再大就会把右边的 LINZENGYU 和能力标签切出画面
> （旧的 1.22 倍是还没按 PDF 排版时定的）。

## 封面大字怎么实现的（TypeWord.jsx）

> 这套属于旧版打字机封面（`Hero.jsx`），现在首屏是 `CoverBook`，留档备查。

1. **逐字打字机**：`Portfolio` 拆成 9 个 `<span class="typeword__letter">`，
   内层 `.typeword__inner` 负责"从下方轻微旋转 + 淡入"，外层负责躲闪位移，
   两者用不同元素承载 transform，互不打架；每 105ms 多点亮一个字，打完光标闪几下自动消失。
2. **鼠标躲闪**：在字上监听 `pointermove`，用 `offsetLeft/offsetWidth` 算出每个字母的静止中心
   （不受 transform 影响，所以移动中也能算准）。光标与字母的距离小于 `DODGE_RADIUS` 时，
   按"远离光标"的方向给一个目标位移 + 随机正负旋转，再用 `requestAnimationFrame` 做缓动插值
   （每帧向目标靠近 16%），所以是弹性躲开、松手后弹性归位，而不是硬跳。
3. **自动撑满版心**：加载后测量字的自然宽度与容器宽度，按比例算出字号，保证不同屏幕上都铺满一行。

想调手感，改 `src/components/TypeWord.jsx` 顶部三个常量：

```js
const DODGE_RADIUS = 260 // 光标影响范围（px），越大越多字母会躲
const DODGE_PUSH = 84    // 推开距离（px），越大躲得越夸张
const EASE = 0.16        // 跟随速度，越大越灵敏、越小越飘
```

打字速度在同一个文件里的 `window.setInterval(..., 105)`（毫秒/字）。
`prefers-reduced-motion` 下会自动关掉打字与躲闪，直接显示整词。

## 项目清单

| 编号 | 项目 | 数据 | 图片来源 |
| --- | --- | --- | --- |
| 01 | 面老爹 · 手作小笼包 | 半年拓店 200+（广/沪/杭） | PDF P22 门店实拍 |
| 02 | 农五爷 · 鲜货烧烤 | 日营业额 2.8 万 | PDF P42 门店现场 |
| 03 | 黎耀阳 · 财神糖水铺 | 门店 200 → 500+ | PDF P83 节庆海报 |
| 04 | 帅茶 · 鲜制茶 | 30+ 门店 | PDF P47 包装系统 |
| 05 | 百老号 · 干挑面 | 七城联动 | PDF P70 物料 |
| 06 | 木生方舟 | 0→1 视觉全案 | PDF P60 物料 |

## 文件说明

```
index.html                 入口 + SEO / OG 标签
src/data.js                ★ 全站文案、项目数据、联系方式（改这一个文件即可）
src/App.jsx                页面装配 + 首屏版本切换 + 滚动进度条
src/components/            各模块组件
src/styles/base.css        设计令牌（颜色/字号/间距）、重置、栅格、揭示动画
src/styles/sections.css    各模块样式 + 响应式断点
src/styles/cover-book.css  首屏「会翻的书」全部样式（.bk-* 前缀，不和旧封面打架）
public/media/              占位视觉素材（SVG），替换说明见 public/media/README.md
public/media/cover/        首屏封面与装订环（cover.webp / mech.webp，从 _proto 的 5869×3001 原图导出）
_versions/                 首屏两个候选版本的源码快照（不参与构建，说明见 _versions/README.md）
```

## 首屏有两个候选版本

| 版本 | 打开方式 | 说明 |
| --- | --- | --- |
| v2 会翻的书（默认） | `/` 或 `?cover=book` | 滚动驱动亚克力封面掀开，露出「个人经历」内页 |
| v1 打字机 | `?cover=type` | 超大 `Portfolio` 逐字打出 + 鼠标躲闪 |

选择记在 `localStorage['lzy-cover-v1']`，下次打开自动沿用。两套代码都在 `src/` 里，
样式分别用 `.bk-*` / `.cover*` 前缀，互不污染。详细说明与快照见 `_versions/README.md`。

## 编辑模式（实时调版式 / 改文字 / 换图）

打开 **`http://127.0.0.1:5173/?edit`**（开发模式下默认就有），右下角会出现一个黑色「编辑」圆钮。

| 面板 | 能做什么 |
| --- | --- |
| **模块** | 8 个区块逐个独立调：上下留白、整块缩放、底色、文字色、强调色、上移 / 下移 / 隐藏；也能「在页面上点选模块」 |
| 字体 | 标题字体 / 封面 Portfolio 字体下拉切换；大标题字距滑杆 |
| 版式 | 风格主题切换（ABCD / 原版）、整体缩放、版心宽度、栏间距、四个全局主色 |
| 图片 | 列出页面全部图片，逐个「换图」选本地文件即时预览，「复原」还原 |
| 文字 | 「点选文字」后点页面上任意一段 → 单独调**字号 / 行高 / 字距 / 字重 / 字体 / 颜色 / 对齐 / 大小写**，还能直接改这段内容；另有「文字编辑」与「对比原文」 |
| **标注** | 开启后**点一下**留一条编号意见、**拖一下**框出要改的区域，刷新不丢 |
| 导出 | 复制 / 下载 JSON：模块设置、模块顺序、图片、文字、文字样式、逐条标注一次性带走 |

**文字检查器**：点选后按「所在模块 + 区块内序号」定位元素，样式直接写内联（`font-size` / `line-height` /
`letter-spacing` / `font-weight` / `font-family` / `color` / `text-align` / `text-transform`），
所以不会被任何组件样式覆盖；导出 JSON 里带「所在模块 / 原文 / 样式」三项，方便回写。

**模块级独立调整**：设置直接写成该区块的**内联样式**（`padding` / `background-color` / `color` / `zoom`
+ 就近覆盖 `--paper` `--ink` `--accent`），所以连黑底的收尾页也能被改，且不会影响其他模块。
留白用的是「首次测量到的基准 padding × 倍率」，不依赖 CSS 变量链。
改完会自动滚动到该模块并闪一下红框提示。

**撤销 / 重做**：面板右上角「↩ 后退 / ↪ 前进」，也可以 `Ctrl/⌘ + Z` 和 `Ctrl/⌘ + Shift + Z`。
历史最多 20 步，连续拖动同一个滑杆只记一步（700ms 内合并）。

**实时标注**：图钉和框选用页面坐标（含 scroll 偏移）记录，跟着页面滚动；
导出 JSON 里每条标注带「序号 / 所属模块 / 类型 / 页面坐标 / 尺寸 / 内容」，我可以逐条落实。

**面板可以拖动**：按住标题栏拖到任意位置（窗口缩放时会自动回到可视区），右上角「靠右」一键归位，位置会记住。

**对比原文**：在「文字」页签打开后，鼠标悬停改动过的文字会浮出原文小窗；
**按住不放 0.3 秒**会临时把这段文字还原成原文，松手回到改后版本，用来快速做 A/B 对比。

- 所有改动存在浏览器 localStorage，刷新不丢；「全部重置」一键还原。
- 图片替换只在浏览器里预览（本地上传的图不会自动写进项目），导出时记录**文件名**，
  开发者会把对应图片拷进 `public/media/` 并更新 `src/data.js`。
- 工具栏只在 `?edit` 或开发模式挂载，正式构建的访客看不到。
- 可调变量在 `src/styles/editor-hooks.css`（默认值等于原设计，不加变量时视觉零变化）。

## 风格主题（默认 ABCD 黑白）

参考 [A Black Cover Design](https://ablackcover.com/Info)（ABCD，广煜 & Nod Young，北京/洛杉矶）的视觉语言，
它由他们的 Cargo 站点里实际使用的字体与排版结构提炼而来：

| 特征 | 我们的做法 |
| --- | --- |
| 纯黑白、无暖色 | `[data-theme='abcd']` 把 `--paper` 定为 `#fff`、`--ink` 定为 `#0a0a0a`，强调色也收成黑 |
| 英文全大写宣言 | 封面新增 `.cover__caps`：`LIN ZENGYU IS A BRAND DESIGNER BASED IN GUANGZHOU…` |
| 等宽小标签 + 宽字距 | 全站 `.mono` 字距加宽到 `.14em`，编号/年份统一等宽 |
| 年份 → 条目表格 | 个人经历 `.cv__row` 收成紧贴的表格行，年份变黑色等宽、职位右对齐全大写 |
| ︎︎︎ 箭头链接 | 收尾页联系方式前自动加 `▸▸▸` 符号 |
| 无阴影 / 无圆角 / 图不加框 | 项目图去掉 `box-shadow` 与圆角，按钮去掉圆角 |
| 黑底收尾 | 陈述段与联系方式整块压黑，去掉径向渐变光晕 |

**已固化的定制（来自一次编辑模式导出）**

| 项 | 值 |
| --- | --- |
| 标题字体 | Schibsted Grotesk（`--font-display`） |
| 封面字体 | 方正华思刻线体（`--font-cover`） |
| 纸底 / 墨色 | `#ffffff` / `#292724` |
| 次级底色 | `#6e603f`（暗橄榄） |
| 版心宽度 / 栅格间距 | 1900px / 9px |
| 项目图饱和度 | 0.7 |
| 个人经历 | 整块黑底白字（含联系方式表格透明化、图注反色） |
| 关键词滚动条 | 黑底 `#000` + 白字，小圆点跟随文字色（早期版本是荧光黄 `#ffd70f`，改回只需改 `theme-abcd.css` 里那三行，注意底色/文字色/圆点要成组改） |

模块级颜色现在走**可继承的 `--sec-bg / --sec-ink / --sec-accent`**，
所以滚动条、陈述段、收尾页这些原来把颜色写死在子元素上的区块，也能被模块面板改掉。

切换方式：编辑工具栏 →「版式」→「风格主题」里点 **ABCD 黑白** / **原版纸感**，
选择记在 localStorage，`<html data-theme>` 控制，样式在 `src/styles/theme-abcd.css`。

## 出错怎么办

1. **先强制刷新**：`Ctrl + Shift + R`（Mac：`Cmd + Shift + R`）。开发时改文件偶尔会让浏览器停在旧的错误状态。
2. 如果页面顶部出现**红色报错条**：那是兜底提示，上面直接写着错误信息，截图发我即可。
3. 如果编辑工具栏自己崩了：它会缩成右下角一块红色小卡（`ErrorBoundary` 拦住），**网站正文不受影响**。
4. 想彻底清空编辑记录（颜色、字体、标注、文字改动都存在 localStorage）：
   工具栏「导出」→「全部重置」，或在浏览器控制台执行
   `localStorage.removeItem('lzy-editor-v1')` 后刷新。

已加的防护：`src/editor/ErrorBoundary.jsx`（隔离编辑器崩溃）、`src/main.jsx`（全局错误红条）、
`loadState()` 对所有本地数据做类型兜底（旧版本可能把 `notes` 存成对象，会导致 `.map` 抛错白屏）。

- 颜色：`--paper #F3F0EA` / `--ink #12110F` / `--accent #9C3A26`（法伦红）与 `--accent-lt` 用于深色背景
- 栅格：12 栏，`--max 1700px`，栅格间距随视口在 14–28px 之间
- 字体：**自托管**在 `public/fonts/`（无 Google Fonts 外链，国内打开不卡），
  拉丁字用 Schibsted Grotesk，标签/数据用 JetBrains Mono，中文走系统黑体栈。
  换字体只要改 `src/styles/base.css` 里 `--font-display` / `--font-sans` 的字体名，
  候选字体（Archivo / Space Grotesk / Outfit / Syne / Inter Tight）都已备好，
  详见 `public/fonts/README.md`；在线对比页：`/font-test.html`
- 动效：IntersectionObserver 逐块揭示、封面打字机与字母躲闪、图片悬停 1.03 倍缩放，
  全部尊重 `prefers-reduced-motion`

## 设计系统要点

- 颜色：`--paper #ffffff` / `--ink #292724` / 强调色随主题（ABCD 主题里收成墨色）
- 栅格：12 栏，`--max 1900px`，栅格间距 9px
- 字体：自托管在 `public/fonts/`，标题 Schibsted Grotesk，标签 JetBrains Mono，中文走系统黑体栈
- 动效：IntersectionObserver 逐块揭示、封面打字机与字母躲闪、图片悬停缩放，全部尊重 `prefers-reduced-motion`
## 下一步可迭代

1. 用真实项目图 / 人物照 / 视频替换 `public/media/` 下的占位素材；
2. 联系方式换成真实邮箱、电话与微信；
3. 若需要点击项目跳转案例页，可在 `Projects.jsx` 中把 `.project__media` 换成链接并新增详情路由。


