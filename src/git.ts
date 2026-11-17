import { execFileSync } from 'node:child_process';
import { LOG_FORMAT } from './patch-log.ts';

const MAX_OUTPUT_BYTES = 1024 * 1024 * 1024;

/**
 * Reads the commits of the current branch since the start of `sinceDate` with their patches.
 * Dates are commit dates in the local time zone.
 *
 * @param repoPath Path of a local Git repository.
 * @param sinceDate First day to read in `YYYY-MM-DD`.
 * @throws When `repoPath` is not a Git repository or `git` is not installed.
 */
export function readPatchLog(repoPath: string, sinceDate: string): string {
  return execFileSync(
    'git',
    [
      '-C',
      repoPath,
      // Paths with non-ASCII letters must come as they are, not as escaped bytes.
      '-c',
      'core.quotePath=false',
      // A repository can turn on the Rust rules for hunk contexts. They name the nearest
      // function. The split of Rust tests needs the nearest line at column 0.
      '-c',
      'diff.rust.xfuncname=^([A-Za-z_$].*)$',
      'log',
      `--since=${sinceDate} 00:00:00`,
      '--patch',
      '--unified=0',
      '--no-color',
      '--no-ext-diff',
      '--no-textconv',
      '--date=format-local:%Y-%m-%d',
      `--pretty=format:${LOG_FORMAT}`,
    ],
    { encoding: 'utf8', maxBuffer: MAX_OUTPUT_BYTES },
  );
}
