// T-01〜T-04：計算が参照実装 sim/market.mjs と同じ結果になる
import { describe, expect, it } from 'vitest';
import * as ref from '../sim/market.mjs';
import { findAnswer, glow, judge, pairs, score, title, volume } from '../src/core/market';
import { config, market, scenarios } from '../src/data';
import jaJson from '../src/data/i18n/ja.json';

const neko = scenarios[0]!;
const days = neko.days;
const answers = days.map((d) => d.answer);

describe('T-01 正解の値段', () => {
  it.each(days)('$day 日目：findAnswer が answer・maxVolume と同じで、正解が1つ', (d) => {
    const r = findAnswer(d, market.slider);
    expect(r.prices).toEqual([d.answer]);
    expect(r.max).toBe(d.maxVolume);
  });
  it('正解は 1,000 → 1,060 → 1,120 → 1,040 → 980円、満点42組', () => {
    expect(answers).toEqual([1000, 1060, 1120, 1040, 980]);
    expect(neko.totalMaxVolume).toBe(42);
  });
});

describe('T-02 光る人と成立件数', () => {
  it('希望額ちょうどで光る', () => {
    const d = days[0]!;
    const g = glow(d, 1000);
    expect(g.buyers[d.buyers.indexOf(1000)]).toBe(true);
    expect(g.sellers[d.sellers.indexOf(1000)]).toBe(true);
    expect(glow(d, 1010).buyers[d.buyers.indexOf(1000)]).toBe(false);
    expect(glow(d, 990).sellers[d.sellers.indexOf(1000)]).toBe(false);
  });
  it.each(days)('$day 日目：正解±10円で件数が減る', (d) => {
    expect(volume(d, d.answer + 10).volume).toBeLessThan(d.maxVolume);
    expect(volume(d, d.answer - 10).volume).toBeLessThan(d.maxVolume);
  });
  it('すべての値段で参照実装と同じ', () => {
    for (const d of days) {
      for (let p = market.slider.min; p <= market.slider.max; p += market.slider.step) {
        expect(volume(d, p)).toEqual(ref.volume(d, p));
        expect(glow(d, p)).toEqual(ref.glow(d, p));
        expect(judge(d, p)).toBe(ref.judge(d, p));
      }
    }
  });
  it('評価：ぴったり／高すぎ／安すぎ', () => {
    const d = days[1]!;
    expect(judge(d, 1060)).toBe('exact');
    expect(judge(d, 1070)).toBe('tooHigh');
    expect(judge(d, 1050)).toBe('tooLow');
  });
});

describe('T-03 点数と称号（sim/validate_result.md の8通り）', () => {
  const cases: [string, number[], number[], number, string][] = [
    ['5日とも正解', answers, [7, 8, 8, 10, 9], 100, 't_legend'],
    ['毎日50円ずれ', answers.map((a) => a + 50), [6, 7, 7, 9, 8], 88, 't_novice'],
    ['毎日1,000円のまま', [1000, 1000, 1000, 1000, 1000], [7, 7, 6, 9, 8], 88, 't_still'],
    ['1日遅れ', [700, 1000, 1060, 1120, 1040], [1, 7, 7, 9, 8], 76, 't_lost'],
    ['ニュースと逆', [1000, 940, 880, 960, 1020], [7, 5, 2, 8, 8], 71, 't_lost'],
    ['安すぎ（毎日800円）', Array(5).fill(800), [3, 3, 2, 6, 6], 48, 't_still'],
    ['高すぎ（毎日1,400円）', Array(5).fill(1400), [0, 1, 3, 3, 0], 17, 't_still'],
    ['1日目だけ外す（950円）', [950, ...answers.slice(1)], [6, 8, 8, 10, 9], 98, 't_pro'],
  ];
  it.each(cases)('%s', (_name, prices, vols, sc, titleId) => {
    const v = days.map((d, i) => volume(d, prices[i]!).volume);
    expect(v).toEqual(vols);
    expect(score(v, neko.totalMaxVolume)).toBe(sc);
    expect(title(prices, v, sc, config.titles)).toBe(titleId);
    expect(title(prices, v, sc, config.titles)).toBe(ref.title(prices, v, sc, config.titles));
    expect(jaJson.titles[titleId as keyof typeof jaJson.titles]).toBeTruthy();
  });
});

describe('T-04 特別な称号が点数より先', () => {
  it('同じ値段の5日は、点数が高くても置物', () => {
    expect(title([1000, 1000, 1000, 1000, 1000], [7, 8, 9, 10, 9], 100, config.titles)).toBe('t_still');
  });
  it('0件の日があれば、点数に関係なく閑古鳥', () => {
    expect(title([1000, 1060, 1120, 1040, 1500], [7, 8, 9, 10, 0], 79, config.titles)).toBe('t_empty');
  });
  it('置物は閑古鳥より先', () => {
    expect(title(Array(5).fill(1600), [0, 0, 0, 0, 0], 0, config.titles)).toBe('t_still');
  });
  it('点数の区切り', () => {
    const p = [1000, 1060, 1120, 1040, 990];
    const v = [1, 1, 1, 1, 1];
    expect(title(p, v, 99, config.titles)).toBe('t_pro');
    expect(title(p, v, 94, config.titles)).toBe('t_novice');
    expect(title(p, v, 84, config.titles)).toBe('t_lost');
    expect(title(p, v, 49, config.titles)).toBe('t_chaos');
  });
});

describe('取引の組（案A）', () => {
  it('すべての値段で、組の数＝成立件数、あぶれた人＝光った人の多い方の余り', () => {
    for (const d of days) {
      for (let p = market.slider.min; p <= market.slider.max; p += market.slider.step) {
        const r = pairs(d, p);
        const v = volume(d, p);
        expect(r.pairs.length).toBe(v.volume);
        expect(r.aloneBuyers.length).toBe(v.buyers - v.volume);
        expect(r.aloneSellers.length).toBe(v.sellers - v.volume);
        for (const [b, s] of r.pairs) {
          expect(p).toBeLessThanOrEqual(d.buyers[b]!);
          expect(p).toBeGreaterThanOrEqual(d.sellers[s]!);
        }
      }
    }
  });
  it('線に近い人から組む', () => {
    const d = days[0]!;
    const r = pairs(d, 1000);
    // 1,000円で光る買いたい人のうち一番安い 1,000円の人と、売りたい人のうち一番高い 1,000円の人が最初の組
    expect(d.buyers[r.pairs[0]![0]]).toBe(1000);
    expect(d.sellers[r.pairs[0]![1]]).toBe(1000);
  });
});

describe('5つの銘柄（オーナー 2026-11-20）', () => {
  it('順番はネコマタ食品 → モグラ鉄道 → ポチポチゲームス → ミナト製薬 → ソヨカゼ電力', () => {
    expect(scenarios.map((s) => s.id)).toEqual(['nekomata', 'mogura', 'pochipochi', 'minato', 'soyokaze']);
  });
  it.each(scenarios)('$id：5日とも正解が1つで、answer・maxVolume と同じ', (sc) => {
    for (const d of sc.days) {
      const r = findAnswer(d, market.slider);
      expect(r.prices).toEqual([d.answer]);
      expect(r.max).toBe(d.maxVolume);
    }
  });
  it.each(scenarios)('$id：称号の出方がネコマタ食品と同じ考え方になる', (sc) => {
    const ans = sc.days.map((d) => d.answer);
    const play = (prices: number[]) => {
      const v = sc.days.map((d, i) => volume(d, prices[i]!).volume);
      const s = score(v, sc.totalMaxVolume);
      return { s, t: title(prices, v, s, config.titles) };
    };
    expect(play(ans)).toEqual({ s: 100, t: 't_legend' });
    expect(play([ans[0]! + 50, ...ans.slice(1)]).t).toBe('t_pro');
    expect(play(ans.map((a) => a + 50)).t).toBe('t_novice');
    expect(play(Array(5).fill(ans[0])).t).toBe('t_still');
  });
});
