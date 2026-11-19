// S3 セリ と S4 答え合わせ（設計書 1.2・1.5・2章・5.7）
// 動かしている間は光る人だけ見せ、成立件数は「決める」まで出さない（決定 #2）

import { createCountdown } from '../../core/countdown';
import { clampPrice } from '../../core/game';
import { glow, volume, type Day, type Judge } from '../../core/market';
import { config, market } from '../../data';
import { t, td, yen } from '../../i18n';
import { button, h } from '../dom';
import { person, type ScreenView } from '../parts';

export type Decision = { price: number; timeout: boolean };
export type AuctionProps = {
  day: Day;
  /** 前の日の正解（仕組みの一言の {prev}）。1日目は undefined */
  prevAnswer: number | undefined;
  startPrice: number;
  isLastDay: boolean;
  onDecide: (d: Decision) => { judge: Judge };
  onNext: () => void;
};

export function auctionScreen(p: AuctionProps): ScreenView {
  const { slider } = market;
  const { day } = p;
  let price = clampPrice(p.startPrice, slider);
  let decided = false;

  // ---- 行列：買いたい人は高い順、売りたい人は安い順【案】（データがその順で並んでいる） ----
  const row = (side: 'buy' | 'sell', v: number) =>
    h('li', { className: `queue__row queue__row--${side}` }, [
      person(side),
      h('span', { className: 'bubble', text: t(side === 'buy' ? 'play.buyBubble' : 'play.sellBubble', { price: yen(v) }) }),
    ]);
  const buyRows = day.buyers.map((v) => row('buy', v));
  const sellRows = day.sellers.map((v) => row('sell', v));

  // ---- 上の帯 ----
  const timeText = h('span', { className: 'time-left' });
  const timeBar = h('span', { className: 'time-bar__fill' });

  // ---- 値段とつまみ ----
  const priceText = h('output', { className: 'price' });
  const range = h('input', {
    className: 'slider',
    attrs: { type: 'range', min: String(slider.min), max: String(slider.max), step: String(slider.step) },
  });
  const minus = button(t('play.minus'), () => setPrice(price - slider.fineStep), 'btn btn--fine');
  const plus = button(t('play.plus'), () => setPrice(price + slider.fineStep), 'btn btn--fine');
  const decideBtn = button(t('play.decide'), () => doDecide(false), 'btn btn--main btn--decide');
  const controls = h('div', { className: 'controls' }, [
    priceText,
    h('div', { className: 'slider-row' }, [minus, range, plus]),
    decideBtn,
  ]);
  const sheet = h('section', { className: 'reveal', attrs: { hidden: '' } });

  const el = h('main', { className: 'screen screen--auction' }, [
    h('div', { className: 'auction-head' }, [
      h('span', { className: 'day-chip', text: t('play.day', { n: day.day }) }),
      h('span', { className: 'company', text: td(`company.${market.company}`) }),
      timeText,
    ]),
    h('div', { className: 'time-bar', attrs: { 'aria-hidden': 'true' } }, [timeBar]),
    h('div', { className: 'queues' }, [
      h('section', { className: 'queue' }, [h('h2', { className: 'queue__title queue__title--buy', text: t('play.buyers') }), h('ol', {}, buyRows)]),
      h('section', { className: 'queue' }, [h('h2', { className: 'queue__title queue__title--sell', text: t('play.sellers') }), h('ol', {}, sellRows)]),
    ]),
    controls,
    sheet,
  ]);

  // ---- 光る人の描き直し（つまみを動かすたびにすぐ） ----
  const paint = () => {
    const g = glow(day, price);
    buyRows.forEach((r, i) => r.classList.toggle('on', g.buyers[i] === true));
    sellRows.forEach((r, i) => r.classList.toggle('on', g.sellers[i] === true));
    priceText.textContent = t('play.price', { price: yen(price) });
    range.value = String(price);
    range.setAttribute('aria-valuetext', priceText.textContent);
    minus.disabled = decided || price <= slider.min;
    plus.disabled = decided || price >= slider.max;
  };
  function setPrice(next: number) {
    if (decided) return;
    price = clampPrice(next, slider);
    paint();
  }
  range.addEventListener('input', () => setPrice(Number(range.value)));

  // ---- 10秒（「はじめる」を押してからこの画面が出るので、ここで数え始める） ----
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

  // ---- 決める → 答え合わせ（S4） ----
  function doDecide(timeout: boolean) {
    if (decided) return;
    decided = true;
    cancelAnimationFrame(raf);
    range.disabled = true;
    paint();
    el.classList.add('decided');
    if (timeout) timeText.textContent = t('play.timeUp');

    const { judge } = p.onDecide({ price, timeout });
    const v = volume(day, price).volume;
    sheet.replaceChildren(
      ...[
        timeout ? h('p', { className: 'reveal__timeup', text: t('play.timeUp') }) : null,
        h('p', { className: 'reveal__price', text: t('play.price', { price: yen(price) }) }),
        h('p', { className: `reveal__judge reveal__judge--${judge}`, text: t(`reveal.${judge}`) }),
        h('p', { className: 'reveal__volume', text: t('reveal.volume', { n: v, max: day.maxVolume }) }),
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
