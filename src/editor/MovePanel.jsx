import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  applyMoves,
  applyOffsetToElement,
  clearAllMoves,
  clearKeys,
  collectMovables,
  keyOf,
  nudgeKeys,
  offsetOf,
  pickMovable,
  readMoves,
  setMove,
  subscribeMoves,
} from '../move-tool.js'

/**
 * 编辑模式 →「移动」面板
 * - 点一下：选中单个内容（文字 / 图片）
 * - 拖一个框：框选多个内容
 * - 选中后：直接拖动选区，或用方向键 / ±1 ±10 微调
 * - 位置存 localStorage，刷新不丢，也能在「版本」面板里回退
 */

const DRAG_THRESHOLD = 3

export default function MovePanel({ onFlash, pushHistory }) {
  const [mode, setMode] = useState(false)
  const [selection, setSelection] = useState([]) // [{ el, key }]
  const [rect, setRect] = useState(null)
  const [moves, setMoves] = useState(readMoves)

  const modeRef = useRef(false)
  const selectionRef = useRef([])
  const rectRef = useRef(null)
  const gestureRef = useRef(null)

  // 存储变化（方向键微调 / 归位 / 拖动提交）后立刻把位移贴回 DOM
  useEffect(
    () =>
      subscribeMoves((map) => {
        setMoves(map)
        applyMoves(map)
      }),
    []
  )
  useEffect(() => {
    modeRef.current = mode
    selectionRef.current = selection
  }, [mode, selection])
  useEffect(() => {
    rectRef.current = rect
  }, [rect])

  // 页面加载后把已保存的位移重新贴回去
  useEffect(() => {
    const run = () => applyMoves(readMoves())
    run()
    const timer = window.setTimeout(run, 600)
    return () => window.clearTimeout(timer)
  }, [])

  const select = useCallback((els, { additive = false, toggle = false } = {}) => {
    const incoming = els
      .filter(Boolean)
      .map((el) => ({ el, key: keyOf(el) }))
      .filter((item) => item.key)

    let items
    if (toggle) {
      // Ctrl + 单击：已选中的就取消，没选中的就加进来
      const current = selectionRef.current
      items = current.slice()
      incoming.forEach((item) => {
        const index = items.findIndex((existing) => existing.key === item.key)
        if (index >= 0) items.splice(index, 1)
        else items.push(item)
      })
    } else if (additive) {
      // Ctrl + 框选：并进当前选择
      const seen = new Set(selectionRef.current.map((item) => item.key))
      items = selectionRef.current.slice()
      incoming.forEach((item) => {
        if (seen.has(item.key)) return
        seen.add(item.key)
        items.push(item)
      })
    } else {
      items = incoming
    }

    document.querySelectorAll('.editor-move-sel').forEach((node) => node.classList.remove('editor-move-sel'))
    items.forEach(({ el }) => el.classList.add('editor-move-sel'))
    setSelection(items)
  }, [])

  /* ---------- 交互：点选 / 框选 / 拖动选区 ---------- */
  useEffect(() => {
    if (!mode) {
      setRect(null)
      return
    }

    const onDown = (event) => {
      if (!modeRef.current || event.button !== 0) return
      if (event.target.closest('[data-editor]')) return
      event.preventDefault()
      event.stopPropagation()

      const el = pickMovable(event.target)
      const inSelection = el && selectionRef.current.some((item) => item.el === el)

      gestureRef.current = {
        x: event.clientX,
        y: event.clientY,
        kind: inSelection ? 'drag' : 'marquee',
        moved: false,
        el,
        // 按住 Ctrl（Mac 为 ⌘）= 加选 / 反选
        additive: event.ctrlKey || event.metaKey,
        startOffsets: inSelection
          ? selectionRef.current.map((item) => ({ key: item.key, ...offsetOf(readMoves(), item.key) }))
          : [],
      }
      if (inSelection) {
        document.body.style.cursor = 'grabbing'
      }
    }

    const onMove = (event) => {
      const gesture = gestureRef.current
      if (!gesture) return
      const dx = event.clientX - gesture.x
      const dy = event.clientY - gesture.y
      if (!gesture.moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return
      gesture.moved = true
      event.preventDefault()

      if (gesture.kind === 'drag') {
        // 直接拖动选区：实时预览（不写存储，松手才提交）
        gesture.startOffsets.forEach((item) => {
          applyOffsetToElement(
            selectionRef.current.find((s) => s.key === item.key)?.el,
            { x: item.x + dx, y: item.y + dy }
          )
        })
        gesture.dx = dx
        gesture.dy = dy
      } else {
        setRect({
          x: Math.min(gesture.x, event.clientX),
          y: Math.min(gesture.y, event.clientY),
          w: Math.abs(dx),
          h: Math.abs(dy),
        })
      }
    }

    const onUp = (event) => {
      const gesture = gestureRef.current
      gestureRef.current = null
      document.body.style.cursor = ''
      if (!gesture) return

      if (gesture.kind === 'drag') {
        if (gesture.moved) {
          pushHistory?.()
          // 提交：把预览的位移写进存储
          const map = readMoves()
          gesture.startOffsets.forEach((item) => {
            const nextX = item.x + (gesture.dx || 0)
            const nextY = item.y + (gesture.dy || 0)
            if (!nextX && !nextY) delete map[item.key]
            else map[item.key] = { x: Math.round(nextX), y: Math.round(nextY) }
          })
          setMoves(
            (() => {
              try {
                localStorage.setItem('lzy-move-v1', JSON.stringify(map))
              } catch {
                /* noop */
              }
              window.dispatchEvent(new CustomEvent('lzy-move-change', { detail: map }))
              return map
            })()
          )
        } else if (gesture.additive && gesture.el) {
          // Ctrl + 点击已选中的元素：把它从选择里去掉
          select([gesture.el], { toggle: true })
          onFlash?.('已取消选中这一项')
        }
        setRect(null)
        return
      }

      // 框选
      const box = rectRef.current
      setRect(null)
      if (!gesture.moved || !box || box.w < 6 || box.h < 6) {
        // 单击：选中这一项；按住 Ctrl 则是加选 / 取消选中
        if (gesture.el) {
          select([gesture.el], { toggle: gesture.additive })
          const label = (gesture.el.textContent || gesture.el.getAttribute('src') || '').trim().slice(0, 16) || '图片'
          onFlash?.(`${gesture.additive ? '加选' : '已选中'}：${label}`)
        } else if (!gesture.additive) {
          select([])
        }
        return
      }

      // 多选：与框相交的内容元素
      const hits = collectMovables().filter((el) => {
        const r = el.getBoundingClientRect()
        const interX = Math.min(box.x + box.w, r.right) - Math.max(box.x, r.left)
        const interY = Math.min(box.y + box.h, r.bottom) - Math.max(box.y, r.top)
        return interX > 2 && interY > 2
      })
      // 去掉被祖先包含的重复项（只保留最内层）
      const filtered = hits.filter((el) => !hits.some((other) => other !== el && el.contains(other)))
      select(filtered, { additive: gesture.additive })
      onFlash?.(
        `已框选 ${filtered.length} 个${gesture.additive ? `，累计 ${selectionRef.current.length} 个` : ''}`
      )
      event.stopPropagation()
    }

    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('pointermove', onMove, true)
    document.addEventListener('pointerup', onUp, true)
    document.addEventListener('pointercancel', onUp, true)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('pointermove', onMove, true)
      document.removeEventListener('pointerup', onUp, true)
      document.removeEventListener('pointercancel', onUp, true)
      document.body.style.cursor = ''
    }
  }, [mode, select, onFlash, pushHistory])

  /* ---------- 方向键微调 / Esc 取消选中 ---------- */
  useEffect(() => {
    if (!mode) return
    const onKey = (event) => {
      if (event.key === 'Escape') {
        select([])
        return
      }
      if (!selection.length) return
      if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return
      const step = event.shiftKey ? 10 : 1
      const map = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
      const delta = map[event.key]
      if (!delta) return
      event.preventDefault()
      pushHistory?.()
      nudgeKeys(selection.map((item) => item.key), delta[0], delta[1])
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [mode, selection, pushHistory, select])

  const nudge = (dx, dy) => {
    if (!selection.length) return
    pushHistory?.()
    nudgeKeys(selection.map((item) => item.key), dx, dy)
  }

  const primary = selection[0]
  const primaryOffset = primary ? offsetOf(moves, primary.key) : { x: 0, y: 0 }

  return (
    <>
      {rect &&
        createPortal(
          <div
            className="editor-rubber"
            style={{
              position: 'fixed',
              left: `${rect.x}px`,
              top: `${rect.y}px`,
              width: `${rect.w}px`,
              height: `${rect.h}px`,
              zIndex: 470,
            }}
          />,
          document.body
        )}

      <section className="editor-group">
        <h4>移动内容</h4>
        <p className="editor-hint">
          开启后：**单击**选中一个文字或图片；**拖一个框**可以框选多个；
          **按住 Ctrl（Mac 为 ⌘）**点击或框选则是加选（再次 Ctrl + 点击可取消选中）；
          选中后**直接拖动**它们，或用方向键（Shift 加速）/ 下面的 ± 按钮微调。位置会自动保存，刷新不丢。
        </p>
        <button
          type="button"
          className={`editor-toggle${mode ? ' is-on' : ''}`}
          onClick={() => {
            setMode((v) => !v)
            if (mode) select([])
          }}
        >
          {mode ? '关闭移动模式' : '开启移动模式'}
        </button>
        {mode && (
          <p className="editor-hint">
            已选中 <b>{selection.length}</b> 个内容
            {selection.length > 0 ? '（按 Esc 取消选中）' : ''}
          </p>
        )}
      </section>

      <section className="editor-group">
        <h4>微调位置</h4>
        {primary ? (
          <>
            <p className="editor-hint">
              当前选中：<b>{(primary.el.textContent || primary.el.getAttribute('src') || '图片').trim().slice(0, 20)}</b>
            </p>
            <div className="editor-field">
              <span className="editor-field__label">
                左右 X
                <em>{Math.round(primaryOffset.x)} px</em>
              </span>
              <input
                type="range"
                min={-400}
                max={400}
                step={1}
                value={primaryOffset.x}
                onChange={(e) => {
                  pushHistory?.()
                  setMove(primary.key, Number(e.target.value), primaryOffset.y)
                }}
              />
            </div>
            <div className="editor-field">
              <span className="editor-field__label">
                上下 Y
                <em>{Math.round(primaryOffset.y)} px</em>
              </span>
              <input
                type="range"
                min={-400}
                max={400}
                step={1}
                value={primaryOffset.y}
                onChange={(e) => {
                  pushHistory?.()
                  setMove(primary.key, primaryOffset.x, Number(e.target.value))
                }}
              />
            </div>
            <div className="editor-actions">
              <button type="button" onClick={() => nudge(-1, 0)}>← 1</button>
              <button type="button" onClick={() => nudge(1, 0)}>1 →</button>
              <button type="button" onClick={() => nudge(0, -1)}>↑ 1</button>
              <button type="button" onClick={() => nudge(0, 1)}>1 ↓</button>
              <button type="button" onClick={() => nudge(-10, 0)}>← 10</button>
              <button type="button" onClick={() => nudge(10, 0)}>10 →</button>
            </div>
            <div className="editor-actions">
              <button
                type="button"
                onClick={() => {
                  pushHistory?.()
                  setMove(primary.key, 0, 0)
                  onFlash?.('已把这一项归位')
                }}
              >
                这一项归位
              </button>
              <button
                type="button"
                className="is-ghost"
                onClick={() => {
                  pushHistory?.()
                  clearKeys(selection.map((item) => item.key))
                  onFlash?.('已把选中的内容归位')
                }}
              >
                选中的全部归位
              </button>
            </div>
          </>
        ) : (
          <p className="editor-hint">先在上面开启移动模式，然后点选或框选内容。</p>
        )}
      </section>

      <section className="editor-group">
        <h4>
          已移动的内容 <em className="editor-size-tag">{Object.keys(moves).length} 项</em>
        </h4>
        <div className="editor-list">
          {Object.entries(moves).map(([key, value]) => (
            <div className="editor-list__row" key={key}>
              <del>{key.split('|').slice(-1)[0].slice(0, 14) || key.slice(0, 14)}</del>
              <ins>
                X {Math.round(value.x)} · Y {Math.round(value.y)}
              </ins>
              <button
                type="button"
                className="editor-list__del"
                title="这一项归位"
                onClick={() => {
                  pushHistory?.()
                  clearKeys([key])
                }}
              >
                ⟲
              </button>
            </div>
          ))}
          {Object.keys(moves).length === 0 && <p className="editor-hint">还没有移动过任何内容。</p>}
        </div>
        {Object.keys(moves).length > 0 && (
          <div className="editor-actions">
            <button
              type="button"
              className="is-ghost"
              onClick={() => {
                if (!window.confirm('把所有移动过的内容全部归位？')) return
                pushHistory?.()
                clearAllMoves()
                onFlash?.('已全部归位')
              }}
            >
              全部归位
            </button>
          </div>
        )}
      </section>
    </>
  )
}
