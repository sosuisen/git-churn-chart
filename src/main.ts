import { writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { openInBrowser } from './browser.ts';
import { readClientScript } from './client-script.ts';
import { addDays } from './daily-stats.ts';
import { countLines, type TrackedFile } from './file-lines.ts';
import { readHeadFile, readPatchLog } from './git.ts';
import { renderPage } from './page.ts';
import { type FileChange, parsePatchLog } from './patch-log.ts';
import { buildPageData, PAGE_DAYS } from './page-data.ts';

const USAGE = `Usage: node src/main.ts [repository] [--days <number>] [--out <file>] [--track <file>] [--open]

  repository  Path of a local Git repository. Default: current directory
  --days      Number of days that the page shows first, from 1 to ${PAGE_DAYS}. Default: 14
              The reader can change the period on the page
  --out       Path of the HTML file to write. Default: churn-chart.html
  --track     Path of a file in the repository, such as docs/plans.md.
              The page shows only a chart of its number of lines on each day
  --open      Open the HTML file in the browser`;

function main(): void {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      days: { type: 'string', default: '14' },
      out: { type: 'string', default: 'churn-chart.html' },
      open: { type: 'boolean', default: false },
      track: { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return;
  }
  const days = Number(values.days);
  if (!Number.isInteger(days) || days < 1 || days > PAGE_DAYS) {
    throw new RangeError(
      `--days must be an integer from 1 to ${PAGE_DAYS}: ${values.days}`,
    );
  }
  const repoPath = resolve(positionals[0] ?? '.');
  const today = localDate(new Date());
  const log = readPatchLog(repoPath, addDays(today, -(PAGE_DAYS - 1)));
  const changes = parsePatchLog(log);
  const tracked = readTrackedFile(repoPath, values.track, changes);
  const data = buildPageData(changes, today, tracked);
  const outPath = resolve(values.out);
  writeFileSync(
    outPath,
    renderPage(basename(repoPath), data, days, readClientScript()),
  );
  console.log(outPath);
  if (values.open) {
    openInBrowser(outPath);
  }
}

/**
 * Reads the file of `--track` from the last commit.
 *
 * @param option Value of `--track`. `undefined` when the option is not given.
 */
function readTrackedFile(
  repoPath: string,
  option: string | undefined,
  changes: readonly FileChange[],
): TrackedFile | undefined {
  if (option === undefined) {
    return undefined;
  }
  const path = option.replaceAll('\\', '/').replace(/^\.\//, '');
  const text = readHeadFile(repoPath, path);
  // A file that was deleted in the period is not in the last commit, but it has changes.
  if (text === undefined && !changes.some(change => change.path === path)) {
    throw new RangeError(`--track: the repository has no such file: ${option}`);
  }
  return { path, lines: countLines(text ?? '') };
}

function localDate(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  console.error(`\n${USAGE}`);
  process.exitCode = 1;
}
