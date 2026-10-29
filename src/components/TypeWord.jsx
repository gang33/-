import { useEffect, useRef, useState } from 'react'

const DODGE_RADIUS = 260
const DODGE_PUSH = 84
const EASE = 0.16

/**
 * 打字机大字：逐字出现；鼠标靠近时，每个字母会朝远离光标的方向弹开。
 * 逐字的 transform 用在 .typeword__inner（打字动画），躲闪的 transform 用在外层 .typeword__letter，互不干扰。
 */
export default function TypeWord({ text, className = '', fit = true }) {
  const letters = text.split('')
  const [typedCount, setTypedCount] = useState(0)
  const wordRef = useRef(null)
  const letterRefs = useRef([])
  const caretRef = useRef(null)
  const remeasureRef = useRef(() => {})

  /* ---------- 自动撑满父容器宽度（长度可变，换字号也准） ---------- */
  useEffect(() => {
    const word = wordRef.current
    if (!word || !fit) return
    let raf = 0

    const resize = () => {
      const parent = word.parentElement
      if (!parent) return
      word.style.fontSize = ''
      const baseSize = parseFloat(window.getComputedStyle(word).fontSize) || 100
      const natural = word.scrollWidth
      const target = parent.clientWidth
      if (!natural || !target) return
      // 允许在基准字号上放大 / 缩小，最多 ±55%，避免极端字号
      const next = Math.max(baseSize * 0.45, Math.min(baseSize * 1.55, baseSize * (target / natural)))
      word.style.fontSize = `${next.toFixed(2)}px`
      remeasureRef.current()
    }

    const schedule = () => {
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        resize()
      })
    }

    schedule()
    if (document.fonts?.ready) document.fonts.ready.then(schedule)
    const late = window.setTimeout(schedule, 700)
    window.addEventListener('resize', schedule)

    return () => {
      window.clearTimeout(late)
      window.removeEventListener('resize', schedule)
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [fit, text])


  /* ---------- 打字机（等封面字体下载完再开始，避免大字中途换字） ---------- */
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setTypedCount(letters.length)
      return
    }
    setTypedCount(0)

    let cancelled = false
    let timer = 0

    const type = () => {
      if (cancelled) return
      let i = 0
      timer = window.setInterval(() => {
        i += 1
        setTypedCount(i)
        if (i >= letters.length) window.clearInterval(timer)
      }, 105)
    }

    const word = wordRef.current
    const family = word
      ? window
          .getComputedStyle(word)
          .fontFamily.split(',')[0]
          .replace(/["']/g, '')
          .trim()
      : ''
    const fonts = document.fonts
    const fontReady =
      fonts && family
        ? fonts
            .load(`500 100px "${family}"`)
            .catch(() => null)
            .then(() => fonts.ready)
        : Promise.resolve()

    Promise.race([
      fontReady,
      new Promise((resolve) => window.setTimeout(resolve, 1800)),
    ]).then(type)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [letters.length])

  /* ---------- 光标跟随最后一个已打出的字母 ---------- */
  useEffect(() => {
    const caret = caretRef.current
    if (!caret) return
    const last = letterRefs.current[Math.min(typedCount, letters.length) - 1]
    if (!last) {
      caret.style.transform = 'translate3d(0,0,0)'
      return
    }
    const done = typedCount >= letters.length
    const offset = done ? last.offsetLeft + last.offsetWidth : last.offsetLeft
    caret.style.transform = `translate3d(${offset}px, 0, 0)`
    caret.classList.toggle('is-done', done)
  }, [typedCount, letters.length])

  /* ---------- 鼠标躲闪 ---------- */
  useEffect(() => {
    const word = wordRef.current
    if (!word) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const targets = letters.map(() => ({ x: 0, y: 0, r: 0 }))
    const currents = letters.map(() => ({ x: 0, y: 0, r: 0 }))
    let centers = []
    let raf = 0

    // 用 offsetLeft/offsetWidth（不受 transform 影响）算出每个字母的静止中心点
    const measure = () => {
      const rect = word.getBoundingClientRect()
      centers = letterRefs.current.map((el) =>
        el
          ? {
              x: rect.left + el.offsetLeft + el.offsetWidth / 2,
              y: rect.top + el.offsetTop + el.offsetHeight / 2,
            }
          : null
      )
    }

    const tick = () => {
      raf = 0
      let moving = false
      letterRefs.current.forEach((el, index) => {
        if (!el) return
        const cur = currents[index]
        const tgt = targets[index]
        cur.x += (tgt.x - cur.x) * EASE
        cur.y += (tgt.y - cur.y) * EASE
        cur.r += (tgt.r - cur.r) * EASE
        el.style.transform = `translate3d(${cur.x.toFixed(2)}px, ${cur.y.toFixed(
          2
        )}px, 0) rotate(${cur.r.toFixed(2)}deg)`
        if (
          Math.abs(tgt.x - cur.x) > 0.15 ||
          Math.abs(tgt.y - cur.y) > 0.15 ||
          Math.abs(tgt.r - cur.r) > 0.06
        ) {
          moving = true
        }
      })
      if (moving) raf = window.requestAnimationFrame(tick)
    }

    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(tick)
    }

    const onMove = (event) => {
      const px = event.clientX
      const py = event.clientY
      centers.forEach((center, index) => {
        if (!center) return
        const dx = center.x - px
        const dy = center.y - py
        const distance = Math.hypot(dx, dy) || 1
        if (distance > DODGE_RADIUS) {
          targets[index].x = 0
          targets[index].y = 0
          targets[index].r = 0
          return
        }
        const force = 1 - distance / DODGE_RADIUS
        targets[index].x = (dx / distance) * DODGE_PUSH * force
        targets[index].y = (dy / distance) * DODGE_PUSH * force * 0.85 - 8 * force
        targets[index].r = (index % 2 === 0 ? 1 : -1) * 8 * force
      })
      schedule()
    }

    const onLeave = () => {
      targets.forEach((tgt) => {
        tgt.x = 0
        tgt.y = 0
        tgt.r = 0
      })
      schedule()
    }

    const onViewportChange = () => {
      measure()
      schedule()
    }

    remeasureRef.current = measure
    measure()
    // 字体加载完成后重新测量一次，避免位置偏
    const remeasure = window.setTimeout(measure, 600)

    word.addEventListener('pointermove', onMove)
    word.addEventListener('pointerleave', onLeave)
    window.addEventListener('resize', onViewportChange)
    window.addEventListener('scroll', onViewportChange, { passive: true })

    return () => {
      window.clearTimeout(remeasure)
      word.removeEventListener('pointermove', onMove)
      word.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('resize', onViewportChange)
      window.removeEventListener('scroll', onViewportChange)
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [letters.length])

  return (
    <span className={`typeword ${className}`.trim()} ref={wordRef} aria-label={text}>
      {letters.map((letter, index) => (
        <span
          key={`${letter}-${index}`}
          className="typeword__letter"
          ref={(el) => {
            letterRefs.current[index] = el
          }}
          aria-hidden="true"
        >
          <span className={`typeword__inner${index < typedCount ? ' is-typed' : ''}`}>
            {letter}
          </span>
        </span>
      ))}
      <span className="typeword__caret" ref={caretRef} aria-hidden="true" />
    </span>
  )
}
