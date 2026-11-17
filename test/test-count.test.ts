import { describe, expect, test } from 'vitest';
import type { FileChange } from '../src/patch-log.ts';
import { countTests } from '../src/test-count.ts';

const change = (
  path: string,
  added: string[],
  deleted: string[] = [],
): FileChange => ({
  date: '2026-11-18',
  path,
  hunks: [{ context: '', added, deleted }],
});

// テストの数
describe('countTests', () => {
  // Rustは、#[test]と#[tokio::test]などを数える。#[cfg(test)]は数えない
  test('counts #[test] and attributes such as #[tokio::test] in Rust, but not #[cfg(test)]', () => {
    const file = change('src/lib.rs', [
      '#[cfg(test)]',
      'mod tests {',
      '    #[test]',
      '    fn adds() {}',
      '    #[tokio::test]',
      '    async fn reads() {}',
      '    #[tokio::test(flavor = "multi_thread")]',
      '    async fn writes() {}',
      '}',
    ]);

    expect(countTests(file)).toEqual({ added: 3, deleted: 0 });
  });
});
