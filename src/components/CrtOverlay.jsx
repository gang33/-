/**
 * CRT 扫描线覆膜 —— 复刻 pxpush.com 的那套「老显示器」质感。
 * 全部是装饰层，`pointer-events: none`，不参与交互、不拦鼠标。
 *
 * 四层从下到上：
 *   ① scanlines  两条：8 秒一趟的扫描带 + 每 1/60 秒跳一格的水平细线
 *   ② noise      噪点，0.5 秒瞬移一次（steps(1)）
 *   ③ gloom      整体虚焦（backdrop-filter）
 *   ④ vignette   四周压暗
 */
export default function CrtOverlay() {
  return (
    <>
      <div className="crtScan" aria-hidden="true" />
      <div className="crtNoise" aria-hidden="true" />
      <div className="crtGloom" aria-hidden="true" />
      <div className="crtVignette" aria-hidden="true" />
    </>
  )
}
