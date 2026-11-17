/** A number of added lines and deleted lines. */
export interface LineCount {
  readonly added: number;
  readonly deleted: number;
}

/** Lines changed on one date. One day can have many of them. */
export interface DatedChange extends LineCount {
  /** Commit date in `YYYY-MM-DD`. */
  readonly date: string;
}

/** Lines changed on one day. */
export interface DailyStat {
  /** Date in `YYYY-MM-DD`. */
  readonly date: string;
  readonly added: number;
  readonly deleted: number;
  /** `added - deleted` of this day. */
  readonly net: number;
  /** Sum of `net` from the first day of the period to this day. */
  readonly cumulative: number;
}

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Moves a date by a number of days.
 *
 * @param date Date in `YYYY-MM-DD`.
 * @param days Number of days. A negative number moves to the past.
 */
export function addDays(date: string, days: number): string {
  if (!DATE_FORMAT.test(date)) {
    throw new RangeError(`date must be YYYY-MM-DD: ${date}`);
  }
  // UTC keeps every day 24 hours long. Local time breaks on daylight saving days.
  const moved = new Date(Date.parse(`${date}T00:00:00Z`) + days * MS_PER_DAY);
  return moved.toISOString().slice(0, 10);
}

/**
 * Sums the changes of each day in the period that ends on `endDate`.
 * Days without changes get 0. Changes outside the period are ignored.
 *
 * @param endDate Last day of the period in `YYYY-MM-DD`.
 * @param days Length of the period. It must be a positive integer.
 */
export function buildDailyStats(
  changes: readonly DatedChange[],
  endDate: string,
  days: number,
): DailyStat[] {
  if (!Number.isInteger(days) || days < 1) {
    throw new RangeError(`days must be a positive integer: ${days}`);
  }
  const stats: DailyStat[] = [];
  let cumulative = 0;
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = addDays(endDate, -offset);
    const ofDay = changes.filter(change => change.date === date);
    const added = sum(ofDay.map(change => change.added));
    const deleted = sum(ofDay.map(change => change.deleted));
    const net = added - deleted;
    cumulative += net;
    stats.push({ date, added, deleted, net, cumulative });
  }
  return stats;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
