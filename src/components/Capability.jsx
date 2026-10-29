import { useEffect, useState } from 'react'
import { capabilities } from '../data.js'
import { capScaleOf, readCapState, subscribeCap } from '../cap-config.js'

/**
 * 个人优势 —— 版式：
 *  左栏：• 中文标题（600）＋ 灰色英文名（对齐到中文首字）
 *  右栏：单段正文，按 descLines 逐行硬换行、两端对齐
 *  缩放：整块由 --cap-scale 控制（1 = 原版，默认 0.7），右边缘为锚点
 *  调整入口在编辑模式 →「版本」面板（对比原版 / 回退 / 恢复）
 */
export default function Capability() {
  const [state, setState] = useState(readCapState)
  // 编辑模式「按住看原版」时，通过事件临时切到 1×
  const [preview, setPreview] = useState(null)

  useEffect(() => subscribeCap(setState), [])

  useEffect(() => {
    const onPreview = (event) => setPreview(typeof event.detail === 'number' ? event.detail : null)
    window.addEventListener('lzy-cap-preview', onPreview)
    return () => window.removeEventListener('lzy-cap-preview', onPreview)
  }, [])

  const scale = preview ?? capScaleOf(state)

  return (
    <section
      className="cap"
      id="capability"
      style={{ '--cap-scale': String(scale) }}
      data-cap-scale={scale.toFixed(2)}
      data-cap-preview={preview !== null ? '' : undefined}
    >
      <div className="cap__band">
        <p className="cap__eyebrow" data-reveal>
          03 / CAPABILITY
        </p>
        {/* 移动模式的拖拽点放在遮罩上：拖动时裁切窗口和反白块一起走，
            否则块被拖出遮罩就会被裁掉。 */}
        <div className="cap__title-mask" data-reveal data-reveal-loop data-move>
          <h2 className="cap__title-block">个人优势</h2>
        </div>
      </div>

      <div className="cap__section">
        <div className="cap__block">
          {capabilities.map((item) => (
            <div className="cap__row" key={item.num}>
              <div className="cap__label">
                <span className="cap__title">{item.title}</span>
                <span className="cap__en">{item.en}</span>
              </div>
              <div className="cap__value">
                <div className="cap__wysiwyg">
                  {/* 断句按参考图逐行输出（descLines 里一行一个换行） */}
                  <p>{item.descLines ? item.descLines.join('\n') : item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
