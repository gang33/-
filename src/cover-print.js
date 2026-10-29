/**
 * 封面印字：坐标与字号全部量自 _素材/个人经历/封面.pdf 的文字层。
 *
 * PDF 里那张封面照片的图框是 (74.6, 107.4)–(1488.5, 830.9)，与
 * public/media/cover/cover.webp（2400×1227）同源，所以
 *   nx = (x - 74.6) / 1413.9
 *   ny = (y - 107.4) / 723.5
 *   ns = 字号 / 1413.9
 * 直接就是「以照片宽为 1」的归一化坐标。要改版式请对着 PDF 复核，别凭手感挪。
 */
export const COVER_RATIO = 2400 / 1227

export const COVER_TEXT = [
  { t: 'Brand Designer', x: 0.13862, y: 0.14886, s: 0.018955, f: 'display', w: 400 },
  { t: '( INDIVIDUAL/', x: 0.17519, y: 0.24755, s: 0.008841, f: 'mono' },
  { t: 'PORTFOLIO )', x: 0.21642, y: 0.26704, s: 0.008841, f: 'mono' },
  { t: '个', x: 0.13473, y: 0.22806, s: 0.035647, f: 'cover', w: 500 },
  { t: '人', x: 0.28929, y: 0.22806, s: 0.035647, f: 'cover', w: 500 },
  // PDF 里「作品」和「集」之间空着一个多字，拆成两段才量得准
  { t: '作品', x: 0.13438, y: 0.28791, s: 0.035647, f: 'cover', w: 500 },
  { t: '集', x: 0.25564, y: 0.28791, s: 0.035647, f: 'cover', w: 500 },
  { t: 'portfolio - 2026', x: 0.13475, y: 0.36186, s: 0.013721, f: 'mono' },
  { t: 'LINZENGYU', x: 0.77015, y: 0.05847, s: 0.011529, f: 'mono' },
  { t: 'Brand Positioning', x: 0.63699, y: 0.56702, s: 0.00757, f: 'mono', c: '#4d4d4d' },
  { t: 'Brand Visual Identity', x: 0.75016, y: 0.56757, s: 0.00757, f: 'mono', c: '#4d4d4d' },
  { t: 'Brand Chain Spaces', x: 0.58676, y: 0.60331, s: 0.00757, f: 'mono', c: '#4d4d4d' },
  { t: 'Brand Materials', x: 0.70189, y: 0.60386, s: 0.00757, f: 'mono', c: '#4d4d4d' },
  { t: 'Annual Operations', x: 0.80039, y: 0.60427, s: 0.00757, f: 'mono', c: '#4d4d4d' },
  { t: 'Packaging Design', x: 0.63766, y: 0.63662, s: 0.00757, f: 'mono', c: '#4d4d4d' },
  { t: 'AIGC Tools', x: 0.75009, y: 0.63718, s: 0.00757, f: 'mono', c: '#4d4d4d' },
]

// y 存的是「字体上升部线」而不是行盒顶：line-height 0.78 会让文字溢出到行盒上方，
// 所以 y 要比 PDF 的 0.562 往下让一点（具体值量出来调的）。
// 字重与字体沿用原封面 .cover__word（Schibsted Grotesk 500），交互用 TypeWord。
// 字号 0.168 而不是 PDF 的 0.18769：Schibsted Grotesk 的 "Portfolio" 比 PDF 字体宽约 18%，
// 同字号会顶出纸面；压到 0.168 后宽度正好等于 PDF 的 0.8064，且不需要负字距。
export const COVER_BIG = { t: 'Portfolio', x: 0.13141, y: 0.599, s: 0.168, w: 500, ls: 0 }

// 黄色美纹胶带：PDF 里是第二张图片，按黄色像素的包围盒中心定位
export const COVER_TAPE = { t: '高手定制版', x: 0.1111, y: 0.5583, w: 0.0365, h: 0.2206, rot: -50 }
