// 端末への保存（設計書 5.3：保存するのは音の設定だけ。キーは config.json の storageKey）
// 保存できない環境（プライベートブラウズなど）では初期値で動く

import { config } from './data';

type Saved = { sound?: boolean };

function read(): Saved {
  try {
    const raw = globalThis.localStorage?.getItem(config.storageKey);
    const v: unknown = raw ? JSON.parse(raw) : {};
    return typeof v === 'object' && v !== null ? (v as Saved) : {};
  } catch {
    return {};
  }
}

export function loadSaved(): Saved {
  return read();
}

export function save(patch: Saved): void {
  try {
    globalThis.localStorage?.setItem(config.storageKey, JSON.stringify({ ...read(), ...patch }));
  } catch {
    // 保存できなくても遊べるようにする
  }
}
