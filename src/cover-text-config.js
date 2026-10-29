/**
 * 首屏封面印字的参数中心
 * - 唯一数据源：localStorage 的 lzy-cover-text-v4
 * - 编辑工具栏的「封面字」面板写入，Hero 订阅后实时重渲染
 * - 下面的默认值 = 定稿：在 封面.pdf 的原始坐标上，经过一轮人工微调后的版本
 *   （字体换成 Outfit / Archivo / 华狮，Portfolio 收紧字距）
 *   原始 PDF 那套仍留在 src/cover-print.js，给 CoverBook 用
 * - 七个能力标签合并成 falling 一组（掉落动画接管），位置/字距/行高都在这组里调
 */

export const COVER_TEXT_STORAGE_KEY = 'lzy-cover-text-v4'

const CHANGE_EVENT = 'lzy-cover-text-change'
const EDITING_EVENT = 'lzy-cover-text-editing'

/** 每条印字的默认值：id 固定不变（改内容也不会丢设置），name 只用于面板列表 */
const item = (id, name, t, x, y, s, f, extra = {}) => ({
  id,
  name,
  t,
  x,
  y,
  s,
  f,
  w: 400,
  c: '#171614',
  ff: '',
  ls: 0,
  dx: 0,
  dy: 0,
  ...extra,
})

export const COVER_TEXT_DEFAULTS = {
  items: [
    item('text-0', 'Brand Designer', 'Brand Designer', 0.13862, 0.14886, 0.018955, 'display', {
      ff: 'Outfit',
      ls: -0.015,
    }),
    item('text-1', '( INDIVIDUAL/', '( INDIVIDUAL/', 0.17519, 0.24755, 0.008841, 'mono', {
      ff: 'Outfit',
      ls: -0.015,
    }),
    item('text-2', 'PORTFOLIO )', 'PORTFOLIO )', 0.21642, 0.26704, 0.008841, 'mono', {
      ff: 'Outfit',
      ls: -0.025,
      dx: 8,
    }),
    item('text-3', '个', '个', 0.13473, 0.22806, 0.035647, 'cover', { w: 500 }),
    item('text-4', '人', '人', 0.28929, 0.22806, 0.035647, 'cover', { w: 500 }),
    item('text-5', '作品', '作品', 0.13438, 0.28791, 0.035647, 'cover', { w: 500 }),
    item('text-6', '集', '集', 0.25564, 0.28791, 0.035647, 'cover', { w: 500 }),
    item('text-7', 'portfolio - 2026', 'portfolio - 2026', 0.13475, 0.36186, 0.015041, 'mono', {
      ff: 'Archivo',
      ls: -0.01,
    }),
    item('text-8', 'LINZENGYU', 'LINZENGYU', 0.77015, 0.05847, 0.011529, 'mono', {
      ff: 'FZ HuaSi KeXian',
    }),
  ],
  big: {
    id: 'big',
    name: 'Portfolio 大字',
    t: 'Portfolio',
    x: 0.13141,
    y: 0.599,
    s: 0.17471,
    w: 500,
    c: '#171614',
    ff: '',
    ls: -0.01,
    dx: 0,
    dy: 0,
  },
  tape: {
    id: 'tape',
    name: '黄色胶带',
    // 现在贴的是实拍素材（public/media/cover/tape.png），不再是文字块：
    // 素材本身已经斜着拍好，所以默认 rot 为 0；x/y 让素材中心落在原来那条胶带的位置上。
    t: '',
    x: 0.0832,
    y: 0.5581,
    w: 0.0924,
    h: 0.2206,
    rot: 0,
    ff: '',
    dx: 0,
    dy: 0,
  },
  /**
   * 七个能力标签：整组交给 FallingText 做掉落动画，所以位置/字号/字距是「组」级参数。
   * 以前是七条各自独立的印字（text-9…text-15），合并后按短语排版、能整组挪。
   */
  falling: {
    id: 'falling',
    name: '七个能力标签',
    words: [
      'Brand Positioning',
      'Brand Visual Identity',
      'Brand Chain Spaces',
      'Brand Materials',
      'Annual Operations',
      'Packaging Design',
      'AIGC Tools',
    ],
    x: 0.555,
    y: 0.567,
    w: 0.28,
    h: 0.3,
    s: 0.009732,
    gap: 0.75,
    lh: 1.75,
    ff: 'Outfit',
    c: '#4d4d4d',
    dx: 0,
    dy: 0,
  },
}

const NUMBER_KEYS = ['x', 'y', 's', 'w', 'ls', 'dx', 'dy']
const TAPE_NUMBER_KEYS = ['x', 'y', 'w', 'h', 'rot', 'dx', 'dy']
const FALLING_NUMBER_KEYS = ['x', 'y', 'w', 'h', 's', 'gap', 'lh', 'dx', 'dy']

function mergeItem(base, patch) {
  const source = patch && typeof patch === 'object' ? patch : {}
  const next = { ...base, ...source }
  next.id = base.id
  next.name = base.name
  next.t = String(next.t ?? base.t)
  next.f = String(next.f ?? base.f ?? '')
  next.ff = String(next.ff ?? '')
  next.c = String(next.c ?? base.c ?? '#171614')
  NUMBER_KEYS.forEach((key) => {
    if (base[key] === undefined) return
    const value = Number(next[key])
    next[key] = Number.isFinite(value) ? value : base[key]
  })
  return next
}

function mergeTape(base, patch) {
  const source = patch && typeof patch === 'object' ? patch : {}
  const next = { ...base, ...source }
  next.id = base.id
  next.name = base.name
  next.t = String(next.t ?? base.t)
  next.ff = String(next.ff ?? '')
  TAPE_NUMBER_KEYS.forEach((key) => {
    const value = Number(next[key])
    next[key] = Number.isFinite(value) ? value : base[key]
  })
  return next
}

/** 七个能力标签：words 是词表（面板里一行一个），其余是整组的位置与排版参数 */
function mergeFalling(base, patch) {
  const source = patch && typeof patch === 'object' ? patch : {}
  const next = { ...base, ...source }
  next.id = base.id
  next.name = base.name
  const words = Array.isArray(next.words)
    ? next.words
    : typeof next.words === 'string'
      ? next.words.split(/\n/)
      : base.words
  next.words = words.map((word) => String(word ?? '').trim()).filter(Boolean)
  if (!next.words.length) next.words = base.words.slice()
  next.ff = String(next.ff ?? '')
  next.c = String(next.c ?? base.c)
  FALLING_NUMBER_KEYS.forEach((key) => {
    const value = Number(next[key])
    next[key] = Number.isFinite(value) ? value : base[key]
  })
  return next
}

/** 把任意来源的数据压成一份合法配置：缺的补默认、多的丢掉、类型不对的回退 */
export function normalizeCoverText(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const itemsSource = Array.isArray(source.items) ? source.items : []
  const byId = new Map()
  itemsSource.forEach((entry) => {
    if (entry && typeof entry === 'object' && entry.id) byId.set(String(entry.id), entry)
  })
  return {
    items: COVER_TEXT_DEFAULTS.items.map((base) => mergeItem(base, byId.get(base.id))),
    big: mergeItem(COVER_TEXT_DEFAULTS.big, source.big),
    tape: mergeTape(COVER_TEXT_DEFAULTS.tape, source.tape),
    falling: mergeFalling(COVER_TEXT_DEFAULTS.falling, source.falling),
  }
}

export function readCoverText() {
  try {
    const raw = localStorage.getItem(COVER_TEXT_STORAGE_KEY)
    if (!raw) return normalizeCoverText(COVER_TEXT_DEFAULTS)
    return normalizeCoverText(JSON.parse(raw))
  } catch {
    // 主份坏了（写一半/被别的东西覆盖成非法 JSON）时先试上一版备份，别再直接回默认
    try {
      const bak = localStorage.getItem(COVER_TEXT_STORAGE_KEY + '.bak')
      if (bak) return normalizeCoverText(JSON.parse(bak))
    } catch {
      /* 备份也坏了，只能回默认 */
    }
    return normalizeCoverText(COVER_TEXT_DEFAULTS)
  }
}

/** 给面板用：本机这份存不存在、有多大、是几点写的（比「靠感觉」可靠） */
export function readCoverTextStorageState() {
  try {
    const key = COVER_TEXT_STORAGE_KEY
    const raw = localStorage.getItem(key)
    const probe = '__lzy_probe__'
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return {
      usable: true,
      key,
      bytes: raw ? raw.length : 0,
      hasSaved: Boolean(raw),
      savedAt: raw ? readSavedAt(raw) : '',
    }
  } catch {
    return { usable: false, key: COVER_TEXT_STORAGE_KEY, bytes: 0, hasSaved: false, savedAt: '' }
  }
}

function readSavedAt(raw) {
  try {
    const parsed = JSON.parse(raw)
    return typeof parsed?.savedAt === 'string' ? parsed.savedAt : ''
  } catch {
    return ''
  }
}

export const COVER_TEXT_SAVE_FAILED_EVENT = 'lzy-cover-text-save-failed'

/**
 * 写库并立刻读回来验一遍。
 * 隐私模式、配额满、被浏览器策略拦掉时 setItem 有时不抛错但也没真的写进去，
 * 只有读回比对才能确认「刷新后还在」。返回 true / false 给面板显示。
 */
function saveCoverText(config) {
  try {
    const key = COVER_TEXT_STORAGE_KEY
    const payload = JSON.stringify({ ...config, savedAt: new Date().toISOString() })
    // 覆盖前把上一版留一份：主份读不出来时还能退回上一次的调整
    const previous = localStorage.getItem(key)
    if (previous && previous !== payload) localStorage.setItem(key + '.bak', previous)
    localStorage.setItem(key, payload)
    return localStorage.getItem(key) === payload
  } catch {
    return false
  }
}

function emit(config) {
  const saved = saveCoverText(config)
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: config }))
  if (!saved) window.dispatchEvent(new CustomEvent(COVER_TEXT_SAVE_FAILED_EVENT, { detail: config }))
  return config
}

/** 改其中一条（'text-3' / 'big' / 'tape'），其余保持不变 */
export function updateCoverTextItem(id, patch) {
  const current = readCoverText()
  const key = String(id)
  if (key === 'big') {
    current.big = mergeItem(COVER_TEXT_DEFAULTS.big, { ...current.big, ...patch })
  } else if (key === 'tape') {
    current.tape = mergeTape(COVER_TEXT_DEFAULTS.tape, { ...current.tape, ...patch })
  } else if (key === 'falling') {
    current.falling = mergeFalling(COVER_TEXT_DEFAULTS.falling, { ...current.falling, ...patch })
  } else {
    const index = current.items.findIndex((item) => item.id === key)
    if (index < 0) return current
    current.items[index] = mergeItem(COVER_TEXT_DEFAULTS.items[index], {
      ...current.items[index],
      ...patch,
    })
  }
  return emit(normalizeCoverText(current))
}

/** 一次改多条（拖动时按帧写，避免每条都读一遍 localStorage） */
export function applyCoverText(next) {
  return emit(normalizeCoverText(next))
}

export function resetCoverTextItem(id) {
  const current = readCoverText()
  const key = String(id)
  if (key === 'big') {
    current.big = { ...COVER_TEXT_DEFAULTS.big }
  } else if (key === 'tape') {
    current.tape = { ...COVER_TEXT_DEFAULTS.tape }
  } else if (key === 'falling') {
    current.falling = { ...COVER_TEXT_DEFAULTS.falling }
  } else {
    const index = current.items.findIndex((item) => item.id === key)
    if (index < 0) return current
    current.items[index] = { ...COVER_TEXT_DEFAULTS.items[index] }
  }
  return emit(normalizeCoverText(current))
}

export function resetCoverText() {
  return emit(normalizeCoverText(COVER_TEXT_DEFAULTS))
}

export function subscribeCoverText(callback) {
  const onChange = (event) => callback(event.detail || readCoverText())
  const onStorage = (event) => {
    if (event.key === COVER_TEXT_STORAGE_KEY) callback(readCoverText())
  }
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onStorage)
  }
}

/** 编辑模式开关：面板打开时，封面上的字才可以用鼠标拖 */
export function setCoverTextEditing(on) {
  window.dispatchEvent(new CustomEvent(EDITING_EVENT, { detail: !!on }))
  document.documentElement.classList.toggle('is-cover-text-editing', !!on)
}

export function subscribeCoverTextEditing(callback) {
  const handler = (event) => callback(!!event.detail)
  window.addEventListener(EDITING_EVENT, handler)
  return () => window.removeEventListener(EDITING_EVENT, handler)
}

/** 与默认值相比改了几处，给「重置」那一段做提示 */
export function countCoverTextChanges(config) {
  const defaults = COVER_TEXT_DEFAULTS
  let count = 0
  const differs = (a, b, keys) =>
    keys.some((key) => {
      const left = a[key]
      const right = b[key]
      if (typeof right === 'number') return Math.abs(Number(left) - right) > 0.000001
      return String(left ?? '') !== String(right ?? '')
    })
  defaults.items.forEach((base, index) => {
    const item = config.items[index]
    if (!item) return
    if (differs(item, base, ['t', 's', 'ls', 'ff', 'c', 'dx', 'dy', 'w'])) count += 1
  })
  if (differs(config.big, defaults.big, ['t', 's', 'ls', 'ff', 'c', 'dx', 'dy', 'w'])) count += 1
  if (differs(config.tape, defaults.tape, ['t', 'rot', 'dx', 'dy', 'w', 'h', 'ff'])) count += 1
  if (differs(config.falling, defaults.falling, ['x', 'y', 'w', 'h', 's', 'gap', 'lh', 'ff', 'c', 'dx', 'dy']))
    count += 1
  if (config.falling.words.join('|') !== defaults.falling.words.join('|')) count += 1
  return count
}
