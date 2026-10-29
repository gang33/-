import { ORBIT_DEFAULTS } from './orbit-config.js'

/**
 * 通用「调整历史」—— 以"一次调整"为单位记录，而不是以每次存储变化为单位
 *   每批 = { before: 调整前的全量快照, after: 调整后的全量快照 }
 * - 连续改动（比如拖滑块）会自动合并成同一批，静默 1.2s 后才落盘
 * - 只保留最近 4 批
 * - 每批都能：按住看调整前 / 回到调整前 / 回到调整后
 * 快照覆盖编辑器写入 localStorage 的全量调整：
 *   lzy-editor-v1（变量/模块/文字/文字样式/标注/主题）
 *   lzy-orbit-v1（作品轨道）
 *   lzy-cap-v1  （个人优势缩放）
 */

export const HISTORY_KEY = 'lzy-history-v1'
export const TRACKED_KEYS = ['lzy-editor-v1', 'lzy-orbit-v1', 'lzy-cap-v1', 'lzy-move-v1']
export const MAX_BATCHES = 4
const EVENT = 'lzy-history-change'

const parse = (raw) => {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** 抓一份当前状态快照 */
export function captureSnapshot() {
  const data = {}
  TRACKED_KEYS.forEach((key) => {
    data[key] = localStorage.getItem(key)
  })
  return { at: Date.now(), data }
}

export const snapshotSignature = (snapshot) =>
  TRACKED_KEYS.map((key) => snapshot?.data?.[key] || '').join('\u0001')

/** 状态摘要，用于列表里说明"这批改了什么" */
export function describeSnapshot(snapshot) {
  const bits = []
  const editor = parse(snapshot?.data?.['lzy-editor-v1']) || {}
  const orbit = parse(snapshot?.data?.['lzy-orbit-v1'])
  const cap = parse(snapshot?.data?.['lzy-cap-v1'])
  const moves = parse(snapshot?.data?.['lzy-move-v1'])

  if (orbit) {
    const changed = Object.keys(ORBIT_DEFAULTS).filter((key) => {
      if (key === 'scales') return false
      return orbit[key] !== ORBIT_DEFAULTS[key]
    })
    if (changed.length) bits.push(`轨道 ${changed.length} 项`)
    const scales = Array.isArray(orbit.scales) ? orbit.scales : []
    const scaleChanged = scales.filter(
      (value, i) => Number(value) !== Number(ORBIT_DEFAULTS.scales?.[i] ?? 1)
    ).length
    if (scaleChanged) bits.push(`轨道缩放 ${scaleChanged} 张`)
  }
  if (cap) {
    const scale = Number(cap.history?.[cap.index]?.scale)
    if (Number.isFinite(scale) && scale !== 0.7) bits.push(`个人优势 ${scale.toFixed(2)}×`)
  }
  if (moves && Object.keys(moves).length) bits.push(`位置 ${Object.keys(moves).length} 处`)
  if (editor.tokens && Object.keys(editor.tokens).length) {
    bits.push(`变量 ${Object.keys(editor.tokens).length} 项`)
  }
  if (editor.sections && Object.keys(editor.sections).length) {
    bits.push(`模块 ${Object.keys(editor.sections).length} 个`)
  }
  if (editor.text && Object.keys(editor.text).length) {
    bits.push(`文字 ${Object.keys(editor.text).length} 处`)
  }
  if (editor.textStyles && Object.keys(editor.textStyles).length) {
    bits.push(`文字样式 ${Object.keys(editor.textStyles).length} 处`)
  }
  if (Array.isArray(editor.notes) && editor.notes.length) bits.push(`标注 ${editor.notes.length} 条`)
  return bits.join(' · ') || '默认状态'
}

/** 描述「这一次调整改了什么」——对比 before / after */
export function describeBatch(batch) {
  const bits = []
  const read = (snapshot, key) => parse(snapshot?.data?.[key])
  const fmt = (value) => (value === undefined || value === '' ? '无' : String(value))
  const short = (value) => (typeof value === 'number' ? String(Math.round(value * 1000) / 1000) : fmt(value))

  const bOrbit = read(batch.before, 'lzy-orbit-v1') || {}
  const aOrbit = read(batch.after, 'lzy-orbit-v1') || {}
  Object.keys(aOrbit).forEach((key) => {
    if (key === 'scales') return
    if (JSON.stringify(aOrbit[key]) === JSON.stringify(bOrbit[key])) return
    bits.push(`轨道 ${key}：${short(bOrbit[key])} → ${short(aOrbit[key])}`)
  })
  const bScales = bOrbit.scales || []
  const aScales = aOrbit.scales || []
  const scaleMoved = aScales.filter((v, i) => Number(v) !== Number(bScales[i])).length
  if (scaleMoved) bits.push(`轨道缩放 ${scaleMoved} 张`)

  const bCap = read(batch.before, 'lzy-cap-v1')
  const aCap = read(batch.after, 'lzy-cap-v1')
  const capOf = (raw) => (raw ? Number(raw.history?.[raw.index]?.scale) : null)
  const bCapScale = capOf(bCap)
  const aCapScale = capOf(aCap)
  if (bCapScale !== aCapScale) {
    bits.push(`个人优势：${bCapScale ?? '默认'} → ${aCapScale ?? '默认'}`)
  }

  const bMove = read(batch.before, 'lzy-move-v1') || {}
  const aMove = read(batch.after, 'lzy-move-v1') || {}
  const moveDiff = Object.keys(aMove).length - Object.keys(bMove).length
  if (moveDiff) bits.push(`位置：${Object.keys(aMove).length} 处（${moveDiff > 0 ? '+' : ''}${moveDiff}）`)

  const bEd = read(batch.before, 'lzy-editor-v1') || {}
  const aEd = read(batch.after, 'lzy-editor-v1') || {}
  const countOf = (obj, key) => Object.keys(obj[key] || {}).length
  ;[
    ['tokens', '变量'],
    ['sections', '模块设置'],
    ['text', '文字'],
    ['textStyles', '文字样式'],
  ].forEach(([key, label]) => {
    const before = countOf(bEd, key)
    const after = countOf(aEd, key)
    if (before !== after) bits.push(`${label}：${before} → ${after} 项`)
  })
  const bNotes = Array.isArray(bEd.notes) ? bEd.notes.length : 0
  const aNotes = Array.isArray(aEd.notes) ? aEd.notes.length : 0
  if (bNotes !== aNotes) bits.push(`标注：${bNotes} → ${aNotes} 条`)

  return bits.join(' · ') || '无实质改动'
}

export function readHistory() {
  const raw = parse(localStorage.getItem(HISTORY_KEY))
  const batches = Array.isArray(raw?.batches) ? raw.batches.filter((b) => b?.before && b?.after) : []
  return { batches }
}

function writeHistory(state) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(state))
  } catch {
    /* noop */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: state }))
  return state
}

/** 提交一批调整（保留最近 MAX_BATCHES 批） */
export function commitBatch(before, after) {
  if (!before || !after) return readHistory()
  if (snapshotSignature(before) === snapshotSignature(after)) return readHistory()
  const state = readHistory()
  const batches = [...state.batches, { at: Date.now(), before, after }].slice(-MAX_BATCHES)
  return writeHistory({ batches })
}

export function removeBatch(index) {
  const state = readHistory()
  return writeHistory({ batches: state.batches.filter((_, i) => i !== index) })
}

export function clearHistory() {
  return writeHistory({ batches: [] })
}

/* ---------------- 自动记录器 ---------------- */

const QUIET_MS = 1200
const TICK_MS = 500

let paused = false
let openBatch = null
let quietTimer = 0
let lastSeen = null
let lastSig = ''
let ticking = false

/** 对比预览期间暂停记录（预览会临时改写存储） */
export function setRecorderPaused(value) {
  paused = !!value
}

/** 预览结束后重新对齐，避免把预览回写当成一次调整 */
export function resyncRecorder() {
  const now = captureSnapshot()
  lastSeen = now
  lastSig = snapshotSignature(now)
  openBatch = null
  window.clearTimeout(quietTimer)
}

const commitOpen = () => {
  if (!openBatch) return
  const batch = openBatch
  openBatch = null
  window.clearTimeout(quietTimer)
  commitBatch(batch.before, batch.after)
  lastSeen = batch.after
  lastSig = snapshotSignature(batch.after)
}

const tick = () => {
  if (paused) return
  const now = captureSnapshot()
  const sig = snapshotSignature(now)

  if (openBatch) {
    if (sig !== snapshotSignature(openBatch.after)) {
      openBatch.after = now
      window.clearTimeout(quietTimer)
      quietTimer = window.setTimeout(commitOpen, QUIET_MS)
    }
    return
  }

  if (sig !== lastSig) {
    // 新一轮调整开始：before = 上一次已知状态
    openBatch = { before: lastSeen || now, after: now }
    lastSeen = now
    lastSig = sig
    quietTimer = window.setTimeout(commitOpen, QUIET_MS)
  }
}

/** 启动自动记录（在编辑器根组件里调用一次），返回停止函数 */
export function startAdjustmentRecorder() {
  if (ticking) return () => {}
  ticking = true
  lastSeen = captureSnapshot()
  lastSig = snapshotSignature(lastSeen)
  const timer = window.setInterval(tick, TICK_MS)
  return () => {
    ticking = false
    window.clearInterval(timer)
    window.clearTimeout(quietTimer)
    commitOpen()
  }
}

/**
 * 把某个快照写回存储并刷新页面（保位置）。
 * 任何板块、任何调整都能这样精确回到某一刻。
 */
export function restoreScene(snapshot) {
  if (!snapshot?.data) return false
  TRACKED_KEYS.forEach((key) => {
    const value = snapshot.data[key]
    if (value === null || value === undefined) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  })
  try {
    sessionStorage.setItem('lzy-restore-scroll', String(window.scrollY))
  } catch {
    /* noop */
  }
  window.location.reload()
  return true
}

export function subscribeHistory(callback) {
  const handler = (event) => callback(event.detail || readHistory())
  const onStorage = (event) => {
    if (event.key === HISTORY_KEY) callback(readHistory())
  }
  window.addEventListener(EVENT, handler)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, handler)
    window.removeEventListener('storage', onStorage)
  }
}

/** 刷新后把滚动位置还原（配合 restoreScene） */
export function restoreScrollAfterReload() {
  try {
    const y = sessionStorage.getItem('lzy-restore-scroll')
    if (!y) return
    sessionStorage.removeItem('lzy-restore-scroll')
    const top = Number(y) || 0
    requestAnimationFrame(() => window.scrollTo(0, top))
  } catch {
    /* noop */
  }
}
