import { writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { openInBrowser } from './browser.ts';
import { addDays } from './daily-stats.ts';
import { readPatchLog } from './git.ts';
import { renderPage } from './page.ts';
import { parsePatchLog } from './patch-log.ts';
import { buildPeriods, PERIOD_DAYS } from './periods.ts';

const USAGE = `Usage: node src/main.ts [repository] [--days <number>] [--out <file>] [--open]

  repository  Path of a local Git repository. Default: current directory
  --days      Period that the page shows first: ${PERIOD_DAYS.join(', ')}. Default: 14
  --out       Path of the HTML file to write. Default: churn-chart.html
  --open      Open the HTML file in the browser`;

function main(): void {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      days: { type: 'string', default: '14' },
      out: { type: 'string', default: 'churn-chart.html' },
      open: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return;
  }
  const selected = PERIOD_DAYS.indexOf(Number(values.days));
  if (selected === -1) {
    throw new RangeError(
      `--days must be one of ${PERIOD_DAYS.join(', ')}: ${values.days}`,
    );
  }
  const repoPath = resolve(positionals[0] ?? '.');
  const today = localDate(new Date());
  const longest = Math.max(...PERIOD_DAYS);
  const log = readPatchLog(repoPath, addDays(today, -(longest - 1)));
  const periods = buildPeriods(parsePatchLog(log), today);
  const outPath = resolve(values.out);
  writeFileSync(outPath, renderPage(basename(repoPath), periods, selected));
  console.log(outPath);
  if (values.open) {
    openInBrowser(outPath);
  }
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
