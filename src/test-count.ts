import { isCode } from './code.ts';
import type { LineCount } from './daily-stats.ts';
import type { FileChange } from './patch-log.ts';

/** `test(`, `it(`, and their variants such as `test.each(` and `it.skip(`. */
const JS_TEST = /^(?:test|it)(?:\.\w+)*\(/;

/** `@Test` and `@ParameterizedTest` of JUnit. */
const JUNIT_TEST = /^@(?:Test|ParameterizedTest)\b/;

/** `TEST(`, `TEST_F(`, `TEST_P(` of GoogleTest, and `TEST_CASE(` of Catch2 and doctest. */
const CPP_TEST = /^(?:TEST|TEST_F|TEST_P|TEST_CASE)\(/;

/** Pattern of a line that declares one test, by the extension of the file. */
const TEST_DECLARATIONS: Readonly<Record<string, RegExp>> = {
  // `#[test]`, `#[tokio::test]`, `#[tokio::test(...)]`. Not `#[cfg(test)]`.
  rs: /^#\[(?:\w+::)*\w*test[\](]/,
  // XCTest names a test `func test...`. Swift Testing marks a test with `@Test`.
  swift: /^(?:@Test\b|(?:\w+ )*func test\w*\()/,
  kt: JUNIT_TEST,
  java: JUNIT_TEST,
  // xUnit, NUnit, and MSTest. `[TestClass]` and `[TestCase]` are not tests.
  cs: /^\[(?:Fact|Theory|Test|TestMethod)\b/,
  el: /^\(ert-deftest\b/,
  ts: JS_TEST,
  tsx: JS_TEST,
  js: JS_TEST,
  jsx: JS_TEST,
  mjs: JS_TEST,
  cjs: JS_TEST,
  cpp: CPP_TEST,
};

/**
 * Counts the tests that a change adds and deletes.
 * One test is one line that declares a test, such as `#[test]` in Rust.
 *
 * It is an estimate. It reads only the changed lines.
 * A test with many cases counts as one test.
 */
export function countTests(change: FileChange): LineCount {
  const extension = change.path.split('.').pop()?.toLowerCase() ?? '';
  const declaration = TEST_DECLARATIONS[extension];
  if (declaration === undefined || !isCode(change.path)) {
    return { added: 0, deleted: 0 };
  }
  const count = (lines: readonly string[]) =>
    lines.filter(line => declaration.test(line.trim())).length;
  return {
    added: sum(change.hunks.map(hunk => count(hunk.added))),
    deleted: sum(change.hunks.map(hunk => count(hunk.deleted))),
  };
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
