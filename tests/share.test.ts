// 投稿文（設計書 5.5）：文面と X の文字数
import { describe, expect, it } from 'vitest';
import { config } from '../src/data';
import { postText, X_LIMIT, xLength } from '../src/share/postText';

describe('投稿文', () => {
  it('点数・称号・ハッシュタグが入る', () => {
    expect(postText(84, 't_novice')).toBe('株の値付け師になって84点。称号：見習い値付け師 #株価を決めるのは誰');
  });
  it('どの称号でも X の上限（URL を含めて280）に収まる', () => {
    for (const tt of config.titles) expect(xLength(postText(100, tt.id))).toBeLessThanOrEqual(X_LIMIT);
  });
});
