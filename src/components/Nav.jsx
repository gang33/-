import { useEffect, useState } from 'react'
import { navLinks, site } from '../data.js'

export default function Nav() {
  const [solid, setSolid] = useState(false)
  const [active, setActive] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setSolid(window.scrollY > window.innerHeight * 0.72)

      const line = window.innerHeight * 0.42
      let current = ''
      navLinks.forEach((link) => {
        const el = document.querySelector(link.href)
        if (!el) return
        if (el.getBoundingClientRect().top <= line) current = link.href
      })
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  // 抽屉打开时锁滚动，并支持 Esc 关闭
  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <header className={`nav${solid ? ' nav--solid' : ''}${open ? ' nav--open' : ''}`}>
      <div className="nav__inner shell">
        <a className="nav__brand" href="#top" aria-label="回到顶部">
          <span className="nav__brand-cn">{site.name}</span>
          <span className="nav__brand-meta mono">
            {site.nameEn}
            <i aria-hidden="true" />
            {site.role}
          </span>
        </a>

        <nav className="nav__links" aria-label="主导航">
          {navLinks.map((link) => (
            <a
              key={link.href}
              className={`nav__link${active === link.href ? ' is-active' : ''}`}
              href={link.href}
            >
              <em className="mono">{link.idx}</em>
              <span>{link.label}</span>
            </a>
          ))}
        </nav>

        <button
          type="button"
          className="nav__toggle"
          aria-expanded={open}
          aria-controls="nav-drawer"
          aria-label={open ? '关闭导航' : '打开导航'}
          onClick={() => setOpen((value) => !value)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </div>

      <div id="nav-drawer" className="nav__drawer" hidden={!open}>
        {navLinks.map((link) => (
          <a
            key={link.href}
            className={`nav__drawer-link${active === link.href ? ' is-active' : ''}`}
            href={link.href}
            onClick={() => setOpen(false)}
          >
            <em className="mono">{link.idx}</em>
            <span>{link.label}</span>
          </a>
        ))}
      </div>
    </header>
  )
}
