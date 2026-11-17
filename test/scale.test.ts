import { describe, expect, test } from 'vitest';
import { niceTicks } from '../src/scale.ts';

// 軸の目盛り
describe('niceTicks', () => {
  // 目盛りは切りのよい数で、最小値と最大値を覆う
  test('covers min and max with round numbers', () => {
    expect(niceTicks(-130, 420)).toEqual([-200, 0, 200, 400, 600]);
  });

  // 範囲が0から始まるとき、最初の目盛りは0である
  test('starts at 0 when the range starts at 0', () => {
    expect(niceTicks(0, 37)).toEqual([0, 10, 20, 30, 40]);
  });

  // 範囲に幅がないときも、2つ以上の目盛りを返す
  test('returns two or more ticks when the range is flat', () => {
    expect(niceTicks(0, 0)).toEqual([0, 1]);
  });

  // 行数は整数なので、目盛りの間隔は1より小さくならない
  test('never uses a step smaller than 1', () => {
    expect(niceTicks(0, 2)).toEqual([0, 1, 2]);
  });

  // 最小値が最大値より大きいとき、例外を投げる
  test('throws when min is greater than max', () => {
    expect(() => niceTicks(1, 0)).toThrow(RangeError);
  });
});
