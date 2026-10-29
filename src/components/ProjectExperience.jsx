/**
 * 品牌项目经验，按 `_素材/个人经历/品牌项目经验.pdf` 复原。
 * PDF 页尺寸 1519.54 × 949.13，下面所有百分比都由它的坐标反推：
 * 字号 70.55pt → 4.643vw；正文 12pt → 12px（按你定的正文基准）。
 *
 * 顶部四条黑带会随滚动做「百叶窗」：滚到这一块时，靠近视口中线的那条变粗、其余收细。
 * 逻辑和尾页 `.ct__stripes` 完全一致（scroll 驱动 + 单条响应 + 上限）。
 */
import { useEffect, useRef } from 'react'

// PDF 里四个实心矩形的位置与高度（占页高）
const BANDS = [
  { top: 0, height: 8.18 },
  { top: 9.41, height: 5.79 },
  { top: 17.28, height: 3.19 },
  { top: 22.55, height: 1.4 },
]

const LINES = [30.31, 37.89, 45.46, 53.04, 60.62, 68.18, 75.76]

const WORDS = [
  // dir：滚轮向下时这个字往哪边滑。1 = 右，-1 = 左（向上滚原路收回）。
  { t: 'BRAND', x: 5.2, y: 28.86, en: true, dir: 1 },
  { t: '品牌', x: 5.08, y: 35.76, en: false, dir: -1 },
  { t: '项目经历', x: 33.28, y: 43.81, en: false, dir: -1 },
  { t: 'PROJECT', x: 25.1, y: 51.34, en: true, dir: 1 },
  { t: 'EXPERIENCE', x: 61.64, y: 58.63, en: true, dir: 1 },
]

export default function ProjectExperience() {
  const sheetRef = useRef(null)
  const bandRefs = useRef([])

  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet) return
    const nodes = [...sheet.querySelectorAll('[data-px-word]')]
    if (!nodes.length) return

    // 滚轮向下 → 五个大字从中心向外散开；向上 → 收回来。
    // 每帧用「cur 追 p」的阻尼积分，所以松手后还会缓一下才停。
    const words = nodes.map((el) => ({ el, dir: Number(el.dataset.dir) || 1 }))
    let p = 0
    let cur = 0
    let v = 0 // 速度状态：没有它就没有惯性
    let raf = 0

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const onScroll = () => {
      const r = sheet.getBoundingClientRect()
      // 板块从底部进入到顶部离开之间 0 → 1
      const raw = (window.innerHeight - r.top) / (window.innerHeight + r.height)
      p = Math.max(0, Math.min(1, raw))
    }

    let last = 0
    const K = 55 // 弹簧刚度：越大回得越快
    const D = 9 // 阻尼：越小惯性越明显，会冲过头再荡回来

    const frame = (now) => {
      // 用真实时间积分（不按帧），60Hz 和 120Hz 屏幕手感一致
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60
      last = now
      // 二阶弹簧-阻尼：先算加速度，再更新速度、再更新位置 —— 这才有惯性
      const accel = (p - cur) * K - v * D
      v += accel * dt
      cur += v * dt
      if (Math.abs(p - cur) < 0.0008 && Math.abs(v) < 0.004) {
        cur = p
        v = 0
      }
      const spread = reduce ? 0 : cur * 160
      words.forEach((w) => {
        // 方向按 WORDS 里的 dir 写死（右 = 1，左 = -1），滚轮向下散开、向上收回。
        const tx = w.dir * spread
        w.el.style.transform = spread ? `translate3d(${tx.toFixed(2)}px, 0, 0)` : ''
        w.el.style.opacity = String(Math.min(1, 0.15 + cur * 1.6))
      })
      raf = requestAnimationFrame(frame)
    }

    onScroll()
    // 首帧直接对齐当前滚动位置：不清零的话，一进入这一块文字会从 0
    // 缓动着追上去，看起来像初始位置被挪偏了。
    cur = p
    window.addEventListener('scroll', onScroll, { passive: true })
    raf = requestAnimationFrame(frame)

    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return

    let curY = 0
    let targetY = 0
    let raf = 0

    const onScroll = () => {
      const r = sheet.getBoundingClientRect()
      const vh = window.innerHeight
      // 0 = 刚在屏幕下方，1 = 已经滑过屏幕顶部
      const progress = Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height)))
      // 四条带只占顶部 24%，乘 0.55 让滚动全程只走完一次开合
      targetY = progress * 0.55
    }

    const frame = () => {
      curY += (targetY - curY) * 0.16
      bandRefs.current.forEach((el, i) => {
        if (!el) return
        const base = BANDS[i]
        // 从上往下：黑块由厚变薄，最后淡进白色背景。
        // 起始 1.75 倍（四条挤在一起像一整块），滚到底 0.35 倍并淡到 0.25。
        // 起始 1.75 倍（四条厚实、几乎连成一片），滚深了收到 0.35
        const k = 1.75 - curY * 2.9
        el.style.height = `${Math.max(base.height * k, 0.05).toFixed(3)}%`
        // 起始段保持纯黑（1.4 被 clamp 到 1），滚深了才开始往白色里褪
        el.style.opacity = Math.min(1, Math.max(0.18, 1.45 - curY * 2.1)).toFixed(3)
      })
      raf = requestAnimationFrame(frame)
    }

    onScroll()
    curY = targetY
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    raf = requestAnimationFrame(frame)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section className="px" id="project-experience">
      <div className="px__sheet" ref={sheetRef}>
        {/* 顶部四条黑带（PDF 里是全宽实心矩形），随滚动做百叶窗 */}
        <div className="px__bars" aria-hidden="true">
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

        {/* 七条横线：PDF 里等距，每 71.9pt 一条 */}
        {LINES.map((y) => (
          <span key={y} className="px__rule" style={{ top: `${y}%` }} aria-hidden="true" />
        ))}

        {WORDS.map((w, i) => (
          <p
            key={w.t}
            className={w.en ? 'px__word px__word--en' : 'px__word px__word--cn'}
            data-px-word={i}
            data-dir={w.dir}
            style={{ left: `${w.x}%`, top: `${w.y}%` }}
          >
            {w.t}
          </p>
        ))}

        <div className="px__notes">
          {/* 断行严格照 PDF 原稿，用 pre-line 保留（不靠浏览器自动折行） */}
          <p>
            {'作品集收录了自 2024–2026 工作期间的部分商业\n设计作品，以餐饮品牌设计为主要，涉及品牌\n策略定位、品牌 VI 设计、空间落地软装、物料延\n展设计、品牌年度运营一系列品牌系统建设。'}
          </p>
          <p>
            {'对我来说，设计是整体性的：形式和功能并非分\n离的东西。美学是种负责行为，因为它们塑造了\n我们的体验空间。品牌不仅是“美好想象”，更是\n一个行之有效的解决方案和切实可行的成长工具。'}
          </p>
        </div>
      </div>
    </section>
  )
}
