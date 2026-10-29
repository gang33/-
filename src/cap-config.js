/**
 * 个人优势区块的缩放参数 + 版本历史
 * - 唯一的缩放旋钮是 --cap-scale（1 = 原始大小，0.7 = 缩小到 70%）
 * - 每次改动都记一步，可以「回退一步 / 恢复一步」，也可以「对比原版」
 * - 存在 localStorage（lzy-cap-v1），刷新不丢
 */

export const CAP_STORAGE_KEY = 'lzy-cap-v1'

const CHANGE_EVENT = 'lzy-cap-change'

/** 默认缩放：0.7（= 你确认过的"×0.7"那一版） */
export const CAP_DEFAULT_SCALE = 0.7

const MIN_SCALE = 0.4
const MAX_SCALE = 1.4
const MAX_STEPS = 40

const round = (n) => Math.round(n * 1000) / 1000
const clamp = (n) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, round(n)))

function normalize(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  let history = Array.isArray(source.history) ? source.history : []
  history = history
    .map((step) => ({ scale: clamp(Number(step?.scale)), at: Number(step?.at) || Date.now() }))
    .filter((step) => Number.isFinite(step.scale))
  if (!history.length) history = [{ scale: CAP_DEFAULT_SCALE, at: Date.now() }]
  const index = Math.min(history.length - 1, Math.max(0, Number(source.index) || 0))
  return { history: history.slice(-MAX_STEPS), index: Math.min(index, history.length - 1) }
}

export function readCapState() {
  try {
    const raw = localStorage.getItem(CAP_STORAGE_KEY)
    if (!raw) return normalize(null)
    return normalize(JSON.parse(raw))
  } catch {
    return normalize(null)
  }
}

function commit(state) {
  try {
    localStorage.setItem(CAP_STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* 配额满了也不影响当前效果 */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: state }))
  return state
}

/** 当前缩放值 */
export function capScaleOf(state) {
  return state.history[state.index]?.scale ?? CAP_DEFAULT_SCALE
}

export function currentCapScale() {
  return capScaleOf(readCapState())
}

/** 设定新的缩放值（会新增一步历史；和当前值相同则不记） */
export function setCapScale(scale) {
  const state = readCapState()
  const next = clamp(scale)
  if (next === capScaleOf(state)) return state
  const history = state.history.slice(0, state.index + 1)
  history.push({ scale: next, at: Date.now() })
  return commit({ history: history.slice(-MAX_STEPS), index: Math.min(history.length - 1, MAX_STEPS - 1) })
}

/** 回退一步 */
export function undoCap() {
  const state = readCapState()
  if (state.index <= 0) return state
  return commit({ ...state, index: state.index - 1 })
}

/** 恢复一步 */
export function redoCap() {
  const state = readCapState()
  if (state.index >= state.history.length - 1) return state
  return commit({ ...state, index: state.index + 1 })
}

/** 回到原版大小（1×），同样记一步 */
export function resetCapScale() {
  return setCapScale(1)
}

export function subscribeCap(callback) {
  const onChange = (event) => callback(event.detail || readCapState())
  const onStorage = (event) => {
    if (event.key === CAP_STORAGE_KEY) callback(readCapState())
  }
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onStorage)
  }
}
