import { describe, expect, test } from 'vitest';
import {
  escapeHtml,
  formatDay,
  formatSigned,
  formatTick,
} from '../src/format.ts';

// 符号つきの数
describe('formatSigned', () => {
  // 正の数にはプラス記号と桁区切りが付く
  test('adds a plus sign and separators to a positive number', () => {
    expect(formatSigned(1234)).toBe('+1,234');
  });

  // 負の数にはマイナス記号が付く
  test('adds a minus sign to a negative number', () => {
    expect(formatSigned(-56)).toBe('−56');
  });

  // 0には符号が付かない
  test('adds no sign to 0', () => {
    expect(formatSigned(0)).toBe('0');
  });
});

// 軸の目盛りの表記
describe('formatTick', () => {
  // 軸が10,000に届かないとき、省略せずに書く
  test('writes in full when the axis is below 10,000', () => {
    expect(formatTick(-2000, 8000)).toBe('−2,000');
  });

  // 軸が10,000に届くとき、すべての目盛りをKで書く
  test('writes every tick with K when the axis reaches 10,000', () => {
    expect(formatTick(5000, 20000)).toBe('5K');
    expect(formatTick(-20000, 20000)).toBe('−20K');
    expect(formatTick(0, 20000)).toBe('0');
  });
});

// 横軸の日付
describe('formatDay', () => {
  // 月と日を、先頭の0なしで書く
  test('writes the month and the day without leading zeros', () => {
    expect(formatDay('2026-11-05')).toBe('11/5');
  });
});

// HTMLのエスケープ
describe('escapeHtml', () => {
  // HTMLで意味を持つ文字を置き換える
  test('replaces the characters that have a meaning in HTML', () => {
    expect(escapeHtml('<a href="x">&</a>')).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;',
    );
  });
});
