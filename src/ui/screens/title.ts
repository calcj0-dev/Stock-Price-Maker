// S1 タイトル（設計書 2章・F-01）。右上にバージョン、まとめサイトへのリンク

import { t } from '../../i18n';
import { button, h } from '../dom';
import { figure, nitsukeshi } from '../figures';
import { notes, portalLink, privacyLink, soundButton, versionLabel, type ScreenView } from '../parts';

export function titleScreen(onStart: () => void, onTutorial: () => void): ScreenView {
  // 見直し #8：タイトルの絵もゲームと同じ人と値付け師にそろえる
  const hero = h('div', { className: 'title-hero', attrs: { 'aria-hidden': 'true' } }, [
    h('div', { className: 'title-hero__side on' }, [figure('buy'), figure('buy'), figure('buy')]),
    nitsukeshi().el,
    h('div', { className: 'title-hero__side on' }, [figure('sell'), figure('sell'), figure('sell')]),
  ]);

  const el = h('main', { className: 'screen screen--title' }, [
    h('div', { className: 'top-bar' }, [versionLabel(), soundButton()]),
    h('div', { className: 'title-body' }, [
      hero,
      h('h1', { className: 'title-name', text: t('app.name') }),
      h('p', { className: 'title-tagline', text: t('app.tagline') }),
      button(t('title.start'), onStart, 'btn btn--main'),
      button(t('title.tutorial'), onTutorial, 'btn btn--outline'),
    ]),
    h('div', { className: 'title-foot' }, [portalLink(), h('p', { className: 'credit', text: t('app.credit') }), privacyLink(), notes()]),
  ]);
  return { el };
}
