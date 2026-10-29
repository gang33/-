import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import restoreTextOnLoad from './editor/restore-text-on-load.js'
import { applyLockedLook, seedLockedStorages } from './look-apply.js'
import './index.css'

/* 兜底：任何未捕获的错误都在页面顶部显示一条红条，而不是留一个白屏。
   非技术用户也能一眼读出问题，方便反馈。 */
function showFatalBar(message) {
  try {
    let bar = document.getElementById('__fatal_bar')
    if (!bar) {
      bar = document.createElement('div')
      bar.id = '__fatal_bar'
      bar.style.cssText = [
        'position:fixed',
        'left:0',
        'right:0',
        'top:0',
        'z-index:9999',
        'padding:10px 16px',
        'background:#9c3a26',
        'color:#fff',
        'font:12px/1.6 "JetBrains Mono",Consolas,monospace',
        'white-space:pre-wrap',
        'word-break:break-word',
        'box-shadow:0 8px 24px rgba(0,0,0,.25)',
      ].join(';')
      document.body.appendChild(bar)
    }
    bar.textContent = `页面出错：${message}　（按 Ctrl+Shift+R 强制刷新可重试）`
  } catch (err) {
    /* 忽略 */
  }
}

window.addEventListener('error', (event) => {
  if (event?.message) showFatalBar(event.message)
})
window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason
  showFatalBar(String(reason?.message || reason || '未知错误'))
})

// 「最终版」里各模块自己的设置（封面印字、滚动条、轨道参数、拖动位移…）
// 都只存在 localStorage，访客那边是空的 —— 缺的时候补一份进去。
seedLockedStorages()

const container = document.getElementById('root')
if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
  // 挂载之后再恢复改过的文字：此时 DOM 已存在，且 React 的首次渲染已经完成
  restoreTextOnLoad()
  // 再把「最终版」里的 CSS 变量、模块微调、单块文字样式贴上（这些以前只在 ?edit 下才有）
  applyLockedLook()
}
