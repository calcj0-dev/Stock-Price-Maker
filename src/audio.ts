// 効果音（決定 #9・設計書 1.8。前作の作りを流用）。素材ファイルは使わず Web Audio で合成する
// どのきっかけでどの音を鳴らすかは config.json の sounds。iOS は利用者が触ったときに AudioContext を再開する必要がある

import { config } from './data';
import { settings } from './settings';

let ctx: AudioContext | null = null;

/** 最初のタッチ・クリックで呼ぶ。以後は鳴らせるようになる */
export function unlockAudio(): void {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

type Tone = {
  freq: number;
  /** 終わりの周波数（音の高さを動かすとき） */
  to?: number;
  type?: OscillatorType;
  /** 開始までの遅れ（秒） */
  at?: number;
  dur: number;
  gain?: number;
};

function play(tones: Tone[], delay = 0): void {
  if (!settings.sound || !ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime + delay;
  for (const tone of tones) {
    const t0 = now + (tone.at ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = tone.type ?? 'sine';
    osc.frequency.setValueAtTime(tone.freq, t0);
    if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to, t0 + tone.dur);
    const peak = tone.gain ?? 0.15;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + tone.dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + tone.dur + 0.02);
  }
}

/** 音の名前（config.json の sounds の値）→ 音 */
const SOUNDS: Record<string, Tone[]> = {
  /** ニュース：短い「チャラン」 */
  chararan: [
    { freq: 783.99, type: 'triangle', dur: 0.16, gain: 0.12 },
    { freq: 987.77, type: 'triangle', dur: 0.16, at: 0.07, gain: 0.12 },
    { freq: 1318.5, type: 'triangle', dur: 0.32, at: 0.14, gain: 0.12 },
  ],
  /** 光る人が変わった：小さな「ポッ」 */
  pop: [{ freq: 620, to: 920, dur: 0.06, gain: 0.07 }],
  /** 残り3秒：「チッ」（1秒ごと） */
  ticktock: [
    { freq: 1600, type: 'square', dur: 0.03, gain: 0.05 },
    { freq: 1150, type: 'square', dur: 0.03, at: 0.18, gain: 0.04 },
  ],
  /** 決める：「カーン」（拍子木。硬い音を2つ重ねて短く響かせる） */
  kaan: [
    { freq: 1760, type: 'triangle', dur: 0.28, gain: 0.22 },
    { freq: 2637, type: 'sine', dur: 0.12, gain: 0.1 },
    { freq: 880, type: 'triangle', dur: 0.22, gain: 0.08 },
  ],
  /** ぴったり：「ピンポン」 */
  pinpon: [
    { freq: 1318.5, dur: 0.18, gain: 0.14 },
    { freq: 1046.5, dur: 0.42, at: 0.16, gain: 0.14 },
  ],
  /** ずれ：「ポワーン」 */
  powan: [{ freq: 440, to: 293.66, type: 'triangle', dur: 0.55, gain: 0.13 }],
  /** 伝説・一人前：ファンファーレ */
  fanfare: [
    { freq: 523.25, dur: 0.14, gain: 0.13 },
    { freq: 659.25, dur: 0.14, at: 0.12, gain: 0.13 },
    { freq: 783.99, dur: 0.14, at: 0.24, gain: 0.13 },
    { freq: 1046.5, type: 'triangle', dur: 0.7, at: 0.36, gain: 0.15 },
    { freq: 783.99, type: 'triangle', dur: 0.7, at: 0.36, gain: 0.08 },
  ],
};

type Cue = 'news' | 'glow' | 'tick' | 'decide' | 'exact' | 'miss';
const sounds = config.sounds as Record<Cue, string> & { result: Record<string, string> };

/** きっかけの名前で鳴らす（音の割り当ては config.json） */
export function cue(name: Cue, delay = 0): void {
  const tones = SOUNDS[sounds[name]];
  if (tones) play(tones, delay);
}

/** 結果：称号に合わせた音 */
export function cueResult(titleId: string, delay = 0): void {
  const tones = SOUNDS[sounds.result[titleId] ?? ''];
  if (tones) play(tones, delay);
}

/** 音の名前がそろっているか（データの検査用） */
export function soundNames(): string[] {
  return Object.keys(SOUNDS);
}
