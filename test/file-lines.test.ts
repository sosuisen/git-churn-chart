import { describe, expect, test } from 'vitest';
import { countLines } from '../src/file-lines.ts';

// テキストの行数
describe('countLines', () => {
  // 改行で終わる行を数える。最後の行に改行がなくても、1行と数える
  test('counts the lines that end with a newline, and a last line without one', () => {
    expect(countLines('a\nb\n')).toBe(2);
    expect(countLines('a\nb')).toBe(2);
    expect(countLines('\n')).toBe(1);
  });

  // 空のテキストは0行である
  test('counts no lines in an empty text', () => {
    expect(countLines('')).toBe(0);
  });
});
