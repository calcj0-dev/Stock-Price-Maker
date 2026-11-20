// 値段のはしごの盤（案1）。セリの画面・チュートリアル・結果画面の「正解を見る」で使う
// 真ん中に縦の値段の目盛り。人は自分の希望額の高さに置く。同じ値段の人は横に並ぶ（段。オーナー 2026-11-20）
// 線より上の買いたい人・線より下の売りたい人が光る。目盛りは5日とも同じ（ニュースで行列が上下に動いて見える）

import { glow, pairs, type Day } from '../core/market';
import { market } from '../data';
import { t, yen } from '../i18n';
import { h } from './dom';
import { figure, nitsukeshi } from './figures';

/** 盤に必要なのは行列だけ（本番の日も、チュートリアルの行列も使える） */
export type BoardQueue = Pick<Day, 'buyers' | 'sellers'>;

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

/** 段：同じ値段に並ぶ人のまとまり。値段の数字は段ごとに1つ */
type Level = { el: HTMLElement; price: number; faces: HTMLElement[]; first: number };
/** 1人ずつ（光る・組になる・あぶれるは人ごと） */
type Person = { level: Level; f: HTMLElement };

/** 段どうしの間が、この高さ（px）より狭いと人を小さくする（小さいスマホで重ならないように） */
const FIG_H = 26;
const FIG_MIN_SCALE = 0.55;
/** 値付け師の姿勢を「支える」に戻すまでの時間（ミリ秒） */
const POSE_IDLE_MS = 260;

export function createBoard(
  day: BoardQueue,
  opts: { className?: string; markerKind?: 'answer' | 'mine'; avatar?: boolean } = {},
): Board {
  const lo = market.slider.min;
  const hi = market.slider.max;
  const pos = (v: number) => ((hi - v) / (hi - lo)) * 100;

  const makeSide = (side: 'buy' | 'sell', prices: number[]) => {
    const levels = new Map<number, Level & { box: HTMLElement }>();
    const people: Person[] = prices.map((v, i) => {
      let lv = levels.get(v);
      if (!lv) {
        const num = h('span', { className: 'rung__price', text: yen(v) });
        const box = h('span', { className: 'rung__faces' });
        const el = h('div', { className: `rung rung--${side}`, attrs: { style: `top:${pos(v)}%` } }, side === 'buy' ? [num, box] : [box, num]);
        lv = { el, price: v, faces: [], first: i, box };
        levels.set(v, lv);
      }
      const f = figure(side);
      lv.box.append(f);
      lv.faces.push(f);
      return { level: lv, f };
    });
    return { levels: [...levels.values()], people };
  };
  const buy = makeSide('buy', day.buyers);
  const sell = makeSide('sell', day.sellers);
  const allLevels = () => [...buy.levels, ...sell.levels];
  const allPeople = () => [...buy.people, ...sell.people];

  const ticks: HTMLElement[] = [];
  for (let v = Math.ceil((lo + 1) / TICK) * TICK; v < hi; v += TICK) {
    ticks.push(h('div', { className: 'tick', attrs: { style: `top:${pos(v)}%` } }, [h('span', { text: yen(v) })]));
  }

  const lineLabel = h('span', { className: 'price-line__label' });
  // 見直し #4：チュートリアルを飛ばした人にも決まりが分かるよう、線のすぐ上と下に小さく書く
  const line = h('div', { className: 'price-line' }, [
    lineLabel,
    h('span', { className: 'line-hint line-hint--buy', text: t('play.hintBuy') }),
    h('span', { className: 'line-hint line-hint--sell', text: t('play.hintSell') }),
  ]);
  const markerLabel = h('span');
  const marker = h('div', { className: `marker-line marker-line--${opts.markerKind ?? 'answer'}`, attrs: { hidden: '' } }, [markerLabel]);
  const buyZone = h('div', { className: 'zone zone--buy' });
  const sellZone = h('div', { className: 'zone zone--sell' });
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'pair-lines');
  svg.setAttribute('aria-hidden', 'true');

  // 右端の値付け師（セリとチュートリアルだけ。結果画面の盤には出さない）
  const avatar = opts.avatar ? nitsukeshi() : null;

  const el = h('div', { className: `board ${opts.className ?? ''}${avatar ? ' board--avatar' : ''}` }, [
    buyZone,
    sellZone,
    ...ticks,
    svg as unknown as HTMLElement,
    ...allLevels().map((x) => x.el),
    marker,
    line,
    avatar?.el,
  ]);

  // 段どうしの一番狭い間（盤の高さに対する割合）から、人の大きさを決める
  const gapRatio = (() => {
    const v = [...new Set(day.buyers)].sort((a, b) => a - b);
    const w = [...new Set(day.sellers)].sort((a, b) => a - b);
    let g = Infinity;
    for (const list of [v, w]) for (let i = 1; i < list.length; i++) g = Math.min(g, list[i]! - list[i - 1]!);
    return Number.isFinite(g) ? g / (hi - lo) : 1;
  })();
  const fitFigures = () => {
    const px = el.clientHeight * gapRatio;
    if (px > 0) el.style.setProperty('--fig-scale', String(Math.max(FIG_MIN_SCALE, Math.min(1, px / FIG_H))));
  };
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fitFigures).observe(el);

  let lastPrice: number | null = null;
  let poseTimer = 0;

  let enabled = true;
  let dragFn: ((p: number) => void) | null = null;

  const board: Board = {
    el,
    setPrice(price) {
      // 同じ段の人は同じ値段なので、光るかどうかは段ごとに決まる
      const g = glow(day, price);
      for (const lv of buy.levels) lv.el.classList.toggle('on', g.buyers[lv.first] === true);
      for (const lv of sell.levels) lv.el.classList.toggle('on', g.sellers[lv.first] === true);
      const y = `${pos(price)}%`;
      line.style.top = y;
      buyZone.style.height = y;
      sellZone.style.top = y;
      lineLabel.textContent = t('play.price', { price: yen(price) });
      if (avatar) {
        avatar.el.style.top = y;
        // 上げている間は引き上げる、下げている間は押し下げる、止まったら支える
        if (lastPrice !== null && price !== lastPrice) {
          avatar.setPose(price > lastPrice ? 'pull' : 'push');
          clearTimeout(poseTimer);
          poseTimer = window.setTimeout(() => avatar.setPose('hold'), POSE_IDLE_MS);
        }
      }
      // 線が動き始めたら決まりのヒントを消す（その日の始めの案内として出す。人の数字に重ならないように）
      if (lastPrice !== null && price !== lastPrice) el.classList.add('touched');
      lastPrice = price;
    },
    setMarker(price) {
      marker.hidden = price === null;
      if (price === null) return;
      marker.style.top = `${pos(price)}%`;
      markerLabel.textContent = t('play.price', { price: yen(price) });
    },
    clearPairs() {
      for (const p of allPeople()) p.f.classList.remove('alone', 'paired');
      for (const lv of allLevels()) lv.el.classList.remove('alone');
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
      for (const i of r.aloneBuyers) buy.people[i]?.f.classList.add('alone');
      for (const i of r.aloneSellers) sell.people[i]?.f.classList.add('alone');
      // 段の全員があぶれたら、段の数字にも線を引く
      for (const lv of allLevels()) lv.el.classList.toggle('alone', lv.faces.every((f) => f.classList.contains('alone')));
      const box = el.getBoundingClientRect();
      const center = (f: HTMLElement) => {
        const b = f.getBoundingClientRect();
        return { x: b.left + b.width / 2 - box.left, y: b.top + b.height / 2 - box.top };
      };
      svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
      r.pairs.forEach(([bi, si], k) => {
        const bf = buy.people[bi]?.f;
        const sf = sell.people[si]?.f;
        if (!bf || !sf) return;
        const a = center(bf);
        const b = center(sf);
        const path = document.createElementNS(SVG_NS, 'path');
        // 直線でつなぐ（オーナー 2026-11-19）
        path.setAttribute('d', `M${a.x},${a.y} L${b.x},${b.y}`);
        path.setAttribute('pathLength', '1');
        path.style.animationDelay = `${k * 90}ms`;
        svg.append(path);
        bf.classList.add('paired');
        sf.classList.add('paired');
      });
      return r.pairs.length;
    },
    slideFrom(prev, ms) {
      if (ms <= 0) return Promise.resolve();
      // 前の日もいた人の段は前の位置から動く。新しく来た人の段はふわっと現れ、帰った人はすっと消える
      const stay = (levels: Level[], prevList: number[]) => {
        for (const lv of levels) {
          const v = prevList[lv.first];
          if (v === undefined) lv.el.classList.add('arrive');
          else lv.el.style.top = `${pos(v)}%`;
        }
      };
      stay(buy.levels, prev.buyers);
      stay(sell.levels, prev.sellers);
      const leaving = [
        ...makeSide('buy', prev.buyers.slice(day.buyers.length)).levels,
        ...makeSide('sell', prev.sellers.slice(day.sellers.length)).levels,
      ].map((x) => x.el);
      el.append(...leaving);
      el.classList.add('sliding');
      el.style.setProperty('--slide-ms', `${ms}ms`);
      return new Promise((resolve) => {
        // 1フレーム描いてから今日の位置へ（動きを見せる）
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            for (const lv of allLevels()) {
              lv.el.style.top = `${pos(lv.price)}%`;
              lv.el.classList.remove('arrive');
            }
            for (const g of leaving) g.classList.add('gone');
            setTimeout(() => {
              el.classList.remove('sliding');
              for (const g of leaving) g.remove();
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
