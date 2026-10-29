import { Fragment, useEffect, useMemo, useRef } from 'react'

/**
 * 掉落文字（来自 React Bits 的 FallingText，按本项目改了三点）：
 *
 * 1. 物理引擎 matter-js 走的是 `public/vendor/matter.min.js`（UMD，挂在 window.Matter 上），
 *    因为这个环境没有 npm —— index.html 里用 <script> 引入，这里运行时再取。
 * 2. 去掉 'use client'，样式改由 src/styles/falling-text.css 统一 import。
 * 3. 其余逻辑（掉落 / 拖拽 / 甩动 / 回弹）保持上游实现。
 */

const THEMES = {
  dark: {
    '--falling-text-tile': 'linear-gradient(180deg, #3a3644 0%, #27242f 100%)',
    '--falling-text-tile-edge': 'rgba(255, 255, 255, 0.07)',
    '--falling-text-tile-highlight': 'rgba(255, 255, 255, 0.12)',
    '--falling-text-tile-shadow': '0 4px 10px -4px rgba(0, 0, 0, 0.7)',
    '--falling-text-tile-ink': '#f4f4f5',
  },
  light: {
    '--falling-text-tile': 'linear-gradient(180deg, #ffffff 0%, #f6f6f8 100%)',
    '--falling-text-tile-edge': 'rgba(24, 24, 27, 0.08)',
    '--falling-text-tile-highlight': 'rgba(255, 255, 255, 1)',
    '--falling-text-tile-shadow': '0 4px 10px -5px rgba(24, 24, 27, 0.25)',
    '--falling-text-tile-ink': '#27272a',
  },
}

const STEP = 1000 / 120
const WALL = 400
// 碎片落回原位用的曲线：快进慢收，且**不过冲**。
// 上游用的弹簧 linear() 峰值到 1.0828，位移一大就会先冲过终点再弹回来，
// 看起来正是「归位那一瞬间往右跳一两像素」——这里换成单调收敛的 easeOutQuint。
const SETTLE = 'cubic-bezier(0.22, 1, 0.36, 1)'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const getMatter = () => (typeof window === 'undefined' ? null : window.Matter)

const readableOn = (color) => {
  let hex = String(color || '')
    .trim()
    .replace('#', '')
  if (hex.length === 3) hex = hex.replace(/./g, (c) => c + c)
  if (!/^[0-9a-f]{6}$/i.test(hex)) return '#ffffff'
  const [r, g, b] = [0, 2, 4].map((index) => {
    const c = parseInt(hex.slice(index, index + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#18181b' : '#ffffff'
}

const settleEase = () => SETTLE

export default function FallingText({
  text = '',
  highlightWords = [],
  highlightClass = 'highlighted',
  trigger = 'auto',
  variant = 'text',
  split = 'words',
  separator = '',
  gravity = 1,
  bounciness = 0.2,
  scatter = 0.5,
  stagger = 0.03,
  order = 'random',
  draggable = true,
  mouseConstraintStiffness = 0.2,
  cursorPush = 0.5,
  restoreDelay = 0,
  fontSize = '1rem',
  accentColor = '#5b8cff',
  theme = 'dark',
  backgroundColor = 'transparent',
  wireframes = false,
  className = '',
  style,
}) {
  const containerRef = useRef(null)
  const textRef = useRef(null)
  const settings = {
    trigger,
    gravity,
    bounciness,
    scatter,
    stagger,
    order,
    draggable,
    mouseConstraintStiffness,
    cursorPush,
    restoreDelay,
  }
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const highlightKey = highlightWords.join('\u0000')
  const groups = useMemo(() => {
    const marks = highlightKey ? highlightKey.split('\u0000') : []
    // separator 为空时按空白切（上游行为）；给了就用它切 —— 封面那七个
    // 能力标签是短语（Brand Positioning），按空白切会被拆成两个碎片。
    const parts = separator ? String(text).split(separator) : String(text).split(/\s+/)
    return parts
      .map((word) => word.trim())
      .filter(Boolean)
      .map((word) => ({ word, highlighted: marks.some((entry) => entry && word.startsWith(entry)) }))
  }, [text, highlightKey, separator])

  useEffect(() => {
    const Matter = getMatter()
    const container = containerRef.current
    const block = textRef.current
    if (!Matter || !container || !block) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let phase = 'idle'
    let engine = null
    let pieces = []
    let walls = []
    let drag = null
    let raf = 0
    let last = 0
    let clock = 0
    let accumulator = 0
    let quietSince = null
    // 掉落开始的时间戳：静止判定偶尔会卡住（碎片在地板上一直有微速），
    // 用它做兜底，保证「停一会儿就飞回原位」这件事一定会发生。
    let fallAt = 0
    // 最后一次和这七个词打交道的时间（进入 / 移动 / 离开 / 触发）。
    // 复位倒计时就从这个点开始算，鼠标还在玩的时候不会往回飞。
    let lastTouch = 0
    let inside = false
    let visible = true
    let armed = true
    let lastBounciness = null
    const pointer = { x: 0, y: 0, vx: 0, vy: 0, time: 0 }

    const local = (event) => {
      const box = container.getBoundingClientRect()
      return {
        x: event.clientX - box.left - container.clientLeft,
        y: event.clientY - box.top - container.clientTop,
      }
    }

    const placeWalls = () => {
      if (!engine) return
      const width = container.clientWidth
      const height = container.clientHeight
      const [floor, left, right, ceiling] = walls
      Matter.Body.setPosition(floor, { x: width / 2, y: height + WALL / 2 })
      Matter.Body.setPosition(left, { x: -WALL / 2, y: height / 2 })
      Matter.Body.setPosition(right, { x: width + WALL / 2, y: height / 2 })
      Matter.Body.setPosition(ceiling, { x: width / 2, y: -WALL / 2 })
      pieces.forEach((piece) => Matter.Sleeping.set(piece.body, false))
    }

    const draw = (alpha) => {
      for (const piece of pieces) {
        const { body } = piece
        const x = piece.px + (body.position.x - piece.px) * alpha
        const y = piece.py + (body.position.y - piece.py) * alpha
        const angle = piece.pa + (body.angle - piece.pa) * alpha
        if (
          Math.abs(x - piece.dx) < 0.01 &&
          Math.abs(y - piece.dy) < 0.01 &&
          Math.abs(angle - piece.da) < 0.0001
        )
          continue
        piece.dx = x
        piece.dy = y
        piece.da = angle
        piece.element.style.transform = `translate3d(${(x - piece.w / 2).toFixed(2)}px, ${(y - piece.h / 2).toFixed(2)}px, 0) rotate(${angle.toFixed(4)}rad)`
      }
    }

    const release = (piece) => {
      const s = settingsRef.current
      piece.released = true
      Matter.Body.setStatic(piece.body, false)
      Matter.Sleeping.set(piece.body, false)
      const kick = clamp(s.scatter, 0, 1) * (piece.knocked ? 0.4 : 1)
      Matter.Body.setVelocity(piece.body, {
        x: (Math.random() - 0.5) * 3.2 * kick,
        y: -Math.random() * 2 * kick,
      })
      Matter.Body.setAngularVelocity(piece.body, (Math.random() - 0.5) * 0.12 * kick)
    }

    const frame = (now) => {
      raf = 0
      if (!engine || !visible) return
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60)
      last = now
      clock += dt
      const s = settingsRef.current
      engine.gravity.y = clamp(s.gravity, -3, 4) * 1.4
      const bounce = clamp(s.bounciness, 0, 1)
      if (bounce !== lastBounciness) {
        lastBounciness = bounce
        pieces.forEach((piece) => {
          piece.body.restitution = bounce
        })
      }
      for (const piece of pieces) if (!piece.released && (clock >= piece.at || piece.knocked)) release(piece)
      accumulator += dt * 1000
      while (accumulator >= STEP) {
        for (const piece of pieces) {
          piece.px = piece.body.position.x
          piece.py = piece.body.position.y
          piece.pa = piece.body.angle
        }
        Matter.Engine.update(engine, STEP)
        accumulator -= STEP
      }
      draw(accumulator / STEP)
      // 复位计时从「最后一次和这七个词打交道」开始算：鼠标还停在上面、或者还在拖着碎片，
      // 就不该收回去；离开之后停满 restoreDelay 秒才飞回原位，中途再回来会重新计时。
      const idleTooLong =
        s.restoreDelay > 0 && !drag && lastTouch > 0 && now - lastTouch > s.restoreDelay * 1000
      if (idleTooLong) {
        restore()
        return
      }
      raf = requestAnimationFrame(frame)
    }

    const wake = () => {
      if (!raf && engine && visible) {
        last = 0
        raf = requestAnimationFrame(frame)
      }
    }

    const fall = () => {
      if (phase !== 'idle' || reduced) return
      const elements = [...block.querySelectorAll('[data-piece]')]
      if (!elements.length) return
      const s = settingsRef.current
      const box = container.getBoundingClientRect()
      const originX = box.left + container.clientLeft
      const originY = box.top + container.clientTop
      const rects = elements.map((element) => {
        const rect = element.getBoundingClientRect()
        return { x: rect.left - originX, y: rect.top - originY, w: rect.width, h: rect.height }
      })
      block.style.minHeight = `${block.offsetHeight}px`
      const world = Matter.Engine.create({
        enableSleeping: true,
        positionIterations: 10,
        velocityIterations: 8,
      })
      world.gravity.y = clamp(s.gravity, -3, 4) * 1.4
      walls = [
        Matter.Bodies.rectangle(0, 0, 10000, WALL, { isStatic: true, friction: 0.8 }),
        Matter.Bodies.rectangle(0, 0, WALL, 10000, { isStatic: true, friction: 0.3 }),
        Matter.Bodies.rectangle(0, 0, WALL, 10000, { isStatic: true, friction: 0.3 }),
        Matter.Bodies.rectangle(0, 0, 10000, WALL, { isStatic: true, friction: 0.3 }),
      ]
      const count = rects.length
      const center = rects.reduce((sum, rect) => sum + rect.x + rect.w / 2, 0) / count
      const span = Math.max(1, ...rects.map((rect) => Math.abs(rect.x + rect.w / 2 - center)))
      const shuffled = rects.map((_, index) => index).sort(() => Math.random() - 0.5)
      pieces = elements.map((element, index) => {
        const rect = rects[index]
        const radius = Math.max(
          0,
          Math.min(variant === 'tiles' ? rect.h * 0.28 : 4, rect.w / 2 - 1, rect.h / 2 - 1),
        )
        const body = Matter.Bodies.rectangle(
          rect.x + rect.w / 2,
          rect.y + rect.h / 2,
          Math.max(2, rect.w - 1),
          Math.max(2, rect.h - 1),
          {
            chamfer: radius > 0.5 ? { radius } : undefined,
            restitution: clamp(s.bounciness, 0, 1),
            friction: 0.4,
            frictionStatic: 0.8,
            frictionAir: 0.012,
            density: 0.0015,
            slop: 0.02,
          },
        )
        Matter.Body.setStatic(body, true)
        const rank =
          s.order === 'random'
            ? shuffled.indexOf(index)
            : s.order === 'center'
              ? (Math.abs(rect.x + rect.w / 2 - center) / span) * (count - 1)
              : index
        element.style.position = 'absolute'
        element.style.left = '0'
        element.style.top = '0'
        // 不再把宽高钉死成量到的值：碎片本身是 nowrap 的 inline-block，
        // 设成用原来的 rect 宽高会让文字在盒子里重新排一次（半像素取整后
        // 字会挪 1～2px）。宽高交给 shrink-to-fit，文字渲染跟静止时一模一样，
        // 物理体的尺寸仍然用 rect.w / rect.h。
        element.style.width = ''
        element.style.height = ''
        element.style.margin = '0'
        element.style.transform = `translate3d(${rect.x}px, ${rect.y}px, 0)`
        return {
          element,
          body,
          w: rect.w,
          h: rect.h,
          x0: rect.x,
          y0: rect.y,
          px: body.position.x,
          py: body.position.y,
          pa: 0,
          dx: body.position.x,
          dy: body.position.y,
          da: 0,
          // 至少留 60ms 的静止期：点下去之后前几帧画面完全不动，
          // 视觉上是「从原位开始落」，不会一上来就窜一下。
          at: Math.max(0.06, s.order === 'together' ? 0 : rank * Math.max(0, s.stagger)),
          released: false,
        }
      })
      // 自校正：碎片在静止态是行内的 inline-block（默认按基线对齐），转成
      // absolute 之后渲染基准就换了，加上半像素取整，实测总能差出 1～2px ——
      // 那 1～2px 就是「没点之前」和「点下去第一帧」之间的那一下错位。
      // 所以在样式都落上之后再统一量一次真实位置，把差值补回去，
      // 让第一帧与静止帧严丝合缝，物理体和复位终点也用校正后的坐标。
      const drift = pieces.map((piece) => {
        const r = piece.element.getBoundingClientRect()
        return { x: piece.x0 - (r.left - originX), y: piece.y0 - (r.top - originY) }
      })
      if (drift.some((d) => Math.abs(d.x) > 0.01 || Math.abs(d.y) > 0.01)) {
        pieces.forEach((piece, index) => {
          const d = drift[index]
          piece.x0 += d.x
          piece.y0 += d.y
          Matter.Body.setPosition(piece.body, {
            x: piece.body.position.x + d.x,
            y: piece.body.position.y + d.y,
          })
          piece.px = piece.body.position.x
          piece.py = piece.body.position.y
          piece.dx = piece.body.position.x
          piece.dy = piece.body.position.y
          piece.element.style.transform = `translate3d(${piece.x0}px, ${piece.y0}px, 0)`
        })
      }
      Matter.Composite.add(world.world, [...walls, ...pieces.map((piece) => piece.body)])
      const byBody = new Map(pieces.map((piece) => [piece.body, piece]))
      Matter.Events.on(world, 'collisionStart', (event) => {
        const down = Math.sign(world.gravity.y) || 1
        for (const pair of event.pairs) {
          const a = byBody.get(pair.bodyA)
          const b = byBody.get(pair.bodyB)
          if (!a || !b || a.released === b.released) continue
          const [moving, still] = a.released ? [a, b] : [b, a]
          if ((still.body.position.y - moving.body.position.y) * down > still.h * 0.25)
            still.knocked = true
        }
      })
      engine = world
      placeWalls()
      phase = 'falling'
      container.dataset.phase = 'falling'
      clock = 0
      accumulator = 0
      quietSince = null
      fallAt = performance.now()
      lastTouch = fallAt
      lastBounciness = clamp(s.bounciness, 0, 1)
      wake()
    }

    const restore = () => {
      if (phase !== 'falling') return
      phase = 'restoring'
      container.dataset.phase = 'restoring'
      if (drag && engine) {
        Matter.Composite.remove(engine.world, drag.constraint)
        drag = null
      }
      cancelAnimationFrame(raf)
      raf = 0
      const easing = settleEase()
      const sorted = [...pieces].sort((a, b) => a.body.position.y - b.body.position.y)
      const animations = sorted.map((piece, index) => {
        const angle = Math.atan2(Math.sin(piece.body.angle), Math.cos(piece.body.angle))
        const from = `translate3d(${(piece.body.position.x - piece.w / 2).toFixed(2)}px, ${(piece.body.position.y - piece.h / 2).toFixed(2)}px, 0) rotate(${angle.toFixed(4)}rad)`
        const to = `translate3d(${piece.x0}px, ${piece.y0}px, 0) rotate(0rad)`
        piece.element.style.transform = to
        return piece.element.animate([{ transform: from }, { transform: to }], {
          duration: 760,
          delay: Math.min(index * 14, 360),
          easing,
          fill: 'backwards',
        })
      })
      Promise.all(animations.map((animation) => animation.finished.catch(() => null))).then(() => {
        if (phase !== 'restoring') return
        // 等这一帧真正上屏再拆定位样式：动画移除与 transform→文档流 的切换若压在同一帧，
        // 浏览器可能还按旧图层出半帧，看起来就是归位那一瞬间文字横跳 1～2px。
        requestAnimationFrame(() => {
          if (phase !== 'restoring') return
          reset()
        })
      })
    }

    const reset = (rearm = true) => {
      cancelAnimationFrame(raf)
      raf = 0
      if (engine) {
        Matter.Composite.clear(engine.world, false)
        Matter.Engine.clear(engine)
      }
      engine = null
      for (const piece of pieces) {
        piece.element.getAnimations().forEach((animation) => animation.cancel())
        piece.element.style.position = ''
        piece.element.style.left = ''
        piece.element.style.top = ''
        piece.element.style.width = ''
        piece.element.style.height = ''
        piece.element.style.margin = ''
        piece.element.style.transform = ''
      }
      pieces = []
      walls = []
      drag = null
      lastTouch = 0
      block.style.minHeight = ''
      phase = 'idle'
      delete container.dataset.phase
      delete container.dataset.dragging
      if (rearm) armed = true
    }

    const onEnter = () => {
      inside = true
      lastTouch = performance.now()
      if (settingsRef.current.trigger === 'hover') fall()
    }
    const onLeave = () => {
      inside = false
      // 离开只是「不再触发」的起点：倒计时交给 frame 里的 restoreDelay（2.5 秒），
      // 中途回来接着玩会重新计时，碎片就一直摊在那儿。
      lastTouch = performance.now()
    }
    const onClick = () => {
      const s = settingsRef.current
      if (s.trigger !== 'click') return
      // 每次都从「当前静止位置」重新开始：上一轮还没落定（或正在飞回）时再点一下，
      // 先立刻归位再重落，动画的首帧与尾帧永远对齐这七个词的初始位置。
      if (phase !== 'idle') reset()
      fall()
    }

    const onDown = (event) => {
      const s = settingsRef.current
      if (
        !engine ||
        phase !== 'falling' ||
        !s.draggable ||
        (event.pointerType === 'mouse' && event.button !== 0)
      )
        return
      const point = local(event)
      const bodies = pieces.filter((piece) => piece.released).map((piece) => piece.body)
      const hit = Matter.Query.point(bodies, point)[0]
      if (!hit) return
      event.preventDefault()
      container.setPointerCapture?.(event.pointerId)
      Matter.Sleeping.set(hit, false)
      const constraint = Matter.Constraint.create({
        pointA: point,
        bodyB: hit,
        pointB: { x: point.x - hit.position.x, y: point.y - hit.position.y },
        stiffness: clamp(s.mouseConstraintStiffness, 0.01, 1),
        damping: 0.08,
        length: 0,
      })
      Matter.Composite.add(engine.world, constraint)
      drag = { constraint, id: event.pointerId }
      container.dataset.dragging = ''
      wake()
    }

    const onMove = (event) => {
      const point = local(event)
      const now = performance.now()
      const dt = Math.max(1, now - pointer.time)
      if (pointer.time && dt < 120) {
        const blend = Math.min(1, dt / 40)
        pointer.vx += ((point.x - pointer.x) / dt - pointer.vx) * blend
        pointer.vy += ((point.y - pointer.y) / dt - pointer.vy) * blend
      } else {
        pointer.vx = 0
        pointer.vy = 0
      }
      pointer.x = point.x
      pointer.y = point.y
      pointer.time = now
      inside = true
      // 手还在上面动，就把复位倒计时往后推
      lastTouch = performance.now()
      if (phase === 'idle' && settingsRef.current.trigger === 'hover') fall()
      if (phase !== 'falling') return
      if (drag && event.pointerId === drag.id) {
        drag.constraint.pointA = point
        return
      }
      const s = settingsRef.current
      const push = clamp(s.cursorPush, 0, 2)
      const speed = Math.hypot(pointer.vx, pointer.vy)
      if (!push || speed < 0.35) return
      let touched = false
      for (const piece of pieces) {
        if (!piece.released) continue
        const { body } = piece
        const reach = Math.max(piece.w, piece.h) / 2 + 18
        const distance = Math.hypot(body.position.x - point.x, body.position.y - point.y)
        if (distance > reach) continue
        if (now - (piece.pushed || 0) < 60) continue
        piece.pushed = now
        const falloff = 1 - (distance / reach) ** 2
        const kick = Math.min(20, speed * push * falloff * 16)
        Matter.Sleeping.set(body, false)
        Matter.Body.setVelocity(body, {
          x: body.velocity.x + (pointer.vx / speed) * kick,
          y: body.velocity.y + (pointer.vy / speed) * kick - kick * 0.7,
        })
        Matter.Body.setAngularVelocity(
          body,
          body.angularVelocity + (Math.random() - 0.5) * 0.06 * push,
        )
        touched = true
      }
      if (touched) wake()
    }

    const onUp = (event) => {
      if (!drag || event.pointerId !== drag.id) return
      if (engine) Matter.Composite.remove(engine.world, drag.constraint)
      drag = null
      delete container.dataset.dragging
    }

    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            (entries) => {
              const entry = entries[entries.length - 1]
              visible = entry.isIntersecting
              if (visible) wake()
              if (settingsRef.current.trigger !== 'scroll') return
              if (entry.intersectionRatio >= 0.3) {
                if (armed) {
                  armed = false
                  fall()
                }
              } else if (phase === 'idle') armed = true
            },
            { threshold: [0, 0.3] },
          )
    observer?.observe(container)

    const resizeObserver = new ResizeObserver(() => {
      if (phase === 'falling') {
        placeWalls()
        wake()
      }
    })
    resizeObserver.observe(container)

    container.addEventListener('pointerenter', onEnter)
    container.addEventListener('pointerleave', onLeave)
    container.addEventListener('click', onClick)
    container.addEventListener('pointerdown', onDown)
    container.addEventListener('pointermove', onMove)
    container.addEventListener('pointerup', onUp)
    container.addEventListener('pointercancel', onUp)

    let cancelled = false
    if (trigger === 'auto') {
      const ready = document.fonts?.ready ?? Promise.resolve()
      ready.then(() => {
        if (!cancelled) requestAnimationFrame(() => !cancelled && fall())
      })
    }

    return () => {
      cancelled = true
      observer?.disconnect()
      resizeObserver.disconnect()
      container.removeEventListener('pointerenter', onEnter)
      container.removeEventListener('pointerleave', onLeave)
      container.removeEventListener('click', onClick)
      container.removeEventListener('pointerdown', onDown)
      container.removeEventListener('pointermove', onMove)
      container.removeEventListener('pointerup', onUp)
      container.removeEventListener('pointercancel', onUp)
      phase = 'idle'
      reset(false)
    }
  }, [groups, split, variant, fontSize, trigger, separator])

  const pieceClass = `falling-text__piece${variant === 'tiles' ? ' falling-text__piece--tile' : ''}`

  return (
    <div
      ref={containerRef}
      className={`falling-text${wireframes ? ' falling-text--wireframes' : ''} ${className}`.trim()}
      data-trigger={trigger}
      data-draggable={draggable ? '' : undefined}
      style={{
        ...(THEMES[theme] ?? THEMES.dark),
        '--falling-text-accent': accentColor,
        '--falling-text-accent-ink': readableOn(accentColor),
        background: backgroundColor,
        fontSize,
        ...style,
      }}
    >
      <div ref={textRef} className="falling-text__text">
        {groups.map((group, index) => (
          <Fragment key={index}>
            {index > 0 && ' '}
            {split === 'letters' ? (
              <span className="falling-text__group">
                {[...group.word].map((letter, position) => (
                  <span
                    key={position}
                    className={`${pieceClass}${group.highlighted ? ` ${highlightClass}` : ''}`}
                    data-piece=""
                    data-highlight={group.highlighted ? '' : undefined}
                  >
                    {letter}
                  </span>
                ))}
              </span>
            ) : (
              <span
                className={`${pieceClass}${group.highlighted ? ` ${highlightClass}` : ''}`}
                data-piece=""
                data-highlight={group.highlighted ? '' : undefined}
              >
                {group.word}
              </span>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
