// URL のカード画像（public/og-default.png、1200×630。設計書 6章：決まった画像1枚。画像生成は使わない）を作る
// タイトル画面の本物の部品（電光掲示板風の看板と、動くミニ盤が握手を終えた所）を並べ直して撮る（オーナー 2026-11-20）
// 使い方：npm run build → npx vite preview --port 4173 を別に動かしてから node tools/og.mjs
//（PC の Chrome と playwright-core が要る）
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const out = fileURLToPath(new URL('../public/og-default.png', import.meta.url));
const url = process.argv[2] ?? 'http://localhost:4173/';

const b = await chromium.launch({ channel: 'chrome' });
// ミニ盤は画面の幅で描かれるので、カードの左半分と同じ幅の画面で開いて、握手が終わるのを待つ
const p = await b.newPage({ viewport: { width: 532, height: 1200 }, deviceScaleFactor: 1 });
await p.goto(url);
// カードでは盤を大きく描く（人の大きさと握手の位置は、この大きさで決まる）
await p.addStyleTag({
  content: `
    .board--demo { height: 520px !important; --fig-scale: 1.9 !important; --axis: 96px; }
    .board--demo .rung__price { font-size: 22px; }
    .board--demo .tick span { font-size: 14px; }
    .board--demo .price-line { border-top-width: 5px; }
    .board--demo .price-line__label { font-size: 26px; padding: 4px 16px; }
    .board--demo .nitsuke { width: 72px; height: 118px; }
    .board--demo .deal-count { font-size: 26px; }
    .board--demo .pair-lines path { stroke-width: 2.5; }
  `,
});
await p.waitForSelector('.board--demo .deal-count--final', { timeout: 20000 });
await p.evaluate(() => {
  const sign = document.querySelector('.led-sign');
  const board = document.querySelector('.board--demo');
  const tagline = document.querySelector('.title-tagline')?.textContent ?? '';
  const defs = document.querySelector('svg #fig-hl')?.closest('svg');
  if (!sign || !board || !defs) throw new Error('title parts not found');
  // 盤の線は画面の大きさで引かれているので、大きさを固定したまま置く
  const boardBox = board.getBoundingClientRect();
  const boardClone = board.cloneNode(true);
  boardClone.style.width = `${boardBox.width}px`;
  boardClone.style.height = `${boardBox.height}px`;
  const signClone = sign.cloneNode(true);
  document.body.className = 'og';
  document.body.innerHTML = '';
  document.body.append(defs);
  const left = document.createElement('div');
  left.className = 'og-left';
  left.append(boardClone);
  const right = document.createElement('div');
  right.className = 'og-right';
  const tag = document.createElement('p');
  tag.className = 'og-tag';
  tag.textContent = tagline;
  const foot = document.createElement('p');
  foot.className = 'og-foot';
  // 前のカードと同じ一言（オーナー確認済み 2026-11-19）
  foot.textContent = '無料のブラウザゲーム ・ 会社とニュースは架空です';
  right.append(signClone, tag, foot);
  document.body.append(left, right);
  const style = document.createElement('style');
  style.textContent = `
    body.og { margin: 0; width: 1200px; height: 630px; display: grid; grid-template-columns: 500px minmax(0, 1fr); align-items: center; gap: 40px; padding: 0 48px; box-sizing: border-box;
      background: linear-gradient(rgb(31 29 26 / 0.045) 1px, transparent 1px) 0 0 / 28px 28px, linear-gradient(90deg, rgb(31 29 26 / 0.045) 1px, transparent 1px) 0 0 / 28px 28px, #fff; }
    .og-left { width: 500px; }
    .og-left .board { box-shadow: 0 8px 28px rgb(0 0 0 / 0.12); }
    .og-right .led-sign { padding-top: 26px; }
    .og-right .led-sign__name { font-size: 54px; }
    .og-right .led-sign__track { animation: none; transform: translateX(-12%); }
    .og-right .led-sign__track span { font-size: 18px; }
    .og-tag { margin: 26px 0 0; font-size: 26px; line-height: 1.6; color: var(--text-sub); font-weight: 600; }
    .og-foot { margin: 18px 0 0; font-size: 20px; color: var(--text-sub); }
  `;
  document.head.append(style);
});
await p.setViewportSize({ width: 1200, height: 630 });
await p.waitForTimeout(300);
await p.screenshot({ path: out });
await b.close();
console.log('saved', out);
