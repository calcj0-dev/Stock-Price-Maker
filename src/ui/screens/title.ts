// S1 タイトル（設計書 2章・F-01）。右上にバージョン、まとめサイトへのリンク
// オーナー 2026-11-20：タイトルを豪華に（A 動くミニ盤＋B 電光掲示板風の看板＋C 背景の飾り）

import { config } from '../../data';
import { t, td } from '../../i18n';
import { button, externalLink, h } from '../dom';
import { notes, portalLink, privacyLink, soundButton, versionLabel, type ScreenView } from '../parts';
import { titleDemo } from '../titleDemo';

/** companyId は「値付けを始める」で遊ぶ銘柄（流れる一言に名前を出す） */
export function titleScreen(onStart: () => void, onTutorial: () => void, companyId: string): ScreenView {
  // B：電光掲示板風の看板。作品名を光る文字で出し、下に一言を流す
  const ticker = t('app.ticker', { company: td(`company.${companyId}`) });
  const sign = h('div', { className: 'led-sign' }, [
    h('h1', { className: 'led-sign__name', text: t('app.name') }),
    h('div', { className: 'led-sign__ticker', attrs: { 'aria-hidden': 'true' } }, [
      // 切れ目なく流すため、同じ文を2つ並べて半分ずつ動かす
      h('span', { className: 'led-sign__track' }, [h('span', { text: ticker }), h('span', { text: ticker })]),
    ]),
  ]);

  // A：動くミニ盤
  const demo = titleDemo();

  const el = h('main', { className: 'screen screen--title' }, [
    h('div', { className: 'top-bar' }, [versionLabel(), soundButton()]),
    h('div', { className: 'title-body' }, [
      sign,
      h('div', { className: 'title-demo', attrs: { 'aria-hidden': 'true' } }, [demo.el]),
      h('p', { className: 'title-tagline', text: t('app.tagline') }),
      button(t('title.start'), onStart, 'btn btn--main'),
      button(t('title.tutorial'), onTutorial, 'btn btn--outline'),
    ]),
    h('div', { className: 'title-foot' }, [portalLink(), h('p', { className: 'credit' }, [externalLink(t('app.credit'), config.links.follow)]), privacyLink(), notes()]),
  ]);
  return { el, unmount: () => demo.stop() };
}
