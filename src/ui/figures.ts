// 人の絵（オーナー 2026-11-20：立体の棒人間＋右端の値付け師が株価の札を押したり引いたりする）
// 画像生成は使わず、SVG を手で描く。立体に見せる影と光は、全体で1回だけ置く <defs> のグラデーションを重ねる
// 盤の人：胸像（頭と肩）。光ると手を挙げて笑顔、光っていない人は腕を組んで困り顔、組めなかった人は真顔
// 値付け師：全身。指で動かしている向きで姿勢が変わる（上げる＝引き上げる、下げる＝押し下げる、止まる＝支える）

import { h } from './dom';

const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
<radialGradient id="fig-hl" cx="0.36" cy="0.32" r="0.75"><stop offset="0" stop-color="#fff" stop-opacity="0.75"/><stop offset="0.45" stop-color="#fff" stop-opacity="0.12"/><stop offset="1" stop-color="#000" stop-opacity="0.22"/></radialGradient>
<linearGradient id="fig-shade" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.35"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.3"/></linearGradient>
<linearGradient id="fig-limb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0.3"/><stop offset="1" stop-color="#000" stop-opacity="0.25"/></linearGradient>
</defs></svg>`;

/** グラデーションを文書に1回だけ置く（起動時に呼ぶ） */
export function installFigureDefs(): void {
  if (document.getElementById('fig-hl')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = DEFS;
  const svg = wrap.firstElementChild;
  if (svg) document.body.prepend(svg);
}

const BODY = 'M3 28 C3 19.5 7 16.5 12 16.5 C17 16.5 21 19.5 21 28 Z';
const BUST = `<svg viewBox="0 0 24 28" class="fig__svg" aria-hidden="true">
<g class="fig__arm-up"><path d="M6.2 19.5 L3 8.5" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/><path d="M6.2 19.5 L3 8.5" stroke="url(#fig-limb)" stroke-width="3.4" stroke-linecap="round"/><circle cx="3" cy="7.6" r="2.2" fill="currentColor"/><circle cx="3" cy="7.6" r="2.2" fill="url(#fig-hl)"/></g>
<path d="${BODY}" fill="currentColor"/><path d="${BODY}" fill="url(#fig-shade)"/>
<circle cx="12" cy="9" r="6.6" fill="currentColor"/><circle cx="12" cy="9" r="6.6" fill="url(#fig-hl)"/>
<circle class="fig__eye" cx="9.7" cy="8.5" r="0.95"/><circle class="fig__eye" cx="14.3" cy="8.5" r="0.95"/>
<path class="fig__mouth fig__mouth--smile" d="M9.4 11.1 Q12 13.7 14.6 11.1"/>
<path class="fig__mouth fig__mouth--frown" d="M9.6 12.9 Q12 10.7 14.4 12.9"/>
<path class="fig__mouth fig__mouth--flat" d="M9.7 12 H14.3"/>
<g class="fig__arms-crossed"><rect x="4.6" y="21" width="14.8" height="3.6" rx="1.8" fill="currentColor"/><rect x="4.6" y="21" width="14.8" height="3.6" rx="1.8" fill="#000" opacity="0.18"/></g>
</svg>`;

/** 盤の人（胸像）。side で色と向きが変わる。表情と腕は CSS の on・alone で切り替える */
export function figure(side: 'buy' | 'sell'): HTMLElement {
  const el = h('span', { className: `fig fig--${side}`, attrs: { 'aria-hidden': 'true' } });
  el.innerHTML = BUST;
  return el;
}

// 値付け師（全身）。左を向き、両手で株価の札の右端を持つ。手の高さ（y=34）が線の高さに来るように置く
const ARMS = {
  hold: '<path d="M25 24 L12 33 L3 34" /><path d="M25 25 L14 35 L4 36" />',
  pull: '<path d="M25 24 L14 27 L3 31" /><path d="M25 25 L15 29 L4 33" />',
  push: '<path d="M25 22 L15 30 L3 37" /><path d="M25 23 L16 32 L4 39" />',
};
const NITSUKESHI = `<svg viewBox="0 0 44 72" class="nitsuke__svg" aria-hidden="true">
<g class="nitsuke__body">
<path d="M25 46 L19 70" stroke="currentColor" stroke-width="4.6" stroke-linecap="round"/><path d="M25 46 L32 70" stroke="currentColor" stroke-width="4.6" stroke-linecap="round"/>
<path d="M25 46 L19 70" stroke="url(#fig-limb)" stroke-width="4.6" stroke-linecap="round"/><path d="M25 46 L32 70" stroke="url(#fig-limb)" stroke-width="4.6" stroke-linecap="round"/>
<path d="M18 26 C18 21 21 19.5 25 19.5 C29 19.5 32 21 32 26 L31 47 L19 47 Z" fill="currentColor"/>
<path d="M18 26 C18 21 21 19.5 25 19.5 C29 19.5 32 21 32 26 L31 47 L19 47 Z" fill="url(#fig-shade)"/>
<g class="nitsuke__arms" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
<g class="nitsuke__pose nitsuke__pose--hold">${ARMS.hold}</g>
<g class="nitsuke__pose nitsuke__pose--pull">${ARMS.pull}</g>
<g class="nitsuke__pose nitsuke__pose--push">${ARMS.push}</g>
</g>
<circle cx="25" cy="11" r="7.6" fill="currentColor"/><circle cx="25" cy="11" r="7.6" fill="url(#fig-hl)"/>
<path d="M17.6 8.6 Q25 5.8 32.4 8.6 L32.4 11 Q25 8.4 17.6 11 Z" class="nitsuke__band"/>
<path d="M32 9.5 L37 7.5 L36 11 Z" class="nitsuke__band"/>
<circle cx="21.6" cy="12.6" r="1" fill="#fff"/><path d="M19.6 15.6 Q21.6 16.8 23.6 15.4" fill="none" stroke="#fff" stroke-width="1.1" stroke-linecap="round"/>
</g>
</svg>`;

export type Pose = 'hold' | 'pull' | 'push';

/** 値付け師。setPose で姿勢を変える */
export function nitsukeshi(): { el: HTMLElement; setPose(p: Pose): void } {
  const el = h('div', { className: 'nitsuke nitsuke--hold', attrs: { 'aria-hidden': 'true' } });
  el.innerHTML = NITSUKESHI;
  let cur: Pose = 'hold';
  return {
    el,
    setPose(p) {
      if (p === cur) return;
      el.classList.replace(`nitsuke--${cur}`, `nitsuke--${p}`);
      cur = p;
    },
  };
}
