// 値段のはしごの盤（案1）。セリの画面と、結果画面の「正解を見る」で使う
// 真ん中に縦の値段の目盛り。人（顔）は自分の希望額の高さに置く。線より上の買いたい人・線より下の売りたい人が光る
// 目盛りは5日とも同じ（ニュースで行列が上下に動いて見える）

import { glow, pairs, type Day } from '../core/market';

/** 盤に必要なのは行列だけ（本番の日も、チュートリアルの行列も使える） */
export type BoardQueue = Pick<Day, 'buyers' | 'sellers'>;
import { market } from '../data';
import { t, yen } from '../i18n';
import { h } from './dom';
import { face } from './parts';

const TICK = 100;
const SVG_NS = 'http://www.w3.org/2000/svg';

export type Board = {
  el: HTMLElement;
  /** 線を動かし、光る人を描き直す */
  setPrice(price: number): void;
  /** もう1本の線（答え合わせでは正解、結果画面ではあなたの値段） */
  setMarker(price: number | null): void;
  /** 取引の組を線でつなぎ、あぶれた人を示す（案A）。描いた組の数を返す */
  showPairs(price: number, animate?: boolean): number;
  /** 前の日の位置から今日の位置へ動かす（案C） */
  slideFrom(prev: BoardQueue, ms: number): Promise<void>;
  /** 組の線を消す */
  clearPairs(): void;
  /** 片側だけ目立たせる（チュートリアル）。null で元に戻す */
  focus(side: 'buy' | 'sell' | null): void;
  /** 指で動かしたときの値段（範囲内・刻みは呼ぶ側で） */
  onDrag(fn: (price: number) => void): void;
  setEnabled(on: boolean): void;
};

export function createBoard(day: BoardQueue, opts: { className?: string; markerKind?: 'answer' | 'mine' } = {}): Board {
  const lo = market.slider.min;
  const hi = market.slider.max;
  const pos = (v: number) => ((hi - v) / (hi - lo)) * 100;

  const rung = (side: 'buy' | 'sell', v: number) => {
    const f = face(side);
    const num = h('span', { className: 'rung__price', text: yen(v) });
    const el = h('div', { className: `rung rung--${side}`, attrs: { style: `top:${pos(v)}%` } }, side === 'buy' ? [num, f] : [f, num]);
    return { el, f };
  };
  const buys = day.buyers.map((v) => rung('buy', v));
  const sells = day.sellers.map((v) => rung('sell', v));

  const ticks: HTMLElement[] = [];
  for (let v = Math.ceil((lo + 1) / TICK) * TICK; v < hi; v += TICK) {
    ticks.push(h('div', { className: 'tick', attrs: { style: `top:${pos(v)}%` } }, [h('span', { text: yen(v) })]));
  }

  const lineLabel = h('span', { className: 'price-line__label' });
  const line = h('div', { className: 'price-line' }, [lineLabel]);
  const markerLabel = h('span');
  const marker = h('div', { className: `marker-line marker-line--${opts.markerKind ?? 'answer'}`, attrs: { hidden: '' } }, [markerLabel]);
  const buyZone = h('div', { className: 'zone zone--buy' });
  const sellZone = h('div', { className: 'zone zone--sell' });
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'pair-lines');
  svg.setAttribute('aria-hidden', 'true');

  const el = h('div', { className: `board ${opts.className ?? ''}` }, [
    buyZone,
    sellZone,
    ...ticks,
    svg as unknown as HTMLElement,
    ...buys.map((x) => x.el),
    ...sells.map((x) => x.el),
    marker,
    line,
  ]);

  let enabled = true;
  let dragFn: ((p: number) => void) | null = null;

  const board: Board = {
    el,
    setPrice(price) {
      const g = glow(day, price);
      buys.forEach((x, i) => x.el.classList.toggle('on', g.buyers[i] === true));
      sells.forEach((x, i) => x.el.classList.toggle('on', g.sellers[i] === true));
      const y = `${pos(price)}%`;
      line.style.top = y;
      buyZone.style.height = y;
      sellZone.style.top = y;
      lineLabel.textContent = t('play.price', { price: yen(price) });
    },
    setMarker(price) {
      marker.hidden = price === null;
      if (price === null) return;
      marker.style.top = `${pos(price)}%`;
      markerLabel.textContent = t('play.price', { price: yen(price) });
    },
    clearPairs() {
      for (const x of [...buys, ...sells]) x.el.classList.remove('alone', 'paired');
      svg.replaceChildren();
    },
    focus(side) {
      el.classList.toggle('focus-buy', side === 'buy');
      el.classList.toggle('focus-sell', side === 'sell');
    },
    showPairs(price, animate = true) {
      svg.classList.toggle('pair-lines--static', !animate);
      board.clearPairs();
      const r = pairs(day, price);
      for (const i of r.aloneBuyers) buys[i]?.el.classList.add('alone');
      for (const i of r.aloneSellers) sells[i]?.el.classList.add('alone');
      const box = el.getBoundingClientRect();
      const center = (f: HTMLElement) => {
        const b = f.getBoundingClientRect();
        return { x: b.left + b.width / 2 - box.left, y: b.top + b.height / 2 - box.top };
      };
      svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
      svg.replaceChildren();
      r.pairs.forEach(([bi, si], k) => {
        const bf = buys[bi]?.f;
        const sf = sells[si]?.f;
        if (!bf || !sf) return;
        const a = center(bf);
        const b = center(sf);
        const path = document.createElementNS(SVG_NS, 'path');
        // 直線でつなぐ（オーナー 2026-11-19）
        path.setAttribute('d', `M${a.x},${a.y} L${b.x},${b.y}`);
        path.setAttribute('pathLength', '1');
        path.style.animationDelay = `${k * 90}ms`;
        svg.append(path);
        buys[bi]?.el.classList.add('paired');
        sells[si]?.el.classList.add('paired');
      });
      return r.pairs.length;
    },
    slideFrom(prev, ms) {
      if (ms <= 0) return Promise.resolve();
      buys.forEach((x, i) => (x.el.style.top = `${pos(prev.buyers[i] ?? day.buyers[i]!)}%`));
      sells.forEach((x, i) => (x.el.style.top = `${pos(prev.sellers[i] ?? day.sellers[i]!)}%`));
      el.classList.add('sliding');
      el.style.setProperty('--slide-ms', `${ms}ms`);
      return new Promise((resolve) => {
        // 1フレーム描いてから今日の位置へ（動きを見せる）
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            buys.forEach((x, i) => (x.el.style.top = `${pos(day.buyers[i]!)}%`));
            sells.forEach((x, i) => (x.el.style.top = `${pos(day.sellers[i]!)}%`));
            setTimeout(() => {
              el.classList.remove('sliding');
              resolve();
            }, ms);
          }),
        );
      });
    },
    onDrag(fn) {
      dragFn = fn;
      el.classList.add('board--drag');
      el.setAttribute('role', 'slider');
      el.setAttribute('tabindex', '0');
    },
    setEnabled(on) {
      enabled = on;
      el.classList.toggle('board--off', !on);
    },
  };

  // 指で線を動かす（盤のどこを触っても、その高さの値段になる）
  const fromPointer = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    dragFn?.(hi - ratio * (hi - lo));
  };
  let dragging = false;
  el.addEventListener('pointerdown', (e) => {
    if (!dragFn || !enabled) return;
    dragging = true;
    el.setPointerCapture(e.pointerId);
    fromPointer(e);
  });
  el.addEventListener('pointermove', (e) => dragging && enabled && fromPointer(e));
  const stop = () => {
    dragging = false;
  };
  el.addEventListener('pointerup', stop);
  el.addEventListener('pointercancel', stop);

  return board;
}
