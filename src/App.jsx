import { useEffect, useRef } from 'react'
import Nav from './components/Nav.jsx'
/**
 * 首屏保留两个候选版本，随时可切：
 *   book（默认）— 「会翻的作品集封面」，滚动驱动亚克力封面掀开
 *   type        — 原打字机封面，超大 Portfolio 逐字打出 + 鼠标躲闪
 * 切换方式：访问 `?cover=type` 或 `?cover=book`，选择会被 localStorage 记住。
 * 两个组件互不依赖，样式分别挂在 .bk-* 与 .cover-* 前缀上，同时存在不会打架。
 */
import CoverBook from './components/CoverBook.jsx'
import Hero from './components/Hero.jsx'
import Marquee from './components/Marquee.jsx'
import Profile from './components/Profile.jsx'
import ProjectExperience from './components/ProjectExperience.jsx'
import ProjectOrbit from './components/ProjectOrbit.jsx'
// 精选项目的详细卡片区已由「作品轨道 + 点击详情」承担，这里不再重复展示。
// 需要恢复时把下面这行 import 与 <Projects /> 一起放回来即可。
// import Projects from './components/Projects.jsx'
import Statement from './components/Statement.jsx'
import Capability from './components/Capability.jsx'
import AiWorkflow from './components/AiWorkflow.jsx'
import Contact from './components/Contact.jsx'
import EditorToolbar from './editor/EditorToolbar.jsx'
import ErrorBoundary from './editor/ErrorBoundary.jsx'
import { useScrollReveal } from './hooks/useScrollReveal.js'
import { applyMoves, subscribeMoves } from './move-tool.js'

/**
 * 把「移动内容」里保存的位移贴回页面。
 * 放在 App 层而不是编辑面板里，这样面板没打开时（甚至访客）也能看到位置。
 */
function useMoveOffsets() {
  useEffect(() => {
    let raf = 0
    const run = () => applyMoves()
    raf = window.requestAnimationFrame(() => {
      run()
      // 首帧之后图片/字体可能还在变高度，再补一次
      window.setTimeout(run, 600)
    })
    const unsubscribe = subscribeMoves(run)
    return () => {
      window.cancelAnimationFrame(raf)
      unsubscribe()
    }
  }, [])
}

// 编辑工具栏只在开发模式下挂载。
// 以前这里还允许线上用 ?edit 打开，等于把改字权限敞给任何访客，且整包工具栏都会进产物。
const editEnabled = import.meta.env.DEV

// 主题：默认走 ABCD 风格（黑白、大写宣言），可在编辑工具栏里切回 classic
// 注意：localStorage 里的内容可能被写坏，必须 try/catch，否则整包挂掉 → 白屏
function readSavedTheme() {
  try {
    const raw = localStorage.getItem('lzy-editor-v1')
    if (!raw) return 'abcd'
    const parsed = JSON.parse(raw)
    return parsed?.theme === 'classic' ? 'classic' : 'abcd'
  } catch (err) {
    return 'abcd'
  }
}
try {
  document.documentElement.dataset.theme = readSavedTheme()
} catch (err) {
  document.documentElement.dataset.theme = 'abcd'
}

/**
 * 首屏版本：'type'（纯黑底 + 封面照片，按 封面.pdf 排版）或 'book'（会翻的书）。
 * 默认永远是 type —— 不再读 localStorage。
 * 原因：之前用 ?cover=book 看对比时把选择存进了浏览器，之后哪怕代码改了默认值，
 * 那台机器还是被记忆的 'book' 劫持着，刷新永远回到旧版。
 * 现在只有地址栏显式带 ?cover=book 才会走会翻的书，其它一律黑底版。
 */
function readCoverVariant() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('cover')
    return fromUrl === 'book' ? 'book' : 'type'
  } catch (err) {
    return 'type'
  }
}
const COVER_VARIANT = readCoverVariant()

// CRT 覆膜默认开，?crt=0 关掉（画面上多一层扫描线，调版式时可以关掉看干净的效果）
try {
  if (new URLSearchParams(window.location.search).get('crt') === '0') {
    document.documentElement.classList.add('no-crt')
  } else {
    document.documentElement.classList.remove('no-crt')
  }
} catch {
  /* 拿不到 location 就算了，保持默认开 */
}

export default function App() {
  const barRef = useRef(null)
  useScrollReveal()
  useMoveOffsets()

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${progress})`
      }
    }
    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <>
      <div className="progress" aria-hidden="true">
        <span className="progress__bar" ref={barRef} />
      </div>
      <Nav />
      <main>
        {COVER_VARIANT === 'type' ? <Hero /> : <CoverBook />}
        {/* 关键词滚动条放回首屏与「个人经历」之间（封面下方那条黄色带） */}
        <Marquee />
        <Profile />
        <ProjectExperience />
        <ProjectOrbit />
        <Statement />
        <Capability />
        <AiWorkflow />
      </main>
      <Contact />
      {editEnabled && (
        <ErrorBoundary>
          <EditorToolbar />
        </ErrorBoundary>
      )}
    </>
  )
}
