/**
 * 作品轨道（#orbit）的参数中心
 * - 唯一数据源：localStorage 的 lzy-orbit-v1
 * - 编辑工具栏的「轨道」面板写入，ProjectOrbit 订阅后实时渲染
 * - 这样所有调整都收敛在编辑模式里，不会再出现"页面上改不动"的情况
 */
import { projects } from './data.js'

export const ORBIT_STORAGE_KEY = 'lzy-orbit-v1'

const CHANGE_EVENT = 'lzy-orbit-change'
const EDITING_EVENT = 'lzy-orbit-editing'

/** 默认值：上次手动微调定稿的数值 */
export const ORBIT_DEFAULTS = {
  // 轨道几何
  itemSize: 150,
  radiusX: 410,
  radiusY: 165,
  rotation: 4.5,
  depth: 0,
  dim: 0,
  // 六张图的单独缩放（顺序同 projects）
  scales: [1.18, 0.84, 0.84, 0.92, 1.42, 1.12],
  // 轨道中心的文字
  centerText: 'WORKS',
  centerHint: '拖动可旋转 · 点击看详情',
  centerSize: 54,
  centerTracking: 0.06,
  centerFamily: '',
  centerHintSize: 9,
  centerHintTracking: 0.1,
  centerHintFamily: '',
  centerX: 0,
  centerY: 0,
  // 图下面那两行作品注释（作品名 + 年份/服务内容）
  noteSize: 12,
  noteGap: 10,
  noteLead: 3,
  noteDx: 0,
  noteDy: 0,
  noteOpacity: 0.55,
  // 每张图注释的单独上下偏移（顺序同 projects）
  // 因为六张源图都是 640×640 方图、logo 在画面里留白多少不一，
  // 只靠一个全局偏移对不齐，所以每张单独给一个。
  noteOffsets: [0, 0, 0, 0, 0, 0],
}

function normalize(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const merged = { ...ORBIT_DEFAULTS, ...source }
  const scales = Array.isArray(source.scales) ? source.scales : ORBIT_DEFAULTS.scales
  merged.scales = projects.map((_, index) => {
    const value = Number(scales[index])
    return Number.isFinite(value) && value > 0 ? value : 1
  })
  const offsets = Array.isArray(source.noteOffsets) ? source.noteOffsets : ORBIT_DEFAULTS.noteOffsets
  merged.noteOffsets = projects.map((_, index) => {
    const value = Number(offsets[index])
    return Number.isFinite(value) ? value : 0
  })
  ;[
    'itemSize',
    'radiusX',
    'radiusY',
    'rotation',
    'depth',
    'dim',
    'centerSize',
    'centerTracking',
    'centerHintSize',
    'centerHintTracking',
    'centerX',
    'centerY',
    'noteSize',
    'noteGap',
    'noteLead',
    'noteDx',
    'noteDy',
    'noteOpacity',
  ].forEach((key) => {
    const value = Number(merged[key])
    merged[key] = Number.isFinite(value) ? value : ORBIT_DEFAULTS[key]
  })
  merged.centerText = String(merged.centerText ?? '')
  merged.centerHint = String(merged.centerHint ?? '')
  merged.centerFamily = String(merged.centerFamily ?? '')
  merged.centerHintFamily = String(merged.centerHintFamily ?? '')
  return merged
}

export function readOrbitConfig() {
  try {
    const raw = localStorage.getItem(ORBIT_STORAGE_KEY)
    if (!raw) return normalize(ORBIT_DEFAULTS)
    return normalize(JSON.parse(raw))
  } catch {
    return normalize(ORBIT_DEFAULTS)
  }
}

export function saveOrbitConfig(config) {
  try {
    localStorage.setItem(ORBIT_STORAGE_KEY, JSON.stringify(config))
  } catch {
    /* 配额满了也不影响当前效果 */
  }
}

export function writeOrbitConfig(patch) {
  const next = normalize({ ...readOrbitConfig(), ...(patch || {}) })
  saveOrbitConfig(next)
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }))
  return next
}

export function resetOrbitConfig() {
  const next = normalize(ORBIT_DEFAULTS)
  saveOrbitConfig(next)
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }))
  return next
}

export function subscribeOrbitConfig(callback) {
  const onChange = (event) => callback(event.detail || readOrbitConfig())
  const onStorage = (event) => {
    if (event.key === ORBIT_STORAGE_KEY) callback(readOrbitConfig())
  }
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onStorage)
  }
}

/** 编辑模式开关：面板打开时，中心文字才可以拖动 */
export function setOrbitEditing(on) {
  window.dispatchEvent(new CustomEvent(EDITING_EVENT, { detail: !!on }))
}

export function subscribeOrbitEditing(callback) {
  const handler = (event) => callback(!!event.detail)
  window.addEventListener(EDITING_EVENT, handler)
  return () => window.removeEventListener(EDITING_EVENT, handler)
}
