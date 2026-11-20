// URL のカード画像（public/og-default.png、1200×630。設計書 6章：決まった画像1枚。画像生成は使わない）を作る
// ゲームの本物の絵（立体の人・値付け師）を使うため、ビルドしたゲームを開き、その絵を並べ直して撮る
// 使い方：npm run build → npx vite preview --port 4173 を別に動かしてから node tools/og.mjs
//（PC の Chrome と playwright-core が要る）
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const out = fileURLToPath(new URL('../public/og-default.png', import.meta.url));
const url = process.argv[2] ?? 'http://localhost:4173/';

const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.goto(url);
await p.waitForSelector('.title-hero .fig');
await p.evaluate(() => {
  const fig = document.querySelector('.title-hero .fig');
  const nit = document.querySelector('.title-hero .nitsuke');
  const name = document.querySelector('.title-name')?.textContent ?? '';
  const tagline = document.querySelector('.title-tagline')?.textContent ?? '';
  const defs = document.querySelector('svg #fig-hl')?.closest('svg');
  if (!fig || !nit || !defs) throw new Error('figures not found');
  const person = (side, on) => {
    const wrap = document.createElement('span');
    wrap.className = `og-person${on ? ' on' : ''}`;
    const f = fig.cloneNode(true);
    f.className = `fig fig--${side}`;
    wrap.append(f);
    return wrap;
  };
  const row = (side, on, n, top) => {
    const r = document.createElement('div');
    r.className = `og-row og-row--${side}`;
    r.style.top = `${top}%`;
    for (let i = 0; i < n; i++) r.append(person(side, on));
    return r;
  };
  document.body.className = 'og';
  document.body.innerHTML = '';
  document.body.append(defs);
  const board = document.createElement('div');
  board.className = 'og-board';
  board.innerHTML = '<div class="og-zone og-zone--buy"></div><div class="og-zone og-zone--sell"></div><div class="og-line"></div><div class="og-pill">1,000円</div>';
  board.append(
    row('buy', true, 1, 14), row('buy', true, 2, 28), row('buy', true, 2, 41), row('buy', false, 1, 66), row('buy', false, 2, 80),
    row('sell', false, 1, 22), row('sell', false, 1, 36), row('sell', true, 2, 62), row('sell', true, 2, 76), row('sell', true, 1, 89),
  );
  const n = nit.cloneNode(true);
  n.className = 'nitsuke nitsuke--hold og-nit';
  board.append(n);
  const text = document.createElement('div');
  text.className = 'og-text';
  text.innerHTML = `<h1></h1><p class="og-tag"></p><p class="og-foot"></p>`;
  // 作品名は「株価を／決めるのは誰？」で折り返す（カードで読みやすいように）
  text.querySelector('h1').textContent = name.replace(/^(.+?を)/, '$1\n');
  // 前のカードと同じ一言（オーナー確認済み 2026-11-19）
  text.querySelector('.og-foot').textContent = '無料のブラウザゲーム ・ 会社とニュースは架空です';
  text.querySelector('.og-tag').textContent = tagline;
  document.body.append(board, text);
  const style = document.createElement('style');
  style.textContent = `
    body.og { margin: 0; width: 1200px; height: 630px; display: grid; grid-template-columns: 520px 1fr; align-items: center; gap: 48px; padding: 0 64px; box-sizing: border-box; background: #fff; }
    .og-board { position: relative; height: 520px; border-radius: 28px; background: var(--surface); overflow: hidden; --fig-scale: 2.1; }
    .og-zone { position: absolute; width: 44%; }
    .og-zone--buy { left: 0; top: 0; height: 52%; background: var(--buy-soft); }
    .og-zone--sell { right: 0; bottom: 0; height: 48%; background: var(--sell-soft); }
    .og-line { position: absolute; left: 0; right: 0; top: 52%; border-top: 6px solid var(--accent); }
    .og-pill { position: absolute; left: 50%; top: 52%; transform: translate(-50%, -50%); background: var(--accent); color: #fff; font-weight: 800; font-size: 32px; padding: 4px 20px; border-radius: 999px; }
    .og-row { position: absolute; display: flex; gap: 6px; transform: translateY(-60%); }
    .og-row--buy { right: 58%; flex-direction: row-reverse; }
    .og-row--sell { left: 58%; }
    .og-nit { right: 6px; top: 52%; width: 84px; height: 137px; }
    .og-text h1 { font-size: 74px; line-height: 1.2; margin: 0; white-space: pre-line; }
    .og-foot { margin: 32px 0 0; font-size: 22px; color: var(--text-sub); }
    .og-tag { margin: 28px 0 0; font-size: 30px; line-height: 1.6; color: var(--text-sub); font-weight: 600; }
  `;
  document.head.append(style);
});
await p.waitForTimeout(200);
await p.screenshot({ path: out });
await b.close();
console.log('saved', out);
