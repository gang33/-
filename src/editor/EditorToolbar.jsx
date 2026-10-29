import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import OrbitEditor from './OrbitEditor.jsx'
import CoverTextEditor from './CoverTextEditor.jsx'
import MarqueeEditor from './MarqueeEditor.jsx'
import PeekEditor from './PeekEditor.jsx'
import MovePanel from './MovePanel.jsx'
import VersionPanel from './VersionPanel.jsx'
import { readMoves, applyMoves } from '../move-tool.js'
import {
  captureSnapshot,
  resyncRecorder,
  restoreScrollAfterReload,
  setRecorderPaused,
  startAdjustmentRecorder,
} from '../adjust-history.js'
import {
  ORBIT_DEFAULTS,
  readOrbitConfig,
  subscribeOrbitConfig,
  writeOrbitConfig,
} from '../orbit-config.js'
import './editor.css'

/* ==========================================================================
   编辑工具栏：实时改字体 / 字号 / 颜色 / 间距 / 图片 / 文字
   - 只在「开发模式」或地址带 ?edit 时出现，正常访客看不到
   - 所有修改存在 localStorage，刷新不丢
   - 改完点「导出」拿到 JSON，交给开发者固化进代码
   ========================================================================== */

/** 页面上的模块清单（顺序即页面顺序，用于独立调节与标注定位） */
const SECTIONS = [
  { id: 'top', label: '封面 Cover' },
  { id: 'marquee', label: '关键词滚动条' },
  { id: 'profile', label: '个人经历' },
  { id: 'orbit', label: '作品轨道' },
  { id: 'statement', label: '设计准则' },
  { id: 'capability', label: '个人优势' },
  { id: 'aigc', label: 'AI 工作流' },
  { id: 'contact', label: '联系方式' },
]

const STORAGE_KEY = 'lzy-editor-v1'

const FONT_OPTIONS = [
  'Schibsted Grotesk',
  'Archivo',
  'Space Grotesk',
  'Outfit',
  'Syne',
  'Inter Tight',
  'FZ HuaSi KeXian',
]

const CJK_FALLBACK = `'PingFang SC', 'HarmonyOS Sans SC', 'Source Han Sans SC', 'Noto Sans SC', 'Microsoft YaHei', sans-serif`

const TOKEN_GROUPS = [
  {
    title: '字体',
    items: [
      { key: '--font-display', label: '标题字体', type: 'font', default: 'Schibsted Grotesk' },
      { key: '--font-cover', label: '封面 Portfolio', type: 'font', default: 'FZ HuaSi KeXian' },
      { key: '--tracking-display', label: '大标题字距 (em)', type: 'range', min: -0.08, max: 0.06, step: 0.005, unit: 'em' },
    ],
  },
  {
    title: '字号与节奏',
    items: [
      { key: '--page-zoom', label: '整体缩放', type: 'range', min: 0.85, max: 1.15, step: 0.01, unit: '×', apply: 'zoom' },
      { key: '--section-space', label: '区块上下留白', type: 'range', min: 0.6, max: 1.6, step: 0.05, unit: '×' },
      { key: '--max', label: '版心宽度 (px)', type: 'range', min: 1200, max: 1900, step: 20, unit: 'px' },
      { key: '--col-gap', label: '栏间距 (px)', type: 'range', min: 8, max: 48, step: 1, unit: 'px' },
    ],
  },
  {
    title: '颜色',
    items: [
      { key: '--paper', label: '纸底', type: 'color' },
      { key: '--paper-2', label: '次级纸底', type: 'color' },
      { key: '--ink', label: '墨色', type: 'color' },
      { key: '--accent', label: '强调色', type: 'color' },
    ],
  },
  {
    title: '图片',
    items: [
      { key: '--img-saturation', label: '项目图饱和度', type: 'range', min: 0, max: 1.4, step: 0.05, unit: '×' },
      { key: '--img-scale', label: '项目图放大', type: 'range', min: 1, max: 1.4, step: 0.02, unit: '×' },
    ],
  },
]

const ALL_TOKEN_KEYS = TOKEN_GROUPS.flatMap((g) => g.items.map((i) => i.key))

/* ==========================================================================
   文字检查器：点选任意文字块 → 单独调字号 / 行高 / 字距 / 字重 / 颜色 / 字体 / 内容
   ========================================================================== */

const TEXT_SELECTOR =
  'h1, h2, h3, h4, p, li, dd, dt, cite, span.mono, .project__desc, .pcard__desc, .cover__caps'

const TEXT_STYLE_FIELDS = [
  { key: 'size', label: '字号 (px)', type: 'range', min: 9, max: 160, step: 1, css: 'fontSize', unit: 'px' },
  { key: 'ls', label: '字距 (em)', type: 'range', min: -0.06, max: 0.4, step: 0.005, css: 'letterSpacing', unit: 'em' },
  { key: 'lh', label: '行高', type: 'range', min: 0.85, max: 2.6, step: 0.05, css: 'lineHeight' },
  { key: 'dx', label: '左右微调 (px)', type: 'range', min: -200, max: 200, step: 1, unit: 'px' },
  { key: 'dy', label: '上下微调 (px)', type: 'range', min: -200, max: 200, step: 1, unit: 'px' },
  { key: 'weight', label: '字重', type: 'select', options: ['300', '400', '500', '600', '700', '800'], css: 'fontWeight' },
  { key: 'family', label: '字体', type: 'font', css: 'fontFamily' },
  { key: 'color', label: '颜色', type: 'color', css: 'color' },
  { key: 'align', label: '对齐', type: 'select', options: ['left', 'center', 'right'], css: 'textAlign' },
  { key: 'upper', label: '大小写', type: 'select', options: ['none', 'uppercase'], css: 'textTransform' },
]

// 这几个键在轨道中心文字上要写进 orbit-config（React 渲染的地方），不能直接改内联样式
const ORBIT_TEXT_KEYS = ['size', 'ls', 'family', 'dx', 'dy']

const applyTextStyleToEl = (el, style) => {
  if (!el) return
  if (!style || Object.keys(style).length === 0) {
    TEXT_STYLE_FIELDS.forEach((field) => {
      if (!field.css) return
      const cssName = field.css.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
      el.style.removeProperty(cssName)
    })
    el.style.removeProperty('translate')
    return
  }
  TEXT_STYLE_FIELDS.forEach((field) => {
    if (!field.css) return // dx / dy 走 translate，单独处理
    const cssName = field.css.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
    const value = style[field.key]
    if (value === undefined || value === '' || value === null) {
      el.style.removeProperty(cssName)
      return
    }
    if (field.key === 'family') el.style.setProperty(cssName, fontStack(value))
    else el.style.setProperty(cssName, `${value}${field.unit || ''}`)
  })
  const dx = Number(style.dx) || 0
  const dy = Number(style.dy) || 0
  if (dx || dy) el.style.translate = `${dx}px ${dy}px`
  else el.style.removeProperty('translate')
}

/** 元素里有没有"自己的"文字（直接子节点是文本） */
function hasOwnText(el) {
  for (const node of el.childNodes) {
    if (node.nodeType === 3 && node.textContent.trim()) return true
  }
  return false
}

/** 稳定的 DOM 路径，用作「非标准文字元素」的存储键 */
function cssPath(el) {
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

/** 页面里所有"直接装文字"的元素 —— 通用文字工具的作用范围 */
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

/** 从点击目标往上找最近的一块文字 */
function findTextElement(target) {
  if (!(target instanceof Element)) return null
  if (target.closest('[data-editor]')) return null
  let el = target
  while (el && el !== document.body) {
    if (hasOwnText(el)) return el
    el = el.parentElement
  }
  return null
}

const sectionIdOf = (el) => el.closest('section[id], div[id], footer[id]')?.id || 'global'

/** 稳定的键：用「所在模块 + 文字内容前 24 字」，不随结构增删行而错位 */
const textSnippet = (el) =>
  String(el?.dataset?.editorOriginal || el?.textContent || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 24)

function textNodeKey(el) {
  const sectionId = sectionIdOf(el)
  const snippet = textSnippet(el)
  if (!snippet) return `x|${cssPath(el)}`
  // 同一模块里如果有完全相同的文字，用出现顺序区分
  const twins = collectTextNodes().filter(
    (node) => sectionIdOf(node) === sectionId && textSnippet(node) === snippet
  )
  const suffix = twins.length > 1 ? `#${Math.max(0, twins.indexOf(el))}` : ''
  return `${sectionId}|${snippet}${suffix}`
}

/**
 * 老版本用「模块 + 第几段」当键，结构一变就错位。
 * 这里在挂载时把老键换算成新键（按当时的节点内容），换完就永久稳定。
 */
function migrateTextStyleKeys(map) {
  const entries = Object.entries(map || {})
  if (!entries.length) return map
  const LEGACY = /^([^|]+)\|(\d+)$/
  let changed = false
  const next = {}
  entries.forEach(([key, style]) => {
    const legacy = LEGACY.exec(key)
    if (!legacy) {
      next[key] = style
      return
    }
    const [, sectionId, index] = legacy
    const peers = collectTextNodes().filter(
      (node) => node.matches(TEXT_SELECTOR) && sectionIdOf(node) === sectionId
    )
    const node = peers[Number(index)]
    if (!node) {
      next[key] = style
      return
    }
    const newKey = textNodeKey(node)
    if (newKey === key) {
      next[key] = style
      return
    }
    next[newKey] = { ...(next[newKey] || {}), ...style }
    changed = true
  })
  return changed ? next : map
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch (err) {
    return {}
  }
}

/* localStorage 里的数据可能被旧版本写坏（曾经把 notes 存成了对象），
   这里统一兜底成正确类型，避免 .map / Object.entries 直接抛错导致整站白屏 */
const asObject = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
const asArray = (value) => (Array.isArray(value) ? value : [])
const asString = (value, fallback = '') => (typeof value === 'string' && value ? value : fallback)

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (err) {
    /* 忽略隐私模式下的写入失败 */
  }
}

function fontStack(family) {
  return `'${family}', 'Schibsted Grotesk', ${CJK_FALLBACK}`
}

/** 用「原始文案」当 key，方便回写代码时在 data.js 里定位 */
function textKey(el) {
  return (el.dataset.editorOriginal || '').trim().slice(0, 80)
}

export default function EditorToolbar() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('font')
  const [state, setState] = useState(() => loadState())
  const [images, setImages] = useState([])
  const [textEdits, setTextEdits] = useState(() => asObject(loadState().text))
  const [imageEdits, setImageEdits] = useState(() => asObject(loadState().images))
  const [toast, setToast] = useState('')
  const [textMode, setTextMode] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [compareTip, setCompareTip] = useState(null)
  const [pos, setPos] = useState(() => asObject(loadState().panelPos)?.x ? loadState().panelPos : null)
  const [dragging, setDragging] = useState(false)
  const [activeSection, setActiveSection] = useState('profile')
  const [sectionCfg, setSectionCfg] = useState(() => asObject(loadState().sections))
  const [pickMode, setPickMode] = useState(false)
  const [noteMode, setNoteMode] = useState(false)
  const [notes, setNotes] = useState(() => asArray(loadState().notes))
  const [activeNote, setActiveNote] = useState(null)
  const [rubber, setRubber] = useState(null)
  const [theme, setThemeState] = useState(() => asString(loadState().theme, 'abcd'))
  const [historyLen, setHistoryLen] = useState({ past: 0, future: 0 })
  const [textStyles, setTextStyles] = useState(() => asObject(loadState().textStyles))
  const [activeTextKey, setActiveTextKey] = useState(null)
  const [pickTextMode, setPickTextMode] = useState(false)
  // 轨道参数被改动时（含页面上拖动中心文字）让导出内容跟着刷新
  const [orbitTick, setOrbitTick] = useState(0)
  useEffect(() => subscribeOrbitConfig(() => setOrbitTick((n) => n + 1)), [])
  // 从「版本」面板回退并刷新后，把滚动位置还原回去
  useEffect(() => {
    restoreScrollAfterReload()
  }, [])

  // 自动记录「每一次调整」：挂在根组件上，所以切标签、切页面都不会中断
  useEffect(() => startAdjustmentRecorder(), [])

  // 老键（模块|第几段）换算成新键（模块|文字内容），换完就再也不怕结构增删
  useEffect(() => {
    setTextStyles((prev) => {
      const migrated = migrateTextStyleKeys(prev)
      if (migrated === prev) return prev
      saveState({ ...loadState(), textStyles: migrated })
      return migrated
    })
    // 只在挂载时跑一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pickTextRef = useRef(false)
  const noteModeRef = useRef(false)
  const peekTextRef = useRef([])
  const pickModeRef = useRef(false)
  const rubberRef = useRef(null)
  const textModeRef = useRef(false)
  const compareRef = useRef(false)
  const fileInputRef = useRef(null)
  const pendingImageRef = useRef(null)
  const rootRef = useRef(null)
  const panelRef = useRef(null)
  const dragRef = useRef(null)
  const basePaddingRef = useRef({})
  const lastPushRef = useRef({ stamp: '', time: 0 })
  const historyRef = useRef({ past: [], future: [] })
  const snapshotRef = useRef({})

  /* ---------- 面板拖拽 ---------- */
  const clampPosition = useCallback((x, y) => {
    const panel = panelRef.current
    const width = panel?.offsetWidth || 372
    const height = panel?.offsetHeight || 560
    const maxX = window.innerWidth - width - 8
    const maxY = window.innerHeight - height - 8
    return {
      x: Math.min(Math.max(8, x), Math.max(8, maxX)),
      y: Math.min(Math.max(8, y), Math.max(8, maxY)),
    }
  }, [])

  const defaultPosition = useCallback(() => {
    const width = panelRef.current?.offsetWidth || 372
    return { x: window.innerWidth - width - 18, y: 18 }
  }, [])

  const onDragStart = (event) => {
    if (event.button !== 0) return
    const panel = panelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    dragRef.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top }
    setDragging(true)
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const onDragMove = (event) => {
    if (!dragRef.current) return
    const next = clampPosition(
      event.clientX - dragRef.current.dx,
      event.clientY - dragRef.current.dy
    )
    setPos(next)
  }

  const onDragEnd = () => {
    if (!dragRef.current) return
    dragRef.current = null
    setDragging(false)
    setPos((current) => {
      if (current) saveState({ ...loadState(), panelPos: current })
      return current
    })
  }

  // 打开面板时给个默认位置；窗口变化时把面板拉回可视区
  useEffect(() => {
    if (!open) return
    setPos((current) => current || defaultPosition())
    const onResize = () => setPos((current) => (current ? clampPosition(current.x, current.y) : null))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open, defaultPosition, clampPosition])

  /* ---------- 对比原文：悬停看原始文案 + 长按临时还原 ---------- */
  useEffect(() => {
    compareRef.current = compareMode
    if (!compareMode) {
      setCompareTip(null)
      return
    }

    let holdTimer = 0
    let holdEl = null
    let holdBefore = ''

    const changedEl = (node) => {
      const el = node?.closest?.('[data-editor-original]')
      if (!el || el.closest('[data-editor]')) return null
      return el.textContent.trim() !== el.dataset.editorOriginal.trim() ? el : null
    }

    const onOver = (event) => {
      const el = changedEl(event.target)
      if (!el) {
        setCompareTip(null)
        return
      }
      setCompareTip({
        text: el.dataset.editorOriginal,
        x: Math.min(event.clientX + 14, window.innerWidth - 320),
        y: event.clientY + 18,
      })
    }

    const onOut = (event) => {
      if (!changedEl(event.target)) setCompareTip(null)
    }

    const onDown = (event) => {
      if (textModeRef.current) return
      const el = changedEl(event.target)
      if (!el) return
      holdEl = el
      holdBefore = el.textContent
      holdTimer = window.setTimeout(() => {
        el.textContent = el.dataset.editorOriginal
        el.classList.add('editor-compare-active')
        setCompareTip(null)
      }, 320)
    }

    const onUp = () => {
      window.clearTimeout(holdTimer)
      if (holdEl?.classList.contains('editor-compare-active')) {
        holdEl.textContent = holdBefore
        holdEl.classList.remove('editor-compare-active')
      }
      holdEl = null
    }

    document.addEventListener('mouseover', onOver)
    document.addEventListener('mouseout', onOut)
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('pointerup', onUp, true)
    document.addEventListener('pointercancel', onUp, true)

    return () => {
      window.clearTimeout(holdTimer)
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout', onOut)
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('pointerup', onUp, true)
      document.removeEventListener('pointercancel', onUp, true)
    }
  }, [compareMode])

  /* ---------- 应用样式变量 ---------- */
  const applyTokens = useCallback((tokens) => {
    const root = document.documentElement
    ALL_TOKEN_KEYS.forEach((key) => {
      const value = tokens[key]
      if (value === undefined || value === '') root.style.removeProperty(key)
      else root.style.setProperty(key, value)
    })
    // 整体缩放：body 缩放，工具栏自己反向缩放，保证控制面板大小不变
    const zoom = parseFloat(tokens['--page-zoom']) || 0
    document.body.style.zoom = zoom ? String(zoom) : ''
    if (rootRef.current) {
      rootRef.current.style.zoom = zoom && zoom !== 1 ? String(1 / zoom) : ''
    }
  }, [])

  useEffect(() => {
    applyTokens(state.tokens || {})
  }, [state.tokens, applyTokens])

  /* ---------- 模块级独立调整（直接写内联样式，必然生效） ---------- */
  const hexLum = (hex) => {
    const m = String(hex).replace('#', '')
    if (m.length !== 6) return 1
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16) / 255)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  const applySectionCfg = useCallback((cfgMap) => {
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (!el) return
      const cfg = cfgMap[id] || {}

      // 第一次改动前记下这块的「基准内边距」，之后都用它乘倍率
      if (!basePaddingRef.current[id]) {
        const computed = window.getComputedStyle(el)
        basePaddingRef.current[id] = {
          pt: parseFloat(computed.paddingTop) || 0,
          pb: parseFloat(computed.paddingBottom) || 0,
        }
      }
      const base = basePaddingRef.current[id]

      if (cfg.space && cfg.space !== 1) {
        el.style.paddingTop = `${(base.pt * cfg.space).toFixed(1)}px`
        el.style.paddingBottom = `${(base.pb * cfg.space).toFixed(1)}px`
      } else {
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

      // 文字色：内联 + --sec-ink（子元素继承）+ 深浅自动反色
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
  }, [])

  useEffect(() => {
    applySectionCfg(sectionCfg)
  }, [sectionCfg, applySectionCfg])

  /* ---------- 文字检查器：把样式落到 DOM（必须放在 applySnapshot 之前，
     否则 useCallback 的依赖数组会在渲染时触发 TDZ 报错） ---------- */
  const applyAllTextStyles = useCallback((map) => {
    try {
      const nodes = collectTextNodes()
      nodes.forEach((el) => {
        const key = textNodeKey(el)
        const style = (map || {})[key]
        // 轨道中心文字：字号/字距/字体/位置由 orbit-config 通过 React 渲染，
        // 这里只补颜色、字重这类内联样式，绝不能把 React 写的内联样式清掉
        if (el.closest('[data-orbit-center]')) {
          if (!style) return
          const inlineOnly = Object.fromEntries(
            Object.entries(style).filter(([field]) => !ORBIT_TEXT_KEYS.includes(field))
          )
          if (!Object.keys(inlineOnly).length) return
          applyTextStyleToEl(el, inlineOnly)
          return
        }
        applyTextStyleToEl(el, style)
      })
    } catch (err) {
      console.warn('[editor] 应用文字样式失败：', err)
    }
  }, [])

  /* ---------- 就地应用一份快照：按住看原版 / 按住看调整前 ---------- */
  const applyScene = useCallback(
    (data) => {
      const read = (key) => {
        const raw = data?.[key]
        if (!raw) return null
        try {
          return JSON.parse(raw)
        } catch {
          return null
        }
      }
      const editor = read('lzy-editor-v1') || {}
      const orbit = read('lzy-orbit-v1')
      const cap = read('lzy-cap-v1')
      const moves = read('lzy-move-v1')

      applyTokens(editor.tokens || {})
      applySectionCfg(editor.sections || {})
      applyAllTextStyles(editor.textStyles || {})

      const textMap = editor.text || {}
      document.querySelectorAll('[data-editor-original]').forEach((el) => {
        const from = el.dataset.editorOriginal
        el.textContent = textMap[from] ?? from
      })

      document.documentElement.dataset.theme = editor.theme === 'classic' ? 'classic' : 'abcd'
      writeOrbitConfig(orbit || ORBIT_DEFAULTS)
      applyMoves(moves || {})

      const scale = cap ? Number(cap.history?.[cap.index]?.scale) : NaN
      window.dispatchEvent(
        new CustomEvent('lzy-cap-preview', { detail: Number.isFinite(scale) ? scale : null })
      )
    },
    [applyTokens, applySectionCfg, applyAllTextStyles]
  )

  const peekSceneRef = useRef(null)
  const peekOriginalStart = () => {
    setRecorderPaused(true)
    peekSceneRef.current = captureSnapshot().data
    applyScene({})
  }
  const peekOriginalEnd = () => {
    if (peekSceneRef.current) applyScene(peekSceneRef.current)
    peekSceneRef.current = null
    resyncRecorder()
    setRecorderPaused(false)
  }

  /* ---------- 轨道中心文字：改这些键时写回 orbit-config ---------- */
  const orbitPatchFor = (el, key, value) => {
    const holder = el?.closest('[data-orbit-center]')
    if (!holder) return null
    const which = holder.getAttribute('data-orbit-center')
    const isHint = which === 'hint'
    if (key === 'size') return { [isHint ? 'centerHintSize' : 'centerSize']: Number(value) }
    if (key === 'ls') return { [isHint ? 'centerHintTracking' : 'centerTracking']: Number(value) }
    if (key === 'family')
      return { [isHint ? 'centerHintFamily' : 'centerFamily']: String(value || '') }
    if (key === 'dx') return { centerX: Number(value) }
    if (key === 'dy') return { centerY: Number(value) }
    if (key === 'text') return { [isHint ? 'centerHint' : 'centerText']: String(value ?? '') }
    return null
  }

  /* ---------- 刷新后把上次的文字修改重新落到页面上 ---------- */
  useEffect(() => {
    const entries = Object.entries(textEdits || {})
    if (!entries.length) return
    let raf = 0
    const apply = () => {
      const nodes = [...document.querySelectorAll('#root h1, #root h2, #root h3, #root h4, #root p, #root li, #root dd, #root dt, #root cite, #root span.mono')]
        .filter((el) => !el.closest('[data-editor]'))
      entries.forEach(([from, to]) => {
        const target = nodes.find(
          (el) =>
            !el.dataset.editorOriginal &&
            el.children.length === 0 &&
            el.textContent.trim() === from.trim()
        )
        if (target) {
          target.dataset.editorOriginal = from
          target.textContent = to
        }
      })
    }
    // 等 React 首帧渲染完再改
    raf = window.requestAnimationFrame(() => window.setTimeout(apply, 120))
    return () => window.cancelAnimationFrame(raf)
    // 只在挂载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- 撤销 / 重做 ---------- */
  const syncSnapshot = useCallback(() => {
    snapshotRef.current = {
      tokens: state.tokens || {},
      sections: sectionCfg,
      text: textEdits,
      textStyles,
      images: imageEdits,
      notes,
      theme,
    }
  }, [state.tokens, sectionCfg, textEdits, textStyles, imageEdits, notes, theme])

  const refreshHistoryMeta = () => {
    setHistoryLen({
      past: historyRef.current.past.length,
      future: historyRef.current.future.length,
    })
  }

  const pushHistory = useCallback(() => {
    syncSnapshot()
    const stack = historyRef.current
    // 图片里的 dataUrl 可能很大，最多留 20 步
    stack.past.push(JSON.parse(JSON.stringify(snapshotRef.current)))
    if (stack.past.length > 20) stack.past.shift()
    stack.future = []
    refreshHistoryMeta()
  }, [syncSnapshot])

  const applySnapshot = useCallback(
    (snap) => {
      if (!snap) return
      setState((prev) => ({ ...prev, tokens: snap.tokens || {}, theme: snap.theme }))
      setSectionCfg(snap.sections || {})
      setTextEdits(snap.text || {})
      setImageEdits(snap.images || {})
      setNotes(Array.isArray(snap.notes) ? snap.notes : [])
      setTextStyles(snap.textStyles || {})
      setThemeState(snap.theme || 'abcd')
      document.documentElement.dataset.theme = snap.theme || 'abcd'

      // 重新落到 DOM 上
      applyTokens(snap.tokens || {})
      applySectionCfg(snap.sections || {})
      applyAllTextStyles(snap.textStyles || {})
      document.querySelectorAll('[data-editor-original]').forEach((el) => {
        const original = el.dataset.editorOriginal
        const next = snap.text?.[original]
        el.textContent = next ?? original
      })
      Object.entries(snap.images || {}).forEach(([src, edit]) => {
        if (!edit?.dataUrl) return
        const img = [...document.querySelectorAll('#root img')].find(
          (node) => node.dataset.editorSrc === src || node.getAttribute('src') === src
        )
        if (img) img.setAttribute('src', edit.dataUrl)
      })

      saveState({
        tokens: snap.tokens || {},
        sections: snap.sections || {},
        text: snap.text || {},
        textStyles: snap.textStyles || {},
        images: Object.fromEntries(
          Object.entries(snap.images || {}).map(([key, value]) => [
            key,
            { file: value.file, alt: value.alt },
          ])
        ),
        notes: Array.isArray(snap.notes) ? snap.notes : [],
        theme: snap.theme || 'abcd',
        panelPos: loadState().panelPos,
      })
    },
    [applyTokens, applySectionCfg, applyAllTextStyles]
  )

  const undo = useCallback(() => {
    const stack = historyRef.current
    if (!stack.past.length) {
      flash('没有可以后退的改动了')
      return
    }
    syncSnapshot()
    stack.future.push(JSON.parse(JSON.stringify(snapshotRef.current)))
    const previous = stack.past.pop()
    applySnapshot(previous)
    refreshHistoryMeta()
    flash('已后退一步')
  }, [applySnapshot, syncSnapshot])

  const redo = useCallback(() => {
    const stack = historyRef.current
    if (!stack.future.length) {
      flash('没有可以前进的改动了')
      return
    }
    syncSnapshot()
    stack.past.push(JSON.parse(JSON.stringify(snapshotRef.current)))
    const next = stack.future.pop()
    applySnapshot(next)
    refreshHistoryMeta()
    flash('已前进一步')
  }, [applySnapshot, syncSnapshot])

  // Ctrl/Cmd+Z 后退，Ctrl/Cmd+Shift+Z 或 Ctrl+Y 前进
  useEffect(() => {
    const onKey = (event) => {
      const target = event.target
      const editing =
        target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName || '')
      const mod = event.metaKey || event.ctrlKey
      if (!mod) return
      const key = event.key.toLowerCase()
      if (key === 'z' && !editing) {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (key === 'y' && !editing) {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  const ensureVisible = (id) => {
    const el = document.getElementById(id)
    if (!el) return
    const rect = el.getBoundingClientRect()
    const visible = rect.bottom > 90 && rect.top < window.innerHeight - 90
    if (!visible) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('editor-flash')
    window.setTimeout(() => el.classList.remove('editor-flash'), 900)
  }

  const setSectionValue = (id, key, value) => {
    // 同一个滑块连续拖动只记一步历史，避免 undo 栈被灌满
    const stamp = `${id}:${key}`
    const now = Date.now()
    const last = lastPushRef.current
    if (last.stamp !== stamp || now - last.time > 700) {
      pushHistory()
      lastPushRef.current = { stamp, time: now }
    } else {
      lastPushRef.current = { stamp, time: now }
    }
    setSectionCfg((prev) => {
      const next = { ...prev, [id]: { ...(prev[id] || {}) } }
      if (value === '' || value === null || value === undefined) delete next[id][key]
      else next[id][key] = value
      if (Object.keys(next[id]).length === 0) delete next[id]
      saveState({ ...loadState(), sections: next })
      return next
    })
    const label = SECTIONS.find((section) => section.id === id)?.label || id
    flash(`${label} · ${key} = ${value === '' ? '清除' : value}`)
    ensureVisible(id)
  }

  const moveSection = (id, direction) => {
    const el = document.getElementById(id)
    if (!el || !el.parentElement) return
    const siblings = [...el.parentElement.children].filter((node) =>
      SECTIONS.some((section) => section.id === node.id)
    )
    const index = siblings.indexOf(el)
    const target = siblings[index + direction]
    if (!target) {
      flash('已经到头了（联系方式固定在最后，不能跨父级移动）')
      return
    }
    pushHistory()
    if (direction < 0) el.parentElement.insertBefore(el, target)
    else el.parentElement.insertBefore(target, el)
    const order = SECTIONS.map((section) => section.id).filter((sid) => document.getElementById(sid))
    saveState({ ...loadState(), order })
    flash('已调整模块顺序（导出时一并记录）')
  }

  const sectionOrder = useMemo(
    () =>
      SECTIONS.map((section) => ({
        ...section,
        cfg: sectionCfg[section.id] || {},
      })),
    [sectionCfg]
  )

  /* ---------- 点选模块 ---------- */
  useEffect(() => {
    pickModeRef.current = pickMode
    document.body.classList.toggle('editor-pick-mode', pickMode)
    if (!pickMode) return

    const onClick = (event) => {
      if (!pickModeRef.current) return
      if (event.target.closest('[data-editor]')) return
      const section = event.target.closest('section[id], div[id]')
      if (!section) return
      event.preventDefault()
      if (SECTIONS.some((item) => item.id === section.id)) {
        setActiveSection(section.id)
        setTab('module')
        flash(`已选中：${SECTIONS.find((s) => s.id === section.id)?.label}`)
      }
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [pickMode])

  /* ---------- 实时标注 ---------- */
  useEffect(() => {
    noteModeRef.current = noteMode
    document.body.classList.toggle('editor-note-mode', noteMode)
    if (!noteMode) {
      setRubber(null)
      return
    }

    /**
     * 把鼠标位置换算成「标注覆盖层自己的坐标系」。
     * 覆盖层是 body 的绝对定位子节点，而 body 可能被「整体缩放」加了 zoom、
     * 页面还可能有滚动 —— 直接把 clientX/Y 当坐标用会让选框和鼠标错位。
     */
    const notePoint = (event) => {
      const overlay = document.querySelector('.editor-notes')
      const bodyZoom = parseFloat(window.getComputedStyle(document.body).zoom) || 1
      if (!overlay) {
        return { x: (event.clientX + window.scrollX) / bodyZoom, y: (event.clientY + window.scrollY) / bodyZoom }
      }
      const rect = overlay.getBoundingClientRect()
      return {
        x: (event.clientX - rect.left) / bodyZoom,
        y: (event.clientY - rect.top) / bodyZoom,
      }
    }

    let start = null

    const onDown = (event) => {
      if (!noteModeRef.current || event.button !== 0) return
      if (event.target.closest('[data-editor]')) return
      event.preventDefault()
      // 标注期间别让轨道这类可拖动组件跟着一起动
      event.stopPropagation()
      const point = notePoint(event)
      start = {
        ...point,
        section: event.target.closest('section[id], div[id]')?.id || '',
      }
      setRubber({ x: start.x, y: start.y, w: 0, h: 0 })
    }

    const onMove = (event) => {
      if (!noteModeRef.current || !start) return
      event.stopPropagation()
      const { x, y } = notePoint(event)
      setRubber({
        x: Math.min(start.x, x),
        y: Math.min(start.y, y),
        w: Math.abs(x - start.x),
        h: Math.abs(y - start.y),
      })
    }

    const onUp = (event) => {
      if (!noteModeRef.current || !start) return
      event.stopPropagation()
      const box = rubberRef.current
      const isRect = box && (box.w > 24 || box.h > 24)
      const note = {
        id: `n${Date.now()}`,
        section: start.section,
        text: '',
        createdAt: new Date().toISOString(),
        ...(isRect
          ? { kind: 'rect', x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.w), h: Math.round(box.h) }
          : { kind: 'pin', x: Math.round(start.x), y: Math.round(start.y) }),
      }
      setNotes((prev) => {
        const next = [...prev, note]
        saveState({ ...loadState(), notes: next })
        return next
      })
      setActiveNote(note.id)
      setRubber(null)
      start = null
    }

    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('pointermove', onMove, true)
    document.addEventListener('pointerup', onUp, true)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('pointermove', onMove, true)
      document.removeEventListener('pointerup', onUp, true)
    }
  }, [noteMode])

  useEffect(() => {
    rubberRef.current = rubber
  }, [rubber])

  const updateNote = (id, text) => {
    pushHistory()
    setNotes((prev) => {
      const next = prev.map((note) => (note.id === id ? { ...note, text } : note))
      saveState({ ...loadState(), notes: next })
      return next
    })
  }

  /** 删掉一条文字改动，并把页面上的文字恢复成原文 */
  const removeTextEdit = (from) => {
    pushHistory()
    const el = [...document.querySelectorAll('[data-editor-original]')].find(
      (node) => node.dataset.editorOriginal === from
    )
    if (el) {
      el.textContent = from
      delete el.dataset.editorOriginal
    }
    setTextEdits((prev) => {
      const next = { ...prev }
      delete next[from]
      saveState({ ...loadState(), text: next })
      return next
    })
    flash('已删除这条改动，文字恢复原文')
  }

  const removeNote = (id) => {
    setNotes((prev) => {
      const next = prev.filter((note) => note.id !== id)
      saveState({ ...loadState(), notes: next })
      return next
    })
    setActiveNote(null)
  }

  /* ---------- 文字检查器：选点 / 改值 ---------- */
  useEffect(() => {
    applyAllTextStyles(textStyles)
  }, [textStyles, applyAllTextStyles])

  useEffect(() => {
    pickTextRef.current = pickTextMode
    document.body.classList.toggle('editor-text-pick', pickTextMode)
    if (!pickTextMode) return

    const onClick = (event) => {
      if (!pickTextRef.current) return
      if (event.target.closest('[data-editor]')) return
      const el = findTextElement(event.target)
      if (!el) return
      event.preventDefault()
      event.stopPropagation()
      document.querySelectorAll('.editor-text-active').forEach((node) =>
        node.classList.remove('editor-text-active')
      )
      el.classList.add('editor-text-active')
      setActiveTextKey(textNodeKey(el))
      setTab('text')
      const preview = el.textContent.trim().slice(0, 18)
      flash(`已选中文字：${preview}${el.textContent.trim().length > 18 ? '…' : ''}`)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [pickTextMode])

  const activeTextEl = () => {
    if (!activeTextKey) return null
    return collectTextNodes().find((el) => textNodeKey(el) === activeTextKey) || null
  }

  /* 浮动工具条：跟着被选中的文字走 */
  const [quickRect, setQuickRect] = useState(null)
  useEffect(() => {
    if (!activeTextKey) {
      setQuickRect(null)
      return
    }
    const update = () => {
      const el = collectTextNodes().find((node) => textNodeKey(node) === activeTextKey)
      if (!el) {
        setQuickRect(null)
        return
      }
      const rect = el.getBoundingClientRect()
      setQuickRect({ top: rect.top, left: rect.left, width: rect.width })
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    const timer = window.setInterval(update, 500)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      window.clearInterval(timer)
    }
  }, [activeTextKey, textStyles])

  /** 取某段文字当前的样式值（优先用已保存的，否则读计算值） */
  const currentTextValue = (key, fallback) => {
    const stored = textStyles[activeTextKey]?.[key]
    if (stored !== undefined && stored !== '') return Number(stored)
    const el = collectTextNodes().find((node) => textNodeKey(node) === activeTextKey)
    if (!el) return fallback
    const computed = window.getComputedStyle(el)
    const fontSize = parseFloat(computed.fontSize) || 16
    if (key === 'size') return Math.round(fontSize)
    if (key === 'lh') return Number((parseFloat(computed.lineHeight) / fontSize).toFixed(2)) || fallback
    if (key === 'ls') {
      const ls = parseFloat(computed.letterSpacing)
      return ls ? Number((ls / fontSize).toFixed(3)) : 0
    }
    return fallback
  }

  const bumpTextValue = (key, delta, fallback) => {
    const next = Number((currentTextValue(key, fallback) + delta).toFixed(3))
    setTextStyle(key, next)
  }

  const setTextStyle = (key, value) => {
    const el0 = activeTextEl()
    // 轨道中心文字：直接写 orbit-config，React 那边立刻重渲染
    const orbitPatch = el0 ? orbitPatchFor(el0, key, value) : null
    if (orbitPatch) {
      pushHistory()
      writeOrbitConfig(orbitPatch)
      flash('已写入「轨道 → 中心文字」')
      return
    }
    pushHistory()
    setTextStyles((prev) => {
      const next = { ...prev, [activeTextKey]: { ...(prev[activeTextKey] || {}) } }
      if (value === '' || value === null || value === undefined) delete next[activeTextKey][key]
      else next[activeTextKey][key] = value
      if (Object.keys(next[activeTextKey]).length === 0) delete next[activeTextKey]
      saveState({ ...loadState(), textStyles: next })
      return next
    })
    const el = activeTextEl()
    if (el) {
      const merged = { ...(textStyles[activeTextKey] || {}), [key]: value }
      applyTextStyleToEl(el, merged)
      el.classList.add('editor-text-active')
    }
  }

  const resetTextStyle = () => {
    pushHistory()
    const el = activeTextEl()
    if (el) applyTextStyleToEl(el, null)
    setTextStyles((prev) => {
      const next = { ...prev }
      delete next[activeTextKey]
      saveState({ ...loadState(), textStyles: next })
      return next
    })
    flash('已清除这段文字的自定义样式')
  }

  const replaceActiveText = (value) => {
    const el = activeTextEl()
    if (!el) return
    const orbitPatch = orbitPatchFor(el, 'text', value)
    if (orbitPatch) {
      pushHistory()
      writeOrbitConfig(orbitPatch)
      return
    }
    if (!el.dataset.editorOriginal) el.dataset.editorOriginal = el.textContent
    el.textContent = value
    pushHistory()
    setTextEdits((prev) => {
      const next = { ...prev }
      const currentOriginal = el.dataset.editorOriginal || original
      if (currentOriginal.trim() === value.trim()) delete next[currentOriginal]
      else next[currentOriginal] = value
      saveState({ ...loadState(), text: next })
      return next
    })
  }

  const textValueOf = (field) => {
    const style = textStyles[activeTextKey] || {}
    if (style[field.key] !== undefined) return style[field.key]
    const el = activeTextEl()
    if (!el) return field.type === 'range' ? field.min : ''
    // 轨道中心文字：读 orbit-config 里的真实值
    const holder = el.closest('[data-orbit-center]')
    if (holder) {
      const cfg = readOrbitConfig()
      const isHint = holder.getAttribute('data-orbit-center') === 'hint'
      if (field.key === 'size') return isHint ? cfg.centerHintSize : cfg.centerSize
      if (field.key === 'ls') return isHint ? cfg.centerHintTracking : cfg.centerTracking
      if (field.key === 'family') return isHint ? cfg.centerHintFamily : cfg.centerFamily
      if (field.key === 'dx') return cfg.centerX
      if (field.key === 'dy') return cfg.centerY
    }
    const computed = window.getComputedStyle(el)
    if (field.key === 'dx' || field.key === 'dy') {
      const translate = computed.translate || 'none'
      if (translate === 'none') return 0
      const parts = translate.split(/\s+/)
      return Math.round(parseFloat(field.key === 'dx' ? parts[0] : parts[1] || '0') || 0)
    }
    if (field.key === 'size') return Math.round(parseFloat(computed.fontSize) || 16)
    if (field.key === 'lh') return (parseFloat(computed.lineHeight) / (parseFloat(computed.fontSize) || 16)).toFixed(2)
    if (field.key === 'ls') return parseFloat(computed.letterSpacing) ? (parseFloat(computed.letterSpacing) / (parseFloat(computed.fontSize) || 16)).toFixed(3) : 0
    if (field.key === 'weight') return String(parseInt(computed.fontWeight, 10) || 400)
    if (field.key === 'align') return computed.textAlign === 'start' ? 'left' : computed.textAlign
    if (field.key === 'upper') return computed.textTransform === 'uppercase' ? 'uppercase' : 'none'
    if (field.key === 'color') {
      const m = computed.color.match(/\d+/g)
      return m ? '#' + m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('') : '#000000'
    }
    if (field.key === 'family') {
      const first = computed.fontFamily.split(',')[0].replace(/["']/g, '').trim()
      return FONT_OPTIONS.includes(first) ? first : ''
    }
    return ''
  }

  /** 供滑块用的数值（dx/dy 可能为 0，不能被 falsy 判成最小值） */
  const rangeValueOf = (field) => {
    const raw = textValueOf(field)
    const num = Number(raw)
    if (raw === '' || raw === null || raw === undefined || !Number.isFinite(num)) return field.min
    return num
  }

  /* ---------- 收集页面图片 ---------- */
  const collectImages = useCallback(() => {
    const nodes = [...document.querySelectorAll('#root img, footer img')].filter(
      (img) => !img.closest('[data-editor]')
    )
    setImages(
      nodes.map((img, index) => ({
        index,
        src: img.getAttribute('src'),
        alt: img.getAttribute('alt') || `图片 ${index + 1}`,
        el: img,
      }))
    )
    return nodes
  }, [])

  useEffect(() => {
    const nodes = collectImages()
    // 恢复上次替换过的图片（用内存中的 objectURL 无法跨刷新，这里只恢复记录，提示重新选）
    nodes.forEach((img) => {
      const src = img.getAttribute('src')
      const edit = imageEdits[src]
      if (edit?.dataUrl) img.setAttribute('src', edit.dataUrl)
    })
  }, [collectImages, imageEdits])

  /* ---------- 文字：点击直接改 ---------- */
  useEffect(() => {
    textModeRef.current = textMode
    document.body.classList.toggle('editor-text-mode', textMode)

    if (!textMode) {
      document.querySelectorAll('[data-editor-original]').forEach((el) => {
        el.removeAttribute('contenteditable')
      })
      return
    }

    const handler = (event) => {
      if (!textModeRef.current) return
      const el = event.target.closest(
        'h1, h2, h3, h4, p, li, dd, dt, cite, .mono, .project__title, .pcard__title'
      )
      if (!el || el.closest('[data-editor]')) return
      if (el.getAttribute('contenteditable') === 'true') return

      event.preventDefault()
      if (!el.dataset.editorOriginal) el.dataset.editorOriginal = el.textContent
      el.setAttribute('contenteditable', 'true')
      el.focus()

      // 同时把这段文字设为「当前选中」，浮动工具条就会出现，便于顺手调字号
      try {
        const nodes = collectTextNodes()
        if (nodes.includes(el)) {
          document
            .querySelectorAll('.editor-text-active')
            .forEach((node) => node.classList.remove('editor-text-active'))
          el.classList.add('editor-text-active')
          setActiveTextKey(textNodeKey(el))
        }
      } catch (err) {
        /* 忽略：不影响编辑本身 */
      }

      const commit = () => {
        el.removeAttribute('contenteditable')
        const from = el.dataset.editorOriginal
        const to = el.textContent
        // 轨道中心文字由 orbit-config 渲染，改动要写回配置而不是 text 映射
        const orbitPatch = orbitPatchFor(el, 'text', to)
        if (orbitPatch) {
          pushHistory()
          writeOrbitConfig(orbitPatch)
          return
        }
        pushHistory()
        setTextEdits((prev) => {
          const next = { ...prev }
          if (from.trim() === to.trim()) delete next[from]
          else next[from] = to
          const merged = { ...loadState(), text: next }
          saveState(merged)
          return next
        })
      }
      el.addEventListener('blur', commit, { once: true })

      // 每次敲字就把内容写进 localStorage，不依赖 blur。
      // 之前只在 blur 时保存，用户改完直接刷新（或者点到不能失焦的地方）就全丢了。
      el.addEventListener('input', () => {
        const from = el.dataset.editorOriginal
        const to = el.textContent
        if (!from) return
        const next = { ...asObject(loadState().text) }
        if (from.trim() === to.trim()) delete next[from]
        else next[from] = to
        saveState({ ...loadState(), text: next })
      })
    }

    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [textMode])

  /* ---------- 图片替换 ---------- */
  const pickImage = (img) => {
    pendingImageRef.current = img
    fileInputRef.current?.click()
  }

  const onFileChosen = (event) => {
    const file = event.target.files?.[0]
    const target = pendingImageRef.current
    if (!file || !target) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      pushHistory()
      target.el.dataset.editorSrc = target.src
      target.el.setAttribute('src', dataUrl)
      setImageEdits((prev) => {
        const next = {
          ...prev,
          [target.src]: { file: file.name, dataUrl, alt: target.alt },
        }
        // 只把文件名写进 localStorage（图片本身太大，会撑爆配额）
        const persisted = Object.fromEntries(
          Object.entries(next).map(([key, value]) => [key, { file: value.file, alt: value.alt }])
        )
        saveState({ ...loadState(), images: persisted })
        return next
      })
      flash(`已替换：${target.alt} → ${file.name}`)
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const resetImage = (img) => {
    pushHistory()
    img.el.setAttribute('src', img.src)
    delete img.el.dataset.editorSrc
    setImageEdits((prev) => {
      const next = { ...prev }
      delete next[img.src]
      saveState({ ...loadState(), images: next })
      return next
    })
  }

  /* ---------- 提示 ---------- */
  const flash = (message) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2200)
  }

  /* ---------- 导出（只导出真正改动过的差异，体积尽量小） ---------- */
  const exportJson = useMemo(() => {
    const labelOf = (id) => SECTIONS.find((s) => s.id === id)?.label || id
    const num = (value) => {
      const n = Number(value)
      if (!Number.isFinite(n)) return value
      return Math.round(n * 1000) / 1000
    }
    const isEmpty = (value) => value === '' || value === null || value === undefined

    // 模块设置：只在偏离默认值时记录，并去掉空值
    const SECTION_DEFAULTS = { space: 1, zoom: 1, bg: '', ink: '', accent: '', hidden: '' }
    const sections = {}
    Object.entries(sectionCfg).forEach(([id, cfg]) => {
      const kept = {}
      Object.entries(cfg || {}).forEach(([key, value]) => {
        if (isEmpty(value)) return
        const fallback = SECTION_DEFAULTS[key]
        if (fallback !== undefined && Number(value) === Number(fallback) && typeof value !== 'boolean') return
        if (fallback === '' && value === '') return
        kept[key] = typeof value === 'number' ? num(value) : value
      })
      if (Object.keys(kept).length) sections[labelOf(id)] = kept
    })

    // 作品轨道：只写跟默认值不一样的项；六张图的缩放只写改过的序号
    const orbit = readOrbitConfig()
    const orbitDiff = {}
    Object.entries(orbit).forEach(([key, value]) => {
      if (key === 'scales') return
      const fallback = ORBIT_DEFAULTS[key]
      if (typeof value === 'number' && typeof fallback === 'number') {
        if (num(value) !== num(fallback)) orbitDiff[key] = num(value)
        return
      }
      if (value !== fallback) orbitDiff[key] = value
    })
    const scaleDiff = {}
    ;(orbit.scales || []).forEach((value, index) => {
      const fallback = Number(ORBIT_DEFAULTS.scales?.[index] ?? 1)
      if (num(value) !== num(fallback)) scaleDiff[String(index + 1)] = num(value)
    })
    if (Object.keys(scaleDiff).length) orbitDiff.scales = scaleDiff

    // 文字样式：键压成「模块｜原文片段」，去掉为 0 的微调值
    const textNodes = collectTextNodes()
    const nodeByKey = new Map()
    textNodes.forEach((el) => nodeByKey.set(textNodeKey(el), el))
    // 精确键对不上时（老键 / 结构变过），退化成「同模块 + 片段前缀」再找一次，
    // 否则导出会写成「第 NaN 段」，交给开发者就无法定位是哪句话。
    const resolveStyleNode = (key) => {
      const exact = nodeByKey.get(key)
      if (exact) return exact
      const [rawSection, rawRest = ''] = key.split('|')
      const bare = rawRest.replace(/#\d+$/, '')
      if (!bare) return null
      const label = SECTIONS.find((s) => s.id === rawSection)?.label || rawSection
      const scoped = textNodes.filter(
        (el) => sectionIdOf(el) === rawSection || sectionIdOf(el) === label
      )
      const pool = scoped.length ? scoped : textNodes
      return (
        pool.find((el) => textSnippet(el) === bare) ||
        pool.find((el) => textSnippet(el).startsWith(bare.slice(0, 10))) ||
        null
      )
    }
    const textStylesOut = Object.entries(textStyles)
      .map(([key, style]) => {
        const [rawSection, rawIndex] = key.split('|')
        const node = resolveStyleNode(key)
        const snippet = (node?.dataset.editorOriginal || node?.textContent || '').trim().slice(0, 18)
        const clean = {}
        Object.entries(style || {}).forEach(([k, v]) => {
          if (isEmpty(v)) return
          if ((k === 'dx' || k === 'dy') && Number(v) === 0) return
          clean[k] = typeof v === 'number' ? num(v) : v
        })
        if (!Object.keys(clean).length) return null
        const where =
          rawSection === 'x' ? '其它' : labelOf(rawSection) || rawSection || '页面'
        const what = snippet || (rawIndex ? `第 ${Number(rawIndex) + 1} 段` : '未定位')
        return [`${where}｜${what}`, clean]
      })
      .filter(Boolean)

    // 标注：数组比对象省一半以上，去掉 id / 时间戳
    const notesOut = notes
      .filter((note) => (note.text || '').trim())
      .map((note) => {
        const where = labelOf(note.section) || '页面'
        const coords = [Math.round(note.x), Math.round(note.y)]
        const box = note.kind === 'rect' ? [Math.round(note.w), Math.round(note.h)] : []
        return [where, note.kind === 'rect' ? '框' : '点', ...coords, ...box, note.text.trim()]
      })

    // 顺序：跟默认顺序一致就不写
    const presentIds = SECTIONS.map((s) => s.id).filter((id) => document.getElementById(id))
    const currentOrder = [...document.querySelectorAll('[id]')]
      .map((el) => el.id)
      .filter((id) => presentIds.includes(id))
    const orderChanged =
      currentOrder.length === presentIds.length && currentOrder.some((id, i) => id !== presentIds[i])

    const payload = {}
    payload.v = 2
    if (theme !== 'abcd') payload['主题'] = theme
    const tokens = {}
    Object.entries(state.tokens || {}).forEach(([key, value]) => {
      if (isEmpty(value)) return
      tokens[key] = typeof value === 'string' && value !== '' && !Number.isNaN(Number(value)) ? String(num(value)) : value
    })
    if (Object.keys(tokens).length) payload['变量'] = tokens
    if (Object.keys(sections).length) payload['模块'] = sections
    if (orderChanged) payload['顺序'] = currentOrder.map(labelOf)
    if (Object.keys(orbitDiff).length) payload['轨道'] = orbitDiff
    if (Object.keys(textEdits).length)
      payload['文字'] = Object.entries(textEdits).map(([from, to]) => [from, to])
    if (textStylesOut.length) payload['文字样式'] = textStylesOut
    if (Object.keys(imageEdits).length)
      payload['图片'] = Object.entries(imageEdits).map(([from, edit]) => [from, edit.file])
    const moves = readMoves()
    if (Object.keys(moves).length)
      payload['位置'] = Object.entries(moves).map(([key, value]) => [key, value.x, value.y])
    if (notesOut.length) payload['标注'] = notesOut

    // 原始状态整包：上面那些「人类可读」的分组会压扁键名，这里再附一份浏览器里的原文，
    // 键名原样保留，开发者照着这份写进代码就不会丢东西。（历史记录体积大，排除）
    try {
      const store = {}
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i)
        if (!key || key.indexOf('lzy-') !== 0) continue
        if (/history|\.bak$/i.test(key)) continue
        store[key] = localStorage.getItem(key)
      }
      payload['状态'] = store
    } catch (err) {
      /* 忽略：拿不到原始状态不影响上面的分组导出 */
    }

    return JSON.stringify(payload, null, 1)
  }, [
    state.tokens,
    imageEdits,
    textEdits,
    sectionCfg,
    notes,
    textStyles,
    theme,
    orbitTick,
  ])

  const exportBytes = typeof exportJson === 'string' ? exportJson.length : 0
  const exportSizeLabel =
    exportBytes > 1024 ? `${(exportBytes / 1024).toFixed(1)} KB` : `${exportBytes} B`

  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportJson)
      flash(`已复制（${exportSizeLabel}），粘贴给我就行`)
    } catch (err) {
      flash('复制失败，可手动从下方文本框复制')
    }
  }

  const downloadExport = () => {
    const blob = new Blob([exportJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '作品集修改.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetAll = () => {
    localStorage.removeItem(STORAGE_KEY)
    document.documentElement.removeAttribute('style')
    document.body.style.zoom = ''
    window.location.reload()
  }

  const setToken = (key, value) => {
    pushHistory()
    setState((prev) => {
      const tokens = { ...(prev.tokens || {}) }
      if (value === '' || value === null) delete tokens[key]
      else tokens[key] = String(value)
      const next = { ...prev, tokens }
      saveState(next)
      return next
    })
  }

  /* ---------- 风格主题切换 ---------- */
  const currentTheme = () => theme

  const setTheme = (next) => {
    pushHistory()
    setThemeState(next)
    document.documentElement.dataset.theme = next
    saveState({ ...loadState(), theme: next })
    flash(next === 'abcd' ? '已切到 ABCD 风格（黑白 / 大写宣言）' : '已切回原版纸感风格')
  }

  const currentValue = (item) => {
    if (state.tokens?.[item.key] !== undefined) return state.tokens[item.key]
    if (item.type === 'color') {
      const probe = document.createElement('div')
      probe.style.color = `var(${item.key})`
      document.body.appendChild(probe)
      const rgb = getComputedStyle(probe).color
      probe.remove()
      const m = rgb.match(/\d+/g)
      if (!m) return '#000000'
      return '#' + m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('')
    }
    if (item.type === 'range') {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(item.key)
      return raw.trim() || item.default || item.min
    }
    return item.default || ''
  }

  // 面板入口：开发模式或 ?edit
  const hasChanges =
    Object.keys(state.tokens || {}).length > 0 ||
    Object.keys(textEdits).length > 0 ||
    Object.keys(imageEdits).length > 0

  return (
    <div data-editor ref={rootRef}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileChosen}
        style={{ display: 'none' }}
      />

      <button
        type="button"
        className={`editor-launcher${open ? ' is-open' : ''}${hasChanges ? ' has-changes' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="打开编辑工具栏"
      >
        {open ? '×' : '编辑'}
      </button>

      {open && (
        <aside
          className={`editor-panel${dragging ? ' is-dragging' : ''}`}
          ref={panelRef}
          style={pos ? { left: `${pos.x}px`, top: `${pos.y}px` } : undefined}
        >
          <header
            className="editor-panel__head"
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
            title="拖动这里可以移动面板"
          >
            <div className="editor-panel__title">
              <span className="editor-panel__grip" aria-hidden="true">
                ⠿
              </span>
              <strong>编辑模式</strong>
            </div>
            <span className="editor-panel__sub">拖动标题移动 · 改动实时生效 · 存在本机</span>
            <div className="editor-panel__tools" onPointerDown={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="editor-panel__undo"
                onClick={undo}
                disabled={historyLen.past === 0}
                title="撤销上一步（Ctrl / ⌘ + Z）"
              >
                ↩ 后退
                {historyLen.past > 0 && <em>{historyLen.past}</em>}
              </button>
              <button
                type="button"
                className="editor-panel__undo"
                onClick={redo}
                disabled={historyLen.future === 0}
                title="重做（Ctrl / ⌘ + Shift + Z）"
              >
                ↪ 前进
                {historyLen.future > 0 && <em>{historyLen.future}</em>}
              </button>
              <button
                type="button"
                className="editor-panel__reset-pos"
                onClick={() => {
                  setPos(defaultPosition())
                  saveState({ ...loadState(), panelPos: null })
                }}
              >
                靠右
              </button>
            </div>
          </header>

          <nav className="editor-tabs">
            {[
              ['module', '模块'],
              ['font', '字体'],
              ['layout', '版式'],
              ['image', '图片'],
              ['orbit', '轨道'],
              ['covertext', '封面字'],
              ['marquee', '跑马灯'],
              ['text', '文字'],
              ['move', '移动'],
              ['version', '版本'],
              ['note', '标注'],
              ['export', '导出'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={tab === key ? 'is-active' : ''}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="editor-body">
            {tab === 'module' && (
              <>
                <section className="editor-group">
                  <h4>模块列表（{SECTIONS.length}）</h4>
                  <p className="editor-hint">
                    选中一个模块单独调它自己，不影响别的区块。也可以打开「点选」直接在页面上点。
                  </p>
                  <button
                    type="button"
                    className={`editor-toggle${pickMode ? ' is-on' : ''}`}
                    onClick={() => setPickMode((v) => !v)}
                  >
                    {pickMode ? '关闭点选模式' : '在页面上点选模块'}
                  </button>
                  <div className="editor-modules">
                    {sectionOrder.map((section) => (
                      <div
                        key={section.id}
                        className={`editor-module${activeSection === section.id ? ' is-active' : ''}${
                          section.cfg.hidden ? ' is-hidden' : ''
                        }`}
                      >
                        <button
                          type="button"
                          className="editor-module__name"
                          onClick={() => setActiveSection(section.id)}
                        >
                          {section.label}
                          {section.cfg.hidden ? '（已隐藏）' : ''}
                        </button>
                        <span className="editor-module__arrows">
                          <button type="button" onClick={() => moveSection(section.id, -1)} title="上移">
                            ↑
                          </button>
                          <button type="button" onClick={() => moveSection(section.id, 1)} title="下移">
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => setSectionValue(section.id, 'hidden', section.cfg.hidden ? '' : 1)}
                            title="显示 / 隐藏"
                          >
                            {section.cfg.hidden ? '显' : '隐'}
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="editor-group">
                  <h4>
                    当前模块：
                    {SECTIONS.find((s) => s.id === activeSection)?.label || '未选择'}
                  </h4>
                  {[
                    { key: 'space', label: '上下留白', min: 0.4, max: 1.8, step: 0.05, unit: '×', fallback: 1 },
                    { key: 'zoom', label: '整块缩放', min: 0.85, max: 1.15, step: 0.01, unit: '×', fallback: 1 },
                  ].map((item) => (
                    <label className="editor-field" key={item.key}>
                      <span className="editor-field__label">
                        {item.label}
                        <em>{sectionCfg[activeSection]?.[item.key] ?? '默认'}</em>
                      </span>
                      <input
                        type="range"
                        min={item.min}
                        max={item.max}
                        step={item.step}
                        value={Number(sectionCfg[activeSection]?.[item.key] ?? item.fallback)}
                        onChange={(e) => setSectionValue(activeSection, item.key, Number(e.target.value))}
                      />
                    </label>
                  ))}
                  {[
                    { key: 'bg', label: '底色' },
                    { key: 'ink', label: '文字色' },
                    { key: 'accent', label: '强调色' },
                  ].map((item) => (
                    <label className="editor-field" key={item.key}>
                      <span className="editor-field__label">{item.label}</span>
                      <div className="editor-color-row">
                        <input
                          type="color"
                          value={sectionCfg[activeSection]?.[item.key] || '#ffffff'}
                          onChange={(e) => setSectionValue(activeSection, item.key, e.target.value)}
                        />
                        <button
                          type="button"
                          className="is-ghost"
                          onClick={() => setSectionValue(activeSection, item.key, '')}
                        >
                          清除
                        </button>
                      </div>
                    </label>
                  ))}
                  <p className="editor-hint">
                    模块级设置只写在该区块上（CSS 变量就近覆盖），不会污染其他模块。
                  </p>
                </section>
              </>
            )}

            {(tab === 'font' || tab === 'layout') && (
              <>
                {tab === 'layout' && (
                  <section className="editor-group">
                    <h4>风格主题</h4>
                    <div className="editor-actions">
                      <button
                        type="button"
                        className={currentTheme() === 'abcd' ? '' : 'is-ghost'}
                        onClick={() => setTheme('abcd')}
                      >
                        ABCD 黑白
                      </button>
                      <button
                        type="button"
                        className={currentTheme() === 'classic' ? '' : 'is-ghost'}
                        onClick={() => setTheme('classic')}
                      >
                        原版纸感
                      </button>
                    </div>
                    <p className="editor-hint">
                      ABCD 风格：纯黑白、英文全大写宣言、黑色发丝线、图文去框。
                      原版：米白纸底 + 赭红强调色。
                    </p>
                  </section>
                )}
                {TOKEN_GROUPS.filter((g) =>
                  tab === 'font' ? g.title === '字体' : g.title !== '字体' && g.title !== '颜色'
                ).map((group) => (
                  <section className="editor-group" key={group.title}>
                    <h4>{group.title}</h4>
                    {group.items.map((item) => (
                      <label className="editor-field" key={item.key}>
                        <span className="editor-field__label">
                          {item.label}
                          <em>{state.tokens?.[item.key] ?? '默认'}</em>
                        </span>
                        {item.type === 'font' ? (
                          <select
                            value={state.tokens?.[item.key]?.replace(/['"]/g, '').split(',')[0]?.trim() || item.default}
                            onChange={(e) => setToken(item.key, fontStack(e.target.value))}
                          >
                            {FONT_OPTIONS.map((font) => (
                              <option key={font} value={font}>
                                {font}
                              </option>
                            ))}
                          </select>
                        ) : item.type === 'color' ? (
                          <input
                            type="color"
                            value={currentValue(item)}
                            onChange={(e) => setToken(item.key, e.target.value)}
                          />
                        ) : (
                          <input
                            type="range"
                            min={item.min}
                            max={item.max}
                            step={item.step}
                            value={parseFloat(currentValue(item)) || 0}
                            onChange={(e) => {
                              const raw = Number(e.target.value)
                              setToken(item.key, `${raw}${item.unit === 'px' || item.unit === 'em' ? item.unit : ''}`)
                            }}
                          />
                        )}
                      </label>
                    ))}
                  </section>
                ))}

                <section className="editor-group">
                  <h4>颜色</h4>
                  {TOKEN_GROUPS.find((g) => g.title === '颜色').items.map((item) => (
                    <label className="editor-field" key={item.key}>
                      <span className="editor-field__label">{item.label}</span>
                      <input
                        type="color"
                        value={currentValue(item)}
                        onChange={(e) => setToken(item.key, e.target.value)}
                      />
                    </label>
                  ))}
                </section>
              </>
            )}

            {tab === 'image' && (
              <>
                <PeekEditor onFlash={flash} />
                <section className="editor-group">
                  <h4>页面图片（{images.length}）</h4>
                  <p className="editor-hint">
                    点「换图」选一张本地图片，马上就能看到效果。导出时会把文件名一起写进去，
                    我会把它拷进项目里正式替换。
                  </p>
                  <div className="editor-images">
                    {images.map((img) => (
                      <div className="editor-image" key={`${img.src}-${img.index}`}>
                        <img src={img.el.getAttribute('src')} alt={img.alt} />
                        <div className="editor-image__meta">
                          <span>{img.alt}</span>
                          <div className="editor-image__actions">
                            <button type="button" onClick={() => pickImage(img)}>
                              换图
                            </button>
                            {imageEdits[img.src] && (
                              <button type="button" className="is-ghost" onClick={() => resetImage(img)}>
                                复原
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {tab === 'orbit' && <OrbitEditor onFlash={flash} />}
            {tab === 'covertext' && <CoverTextEditor onFlash={flash} />}
            {tab === 'marquee' && <MarqueeEditor onFlash={flash} />}

            {tab === 'move' && <MovePanel onFlash={flash} pushHistory={pushHistory} />}

            {tab === 'version' && (
              <VersionPanel
                onFlash={flash}
                applyScene={applyScene}
                onPeekStart={peekOriginalStart}
                onPeekEnd={peekOriginalEnd}
              />
            )}

            {tab === 'text' && (
              <section className="editor-group">
                <h4>文字样式（单块微调）</h4>
                <p className="editor-hint">
                  打开下面这个开关，然后在页面上**点任意一段文字**（标题、正文、导航、轨道中心的大字小字都行），
                  就能调它的字号、字距、行高、字重、字体、颜色、对齐、大小写，以及**左右/上下位置微调**，
                  还能直接改这段的内容。轨道中心那两行字调完会写进「轨道」设置，不会丢。
                </p>
                <button
                  type="button"
                  className={`editor-toggle${pickTextMode ? ' is-on' : ''}`}
                  onClick={() => {
                    setPickTextMode((v) => !v)
                    if (textMode) setTextMode(false)
                  }}
                >
                  {pickTextMode ? '关闭：点选文字' : '开启：点选文字'}
                </button>

                {activeTextKey ? (
                  <>
                    <p className="editor-hint">
                      已选中：<b>{activeTextEl()?.textContent.trim().slice(0, 26) || '（元素已变化，请重新点选）'}</b>
                    </p>

                    {TEXT_STYLE_FIELDS.filter((f) => f.type === 'range').map((field) => (
                      <label className="editor-field" key={field.key}>
                        <span className="editor-field__label">
                          {field.label}
                          <em>
                            {textStyles[activeTextKey]?.[field.key] ?? textValueOf(field) ?? '默认'}
                          </em>
                        </span>
                        <input
                          type="range"
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          value={rangeValueOf(field)}
                          onChange={(e) => setTextStyle(field.key, Number(e.target.value))}
                        />
                      </label>
                    ))}

                    {TEXT_STYLE_FIELDS.filter((f) => f.type === 'font').map((field) => (
                      <label className="editor-field" key={field.key}>
                        <span className="editor-field__label">{field.label}</span>
                        <select
                          value={textStyles[activeTextKey]?.family ?? textValueOf(field) ?? ''}
                          onChange={(e) => setTextStyle('family', e.target.value)}
                        >
                          <option value="">跟随全局</option>
                          {FONT_OPTIONS.map((font) => (
                            <option key={font} value={font}>
                              {font}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}

                    {TEXT_STYLE_FIELDS.filter((f) => f.type === 'select').map((field) => (
                      <label className="editor-field" key={field.key}>
                        <span className="editor-field__label">{field.label}</span>
                        <select
                          value={textStyles[activeTextKey]?.[field.key] ?? textValueOf(field)}
                          onChange={(e) => setTextStyle(field.key, e.target.value)}
                        >
                          {field.options.map((option) => (
                            <option key={option} value={option}>
                              {option === 'none' ? '不转换' : option}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}

                    {TEXT_STYLE_FIELDS.filter((f) => f.type === 'color').map((field) => (
                      <label className="editor-field" key={field.key}>
                        <span className="editor-field__label">{field.label}</span>
                        <div className="editor-color-row">
                          <input
                            type="color"
                            value={textStyles[activeTextKey]?.color || textValueOf(field)}
                            onChange={(e) => setTextStyle('color', e.target.value)}
                          />
                          <button type="button" onClick={() => setTextStyle('color', '')}>
                            清除
                          </button>
                        </div>
                      </label>
                    ))}

                    <label className="editor-field">
                      <span className="editor-field__label">这段的内容</span>
                      <textarea
                        rows={3}
                        defaultValue={activeTextEl()?.textContent || ''}
                        key={activeTextKey}
                        onChange={(e) => replaceActiveText(e.target.value)}
                      />
                    </label>

                    <div className="editor-actions">
                      <button type="button" className="is-ghost" onClick={resetTextStyle}>
                        清除这段的样式
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="editor-hint">还没有选中文字。打开上面的开关，然后在页面上点一段文字。</p>
                )}
              </section>
            )}

            {tab === 'text' && (
              <section className="editor-group">
                <h4>文字内容</h4>
                <p className="editor-hint">
                  打开下面的开关，然后在页面上**点任意一段文字**就能直接改，改完点空白处保存。
                </p>
                <button
                  type="button"
                  className={`editor-toggle${textMode ? ' is-on' : ''}`}
                  onClick={() => {
                    setTextMode((v) => !v)
                    if (pickTextMode) setPickTextMode(false)
                  }}
                >
                  {textMode ? '关闭文字编辑' : '开启文字编辑'}
                </button>

                {activeTextKey && (
                  <div className="editor-size-row">
                    <span className="editor-size-row__label">选中的字号</span>
                    <button type="button" onClick={() => bumpTextValue('size', -2, 16)}>
                      A−
                    </button>
                    <strong>{currentTextValue('size', 16)}px</strong>
                    <button type="button" onClick={() => bumpTextValue('size', 2, 16)}>
                      A+
                    </button>
                    <button
                      type="button"
                      className="is-ghost"
                      onClick={() => setTextStyle('size', '')}
                      title="恢复默认字号"
                    >
                      重置
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  className={`editor-toggle${compareMode ? ' is-on' : ''}`}
                  onClick={() => setCompareMode((v) => !v)}
                >
                  {compareMode ? '关闭对比原文' : '开启对比原文'}
                </button>
                <p className="editor-hint">
                  开启后：鼠标**悬停**在改动过的文字上会浮出原文；**按住不放**（0.3 秒）会临时还原成原文，
                  松手回到改后版本，用来快速对比。文字编辑开关打开时，长按对比会让位给编辑。
                </p>

                <div className="editor-list">
                  {Object.entries(textEdits).map(([from, to]) => (
                    <div className="editor-list__row" key={from}>
                      <del>{from}</del>
                      <ins>{to === '' ? '（已清空）' : to}</ins>
                      <button
                        type="button"
                        className="editor-list__del"
                        onClick={() => removeTextEdit(from)}
                        title="删除这条改动，恢复原文"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {Object.keys(textEdits).length === 0 && (
                    <p className="editor-hint">还没有改过文字。</p>
                  )}
                </div>
              </section>
            )}

            {tab === 'note' && (
              <section className="editor-group">
                <h4>实时标注（{notes.length}）</h4>
                <p className="editor-hint">
                  打开下面的开关，然后在页面上**点一下**留一个编号意见，或者**拖出一个框**圈住要改的区域。
                  标注会跟着页面滚动，刷新不丢；导出时连位置和所属模块一起带给我。
                </p>
                <button
                  type="button"
                  className={`editor-toggle${noteMode ? ' is-on' : ''}`}
                  onClick={() => setNoteMode((v) => !v)}
                >
                  {noteMode ? '关闭标注模式' : '开启标注模式'}
                </button>

                <div className="editor-list">
                  {notes.map((note, index) => (
                    <div className="editor-note-row" key={note.id}>
                      <span className="editor-note-row__num">{index + 1}</span>
                      <div className="editor-note-row__body">
                        <span className="editor-note-row__meta">
                          {SECTIONS.find((s) => s.id === note.section)?.label || note.section || '页面'}
                          {note.kind === 'rect' ? ` · 框选 ${note.w}×${note.h}` : ' · 单点'}
                        </span>
                        <textarea
                          rows={2}
                          value={note.text}
                          placeholder="这里想怎么改？"
                          onChange={(e) => updateNote(note.id, e.target.value)}
                          onFocus={() => setActiveNote(note.id)}
                        />
                      </div>
                      <button
                        type="button"
                        className="editor-note-row__del"
                        onClick={() => removeNote(note.id)}
                        title="删除这条标注"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {notes.length === 0 && <p className="editor-hint">还没有标注。</p>}
                </div>
              </section>
            )}

            {tab === 'export' && (
              <section className="editor-group">
                <h4>
                  导出修改 <em className="editor-size-tag">{exportSizeLabel}</em>
                </h4>
                <p className="editor-hint">
                  只导出「跟默认值不一样」的部分：改了什么才出现什么，没动过的模块、默认的数字都不会写进来。
                  点「复制」粘给我即可。{exportBytes <= 3 ? ' 目前还没有改动。' : ''}
                </p>
                <div className="editor-actions">
                  <button type="button" onClick={copyExport}>
                    复制 JSON
                  </button>
                  <button type="button" onClick={downloadExport}>
                    下载 .json
                  </button>
                  <button type="button" className="is-ghost" onClick={resetAll}>
                    全部重置
                  </button>
                </div>
                <textarea readOnly value={exportJson} rows={14} />
              </section>
            )}
          </div>
        </aside>
      )}

      {compareMode && compareTip && (
        <div
          className="editor-compare-tip"
          style={{ left: `${compareTip.x}px`, top: `${compareTip.y}px` }}
        >
          <span>原文</span>
          {compareTip.text}
        </div>
      )}

      {typeof document !== 'undefined' &&
        createPortal(
          <div className="editor-notes" data-editor>
            {notes.map((note, index) => {
              const isRect = note.kind === 'rect'
              const isActive = activeNote === note.id
              return (
                <div
                  key={note.id}
                  className={`editor-note${isRect ? ' editor-note--rect' : ''}${
                    isActive ? ' is-active' : ''
                  }`}
                  style={
                    isRect
                      ? { left: `${note.x}px`, top: `${note.y}px`, width: `${note.w}px`, height: `${note.h}px` }
                      : { left: `${note.x}px`, top: `${note.y}px` }
                  }
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => setActiveNote(isActive ? null : note.id)}
                >
                  <span className="editor-note__num">{index + 1}</span>
                  {isActive && (
                    <div className="editor-note__pop">
                      <textarea
                        rows={2}
                        autoFocus
                        value={note.text}
                        placeholder="这里想怎么改？"
                        onChange={(e) => updateNote(note.id, e.target.value)}
                      />
                      <div className="editor-note__pop-actions">
                        <button type="button" onClick={() => setActiveNote(null)}>
                          完成
                        </button>
                        <button type="button" className="is-ghost" onClick={() => removeNote(note.id)}>
                          删除
                        </button>
                      </div>
                    </div>
                  )}
                  {!isActive && note.text && <span className="editor-note__text">{note.text}</span>}
                </div>
              )
            })}
            {rubber && (rubber.w > 2 || rubber.h > 2) && (
              <div
                className="editor-rubber"
                style={{
                  left: `${rubber.x}px`,
                  top: `${rubber.y}px`,
                  width: `${rubber.w}px`,
                  height: `${rubber.h}px`,
                }}
              />
            )}
          </div>,
          document.body
        )}

      {activeTextKey &&
        quickRect &&
        createPortal(
          <div
            className="editor-quick"
            data-editor
            onMouseDown={(event) => event.preventDefault()}
          >
            <span className="editor-quick__label">字号</span>
            <button type="button" onClick={() => bumpTextValue('size', -2, 16)} title="缩小 2px">
              A−
            </button>
            <span className="editor-quick__value">{currentTextValue('size', 16)}px</span>
            <button type="button" onClick={() => bumpTextValue('size', 2, 16)} title="放大 2px">
              A+
            </button>
            <span className="editor-quick__sep" />
            <span className="editor-quick__label">行高</span>
            <button type="button" onClick={() => bumpTextValue('lh', -0.05, 1.4)}>
              −
            </button>
            <button type="button" onClick={() => bumpTextValue('lh', 0.05, 1.4)}>
              +
            </button>
            <span className="editor-quick__sep" />
            <span className="editor-quick__label">字距</span>
            <button type="button" onClick={() => bumpTextValue('ls', -0.005, 0)}>
              −
            </button>
            <button type="button" onClick={() => bumpTextValue('ls', 0.005, 0)}>
              +
            </button>
            <button
              type="button"
              className="editor-quick__ghost"
              onClick={resetTextStyle}
              title="清除这段的自定义样式"
            >
              清除
            </button>
            <button
              type="button"
              className="editor-quick__ghost"
              onClick={() => {
                document
                  .querySelectorAll('.editor-text-active')
                  .forEach((el) => el.classList.remove('editor-text-active'))
                setActiveTextKey(null)
              }}
              title="取消选中"
            >
              ×
            </button>
          </div>,
          document.body
        )}

      {toast && <div className="editor-toast">{toast}</div>}
    </div>
  )
}
