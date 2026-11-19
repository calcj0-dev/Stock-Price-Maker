// 計算の参照実装（実装の core/ はこれと同じ結果にする）。数字はすべて ../data の JSON から
// 買いたい人：値段 ≤ 希望額 なら買う。売りたい人：値段 ≥ 希望額 なら売る。成立件数＝少ない方の人数

export function glow(day, price) {
  const buyers = day.buyers.map((b) => price <= b);
  const sellers = day.sellers.map((s) => price >= s);
  return { buyers, sellers };
}
export function volume(day, price) {
  const b = day.buyers.filter((x) => price <= x).length;
  const s = day.sellers.filter((x) => price >= x).length;
  return { volume: Math.min(b, s), buyers: b, sellers: s };
}
// 値段の評価：ぴったり／高すぎ（買いたい人が足りない）／安すぎ（売りたい人が足りない）
export function judge(day, price) {
  if (price === day.answer) return 'exact';
  return price > day.answer ? 'tooHigh' : 'tooLow';
}
// 値段の範囲を全部調べて、一番多く成立する値段（データの確かめ用）
export function findAnswer(day, slider) {
  let best = [], max = -1;
  for (let p = slider.min; p <= slider.max; p += slider.step) {
    const v = volume(day, p).volume;
    if (v > max) { max = v; best = [p]; } else if (v === max) best.push(p);
  }
  return { max, prices: best };
}
export function score(volumes, totalMax) {
  return Math.round(volumes.reduce((a, b) => a + b, 0) / totalMax * 100);
}
// 称号：特別な称号（priority の小さい順）を先に見て、なければ点数の区切りで
export function title(prices, volumes, sc, titles) {
  const special = titles.filter((t) => t.priority).sort((a, b) => a.priority - b.priority);
  for (const t of special) {
    if (t.rule === 'samePriceAllDays' && prices.every((p) => p === prices[0])) return t.id;
    if (t.rule === 'zeroVolumeDay' && volumes.some((v) => v === 0)) return t.id;
  }
  const byScore = titles.filter((t) => t.rule === 'score').sort((a, b) => b.min - a.min);
  return byScore.find((t) => sc >= t.min).id;
}
