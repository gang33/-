/**
 * 「移动内容」的存储层
 * - 每个被移动的元素按「稳定键」记录一个 {x, y} 偏移
 *   图片 → img|<src>
 *   文字 → text|<模块>|<文字前 24 字>
 *   其它 → el|<CSS 路径>
 * - 应用时用内联 translate，不影响原有布局（也不会撑开父容器）
 * - 存在 localStorage（lzy-move-v1），刷新不丢，可被「版本」面板一起回退
 */

export const MOVE_KEY = 'lzy-move-v1'
const EVENT = 'lzy-move-change'

const sectionIdOf = (el) => el.closest('section[id], div[id], footer[id]')?.id || 'global'

export const textSnippetOf = (el) =>
  String(el?.dataset?.editorOriginal || el?.textContent || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 24)

export function cssPathOf(el) {
  const parts = []
  let node = el
  while (node && node.nodeType === 1) {
    if (node.id) {
      parts.unshift(`#${node.id}`)
      break
    }
    const parent = node.parentElement
    if (!parent) break
    parts.unshift(`${node.tagName.toLowerCase()}:nth-child(${[...parent.children].indexOf(node) + 1})`)
    node = parent
    if (node === document.body) break
  }
  return parts.join('>')
}

/** 可以移动的元素：图片、直接装文字的元素 */
export function isMovable(el) {
  if (!(el instanceof Element)) return false
  if (el.closest('[data-editor]')) return false
  // 显式声明可移动：有些文字块本身不含直接文本节点（比如 DecryptedText 把每个字母
  // 包进 span），靠下面的"直接文本"判断会漏掉，这里给它们一个白名单出口。
  if (el.hasAttribute('data-move')) return true
  const tag = el.tagName
  if (tag === 'IMG') return true
  if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'SVG' || tag === 'PATH') return false
  for (const node of el.childNodes) {
    if (node.nodeType === 3 && node.textContent.trim()) return true
  }
  return false
}

/** 从点击目标往上找最近的"可移动内容" */
export function pickMovable(target) {
  if (!(target instanceof Element)) return null
  if (target.closest('[data-editor]')) return null
  // 标了 data-move 的块，内部再细的元素都归它管：
  // 否则会选中里面某个 inline 的字母 span —— inline 元素不吃 translate，拖不动。
  const explicit = target.closest('[data-move]')
  if (explicit) return explicit
  let el = target
  while (el && el !== document.body) {
    if (isMovable(el)) return el
    el = el.parentElement
  }
  return null
}

export function keyOf(el) {
  if (!el) return ''
  if (el.tagName === 'IMG') return `img|${el.getAttribute('src') || ''}`
  const snippet = textSnippetOf(el)
  if (snippet) return `text|${sectionIdOf(el)}|${snippet}`
  return `el|${cssPathOf(el)}`
}

/** 列出页面上所有可移动内容 */
export function collectMovables() {
  const root = document.querySelector('#root')
  if (!root) return []
  const out = []
  root.querySelectorAll('*').forEach((el) => {
    if (!isMovable(el)) return
    // 标了 data-move 的块，内部更细的元素不再单独列出来：
    // 和 pickMovable 保持同一条规则，否则框选会选中块里的 span ——
    // inline 元素不吃 translate，拖了没反应。
    const owner = el.closest('[data-move]')
    if (owner && owner !== el) return
    out.push(el)
  })
  return out
}

export function readMoves() {
  try {
    const raw = localStorage.getItem(MOVE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export function saveMoves(map) {
  try {
    localStorage.setItem(MOVE_KEY, JSON.stringify(map))
  } catch {
    /* noop */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: map }))
  return map
}

export function offsetOf(map, key) {
  const value = map[key]
  return value && Number.isFinite(value.x) && Number.isFinite(value.y)
    ? { x: value.x, y: value.y }
    : { x: 0, y: 0 }
}

/** 把某个元素的偏移写进 DOM */
export function applyOffsetToElement(el, offset) {
  if (!el) return
  const { x, y } = offset || { x: 0, y: 0 }
  if (!x && !y) {
    el.style.removeProperty('translate')
    el.removeAttribute('data-moved')
  } else {
    el.style.translate = `${Math.round(x)}px ${Math.round(y)}px`
    el.setAttribute('data-moved', '')
  }
}

/** 按存储把整页的偏移重新应用一遍 */
export function applyMoves(map = readMoves()) {
  const movables = collectMovables()
  movables.forEach((el) => applyOffsetToElement(el, offsetOf(map, keyOf(el))))
  return movables.length
}

/** 改一个元素的偏移（相对 0），返回新的 map */
export function setMove(key, x, y) {
  const map = readMoves()
  const nextX = Math.round(x)
  const nextY = Math.round(y)
  if (!nextX && !nextY) delete map[key]
  else map[key] = { x: nextX, y: nextY }
  return saveMoves(map)
}

/** 在一组键上叠加位移 */
export function nudgeKeys(keys, dx, dy) {
  const map = readMoves()
  keys.forEach((key) => {
    const current = offsetOf(map, key)
    const nextX = current.x + dx
    const nextY = current.y + dy
    if (!nextX && !nextY) delete map[key]
    else map[key] = { x: nextX, y: nextY }
  })
  return saveMoves(map)
}

export function clearKeys(keys) {
  const map = readMoves()
  keys.forEach((key) => {
    delete map[key]
  })
  return saveMoves(map)
}

export function clearAllMoves() {
  return saveMoves({})
}

export function subscribeMoves(callback) {
  const handler = (event) => callback(event.detail || readMoves())
  const onStorage = (event) => {
    if (event.key === MOVE_KEY) callback(readMoves())
  }
  window.addEventListener(EVENT, handler)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, handler)
    window.removeEventListener('storage', onStorage)
  }
}
