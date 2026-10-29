import { useEffect, useMemo, useState } from 'react'
import { projects } from '../data.js'
import {
  ORBIT_DEFAULTS,
  readOrbitConfig,
  resetOrbitConfig,
  setOrbitEditing,
  subscribeOrbitConfig,
  writeOrbitConfig,
} from '../orbit-config.js'
import { FONT_CHOICES } from './font-choices.js'

/** 编辑工具栏 →「轨道」面板：作品一览的图片大小、轨道形状、中心文字全在这里调 */

const GEOMETRY_FIELDS = [
  { key: 'itemSize', label: '图片大小', min: 100, max: 260, step: 2, unit: 'px' },
  { key: 'radiusX', label: '轨道宽度', min: 340, max: 760, step: 5, unit: '' },
  { key: 'radiusY', label: '轨道高度', min: 50, max: 300, step: 5, unit: '' },
  { key: 'rotation', label: '整体倾斜', min: -18, max: 18, step: 0.5, unit: '°' },
  { key: 'depth', label: '前后景深', min: 0, max: 0.6, step: 0.02, unit: '' },
  { key: 'dim', label: '后景淡出', min: 0, max: 0.5, step: 0.02, unit: '' },
]

const CENTER_FIELDS = [
  { key: 'centerSize', label: '大字字号', min: 16, max: 160, step: 1, unit: 'px' },
  { key: 'centerTracking', label: '大字字距', min: -0.06, max: 0.4, step: 0.005, unit: 'em' },
  { key: 'centerHintSize', label: '小字字号', min: 8, max: 40, step: 0.5, unit: 'px' },
  { key: 'centerHintTracking', label: '小字字距', min: -0.06, max: 0.4, step: 0.005, unit: 'em' },
  { key: 'centerX', label: '左右位置', min: -360, max: 360, step: 1, unit: 'px' },
  { key: 'centerY', label: '上下位置', min: -220, max: 220, step: 1, unit: 'px' },
]

// 每张图下面那两行作品注释（作品名 + 年份/服务内容）
const NOTE_FIELDS = [
  { key: 'noteSize', label: '字号', min: 8, max: 20, step: 0.5, unit: 'px' },
  { key: 'noteGap', label: '离图的距离', min: 0, max: 44, step: 1, unit: 'px' },
  { key: 'noteLead', label: '两行间距', min: 0, max: 18, step: 1, unit: 'px' },
  { key: 'noteDx', label: '左右位置', min: -90, max: 90, step: 1, unit: 'px' },
  { key: 'noteDy', label: '上下位置', min: -90, max: 90, step: 1, unit: 'px' },
  { key: 'noteOpacity', label: '第二行透明度', min: 0.15, max: 1, step: 0.02, unit: '' },
]

const fmt = (value, step) => (step < 1 ? Number(value).toFixed(2) : String(Math.round(value)))

export default function OrbitEditor({ onFlash }) {
  const [config, setConfig] = useState(readOrbitConfig)

  // 订阅：页面上拖动中心文字时，面板里的数值也跟着变
  useEffect(() => subscribeOrbitConfig(setConfig), [])

  // 面板在「轨道」标签页时才算编辑模式：中心文字可拖动
  useEffect(() => {
    setOrbitEditing(true)
    return () => setOrbitEditing(false)
  }, [])

  const update = (patch) => setConfig(writeOrbitConfig(patch))
  const setScale = (index, value) => {
    const scales = config.scales.slice()
    scales[index] = value
    update({ scales })
  }
  const setNoteOffset = (index, value) => {
    const noteOffsets = (config.noteOffsets || []).slice()
    noteOffsets[index] = value
    update({ noteOffsets })
  }

  const changedCount = useMemo(() => {
    let count = 0
    GEOMETRY_FIELDS.concat(CENTER_FIELDS, NOTE_FIELDS).forEach((field) => {
      if (Number(config[field.key]) !== Number(ORBIT_DEFAULTS[field.key])) count += 1
    })
    if (config.centerText !== ORBIT_DEFAULTS.centerText) count += 1
    if (config.centerHint !== ORBIT_DEFAULTS.centerHint) count += 1
    if (config.centerFamily !== ORBIT_DEFAULTS.centerFamily) count += 1
    if (config.centerHintFamily !== ORBIT_DEFAULTS.centerHintFamily) count += 1
    config.scales.forEach((value, index) => {
      if (Number(value) !== Number(ORBIT_DEFAULTS.scales[index])) count += 1
    })
    ;(config.noteOffsets || []).forEach((value, index) => {
      if (Number(value) !== Number(ORBIT_DEFAULTS.noteOffsets[index])) count += 1
    })
    return count
  }, [config])

  return (
    <>
      <section className="editor-group">
        <h4>轨道与图片</h4>
        <p className="editor-hint">
          改完立刻生效，自动保存在本机（导出里也会带上「作品轨道」这一段）。
        </p>
        {GEOMETRY_FIELDS.map((field) => (
          <label key={field.key} className="editor-field">
            <span className="editor-field__label">
              <span>{field.label}</span>
              <em>
                {fmt(config[field.key], field.step)}
                {field.unit}
              </em>
            </span>
            <input
              type="range"
              min={field.min}
              max={field.max}
              step={field.step}
              value={config[field.key]}
              onChange={(e) => update({ [field.key]: Number(e.target.value) })}
            />
          </label>
        ))}
      </section>

      <section className="editor-group">
        <h4>单张大小</h4>
        <p className="editor-hint">觉得哪张偏大／偏小就单独拉，六个都 1.00× 就是统一尺寸。</p>
        {projects.map((project, index) => (
          <label key={project.id} className="editor-field">
            <span className="editor-field__label">
              <span>
                {project.idx} {project.title}
              </span>
              <em>{Number(config.scales[index] ?? 1).toFixed(2)}×</em>
            </span>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.02}
              value={config.scales[index] ?? 1}
              onChange={(e) => setScale(index, Number(e.target.value))}
            />
          </label>
        ))}
      </section>

      <section className="editor-group">
        <h4>中心文字</h4>
        <p className="editor-hint">
          也可以直接在页面上按住那两行字拖动，位置会自动回填到下面的左右／上下。
        </p>
        <label className="editor-field">
          <span className="editor-field__label">
            <span>大字</span>
            <em>空着就不显示</em>
          </span>
          <input
            className="editor-input"
            type="text"
            value={config.centerText}
            placeholder="WORKS"
            onKeyDown={(e) => e.stopPropagation()}
            onChange={(e) => update({ centerText: e.target.value })}
          />
        </label>
        <label className="editor-field">
          <span className="editor-field__label">
            <span>小字提示</span>
            <em>空着就不显示</em>
          </span>
          <input
            className="editor-input"
            type="text"
            value={config.centerHint}
            placeholder="拖动可旋转 · 点击看详情"
            onKeyDown={(e) => e.stopPropagation()}
            onChange={(e) => update({ centerHint: e.target.value })}
          />
        </label>
        <label className="editor-field">
          <span className="editor-field__label">
            <span>大字字体</span>
            <em>{config.centerFamily || '默认'}</em>
          </span>
          <select value={config.centerFamily} onChange={(e) => update({ centerFamily: e.target.value })}>
            {FONT_CHOICES.map(([value, label]) => (
              <option key={value || 'default'} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="editor-field">
          <span className="editor-field__label">
            <span>小字字体</span>
            <em>{config.centerHintFamily || '默认'}</em>
          </span>
          <select
            value={config.centerHintFamily}
            onChange={(e) => update({ centerHintFamily: e.target.value })}
          >
            {FONT_CHOICES.map(([value, label]) => (
              <option key={value || 'default'} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {CENTER_FIELDS.map((field) => (
          <label key={field.key} className="editor-field">
            <span className="editor-field__label">
              <span>{field.label}</span>
              <em>
                {fmt(config[field.key], field.step)}
                {field.unit}
              </em>
            </span>
            <input
              type="range"
              min={field.min}
              max={field.max}
              step={field.step}
              value={config[field.key]}
              onChange={(e) => update({ [field.key]: Number(e.target.value) })}
            />
          </label>
        ))}
      </section>

      <section className="editor-group">
        <h4>作品注释</h4>
        <p className="editor-hint">
          每张图下面那两行字（作品名 + 年份/服务内容）。字号不受轨道远近影响，始终按这里设的来。
        </p>
        {NOTE_FIELDS.map((field) => (
          <label key={field.key} className="editor-field">
            <span className="editor-field__label">
              <span>{field.label}</span>
              <em>
                {fmt(config[field.key], field.step)}
                {field.unit}
              </em>
            </span>
            <input
              type="range"
              min={field.min}
              max={field.max}
              step={field.step}
              value={config[field.key]}
              onChange={(e) => update({ [field.key]: Number(e.target.value) })}
            />
          </label>
        ))}
        <div className="editor-actions">
          <button
            type="button"
            onClick={() => {
              update({ noteDx: 0, noteDy: 0 })
              onFlash?.('注释位置已归位')
            }}
          >
            注释归位
          </button>
        </div>
      </section>

      <section className="editor-group">
        <h4>单张注释位置</h4>
        <p className="editor-hint">
          六张源图都是方图、logo 在画面里的留白不一样，哪张注释偏了就单独拉。
        </p>
        {projects.map((project, index) => (
          <label key={project.id} className="editor-field">
            <span className="editor-field__label">
              <span>
                {String(index + 1).padStart(2, '0')} {project.title}
              </span>
              <em>{fmt(config.noteOffsets[index] ?? 0, 1)}px</em>
            </span>
            <input
              type="range"
              min={-140}
              max={60}
              step={1}
              value={config.noteOffsets[index] ?? 0}
              onChange={(e) => setNoteOffset(index, Number(e.target.value))}
            />
          </label>
        ))}
        <div className="editor-actions">
          <button
            type="button"
            onClick={() => {
              update({ noteOffsets: projects.map(() => 0) })
              onFlash?.('单张注释位置已归位')
            }}
          >
            全部归位
          </button>
        </div>
      </section>

      <section className="editor-group">
        <h4>重置</h4>
        <p className="editor-hint">
          已偏离默认值 {changedCount} 项。重置会回到我固化好的那套数值（含六张图的缩放）。
        </p>
        <div className="editor-actions">
          <button
            type="button"
            onClick={() => {
              setConfig(resetOrbitConfig())
              onFlash?.('轨道参数已重置')
            }}
          >
            回到默认值
          </button>
          <button type="button" onClick={() => update({ centerX: 0, centerY: 0 })}>
            中心文字归位
          </button>
        </div>
      </section>
    </>
  )
}
