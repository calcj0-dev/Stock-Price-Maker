// 文言の取り出し（共通の決まり C5・C6）。言語は起動時に1回だけ決める。公開時は常に ja

import { lookup, messagesByLocale, type Messages } from '../data';

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

/** 文言のキー（"play.decide" など）。存在しないキーはビルド時にエラーになる */
export type MessageKey = Leaves<Messages>;
export type Locale = keyof typeof messagesByLocale;
export type Vars = Record<string, string | number>;

let messages: Messages = messagesByLocale.ja;

export function setLocale(next: Locale): void {
  messages = messagesByLocale[next];
  if (typeof document !== 'undefined') document.documentElement.lang = next;
}

/** {name} の形の差し込みを置き換える。値がない差し込みはそのまま残す */
export function format(template: string, vars: Vars = {}): string {
  return template.replace(/\{(\w+)\}/g, (all, name: string) => (name in vars ? String(vars[name]) : all));
}

export function t(key: MessageKey, vars?: Vars): string {
  return format(lookup(messages, key) ?? key, vars);
}

/** データの ID から組み立てるキー（"news.d2.headline" など）。存在は読み込み時の検査で確かめている */
export function td(key: string, vars?: Vars): string {
  return format(lookup(messages, key) ?? key, vars);
}

/** 金額の表示（1,060 のように3桁ごとに区切る） */
export function yen(n: number): string {
  return n.toLocaleString('ja-JP');
}
