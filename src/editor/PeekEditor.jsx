import { useEffect, useState } from 'react';
import {
  PEEK_DEFAULTS,
  countPeekChanges,
  readPeekConfig,
  resetPeekConfig,
  subscribePeekConfig,
  writePeekConfig,
} from '../peek-config.js';

const FIELDS = [
  {
    key: 'meW',
    label: '关于我 · 人像宽度',
    hint: '竖构图（比例 0.71），高度按比例自动算。',
    min: 120,
    max: 520,
    step: 2,
    unit: 'px',
  },
  {
    key: 'workW',
    label: '工作经验 · 人物宽度',
    hint: '横构图（比例 1.28），没有黄名片。',
    min: 200,
    max: 1000,
    step: 4,
    unit: 'px',
  },
];

function SizeField({ field, value, onChange }) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = (raw) => {
    const next = Number(raw);
    if (!Number.isFinite(next)) {
      setText(String(value));
      return;
    }
    const clamped = Math.min(field.max, Math.max(field.min, next));
    setText(String(Math.round(clamped)));
    onChange(Math.round(clamped));
  };

  return (
    <div className="editor-field">
      <label className="editor-field__label" htmlFor={`peek-${field.key}`}>
        <span>{field.label}</span>
        <em>{value} {field.unit}</em>
      </label>
      <div className="editor-numwrap">
        <input
          id={`peek-${field.key}`}
          type="range"
          min={field.min}
          max={field.max}
          step={field.step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <input
          className="editor-num"
          type="number"
          min={field.min}
          max={field.max}
          step={field.step}
          value={text}
          onChange={(event) => {
            const raw = event.target.value;
            setText(raw);
            if (raw === '' || raw === '-' || raw.endsWith('.')) return;
            commit(raw);
          }}
          onBlur={() => commit(text)}
        />
      </div>
      <p className="editor-hint">{field.hint}</p>
    </div>
  );
}

export default function PeekEditor({ onFlash }) {
  const [config, setConfig] = useState(readPeekConfig);

  useEffect(() => subscribePeekConfig(setConfig), []);

  const update = (key, value) => {
    const next = writePeekConfig({ [key]: value });
    setConfig(next);
  };

  const changed = countPeekChanges(config);

  return (
    <>
      <section className="editor-group">
        <h4>跟手图尺寸</h4>
        <p className="editor-hint">
          个人经历里跟着鼠标走的那两张图。宽度改完立刻生效，存本机，刷新不丢。
          图的高度按各自比例自动算，所以只调宽度就够了。
        </p>
        {FIELDS.map((field) => (
          <SizeField
            key={field.key}
            field={{
              ...field,
              hint:
                field.key === 'workW'
                  ? `横构图（比例 1.28），没有黄名片。现在是人物像那张的 ${(config.workW / config.meW).toFixed(2)} 倍宽。`
                  : field.hint,
            }}
            value={config[field.key]}
            onChange={(value) => update(field.key, value)}
          />
        ))}
      </section>

      <section className="editor-group">
        <h4>重置</h4>
        <p className="editor-hint">
          {changed === 0
            ? '现在是默认尺寸（人像 300 / 人物 600）。'
            : `已改过 ${changed} 项，点下面回到默认尺寸。`}
        </p>
        <button
          type="button"
          className="editor-btn is-ghost"
          onClick={() => {
            setConfig(resetPeekConfig());
            onFlash?.('跟手图尺寸已恢复默认');
          }}
        >
          全部恢复默认
        </button>
        <p className="editor-hint">
          默认值：人像 {PEEK_DEFAULTS.meW}px、人物 {PEEK_DEFAULTS.workW}px。
        </p>
      </section>
    </>
  );
}
