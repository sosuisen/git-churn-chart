import { isCode } from './code.ts';
import type { LineCount } from './daily-stats.ts';
import type { FileChange } from './patch-log.ts';
import { splitRustHunk } from './rust-test-module.ts';
import { isTestPath } from './test-path.ts';

/** Changed lines of one file, split by what the lines are. */
export interface CategoryCount {
  /** Code that is not a test. */
  readonly code: LineCount;
  /** Test code. */
  readonly test: LineCount;
  /** Everything that is not code: documents, settings, data. */
  readonly other: LineCount;
}

const NONE: LineCount = { added: 0, deleted: 0 };

/**
 * Counts the changed lines of a file as code, tests, or other.
 * A Rust file can hold both code and tests. Its lines are split one by one.
 */
export function countByCategory(change: FileChange): CategoryCount {
  const total = sum(
    change.hunks.map(hunk => ({
      added: hunk.added.length,
      deleted: hunk.deleted.length,
    })),
  );
  if (!isCode(change.path)) {
    return { code: NONE, test: NONE, other: total };
  }
  if (isTestPath(change.path)) {
    return { code: NONE, test: total, other: NONE };
  }
  if (!change.path.endsWith('.rs')) {
    return { code: total, test: NONE, other: NONE };
  }
  const parts = change.hunks.map(splitRustHunk);
  return {
    code: sum(parts.map(part => part.code)),
    test: sum(parts.map(part => part.test)),
    other: NONE,
  };
}

function sum(counts: readonly LineCount[]): LineCount {
  return counts.reduce(
    (total, count) => ({
      added: total.added + count.added,
      deleted: total.deleted + count.deleted,
    }),
    NONE,
  );
}
