import { buildDailyStats } from './daily-stats.ts';
import type { FileChange } from './patch-log.ts';

/** A file whose number of lines the page draws. */
export interface TrackedFile {
  /** Path from the root of the repository, with `/` between the names. */
  readonly path: string;
  /** Number of lines of the file now. It is 0 when the file does not exist. */
  readonly lines: number;
}

/** The number of lines of a file at the end of one day. */
export interface DailyLines {
  /** Date in `YYYY-MM-DD`. */
  readonly date: string;
  readonly lines: number;
}

/**
 * Builds the number of lines of a file at the end of each day of the period.
 * It starts from the lines of the file now and takes back the changes day by day.
 *
 * @param changes Changes of all files. They must include every change of the file since the first day.
 * @param endDate Last day of the period in `YYYY-MM-DD`. No change is later than this day.
 * @param days Length of the period. It must be a positive integer.
 */
export function buildFileLines(
  changes: readonly FileChange[],
  file: TrackedFile,
  endDate: string,
  days: number,
): DailyLines[] {
  const ofFile = changes
    .filter(change => change.path === file.path)
    .map(change => ({
      date: change.date,
      added: sum(change.hunks.map(hunk => hunk.added.length)),
      deleted: sum(change.hunks.map(hunk => hunk.deleted.length)),
    }));
  const stats = buildDailyStats(ofFile, endDate, days);
  const total = stats.at(-1)?.cumulative ?? 0;
  // `cumulative` counts from the first day. The file has `file.lines` lines after the last day.
  return stats.map(stat => ({
    date: stat.date,
    lines: file.lines - total + stat.cumulative,
  }));
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/**
 * Counts the lines of a text, as Git counts them.
 * A last line without a newline is one line.
 */
export function countLines(text: string): number {
  if (text === '') {
    return 0;
  }
  const newlines = text.split('\n').length - 1;
  return text.endsWith('\n') ? newlines : newlines + 1;
}
