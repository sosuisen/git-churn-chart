import { buildFileLines, type TrackedFile } from './file-lines.ts';
import type { FileChange } from './patch-log.ts';
import { buildSections } from './sections.ts';
import type { PageData } from './view.ts';

/** Number of days that the page knows. The reader can select any period inside them. */
export const PAGE_DAYS = 365;

/**
 * Builds the data of the page: the numbers of every chart on every day of the last year.
 *
 * @param endDate Last day of the page in `YYYY-MM-DD`.
 * @param tracked A file to show alone. It is optional. When it is set,
 * the data has the number of lines of the file and no other charts.
 */
export function buildPageData(
  changes: readonly FileChange[],
  endDate: string,
  tracked?: TrackedFile,
): PageData {
  if (tracked) {
    const days = buildFileLines(changes, tracked, endDate, PAGE_DAYS);
    return {
      dates: days.map(day => day.date),
      sections: [],
      tracked: { path: tracked.path, lines: days.map(day => day.lines) },
    };
  }
  const sections = buildSections(changes, endDate, PAGE_DAYS);
  return {
    dates: sections[0]?.stats.map(stat => stat.date) ?? [],
    sections: sections.map(({ tab, heading, stats, languages }) => ({
      tab,
      heading,
      added: stats.map(stat => stat.added),
      deleted: stats.map(stat => stat.deleted),
      ...(languages && {
        languages: languages.map(language => ({
          name: language.name,
          colorIndex: language.colorIndex,
          added: language.stats.map(stat => stat.added),
          deleted: language.stats.map(stat => stat.deleted),
        })),
      }),
    })),
  };
}
