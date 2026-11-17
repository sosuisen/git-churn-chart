import { describe, expect, test } from 'vitest';
import { buildFileLines, countLines } from '../src/file-lines.ts';
import type { FileChange } from '../src/patch-log.ts';

const change = (
  date: string,
  path: string,
  added: number,
  deleted: number,
): FileChange => ({
  date,
  path,
  hunks: [
    {
      context: '',
      added: Array<string>(added).fill('a'),
      deleted: Array<string>(deleted).fill('d'),
    },
  ],
});

// ファイルの日ごとの行数
describe('buildFileLines', () => {
  // 今の行数から、日ごとの変更をさかのぼって、その日の終わりの行数を出す
  test('walks back from the lines of today through the changes to the lines at the end of each day', () => {
    const lines = buildFileLines(
      [
        change('2026-11-16', 'docs/plans.md', 0, 2),
        change('2026-11-18', 'docs/plans.md', 4, 1),
      ],
      { path: 'docs/plans.md', lines: 10 },
      '2026-11-18',
      3,
    );

    expect(lines).toEqual([
      { date: '2026-11-16', lines: 7 },
      { date: '2026-11-17', lines: 7 },
      { date: '2026-11-18', lines: 10 },
    ]);
  });

  // ほかのファイルの変更は、行数に入らない
  test('leaves the changes of other files out of the lines', () => {
    const lines = buildFileLines(
      [change('2026-11-18', 'docs/features.md', 5, 0)],
      { path: 'docs/plans.md', lines: 10 },
      '2026-11-18',
      2,
    );

    expect(lines.map(day => day.lines)).toEqual([10, 10]);
  });
});

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
