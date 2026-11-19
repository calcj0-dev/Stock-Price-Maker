// 1日10秒の残り時間（設計書 1.2・5.7）。時刻を外から渡すので、テストで時間を進められる（T-05）
// 画面が裏に回ったら pause、戻ったら resume（続きから数える）

export type Countdown = {
  start(now: number): void;
  pause(now: number): void;
  resume(now: number): void;
  /** 残りミリ秒（0 未満にはならない） */
  remainingMs(now: number): number;
  expired(now: number): boolean;
};

export function createCountdown(limitSec: number): Countdown {
  const limitMs = limitSec * 1000;
  let usedMs = 0;
  let runningSince: number | null = null;

  const used = (now: number) => usedMs + (runningSince === null ? 0 : now - runningSince);

  return {
    start(now) {
      usedMs = 0;
      runningSince = now;
    },
    pause(now) {
      if (runningSince === null) return;
      usedMs += now - runningSince;
      runningSince = null;
    },
    resume(now) {
      if (runningSince === null) runningSince = now;
    },
    remainingMs(now) {
      return Math.max(0, limitMs - used(now));
    },
    expired(now) {
      return used(now) >= limitMs;
    },
  };
}
