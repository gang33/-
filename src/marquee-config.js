/**
 * 滚动关键词带（marquee）的设置。
 *
 * 和 orbit-config / cover-text-config 一个套路：localStorage 里一份，
 * 改动通过 CustomEvent 广播，组件订阅后重渲染。
 *
 * 只存「用户真正会调的」几项：词、字体、字号倍率、字距、滚动一圈的秒数。
 */

import { marqueeWords } from './data.js'

export const MARQUEE_STORAGE_KEY = 'lzy-marquee-v1'

const CHANGE_EVENT = 'lzy-marquee-change'

export const MARQUEE_DEFAULTS = {
  words: [...marqueeWords],
  ff: '',
  scale: 1,
  ls: 0.2,
  // 词间距：0 = 自动（按一屏宽度铺开），>0 = 每个词左右各加这么多 px
  gap: 0,
  speed: 46,
}

const NUMBER_KEYS = ['scale', 'ls', 'gap', 'speed']

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function normalize(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const next = { ...MARQUEE_DEFAULTS }

  const words = Array.isArray(source.words)
    ? source.words.map((word) => (typeof word === 'string' ? word.trim() : '')).filter(Boolean)
    : typeof source.words === 'string'
      ? source.words
          .split(/[\n/,、|]/)
          .map((word) => word.trim())
          .filter(Boolean)
      : []
  if (words.length) next.words = words

  next.ff = typeof source.ff === 'string' ? source.ff : ''
  NUMBER_KEYS.forEach((key) => {
    const value = Number(source[key])
    if (!Number.isFinite(value)) return
    if (key === 'scale') next.scale = clamp(value, 0.5, 2.6)
    else if (key === 'ls') next.ls = clamp(value, 0, 0.6)
    else if (key === 'gap') next.gap = clamp(value, 0, 160)
    else if (key === 'speed') next.speed = clamp(value, 8, 120)
  })
  return next
}

export function readMarqueeConfig() {
  try {
    const raw = JSON.parse(localStorage.getItem(MARQUEE_STORAGE_KEY) || 'null')
    return normalize(raw)
  } catch {
    return { ...MARQUEE_DEFAULTS }
  }
}

function emit(next) {
  try {
    localStorage.setItem(MARQUEE_STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* 隐私模式写不进去就算了，当前页面照样生效 */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }))
  }
  return next
}

export function writeMarqueeConfig(patch) {
  return emit(normalize({ ...readMarqueeConfig(), ...patch }))
}

export function resetMarqueeConfig() {
  try {
    localStorage.removeItem(MARQUEE_STORAGE_KEY)
  } catch {
    /* 忽略 */
  }
  const next = { ...MARQUEE_DEFAULTS }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }))
  }
  return next
}

export function subscribeMarqueeConfig(callback) {
  const onChange = (event) => callback(normalize(event?.detail || readMarqueeConfig()))
  const onStorage = (event) => {
    if (event.key === MARQUEE_STORAGE_KEY || event.key == null) callback(readMarqueeConfig())
  }
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onStorage)
  }
}

/** 面板上显示「改过几处」用 */
export function countMarqueeChanges(config) {
  const defaults = MARQUEE_DEFAULTS
  let count = 0
  if ((config.words || []).join('\u0001') !== defaults.words.join('\u0001')) count += 1
  if ((config.ff || '') !== defaults.ff) count += 1
  if (Number(config.scale) !== defaults.scale) count += 1
  if (Number(config.ls) !== defaults.ls) count += 1
  if (Number(config.gap) !== defaults.gap) count += 1
  if (Number(config.speed) !== defaults.speed) count += 1
  return count
}
