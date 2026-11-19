// 2本のチャート（設計書 1.7・6章）。正解の線を先に描き、あなたの線を上に重ねる
// 縦軸は値段に合わせて自動で決める（900〜1,200円あたりが見えるように）。画面と結果画像で同じ描き方を使う

export type ChartColors = { mine: string; answer: string; grid: string; text: string };
export type ChartStyle = { fontPx: number; lineMine: number; lineAnswer: number; pad: { left: number; right: number; top: number; bottom: number } };

const SCREEN_STYLE: ChartStyle = { fontPx: 11, lineMine: 2.5, lineAnswer: 3, pad: { left: 48, right: 14, top: 14, bottom: 26 } };

/** 決まった大きさの ctx に描く（座標は ctx の単位） */
export function drawChartOn(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  mine: number[],
  answers: number[],
  colors: ChartColors,
  dayLabel: (n: number) => string,
  style: ChartStyle = SCREEN_STYLE,
): void {
  const PAD = style.pad;
  const all = [...mine, ...answers, 900, 1200];
  const unit = 100;
  const lo = Math.floor((Math.min(...all) - 20) / unit) * unit;
  const hi = Math.ceil((Math.max(...all) + 20) / unit) * unit;
  const n = Math.max(answers.length, 2);
  const x = (i: number) => PAD.left + (i * (w - PAD.left - PAD.right)) / (n - 1);
  const y = (v: number) => PAD.top + ((hi - v) * (h - PAD.top - PAD.bottom)) / (hi - lo);

  // 目盛り
  ctx.font = `${style.fontPx}px system-ui, "Hiragino Sans", "Noto Sans JP", sans-serif`;
  ctx.fillStyle = colors.text;
  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const stepV = hi - lo > 600 ? 200 : 100;
  for (let v = lo; v <= hi; v += stepV) {
    ctx.beginPath();
    ctx.moveTo(PAD.left, y(v));
    ctx.lineTo(w - PAD.right, y(v));
    ctx.stroke();
    ctx.fillText(v.toLocaleString('ja-JP'), PAD.left - style.fontPx / 2, y(v));
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i < answers.length; i++) ctx.fillText(dayLabel(i + 1), x(i), h - PAD.bottom + style.fontPx * 0.7);

  const line = (vals: number[], color: string, width: number) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    vals.forEach((v, i) => (i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v))));
    ctx.stroke();
    vals.forEach((v, i) => {
      ctx.beginPath();
      ctx.arc(x(i), y(v), width + 1.5, 0, Math.PI * 2);
      ctx.fill();
    });
  };
  line(answers, colors.answer, style.lineAnswer);
  line(mine, colors.mine, style.lineMine);
}

/** 画面の canvas に描く（表示の大きさと画面の細かさに合わせる） */
export function drawChart(canvas: HTMLCanvasElement, mine: number[], answers: number[], colors: ChartColors, dayLabel: (n: number) => string): void {
  const cssW = canvas.clientWidth || 340;
  const cssH = canvas.clientHeight || 200;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  drawChartOn(ctx, cssW, cssH, mine, answers, colors, dayLabel);
}

/** CSS の色の名前から、チャートの色を取り出す（画面と画像で同じ色を使う） */
export function chartColors(): ChartColors {
  const css = getComputedStyle(document.documentElement);
  return {
    mine: css.getPropertyValue('--mine').trim(),
    answer: css.getPropertyValue('--answer').trim(),
    grid: css.getPropertyValue('--line').trim(),
    text: css.getPropertyValue('--text-sub').trim(),
  };
}
