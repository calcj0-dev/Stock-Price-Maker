// 入口：5日の進み方（core/game.ts）に合わせて画面を切り替える。ページの読み込みは起こさない

import './style.css';
import { beginAuction, createGame, decide, nextDay, startPrice, type Game } from './core/game';
import { market } from './data';
import { setLocale } from './i18n';
import type { ScreenView } from './ui/parts';
import { auctionScreen } from './ui/screens/auction';
import { ladderScreen } from './ui/screens/ladder';
import { newsScreen } from './ui/screens/news';
import { resultScreen } from './ui/screens/result';
import { titleScreen } from './ui/screens/title';
import { tutorialScreen } from './ui/screens/tutorial';

setLocale('ja');

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
    show(resultScreen(game, () => start()));
    return;
  }
  if (game.phase === 'news') {
    show(newsScreen(day, () => {
      beginAuction(game);
      render();
    }));
    return;
  }
  // 試作の見比べ：?ui=list で前の形（左右の列）、それ以外は案1（値段のはしご）
  const screen = new URLSearchParams(location.search).get('ui') === 'list' ? auctionScreen : ladderScreen;
  show(screen({
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
  }));
}

function start(): void {
  game = createGame();
  render();
}

/** 「セリを始める」と「遊び方」はチュートリアルから。「もう一回」はチュートリアルなしで1日目へ */
function startWithTutorial(): void {
  show(tutorialScreen(start));
}

show(titleScreen(startWithTutorial, startWithTutorial));
