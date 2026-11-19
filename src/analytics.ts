// 計測（オーナー 2026-11-19：Vercel Analytics だけ。ページの表示回数を数える。GA4 とイベントは使わない）
// 公開版（ビルドしたもの）だけで動かす。開発中は数えない

import { inject } from '@vercel/analytics';

export function initAnalytics(): void {
  if (import.meta.env.PROD) inject({ mode: 'production', framework: 'vanilla' });
}
