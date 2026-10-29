// 个人经历那段「跟手图」的尺寸设置。
// 两张图比例不同，宽度各存一个值，由编辑模式的「图片」面板调。
// 存 localStorage，刷新不丢；订阅机制和 orbit-config / marquee-config 一致。

export const PEEK_STORAGE_KEY = 'lzy-peek-v1';
const CHANGE_EVENT = 'lzy-peek-change';

// me   = 「关于我」那张竖构图人像（比例 1422/2012）
// work = 「工作经验」那张横构图跳跃人物（比例 1465/1144）
export const PEEK_DEFAULTS = {
  meW: 300,
  workW: 600,
};

const LIMITS = {
  meW: [120, 520],
  workW: [200, 1000],
};

const NUMBER_KEYS = ['meW', 'workW'];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function normalizePeek(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const next = { ...PEEK_DEFAULTS };
  NUMBER_KEYS.forEach((key) => {
    const value = Number(source[key]);
    if (Number.isFinite(value) && value > 0) {
      const [min, max] = LIMITS[key];
      next[key] = Math.round(clamp(value, min, max));
    }
  });
  return next;
}

export function readPeekConfig() {
  if (typeof window === 'undefined') return { ...PEEK_DEFAULTS };
  try {
    const raw = window.localStorage.getItem(PEEK_STORAGE_KEY);
    if (!raw) return { ...PEEK_DEFAULTS };
    return normalizePeek(JSON.parse(raw));
  } catch {
    return { ...PEEK_DEFAULTS };
  }
}

function savePeekConfig(config) {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(PEEK_STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch {
    return false;
  }
}

export function writePeekConfig(patch) {
  const next = normalizePeek({ ...readPeekConfig(), ...patch });
  savePeekConfig(next);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }));
  }
  return next;
}

export function resetPeekConfig() {
  const next = { ...PEEK_DEFAULTS };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(PEEK_STORAGE_KEY);
    } catch {
      /* 存不了就只改内存 */
    }
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }));
  }
  return next;
}

export function subscribePeekConfig(callback) {
  if (typeof window === 'undefined') return () => {};
  const onChange = (event) => callback(normalizePeek(event.detail));
  const onStorage = (event) => {
    if (event.key === PEEK_STORAGE_KEY) callback(readPeekConfig());
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

export function countPeekChanges(config) {
  return NUMBER_KEYS.filter((key) => config[key] !== PEEK_DEFAULTS[key]).length;
}
