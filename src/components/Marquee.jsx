import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { readMarqueeConfig, subscribeMarqueeConfig } from '../marquee-config.js'

/**
 * 关键词滚动带。
 *
 * 内容 / 字体 / 字号倍率 / 字距 / 滚动速度都来自 marquee-config（编辑模式「跑马灯」面板改）。
 * 注意：字体走的是 CSS 变量 --mq-ff 而不是内联 font-family —— 首页那批印字踩过坑，
 * React 写内联 font-family 有时落不到 DOM，走 var() 更稳。
 *
 * 无缝循环：把词表拼成「一组」，复制一组接在后面，靠 translate3d(-50%) 平移一组宽度。
 * 词少的时候一组铺不满一屏，同一批词就会在一屏里出现两遍 —— 所以分两步处理：
 *   ① 先把词与词之间的空白撑大（spread），让一组尽量正好铺满一屏；
 *   ② 还不够（词实在太少）就把一组内部再重复几次（repeat）。
 */
const MAX_SPREAD = 24 // 自动铺开时每个词左右最多各加这么多 px（再大就显散，宁可轻微重复）

export default function Marquee() {
  const [config, setConfig] = useState(readMarqueeConfig)
  useEffect(() => subscribeMarqueeConfig(setConfig), [])

  const words = config.words.length ? config.words : ['作品集']
  const wordsKey = words.join('\u0001')

  const probeRef = useRef(null)
  const [layout, setLayout] = useState({ spread: 0, repeat: 1 })

  useLayoutEffect(() => {
    const node = probeRef.current
    if (!node) return
    const measure = () => {
      // 探针里只有一份词表、用默认词距，量到的就是「内容本身的宽度」
      const single = node.getBoundingClientRect().width
      const viewport = node.parentElement?.clientWidth || 0
      if (!single || !viewport) return
      const count = words.length
      // gap > 0 时用面板里定的固定词间距；0 表示自动（最多补到 MAX_SPREAD）
      const spread =
        config.gap > 0
          ? config.gap
          : Math.min(Math.max(0, (viewport - single) / count), MAX_SPREAD)
      const effective = single + spread * count
      const repeat = Math.max(1, Math.ceil(viewport / effective))
      setLayout((prev) =>
        Math.abs(prev.spread - spread) < 0.5 && prev.repeat === repeat ? prev : { spread, repeat },
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [wordsKey, config.scale, config.ls, config.gap, config.ff])

  const { spread, repeat } = layout
  const group = []
  for (let i = 0; i < repeat; i += 1) group.push(...words)
  // 复制一组接在后面，两段必须完全一样，-50% 才能无缝
  const row = [...group, ...group]

  return (
    <div
      className="marquee"
      id="marquee"
      aria-hidden="true"
      style={{
        '--mq-scale': config.scale,
        '--mq-ls': `${config.ls}em`,
        '--mq-dur': `${config.speed}s`,
        '--mq-spread': `${spread / 2}px`,
        ...(config.ff ? { '--mq-ff': config.ff } : null),
      }}
    >
      {/* 屏外探针：一份词表 + 默认词距，用来量内容本身多宽 */}
      <div className="marquee__probe" ref={probeRef}>
        {words.map((word, i) => (
          <span className="marquee__item" key={`probe-${i}`}>
            {word}
            <i />
          </span>
        ))}
      </div>

      <div className="marquee__track">
        {row.map((word, i) => (
          <span className="marquee__item" key={`${word}-${i}`}>
            {word}
            <i />
          </span>
        ))}
      </div>
    </div>
  )
}
