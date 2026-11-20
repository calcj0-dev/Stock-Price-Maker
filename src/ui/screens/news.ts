// S2 ニュース（設計書 2章・F-02）。「はじめる」で10秒が始まる

import type { Day } from '../../core/market';
import type { Scenario } from '../../data';
import { t, td, yen } from '../../i18n';
import { chartColors, drawHistory } from '../chart';
import { button, h } from '../dom';
import { cue } from '../../audio';
import { homeButton, soundButton, type ScreenView } from '../parts';

/**
 * これまでの株価の目盛り。銘柄ごとに、5日分の株価が収まる範囲（上下50円の余白をとって100円単位）で、5日とも同じにする
 * （先の値段の手がかりにならないように。ネコマタ食品は 900〜1,200円）
 */
function historyRange(sc: Scenario) {
  const a = sc.days.map((d) => d.answer);
  return { lo: Math.floor((Math.min(...a) - 50) / 100) * 100, hi: Math.ceil((Math.max(...a) + 50) / 100) * 100, step: 100 };
}

export function newsScreen(day: Day, sc: Scenario, onBegin: () => void, onHome: () => void): ScreenView {
  const prev = sc.days[day.day - 2];
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
      h('p', { className: 'news-card__company', text: td(`company.${sc.id}`) }),
      h('h1', { className: 'news-card__headline', text: td(`news.${sc.id}.${day.news}.headline`) }),
      h('p', { className: 'news-card__body', text: td(`news.${sc.id}.${day.news}.body`) }),
    ]),
    // 見直し #5：昨日までの株価を出し、「今日は上がる？下がる？」と考えてから始められるようにする
    history,
    h('div', { className: 'news-progress', attrs: { 'aria-hidden': 'true' } },
      sc.days.map((d) => h('span', { className: d.day < day.day ? 'done' : d.day === day.day ? 'now' : '' }))),
    button(t('news.startDay'), onBegin, 'btn btn--main'),
  ]);
  cue('news');
  const past = sc.days.slice(0, day.day - 1).map((d) => d.answer);
  const css = getComputedStyle(document.documentElement);
  const paint = () =>
    drawHistory(canvas, past, sc.days.length, historyRange(sc), { ...chartColors(), today: css.getPropertyValue('--accent').trim() }, (n) => t('play.day', { n }));
  requestAnimationFrame(paint);
  window.addEventListener('resize', paint);
  return { el, unmount: () => window.removeEventListener('resize', paint) };
}
