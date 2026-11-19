// S5 結果（設計書 1.7・2章・F-05）。プロトタイプではシェア・効果音・つくった人のアプリの枠はまだ入れない

import type { Game } from '../../core/game';
import { score, title, type Day } from '../../core/market';
import { config, market } from '../../data';
import { t, td, yen } from '../../i18n';
import { createBoard } from '../board';
import { postText } from '../../share/postText';
import { renderResultImage } from '../../share/resultImage';
import { canShareImage, openXIntent, saveImage, shareWithImage } from '../../share/share';
import { chartColors, drawChart } from '../chart';
import { button, h } from '../dom';
import { makerApps, notes, privacyLink, type ScreenView } from '../parts';

/**
 * 案B：その日の正解を盤で見る。正解の値段で光る人と取引の組を見せ、あなたの値段は点線で重ねる
 */
function openDayBoard(day: Day, mine: number, reason: string): void {
  const board = createBoard(day, { className: 'board--small board--answer', markerKind: 'mine' });
  board.setPrice(day.answer);
  board.setMarker(mine === day.answer ? null : mine);
  const dialog = h('dialog', { className: 'modal modal--board' }, [
    h('h2', { text: t('play.day', { n: day.day }) }),
    h('p', { className: 'modal-board__answer', text: t('reveal.answer', { price: yen(day.answer) }) }),
    h('p', { className: 'modal-board__mine' }, [
      h('span', { className: 'modal-board__key', text: t('result.chartMine') }),
      h('span', { text: t('play.price', { price: yen(mine) }) }),
    ]),
    h('div', { className: 'board-head' }, [
      h('span', { className: 'board-head__buy', text: t('play.buyers') }),
      h('span', { className: 'board-head__sell', text: t('play.sellers') }),
    ]),
    board.el,
    h('p', { className: 'modal-board__reason', text: reason }),
    button(t('common.close'), () => dialog.close(), 'btn btn--sub'),
  ]);
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
  requestAnimationFrame(() => board.showPairs(day.answer));
}

export function resultScreen(game: Game, onRetry: () => void): ScreenView {
  const sc = score(game.volumes, market.totalMaxVolume);
  const titleId = title(game.prices, game.volumes, sc, config.titles);
  const sum = game.volumes.reduce((a, b) => a + b, 0);
  const answers = market.days.map((d) => d.answer);
  const note = td(`titleNotes.${titleId}`);

  const canvas = h('canvas', { className: 'chart', attrs: { role: 'img', 'aria-label': t('result.chartNote') } });
  const legend = h('div', { className: 'legend' }, [
    h('span', { className: 'legend__item legend__item--mine', text: t('result.chartMine') }),
    h('span', { className: 'legend__item legend__item--answer', text: t('result.chartAnswer') }),
  ]);

  const daily = h('ol', { className: 'daily' },
    market.days.map((d, i) => {
      const j = game.judges[i] ?? 'exact';
      const prev = market.days[i - 1]?.answer ?? d.answer;
      const reason = td(`reasons.${d.news}`, { prev: yen(prev), answer: yen(d.answer) });
      return h('li', {}, [
        h('span', { className: `daily__judge daily__judge--${j}`, text: t('result.dayLine', { n: d.day, text: t(`reveal.${j}`) }) }),
        h('span', { className: 'daily__reason', text: reason }),
        button(t('result.viewBoard'), () => openDayBoard(d, game.prices[i] ?? d.answer, reason), 'btn btn--small'),
      ]);
    }),
  );

  // ---- シェア（設計書 5.5）：画像つきで共有できる端末は「画像を付けてシェア」、それ以外は X の投稿画面 ----
  let image: Blob | null = null;
  const text = postText(sc, titleId);
  // 画像ができる前から、画像つきで共有できる端末かを小さな見本で調べて、ボタンの文字を決めておく（文字が途中で変わらないように）
  const imageShareable = canShareImage(new Blob([], { type: 'image/png' }));
  const shareBtn = button(t(imageShareable ? 'result.shareImage' : 'result.share'), () => void onShare(), 'btn btn--main btn--share');
  const saveBtn = button(t('result.saveImage'), () => image && void saveImage(image), 'btn btn--outline');
  saveBtn.disabled = true;
  async function onShare() {
    if (image && canShareImage(image)) {
      await shareWithImage(text, image);
      return;
    }
    openXIntent(text);
  }
  const imageReady = renderResultImage({ prices: game.prices, answers, score: sc, sum, max: market.totalMaxVolume, titleId }).then((b) => {
    image = b;
    saveBtn.disabled = !b;
    return b;
  });

  const el = h('main', { className: 'screen screen--result' }, [
    h('h1', { className: 'result-heading', text: t('result.heading') }),
    h('div', { className: 'card' }, [legend, canvas, h('p', { className: 'chart-note', text: t('result.chartNote') })]),
    h('div', { className: 'score-block' }, [
      h('p', { className: 'score', text: t('result.score', { score: sc }) }),
      h('p', { className: 'score-sub', text: t('result.volumes', { sum, max: market.totalMaxVolume }) }),
      h('p', { className: 'title-won', text: td(`titles.${titleId}`) }),
      note !== `titleNotes.${titleId}` ? h('p', { className: 'title-note', text: note }) : null,
    ]),
    h('section', { className: 'card' }, [h('h2', { text: t('result.daily') }), daily]),
    h('section', { className: 'card card--learn' }, [h('p', { text: t('result.summary') }), h('p', { text: t('result.realWorld') })]),
    h('div', { className: 'share-row' }, [shareBtn, saveBtn]),
    button(t('result.retry'), onRetry, 'btn btn--outline'),
    makerApps(),
    privacyLink(),
    notes(),
  ]);

  // 画面に入ってから幅が決まるので、次のフレームで描く
  const paint = () => drawChart(canvas, game.prices, answers, chartColors(), (n) => String(n));
  requestAnimationFrame(paint);
  window.addEventListener('resize', paint);

  void imageReady;
  return { el, unmount: () => window.removeEventListener('resize', paint) };
}
