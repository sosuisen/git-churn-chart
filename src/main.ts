import { writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { openInBrowser } from './browser.ts';
import { addDays } from './daily-stats.ts';
import { readPatchLog } from './git.ts';
import { renderPage } from './page.ts';
import { parsePatchLog } from './patch-log.ts';
import { buildSections } from './sections.ts';

const USAGE = `Usage: node src/main.ts [repository] [--days <number>] [--out <file>] [--open]

  repository  Path of a local Git repository. Default: current directory
  --days      Number of days to show, ending today. Default: 14
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
  const days = Number(values.days);
  if (!Number.isInteger(days) || days < 1) {
    throw new RangeError(`--days must be a positive integer: ${values.days}`);
  }
  const repoPath = resolve(positionals[0] ?? '.');
  const today = localDate(new Date());
  const log = readPatchLog(repoPath, addDays(today, -(days - 1)));
  const sections = buildSections(parsePatchLog(log), today, days);
  const outPath = resolve(values.out);
  writeFileSync(outPath, renderPage(basename(repoPath), sections));
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
