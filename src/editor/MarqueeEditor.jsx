import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MARQUEE_DEFAULTS,
  countMarqueeChanges,
  readMarqueeConfig,
  resetMarqueeConfig,
  subscribeMarqueeConfig,
  writeMarqueeConfig,
} from '../marquee-config.js'
import { FONT_CHOICES } from './font-choices.js'

const fmt = (value, step) => (step < 1 ? Number(value).toFixed(2) : String(Math.round(value)))

/**
 * 滑块 + 可直接输入的数字框：滑块用来「试」，输入框用来「调到某个准数」。
 */
function NumberField({ label, value, min, max, step, unit, onChange }) {
  const [text, setText] = useState(() => fmt(value, step))

  useEffect(() => {
    setText(fmt(value, step))
  }, [value, step])

  const commit = (raw) => {
    setText(raw)
    // 输入到一半（"0." / "-" / 空）先不动真值，否则小数点会被吃掉
    if (raw === '' || raw === '-' || raw.endsWith('.')) return
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return
    onChange(Math.min(max, Math.max(min, parsed)))
  }

  return (
    <div className="editor-field">
      <span className="editor-field__label">
        <span>{label}</span>
        <span className="editor-numwrap">
          <input
            type="number"
            className="editor-num"
            min={min}
            max={max}
            step={step}
            value={text}
            inputMode="decimal"
            onKeyDown={(e) => e.stopPropagation()}
            onChange={(e) => commit(e.target.value)}
            onBlur={() => setText(fmt(value, step))}
          />
          <em>{unit}</em>
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onKeyDown={(e) => e.stopPropagation()}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

/**
 * 「跑马灯」面板：黄底那条关键词滚动带的全部可调项。
 *
 * 词是一行一个存，空行会被丢掉；改完立即生效（滚动带订阅了同一份配置）。
 */
export default function MarqueeEditor({ onFlash }) {
  const [config, setConfig] = useState(readMarqueeConfig)
  const [draft, setDraft] = useState(() => readMarqueeConfig().words.join('\n'))

  useEffect(() => subscribeMarqueeConfig(setConfig), [])

  // 外部（重置 / 撤销）改了词，输入框要跟着走
  useEffect(() => {
    setDraft((prev) => (prev.trim() === config.words.join('\n').trim() ? prev : config.words.join('\n')))
  }, [config.words])

  const update = (patch) => {
    const next = writeMarqueeConfig(patch)
    setConfig(next)
    return next
  }

  const changed = useMemo(() => countMarqueeChanges(config), [config])

  const commitWords = (text, options = {}) => {
    const words = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    update({ words: words.length ? words : MARQUEE_DEFAULTS.words })
    if (!options.silent) onFlash?.(`滚动带已更新：${words.length} 个词`)
  }

  // 边打边存（400ms 防抖）：用户改完直接刷新也不会丢，又不会每敲一个字就把滚动带重排一次
  const debounceRef = useRef(0)
  const handleDraft = (text) => {
    setDraft(text)
    window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => commitWords(text, { silent: true }), 400)
  }
  useEffect(() => () => window.clearTimeout(debounceRef.current), [])

  const handleReset = () => {
    const next = resetMarqueeConfig()
    setConfig(next)
    setDraft(next.words.join('\n'))
    onFlash?.('滚动带已恢复默认')
  }

  return (
    <>
      <section className="editor-group">
        <h4>滚动带文字</h4>
        <p className="editor-hint">
          一行一个词，空行会被丢掉。改完立即生效，滚动带会自动重排、无缝循环。
        </p>
        <label className="editor-field">
          <span className="editor-field__label">
            <span>内容</span>
            <em>{config.words.length} 个词</em>
          </span>
          <textarea
            className="editor-textarea"
            rows={8}
            spellCheck={false}
            value={draft}
            onKeyDown={(e) => e.stopPropagation()}
            onChange={(e) => handleDraft(e.target.value)}
            onBlur={(e) => {
              window.clearTimeout(debounceRef.current)
              commitWords(e.target.value)
            }}
          />
        </label>
        <div className="editor-actions">
          <button type="button" onClick={() => commitWords(draft)}>
            应用内容
          </button>
        </div>
      </section>

      <section className="editor-group">
        <h4>字体与节奏</h4>
        <p className="editor-hint">字号按屏幕等比缩放，倍率 1.00 就是原始大小。</p>

        <label className="editor-field">
          <span className="editor-field__label">
            <span>字体</span>
            <em>{config.ff || '跟随默认'}</em>
          </span>
          <select value={config.ff} onChange={(e) => update({ ff: e.target.value })}>
            {FONT_CHOICES.map(([value, label]) => (
              <option key={value || 'default'} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <NumberField
          label="字号倍率"
          value={config.scale}
          min={0.5}
          max={2.6}
          step={0.01}
          unit="×"
          onChange={(next) => update({ scale: next })}
        />

        <NumberField
          label="字距"
          value={config.ls}
          min={0}
          max={0.6}
          step={0.01}
          unit="em"
          onChange={(next) => update({ ls: next })}
        />

        <NumberField
          label="词间距"
          value={config.gap}
          min={0}
          max={160}
          step={1}
          unit="px"
          onChange={(next) => update({ gap: next })}
        />
        <p className="editor-hint">
          词间距 0 表示自动：只补一点点空白（最多 24px），让一屏里尽量少出现重复。
          嫌挤就往上调——数值越大词与词离得越远；调到 40 以上，8 个词就能铺满一屏、不再重复。
        </p>

        <NumberField
          label="滚一圈"
          value={config.speed}
          min={8}
          max={120}
          step={1}
          unit="s"
          onChange={(next) => update({ speed: next })}
        />
        <p className="editor-hint">数值越大滚得越慢；46s 是默认节奏。</p>
      </section>

      <section className="editor-group">
        <h4>重置</h4>
        <p className="editor-hint">
          {changed ? `已偏离默认 ${changed} 处。` : '当前就是默认设置。'}
          重置只影响这条滚动带，不动其它板块。
        </p>
        <div className="editor-actions">
          <button type="button" onClick={handleReset}>
            恢复默认
          </button>
        </div>
      </section>
    </>
  )
}
