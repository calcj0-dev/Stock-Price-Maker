// JSON のデータを読み込み、検査してから渡す窓口（設計書 4章・共通の決まり C5）
// 検査に通らなければ起動時に止める（T-07）。テストとビルドでも同じ検査を通す

import { findAnswer, type Day, type Slider, type TitleRule } from './core/market';
import configJson from './data/config.json';
import jaJson from './data/i18n/ja.json';
import marketJson from './data/market.json';

/** チュートリアルの行列（本番より少ない人数。オーナー 2026-11-19：練習の日の代わりにチュートリアル） */
export type Tutorial = { buyers: number[]; sellers: number[]; answer: number; maxVolume: number; start: number };
export type Market = { company: string; slider: Slider; totalMaxVolume: number; tutorial: Tutorial; days: Day[] };
export type GameConfig = {
  timeLimitSec: number;
  warnAtSec: number;
  /** ニュースで行列が動く様子を見せる長さ（案C）。動き終わってから10秒を数える */
  slideMs: number;
  startTimerOn: string;
  onTimeout: string;
  reveal: { showGlowWhileDragging: boolean; showVolumeWhileDragging: boolean };
  titles: TitleRule[];
  sounds: Record<string, unknown>;
  hashtag: string;
  storageKey: string;
  links: { portal: string; tameru: string; follow: string; vercelPrivacy: string; xIntent: string };
};
export type Messages = typeof jaJson;

/** 片側の人数の範囲（人数はニュースで変わる。オーナー 2026-11-19）。多すぎると盤が混み合う */
const PEOPLE_MIN = 1;
const PEOPLE_MAX = 14;
/** 同じ側の段（同じ値段のまとまり）どうしの最小の差（盤で重ならないように）。同じ値段の人は横に並ぶ（オーナー 2026-11-20） */
const MIN_GAP = 40;
/** 1つの段に並べられる人数（盤の幅に収まるように） */
const MAX_PER_LEVEL = 4;

function maxPerLevel(values: number[]): number {
  const n = new Map<number, number>();
  for (const v of values) n.set(v, (n.get(v) ?? 0) + 1);
  return Math.max(0, ...n.values());
}

function minGap(values: number[]): number {
  const v = [...new Set(values)].sort((a, b) => a - b);
  let g = Infinity;
  for (let i = 1; i < v.length; i++) g = Math.min(g, v[i]! - v[i - 1]!);
  return g;
}
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
    for (const [side, list] of [['buyers', d.buyers], ['sellers', d.sellers]] as const) {
      if (list.length < PEOPLE_MIN || list.length > PEOPLE_MAX) errors.push(`${tag}: ${side} ${list.length} people (allowed ${PEOPLE_MIN}-${PEOPLE_MAX})`);
      if (minGap(list) < MIN_GAP) errors.push(`${tag}: ${side} gap ${minGap(list)} < ${MIN_GAP}`);
      if (maxPerLevel(list) > MAX_PER_LEVEL) errors.push(`${tag}: ${side} ${maxPerLevel(list)} people at one price (max ${MAX_PER_LEVEL})`);
    }
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
  // チュートリアル：金額がつまみの刻みにあり、正解が1つに決まる
  const tu = market.tutorial;
  for (const v of [...tu.buyers, ...tu.sellers, tu.start]) if (!onGrid(v)) errors.push(`tutorial: price ${v} is off the slider grid`);
  const tr = findAnswer(tu, slider);
  if (tr.prices.length !== 1 || tr.prices[0] !== tu.answer || tr.max !== tu.maxVolume) {
    errors.push(`tutorial: answer ${tu.answer}/${tu.maxVolume} but computed ${tr.prices.join(',')}/${tr.max}`);
  }
  if (!(config.slideMs >= 0)) errors.push('slideMs out of range');
  if (!(config.timeLimitSec > 0) || !(config.warnAtSec > 0 && config.warnAtSec < config.timeLimitSec)) errors.push('timeLimitSec / warnAtSec out of range');

  return errors;
}

/** 作品のURL（環境変数 VITE_SITE_URL。設計書 5.1）。未設定なら今のページのURL */
export function siteUrl(): string {
  const v = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
  if (v) return v;
  return typeof location === 'undefined' ? '' : location.origin + location.pathname;
}

export const market = marketJson as Market;
export const config = configJson as GameConfig;
/** 言語ごとの文言。言語を足すときは JSON を作ってここに1行足す（C6） */
export const messagesByLocale = { ja: jaJson } satisfies Record<string, Messages>;

const errors = validateData(market, config, jaJson);
if (errors.length > 0) throw new Error(`data check failed:\n${errors.join('\n')}`);
