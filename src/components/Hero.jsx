import { useCallback, useEffect, useRef, useState } from 'react'
import { site } from '../data.js'
import TypeWord from './TypeWord.jsx'
import FallingText from './FallingText.jsx'
import {
  applyCoverText,
  readCoverText,
  subscribeCoverText,
  subscribeCoverTextEditing,
} from '../cover-text-config.js'

/**
 * 首屏封面：纯黑底 + 作品集封面实拍照片，照片上的字按 _素材/个人经历/封面.pdf
 * 的文字层印上去（坐标默认值见 src/cover-print.js）。
 *
 * 照片尺寸完全交给 CSS 算（见 sections.css 里的 .cover__stage / .cover__paper）：
 * 舞台是尺寸容器，照片宽 = min(舞台宽, 舞台高 × 2400/1227)，再写进 --pw，
 * 印字字号 = --pw × 归一化字号。这样刷新、缩放、先渲染哪一段都不会改变尺寸。
 *
 * 所有印字都从 lzy-cover-text-v3 读，编辑器的「封面字」面板改的是同一份数据；
 * 面板打开时这些字可以直接在页面上拖（拖的是每条自己的 dx / dy）。
 */
export default function Hero() {
  const paperRef = useRef(null)

  const [config, setConfig] = useState(readCoverText)
  const configRef = useRef(config)
  configRef.current = config
  const [editing, setEditing] = useState(false)
  const [dragging, setDragging] = useState('')

  useEffect(() => subscribeCoverText(setConfig), [])
  useEffect(() => subscribeCoverTextEditing(setEditing), [])

  /** 拖动中的姿态先只落在内存里（每帧写 localStorage 会卡），松手再一次性写库 */
  const nudge = useCallback((id, dx, dy) => {
    setConfig((prev) => {
      const next = { ...prev, items: prev.items.slice() }
      if (id === 'big') next.big = { ...next.big, dx, dy }
      else if (id === 'tape') next.tape = { ...next.tape, dx, dy }
      else if (id === 'falling') next.falling = { ...next.falling, dx, dy }
      else {
        const index = next.items.findIndex((item) => item.id === id)
        if (index < 0) return prev
        next.items[index] = { ...next.items[index], dx, dy }
      }
      return next
    })
  }, [])

  useEffect(() => {
    if (!editing) return
    const print = paperRef.current?.querySelector('.cover__print')
    if (!print) return
    let drag = null

    const onDown = (event) => {
      if (event.button !== 0) return
      const node = event.target.closest?.('[data-cover-id]')
      if (!node) return
      event.preventDefault()
      event.stopPropagation()
      const id = node.dataset.coverId
      const current = configRef.current
      const source =
        id === 'big'
          ? current.big
          : id === 'tape'
            ? current.tape
            : id === 'falling'
              ? current.falling
              : current.items.find((item) => item.id === id)
      if (!source) return
      drag = { id, startX: event.clientX, startY: event.clientY, dx: source.dx, dy: source.dy }
      setDragging(id)
    }

    const onMove = (event) => {
      if (!drag) return
      const dx = Math.round(drag.dx + (event.clientX - drag.startX))
      const dy = Math.round(drag.dy + (event.clientY - drag.startY))
      nudge(drag.id, dx, dy)
    }

    const onUp = () => {
      if (!drag) return
      const id = drag.id
      drag = null
      setDragging('')
      const current = configRef.current
      const source =
        id === 'big'
          ? current.big
          : id === 'tape'
            ? current.tape
            : id === 'falling'
              ? current.falling
              : current.items.find((item) => item.id === id)
      if (!source) return
      applyCoverText(current)
    }

    print.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      print.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [editing, nudge])

  const editingClass = editing ? ' is-editing' : ''

  /* 七个能力标签：一整组（位置/字号/字距/行高都在 config.falling 里），点一下会散开 */
  const falling = config.falling
  const abilityText = falling.words.join('|')

  return (
    <section className="cover" id="top">
      <div className="cover__inner shell">
        <div className="cover__bar mono">
          <div className="cover__contact">
            <span>
              <b>Email.</b>
              <a href={`mailto:${site.email}`}>{site.email}</a>
            </span>
            <span>
              <b>Wechat.</b>
              {site.wechat}
            </span>
            <span>
              <b>Number.</b>
              <a href={`tel:${site.phone}`}>{site.phone}</a>
            </span>
          </div>
          <div className="cover__mark">
            <span>{site.base}</span>
            <span>{site.nameEn}</span>
          </div>
        </div>

        <div className="cover__stage">
          <div className="cover__paper" ref={paperRef}>
            <img
              className="cover__paper-img"
              src="/media/cover/cover.webp"
              srcSet="/media/cover/cover-1000.webp 1000w, /media/cover/cover.webp 2400w"
              sizes="(max-width: 860px) 92vw, 1230px"
              alt="作品集封面"
              draggable="false"
            />

            <div className={`cover__print${editingClass}`}>
              {config.items.map((it) => (
                <span
                  key={it.id}
                  data-cover-id={it.id}
                  className={`cover__print-item is-${it.f}${dragging === it.id ? ' is-dragging' : ''}`}
                  style={{
                    left: `${it.x * 100}%`,
                    top: `${it.y * 100}%`,
                    transform: `translate3d(${it.dx}px, ${it.dy}px, 0)`,
                    '--s': it.s,
                    '--w': it.w,
                    '--c': it.c,
                    // 字体和字距走 CSS 变量：React 直接写 fontFamily / letterSpacing
                    // 在这批印字上一律落不了地（同一次渲染里 padding-top 能写、只有这两个被丢），
                    // 而自定义属性和 --s/--w/--c 一样稳定，所以交给 CSS 的 var() 去取。
                    ...(it.ff ? { '--ff': it.ff } : null),
                    ...(it.ls ? { '--lsx': `${it.ls}em` } : null),
                  }}
                >
                  {it.t}
                </span>
              ))}

              {/* 七个能力标签：一整块掉落文字。点一下散开、可以拖、停手 2.4 秒飞回原位。
                  位置/宽度/字号/字距/行高全部来自 config.falling，「封面字」面板里可调；
                  打开那个面板时这块也能直接拖着走（拖的是这一组的 dx/dy）。 */}
              <div
                data-cover-id="falling"
                className={`cover__falling${dragging === 'falling' ? ' is-dragging' : ''}`}
                style={{
                  left: `${falling.x * 100}%`,
                  top: `${falling.y * 100}%`,
                  width: `${falling.w * 100}%`,
                  height: `${falling.h * 100}%`,
                  color: falling.c,
                  fontFamily: falling.ff ? `'${falling.ff}', var(--font-display)` : "'Outfit', var(--font-display)",
                  fontSize: `calc(var(--pw, 1000px) * ${falling.s})`,
                  fontWeight: 400,
                  lineHeight: falling.lh,
                  transform: `translate3d(${falling.dx}px, ${falling.dy}px, 0)`,
                  '--fall-gap': `${falling.gap}em`,
                }}
              >
                <FallingText
                  text={abilityText}
                  separator="|"
                  trigger={editing ? 'none' : 'hover'}
                  split="words"
                  gravity={1.5}
                  bounciness={0.28}
                  scatter={0.75}
                  stagger={0.04}
                  order="random"
                  draggable
                  cursorPush={0.6}
                  restoreDelay={2.5}
                  theme="light"
                  fontSize="inherit"
                  style={{
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    lineHeight: 'inherit',
                  }}
                />
              </div>

              <span
                data-cover-id="big"
                className={`cover__print-big${dragging === 'big' ? ' is-dragging' : ''}`}
                style={{
                  left: `${config.big.x * 100}%`,
                  top: `${config.big.y * 100}%`,
                  '--s': config.big.s,
                  '--ls': config.big.ls,
                  '--w': config.big.w,
                  '--c': config.big.c,
                  fontFamily: config.big.ff || undefined,
                  fontWeight: config.big.w,
                  color: config.big.c,
                  transform: `translate3d(${config.big.dx}px, ${config.big.dy}px, 0)`,
                }}
              >
                {/* 保留原来的打字机 + 鼠标躲闪：fit 关掉，字号由归一化尺寸决定 */}
                <TypeWord text={config.big.t} fit={false} />
              </span>

              <span
                data-cover-id="tape"
                className={`cover__print-tape${dragging === 'tape' ? ' is-dragging' : ''}`}
                style={{
                  left: `${config.tape.x * 100}%`,
                  top: `${config.tape.y * 100}%`,
                  '--ts': config.tape.h,
                  '--rot': `${config.tape.rot}deg`,
                  transform: `translate3d(${config.tape.dx}px, ${config.tape.dy}px, 0) rotate(${config.tape.rot}deg)`,
                }}
              >
                <img
                  className="cover__tape-img"
                  src="/media/cover/tape.webp"
                  alt=""
                  draggable={false}
                />
              </span>
            </div>
          </div>
        </div>

        <div className="cover__foot">
          <p className="cover__caps">
            <b>LIN ZENGYU</b> IS A BRAND DESIGNER BASED IN GUANGZHOU, WORKING FROM
            STRATEGY AND NAMING TO VISUAL IDENTITY, PACKAGING AND STORE SPACE —
            3 YEARS, 200+ CHAIN STORES DELIVERED.
          </p>
          <p className="cover__line">让品牌被记住，让设计能落地。</p>
        </div>
      </div>
    </section>
  )
}
