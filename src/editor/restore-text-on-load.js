/**
 * 页面加载时把编辑模式里改过的文字还原回来。
 *
 * 为什么需要它：编辑工具栏里的恢复逻辑只在「编辑器面板打开」时才跑，
 * 而用户改完文字直接刷新时并没有打开面板，所以看到的永远是原文 ——
 * 存储其实一直是好的，只是没人去读。
 *
 * 匹配方式刻意做得宽松：
 * 1. 存进去的 key 是 contenteditable 打开那一刻的整段 textContent（带换行和缩进），
 *    React 重新渲染后的 textContent 又是另一份空白形态，所以两边都做「空白归一化」再比。
 * 2. 不再要求「元素没有子元素」—— 像首页页脚那句带 <b> 的宣言，之前因为有子元素被整段跳过，
 *    改完刷新永远回到原文。现在只要它不含块级后代，就允许整段替换。
 *
 * 现在它有两个来源：
 * - 这台机器 localStorage 里存的（用户在编辑器里改的）；
 * - 固化进 look-data.js 的最终版文字（访客看不到 localStorage，只能靠这份）。
 * 两边合并，存过的优先 —— 谁在这台机器上刚改过，就还是按他改的显示。
 */

import { LOOK_TEXT_EDITS } from '../look-data.js'

const SKIP = '.dt-off, .dt-on, .dt-type, [data-orbit-center], [data-editor]'
const BLOCK_DESCENDANT = 'div, section, ul, ol, article, nav, header, footer, p, table, form'

// 只处理这些能「直接装一段话」的标签；cover__caps 是 <p> 但被列进通用文字工具，一并照顾
const TEXT_TAGS =
  'h1, h2, h3, h4, p, li, dd, dt, cite, .mono, .project__title, .pcard__title, .cover__caps'

const norm = (value) => String(value == null ? '' : value).replace(/\s+/g, ' ').trim()

function readStoredText() {
  try {
    const raw = JSON.parse(localStorage.getItem('lzy-editor-v1') || '{}')
    const map = raw && typeof raw.text === 'object' && raw.text ? raw.text : {}
    return map
  } catch {
    return {}
  }
}

function buildLookup(map) {
  const exact = new Map()
  const loose = new Map()
  Object.keys(map).forEach((key) => {
    const value = map[key]
    // 空串是有意义的：表示「这段文字删掉」，不能当没改过跳过
    if (typeof value !== 'string') return
    exact.set(key, value)
    const nk = norm(key)
    if (nk) loose.set(nk, value)
  })
  return { exact, loose }
}

function applyOnce(map, lookup) {
  let touched = 0
  document.querySelectorAll(TEXT_TAGS).forEach((el) => {
    if (el.closest(SKIP)) return
    // 含块级后代的是版式容器，整段替换会把结构拆掉，跳过
    if (el.querySelector(BLOCK_DESCENDANT)) return
    const raw = el.dataset.editorOriginal || el.textContent || ''
    const key = norm(raw)
    if (!key) return
    const to = map[raw] ?? lookup.exact.get(raw) ?? lookup.loose.get(key)
    if (typeof to !== 'string') return
    if (el.textContent === to) return
    el.textContent = to
    if (!el.dataset.editorOriginal) el.dataset.editorOriginal = raw
    touched += 1
  })
  return touched
}

export default function restoreTextOnLoad() {
  const map = { ...LOOK_TEXT_EDITS, ...readStoredText() }
  if (!Object.keys(map).length) return

  const lookup = buildLookup(map)

  // React 会在挂载后重渲染一次，甚至几次（图片、字体、解密动画）。
  // 分几个时间点各补一次，每次都是幂等的。
  const run = () => {
    try {
      applyOnce(map, lookup)
    } catch {
      /* 忽略：恢复失败不该影响页面 */
    }
  }
  run()
  requestAnimationFrame(run)
  ;[120, 400, 900, 1800].forEach((ms) => setTimeout(run, ms))
}
