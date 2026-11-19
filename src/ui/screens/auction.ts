// S3 セリ（値段のはしご。オーナー 2026-11-19 決定）と S4 答え合わせ
// 案C：前の日の位置から行列が動いてから始まる（10秒は動き終わってから数える）
// 成立件数は「決める」まで出さない（決定 #2）。決めたら取引の組を線でつなぐ（案A）

import { cue } from '../../audio';
import { createCountdown } from '../../core/countdown';
import { clampPrice } from '../../core/game';
import { volume, type Day, type Judge } from '../../core/market';
import { config, market } from '../../data';
import { t, td, yen } from '../../i18n';
import { createBoard } from '../board';
import { button, h } from '../dom';
import { soundButton, type ScreenView } from '../parts';

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
  const prevDay = market.days[day.day - 2];
  let price = clampPrice(p.startPrice, slider);
  let decided = false;
  let started = false;

  const board = createBoard(day, { markerKind: 'answer' });

  const timeText = h('span', { className: 'time-left', text: t('play.timeLeft', { sec: config.timeLimitSec }) });
  const timeBar = h('span', { className: 'time-bar__fill' });

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
      soundButton(),
    ]),
    h('div', { className: 'time-bar', attrs: { 'aria-hidden': 'true' } }, [timeBar]),
    h('p', { className: 'goal', text: t('play.goal') }),
    h('div', { className: 'board-head' }, [
      h('span', { className: 'board-head__buy', text: t('play.buyers') }),
      h('span', { className: 'board-head__sell', text: t('play.sellers') }),
    ]),
    board.el,
    controls,
    sheet,
  ]);

  // 光る人が変わったときだけ「ポッ」
  let glowKey = '';
  const paint = () => {
    board.setPrice(price);
    const g = volume(day, price);
    const key = `${g.buyers}-${g.sellers}`;
    if (glowKey && key !== glowKey && !decided) cue('glow');
    glowKey = key;
    priceText.textContent = t('play.price', { price: yen(price) });
    minus.disabled = decided || !started || price <= slider.min;
    plus.disabled = decided || !started || price >= slider.max;
    decideBtn.disabled = decided || !started;
  };
  function setPrice(next: number) {
    if (decided || !started) return;
    price = clampPrice(next, slider);
    paint();
  }
  board.onDrag(setPrice);
  board.el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') setPrice(price + slider.step);
    else if (e.key === 'ArrowDown') setPrice(price - slider.step);
    else return;
    e.preventDefault();
  });

  // ---- 10秒（行列が動き終わってから数える） ----
  const countdown = createCountdown(config.timeLimitSec);
  const limitMs = config.timeLimitSec * 1000;
  let raf = 0;
  let lastTick = 0;
  const tick = () => {
    const now = performance.now();
    const left = countdown.remainingMs(now);
    timeText.textContent = t('play.timeLeft', { sec: Math.ceil(left / 1000) });
    timeBar.style.transform = `scaleX(${left / limitMs})`;
    el.classList.toggle('warn', left <= config.warnAtSec * 1000);
    // 残り3秒から1秒ごとに「チッ」
    const sec = Math.ceil(left / 1000);
    if (sec <= config.warnAtSec && sec > 0 && sec !== lastTick) {
      lastTick = sec;
      cue('tick');
    }
    if (countdown.expired(now)) {
      doDecide(true);
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  const onVisibility = () => {
    if (decided || !started) return;
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
    cue('decide');
    cue(judge === 'exact' ? 'exact' : 'miss', 0.45);
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
    countdown.start(performance.now());
    raf = requestAnimationFrame(tick);
  };
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
