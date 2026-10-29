import { useEffect, useRef, useState } from 'react'
import OrbitImages from './OrbitImages.jsx'
import ProjectDetail from './ProjectDetail.jsx'
import SectionHead from './SectionHead.jsx'
import { projects } from '../data.js'
import {
  readOrbitConfig,
  subscribeOrbitConfig,
  subscribeOrbitEditing,
  writeOrbitConfig,
} from '../orbit-config.js'

/** 轨道图下方那行注释（年份 + 服务内容 + 门店数），文案照 _素材/个人经历/作品文字简介.pdf */
const ORBIT_NOTES = {
  miandieye: '2026 策略+视觉 200+门店',
  nongwuye: '2026 策略+视觉',
  caishen: '2024-2026 年度运营 500+门店',
  shuaicha: '2025 品牌升级 30+门店',
  bailaohao: '2025 策略+视觉',
  musheng: '2026 视觉',
}

/**
 * 作品轨道：项目透明底视觉图绕椭圆轨道旋转，点击打开该项目详情
 * 尺寸 / 中心文字等参数统一由 orbit-config 提供，编辑模式（编辑工具栏 →「轨道」）里调整
 */
export default function ProjectOrbit() {
  const [active, setActive] = useState(null)
  const [config, setConfig] = useState(readOrbitConfig)
  const [editing, setEditing] = useState(false)
  const [draggingCenter, setDraggingCenter] = useState(false)
  const [viewport, setViewport] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth,
  )
  const drag = useRef(null)

  useEffect(() => subscribeOrbitConfig(setConfig), [])
  useEffect(() => subscribeOrbitEditing(setEditing), [])

  useEffect(() => {
    const onResize = () => setViewport(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  /* 轨道内部所有尺寸都按「虚拟画布 baseWidth=1400」等比缩放，
     窄屏整团缩小后图片只剩三四十像素。这里按视口反比放大图块，
     让手机上图片仍有 ~90px（轨道半径保持配置值，只放大单张）。 */
  const narrow = viewport <= 640
  const itemSize = narrow
    ? Math.round(config.itemSize * Math.min(3, Math.max(2, 1400 / Math.max(320, viewport))))
    : config.itemSize

  /* 编辑模式：中心文字可以直接拖，坐标实时写回 orbit-config */
  const onCenterDown = (event) => {
    if (!editing || event.button !== 0) return
    event.preventDefault()
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      baseX: config.centerX,
      baseY: config.centerY,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setDraggingCenter(true)
  }

  const onCenterMove = (event) => {
    const state = drag.current
    if (!state || state.id !== event.pointerId) return
    const nextX = Math.round(state.baseX + (event.clientX - state.x))
    const nextY = Math.round(state.baseY + (event.clientY - state.y))
    if (nextX === config.centerX && nextY === config.centerY) return
    writeOrbitConfig({ centerX: nextX, centerY: nextY })
  }

  const onCenterUp = (event) => {
    const state = drag.current
    if (!state || state.id !== event.pointerId) return
    drag.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    setDraggingCenter(false)
  }

  const images = projects.map((project, index) => ({
    // 轨道上优先用透明底的「作品环绕」图，详情浮层仍用实拍大图
    src: project.orbitImage || project.image,
    alt: `${project.title} — ${project.category}`,
    scale: config.scales[index] ?? 1,
    // 图下面那行注释，文案取自 _素材/个人经历/作品文字简介.pdf
    caption: {
      name: project.title,
      meta: ORBIT_NOTES[project.id] || project.year,
      // 每张图单独微调上下位置（源图是方图、logo 留白多少不一）
      y: config.noteOffsets[index] ?? 0,
    },
  }))

  const centerStyle = {
    transform: `translate(${config.centerX}px, ${config.centerY}px)`,
  }

  // 中心文字用内联样式渲染：不让 .mono 之类的全局规则抢走字距／字体
  const titleStyle = {
    fontSize: `${config.centerSize}px`,
    letterSpacing: `${config.centerTracking}em`,
    textIndent: `${config.centerTracking}em`,
    fontFamily: config.centerFamily || 'var(--font-display)',
  }

  const hintStyle = {
    fontSize: `${config.centerHintSize}px`,
    letterSpacing: `${config.centerHintTracking}em`,
    fontFamily: config.centerHintFamily || 'inherit',
  }

  return (
    <section className="orbit-showcase" id="orbit">
      <div className="shell orbit-showcase__inner">
        <SectionHead
          bare
          variant="bare"
          index="N°"
          en="WORK INDEX"
          cn="作品一览"
          note="6 个全案项目的实拍 —— 拖动可转，点任意一张进入详情。"
        />

        {narrow ? (
          /* 手机屏放不下椭圆轨道：6 张图沿 300px 周长必然互相压住。
             窄屏改成两列网格，交互（点开详情）保持一致。 */
          <ul className="orbit-grid">
            {projects.map((project) => (
              <li key={project.id}>
                <button
                  type="button"
                  className="orbit-grid__item"
                  onClick={() => setActive(project)}
                >
                  <span className="orbit-grid__media">
                    <img
                      src={project.orbitImage || project.image}
                      alt={`${project.title} — ${project.category}`}
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <span className="orbit-grid__name">{project.title}</span>
                  <span className="orbit-grid__meta">
                    {ORBIT_NOTES[project.id] || project.year}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <OrbitImages
            images={images}
            shape="ellipse"
            radiusX={config.radiusX}
            radiusY={config.radiusY}
            rotation={config.rotation}
            duration={32}
            itemSize={itemSize}
            itemRadius={0}
            depth={config.depth}
            dim={config.dim}
            shadow={0}
            hoverScale={1.08}
            hoverSpeed={0.55}
            showPath={false}
            intro
            alignToPath={false}
            // 图下面那两行注释的排版参数（编辑模式 →「轨道」→「作品注释」）
            style={{
              '--oc-size': `${config.noteSize}px`,
              '--oc-gap': `${config.noteGap}px`,
              '--oc-lead': `${config.noteLead}px`,
              '--oc-dx': `${config.noteDx}px`,
              '--oc-dy': `${config.noteDy}px`,
              '--oc-op': String(config.noteOpacity),
            }}
            onItemClick={(index) => setActive(projects[index])}
            centerContent={
              <div
                className={`orbit-showcase__center${editing ? ' is-tunable' : ''}${
                  draggingCenter ? ' is-dragging' : ''
                }`}
                style={centerStyle}
                onPointerDown={onCenterDown}
                onPointerMove={onCenterMove}
                onPointerUp={onCenterUp}
                onPointerCancel={onCenterUp}
              >
                {config.centerText ? (
                  <span className="orbit-showcase__label" data-orbit-center="title" style={titleStyle}>
                    {config.centerText}
                  </span>
                ) : null}
                {config.centerHint ? (
                  <span className="orbit-showcase__hint" data-orbit-center="hint" style={hintStyle}>
                    {config.centerHint}
                  </span>
                ) : null}
              </div>
            }
          />
        )}
      </div>

      <ProjectDetail project={active} onClose={() => setActive(null)} />
    </section>
  )
}
