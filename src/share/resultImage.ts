// 結果画像 1200×630（設計書 6章。前作の作りを流用）。画面に出さない Canvas に描いて PNG にする
// 左：2本のチャート（黒＝あなた／青＝正解）、右：点数・称号・チャートの一言、下：作品名の注記と URL

import { siteUrl } from '../data';
import { t, td } from '../i18n';
import { chartColors, drawChartOn } from '../ui/chart';

const W = 1200;
const H = 630;
const FONT = 'system-ui, "Hiragino Sans", "Noto Sans JP", sans-serif';

export type ImageInput = { prices: number[]; answers: number[]; score: number; sum: number; max: number; titleId: string; company: string };

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** 幅に収まるよう、文字を小さくする（最小 min px） */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size: number, weight: number, min = 16): number {
  let s = size;
  for (; s > min; s -= 2) {
    ctx.font = `${weight} ${s}px ${FONT}`;
    if (ctx.measureText(text).width <= maxWidth) break;
  }
  ctx.font = `${weight} ${s}px ${FONT}`;
  return s;
}

/** 幅で折り返して描く（日本語は1文字ずつ折り返せる）。描いた行数を返す */
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  let line = '';
  let lines = 0;
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxWidth && line) {
      ctx.fillText(line, x, y + lines * lineHeight);
      lines += 1;
      line = ch;
    } else line += ch;
  }
  if (line) {
    ctx.fillText(line, x, y + lines * lineHeight);
    lines += 1;
  }
  return lines;
}

export async function renderResultImage(r: ImageInput): Promise<Blob | null> {
  try {
    await document.fonts?.ready;
  } catch {
    // フォントの読み込みを待てなくても描く
  }
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const TEXT = cssVar('--text');
  const SUB = cssVar('--text-sub');
  const SURFACE = cssVar('--surface');
  const colors = chartColors();

  ctx.fillStyle = cssVar('--bg') || '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // 上：作品名
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT;
  ctx.font = `800 34px ${FONT}`;
  ctx.fillText(t('app.name'), 40, 34);
  // 遊んだ銘柄（オーナー 2026-11-20）を作品名の横に小さく
  const nameW = ctx.measureText(t('app.name')).width;
  ctx.fillStyle = SUB;
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText(r.company, 40 + nameW + 20, 44);

  // 左：2本のチャートと凡例
  const cx = 40;
  const cy = 96;
  const cw = 660;
  const ch = 430;
  ctx.fillStyle = SURFACE;
  ctx.beginPath();
  ctx.roundRect(cx, cy, cw, ch, 20);
  ctx.fill();
  let lx = cx + 28;
  for (const [label, color] of [
    [t('result.chartMine'), colors.mine],
    [t('result.chartAnswer'), colors.answer],
  ] as const) {
    ctx.fillStyle = color;
    ctx.fillRect(lx, cy + 30, 28, 5);
    ctx.font = `600 20px ${FONT}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(label, lx + 38, cy + 33);
    lx += 38 + ctx.measureText(label).width + 32;
  }
  ctx.save();
  ctx.translate(cx, cy + 50);
  drawChartOn(ctx, cw, ch - 50, r.prices, r.answers, colors, (n) => t('play.day', { n }), {
    fontPx: 18,
    lineMine: 5,
    lineAnswer: 6,
    pad: { left: 84, right: 34, top: 18, bottom: 44 },
  });
  ctx.restore();

  // 右：点数・組・称号・チャートの一言
  const x = 740;
  const right = W - 40;
  const maxW = right - x;
  let y = 104;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = TEXT;
  fitText(ctx, t('result.score', { score: r.score }), maxW, 120, 800);
  ctx.fillText(t('result.score', { score: r.score }), x, y);
  y += 136;
  ctx.fillStyle = SUB;
  fitText(ctx, t('result.volumes', { sum: r.sum, max: r.max }), maxW, 22, 600, 14);
  ctx.fillText(t('result.volumes', { sum: r.sum, max: r.max }), x, y);
  y += 48;

  const titleText = t('image.titleLabel', { title: td(`titles.${r.titleId}`) });
  const hs = fitText(ctx, titleText, maxW - 36, 30, 800, 16);
  const hw = ctx.measureText(titleText).width + 36;
  ctx.fillStyle = TEXT;
  ctx.beginPath();
  ctx.roundRect(x, y, hw, hs + 22, (hs + 22) / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(titleText, x + 18, y + 11);
  y += hs + 54;

  ctx.fillStyle = TEXT;
  ctx.font = `600 24px ${FONT}`;
  wrapText(ctx, t('result.chartNote'), x, y, maxW, 36);

  // 下：注記と URL
  ctx.fillStyle = cssVar('--line');
  ctx.fillRect(40, 556, W - 80, 1);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = SUB;
  fitText(ctx, t('image.footer'), 760, 20, 500, 14);
  ctx.fillText(t('image.footer'), 40, 594);
  ctx.textAlign = 'right';
  ctx.font = `600 20px ${FONT}`;
  ctx.fillText(siteUrl().replace(/^https?:\/\//, '').replace(/\/$/, ''), right, 594);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}
