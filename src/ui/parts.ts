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

/**
 * 顔（案E）。文字を増やさずに気持ちを見せる：光った人は笑顔（買う！／売る！）、
 * 光っていない人は困り顔（高いなあ／安いなあ）、組めなかった人（あぶれ）は真顔。表情は CSS で切り替える
 */
export function face(side: 'buy' | 'sell'): HTMLElement {
  return h('span', { className: `face face--${side}`, attrs: { 'aria-hidden': 'true' } }, [h('span', { className: 'face__mouth' })]);
}


/** プライバシーについて（M2）。計測は Vercel Analytics だけ（オーナー 2026-11-19。GA4 は使わない） */
export function openPrivacy(): void {
  const keys = ['privacy.p1', 'privacy.p2', 'privacy.p3', 'privacy.p4'] as const;
  const dialog = h('dialog', { className: 'modal modal--privacy' }, [
    h('h2', { text: t('privacy.heading') }),
    ...keys.map((k) => h('p', { text: t(k) })),
    h('p', {}, [externalLink(t('privacy.vercelPolicy'), config.links.vercelPrivacy)]),
    h('button', { className: 'btn btn--sub', text: t('common.close'), attrs: { type: 'button' }, on: { click: () => dialog.close() } }),
  ]);
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}

/** 「プライバシーについて」の文字リンク（タイトルと結果の下） */
export function privacyLink(): HTMLElement {
  return h('p', { className: 'privacy-link' }, [h('button', { className: 'link', text: t('common.privacyLink'), attrs: { type: 'button' }, on: { click: openPrivacy } })]);
}

/** 結果画面の「このゲームを作った人のアプリ」の枠：TAMERU とまとめサイト（オーナー 2026-11-19）、フォロー */
export function makerApps(): HTMLElement {
  const go = (text: string, href: string, className: string) =>
    h('a', { className, text, attrs: { href, target: '_blank', rel: 'noopener' } });
  return h('section', { className: 'card maker-apps' }, [
    h('h2', { text: t('links.heading') }),
    h('div', { className: 'maker-apps__item' }, [
      h('p', { text: t('links.tameru') }),
      h('p', { className: 'maker-apps__desc', text: t('links.tameruDesc') }),
      go(t('links.tameruButton'), config.links.tameru, 'btn btn--outline btn--link'),
    ]),
    h('div', { className: 'maker-apps__item' }, [go(t('common.portalLink'), config.links.portal, 'btn btn--outline btn--link')]),
    h('p', { className: 'maker-apps__follow' }, [externalLink(t('links.follow'), config.links.follow)]),
  ]);
}
