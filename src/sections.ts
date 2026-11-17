import { countByCategory } from './category.ts';
import type { LanguageLine } from './chart-svg.ts';
import { CODE_EXTENSIONS, LANGUAGES, languageOf } from './code.ts';
import { buildDailyStats, type DatedChange } from './daily-stats.ts';
import type { ChartSection } from './page.ts';
import type { FileChange } from './patch-log.ts';
import { countTests } from './test-count.ts';

/** Lines of one file on one day, with the language of the file. */
interface LanguageChange extends DatedChange {
  /** `undefined` when the file is not code. */
  readonly language: string | undefined;
}

/**
 * Builds the charts of the page: code without tests, tests, number of tests, and all files.
 * The first, second, and fourth charts count lines. The third chart counts tests.
 * The first and second charts also have the lines of each language.
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
    language: languageOf(change.path),
    ...countByCategory(change),
  }));
  const extensions = CODE_EXTENSIONS.map(ext => `.${ext}`).join(' ');
  const all = counted.map(({ date, code, test, other }) => ({
    date,
    added: code.added + test.added + other.added,
    deleted: code.deleted + test.deleted + other.deleted,
  }));
  const code = counted.map(({ date, language, code }) => ({
    date,
    language,
    ...code,
  }));
  const test = counted.map(({ date, language, test }) => ({
    date,
    language,
    ...test,
  }));
  const testCount = changes.map(change => ({
    date: change.date,
    ...countTests(change),
  }));
  return [
    {
      heading: `コード本体（${extensions}。テストを除く）`,
      stats: buildDailyStats(code, endDate, days),
      languages: buildLanguageLines(code, endDate, days),
    },
    {
      heading: `テストコード（${extensions}）`,
      stats: buildDailyStats(test, endDate, days),
      languages: buildLanguageLines(test, endDate, days),
    },
    {
      heading: 'テストの数（テストの宣言を数えた推定）',
      stats: buildDailyStats(testCount, endDate, days),
    },
    {
      heading: 'すべてのファイル',
      stats: buildDailyStats(all, endDate, days),
    },
  ];
}

/** Builds one line for each language that has changes in the period. */
function buildLanguageLines(
  changes: readonly LanguageChange[],
  endDate: string,
  days: number,
): LanguageLine[] {
  return LANGUAGES.map((name, colorIndex) => ({
    name,
    colorIndex,
    stats: buildDailyStats(
      changes.filter(change => change.language === name),
      endDate,
      days,
    ),
  })).filter(line =>
    line.stats.some(stat => stat.added > 0 || stat.deleted > 0),
  );
}
