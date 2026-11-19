// JSON のデータを読み込み、検査してから渡す窓口（設計書 4章・共通の決まり C5）
// 検査に通らなければ起動時に止める（T-07）。テストとビルドでも同じ検査を通す

import { findAnswer, type Day, type Slider, type TitleRule } from './core/market';
import configJson from './data/config.json';
import jaJson from './data/i18n/ja.json';
import marketJson from './data/market.json';

export type Market = { company: string; slider: Slider; totalMaxVolume: number; days: Day[] };
export type GameConfig = {
  timeLimitSec: number;
  warnAtSec: number;
  /** 時間制限なしの練習の日（1 始まり）。オーナー決定 2026-11-19：1日目だけ練習（案H） */
  practiceDays: number[];
  /** ニュースで行列が動く様子を見せる長さ（案C）。動き終わってから10秒を数える */
  slideMs: number;
  startTimerOn: string;
  onTimeout: string;
  reveal: { showGlowWhileDragging: boolean; showVolumeWhileDragging: boolean };
  titles: TitleRule[];
  sounds: Record<string, unknown>;
  hashtag: string;
  storageKey: string;
  links: { portal: string; tameru: string; tva: string; follow: string };
};
export type Messages = typeof jaJson;

const PEOPLE_PER_SIDE = 10;
const DAYS = 5;
const PORTAL_PREFIX = 'https://app-lab-rust.vercel.app';

/** 入れ子の文言を "news.d1.headline" の形で引く。なければ undefined */
export function lookup(messages: unknown, path: string): string | undefined {
  let cur: unknown = messages;
  for (const k of path.split('.')) {
    if (typeof cur !== 'object' || cur === null || !(k in cur)) return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return typeof cur === 'string' ? cur : undefined;
}

/** 設計書 4章の検査。問題を文の配列で返す（空なら OK） */
export function validateData(market: Market, config: GameConfig, messages: unknown): string[] {
  const errors: string[] = [];
  const { slider } = market;
  const onGrid = (v: number) => Number.isInteger(v) && v >= slider.min && v <= slider.max && (v - slider.min) % slider.step === 0;

  if (!onGrid(slider.startDay1)) errors.push(`slider.startDay1 ${slider.startDay1} is off the slider grid`);
  if (market.days.length !== DAYS) errors.push(`days: expected ${DAYS}, got ${market.days.length}`);
  if (lookup(messages, `company.${market.company}`) === undefined) errors.push(`company ${market.company} has no text`);

  market.days.forEach((d, i) => {
    const tag = `day ${i + 1}`;
    if (d.day !== i + 1) errors.push(`${tag}: day number is ${d.day}`);
    if (d.buyers.length !== PEOPLE_PER_SIDE) errors.push(`${tag}: buyers ${d.buyers.length}`);
    if (d.sellers.length !== PEOPLE_PER_SIDE) errors.push(`${tag}: sellers ${d.sellers.length}`);
    for (const v of [...d.buyers, ...d.sellers]) if (!onGrid(v)) errors.push(`${tag}: price ${v} is off the slider grid`);
    const r = findAnswer(d, slider);
    if (r.prices.length !== 1) errors.push(`${tag}: answer is not unique (${r.prices.join(',')})`);
    if (r.prices[0] !== d.answer) errors.push(`${tag}: answer ${d.answer} but computed ${r.prices.join(',')}`);
    if (r.max !== d.maxVolume) errors.push(`${tag}: maxVolume ${d.maxVolume} but computed ${r.max}`);
    for (const k of ['headline', 'body']) {
      if (lookup(messages, `news.${d.news}.${k}`) === undefined) errors.push(`${tag}: news.${d.news}.${k} missing`);
    }
    if (lookup(messages, `reasons.${d.news}`) === undefined) errors.push(`${tag}: reasons.${d.news} missing`);
  });

  const total = market.days.reduce((a, d) => a + d.maxVolume, 0);
  if (total !== market.totalMaxVolume) errors.push(`totalMaxVolume ${market.totalMaxVolume} but sum is ${total}`);

  for (const t of config.titles) if (lookup(messages, `titles.${t.id}`) === undefined) errors.push(`titles.${t.id} missing`);
  const mins = config.titles.flatMap((t) => (t.rule === 'score' ? [t.min] : []));
  if (mins.length === 0 || Math.min(...mins) !== 0) errors.push('score titles must start at 0');

  if (!config.links.portal.startsWith(PORTAL_PREFIX)) errors.push(`links.portal must start with ${PORTAL_PREFIX}`);
  for (const d of config.practiceDays) if (!market.days.some((x) => x.day === d)) errors.push(`practiceDays: no day ${d}`);
  if (!(config.slideMs >= 0)) errors.push('slideMs out of range');
  if (!(config.timeLimitSec > 0) || !(config.warnAtSec > 0 && config.warnAtSec < config.timeLimitSec)) errors.push('timeLimitSec / warnAtSec out of range');

  return errors;
}

export const market = marketJson as Market;
export const config = configJson as GameConfig;
/** 言語ごとの文言。言語を足すときは JSON を作ってここに1行足す（C6） */
export const messagesByLocale = { ja: jaJson } satisfies Record<string, Messages>;

const errors = validateData(market, config, jaJson);
if (errors.length > 0) throw new Error(`data check failed:\n${errors.join('\n')}`);
