// チュートリアル（オーナー 2026-11-19：1日目の練習の代わりに作る）
// 本番と同じ盤で、左右5人の行列を使って手順を案内する。時間制限なし
// 仕組みを覚えるため、チュートリアルの中だけは動かしている間も組の線と組の数を見せる（本番は決定 #2 のとおり隠す）

import { cue } from '../../audio';
import { clampPrice } from '../../core/game';
import { volume } from '../../core/market';
import { config, market } from '../../data';
import { t, yen, type MessageKey } from '../../i18n';
import { createBoard } from '../board';
import { button, h, linkButton } from '../dom';
import { soundButton, type ScreenView } from '../parts';

type Step = { text: MessageKey; kind: 'next' | 'drag' | 'decide' | 'end'; focus?: 'buy' | 'sell' };
const STEPS: Step[] = [
  { text: 'tutorial.role', kind: 'next' },
  { text: 'tutorial.buyers', kind: 'next', focus: 'buy' },
  { text: 'tutorial.sellers', kind: 'next', focus: 'sell' },
  { text: 'tutorial.drag', kind: 'drag' },
  { text: 'tutorial.pair', kind: 'decide' },
  { text: 'tutorial.real', kind: 'end' },
];
/** 「動かしてみよう」は、合わせてこの幅（円）を動かしたら次へ進める */
const DRAG_RANGE = 300;

export function tutorialScreen(onDone: () => void): ScreenView {
  const { slider, tutorial } = market;
  let price = clampPrice(tutorial.start, slider);
  let step = 0;
  let minSeen = price;
  let maxSeen = price;
  let solved = false;

  const board = createBoard(tutorial, { className: 'board--tutorial', avatar: true });
  const message = h('p', { className: 'tutorial-msg__text' });
  const sub = h('p', { className: 'tutorial-msg__sub' });
  const stepDots = h('div', { className: 'news-progress tutorial-dots', attrs: { 'aria-hidden': 'true' } }, STEPS.map(() => h('span')));
  const minus = button(t('play.minus'), () => setPrice(price - slider.fineStep), 'btn btn--fine');
  const plus = button(t('play.plus'), () => setPrice(price + slider.fineStep), 'btn btn--fine');
  const priceText = h('output', { className: 'ladder-price' });
  const fine = h('div', { className: 'fine-row' }, [minus, priceText, plus]);
  const main = button('', () => onMain(), 'btn btn--main');

  const el = h('main', { className: 'screen screen--ladder screen--tutorial' }, [
    h('div', { className: 'auction-head' }, [
      h('span', { className: 'day-chip', text: t('tutorial.heading') }),
      h('span', { className: 'tutorial-skip' }, [linkButton(t('tutorial.skip'), onDone)]),
      soundButton(),
    ]),
    h('div', { className: 'tutorial-msg' }, [message, sub]),
    h('div', { className: 'board-head' }, [
      h('span', { className: 'board-head__buy', text: t('play.buyers') }),
      h('span', { className: 'board-head__sell', text: t('play.sellers') }),
    ]),
    board.el,
    h('div', { className: 'ladder-controls' }, [fine, main, stepDots]),
  ]);

  const cur = () => STEPS[step] ?? STEPS[STEPS.length - 1]!;
  const canDrag = () => cur().kind === 'drag' || (cur().kind === 'decide' && !solved);

  const render = () => {
    const s = cur();
    board.focus(s.focus ?? null);
    board.setPrice(price);
    priceText.textContent = t('play.price', { price: yen(price) });
    const dragging = canDrag();
    fine.classList.toggle('is-off', !dragging);
    minus.disabled = !dragging || price <= slider.min;
    plus.disabled = !dragging || price >= slider.max;
    board.setEnabled(dragging);

    if (s.kind === 'drag') {
      const done = maxSeen - minSeen >= DRAG_RANGE;
      message.textContent = t(done ? 'tutorial.dragDone' : 'tutorial.drag');
      main.textContent = t('tutorial.next');
      main.disabled = !done;
    } else if (s.kind === 'decide') {
      const n = volume(tutorial, price).volume;
      board.showPairs(price, false);
      sub.textContent = t('tutorial.pairsNow', { n });
      if (solved) {
        message.textContent = t('tutorial.success', { n });
        main.textContent = t('tutorial.next');
      } else {
        main.textContent = t('play.decide');
      }
      main.disabled = false;
    } else {
      message.textContent = t(s.text, { sec: config.timeLimitSec });
      main.textContent = t(s.kind === 'end' ? 'tutorial.start' : 'tutorial.next');
      main.disabled = false;
    }
    if (s.kind !== 'decide') {
      sub.textContent = '';
      board.clearPairs();
    }
    [...stepDots.children].forEach((d, i) => (d.className = i < step ? 'done' : i === step ? 'now' : ''));
  };

  function setPrice(next: number) {
    if (!canDrag()) return;
    const before = volume(tutorial, price);
    price = clampPrice(next, slider);
    const after = volume(tutorial, price);
    if (before.buyers !== after.buyers || before.sellers !== after.sellers) cue('glow');
    minSeen = Math.min(minSeen, price);
    maxSeen = Math.max(maxSeen, price);
    // 前の手順の「もう一度」の文は、動かしたら元の案内に戻す
    if (cur().kind === 'decide' && !solved) message.textContent = t('tutorial.pair');
    render();
  }
  board.onDrag(setPrice);

  function onMain() {
    const s = cur();
    if (s.kind === 'end') return onDone();
    if (s.kind === 'decide' && !solved) {
      cue('decide');
      if (price === tutorial.answer) {
        cue('exact', 0.45);
        solved = true;
        render();
      } else {
        cue('miss', 0.45);
        message.textContent = t('tutorial.retry');
      }
      return;
    }
    step += 1;
    if (cur().kind === 'decide') message.textContent = t('tutorial.pair');
    render();
  }

  render();
  return { el };
}
