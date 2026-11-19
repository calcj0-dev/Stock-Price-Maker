// 画面に共通の部品

import { config } from '../data';
import { t } from '../i18n';
import { APP_VERSION } from '../version';
import { externalLink, h } from './dom';

export type ScreenView = { el: HTMLElement; unmount?: () => void };

export function versionLabel(): HTMLElement {
  return h('span', { className: 'version', text: t('app.version', { version: APP_VERSION }) });
}

/** まとめサイト（Ted App Lab）へのリンク（共通の決まり C2） */
export function portalLink(): HTMLElement {
  return h('p', { className: 'portal' }, [externalLink(t('common.portalLink'), config.links.portal)]);
}

/** 簡略化の注記と免責（設計書 1.7） */
export function notes(): HTMLElement {
  return h('div', { className: 'notes' }, [
    h('p', { text: t('common.simplified') }),
    h('p', { text: t('common.disclaimer') }),
  ]);
}

/** 人の形（CSS の丸と体）。side で色が変わる。絵の素材は使わない（設計書 2章） */
export function person(side: 'buy' | 'sell'): HTMLElement {
  return h('span', { className: `person person--${side}`, attrs: { 'aria-hidden': 'true' } }, [
    h('span', { className: 'person__head' }),
    h('span', { className: 'person__body' }),
  ]);
}

/** 中央に出す小さな重ね表示（遊び方など） */
export function openDialog(heading: string, body: string): void {
  const dialog = h('dialog', { className: 'modal' }, [
    h('h2', { text: heading }),
    h('p', { text: body }),
    h('button', { className: 'btn btn--sub', text: t('common.close'), attrs: { type: 'button' }, on: { click: () => dialog.close() } }),
  ]);
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}
