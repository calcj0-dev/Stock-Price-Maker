// タイトル画面の「動くミニ盤」（オーナー 2026-11-20：タイトルを豪華に。案A）
// チュートリアルと同じ左右5人の行列で、値付け師が線をゆっくり上げ下げし、最後に一番まとまる値段で握手して「成立」を見せる。
// 音は鳴らさない。動きを減らす設定の端末では、止まった絵（つり合いの値段と組の線）だけを見せる

import { market } from '../data';
import { createBoard } from './board';

/** 線を動かす速さ（1歩の間隔ミリ秒と、1歩の値段） */
const STEP_MS = 28;
const STEP_YEN = 10;
/** 1回の流れ：高い所 → 安い所 → つり合いの値段で止まって握手 → 少し待って、はじめから */
const HOLD_MS = 500;
const AFTER_DEALS_MS = 1600;

export function titleDemo(): { el: HTMLElement; stop(): void } {
  const { tutorial, slider } = market;
  const board = createBoard(tutorial, { className: 'board--demo', avatar: true });
  let price = tutorial.start;
  let timer = 0;
  let stopped = false;

  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  board.setPrice(price);

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      timer = window.setTimeout(resolve, ms);
    });
  const moveTo = async (target: number) => {
    while (!stopped && price !== target) {
      price += price < target ? STEP_YEN : -STEP_YEN;
      board.setPrice(price);
      await wait(STEP_MS);
    }
  };

  const loop = async () => {
    // 画面に入って大きさが決まってから始める
    await wait(400);
    while (!stopped) {
      board.clearPairs();
      await moveTo(Math.min(slider.max, tutorial.answer + 250));
      await wait(HOLD_MS);
      await moveTo(Math.max(slider.min, tutorial.answer - 200));
      await wait(HOLD_MS);
      await moveTo(tutorial.answer);
      await wait(HOLD_MS);
      if (stopped) break;
      await board.playHandshakes(tutorial.answer);
      await wait(AFTER_DEALS_MS);
    }
  };

  if (reduce) {
    board.setPrice(tutorial.answer);
    requestAnimationFrame(() => board.showPairs(tutorial.answer, false));
  } else {
    void loop();
  }

  return {
    el: board.el,
    stop() {
      stopped = true;
      clearTimeout(timer);
      board.skipHandshakes();
    },
  };
}
