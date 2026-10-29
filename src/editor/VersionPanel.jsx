import { useEffect, useRef, useState } from 'react'
import {
  captureSnapshot,
  clearHistory,
  describeBatch,
  readHistory,
  removeBatch,
  resyncRecorder,
  restoreScene,
  setRecorderPaused,
  subscribeHistory,
} from '../adjust-history.js'

/**
 * 编辑模式 →「版本」面板
 * - 每一次调整自动记一批（连续微调合并成一批，最多保留 4 批）
 * - 每批都能：按住看调整前 / 回到调整前 / 回到调整后
 * - 另有「按住看原版」：回到完全没改过的初始状态
 */

export default function VersionPanel({ onFlash, applyScene, onPeekStart, onPeekEnd }) {
  const [history, setHistory] = useState(readHistory)
  const [peekKey, setPeekKey] = useState(null)
  const peekSceneRef = useRef(null)

  useEffect(() => subscribeHistory(setHistory), [])

  const beginPeek = (batch) => {
    if (!applyScene) return
    setRecorderPaused(true)
    peekSceneRef.current = captureSnapshot().data
    applyScene(batch.before.data)
    setPeekKey(batch.at)
  }

  const endPeek = () => {
    if (!peekSceneRef.current) return
    applyScene(peekSceneRef.current)
    peekSceneRef.current = null
    setPeekKey(null)
    resyncRecorder()
    setRecorderPaused(false)
  }

  const batches = [...history.batches].reverse()

  return (
    <>
      <section className="editor-group">
        <h4>对比原版</h4>
        <p className="editor-hint">
          按住时整页临时回到「完全没改过」的状态（变量、模块留白与底色、文字与样式、轨道参数、
          个人优势缩放、移动过的内容），松开回到你现在这版。
        </p>
        <button
          type="button"
          className="editor-toggle"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture?.(e.pointerId)
            onPeekStart?.()
          }}
          onPointerUp={onPeekEnd}
          onPointerCancel={onPeekEnd}
          onPointerLeave={(e) => {
            if (e.buttons === 0) onPeekEnd?.()
          }}
        >
          按住看原版
        </button>
      </section>

      <section className="editor-group">
        <h4>
          最近调整 <em className="editor-size-tag">保留 4 次 · 现有 {history.batches.length} 次</em>
        </h4>
        <p className="editor-hint">
          每做一次调整自动记一条（连续微调会合并成一条）。按住「看」可以边按边比对调整前后，
          觉得方向不对就点「回到调整前」直接退回那次调整之前。
        </p>

        <div className="editor-list">
          {batches.map((batch, i) => {
            const index = history.batches.length - 1 - i
            const time = new Date(batch.at).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
            const peeking = peekKey === batch.at
            return (
              <div className="editor-list__row editor-batch" key={`${batch.at}-${index}`}>
                <del>
                  {String(index + 1).padStart(2, '0')} · {time}
                </del>
                <ins>
                  <b>{describeBatch(batch)}</b>
                </ins>
                <span className="editor-batch__actions">
                  <button
                    type="button"
                    className={`editor-batch__btn${peeking ? ' is-on' : ''}`}
                    title="按住查看这次调整之前的样子"
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture?.(e.pointerId)
                      beginPeek(batch)
                    }}
                    onPointerUp={endPeek}
                    onPointerCancel={endPeek}
                    onPointerLeave={(e) => {
                      if (e.buttons === 0) endPeek()
                    }}
                  >
                    {peeking ? '调整前…' : '按住看'}
                  </button>
                  <button
                    type="button"
                    className="editor-batch__btn"
                    title="回到这次调整之前"
                    onClick={() => restoreScene(batch.before)}
                  >
                    回到调整前
                  </button>
                  <button
                    type="button"
                    className="editor-batch__btn"
                    title="回到这次调整之后"
                    onClick={() => restoreScene(batch.after)}
                  >
                    调整后
                  </button>
                  <button
                    type="button"
                    className="editor-list__del"
                    title="删除这条记录"
                    onClick={() => setHistory(removeBatch(index))}
                  >
                    ×
                  </button>
                </span>
              </div>
            )
          })}
          {batches.length === 0 && (
            <p className="editor-hint">还没有调整记录。随便改点东西（拖个滑块、移动个元素、改段文字）就会自动记一条。</p>
          )}
        </div>

        {batches.length > 0 && (
          <div className="editor-actions">
            <button
              type="button"
              className="is-ghost"
              onClick={() => {
                if (!window.confirm('清空调整记录？页面当前状态不会变，只是不能再一键回到之前。')) return
                setHistory(clearHistory())
                onFlash?.('调整记录已清空')
              }}
            >
              清空记录
            </button>
          </div>
        )}
      </section>
    </>
  )
}
