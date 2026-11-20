// S2 ニュース（設計書 2章・F-02）。「はじめる」で10秒が始まる

import type { Day } from '../../core/market';
import { market } from '../../data';
import { t, td, yen } from '../../i18n';
import { chartColors, drawHistory } from '../chart';
import { button, h } from '../dom';
import { cue } from '../../audio';
import { homeButton, soundButton, type ScreenView } from '../parts';

/** これまでの株価の目盛り（毎日同じ。先の値段の手がかりにならないように） */
const HISTORY_RANGE = { lo: 900, hi: 1200, step: 100 };

export function newsScreen(day: Day, onBegin: () => void, onHome: () => void): ScreenView {
  const prev = market.days[day.day - 2];
  // オーナー 2026-11-20：空白を埋め、結果画面の「株価チャート」が育っていく様子を途中から見せる
  const canvas = h('canvas', { className: 'history-chart', attrs: { role: 'img', 'aria-label': t('news.history') } });
  const history = h('section', { className: 'news-history' }, [
    h('h2', { text: t('news.history') }),
    canvas,
    prev ? h('p', { className: 'news-yesterday', text: t('news.yesterday', { price: yen(prev.answer) }) }) : null,
  ]);
  const el = h('main', { className: 'screen screen--news' }, [
    h('div', { className: 'top-bar top-bar--left' }, [homeButton(onHome, {}), h('span', { className: 'day-chip', text: t('play.day', { n: day.day }) }), h('span', { className: 'spacer' }), soundButton()]),
    h('article', { className: 'news-card' }, [
      h('p', { className: 'news-card__label', text: t('news.dayLabel', { n: day.day }) }),
      h('p', { className: 'news-card__company', text: td(`company.${market.company}`) }),
      h('h1', { className: 'news-card__headline', text: td(`news.${day.news}.headline`) }),
      h('p', { className: 'news-card__body', text: td(`news.${day.news}.body`) }),
    ]),
    // 見直し #5：昨日までの株価を出し、「今日は上がる？下がる？」と考えてから始められるようにする
    history,
    h('div', { className: 'news-progress', attrs: { 'aria-hidden': 'true' } },
      market.days.map((d) => h('span', { className: d.day < day.day ? 'done' : d.day === day.day ? 'now' : '' }))),
    button(t('news.startDay'), onBegin, 'btn btn--main'),
  ]);
  cue('news');
  const past = market.days.slice(0, day.day - 1).map((d) => d.answer);
  const css = getComputedStyle(document.documentElement);
  const paint = () =>
    drawHistory(canvas, past, market.days.length, HISTORY_RANGE, { ...chartColors(), today: css.getPropertyValue('--accent').trim() }, (n) => t('play.day', { n }));
  requestAnimationFrame(paint);
  window.addEventListener('resize', paint);
  return { el, unmount: () => window.removeEventListener('resize', paint) };
}
