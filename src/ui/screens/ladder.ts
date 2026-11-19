// S3 セリ（試作 案1：値段のはしご）と S4 答え合わせ
// 案C：前の日の位置から行列が動いてから始まる。案H：練習の日は時間制限なしで手順を案内する
// 成立件数は「決める」まで出さない（決定 #2）。決めたら取引の組を線でつなぐ（案A）

import { createCountdown } from '../../core/countdown';
import { clampPrice } from '../../core/game';
import { volume } from '../../core/market';
import { config, market } from '../../data';
import { t, td, yen } from '../../i18n';
import { createBoard } from '../board';
import { button, h } from '../dom';
import { type ScreenView } from '../parts';
import type { AuctionProps } from './auction';

/** 練習の案内：上へ動かした → 下へ動かした → 決める */
const STEP_UP = 150;
const STEP_DOWN = 100;

export function ladderScreen(p: AuctionProps): ScreenView {
  const { slider } = market;
  const { day } = p;
  const practice = config.practiceDays.includes(day.day);
  const prevDay = market.days[day.day - 2];
  let price = clampPrice(p.startPrice, slider);
  let decided = false;
  let started = false;

  const board = createBoard(day, { markerKind: 'answer' });

  // ---- 上の帯（練習の日は時間の代わりに「練習」） ----
  const timeText = h('span', { className: 'time-left', text: practice ? t('practice.label') : '' });
  const timeBar = h('span', { className: 'time-bar__fill' });

  // ---- 目標の一言／練習の案内 ----
  const steps = [t('practice.step1'), t('practice.step2'), t('practice.step3')];
  let step = 0;
  let maxSeen = price;
  const goal = h('p', { className: practice ? 'goal goal--practice' : 'goal', text: practice ? steps[0] : t('play.goal') });
  const advance = () => {
    if (!practice) return;
    maxSeen = Math.max(maxSeen, price);
    if (step === 0 && price >= p.startPrice + STEP_UP) step = 1;
    else if (step === 1 && price <= maxSeen - STEP_DOWN) step = 2;
    goal.textContent = steps[step] ?? '';
  };

  // ---- 下の操作 ----
  const minus = button(t('play.minus'), () => setPrice(price - slider.fineStep), 'btn btn--fine');
  const plus = button(t('play.plus'), () => setPrice(price + slider.fineStep), 'btn btn--fine');
  const priceText = h('output', { className: 'ladder-price' });
  const decideBtn = button(t('play.decide'), () => doDecide(false), 'btn btn--main btn--decide');
  const controls = h('div', { className: 'ladder-controls' }, [h('div', { className: 'fine-row' }, [minus, priceText, plus]), decideBtn]);
  const sheet = h('section', { className: 'reveal reveal--flow', attrs: { hidden: '' } });

  const el = h('main', { className: `screen screen--ladder${practice ? ' practice' : ''}` }, [
    h('div', { className: 'auction-head' }, [
      h('span', { className: 'day-chip', text: t('play.day', { n: day.day }) }),
      h('span', { className: 'company', text: td(`company.${market.company}`) }),
      timeText,
    ]),
    practice ? null : h('div', { className: 'time-bar', attrs: { 'aria-hidden': 'true' } }, [timeBar]),
    goal,
    h('div', { className: 'board-head' }, [
      h('span', { className: 'board-head__buy', text: t('play.buyers') }),
      h('span', { className: 'board-head__sell', text: t('play.sellers') }),
    ]),
    board.el,
    controls,
    sheet,
  ]);

  const paint = () => {
    board.setPrice(price);
    priceText.textContent = t('play.price', { price: yen(price) });
    minus.disabled = decided || !started || price <= slider.min;
    plus.disabled = decided || !started || price >= slider.max;
    decideBtn.disabled = decided || !started;
  };
  function setPrice(next: number) {
    if (decided || !started) return;
    price = clampPrice(next, slider);
    paint();
    advance();
  }
  board.onDrag(setPrice);
  board.el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') setPrice(price + slider.step);
    else if (e.key === 'ArrowDown') setPrice(price - slider.step);
    else return;
    e.preventDefault();
  });

  // ---- 10秒（練習の日はなし。行列が動き終わってから数える） ----
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
    if (decided || practice || !started) return;
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

  // ---- 決める → 答え合わせ（組を線でつなぐ。正解の線を重ねる） ----
  function doDecide(timeout: boolean) {
    if (decided) return;
    decided = true;
    cancelAnimationFrame(raf);
    paint();
    board.setEnabled(false);
    el.classList.add('decided');
    if (timeout) timeText.textContent = t('play.timeUp');
    if (price !== day.answer) board.setMarker(day.answer);
    board.showPairs(price);

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

  // ---- 始まり：行列が前の日の位置から動く（案C）→ 10秒を数え始める ----
  paint();
  const begin = () => {
    started = true;
    paint();
    if (practice) return;
    countdown.start(performance.now());
    raf = requestAnimationFrame(tick);
  };
  if (!practice) timeText.textContent = t('play.timeLeft', { sec: config.timeLimitSec });
  if (prevDay) void board.slideFrom(prevDay, config.slideMs).then(begin);
  else begin();

  return {
    el,
    unmount() {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
