import { describe, expect, test } from 'vitest';
import { renderLanguagesSvg } from '../src/chart-svg.ts';

// 言語別のグラフ
describe('renderLanguagesSvg', () => {
  // 言語が1つもないとき、例外を投げる
  test('throws when there are no languages', () => {
    expect(() => renderLanguagesSvg([])).toThrow(RangeError);
  });
});
