// data/market.json を確かめ、よくある遊び方の点数と称号を出す。使い方：node validate.mjs
import fs from 'node:fs';
import { volume, findAnswer, score, title } from './market.mjs';
const load = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf8'));
const M = load('../src/data/market.json'), C = load('../src/data/config.json'), J = load('../src/data/i18n/ja.json');
let ok = true;
const total = M.days.reduce((a, d) => a + d.maxVolume, 0);
for (const d of M.days) {
  const r = findAnswer(d, M.slider);
  const good = r.prices.length === 1 && r.prices[0] === d.answer && r.max === d.maxVolume && d.buyers.length === 10 && d.sellers.length === 10;
  if (!good) ok = false;
  console.log(`${d.day}日目 正解 ${r.prices.join(',')}円 最大 ${r.max}件 ${good ? 'OK' : '★データと合わない'}`);
}
if (total !== M.totalMaxVolume) { ok = false; console.log('★ totalMaxVolume が合わない'); }
const ans = M.days.map((d) => d.answer);
const patterns = [
  ['5日とも正解', ans], ['毎日50円ずれ', ans.map((a) => a + 50)], ['毎日1,000円のまま', [1000, 1000, 1000, 1000, 1000]],
  ['1日遅れ（前の日の正解のまま）', [M.slider.startDay1, ...ans.slice(0, 4)]], ['ニュースと逆', [1000, 940, 880, 960, 1020]],
  ['安すぎ（毎日800円）', Array(5).fill(800)], ['高すぎ（毎日1,400円）', Array(5).fill(1400)], ['1日目だけ外す（950円）', [950, ...ans.slice(1)]],
];
console.log('\n| 遊び方 | 値段 | 成立件数 | 点数 | 称号 |\n| --- | --- | --- | --- | --- |');
for (const [name, prices] of patterns) {
  const v = M.days.map((d, i) => volume(d, prices[i]).volume);
  const sc = score(v, M.totalMaxVolume);
  console.log(`| ${name} | ${prices.join('・')} | ${v.join('・')} | ${sc} | ${J.titles[title(prices, v, sc, C.titles)]} |`);
}
console.log(ok ? '\nデータ：OK' : '\nデータ：問題あり'); process.exit(ok ? 0 : 1);
