// 参照実装の型（テストから読むため）
export function glow(day: { buyers: number[]; sellers: number[] }, price: number): { buyers: boolean[]; sellers: boolean[] };
export function volume(day: { buyers: number[]; sellers: number[] }, price: number): { volume: number; buyers: number; sellers: number };
export function judge(day: { answer: number }, price: number): string;
export function findAnswer(day: { buyers: number[]; sellers: number[] }, slider: { min: number; max: number; step: number }): { max: number; prices: number[] };
export function score(volumes: number[], totalMax: number): number;
export function title(prices: number[], volumes: number[], sc: number, titles: unknown[]): string;
