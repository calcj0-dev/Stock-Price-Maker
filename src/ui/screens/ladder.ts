// S3 セリ（試作 案1：値段のはしご）。真ん中に縦の値段の目盛り、人は自分の希望額の高さに置く
// 「今の値段」の横線を指で上下に動かす。線より上の買いたい人・線より下の売りたい人が光る
// 成立件数は「決める」まで出さない（決定 #2）。目盛りは5日とも同じ（ニュースで行列が上下に動いて見える）

import { createCountdown } from '../../core/countdown';
import { clampPrice } from '../../core/game';
import { glow, volume } from '../../core/market';
import { config, market } from '../../data';
import { t, td, yen } from '../../i18n';
import { button, h } from '../dom';
import { person, type ScreenView } from '../parts';
import type { AuctionProps } from './auction';

const TICK = 100;

export function ladderScreen(p: AuctionProps): ScreenView {
  const { slider } = market;
  const { day } = p;
  const lo = slider.min;
  const hi = slider.max;
  /** 値段 → 上からの位置（%） */
  const pos = (v: number) => ((hi - v) / (hi - lo)) * 100;
  let price = clampPrice(p.startPrice, slider);
  let decided = false;

  // ---- 人（希望額の高さに置く） ----
  const chip = (side: 'buy' | 'sell', v: number) =>
    h('div', { className: `rung rung--${side}`, attrs: { style: `top:${pos(v)}%` } }, [
      side === 'buy' ? h('span', { className: 'rung__price', text: yen(v) }) : person(side),
      side === 'buy' ? person(side) : h('span', { className: 'rung__price', text: yen(v) }),
    ]);
  const buyChips = day.buyers.map((v) => chip('buy', v));
  const sellChips = day.sellers.map((v) => chip('sell', v));

  // ---- 目盛り ----
  const ticks: HTMLElement[] = [];
  for (let v = Math.ceil((lo + 1) / TICK) * TICK; v < hi; v += TICK) {
    ticks.push(h('div', { className: 'tick', attrs: { style: `top:${pos(v)}%` } }, [h('span', { text: yen(v) })]));
  }

  // ---- 今の値段の線（指で動かす）と、光る側の色の帯 ----
  const lineLabel = h('span', { className: 'price-line__label' });
  const line = h('div', { className: 'price-line' }, [lineLabel]);
  const buyZone = h('div', { className: 'zone zone--buy' });
  const sellZone = h('div', { className: 'zone zone--sell' });
  const answerLine = h('div', { className: 'answer-line', attrs: { hidden: '', style: `top:${pos(day.answer)}%` } }, [
    h('span', { text: t('play.price', { price: yen(day.answer) }) }),
  ]);

  const board = h('div', { className: 'board', attrs: { role: 'slider', tabindex: '0', 'aria-valuemin': String(lo), 'aria-valuemax': String(hi) } }, [
    buyZone,
    sellZone,
    ...ticks,
    ...buyChips,
    ...sellChips,
    answerLine,
    line,
  ]);

  // ---- 上の帯 ----
  const timeText = h('span', { className: 'time-left' });
  const timeBar = h('span', { className: 'time-bar__fill' });

  // ---- 下の操作 ----
  const minus = button(t('play.minus'), () => setPrice(price - slider.fineStep), 'btn btn--fine');
  const plus = button(t('play.plus'), () => setPrice(price + slider.fineStep), 'btn btn--fine');
  const priceText = h('output', { className: 'ladder-price' });
  const decideBtn = button(t('play.decide'), () => doDecide(false), 'btn btn--main btn--decide');
  const controls = h('div', { className: 'ladder-controls' }, [h('div', { className: 'fine-row' }, [minus, priceText, plus]), decideBtn]);
  const sheet = h('section', { className: 'reveal reveal--flow', attrs: { hidden: '' } });

  const el = h('main', { className: 'screen screen--ladder' }, [
    h('div', { className: 'auction-head' }, [
      h('span', { className: 'day-chip', text: t('play.day', { n: day.day }) }),
      h('span', { className: 'company', text: td(`company.${market.company}`) }),
      timeText,
    ]),
    h('div', { className: 'time-bar', attrs: { 'aria-hidden': 'true' } }, [timeBar]),
    h('p', { className: 'goal', text: t('play.goal') }),
    h('div', { className: 'board-head' }, [
      h('span', { className: 'board-head__buy', text: t('play.buyers') }),
      h('span', { className: 'board-head__sell', text: t('play.sellers') }),
    ]),
    board,
    controls,
    sheet,
  ]);

  const paint = () => {
    const g = glow(day, price);
    buyChips.forEach((c, i) => c.classList.toggle('on', g.buyers[i] === true));
    sellChips.forEach((c, i) => c.classList.toggle('on', g.sellers[i] === true));
    const y = `${pos(price)}%`;
    line.style.top = y;
    buyZone.style.height = y;
    sellZone.style.top = y;
    const label = t('play.price', { price: yen(price) });
    lineLabel.textContent = label;
    priceText.textContent = label;
    board.setAttribute('aria-valuenow', String(price));
    board.setAttribute('aria-valuetext', label);
    minus.disabled = decided || price <= lo;
    plus.disabled = decided || price >= hi;
  };
  function setPrice(next: number) {
    if (decided) return;
    price = clampPrice(next, slider);
    paint();
  }

  // ---- 指で線を動かす（盤のどこを触っても、その高さの値段になる） ----
  const fromPointer = (e: PointerEvent) => {
    const r = board.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    setPrice(hi - ratio * (hi - lo));
  };
  let dragging = false;
  board.addEventListener('pointerdown', (e) => {
    if (decided) return;
    dragging = true;
    board.setPointerCapture(e.pointerId);
    fromPointer(e);
  });
  board.addEventListener('pointermove', (e) => dragging && fromPointer(e));
  const stop = () => {
    dragging = false;
  };
  board.addEventListener('pointerup', stop);
  board.addEventListener('pointercancel', stop);
  board.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') setPrice(price + slider.step);
    else if (e.key === 'ArrowDown') setPrice(price - slider.step);
    else return;
    e.preventDefault();
  });

  // ---- 10秒 ----
  const countdown = createCountdown(config.timeLimitSec);
  const limitMs = config.timeLimitSec * 1000;
  let raf = 0;
  const tick = () => {
    const now = performance.now();
    const left = countdown.remainingMs(now);
    timeText.textContent = t('play.timeLeft', { sec: Math.ceil(left / 1000) });
    timeBar.style.transform = `scaleX(${left / limitMs})`;
    el.classList.toggle('warn', left <= config.warnAtSec * 1000);
    if (countdown.expired(now)) {
      doDecide(true);
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  const onVisibility = () => {
    if (decided) return;
    const now = performance.now();
    if (document.hidden) {
      countdown.pause(now);
      cancelAnimationFrame(raf);
    } else {
      countdown.resume(now);
      raf = requestAnimationFrame(tick);
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  // ---- 決める → 答え合わせ（盤の下に出す。正解の線を盤に重ねる） ----
  function doDecide(timeout: boolean) {
    if (decided) return;
    decided = true;
    dragging = false;
    cancelAnimationFrame(raf);
    paint();
    el.classList.add('decided');
    if (timeout) timeText.textContent = t('play.timeUp');
    if (price !== day.answer) answerLine.hidden = false;

    const { judge } = p.onDecide({ price, timeout });
    sheet.replaceChildren(
      ...[
        timeout ? h('p', { className: 'reveal__timeup', text: t('play.timeUp') }) : null,
        h('p', { className: `reveal__judge reveal__judge--${judge}`, text: t(`reveal.${judge}`) }),
        h('p', { className: 'reveal__volume', text: t('reveal.volume', { n: volume(day, price).volume, max: day.maxVolume }) }),
        h('p', { className: 'reveal__answer', text: t('reveal.answer', { price: yen(day.answer) }) }),
        h('p', { className: 'reveal__reason', text: td(`reasons.${day.news}`, { prev: yen(p.prevAnswer ?? day.answer), answer: yen(day.answer) }) }),
        button(t(p.isLastDay ? 'reveal.toResult' : 'reveal.nextDay'), p.onNext, 'btn btn--main'),
      ].filter((x) => x !== null),
    );
    sheet.hidden = false;
  }

  paint();
  countdown.start(performance.now());
  raf = requestAnimationFrame(tick);

  return {
    el,
    unmount() {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}

