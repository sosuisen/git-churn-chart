import { describe, expect, test } from 'vitest';
import { splitRustHunk } from '../src/rust-test-module.ts';

const added = (context: string, ...lines: string[]) =>
  splitRustHunk({ context, deleted: [], added: lines });

// Rustの、本体と同じファイルにあるテストの切り分け
describe('splitRustHunk', () => {
  // テストモジュールの中の変更は、テストとして数える
  test('counts a change inside the test module as tests', () => {
    const result = added('mod tests {', '    #[test]', '    fn works() {}');

    expect(result.test.added).toBe(2);
    expect(result.code.added).toBe(0);
  });

  // テストモジュールの外の変更は、本体として数える
  test('counts a change outside the test module as code', () => {
    const result = added('fn main() {', '    run();');

    expect(result.code.added).toBe(1);
    expect(result.test.added).toBe(0);
  });

  // 削除した行も、追加した行と同じように切り分ける
  test('splits deleted lines in the same way as added lines', () => {
    const result = splitRustHunk({
      context: 'mod tests {',
      deleted: ['    old();'],
      added: [],
    });

    expect(result.test.deleted).toBe(1);
    expect(result.code.deleted).toBe(0);
  });

  // 新しく書いたファイルでは、#[cfg(test)]から後ろをテストとして数える
  test('counts the lines from #[cfg(test)] as tests in a new file', () => {
    const result = added(
      '',
      'fn main() {',
      '    run();',
      '}',
      '',
      '#[cfg(test)]',
      'mod tests {',
      '    #[test]',
      '    fn works() {}',
      '}',
    );

    expect(result.code.added).toBe(4);
    expect(result.test.added).toBe(5);
  });

  // テストモジュールを閉じたあとの行は、本体として数える
  test('counts the lines after the end of the test module as code', () => {
    const result = added(
      'mod tests {',
      '    fn works() {}',
      '}',
      '',
      'fn more() {}',
    );

    expect(result.test.added).toBe(2);
    expect(result.code.added).toBe(2);
  });

  // 見出しがテストモジュールでも、行頭から始まる新しい定義は本体として数える
  test('counts a new item at column 0 as code even when the context is the test module', () => {
    const result = added(
      'mod tests {',
      'fn after_tests() {',
      '    run();',
      '}',
    );

    expect(result.code.added).toBe(3);
    expect(result.test.added).toBe(0);
  });

  // #[cfg(test)]の付いた1行の宣言は、その行までをテストとして数える
  test('counts a one-line item after #[cfg(test)] as tests up to that line', () => {
    const result = added('', '#[cfg(test)]', 'mod tests;', 'fn main() {}');

    expect(result.test.added).toBe(2);
    expect(result.code.added).toBe(1);
  });

  // #[cfg(test)]と定義のあいだに別の属性があっても、テストとして数える
  test('counts the item as tests when another attribute follows #[cfg(test)]', () => {
    const result = added(
      '',
      '#[cfg(test)]',
      '#[path = "sync_tests.rs"]',
      'mod tests;',
      'fn main() {}',
    );

    expect(result.test.added).toBe(3);
    expect(result.code.added).toBe(1);
  });

  // #[cfg(test)]の付いたimplブロックも、テストとして数える
  test('counts an impl block after #[cfg(test)] as tests', () => {
    const result = added(
      '',
      '#[cfg(test)]',
      'impl From<&str> for Value {',
      '    fn from(s: &str) -> Self {}',
      '}',
    );

    expect(result.test.added).toBe(4);
  });

  // 名前にtestを含まないモジュールの中の変更は、本体として数える
  test('counts a change inside a module without test in its name as code', () => {
    expect(added('mod imp {', '    fn f() {}').code.added).toBe(1);
  });

  // 改行がCRLFでも切り分けられる
  test('splits lines with CRLF line ends', () => {
    const result = added(
      '',
      '#[cfg(test)]\r',
      'mod tests {\r',
      '    fn t() {}\r',
      '}\r',
    );

    expect(result.test.added).toBe(4);
  });
});
