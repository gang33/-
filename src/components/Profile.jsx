import { useEffect, useRef, useState } from 'react'
import { profile, site } from '../data.js'
import DecryptedText from './DecryptedText.jsx'
import { readPeekConfig, subscribePeekConfig } from '../peek-config.js'

/**
 * 个人经历 —— 严格照作品集 PDF 那一页的排版：
 * 顶部英文块 / ● 关于我 + 来自 / 红色连笔 About Me / 右上人像 + 米色标签 /
 * 三列信息表（姓名·邮箱·生日 / 专业·电话）/ 超大 EXPERIENCE / 三段式经历列表。
 * 交互：正文 hover 时那张图贴着指针走、压在文字下面；图是哪一张看滚到哪 —
 * 「关于我」是人像，滚到「工作经验」自动换成跳跃人物。
 * 两张图的宽度由编辑模式「图片 → 跟手图尺寸」调控（存 lzy-peek-v1）。
 */

export default function Profile() {
  const peekRef = useRef(null)
  const rowsRef = useRef(null)
  // 跟手图画的是谁：me（人像）/ work（跳跃人物）
  const [peekMode, setPeekMode] = useState('me')
  // 两张图各自的宽度，面板里调
  const [peekSize, setPeekSize] = useState(readPeekConfig)
  // 动效字重新进视口时让它重播解密
  const [replay, setReplay] = useState(0)
  const seenRef = useRef(new WeakSet())
  const rows = profile.experience

  // ?grid=1 打开参考线，方便和 PDF 对位
  const showGrid =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('grid')

  // 文字动效：About Me / EXPERIENCE 进入视口后逐字渐现
  useEffect(() => {
    const targets = Array.from(
      document.querySelectorAll('.pf__script, .pf__big')
    )
    if (!targets.length) return

    // 只拆 EXPERIENCE：无衬线拆字不会坏形。
    // About Me 是手写连笔，拆开字与字就断了，改成整体从左往右擦出来。
    targets.filter((el) => el.classList.contains('pf__big')).forEach((el) => {
      const src = el.querySelector('.pf__type') || el
      const text = src.textContent
      if (!text || src.dataset.split === '1') return
      src.dataset.split = '1'
      src.textContent = ''
      Array.from(text).forEach((ch, i) => {
        const s = document.createElement('span')
        s.className = 'pf__ch'
        s.style.setProperty('--i', i)
        s.textContent = ch === ' ' ? '\u00a0' : ch
        src.appendChild(s)
      })
    })

    if (typeof IntersectionObserver === 'undefined') {
      targets.forEach((t) => t.classList.add('is-in'))
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-in')
          io.unobserve(entry.target)
        })
      },
      { rootMargin: '0px 0px -14% 0px', threshold: 0.18 }
    )
    targets.forEach((t) => io.observe(t))
    return () => io.disconnect()
  }, [])

  // 滚动触发：动效字滚出视口再滚回来时重新解密一次（首次进入由组件自己的 IntersectionObserver 负责）
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('[data-replay]'))
    if (!els.length || typeof IntersectionObserver === 'undefined') return
    const seen = seenRef.current
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          // 第一次进入由组件自己播；之后每次重新滚回视口都重播
          if (seen.has(entry.target)) setReplay((v) => v + 1)
          else seen.add(entry.target)
        })
      },
      { threshold: 0.55 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  // 跟手预览：鼠标在正文里移动时，图贴着指针走、压在文字下面。
  // 图是哪一张由滚动位置决定（见下面那个 observer）。
  useEffect(() => {
    const peek = peekRef.current
    if (!peek) return
    const sheet = document.querySelector('.pf__sheet')
    if (!sheet) return

    let tx = 0
    // tyRaw 是「鼠标希望图停在哪儿」，ty 是压过跑马灯上界之后的实际目标。
    // 分开存是为了滚动时能松绑：条子往上滚，floor 变小，图跟着回去，而不是卡在原地。
    let tyRaw = 0
    let ty = 0
    let cx = 0
    let cy = 0
    let raf = 0
    // 最后一次鼠标位置：滚动不会触发 mouseleave，只能靠它每帧回查指针还在不在这一节里
    let lastX = 0
    let lastY = 0
    // 图此刻贴在指针右边还是左边（带滞回，见 onMove）
    let flipped = false
    // 指针是否已经进来过：第一次要直接落位，不能插值
    let hasMoved = false
    // 缓存的布局信息：每帧读 getBoundingClientRect / offsetHeight 都会强制布局，
    // 滚动 + 跟手同时发生时是最容易掉帧的地方。改成「只有滚动、尺寸变化才量一次」。
    let peekW = 180
    let peekH = 240
    let marqueeBottom = 0

    const marqueeEl = document.querySelector('.marquee')

    const measure = () => {
      if (marqueeEl) marqueeBottom = marqueeEl.getBoundingClientRect().bottom
      peekW = peek.offsetWidth || 180
      peekH = peek.offsetHeight || 240
    }
    // 滚动时只有跑马灯的位置在变；图尺寸很少动，
    // 单独留一个只读一次的版本，省掉强制布局。
    const measureMarquee = () => {
      if (marqueeEl) marqueeBottom = marqueeEl.getBoundingClientRect().bottom
    }
    measure()

    // 滚动时条子的位置在变，得重新量；用 rAF 合并，一帧最多量一次。
    // 顺便做一次可见性同步：快速滚动时没有 mouseenter 也要把图亮出来。
    let scrollRaf = 0
    const onScroll = () => {
      if (scrollRaf) return
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0
        measureMarquee()
        syncVisible()
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    // 跟手图尺寸被面板改过之后，元素尺寸会变，也要重新量
    const ro =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => measure())
    if (ro) ro.observe(peek)

    // 跑马灯条下沿 + 10px 是图顶的硬上限（换算成图的中心 y，要加半个图高）。
    const minCenter = () => {
      const half = peekH / 2
      return Math.max(12 + half, marqueeBottom + 10 + half)
    }

    let frame = 0

    const tick = () => {
      // 滚动到别的区块时，浏览器不会补发 mouseleave，图会一直跟着指针飘到下面的浅色区。
      // 定期回查一次指针归属，不在这一节就收掉。降到每 8 帧：
      // elementFromPoint 要算样式，帧帧查会把跟手感拖垮。
      frame += 1
      if (frame % 8 === 0 && (lastX || lastY)) {
        const under = document.elementFromPoint(lastX, lastY)
        if (!under || !sheet.contains(under)) {
          hide()
          return
        }
      }
      // 数值靠近目标。系数别调太小：
      // 0.18 时到 95% 要 ~15 帧（250ms），指针早就停了图还在追，手感就是「不跟手」。
      // 0.5 大约 4 帧（65ms）收敛，既保留一点点顺滑，又基本贴着指针。
      cx += (tx - cx) * 0.5
      // 目标值由 tyRaw 重新压一遍，条子滚上去图就能跟着回去
      const floor = minCenter()
      ty = Math.max(tyRaw, floor)
      cy += (ty - cy) * 0.5
      // 插值是从上一帧位置过来的，中间也不许穿过条子
      if (cy < floor) cy = floor
      // 直接写 translate：走两个 CSS 变量的话每帧都会让自定义属性失效重算一次样式
      peek.style.translate = `${(cx - peekW / 2).toFixed(1)}px ${(cy - peekH / 2).toFixed(1)}px`
      raf = requestAnimationFrame(tick)
    }

    const hide = () => {
      peek.classList.remove('is-on')
      sheet.classList.remove('is-peeking')
      // 下次进来重新落位，别从上次离开的地方慢慢滑过来（那一下很像掉帧）
      hasMoved = false
      if (raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    }

    const onMove = (e) => {
      lastX = e.clientX
      lastY = e.clientY
      // 编辑模式开着的时候不跟手：那张图会挡住面板、也会和「点选文字」抢鼠标
      if (document.querySelector('.editor-panel')) {
        hide()
        return
      }
      // 分界线 = 跑马灯条下沿：条子还在视口里时，指针在条子上面就先把图收掉
      if (marqueeBottom > 0 && e.clientY < marqueeBottom) {
        hide()
        return
      }
      // class 已经在了就别再写，省掉一次属性失效
      if (!peek.classList.contains('is-on')) {
        peek.classList.add('is-on')
        sheet.classList.add('is-peeking')
      }
      const w = peekW
      const h = peekH
      // 默认贴在指针右下方；右边放不下就翻到指针左侧。
      // 带一点滞回：贴边时指针抖一下不会左右反复翻。
      const wasFlipped = flipped
      if (!flipped) {
        if (e.clientX + w + 40 > window.innerWidth) flipped = true
      } else if (e.clientX + w + 90 < window.innerWidth) {
        flipped = false
      }
      tx = flipped ? e.clientX - w - 22 : e.clientX + 22
      // 换边是一千多像素的位移，靠插值「飞过去」一定会被看成卡了一下；
      // 直接瞬移到位，同时让图淡一下，读起来就是「换到另一边出现了」。
      if (wasFlipped !== flipped) {
        cx = tx
        peek.classList.add('is-flipping')
        window.setTimeout(() => peek.classList.remove('is-flipping'), 140)
      }
      // 第一次进入时 cx 还是 0，直接落到位，别从屏幕左边滑过来
      if (!hasMoved) {
        hasMoved = true
        cx = tx
      }
      // 注意 y 是图「中心」的 y，所以下限要加半个图高。
      // 跑马灯条还在视口里时，图顶不能碰到它：上界 = 条底 + 10 + 半径。
      const half = h / 2
      const maxCenterY = Math.max(12 + half, window.innerHeight - half - 12)
      // 只记「鼠标希望停在哪儿」；跑马灯的上界交给 tick 每帧压一遍
      tyRaw = Math.min(e.clientY - h * 0.3, maxCenterY)
      // hide() 会停掉动画帧，这里必须把它重新点着，
      // 否则滚动出去又回来时，图虽然亮了却停在旧位置、看着就是「不跟手」。
      if (!raf) raf = requestAnimationFrame(tick)
    }

    // 全局记一下指针位置：滚动进这一节时浏览器只补一个 mouseenter、不补 mousemove，
    // 没有这个值就只能从 (0,0) 起算，图会先跑到屏幕左边再飞回来。
    const onPointerTrack = (e) => {
      lastX = e.clientX
      lastY = e.clientY
    }
    window.addEventListener('mousemove', onPointerTrack, { passive: true })

    // 按当前指针位置把图直接摆到位（不做入场插值）。
    // onEnter（鼠标移进来）和 syncVisible（滚进来）共用这一份。
    const placeAtPointer = () => {
      const w = peekW
      const h = peekH
      if (!flipped) {
        if (lastX + w + 40 > window.innerWidth) flipped = true
      } else if (lastX + w + 90 < window.innerWidth) {
        flipped = false
      }
      tx = flipped ? lastX - w - 22 : lastX + 22
      const half = h / 2
      const maxCenterY = Math.max(12 + half, window.innerHeight - half - 12)
      tyRaw = Math.min(lastY - h * 0.3, maxCenterY)
      const floor = minCenter()
      ty = Math.max(tyRaw, floor)
      cx = tx
      cy = ty
      hasMoved = true
      peek.style.translate = `${(cx - w / 2).toFixed(1)}px ${(cy - h / 2).toFixed(1)}px`
      peek.classList.add('is-on')
      sheet.classList.add('is-peeking')
      if (!raf) raf = requestAnimationFrame(tick)
    }

    // 滚动进来时也要能立刻出图。只靠 mouseenter 不够：
    // 快速滚动时指针可能一直停在视口上方/固定头部，等不到 enter，整节就滑过去了。
    // 这里每帧用指针坐标和 sheet 的矩形做一次数学判断，比 elementFromPoint 便宜。
    const syncVisible = () => {
      if (document.querySelector('.editor-panel')) {
        hide()
        return
      }
      if (!lastX && !lastY) {
        hide()
        return
      }
      const r = sheet.getBoundingClientRect()
      const inside =
        lastX >= r.left && lastX <= r.right && lastY >= r.top && lastY <= r.bottom
      if (!inside) {
        hide()
        return
      }
      // 分界线 = 跑马灯条下沿。条子上面那块（首屏）不出图，
      // 一旦指针进入条子以下、也就是这一节的范围，就立刻出图。
      if (marqueeBottom > 0 && lastY < marqueeBottom) {
        hide()
        return
      }
      if (!peek.classList.contains('is-on')) placeAtPointer()
    }

    const onEnter = () => {
      if (document.querySelector('.editor-panel')) return
      measure()
      // 连指针都没见过（刚开页面就滚动），先不露脸，等真正的 mousemove
      if (!lastX && !lastY) return
      placeAtPointer()
    }

    sheet.addEventListener('mouseenter', onEnter)
    sheet.addEventListener('mouseleave', hide)
    sheet.addEventListener('mousemove', onMove)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      if (scrollRaf) cancelAnimationFrame(scrollRaf)
      if (ro) ro.disconnect()
      window.removeEventListener('mousemove', onPointerTrack)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      sheet.removeEventListener('mouseenter', onEnter)
      sheet.removeEventListener('mouseleave', hide)
      sheet.removeEventListener('mousemove', onMove)
    }
  }, [])

  // 滚到「工作经验」那几行就换图，滚回上面再换回人像。
  // 用视口中段判定（上下各留 25%），一进画面中央就切，不用等完全进入。
  useEffect(() => {
    const el = rowsRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setPeekMode(entry.isIntersecting ? 'work' : 'me'),
      { rootMargin: '-25% 0px -25% 0px', threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // 跟手图尺寸跟着编辑面板走（面板改完立刻生效，不用刷新）
  useEffect(() => subscribePeekConfig(setPeekSize), [])

  // 两张跟手图提前解码：不然滚到「工作经验」那一下要现场解码 + 换尺寸，
  // 会卡掉一帧（实测 60~75ms 的长任务就出在这个切换上）。
  useEffect(() => {
    const imgs = peekRef.current?.querySelectorAll('img') ?? []
    imgs.forEach((img) => {
      if (typeof img.decode === 'function') img.decode().catch(() => {})
    })
  }, [])

  return (
    <section className="profile" id="profile">
      {/* PDF 里这一段没有「个人经历」大标题，直接从 ● 关于我 开始 */}
      <div className={`shell pf__sheet${showGrid ? ' is-grid' : ''}`}>
        <div className="pf__head" data-replay>
          <span className="pf__dot mono">
            <i />
            <DecryptedText
              text="关于我"
              animateOn="view"
              effect="scramble"
              sequential
              revealDirection="start"
              speed={70}
              maxIterations={10}
              useOriginalCharsOnly
              replayKey={replay}
              className="dt-on"
              encryptedClassName="dt-off"
            />
          </span>
          <span className="pf__from mono">
            <DecryptedText
              text={`来自 ${profile.hometown}`}
              animateOn="view"
              effect="scramble"
              sequential
              revealDirection="start"
              speed={70}
              maxIterations={10}
              useOriginalCharsOnly
              replayKey={replay}
              className="dt-on"
              encryptedClassName="dt-off"
            />
          </span>
        </div>

        <hr className="pf__rule" />

        <div className="pf__stage">
          <p className="pf__script" aria-label="About Me" data-move data-replay>
            {/* 手写连笔不能像 EXPERIENCE 那样换字符（笔锋会断）：
                用 fade + 只用原句里的字母打乱，看起来像笔迹在游走，最后定格。 */}
            <DecryptedText
              text="About Me"
              animateOn="view"
              effect="fade"
              sequential
              revealDirection="start"
              speed={95}
              maxIterations={12}
              useOriginalCharsOnly
              replayKey={replay}
              className="dt-on"
              encryptedClassName="dt-off"
            />
          </p>

          {/* 信息表按行分组：每行撑满内容区，行间的线才能和别处一样宽 */}
          <dl className="pf__meta">
            {[0, 1].map((line) => (
              <div className={`pf__metaLine${line ? ' is-second' : ''}`} key={line}>
                {profile.meta.slice(line * 3, line * 3 + 3).map((item, i) => (
                  <div className="pf__metaCell" key={`${item.label}-${i}`}>
                    <dt>{item.label}</dt>
                    <dd>
                      {item.href ? <a href={item.href}>{item.value}</a> : item.value}
                    </dd>
                  </div>
                ))}
              </div>
            ))}
          </dl>
        </div>

        {/* EXPERIENCE：滚动进视野时逐字「解密」出来（React Bits 的 DecryptedText） */}
        <div className="pf__bigWrap" data-move data-replay>
          <DecryptedText
            text="EXPERIENCE"
            animateOn="view"
            effect="scramble"
            sequential
            revealDirection="start"
            speed={78}
            maxIterations={14}
            useOriginalCharsOnly={false}
            replayKey={replay}
            className="dt-on"
            encryptedClassName="dt-off"
            characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ!<>-_\\/[]{}=+*^?#"
          />
        </div>

        <div className="pf__rows" ref={rowsRef}>
          <div className="pf__rowsLabel mono">
            <i />
            工作经验
          </div>

          {rows.map((item, i) => (
            <article className="pf__row" key={`${item.org}-${i}`} data-reveal data-preview>
              <h4 className="pf__rowOrg">{item.org}</h4>
              <span className="pf__rowPeriod mono">{item.period}</span>
              <span className="pf__rowRole">{item.role}</span>
              <p className="pf__rowNote">{item.note}</p>
            </article>
          ))}
        </div>

        {/* 跟手预览：贴着指针走、压在文字下面。
            两张图比例不同，尺寸按 data-mode 分开给；宽度值来自「图片」面板。
            按滚动位置交叉淡入：关于我 → 人像；滚到工作经验 → 跳跃人物。 */}
        <div
          className="pf__peek"
          ref={peekRef}
          data-mode={peekMode}
          style={{
            '--peek-mew': `${peekSize.meW}px`,
            '--peek-workw': `${peekSize.workW}px`,
          }}
          aria-hidden="true"
        >
          <img
            className="pf__peekImg pf__peekImg--me"
            src="/media/portrait-full.webp"
            alt=""
          />
          <img
            className="pf__peekImg pf__peekImg--work"
            src="/media/jump-cut.webp"
            alt=""
          />
        </div>
      </div>
    </section>
  )
}
