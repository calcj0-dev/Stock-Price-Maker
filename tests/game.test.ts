// T-05 時間切れ・T-06 つまみの始まり・5日の進み方
import { describe, expect, it } from 'vitest';
import { createCountdown } from '../src/core/countdown';
import { beginAuction, clampPrice, createGame, decide, nextDay, startPrice } from '../src/core/game';
import { config, market, scenarios } from '../src/data';

const days = scenarios[0]!.days;

describe('T-05 10秒の時間切れ', () => {
  it('10秒で時間切れになる', () => {
    const c = createCountdown(config.timeLimitSec);
    c.start(0);
    expect(c.expired(9999)).toBe(false);
    expect(c.remainingMs(7000)).toBe(3000);
    expect(c.expired(10000)).toBe(true);
    expect(c.remainingMs(12000)).toBe(0);
  });
  it('止めている間は数えない（画面が裏に回ったとき）', () => {
    const c = createCountdown(10);
    c.start(0);
    c.pause(4000);
    c.resume(60000);
    expect(c.remainingMs(61000)).toBe(5000);
    expect(c.expired(65999)).toBe(false);
    expect(c.expired(66000)).toBe(true);
  });
  it('時間切れは、その時点の値段で決めたことにする', () => {
    const g = createGame();
    beginAuction(g);
    decide(g, days, 950, true);
    expect(g.prices).toEqual([950]);
    expect(g.timeouts).toEqual([true]);
    expect(g.volumes).toEqual([6]);
  });
});

describe('T-06 つまみの始まり', () => {
  it('1日目は startDay1、2日目からは前の日に決めた値段', () => {
    const g = createGame();
    expect(startPrice(g, market.slider)).toBe(market.slider.startDay1);
    beginAuction(g);
    decide(g, days, 1030);
    nextDay(g, days);
    expect(startPrice(g, market.slider)).toBe(1030);
  });
});

describe('5日の進み方', () => {
  it('ニュース → セリ → 答え合わせ を5回で結果', () => {
    const g = createGame();
    for (const d of days) {
      expect(g.phase).toBe('news');
      beginAuction(g);
      decide(g, days, d.answer);
      expect(g.phase).toBe('reveal');
      nextDay(g, days);
    }
    expect(g.phase).toBe('result');
    expect(g.volumes).toEqual([7, 8, 8, 10, 9]);
    expect(g.judges).toEqual(['exact', 'exact', 'exact', 'exact', 'exact']);
  });
  it('値段は範囲と10円きざみに収まる', () => {
    expect(clampPrice(1234, market.slider)).toBe(1230);
    expect(clampPrice(100, market.slider)).toBe(500);
    expect(clampPrice(9999, market.slider)).toBe(1600);
  });
});


describe('銘柄ごとの1日目の始まり（オーナー 2026-11-20）', () => {
  it('どの銘柄も、1日目の正解から同じだけ（300円）安い所から始まる', () => {
    for (const sc of scenarios) {
      const g = createGame();
      const s = startPrice(g, market.slider, sc.startDay1);
      expect(sc.days[0]!.answer - s).toBe(300);
    }
  });
});
