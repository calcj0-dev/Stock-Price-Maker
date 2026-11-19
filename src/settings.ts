// 利用者の設定（効果音だけ。決定 #9：最初から鳴り、右上で消せる）。端末に保存する

import { loadSaved, save } from './storage';

type Listener = () => void;
const listeners = new Set<Listener>();

export const settings = {
  get sound(): boolean {
    return loadSaved().sound !== false;
  },
  set sound(v: boolean) {
    save({ sound: v });
    for (const fn of listeners) fn();
  },
};

/** 設定が変わったら呼ばれる（音のボタンの見た目を合わせるため）。戻り値で解除 */
export function onSettingsChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
