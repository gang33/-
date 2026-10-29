import { useCallback, useEffect, useRef, useState } from 'react'

/** 项目详情浮层：点轨道里的图片打开，展示该项目的大图与完整信息 */
export default function ProjectDetail({ project, onClose }) {
  const panelRef = useRef(null)
  const railRef = useRef(null)
  const [thumb, setThumb] = useState({ h: 20, y: 0 })
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (!project) return
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [project, onClose])

  // 滑块的高度和位置跟着面板的滚动状态走
  const syncThumb = useCallback(() => {
    const el = panelRef.current
    const rail = railRef.current
    if (!el || !rail) return
    const railH = rail.clientHeight
    const ratio = el.clientHeight / Math.max(1, el.scrollHeight)
    const h = Math.max(34, railH * ratio)
    const max = el.scrollHeight - el.clientHeight
    const progress = max > 0 ? el.scrollTop / max : 0
    setThumb({ h, y: progress * (railH - h) })
  }, [])

  useEffect(() => {
    if (!project) return
    const raf = requestAnimationFrame(syncThumb)
    // 长图是懒加载的，scrollHeight 会随着图片解析不断变大，多补几次
    const timers = [260, 700, 1600].map((delay) => setTimeout(syncThumb, delay))
    const onResize = () => syncThumb()
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
      window.removeEventListener('resize', onResize)
    }
  }, [project, syncThumb])

  // 按住滑块 / 点轨道任意位置：按比例把面板滚过去
  const onRailDown = (event) => {
    const el = panelRef.current
    const rail = railRef.current
    if (!el || !rail) return
    event.preventDefault()
    const box = rail.getBoundingClientRect()
    const seek = (clientY) => {
      const ratio = Math.min(1, Math.max(0, (clientY - box.top) / box.height))
      el.scrollTop = ratio * (el.scrollHeight - el.clientHeight)
    }
    setDragging(true)
    seek(event.clientY)
    const onMove = (e) => seek(e.clientY)
    const onUp = () => {
      setDragging(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  if (!project) return null

  return (
    <div className="pdetail" role="dialog" aria-modal="true" aria-label={project.title}>
      <button type="button" className="pdetail__backdrop" onClick={onClose} aria-label="关闭" />
      <div className="pdetail__panel" ref={panelRef} onScroll={syncThumb}>
        <header className="pdetail__head mono">
          <span className="pdetail__idx">{project.idx}</span>
          <span className="pdetail__year">{project.year}</span>
          <button type="button" className="pdetail__close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>

        <div className="pdetail__media">
          {(project.gallery?.length ? project.gallery : [project.image]).map((src, index) => (
            <img
              key={src}
              src={src}
              alt={`${project.title} 品牌视觉 ${index + 1}`}
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
            />
          ))}
        </div>

        <div className="pdetail__body">
          <div className="pdetail__title-block">
            <h3 className="pdetail__title">
              {project.title}
              <span className="mono">{project.titleEn}</span>
            </h3>
            <p className="pdetail__cat mono">{project.category}</p>
          </div>

          <p className="pdetail__desc">{project.desc}</p>

          <ul className="pdetail__tags">
            {project.tags.map((tag) => (
              <li key={tag} className="mono">
                {tag}
              </li>
            ))}
          </ul>

          <div className="pdetail__facts">
            <div className="pdetail__fact">
              <span className="mono">ROLE / 角色</span>
              <strong>{project.role}</strong>
            </div>
            <div className="pdetail__fact">
              <span className="mono">RESULT / 成果</span>
              <strong>
                {project.metric.value}
                {project.metric.unit}
                <em>{project.metric.cap}</em>
              </strong>
            </div>
          </div>
        </div>
      </div>
      <div
        className={`pdetail__rail${dragging ? ' is-dragging' : ''}`}
        ref={railRef}
        onPointerDown={onRailDown}
        aria-hidden="true"
      >
        <span
          className="pdetail__thumb"
          style={{ height: `${thumb.h}px`, transform: `translateY(${thumb.y}px)` }}
        />
      </div>
    </div>
  )
}
