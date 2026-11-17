import { describe, expect, test } from 'vitest';
import type { FileChange } from '../src/patch-log.ts';
import { buildPeriods, type Period } from '../src/periods.ts';

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
  // 期間は、1週間（7日）・2週間（14日）・1か月（30日）の順に並ぶ
  test('lists the periods in the order of 1 week, 2 weeks, and 1 month', () => {
    const periods = buildPeriods([], '2026-11-18');

    expect(periods.map(period => period.label)).toEqual([
      '1週間',
      '2週間',
      '1か月',
    ]);
    expect(periods.map(firstAndLastDay)).toEqual([
      { days: 7, first: '2026-11-12', last: '2026-11-18' },
      { days: 14, first: '2026-11-05', last: '2026-11-18' },
      { days: 30, first: '2026-10-20', last: '2026-11-18' },
    ]);
  });
});
