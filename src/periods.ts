import type { Period } from './page.ts';
import type { FileChange } from './patch-log.ts';
import { buildSections } from './sections.ts';

const PERIODS = [
  { days: 7, label: '1週間' },
  { days: 14, label: '2週間' },
  { days: 30, label: '1か月' },
  { days: 90, label: '3か月' },
  { days: 180, label: '6か月' },
  { days: 365, label: '1年' },
] as const;

/** Lengths of the periods in days, in the order of `buildPeriods`. */
export const PERIOD_DAYS: readonly number[] = PERIODS.map(({ days }) => days);

/**
 * Builds the periods that the page can switch between.
 * All periods end on `endDate`. Each period has its own charts.
 *
 * @param endDate Last day of every period in `YYYY-MM-DD`.
 */
export function buildPeriods(
  changes: readonly FileChange[],
  endDate: string,
): Period[] {
  return PERIODS.map(({ days, label }) => ({
    label,
    sections: buildSections(changes, endDate, days),
  }));
}
