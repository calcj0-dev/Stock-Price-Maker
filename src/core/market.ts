// 計算（設計書 3章）。参照実装 sim/market.mjs と同じ結果にする（T-01〜T-04）
// 買いたい人：値段 ≤ 希望額 なら買う。売りたい人：値段 ≥ 希望額 なら売る。成立件数＝少ない方の人数

export type Slider = { min: number; max: number; step: number; fineStep: number; startDay1: number };
export type Day = {
  day: number;
  news: string;
  buyers: number[];
  sellers: number[];
  answer: number;
  maxVolume: number;
  move: string;
};
export type Judge = 'exact' | 'tooHigh' | 'tooLow';
export type TitleRule =
  | { id: string; priority: number; rule: 'samePriceAllDays' | 'zeroVolumeDay' }
  | { id: string; rule: 'score'; min: number };

export function glow(day: Pick<Day, 'buyers' | 'sellers'>, price: number): { buyers: boolean[]; sellers: boolean[] } {
  return {
    buyers: day.buyers.map((b) => price <= b),
    sellers: day.sellers.map((s) => price >= s),
  };
}

export function volume(day: Pick<Day, 'buyers' | 'sellers'>, price: number): { volume: number; buyers: number; sellers: number } {
  const b = day.buyers.filter((x) => price <= x).length;
  const s = day.sellers.filter((x) => price >= x).length;
  return { volume: Math.min(b, s), buyers: b, sellers: s };
}

/** 値段の評価：ぴったり／高すぎ（買いたい人が足りない）／安すぎ（売りたい人が足りない） */
export function judge(day: Pick<Day, 'answer'>, price: number): Judge {
  if (price === day.answer) return 'exact';
  return price > day.answer ? 'tooHigh' : 'tooLow';
}

/** 値段の範囲を全部調べて、一番多く成立する値段（データの確かめ用。画面では使わない） */
export function findAnswer(day: Pick<Day, 'buyers' | 'sellers'>, slider: Pick<Slider, 'min' | 'max' | 'step'>): { max: number; prices: number[] } {
  let best: number[] = [];
  let max = -1;
  for (let p = slider.min; p <= slider.max; p += slider.step) {
    const v = volume(day, p).volume;
    if (v > max) {
      max = v;
      best = [p];
    } else if (v === max) best.push(p);
  }
  return { max, prices: best };
}

export function score(volumes: number[], totalMax: number): number {
  return Math.round((volumes.reduce((a, b) => a + b, 0) / totalMax) * 100);
}

/** 称号：特別な称号（priority の小さい順）を先に見て、なければ点数の区切りで（設計書 1.6） */
export function title(prices: number[], volumes: number[], sc: number, titles: TitleRule[]): string {
  const special = titles
    .filter((t): t is Extract<TitleRule, { priority: number }> => 'priority' in t)
    .sort((a, b) => a.priority - b.priority);
  for (const t of special) {
    if (t.rule === 'samePriceAllDays' && prices.every((p) => p === prices[0])) return t.id;
    if (t.rule === 'zeroVolumeDay' && volumes.some((v) => v === 0)) return t.id;
  }
  const byScore = titles
    .filter((t): t is Extract<TitleRule, { rule: 'score' }> => t.rule === 'score')
    .sort((a, b) => b.min - a.min);
  const hit = byScore.find((t) => sc >= t.min);
  if (!hit) throw new Error('no score title matched');
  return hit.id;
}
