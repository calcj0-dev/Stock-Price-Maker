// data/market.json を確かめ、銘柄ごとに、よくある遊び方の点数と称号を出す。使い方：node sim/validate.mjs
import fs from 'node:fs';
import { volume, findAnswer, score, title } from './market.mjs';
const load = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf8'));
const M = load('../src/data/market.json'), C = load('../src/data/config.json'), J = load('../src/data/i18n/ja.json');
let ok = true;
for (const sc of M.scenarios) {
  console.log(`\n## ${J.company[sc.id]}（${sc.id}）`);
  const total = sc.days.reduce((a, d) => a + d.maxVolume, 0);
  for (const d of sc.days) {
    const r = findAnswer(d, M.slider);
    const good = r.prices.length === 1 && r.prices[0] === d.answer && r.max === d.maxVolume && d.buyers.length > 0 && d.sellers.length > 0;
    if (!good) ok = false;
    console.log(`${d.day}日目 買${d.buyers.length}人 売${d.sellers.length}人 正解 ${r.prices.join(',')}円 最大 ${r.max}組 ${good ? 'OK' : '★データと合わない'}`);
  }
  if (total !== sc.totalMaxVolume) { ok = false; console.log('★ totalMaxVolume が合わない'); }
  const ans = sc.days.map((d) => d.answer);
  const patterns = [
    ['5日とも正解', ans], ['1日目だけ50円ずれ', [ans[0] + 50, ...ans.slice(1)]], ['毎日50円ずれ', ans.map((a) => a + 50)],
    ['1日目の値段のまま', Array(5).fill(ans[0])], ['1日遅れ（前の日の正解のまま）', [M.slider.startDay1, ...ans.slice(0, 4)]],
    ['毎日100円安い', ans.map((a) => a - 100)], ['毎日100円高い', ans.map((a) => a + 100)],
  ];
  console.log(`\n満点 ${total}組\n\n| 遊び方 | 値段 | 成立した組 | 点数 | 称号 |\n| --- | --- | --- | --- | --- |`);
  for (const [name, prices] of patterns) {
    const v = sc.days.map((d, i) => volume(d, prices[i]).volume);
    const s = score(v, total);
    console.log(`| ${name} | ${prices.join('・')} | ${v.join('・')} | ${s} | ${J.titles[title(prices, v, s, C.titles)]} |`);
  }
}
console.log(ok ? '\nデータ：OK' : '\nデータ：問題あり'); process.exit(ok ? 0 : 1);
