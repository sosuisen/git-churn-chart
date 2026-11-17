import type { LineCount } from './daily-stats.ts';
import type { FileChange } from './patch-log.ts';

/** `#[test]`, `#[tokio::test]`, `#[tokio::test(...)]`. Not `#[cfg(test)]`. */
const RUST_TEST = /^#\[(?:\w+::)*\w*test[\](]/;

/**
 * Counts the tests that a change adds and deletes.
 * One test is one line that declares a test, such as `#[test]` in Rust.
 *
 * It is an estimate. It reads only the changed lines.
 * A test with many cases counts as one test.
 */
export function countTests(change: FileChange): LineCount {
  const count = (lines: readonly string[]) =>
    lines.filter(line => RUST_TEST.test(line.trim())).length;
  return {
    added: sum(change.hunks.map(hunk => count(hunk.added))),
    deleted: sum(change.hunks.map(hunk => count(hunk.deleted))),
  };
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
