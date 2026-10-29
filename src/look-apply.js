/**
 * 把「最终版外观」重放到页面上 —— CSS 变量 / 模块级微调 / 单块文字样式。
 *
 * 为什么需要这个文件：
 * 这三类调整以前只在编辑工具栏（?edit）挂载时才生效，而工具栏是编辑工具，
 * 访客打开时根本不存在 —— 所以线上永远只能看到代码里的原始默认值。
 * 这里把工具栏里那套「应用」逻辑抽成独立模块，用 look-data.js 里固化好的
 * 数值在每次加载时重放一遍，访客也就看到同一套效果了。
 *
 * 原则：**这台机器上已经存过的设置优先**（stored 覆盖 baked）。
 * 谁在浏览器里又调过，就还是按他调的显示，不会被这里覆盖回去。
 */

import { keyOf as moveKeyOf, readMoves } from './move-tool.js'
import { LOOK_SECTIONS, LOOK_STORAGES, LOOK_TEXT_STYLES, LOOK_TOKENS } from './look-data.js'

const STORAGE_KEY = 'lzy-editor-v1'
const MOVE_KEY = 'lzy-move-v1'

/* 固化下来的「这台机器上原本存着的东西」：封面印字 / 滚动条 / 个人优势 / 细节放大 / 轨道 / 位移 */
const bakedMoves = () => {
  const baked = LOOK_STORAGES[MOVE_KEY]
  return baked && typeof baked === 'object' ? baked : {}
}

/* ==========================================================================
   读取浏览器里的设置（可能不存在）
   ========================================================================== */

function readStoredEditor() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch (err) {
    return {}
  }
}

/* ==========================================================================
   文字节点：跟编辑工具栏用同一套「稳定键」，否则样式会落到别的句子上
   ========================================================================== */

const CJK_FALLBACK = `'PingFang SC', 'HarmonyOS Sans SC', 'Source Han Sans SC', 'Noto Sans SC', 'Microsoft YaHei', sans-serif`

const TEXT_STYLE_FIELDS = [
  { key: 'size', css: 'fontSize', unit: 'px' },
  { key: 'ls', css: 'letterSpacing', unit: 'em' },
  { key: 'lh', css: 'lineHeight' },
  { key: 'weight', css: 'fontWeight' },
  { key: 'family', css: 'fontFamily' },
  { key: 'color', css: 'color' },
  { key: 'align', css: 'textAlign' },
  { key: 'upper', css: 'textTransform' },
]

// 轨道中心文字的大字/小字：字号、字距、字体、位移由 orbit-config 通过 React 渲染，
// 这里只补颜色、字重这类内联样式，绝不能把 React 写进去的内联样式清掉。
const ORBIT_TEXT_KEYS = ['size', 'ls', 'family', 'dx', 'dy']

const hasOwnText = (el) => {
  for (const node of el.childNodes) {
    if (node.nodeType === 3 && node.textContent.trim()) return true
  }
  return false
}

function cssPathOf(el) {
  const parts = []
  let node = el
  while (node && node.nodeType === 1) {
    if (node.id) {
      parts.unshift(`#${node.id}`)
      break
    }
    const parent = node.parentElement
    if (!parent) break
    const index = [...parent.children].indexOf(node) + 1
    parts.unshift(`${node.tagName.toLowerCase()}:nth-child(${index})`)
    node = parent
    if (node === document.body) break
  }
  return parts.join('>')
}

// 跟编辑工具栏完全一致的收集口径：只要元素「自己装着一段文字」就算，
// 不做标签过滤 —— 少一个元素，同一模块里的 #0/#1 序号就会错位，样式就落到别的句子上。
function collectTextNodes() {
  const root = document.querySelector('#root')
  if (!root) return []
  const out = []
  root.querySelectorAll('*').forEach((el) => {
    if (el.closest('[data-editor]')) return
    const tag = el.tagName
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'SVG' || tag === 'PATH') return
    if (!hasOwnText(el)) return
    out.push(el)
  })
  return out
}

const sectionIdOf = (el) => el.closest('section[id], div[id], footer[id]')?.id || 'global'

const textSnippet = (el) =>
  String(el?.dataset?.editorOriginal || el?.textContent || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 24)

function textNodeKey(el) {
  const sectionId = sectionIdOf(el)
  const snippet = textSnippet(el)
  if (!snippet) return `x|${cssPathOf(el)}`
  // 同一模块里如果有完全相同的文字，用出现顺序区分
  const twins = collectTextNodes().filter(
    (node) => sectionIdOf(node) === sectionId && textSnippet(node) === snippet
  )
  const suffix = twins.length > 1 ? `#${Math.max(0, twins.indexOf(el))}` : ''
  return `${sectionId}|${snippet}${suffix}`
}

/**
 * 一次算好整页的键 —— 语义与 textNodeKey 完全一致，
 * 但不会对每个元素都把全页扫一遍（原来那样一轮要跑几十万次，重放六轮会卡）。
 */
function buildKeyLookup(nodes) {
  const info = new Map()
  const groups = new Map()
  nodes.forEach((el) => {
    const section = sectionIdOf(el)
    const snippet = textSnippet(el)
    info.set(el, { section, snippet })
    if (!snippet) return
    const gk = `${section}\u0000${snippet}`
    if (!groups.has(gk)) groups.set(gk, [])
    groups.get(gk).push(el)
  })
  return (el) => {
    const own = info.get(el)
    if (!own) return null
    if (!own.snippet) return `x|${cssPathOf(el)}`
    const twins = groups.get(`${own.section}\u0000${own.snippet}`) || []
    const suffix = twins.length > 1 ? `#${Math.max(0, twins.indexOf(el))}` : ''
    return `${own.section}|${own.snippet}${suffix}`
  }
}

/* ==========================================================================
   应用：文字样式
   ========================================================================== */

const fontStack = (family) => `'${family}', 'Schibsted Grotesk', ${CJK_FALLBACK}`

function writeTextStyle(el, style, keepTranslate = false) {
  if (!el) return
  if (!style || !Object.keys(style).length) {
    if (keepTranslate) return
    TEXT_STYLE_FIELDS.forEach((field) => {
      const cssName = field.css.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
      el.style.removeProperty(cssName)
    })
    el.style.removeProperty('translate')
    return
  }
  TEXT_STYLE_FIELDS.forEach((field) => {
    const cssName = field.css.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
    const value = style[field.key]
    if (value === undefined || value === '' || value === null) {
      el.style.removeProperty(cssName)
      return
    }
    if (field.key === 'family') el.style.setProperty(cssName, fontStack(value))
    else if (field.key === 'size') el.style.setProperty(cssName, `${scaledSize(value)}px`)
    else el.style.setProperty(cssName, `${value}${field.unit || ''}`)
  })
  const dx = Number(style.dx) || 0
  const dy = Number(style.dy) || 0
  if (dx || dy) el.style.translate = `${dx}px ${dy}px`
  else if (!keepTranslate) el.style.removeProperty('translate')
}

function applyTextStyles(styles, moveMap) {
  const nodes = collectTextNodes()
  const keyFor = buildKeyLookup(nodes)
  nodes.forEach((el) => {
    const style = styles[keyFor(el)]
    if (el.closest('[data-orbit-center]')) {
      if (!style) return
      const inlineOnly = Object.fromEntries(
        Object.entries(style).filter(([field]) => !ORBIT_TEXT_KEYS.includes(field))
      )
      if (!Object.keys(inlineOnly).length) return
      writeTextStyle(el, inlineOnly, true)
      return
    }
    // 没有这条样式 → 什么都不动。绝不主动清空 translate：
    // 这段的重放会跑好几轮，清一次就会把移动工具/React 写好的位置擦掉。
    if (!style) return
    // 这段文字同时也在「移动内容」里记了位移 → 位移归移动工具管，
    // 两边都写 translate 会互相覆盖，最后谁后跑谁赢，位置就会飘。
    if (moveMap[moveKeyOf(el)]) {
      const { dx, dy, ...rest } = style
      writeTextStyle(el, rest, true)
      return
    }
    writeTextStyle(el, style)
  })
}

/* ==========================================================================
   应用：CSS 变量
   ========================================================================== */

function applyTokens(tokens) {
  const root = document.documentElement
  Object.keys(tokens).forEach((key) => {
    const value = tokens[key]
    if (value === undefined || value === '') root.style.removeProperty(key)
    else root.style.setProperty(key, value)
  })
  // 整体缩放：跟工具栏一致，缩放 body（不动 html），否则固定定位的导航会跟着跑
  const zoom = parseFloat(tokens['--page-zoom']) || 0
  // 窄屏不套整体缩放：1.15 倍放大只会让手机更挤，桌面保持用户调好的比例
  document.body.style.zoom = zoom && !isNarrow() ? String(zoom) : ''
}

/* ==========================================================================
   应用：模块级微调（底色 / 文字色 / 强调色 / 缩放 / 隐藏 / 上下留白）
   ========================================================================== */

// 第一次应用前记下每块的「基准内边距」，之后都用它乘倍率。
// 量不到就不缓存，下一轮再量（避免 CSS 还没生效时把 0 当成基准）
const basePadding = {}

const hexLum = (hex) => {
  const m = String(hex).replace('#', '')
  if (m.length !== 6) return 1
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function applySections(cfgMap) {
  Object.keys(cfgMap).forEach((id) => {
    const el = document.getElementById(id)
    if (!el) return
    const cfg = cfgMap[id] || {}

    const measured = window.getComputedStyle(el)
    const pt = parseFloat(measured.paddingTop) || 0
    const pb = parseFloat(measured.paddingBottom) || 0
    if (cfg.space && cfg.space !== 1) {
      // 基准只量一次：不然重放六轮会把 0.95 乘成 0.95^6，越缩越小
      if (!basePadding[id] && (pt || pb)) basePadding[id] = { pt, pb }
      const base = basePadding[id]
      if (base) {
        el.style.paddingTop = `${(base.pt * cfg.space).toFixed(1)}px`
        el.style.paddingBottom = `${(base.pb * cfg.space).toFixed(1)}px`
      }
    } else {
      delete basePadding[id]
      el.style.removeProperty('padding-top')
      el.style.removeProperty('padding-bottom')
    }

    // 底色：内联背景 + --sec-bg（子元素用这个变量）+ --paper 兼容旧规则
    if (cfg.bg) {
      el.style.backgroundColor = cfg.bg
      el.style.setProperty('--sec-bg', cfg.bg)
      el.style.setProperty('--paper', cfg.bg)
      el.style.setProperty('--paper-2', cfg.bg)
    } else {
      el.style.removeProperty('background-color')
      el.style.removeProperty('--sec-bg')
      el.style.removeProperty('--paper')
      el.style.removeProperty('--paper-2')
    }

    // 文字色：内联 + --sec-ink（子元素继承）+ 深底自动反白
    const darkBg = cfg.bg ? hexLum(cfg.bg) < 0.5 : false
    const ink = cfg.ink || (darkBg ? '#ffffff' : '')
    if (ink) {
      el.style.color = ink
      el.style.setProperty('--sec-ink', ink)
      el.style.setProperty('--ink', ink)
      el.style.setProperty('--ink-2', ink)
      el.style.setProperty('--sec-ink-2', darkBg && !cfg.ink ? 'rgba(255,255,255,0.6)' : ink)
    } else {
      el.style.removeProperty('color')
      el.style.removeProperty('--sec-ink')
      el.style.removeProperty('--sec-ink-2')
      el.style.removeProperty('--ink')
      el.style.removeProperty('--ink-2')
    }

    // 强调色
    if (cfg.accent) {
      el.style.setProperty('--accent', cfg.accent)
      el.style.setProperty('--sec-accent', cfg.accent)
    } else {
      el.style.removeProperty('--accent')
      el.style.removeProperty('--sec-accent')
    }

    el.style.zoom = cfg.zoom && cfg.zoom !== 1 ? String(cfg.zoom) : ''
    el.style.display = cfg.hidden ? 'none' : ''
  })
}

/* ==========================================================================
   对外：合并「固化值」与「这台机器上存过的值」
   ========================================================================== */

function mergeByKey(baked, stored) {
  const out = { ...baked }
  Object.keys(stored || {}).forEach((key) => {
    out[key] = stored[key]
  })
  return out
}

/* ==========================================================================
   窄屏：把「桌面上调好的绝对字号」按比例收回来
   - 那几处 87~157px 是照着 1440 宽排的，在 375 宽屏上会横向溢出；
     它们写在行内样式里，媒体查询压不住，只能在这里先算一下
   - 桌面（>860px）不缩放，看到的和原来一模一样
   ========================================================================== */

const NARROW_QUERY = '(max-width: 860px)'
const SIZE_SCALE_TIERS = [
  { max: 480, scale: 0.4 },
  { max: 860, scale: 0.55 },
]
const SIZE_FLOOR = 40

function isNarrow() {
  return typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia(NARROW_QUERY).matches
    : false
}

function scaledSize(px) {
  const n = Number(px)
  if (!Number.isFinite(n) || n <= SIZE_FLOOR || !isNarrow()) return px
  const vw = window.innerWidth || 1440
  const tier =
    SIZE_SCALE_TIERS.find((t) => vw <= t.max) || SIZE_SCALE_TIERS[SIZE_SCALE_TIERS.length - 1]
  return Number((n * tier.scale).toFixed(1))
}

export function applyLockedLook() {
  const stored = readStoredEditor()

  const tokens = mergeByKey(LOOK_TOKENS, stored.tokens)
  const styles = mergeByKey(LOOK_TEXT_STYLES, stored.textStyles)
  const sections = {}
  const sectionIds = new Set([...Object.keys(LOOK_SECTIONS), ...Object.keys(stored.sections || {})])
  sectionIds.forEach((id) => {
    sections[id] = { ...(LOOK_SECTIONS[id] || {}), ...((stored.sections || {})[id] || {}) }
  })

  const run = () => {
    try {
      // 位移表每次重新读：用户可能刚拖过东西
      const moveMap = { ...bakedMoves(), ...readMoves() }
      applyTokens(tokens)
      applySections(sections)
      applyTextStyles(styles, moveMap)
    } catch (err) {
      /* 忽略：任何一步失败都不该影响页面本身 */
    }
  }

  // React 挂载后还会重渲染几次（图片、字体、解密动画），分几个时间点各补一次，幂等
  run()
  window.requestAnimationFrame(run)
  ;[120, 400, 900, 1800].forEach((ms) => window.setTimeout(run, ms))

  // 窗口跨过「手机 / 桌面」这条线时重跑一次：字号与整体缩放都跟宽度有关
  if (window.matchMedia) {
    const mq = window.matchMedia(NARROW_QUERY)
    const onChange = () => run()
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else if (mq.addListener) mq.addListener(onChange)
  }
}

/* ==========================================================================
   一次性把「各模块自己的设置」种进这台机器的 localStorage
   - 封面印字 / 滚动条 / 个人优势 / 细节放大 / 轨道 / 位移 这几项都归各自模块读写，
     它们只认 localStorage；这里在缺的时候种一次，之后用户在页面上的调整照常生效。
   - 只在「这台机器上还没有」时种，绝不覆盖用户已经调好的东西。
   ========================================================================== */

const SEED_KEY = 'lzy-look-seed'
const SEED_ID = 'v1'

export function seedLockedStorages() {
  try {
    if (localStorage.getItem(SEED_KEY) === SEED_ID) return
    Object.keys(LOOK_STORAGES).forEach((key) => {
      const value = LOOK_STORAGES[key]
      if (!value || typeof value !== 'object') return
      if (localStorage.getItem(key)) return
      localStorage.setItem(key, JSON.stringify(value))
    })
    localStorage.setItem(SEED_KEY, SEED_ID)
  } catch (err) {
    /* 隐私模式下写不进去也不影响显示：上面的 applyLockedLook 会兜住 */
  }
}
