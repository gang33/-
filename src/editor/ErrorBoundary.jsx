import { Component } from 'react'

/**
 * 错误边界：把任何渲染期异常拦在这里，绝不让整站白屏。
 * 出错时在页面顶部显示红色报错条，把错误信息暴露出来便于定位。
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: '' }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info: info?.componentStack || '' })
    console.error('[editor] 渲染出错：', error, info)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div
        data-editor
        style={{
          position: 'fixed',
          left: 12,
          bottom: 12,
          zIndex: 900,
          maxWidth: 460,
          padding: '12px 14px',
          borderRadius: 6,
          background: '#9c3a26',
          color: '#fff',
          font: '11px/1.7 "JetBrains Mono", Consolas, monospace',
          boxShadow: '0 16px 40px rgba(0,0,0,.3)',
        }}
      >
        <strong style={{ display: 'block', marginBottom: 6, letterSpacing: '.1em' }}>
          编辑工具栏出错（网站本身未受影响）
        </strong>
        <div style={{ opacity: 0.95, wordBreak: 'break-word' }}>
          {String(error?.message || error).slice(0, 400)}
        </div>
        <button
          type="button"
          onClick={() => this.setState({ error: null, info: '' })}
          style={{
            marginTop: 10,
            padding: '5px 12px',
            border: '1px solid rgba(255,255,255,.5)',
            borderRadius: 3,
            background: 'transparent',
            color: '#fff',
            font: 'inherit',
            cursor: 'pointer',
          }}
        >
          重新挂载
        </button>
      </div>
    )
  }
}
