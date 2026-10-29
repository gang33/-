import { useEffect, useRef } from 'react'
import { profile, site } from '../data.js'
import { COVER_TEXT, COVER_BIG as BIG_WORD, COVER_TAPE as TAPE } from '../cover-print.js'

/**
 * 首屏：把 PDF 作品集的封面做成一本能翻的书。
 *
 * 交互模型：滚动位置 → 翻页进度 p（0~1），p 再驱动封面绕装订轴翻转。
 * 关键约定：
 *  1. 不劫持滚动。舞台用 position:sticky 钉住，进度只是 window.scrollY 的函数，
 *     所以随时能停、能回滚、能用触控板 / 键盘 / 滚动条。
 *  2. 亚克力是硬质材料，翻的是「一整片」而不是卷曲的纸 → 不做切片变形，
 *     避免切片接缝与掉帧（`public/_proto/flip2.html` 的 peel 模式里，200 片时
 *     会密到出现百叶窗状白缝，这条路已经验证走不通）。
 *  3. 双面：封面正反两面各一个面片，翻过 90° 后自然看到纸背，
 *     而不是靠 opacity 淡出「假装翻走」。
 */

const COVER_SRC = '/media/cover/cover.webp'
const MECH_SRC = '/media/cover/mech.webp'
const BOOK_RATIO = 5869 / 3001
const BIND_PCT = 6.64 // 装订线位置（量自素材）
// 实物照已经转正。按 _素材/个人经历/封面.pdf 排版时书是水平的，
// 所以这里不再额外加倾斜角（改回 5.81 就能恢复「斜着摆」的样子）。
const TILT_DEG = 0
const TURN_DEG = 104 // 翻过头一点，避免停在正侧面
const PERSPECTIVE = 2000

// 滚多少距离翻完：100vh 的舞台 + 1.6 屏的行程
const SCROLL_LEN = 1.6

export default function CoverBook() {
  const pegRef = useRef(null)
  const pinRef = useRef(null)
  const bookRef = useRef(null)
  const coverRef = useRef(null)
  const shadeRef = useRef(null)
  const innerRef = useRef(null)

  useEffect(() => {
    const peg = pegRef.current
    const pin = pinRef.current
    const book = bookRef.current
    const cover = coverRef.current
    const shade = shadeRef.current
    const inner = innerRef.current
    if (!peg || !pin || !book || !cover) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)
    const smoothstep = (a, b, x) => {
      const t = clamp((x - a) / (b - a || 1), 0, 1)
      return t * t * (3 - 2 * t)
    }

    // ---------- 尺寸 ----------
    let bw = 0
    let bh = 0
    const measure = () => {
      const vw = pin.clientWidth
      const vh = pin.clientHeight
      // 竖屏（手机）：书略微出屏，保留「近看」的质感，但不能再大 ——
      // 1.22 倍会把右边的 LINZENGYU 和能力标签切掉，Portfolio 的最后一个 o 也出界。
      // 横屏：保证整本书能落在画面里，且不顶到顶部导航。
      bw =
        vw < 720
          ? vw * 1.05
          : Math.max(320, Math.min(vw * 0.78, vh * 0.8 * BOOK_RATIO))
      bh = bw / BOOK_RATIO
      book.style.width = bw + 'px'
      book.style.height = bh + 'px'
      book.style.marginLeft = -bw / 2 + 'px'
      book.style.marginTop = -bh / 2 + 'px'
      // 内页排版全部按书宽等比缩放（字体、间距、孔洞都用 calc(var(--bw) * n)）
      book.style.setProperty('--bw', bw + 'px')
      book.style.setProperty('--bh', bh + 'px')
    }

    // ---------- 滚动 → 进度 ----------
    let target = 0
    let cur = 0
    let vel = 0
    let inited = false
    const readScroll = () => {
      const travel = Math.max(1, peg.offsetHeight - window.innerHeight)
      target = clamp(-peg.getBoundingClientRect().top / travel, 0, 1)
    }

    // ---------- 鼠标视差 ----------
    let mx = 0
    let my = 0
    let tmx = 0
    let tmy = 0
    const onPointer = (e) => {
      tmx = (e.clientX / window.innerWidth - 0.5) * 2
      tmy = (e.clientY / window.innerHeight - 0.5) * 2
    }

    // ---------- 一帧 ----------
    const render = () => {
      // 翻页：前 8% 留白（让人先看清封面），之后 8%~86% 完成翻转
      const turnP = smoothstep(0.08, 0.86, cur)
      const angle = turnP * TURN_DEG
      // 正角度 = 右侧向远离观者的方向倒下（CSS 里 +Y 旋转把 +x 轴转离观者），
      // 写成负角度会让封面朝观者鼓出来、透视放大到糊屏。
      cover.style.transform = `rotateY(${angle.toFixed(2)}deg)`
      cover.style.setProperty('--turn', turnP.toFixed(3))

      // 掀起的封面在内页上投下的暗带：角度越接近侧立越窄越淡
      const band = Math.sin(turnP * Math.PI)
      if (shade) {
        shade.style.opacity = (band * 0.9).toFixed(3)
        shade.style.transform = `translateX(${(band * 2.2).toFixed(2)}%) scaleX(${(
          0.35 +
          band * 0.9
        ).toFixed(3)})`
      }

      // 内页内容：掀开过半之后逐行浮出
      if (inner) {
        // 内页文字要等封面翻过半程再浮现，否则会和还在翻的封面叠在一起。
        inner.style.setProperty('--reveal', smoothstep(0.5, 0.88, cur).toFixed(3))
      }

      // 整本书：静止时轻微呼吸 + 跟随鼠标的微视差（幅度收小，免得盖上印字的对齐关系）
      mx += (tmx - mx) * 0.08
      my += (tmy - my) * 0.08
      const idle = reduced ? 0 : Math.sin(performance.now() / 1600) * 0.35
      book.style.transform =
        `rotate(${TILT_DEG}deg) rotateX(${(my * -0.45 + idle * 0.3).toFixed(2)}deg)` +
        ` rotateY(${(mx * 0.6).toFixed(2)}deg)`

      peg.style.setProperty('--p', cur.toFixed(4))
    }

    // ---------- 主循环 ----------
    const K = 130
    const D = 2 * Math.sqrt(K) * 0.7
    let prev = 0
    let raf = 0
    const loop = (now) => {
      const dt = Math.min(0.05, Math.max(0.008, prev ? (now - prev) / 1000 : 0.016))
      prev = now
      if (!inited) {
        cur = target
        inited = true
      } else if (reduced) {
        cur = target
        vel = 0
      } else {
        vel += (target - cur) * K * dt
        vel -= vel * D * dt
        cur += vel * dt
        if (Math.abs(target - cur) < 0.0004 && Math.abs(vel) < 0.003) {
          cur = target
          vel = 0
        }
      }
      render()
      raf = requestAnimationFrame(loop)
    }

    measure()
    readScroll()
    window.addEventListener('scroll', readScroll, { passive: true })
    window.addEventListener('pointermove', onPointer, { passive: true })
    const ro = new ResizeObserver(() => {
      measure()
      readScroll()
    })
    ro.observe(pin)
    raf = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('scroll', readScroll)
      window.removeEventListener('pointermove', onPointer)
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  // 内页右栏：这本作品集自己的目录。避免和下面「个人经历」段的内容重复。
  const TOC = [
    ['01', '个人经历', '3 年 · 200+ 门店 · 6 个全案'],
    ['02', '作品一览', '6 个项目的完整拆解'],
    ['03', '个人优势', '4 项核心能力'],
    ['04', '联系方式', '邮箱 / 电话 / 微信'],
  ]

  const facts = [
    { v: '3', u: '年', c: '品牌设计经验' },
    { v: '200', u: '+', c: '连锁门店主创' },
    { v: '500', u: '+', c: '门店年度运营' },
    { v: '6', u: '个', c: '全案品牌项目' },
  ]

  return (
    <section className="bk-stage" id="top" ref={pegRef}>
      <div className="bk-pin" ref={pinRef}>
        <div className="bk-topbar mono">
          <span>
            <b>EMAIL.</b>
            <a href={`mailto:${site.email}`}>{site.email}</a>
          </span>
          <span>
            <b>WECHAT.</b>
            {site.wechat}
          </span>
          <span>
            <b>NUMBER.</b>
            <a href={`tel:${site.phone}`}>{site.phone}</a>
          </span>
        </div>

        <div className="bk-scene">
          <div className="bk-book" ref={bookRef}>
            {/* 内页：封面翻开后露出的「个人经历」第一页 */}
            <div className="bk-page">
              <div className="bk-page__holes" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="bk-page__inner" ref={innerRef}>
                <div className="bk-page__topline mono">
                  <span>02 — PROFILE</span>
                  <span>{site.since} — 2026</span>
                </div>
                <div className="bk-page__col bk-page__col--main">
                  <h1 className="bk-page__name">
                    林增宇
                    <em className="mono">{site.nameEn} / BRAND DESIGNER</em>
                  </h1>
                  <p className="bk-page__lead">
                    品牌设计师，常驻广州。
                    <br />
                    让品牌被记住，让设计能落地。
                  </p>
                  <ul className="bk-page__facts">
                    {facts.map((f) => (
                      <li key={f.c}>
                        <b>{f.v}</b>
                        <span>{f.u}</span>
                        <em>{f.c}</em>
                      </li>
                    ))}
                  </ul>
                  <p className="bk-page__body">{profile.bio[0]}</p>
                </div>

                <div className="bk-page__col bk-page__col--side">
                  <p className="bk-page__sideHead mono">CONTENTS</p>
                  <ol className="bk-page__toc">
                    {TOC.map(([no, cn, note]) => (
                      <li key={no}>
                        <span className="mono">{no}</span>
                        <b>{cn}</b>
                        <em>{note}</em>
                      </li>
                    ))}
                  </ol>
                  <p className="bk-page__foot mono">继续向下 · 翻开作品</p>
                </div>
              </div>
            </div>

            {/* 掀起的封面投在内页上的暗带（必须在封面下层，所以放在 persp 之前） */}
            <div className="bk-shade" ref={shadeRef} aria-hidden="true" />

            {/* 掀开的封面：一层透视容器 + 一片双面亚克力 */}
            <div className="bk-persp">
              <div className="bk-cover" ref={coverRef}>
                <img className="bk-cover__face bk-cover__face--front" src={COVER_SRC} alt="" draggable="false" />
                {/* 印在封面上的字：跟亚克力一起翻，所以直接放进 .bk-cover 里。
                    字号/字重/颜色走 CSS 自定义属性（--s/--w/--c），
                    因为直接写 fontSize: calc(...) 在这里会被浏览器丢掉。 */}
                <div className="bk-print" aria-hidden="true">
                  {COVER_TEXT.map((it) => (
                    <span
                      key={it.t}
                      className={`bk-print__item is-${it.f}`}
                      style={{
                        left: `${it.x * 100}%`,
                        top: `${it.y * 100}%`,
                        '--s': it.s,
                        '--w': it.w || 400,
                        '--c': it.c || '#1d1c1a',
                      }}
                    >
                      {it.t}
                    </span>
                  ))}
                  <span
                    className="bk-print__big"
                    style={{
                      left: `${BIG_WORD.x * 100}%`,
                      top: `${BIG_WORD.y * 100}%`,
                      '--s': BIG_WORD.s,
                      '--w': BIG_WORD.w,
                      '--ls': BIG_WORD.ls,
                    }}
                  >
                    {BIG_WORD.t}
                  </span>
                  <span
                    className="bk-print__tape"
                    style={{
                      left: `${TAPE.x * 100}%`,
                      top: `${TAPE.y * 100}%`,
                      '--s': TAPE.w,
                      '--ts': TAPE.h,
                      '--rot': `${TAPE.rot}deg`,
                    }}
                  >
                    {TAPE.t}
                  </span>
                </div>
                <span className="bk-cover__edge" aria-hidden="true" />
                <div className="bk-cover__face bk-cover__face--back" aria-hidden="true" />
              </div>
            </div>

            {/* 固定在最上层：装订环 */}
            <img className="bk-mech" src={MECH_SRC} alt="" aria-hidden="true" draggable="false" />
          </div>
        </div>

        <div className="bk-hint mono">
          <span className="bk-hint__line" aria-hidden="true" />
          <span className="bk-hint__a">滚动 · 掀开封面</span>
          <span className="bk-hint__b">继续向下 · 阅读个人经历</span>
        </div>
      </div>
    </section>
  )
}
