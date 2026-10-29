import { useEffect, useMemo, useRef, useState } from 'react'
import {
  COVER_TEXT_DEFAULTS,
  COVER_TEXT_SAVE_FAILED_EVENT,
  countCoverTextChanges,
  readCoverText,
  readCoverTextStorageState,
  resetCoverText,
  resetCoverTextItem,
  setCoverTextEditing,
  subscribeCoverText,
  updateCoverTextItem,
} from '../cover-text-config.js'
import { FONT_CHOICES } from './font-choices.js'

/**
 * 编辑工具栏 →「封面字」面板
 * 首屏（纯黑底 + 封面照片）上每一处印字都能单独调：内容、字号、字距、字体、颜色、位置。
 * 位置除了下面的「左右 / 上下」，也可以打开这个面板后直接在页面上拖动那些字。
 */

const fmt = (value, step) => (step < 1 ? Number(value).toFixed(3) : String(Math.round(value)))

/** 存的是 ISO 串，显示成 时:分:秒，方便跟面板上的其它时间戳对照 */
function formatStamp(iso) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleTimeString('zh-CN', { hour12: false })
}

/** 照片当前的实际宽度（字号按它换算成 px 显示，换视口也跟着变） */
function measurePaperWidth() {
  if (typeof document === 'undefined') return 1000
  const el = document.querySelector('.cover__paper')
  const w = el ? el.getBoundingClientRect().width : 0
  return w > 0 ? w : 1000
}

export default function CoverTextEditor({ onFlash }) {
  const [config, setConfig] = useState(readCoverText)
  const [selected, setSelected] = useState(COVER_TEXT_DEFAULTS.big.id)
  const [paperWidth, setPaperWidth] = useState(measurePaperWidth)
  const [savedAt, setSavedAt] = useState(() => {
    // 打开面板时要能看到「上次是什么时候存的」，不能只认本次会话的改动
    const state = readCoverTextStorageState()
    return state.savedAt ? formatStamp(state.savedAt) : ''
  })
  const [exported, setExported] = useState('')
  const [storage, setStorage] = useState(readCoverTextStorageState)
  const [wordsDraft, setWordsDraft] = useState('')
  const wordsTimer = useRef(null)

  useEffect(() => subscribeCoverText(setConfig), [])

  // 每次写库后抖一下时间戳：让「改了到底存没存」在面板里看得见
  useEffect(() => {
    const stamp = () => {
      setSavedAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
      setStorage(readCoverTextStorageState())
    }
    const failed = () =>
      onFlash?.('浏览器没把改动存下来（存储不可用），刷新会回到默认')
    window.addEventListener('lzy-cover-text-change', stamp)
    window.addEventListener(COVER_TEXT_SAVE_FAILED_EVENT, failed)
    return () => {
      window.removeEventListener('lzy-cover-text-change', stamp)
      window.removeEventListener(COVER_TEXT_SAVE_FAILED_EVENT, failed)
    }
  }, [onFlash])

  // 面板在「封面字」标签页时才算编辑模式：页面上的印字才能拖
  useEffect(() => {
    setCoverTextEditing(true)
    return () => setCoverTextEditing(false)
  }, [])

  useEffect(() => {
    const onResize = () => setPaperWidth(measurePaperWidth())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const options = useMemo(
    () => [
      ...config.items.map((item) => ({
        id: item.id,
        label: `封面印字 · ${item.name}`,
      })),
      { id: 'falling', label: '能力标签 · 七个词（可掉落）' },
      { id: config.big.id, label: `封面大字 · ${config.big.name}` },
      { id: config.tape.id, label: `封面胶带 · ${config.tape.name}` },
    ],
    [config]
  )

  const isBig = selected === 'big'
  const isTape = selected === 'tape'
  // 七个能力标签在页面上是一整块掉落文字（FallingText），位置/字距/行高都在这一组里调
  const isFalling = selected === 'falling'
  const current = isFalling
    ? config.falling
    : isBig
      ? config.big
      : isTape
        ? config.tape
        : config.items.find((i) => i.id === selected) || config.big

  const update = (patch) => updateCoverTextItem(selected, patch)
  const changed = useMemo(() => countCoverTextChanges(config), [config])

  /** 把当前设置复制出来（别人/别的浏览器看不到这份 localStorage，只能靠导出发出去） */
  const handleExport = async () => {
    const text = JSON.stringify(readCoverText(), null, 2)
    setExported(text)
    try {
      await navigator.clipboard.writeText(text)
      onFlash?.('已复制到剪贴板，直接粘贴发给我就行')
    } catch {
      onFlash?.('浏览器不让自动复制，请手动全选下面那段文字')
    }
  }

  // 字号统一按「照片宽的百分比」存，这里换算成 px 给滑块用
  const sizePx = Number(current.s || 0) * paperWidth
  const sizeMin = isBig ? 40 : 5
  const sizeMax = isBig ? 420 : 120
  const sizeFromPx = (px) => Number((px / paperWidth).toFixed(6))

  /**
   * 词表用本地草稿 + 防抖提交：直接受控写回 store 的话，
   * mergeFalling 会把空行 trim 掉，用户敲回车就会被打回去，第二行永远打不出来。
   */
  const commitWords = (text, flush = false) => {
    setWordsDraft(text)
    if (wordsTimer.current) clearTimeout(wordsTimer.current)
    const apply = () => {
      const list = text
        .split('\n')
        .map((w) => w.trim())
        .filter(Boolean)
      update({ words: list })
    }
    if (flush) apply()
    else wordsTimer.current = setTimeout(apply, 400)
  }

  // 切到别的条目再切回来时，草稿要跟着库里的最新值
  useEffect(() => {
    setWordsDraft((config.falling.words || []).join('\n'))
  }, [selected, config.falling.words])

  return (
    <>
      <section className="editor-group">
        <h4>选一处字</h4>
        <p className="editor-hint">
          首屏上所有印字都在这里：先选一条，下面改的就是它。打开这一页后，也可以直接在页面上按住那些字拖动。
        </p>
        <label className="editor-field">
          <span className="editor-field__label">
            <span>当前调整</span>
            <em>{options.length} 处</em>
          </span>
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {!isTape && !isFalling && (
          <>
            <label className="editor-field">
              <span className="editor-field__label">
                <span>文本内容</span>
                <em>直接改</em>
              </span>
              <input
                className="editor-input"
                type="text"
                value={current.t}
                onKeyDown={(e) => e.stopPropagation()}
                onChange={(e) => update({ t: e.target.value })}
              />
            </label>
            <label className="editor-field">
              <span className="editor-field__label">
                <span>字体</span>
                <em>{current.ff || '跟随默认'}</em>
              </span>
              <select value={current.ff || ''} onChange={(e) => update({ ff: e.target.value })}>
                {FONT_CHOICES.map(([value, label]) => (
                  <option key={value || 'default'} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="editor-field">
              <span className="editor-field__label">
                <span>颜色</span>
                <em>{current.c}</em>
              </span>
              <input
                type="color"
                value={current.c || '#171614'}
                onChange={(e) => update({ c: e.target.value })}
              />
            </label>
          </>
        )}
        {isFalling && (
          <>
            <label className="editor-field">
              <span className="editor-field__label">
                <span>这七个词</span>
                <em>一行一个 · {current.words.length} 词</em>
              </span>
              <textarea
                className="editor-textarea"
                rows={7}
                value={wordsDraft}
                onKeyDown={(e) => e.stopPropagation()}
                onChange={(e) => commitWords(e.target.value)}
                onBlur={(e) => commitWords(e.target.value, true)}
              />
            </label>
            <label className="editor-field">
              <span className="editor-field__label">
                <span>字体</span>
                <em>{current.ff || '跟随默认'}</em>
              </span>
              <select value={current.ff || ''} onChange={(e) => update({ ff: e.target.value })}>
                {FONT_CHOICES.map(([value, label]) => (
                  <option key={value || 'default'} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="editor-field">
              <span className="editor-field__label">
                <span>颜色</span>
                <em>{current.c}</em>
              </span>
              <input type="color" value={current.c || '#4d4d4d'} onChange={(e) => update({ c: e.target.value })} />
            </label>
            <label className="editor-field">
              <span className="editor-field__label">
                <span>字号</span>
                <em>{(Number(current.s) * paperWidth).toFixed(1)}px</em>
              </span>
              <input
                type="range"
                min={3}
                max={40}
                step={0.2}
                value={Number((Number(current.s) * paperWidth).toFixed(2))}
                onChange={(e) => update({ s: sizeFromPx(Number(e.target.value)) })}
              />
            </label>
            <label className="editor-field">
              <span className="editor-field__label">
                <span>字距</span>
                <em>{fmt(current.gap, 0.01)}em</em>
              </span>
              <input
                type="range"
                min={0}
                max={3}
                step={0.01}
                value={current.gap}
                onChange={(e) => update({ gap: Number(e.target.value) })}
              />
            </label>
            <label className="editor-field">
              <span className="editor-field__label">
                <span>行高</span>
                <em>{Number(current.lh).toFixed(2)}</em>
              </span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={current.lh}
                onChange={(e) => update({ lh: Number(e.target.value) })}
              />
            </label>
            <label className="editor-field">
              <span className="editor-field__label">
                <span>左右</span>
                <em>{Math.round(current.x * 100)}%</em>
              </span>
              <input
                type="range"
                min={0.2}
                max={0.9}
                step={0.001}
                value={current.x}
                onChange={(e) => update({ x: Number(e.target.value) })}
              />
            </label>
            <label className="editor-field">
              <span className="editor-field__label">
                <span>上下</span>
                <em>{Math.round(current.y * 100)}%</em>
              </span>
              <input
                type="range"
                min={0.2}
                max={0.9}
                step={0.001}
                value={current.y}
                onChange={(e) => update({ y: Number(e.target.value) })}
              />
            </label>
            <label className="editor-field">
              <span className="editor-field__label">
                <span>这一组的宽度</span>
                <em>{Math.round(current.w * 100)}%</em>
              </span>
              <input
                type="range"
                min={0.1}
                max={0.7}
                step={0.005}
                value={current.w}
                onChange={(e) => update({ w: Number(e.target.value) })}
              />
            </label>
            <label className="editor-field">
              <span className="editor-field__label">
                <span>这一组的高度</span>
                <em>{Math.round(current.h * 100)}%</em>
              </span>
              <input
                type="range"
                min={0.12}
                max={0.75}
                step={0.005}
                value={current.h}
                onChange={(e) => update({ h: Number(e.target.value) })}
              />
            </label>
            <div className="editor-actions">
              <button
                type="button"
                onClick={() => {
                  update({ dx: 0, dy: 0 })
                  onFlash?.('这一组已归位')
                }}
              >
                这一组归位
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfig(resetCoverTextItem('falling'))
                  onFlash?.('这一组恢复默认')
                }}
              >
                这一组恢复默认
              </button>
            </div>
            <p className="editor-hint">
              这七个词是一整块会掉落的文字：页面上点一下会散开、可以拖着玩，停手一秒多就飞回原位；
              掉落中途再点一下，也会先归位再重新落一次 —— 起点和终点永远是下面定的这个位置。
              这里调的是它静止时的位置、宽度、字距和行高；「左右/上下」是整块的横向与纵向位置，宽度决定排成几行，
              高度决定碎片往下掉多远（掉到这一组的底边就停）。
            </p>
          </>
        )}
      </section>

      {!isFalling && (
        <section className="editor-group">
          <h4>字号与间距</h4>
          <p className="editor-hint">
            字号按封面照片宽度等比缩放，换屏幕大小不会跑版；标签里的 px 是当前视口下的实际大小。
          </p>
          <label className="editor-field">
            <span className="editor-field__label">
              <span>{isTape ? '胶带大小' : '字号'}</span>
              <em>
                {isTape ? `${Math.round(current.h * paperWidth * 0.5113)}px` : `${sizePx.toFixed(1)}px`}
              </em>
            </span>
            <input
              type="range"
              min={isTape ? 0.06 : sizeMin}
              max={isTape ? 0.36 : sizeMax}
              step={isTape ? 0.001 : isBig ? 1 : 0.2}
              value={isTape ? current.h : Number(sizePx.toFixed(2))}
              onChange={(e) =>
                isTape ? update({ h: Number(e.target.value) }) : update({ s: sizeFromPx(Number(e.target.value)) })
              }
            />
          </label>
          {!isTape && (
            <label className="editor-field">
              <span className="editor-field__label">
                <span>字距</span>
                <em>{fmt(current.ls ?? 0, 0.005)}em</em>
              </span>
              <input
                type="range"
                min={-0.06}
                max={0.4}
                step={0.005}
                value={current.ls ?? 0}
                onChange={(e) => update({ ls: Number(e.target.value) })}
              />
            </label>
          )}
          {isBig && (
            <label className="editor-field">
              <span className="editor-field__label">
                <span>字重</span>
                <em>{Math.round(current.w || 500)}</em>
              </span>
              <input
                type="range"
                min={300}
                max={900}
                step={100}
                value={Math.round(current.w || 500)}
                onChange={(e) => update({ w: Number(e.target.value) })}
              />
            </label>
          )}
          {isTape && (
            <>
              <label className="editor-field">
                <span className="editor-field__label">
                  <span>旋转</span>
                  <em>{Math.round(current.rot)}°</em>
                </span>
                <input
                  type="range"
                  min={-90}
                  max={90}
                  step={1}
                  value={Math.round(current.rot)}
                  onChange={(e) => update({ rot: Number(e.target.value) })}
                />
              </label>
            </>
          )}
        </section>
      )}

      {!isFalling && (
        <section className="editor-group">
          <h4>位置</h4>
          <p className="editor-hint">
            这两条是相对 PDF 原位的偏移；也可以在页面上直接拖着字走，松手就存。
          </p>
          <label className="editor-field">
            <span className="editor-field__label">
              <span>左右</span>
              <em>{Math.round(current.dx)}px</em>
            </span>
            <input
              type="range"
              min={-500}
              max={500}
              step={1}
              value={Math.round(current.dx)}
              onChange={(e) => update({ dx: Number(e.target.value) })}
            />
          </label>
          <label className="editor-field">
            <span className="editor-field__label">
              <span>上下</span>
              <em>{Math.round(current.dy)}px</em>
            </span>
            <input
              type="range"
              min={-400}
              max={400}
              step={1}
              value={Math.round(current.dy)}
              onChange={(e) => update({ dy: Number(e.target.value) })}
            />
          </label>
          <div className="editor-actions">
            <button
              type="button"
              onClick={() => {
                update({ dx: 0, dy: 0 })
                onFlash?.('这一处已归位')
              }}
            >
              这一处归位
            </button>
            <button
              type="button"
              onClick={() => {
                setConfig(resetCoverTextItem(selected))
                onFlash?.('这一处恢复默认')
              }}
            >
              这一处恢复默认
            </button>
          </div>
        </section>
      )}

      <section className="editor-group">
        <h4>导出</h4>
        <p className="editor-hint">
          这里的改动只存在你自己这台浏览器里。点一下把当前设置复制出来，粘到聊天窗口，就能把它写进代码、让所有人打开都是这个样子。
        </p>
        <div className="editor-actions">
          <button type="button" onClick={handleExport} data-cover-export>
            复制我的封面设置
          </button>
        </div>
        {exported && (
          <textarea
            className="editor-export"
            readOnly
            rows={7}
            value={exported}
            onFocus={(e) => e.target.select()}
            onPointerDown={(e) => e.stopPropagation()}
          />
        )}
      </section>

      <section className="editor-group">
        <h4>重置</h4>
        <p className="editor-hint">
          已偏离默认值 {changed} 处。重置会回到按 封面.pdf 量出来的那套坐标与字号。
        </p>
        <div className="editor-actions">
          <button
            type="button"
            onClick={() => {
              setConfig(resetCoverText())
              onFlash?.('封面文字已全部恢复默认')
            }}
          >
            全部恢复默认
          </button>
        </div>
        {/* 改动是即时写 localStorage 的，这行时间戳让「到底存没存」一眼可查 */}
        <p className="editor-hint" data-cover-saved>
          {savedAt ? `已写入本机：${savedAt}（共 ${changed} 处偏离默认）` : '还没有改动，当前是定稿默认值'}
        </p>
        <p className={`editor-hint${storage.usable ? '' : ' is-warn'}`} data-cover-storage>
          {storage.usable
            ? storage.hasSaved
              ? `浏览器存储正常 · 已存 ${storage.bytes} 字节${storage.savedAt ? ` · 写入于 ${formatStamp(storage.savedAt)}` : ''}`
              : '浏览器存储正常 · 还没写入过（打开页面看到的是默认值）'
            : '浏览器存储不可用（隐私模式或被拦）· 改动只在当前页面有效，刷新会丢'}
        </p>
      </section>
    </>
  )
}
