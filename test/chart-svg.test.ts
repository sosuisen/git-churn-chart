import { describe, expect, test } from 'vitest';
import { renderFileLinesSvg, renderLanguagesSvg } from '../src/chart-svg.ts';

// ファイルの行数のグラフ
describe('renderFileLinesSvg', () => {
  // 日が1つもないとき、例外を投げる
  test('throws when there are no days', () => {
    expect(() => renderFileLinesSvg([])).toThrow(RangeError);
  });
});

// 言語別のグラフ
describe('renderLanguagesSvg', () => {
  // 言語が1つもないとき、例外を投げる
  test('throws when there are no languages', () => {
    expect(() => renderLanguagesSvg([])).toThrow(RangeError);
  });
});
