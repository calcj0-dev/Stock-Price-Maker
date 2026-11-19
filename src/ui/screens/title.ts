// S1 タイトル（設計書 2章・F-01）。右上にバージョン、まとめサイトへのリンク

import { t } from '../../i18n';
import { button, h } from '../dom';
import { notes, openDialog, person, portalLink, versionLabel, type ScreenView } from '../parts';

export function titleScreen(onStart: () => void): ScreenView {
  const hero = h('div', { className: 'title-hero', attrs: { 'aria-hidden': 'true' } }, [
    h('div', { className: 'title-hero__side' }, [person('buy'), person('buy'), person('buy')]),
    h('div', { className: 'title-hero__mid', text: '¥' }),
    h('div', { className: 'title-hero__side' }, [person('sell'), person('sell'), person('sell')]),
  ]);

  const el = h('main', { className: 'screen screen--title' }, [
    h('div', { className: 'top-bar' }, [versionLabel()]),
    h('div', { className: 'title-body' }, [
      hero,
      h('h1', { className: 'title-name', text: t('app.name') }),
      h('p', { className: 'title-tagline', text: t('app.tagline') }),
      button(t('title.start'), onStart, 'btn btn--main'),
      button(t('common.howLink'), () => openDialog(t('how.heading'), t('how.body')), 'link'),
    ]),
    h('div', { className: 'title-foot' }, [portalLink(), h('p', { className: 'credit', text: t('app.credit') }), notes()]),
  ]);
  return { el };
}
