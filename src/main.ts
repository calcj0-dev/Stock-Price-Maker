// 入口：5日の進み方（core/game.ts）に合わせて画面を切り替える。ページの読み込みは起こさない

import './style.css';
import { initAnalytics } from './analytics';
import { installFigureDefs } from './ui/figures';
import { unlockAudio } from './audio';
import { beginAuction, createGame, decide, nextDay, startPrice, type Game } from './core/game';
import { market } from './data';
import { setLocale } from './i18n';
import type { ScreenView } from './ui/parts';
import { auctionScreen } from './ui/screens/auction';
import { newsScreen } from './ui/screens/news';
import { resultScreen } from './ui/screens/result';
import { titleScreen } from './ui/screens/title';
import { tutorialScreen } from './ui/screens/tutorial';

setLocale('ja');
installFigureDefs();
initAnalytics();
// iOS などでは、利用者が触ったときに音を鳴らせるようにする（決定 #9：最初から鳴る）
document.addEventListener('pointerdown', unlockAudio, { capture: true });
document.addEventListener('keydown', unlockAudio, { capture: true });

const root = document.querySelector<HTMLElement>('#app');
let current: ScreenView | null = null;
let game: Game = createGame();

function show(view: ScreenView): void {
  current?.unmount?.();
  current = view;
  root?.replaceChildren(view.el);
  window.scrollTo(0, 0);
}

function render(): void {
  const day = market.days[game.day];
  if (game.phase === 'result' || !day) {
    show(resultScreen(game, () => start(), goTitle));
    return;
  }
  if (game.phase === 'news') {
    show(newsScreen(day, () => {
      beginAuction(game);
      render();
    }, goTitle));
    return;
  }
  show(auctionScreen({
    day,
    prevAnswer: market.days[game.day - 1]?.answer,
    startPrice: startPrice(game, market.slider),
    isLastDay: game.day === market.days.length - 1,
    onDecide: ({ price, timeout }) => {
      decide(game, market.days, price, timeout);
      return { judge: game.judges[game.day] ?? 'exact' };
    },
    onNext: () => {
      nextDay(game, market.days);
      render();
    },
    onHome: goTitle,
  }));
}

function start(): void {
  game = createGame();
  render();
}

/** タイトルの「チュートリアル」ボタンから（オーナー 2026-11-19：専用ボタン。「始める」はすぐ1日目へ） */
function startWithTutorial(): void {
  show(tutorialScreen(start, goTitle));
}

/** 各画面の左上の「‹ タイトル」から（オーナー 2026-11-20）。遊んでいた分は消える */
function goTitle(): void {
  game = createGame();
  show(titleScreen(start, startWithTutorial));
}

goTitle();
