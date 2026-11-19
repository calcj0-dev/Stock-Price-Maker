// 2本のチャート（設計書 1.7・6章）。正解の線を先に描き、あなたの線を上に重ねる
// 縦軸は値段に合わせて自動で決める（900〜1,200円あたりが見えるように）

export type ChartColors = { mine: string; answer: string; grid: string; text: string };

const PAD = { left: 48, right: 14, top: 14, bottom: 26 };

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

  const all = [...mine, ...answers, 900, 1200];
  const unit = 100;
  const lo = Math.floor((Math.min(...all) - 20) / unit) * unit;
  const hi = Math.ceil((Math.max(...all) + 20) / unit) * unit;
  const n = Math.max(answers.length, 2);
  const x = (i: number) => PAD.left + (i * (cssW - PAD.left - PAD.right)) / (n - 1);
  const y = (v: number) => PAD.top + ((hi - v) * (cssH - PAD.top - PAD.bottom)) / (hi - lo);

  // 目盛り
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = colors.text;
  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const stepV = hi - lo > 600 ? 200 : 100;
  for (let v = lo; v <= hi; v += stepV) {
    ctx.beginPath();
    ctx.moveTo(PAD.left, y(v));
    ctx.lineTo(cssW - PAD.right, y(v));
    ctx.stroke();
    ctx.fillText(v.toLocaleString('ja-JP'), PAD.left - 6, y(v));
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i < answers.length; i++) ctx.fillText(dayLabel(i + 1), x(i), cssH - PAD.bottom + 8);

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
  line(answers, colors.answer, 3);
  line(mine, colors.mine, 2.5);
}
