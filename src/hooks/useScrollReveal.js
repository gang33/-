import { useEffect } from 'react'

/**
 * 进入视口时给 [data-reveal] 元素加 `.is-in`。
 *
 * - 普通 [data-reveal]：只播一次，播完就不再观察。
 * - 带 [data-reveal-loop] 的元素：每次进视口都重播。完全离开视口时把 `.is-in`
 *   扣掉、并临时关掉 transition（`.is-reset`），让它瞬间退回起点 ——
 *   否则会在屏幕外把动画倒放一遍，再滚回来时只能看到后半段。
 *   离开的判定单独用不带 rootMargin 的观察器：进入的触发点在视口下沿往上 10%，
 *   而"真的看不见了"必须按真实视口算，不然元素刚滑到底部就会被误判离开。
 */
export function useScrollReveal() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll('[data-reveal]'))
    if (!nodes.length) return

    if (typeof IntersectionObserver === 'undefined') {
      nodes.forEach((n) => n.classList.add('is-in'))
      return
    }

    const loopNodes = nodes.filter((n) => n.hasAttribute('data-reveal-loop'))
    const onceNodes = nodes.filter((n) => !n.hasAttribute('data-reveal-loop'))

    // 回到起点：先关掉过渡，扣掉 is-in，逼一次布局，再把过渡还原
    const reset = (el) => {
      if (!el.classList.contains('is-in')) return
      el.classList.add('is-reset')
      el.classList.remove('is-in')
      void el.offsetHeight
      el.classList.remove('is-reset')
    }

    const enterOptions = { rootMargin: '0px 0px -10% 0px', threshold: 0.06 }

    const onceIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-in')
        onceIO.unobserve(entry.target)
      })
    }, enterOptions)

    const enterIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('is-in')
      })
    }, enterOptions)

    const leaveIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) reset(entry.target)
        })
      },
      { rootMargin: '0px', threshold: 0 }
    )

    onceNodes.forEach((n) => onceIO.observe(n))
    loopNodes.forEach((n) => {
      enterIO.observe(n)
      leaveIO.observe(n)
    })

    return () => {
      onceIO.disconnect()
      enterIO.disconnect()
      leaveIO.disconnect()
    }
  }, [])
}
