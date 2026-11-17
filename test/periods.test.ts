import { describe, expect, test } from 'vitest';
import type { FileChange } from '../src/patch-log.ts';
import type { Period } from '../src/page.ts';
import { buildPeriods } from '../src/periods.ts';

/** Stats of the last chart of a period. It is the chart of all files. */
const allFiles = (period: Period | undefined) =>
  period?.sections.at(-1)?.stats ?? [];

const firstAndLastDay = (period: Period) => {
  const stats = allFiles(period);
  return {
    days: stats.length,
    first: stats[0]?.date,
    last: stats.at(-1)?.date,
  };
};

const change = (date: string, added: string[]): FileChange => ({
  date,
  path: 'README.md',
  hunks: [{ context: '', added, deleted: [] }],
});

// ページで切り替える期間
describe('buildPeriods', () => {
  // 期間は、1週間（7日）・2週間（14日）・1か月（30日）・3か月（90日）・6か月（180日）・1年（365日）の順に並ぶ
  test('lists the periods from 1 week to 1 year, from short to long', () => {
    const periods = buildPeriods([], '2026-11-18');

    expect(periods.map(period => period.label)).toEqual([
      '1週間',
      '2週間',
      '1か月',
      '3か月',
      '6か月',
      '1年',
    ]);
    expect(periods.map(firstAndLastDay)).toEqual([
      { days: 7, first: '2026-11-12', last: '2026-11-18' },
      { days: 14, first: '2026-11-05', last: '2026-11-18' },
      { days: 30, first: '2026-10-20', last: '2026-11-18' },
      { days: 90, first: '2026-08-21', last: '2026-11-18' },
      { days: 180, first: '2026-05-23', last: '2026-11-18' },
      { days: 365, first: '2025-11-19', last: '2026-11-18' },
    ]);
  });

  // ファイルを指定すると、どの期間も、そのファイルの日ごとの行数を持つ
  test('gives every period the daily lines of the file when a file is tracked', () => {
    const periods = buildPeriods(
      [change('2026-11-18', ['a', 'b'])],
      '2026-11-18',
      { path: 'README.md', lines: 5 },
    );

    expect(
      periods.map(({ tracked }) => [
        tracked?.path,
        tracked?.days.length,
        tracked?.days[0]?.lines,
        tracked?.days.at(-1)?.lines,
      ]),
    ).toEqual([
      ['README.md', 7, 3, 5],
      ['README.md', 14, 3, 5],
      ['README.md', 30, 3, 5],
      ['README.md', 90, 3, 5],
      ['README.md', 180, 3, 5],
      ['README.md', 365, 3, 5],
    ]);
  });

  // ファイルを指定しないとき、期間は行数を持たない
  test('gives the periods no daily lines when no file is tracked', () => {
    expect(buildPeriods([], '2026-11-18')[0]?.tracked).toBeUndefined();
  });

  // 累計は、期間ごとに、その期間の最初の日から数える
  test('counts the cumulative lines from the first day of each period', () => {
    const periods = buildPeriods(
      [
        change('2026-10-20', ['a', 'b', 'c', 'd']),
        change('2026-11-05', ['a', 'b']),
        change('2026-11-18', ['a']),
      ],
      '2026-11-18',
    );

    expect(periods.map(period => allFiles(period).at(-1)?.cumulative)).toEqual([
      1, 3, 7, 7, 7, 7,
    ]);
  });
});
