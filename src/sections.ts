import { countByCategory } from './category.ts';
import { CODE_EXTENSIONS } from './code.ts';
import { buildDailyStats } from './daily-stats.ts';
import type { ChartSection } from './page.ts';
import type { FileChange } from './patch-log.ts';

/**
 * Builds the charts of the page: code without tests, tests, and all files.
 *
 * @param endDate Last day of the period in `YYYY-MM-DD`.
 * @param days Length of the period. It must be a positive integer.
 */
export function buildSections(
  changes: readonly FileChange[],
  endDate: string,
  days: number,
): ChartSection[] {
  const counted = changes.map(change => ({
    date: change.date,
    ...countByCategory(change),
  }));
  const extensions = CODE_EXTENSIONS.map(ext => `.${ext}`).join(' ');
  const all = counted.map(({ date, code, test, other }) => ({
    date,
    added: code.added + test.added + other.added,
    deleted: code.deleted + test.deleted + other.deleted,
  }));
  const code = counted.map(({ date, code }) => ({ date, ...code }));
  const test = counted.map(({ date, test }) => ({ date, ...test }));
  return [
    {
      heading: `コード本体（${extensions}。テストを除く）`,
      stats: buildDailyStats(code, endDate, days),
    },
    {
      heading: `テストコード（${extensions}）`,
      stats: buildDailyStats(test, endDate, days),
    },
    {
      heading: 'すべてのファイル',
      stats: buildDailyStats(all, endDate, days),
    },
  ];
}
