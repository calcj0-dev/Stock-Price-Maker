// 入口：5日の進み方（core/game.ts）に合わせて画面を切り替える。ページの読み込みは起こさない

import './style.css';
import { initAnalytics } from './analytics';
import { installFigureDefs } from './ui/figures';
import { unlockAudio } from './audio';
import { beginAuction, createGame, decide, nextDay, startPrice, type Game } from './core/game';
import { market, scenarios, type Scenario } from './data';
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
/**
 * 遊ぶ銘柄（オーナー 2026-11-20）：最初はネコマタ食品。5日間を遊び終えると次の銘柄へ進み、最後のあとは最初に戻る。
 * 端末には保存しない（プライバシー：保存は音の設定だけ）ので、ページを開き直すとネコマタ食品から
 */
let scIndex = 0;
const scenario = (): Scenario => scenarios[scIndex % scenarios.length]!;
const nextScenario = (): Scenario => scenarios[(scIndex + 1) % scenarios.length]!;
let finished = false;

function show(view: ScreenView): void {
  current?.unmount?.();
  current = view;
  root?.replaceChildren(view.el);
  window.scrollTo(0, 0);
}

function render(): void {
  const sc = scenario();
  const day = sc.days[game.day];
  if (game.phase === 'result' || !day) {
    finished = true;
    show(resultScreen(game, sc, nextScenario(), () => start(), goTitle));
    return;
  }
  if (game.phase === 'news') {
    show(newsScreen(day, sc, () => {
      beginAuction(game);
      render();
    }, goTitle));
    return;
  }
  show(auctionScreen({
    day,
    scenario: sc,
    prevAnswer: sc.days[game.day - 1]?.answer,
    startPrice: startPrice(game, market.slider, sc.startDay1),
    isLastDay: game.day === sc.days.length - 1,
    onDecide: ({ price, timeout }) => {
      decide(game, sc.days, price, timeout);
      return { judge: game.judges[game.day] ?? 'exact' };
    },
    onNext: () => {
      nextDay(game, sc.days);
      render();
    },
    onHome: goTitle,
  }));
}

function start(): void {
  // 前の銘柄を遊び終えていたら次の銘柄へ（途中でタイトルに戻ったときは同じ銘柄のまま）
  if (finished) {
    scIndex = (scIndex + 1) % scenarios.length;
    finished = false;
  }
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
  // 遊び終えたあとなら次の銘柄、途中で戻ったなら同じ銘柄の名前を出す
  show(titleScreen(start, startWithTutorial, (finished ? nextScenario() : scenario()).id));
}

goTitle();
