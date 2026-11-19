// T-07 データの検査（設計書 4章）：壊したデータで止まる
import { describe, expect, it } from 'vitest';
import { config, market, validateData, type GameConfig, type Market } from '../src/data';
import jaJson from '../src/data/i18n/ja.json';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const check = (m: Market = market, c: GameConfig = config, j: unknown = jaJson) => validateData(m, c, j);

describe('T-07 データの検査', () => {
  it('今のデータは OK', () => {
    expect(check()).toEqual([]);
  });
  it('人数が違うと止まる', () => {
    const m = clone(market);
    m.days[0]!.buyers.pop();
    expect(check(m).join()).toMatch(/buyers 9/);
  });
  it('正解が2つになると止まる', () => {
    const m = clone(market);
    // 1日目の 1,000円の買いたい人を 1,050円にすると、1,000〜1,050円で同じ件数になる
    m.days[0]!.buyers[6] = 1050;
    expect(check(m).join()).toMatch(/not unique/);
  });
  it('answer が計算と違うと止まる', () => {
    const m = clone(market);
    m.days[2]!.answer = 1130;
    expect(check(m).join()).toMatch(/answer 1130/);
  });
  it('maxVolume・totalMaxVolume が違うと止まる', () => {
    const m = clone(market);
    m.days[3]!.maxVolume = 9;
    expect(check(m).join()).toMatch(/maxVolume 9/);
    expect(check(m).join()).toMatch(/totalMaxVolume/);
  });
  it('金額が範囲外・きざみ外だと止まる', () => {
    const m = clone(market);
    m.days[0]!.sellers[0] = 705;
    expect(check(m).join()).toMatch(/off the slider grid/);
  });
  it('日数が違うと止まる', () => {
    const m = clone(market);
    m.days.pop();
    expect(check(m).join()).toMatch(/days: expected 5/);
  });
  it('ニュースの文がないと止まる', () => {
    const j = clone(jaJson) as { news: Record<string, unknown> };
    delete j.news.d3;
    expect(check(market, config, j).join()).toMatch(/news\.d3\.headline missing/);
  });
  it('称号の文がないと止まる', () => {
    const j = clone(jaJson) as { titles: Record<string, unknown> };
    delete j.titles.t_pro;
    expect(check(market, config, j).join()).toMatch(/titles\.t_pro missing/);
  });
  it('点数の称号の最低が0でないと止まる', () => {
    const c = clone(config);
    c.titles = c.titles.filter((t) => !(t.rule === 'score' && t.min === 0));
    expect(check(market, c).join()).toMatch(/start at 0/);
  });
  it('まとめサイトのリンクが違うと止まる', () => {
    const c = clone(config);
    c.links.portal = 'https://example.com/';
    expect(check(market, c).join()).toMatch(/links\.portal/);
  });
  it("チュートリアルの正解が2つになると止まる", () => {
    const m = clone(market);
    m.tutorial.buyers[2] = 1050;
    expect(check(m).join()).toMatch(/tutorial: answer/);
  });
});
