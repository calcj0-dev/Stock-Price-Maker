// URL のカード画像（public/og-default.png、1200×630。設計書 6章：決まった画像1枚。画像生成は使わない）を作る
// 豪華版（オーナー 2026-11-20）：取引所の夜のような濃い背景に、電光掲示板の看板・握手を終えた盤・大きな値付け師・
// 遊び方の特徴・5つの銘柄が流れる帯。絵と文字はゲームの本物（タイトル画面の部品と ja.json・market.json）から作る
// 使い方：npm run build → npx vite preview --port 4173 を別に動かしてから node tools/og.mjs [出力先.png]
//（PC の Chrome と playwright-core が要る）
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const out = process.argv[2] ?? fileURLToPath(new URL('../public/og-default.png', import.meta.url));
const url = process.argv[3] ?? 'http://localhost:4173/';
const ja = JSON.parse(fs.readFileSync(new URL('../src/data/i18n/ja.json', import.meta.url), 'utf8'));
const market = JSON.parse(fs.readFileSync(new URL('../src/data/market.json', import.meta.url), 'utf8'));
const texts = {
  tagline: ja.app.tagline,
  companies: market.scenarios.map((s) => ja.company[s.id]),
  // カードだけの短い特徴（オーナー確認 2026-11-20）
  chips: [`銘柄${market.scenarios.length}つ`, '10秒で値付け', '無料・登録なし'],
  foot: '会社とニュースは架空です',
};

const b = await chromium.launch({ channel: 'chrome' });
// ミニ盤は画面の幅で描かれるので、カードに置く大きさで開いて、握手が終わるのを待つ
const p = await b.newPage({ viewport: { width: 470, height: 1200 }, deviceScaleFactor: 1 });
await p.goto(url);
await p.addStyleTag({
  content: `
    .board--demo { height: 360px !important; --fig-scale: 1.3 !important; --axis: 86px; }
    .board--demo .rung__price { font-size: 20px; }
    .board--demo .tick span { font-size: 13px; }
    .board--demo .price-line { border-top-width: 5px; }
    .board--demo .price-line__label { font-size: 24px; padding: 4px 14px; }
    .board--demo .nitsuke { visibility: hidden; }
    .board--demo .deal-count { font-size: 24px; }
    .board--demo .pair-lines path { stroke-width: 2.5; }
  `,
});
await p.waitForSelector('.board--demo .deal-count--final', { timeout: 20000 });
await p.evaluate((tx) => {
  const sign = document.querySelector('.led-sign');
  const board = document.querySelector('.board--demo');
  const nit = document.querySelector('.board--demo .nitsuke');
  const defs = document.querySelector('svg #fig-hl')?.closest('svg');
  if (!sign || !board || !nit || !defs) throw new Error('title parts not found');
  const box = board.getBoundingClientRect();
  const boardClone = board.cloneNode(true);
  boardClone.style.width = `${box.width}px`;
  boardClone.style.height = `${box.height}px`;
  const nitClone = nit.cloneNode(true);
  nitClone.className = 'nitsuke nitsuke--hold og-nit';
  nitClone.removeAttribute('style');
  const signClone = sign.cloneNode(true);
  signClone.querySelector('.led-sign__ticker')?.remove();
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  };
  document.body.className = 'og';
  document.body.innerHTML = '';
  document.body.append(defs);
  const stage = el('div', 'og-stage');
  const left = el('div', 'og-left');
  left.append(el('div', 'og-burst'), boardClone);
  const right = el('div', 'og-right');
  const chips = el('div', 'og-chips');
  for (const c of tx.chips) chips.append(el('span', 'og-chip', c));
  right.append(el('p', 'og-tag', tx.tagline), chips, nitClone);
  stage.append(left, right);
  const ticker = el('div', 'og-ticker', tx.companies.map((c) => `${c}　？円`).join('　◆　'));
  document.body.append(signClone, stage, ticker, el('p', 'og-foot', tx.foot));
  const style = document.createElement('style');
  style.textContent = `
    body.og { margin: 0; width: 1200px; height: 630px; overflow: hidden; position: relative; box-sizing: border-box; padding: 24px 44px 0;
      background:
        radial-gradient(ellipse 45% 55% at 24% 66%, rgb(255 170 60 / 0.28), transparent 70%),
        radial-gradient(ellipse 45% 50% at 82% 40%, rgb(60 200 140 / 0.18), transparent 70%),
        linear-gradient(rgb(255 255 255 / 0.04) 1px, transparent 1px) 0 0 / 30px 30px,
        linear-gradient(90deg, rgb(255 255 255 / 0.04) 1px, transparent 1px) 0 0 / 30px 30px,
        linear-gradient(160deg, #1d1b33 0%, #121119 55%, #22160f 100%);
      font-family: system-ui, "Hiragino Sans", "Noto Sans JP", sans-serif; }
    .og .led-sign { padding: 14px 20px 16px; border-radius: 18px;
      box-shadow: 0 10px 40px rgb(0 0 0 / 0.5), inset 0 0 0 3px #4a4235, 0 0 0 2px rgb(255 180 60 / 0.45), 0 0 40px rgb(255 160 40 / 0.25); }
    .og .led-sign__name { font-size: 64px; letter-spacing: 0.04em; }
    .og-stage { display: grid; grid-template-columns: 430px 1fr; gap: 40px; margin-top: 20px; align-items: start; }
    .og-left { position: relative; }
    .og-left .board { position: relative; width: 430px !important; box-shadow: 0 16px 40px rgb(0 0 0 / 0.55), 0 0 0 3px rgb(255 255 255 / 0.14); }
    .og-burst { position: absolute; left: 50%; top: 52%; width: 380px; height: 380px; transform: translate(-50%, -50%); border-radius: 50%;
      background: radial-gradient(circle, rgb(255 210 90 / 0.5), rgb(255 160 40 / 0.12) 45%, transparent 70%); }
    .og-left .deal-count { background: #ffb43c; border-color: #ffb43c; color: #1f1d1a; box-shadow: 0 0 18px rgb(255 180 60 / 0.9); }
    .og-right { position: relative; color: #fff; padding-top: 8px; min-height: 380px; }
    .og-tag { margin: 0; font-size: 28px; line-height: 1.6; font-weight: 700; color: #f4efe6; max-width: 600px; }
    .og-chips { display: flex; gap: 12px; margin-top: 22px; }
    .og-chip { padding: 8px 18px; border-radius: 999px; background: rgb(255 255 255 / 0.08); border: 2px solid rgb(111 227 168 / 0.85); color: #9df0c6; font-size: 22px; font-weight: 800;
      box-shadow: 0 0 14px rgb(60 220 140 / 0.35); }
    .og-nit { position: absolute !important; right: 40px; top: 168px; width: 118px; height: 194px; transform: none !important; color: #f4efe6; filter: drop-shadow(0 6px 14px rgb(0 0 0 / 0.6)); }
    .og-ticker { position: absolute; left: 0; right: 0; bottom: 30px; padding: 8px 0; white-space: nowrap; overflow: hidden; text-align: center;
      background: rgb(0 0 0 / 0.55); border-top: 1px solid #3a352d; border-bottom: 1px solid #3a352d;
      color: #6fe3a8; font-size: 22px; font-weight: 800; text-shadow: 0 0 8px rgb(60 220 140 / 0.8); }
    .og-foot { position: absolute; right: 44px; bottom: 5px; margin: 0; font-size: 15px; color: rgb(255 255 255 / 0.6); }
  `;
  document.head.append(style);
}, texts);
await p.setViewportSize({ width: 1200, height: 630 });
await p.waitForTimeout(300);
await p.screenshot({ path: out });
await b.close();
console.log('saved', out);
