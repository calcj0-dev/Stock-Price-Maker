// S2 ニュース（設計書 2章・F-02）。「はじめる」で10秒が始まる

import type { Day } from '../../core/market';
import { market } from '../../data';
import { t, td, yen } from '../../i18n';
import { button, h } from '../dom';
import { cue } from '../../audio';
import { soundButton, type ScreenView } from '../parts';

export function newsScreen(day: Day, onBegin: () => void): ScreenView {
  const prev = market.days[day.day - 2];
  const el = h('main', { className: 'screen screen--news' }, [
    h('div', { className: 'top-bar top-bar--left' }, [h('span', { className: 'day-chip', text: t('play.day', { n: day.day }) }), h('span', { className: 'spacer' }), soundButton()]),
    h('article', { className: 'news-card' }, [
      h('p', { className: 'news-card__label', text: t('news.dayLabel', { n: day.day }) }),
      h('p', { className: 'news-card__company', text: td(`company.${market.company}`) }),
      h('h1', { className: 'news-card__headline', text: td(`news.${day.news}.headline`) }),
      h('p', { className: 'news-card__body', text: td(`news.${day.news}.body`) }),
    ]),
    // 見直し #5：昨日の株価を出し、「今日は上がる？下がる？」と考えてから始められるようにする（2日目から）
    prev ? h('p', { className: 'news-yesterday', text: t('news.yesterday', { price: yen(prev.answer) }) }) : null,
    h('div', { className: 'news-progress', attrs: { 'aria-hidden': 'true' } },
      market.days.map((d) => h('span', { className: d.day < day.day ? 'done' : d.day === day.day ? 'now' : '' }))),
    button(t('news.startDay'), onBegin, 'btn btn--main'),
  ]);
  cue('news');
  return { el };
}
