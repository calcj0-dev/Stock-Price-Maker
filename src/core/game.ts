// 5日の進み方と状態（設計書 5.3）。メモリの中だけで持つ

import { judge, volume, type Day, type Judge, type Slider } from './market';

export type Phase = 'news' | 'auction' | 'reveal' | 'result';
export type Game = {
  /** 0 始まりの日の番号 */
  day: number;
  prices: number[];
  volumes: number[];
  judges: Judge[];
  timeouts: boolean[];
  phase: Phase;
};

export function createGame(): Game {
  return { day: 0, prices: [], volumes: [], judges: [], timeouts: [], phase: 'news' };
}

/** つまみの始まり：1日目は startDay1、2日目からは前の日に自分が決めた値段（設計書 1.2・T-06） */
export function startPrice(game: Game, slider: Slider): number {
  return game.prices[game.day - 1] ?? slider.startDay1;
}

export function beginAuction(game: Game): void {
  if (game.phase !== 'news') throw new Error(`beginAuction in ${game.phase}`);
  game.phase = 'auction';
}

/** 値段を決める。時間切れのときも、その時点の値段でここを呼ぶ（onTimeout: decideCurrent） */
export function decide(game: Game, days: Day[], price: number, timeout = false): void {
  if (game.phase !== 'auction') throw new Error(`decide in ${game.phase}`);
  const d = days[game.day];
  if (!d) throw new Error(`no day ${game.day}`);
  game.prices.push(price);
  game.volumes.push(volume(d, price).volume);
  game.judges.push(judge(d, price));
  game.timeouts.push(timeout);
  game.phase = 'reveal';
}

/** 次の日へ。最後の日のあとは結果へ */
export function nextDay(game: Game, days: Day[]): void {
  if (game.phase !== 'reveal') throw new Error(`nextDay in ${game.phase}`);
  if (game.day + 1 >= days.length) {
    game.phase = 'result';
  } else {
    game.day += 1;
    game.phase = 'news';
  }
}

/** 値段をつまみの範囲と刻みに収める */
export function clampPrice(price: number, slider: Pick<Slider, 'min' | 'max' | 'step'>): number {
  const snapped = Math.round((price - slider.min) / slider.step) * slider.step + slider.min;
  return Math.min(slider.max, Math.max(slider.min, snapped));
}
