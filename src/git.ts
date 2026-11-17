import { execFileSync } from 'node:child_process';
import { LOG_FORMAT } from './patch-log.ts';

const MAX_OUTPUT_BYTES = 1024 * 1024 * 1024;

/**
 * Reads a file as it is in the last commit of the current branch.
 * Changes that are not committed are not in the result.
 *
 * @param repoPath Path of a local Git repository.
 * @param path Path of the file from the root of the repository, with `/` between the names.
 * @returns The text of the file, or `undefined` when the commit has no such file.
 */
export function readHeadFile(
  repoPath: string,
  path: string,
): string | undefined {
  try {
    return execFileSync('git', ['-C', repoPath, 'show', `HEAD:${path}`], {
      encoding: 'utf8',
      maxBuffer: MAX_OUTPUT_BYTES,
      // Git writes "path does not exist" to stderr. The caller reports it in its own words.
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return undefined;
  }
}

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
