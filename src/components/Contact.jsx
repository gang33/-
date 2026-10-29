import { useEffect, useRef } from 'react'
import { site } from '../data.js'
import DecryptedText from './DecryptedText.jsx'

/**
 * 尾页，严格照 `_素材/个人经历/尾页.pdf` 的版式复原。
 * PDF 页尺寸 1519.54 × 1033.05，下面的百分比全部由它的坐标反推：
 * 左边界 114.7/1519.54 = 7.55%、内容左 126.9 = 8.35%、
 * 信息区左边 785.9 = 51.72%、右边 1458.9 = 96.0%。
 *
 * 顶部那四条黑带是「百叶窗」：鼠标在尾页里上下滑动时，
 * 靠近光标的线会变粗、远的收细，像叶片被拨开。
 */
// 顶部白区里的五条黑带（白底上的横向黑条）。
// 滚轮推进时，最近的那条会明显变粗、其余收细 —— 百叶窗效果。
// 高度按 1.5 / 2.2 / 3.0 / 2.4 / 1.5 渐变，中间最厚，两头收口。
const BANDS = [
  { top: 1.9, height: 1.5 },
  { top: 6.0, height: 2.2 },
  { top: 10.3, height: 3.0 },
  { top: 14.8, height: 2.4 },
  { top: 18.6, height: 1.5 },
]

export default function Contact() {
  const city = site.base.split(/[·・]/)[0].trim()
  const sheetRef = useRef(null)
  const bandRefs = useRef([])
  const orbRef = useRef(null)
  const titleRef = useRef(null)

  // 实心圆跟随鼠标 + 大字绕着它躲开（只在这一块里生效）
  useEffect(() => {
    const sheet = sheetRef.current
    const orb = orbRef.current
    const title = titleRef.current
    if (!sheet || !orb || !title) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return

    let raf = 0
    let mx = null
    let my = null
    let hovering = false

    // 编辑模式写 inline `translate`；跟手动画写 `transform`。
    // 两个属性会叠加，所以这里把编辑器的值「吸收」进 manual 并把 inline 清空，
    // 否则圆会一直比光标多出一段位移（右边偏太多就是这个原因）。
    const manual = { x: 0, y: 0 }
    const syncManual = () => {
      const raw = orb.style.translate || ''
      const hit = raw.match(/(-?[\d.]+)px\s+(-?[\d.]+)px/)
      if (!hit) return
      // 夹一个范围：万一编辑器存进来一个离谱的值，圆会被推到画布外，
      // 表现出来就是「圆不见了」。宁可位置不准，也不能让它跑到看不见的地方。
      const clamp = (v) => Math.max(-400, Math.min(400, v))
      manual.x = clamp(parseFloat(hit[1]) || 0)
      manual.y = clamp(parseFloat(hit[2]) || 0)
      orb.style.translate = ''
    }

    // cx / cy 都是圆心：先 translate3d 挪到圆心，再 translate(-50%,-50%) 让圆以自身中心对齐
    const place = (cx, cy) => {
      orb.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0) translate(-50%, -50%)`
    }

    // 家：圆心 = 第一行文字右缘 + 半径，纵向 = 行中线
    const home = () => {
      const R = orb.offsetWidth || 100
      const sr = sheet.getBoundingClientRect()
      const line = title.querySelector('.ct__line')
      const lr = line ? line.getBoundingClientRect() : null
      const x = lr ? lr.right - sr.left + R / 2 : sheet.clientWidth * 0.48
      const y = lr ? lr.top - sr.top + lr.height / 2 : sheet.clientHeight * 0.451
      return [x, y]
    }
    let ox = home()[0]
    let oy = home()[1]
    // 归位用的弹簧状态（速度 + 上一帧时间）
    let vx = 0
    let vy = 0
    let lastT = performance.now()

    const frame = () => {
      const R = orb.offsetWidth || 100
      // 每帧捡一次编辑器写下的位移（很便宜），保证拖完立刻生效
      syncManual()

      const now = performance.now()
      const dt = Math.min((now - lastT) / 1000, 0.05)
      lastT = now

      if (!hovering || mx == null) {
        // 松手：用弹簧-阻尼弹回原位，不是瞬移。
        // K 决定回弹快慢，ζ=0.42 是欠阻尼 —— 会冲过头一点再荡回来。
        const [hx, hy] = home()
        const tx = hx + manual.x
        const ty = hy + manual.y
        const K = 170
        const D = 2 * Math.sqrt(K) * 0.42
        vx += (tx - ox) * K * dt - vx * D * dt
        vy += (ty - oy) * K * dt - vy * D * dt
        ox += vx * dt
        oy += vy * dt
        // 收敛够了就钉死，避免无限微抖
        if (Math.abs(tx - ox) < 0.35 && Math.abs(vx) < 4) {
          ox = tx
          vx = 0
        }
        if (Math.abs(ty - oy) < 0.35 && Math.abs(vy) < 4) {
          oy = ty
          vy = 0
        }
        place(ox, oy)
        title.querySelectorAll('.dt-on, .dt-off').forEach((el) => {
          if (el.style.translate) el.style.translate = ''
        })
        raf = requestAnimationFrame(frame)
        return
      }

      // 抓住之后：圆心做一点滞后，跟手但不硬
      vx = 0
      vy = 0
      ox += (mx - ox) * 0.22
      oy += (my - oy) * 0.22
      place(ox, oy)

      // 每个字按「离圆越近推得越远」错开
      title.querySelectorAll('.dt-on, .dt-off').forEach((el) => {
        const r = el.getBoundingClientRect()
        const sr = sheet.getBoundingClientRect()
        const cx = r.left - sr.left + r.width / 2
        const cy = r.top - sr.top + r.height / 2
        const dx = cx - ox
        const dy = cy - oy
        const dist = Math.hypot(dx, dy) || 1
        const reach = R * 2.1
        if (dist < reach) {
          // 用「还差多少才出圈」当位移量，而不是按比例衰减 —— 比例写法
          // 在字心几乎贴着圆心时只推开一点点，仍会被圆压住。
          const push = (reach - dist) * 0.82
          el.style.translate = `${((dx / dist) * push).toFixed(1)}px ${((dy / dist) * push).toFixed(1)}px`
        } else if (el.style.translate) {
          el.style.translate = ''
        }
      })
      raf = requestAnimationFrame(frame)
    }

    // 只有鼠标真正碰到圆本身才启动（碰到整块就开始 = 吸附感）
    const grab = (e) => {
      if (document.querySelector('.editor-panel')) return
      hovering = true
      sheet.classList.add('is-orbing')
      const r = sheet.getBoundingClientRect()
      mx = e.clientX - r.left
      my = e.clientY - r.top
    }

    // 启动之后才跟手：鼠标在块内移动时持续更新目标点
    const onMove = (e) => {
      if (!hovering) return
      if (document.querySelector('.editor-panel')) return
      const r = sheet.getBoundingClientRect()
      mx = e.clientX - r.left
      my = e.clientY - r.top
    }

    // 往上滚离开这一块、或者鼠标移出去，都算「离开」
    const onLeave = () => {
      hovering = false
      mx = null
      sheet.classList.remove('is-orbing')
    }

    orb.addEventListener('mouseenter', grab)
    sheet.addEventListener('mousemove', onMove)
    sheet.addEventListener('mouseleave', onLeave)
    raf = requestAnimationFrame(frame)
    return () => {
      orb.removeEventListener('mouseenter', grab)
      sheet.removeEventListener('mousemove', onMove)
      sheet.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(raf)
    }
  }, [])

  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet) return

    // 尊重「减少动态效果」：这批线就保持 PDF 原样
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (reduce?.matches) return

    let raf = 0
    let targetY = -1
    let curY = -1

    const apply = () => {
      curY += (targetY - curY) * 0.16
      const t = curY // 0..1，尾页滚进视口的进度
      bandRefs.current.forEach((el, i) => {
        if (!el) return
        const base = BANDS[i]
        // 每条带在页面里的中心位置（0..1）
        const center = (base.top + base.height / 2) / 100
        // 滚动进度靠近哪条，哪条就变粗
        const dist = Math.abs(center - t)
        const near = Math.max(0, 1 - dist * 11)
        const grow = 1 + near * near * 3.0
        // 封一个上限：不限制时某条能吃到半个白区，剩下四条全被挤没了
        const h = Math.min(base.height * grow, 8.2)
        el.style.height = `${h.toFixed(3)}%`
      })
      raf = requestAnimationFrame(apply)
    }

    // 滚轮交互：尾页从「刚进入视口底部」滚到「完全离开」的过程中推进，
    // 进度映射到黑带所在的 0~22% 区间，四条叶片刻度依次被拨开。
    const onScroll = () => {
      const r = sheet.getBoundingClientRect()
      const vh = window.innerHeight
      const total = vh + r.height
      const progress = Math.min(1, Math.max(0, (vh - r.top) / total))
      // 乘 0.45 而不是 1：黑带只挤在顶部 0~22% 这一段，放大后滚动全程才能从
      // 「第一条最粗」一路扫到「全部收细」，形成一次完整的开合。
      targetY = progress * 0.45
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    onScroll()
    curY = targetY
    raf = requestAnimationFrame(apply)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <footer className="ct" id="contact">
      <div className="ct__sheet" ref={sheetRef}>
        {/* 顶部装饰：白底 + 4 条黑带，黑带粗细随光标变化（百叶窗） */}
        <div className="ct__stripes" aria-hidden="true">
          <b className="ct__white" />
          <b className="ct__white" />
          {BANDS.map((b, i) => (
            <i
              key={b.top}
              ref={(el) => {
                bandRefs.current[i] = el
              }}
              style={{ top: `${b.top}%`, height: `${b.height}%` }}
            />
          ))}
        </div>

        <p className="ct__year">2026/portfolio</p>
        <p className="ct__credit">作品集设计来自 {site.name}</p>

        <h2 className="ct__title" ref={titleRef}>
          <span className="ct__line">
            <DecryptedText
              text="一起做点"
              animateOn="inViewHover"
              replayOnView
              effect="scramble"
              sequential
              revealDirection="start"
              speed={60}
              maxIterations={10}
              hoverRadius={100}
              scrambleColor="#8c8c8c"
              loop={false}
              loopDelay={2000}
              useOriginalCharsOnly={false}
              characters="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+"
              className="dt-on"
              encryptedClassName="dt-off"
            />
          </span>
          <span className="ct__line">
            <DecryptedText
              text="值得被记住的品牌。"
              animateOn="inViewHover"
              replayOnView
              effect="scramble"
              sequential
              revealDirection="start"
              speed={60}
              maxIterations={10}
              hoverRadius={100}
              scrambleColor="#8c8c8c"
              loop={false}
              loopDelay={2000}
              useOriginalCharsOnly={false}
              characters="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+"
              className="dt-on"
              encryptedClassName="dt-off"
            />
          </span>
        </h2>

        <i
          className="ct__orb"
          ref={orbRef}
          data-move
          data-editor-original="尾页圆点"
          aria-hidden="true"
        />

        <p className="ct__note">
          Let&apos;s work together to create
          <br />
          brands that will be remembered.
        </p>

        <div className="ct__info">
          <span className="ct__rule" />
          <div className="ct__row ct__row--first">
            <span className="ct__k">Email：</span>
            <a className="ct__v" href={`mailto:${site.email}`}>
              {site.email}
            </a>
            <span className="ct__far">
              <svg
                className="ct__pin"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 1.6a7.6 7.6 0 0 0-7.6 7.6c0 5.7 7.6 13.2 7.6 13.2s7.6-7.5 7.6-13.2A7.6 7.6 0 0 0 12 1.6Zm0 10.7a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2Z" />
              </svg>
              {city}
            </span>
          </div>
          <span className="ct__rule" />
          <div className="ct__row">
            <span className="ct__k">Wechat：</span>
            <span className="ct__v">{site.wechat}</span>
            <span className="ct__far">Number：{site.phone}</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
