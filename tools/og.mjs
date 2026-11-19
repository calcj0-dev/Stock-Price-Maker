// tools/og.html を 1200×630 の PNG にして public/og-default.png に保存する
// 使い方：node tools/og.mjs（PC の Chrome と playwright-core が要る。npm i -D は不要：npx でも可）
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';

const html = new URL('./og.html', import.meta.url);
const out = fileURLToPath(new URL('../public/og-default.png', import.meta.url));
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.goto(html.href);
await p.screenshot({ path: out });
await b.close();
console.log('saved', out);
