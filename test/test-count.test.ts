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

  // 削除した宣言は、減ったテストとして数える
  test('counts a deleted declaration as a deleted test', () => {
    const file = change(
      'src/lib.rs',
      ['    #[test]', '    fn adds() {}'],
      ['    #[test]', '    fn old() {}', '    #[test]', '    fn older() {}'],
    );

    expect(countTests(file)).toEqual({ added: 1, deleted: 2 });
  });

  // TypeScript・JavaScriptは、test(とit(を数える。describe(は数えない
  test('counts test( and it( in TypeScript and JavaScript, but not describe(', () => {
    const lines = [
      "describe('parser', () => {",
      "  test('reads a line', () => {});",
      "  it('reads two lines', () => {});",
      "  test.each([1, 2])('reads %i lines', () => {});",
      "  it.skip('reads no lines', () => {});",
      '  const latest = newest(items);',
      '});',
    ];

    expect(countTests(change('test/parser.test.ts', lines)).added).toBe(4);
    expect(countTests(change('test/parser.spec.jsx', lines)).added).toBe(4);
  });

  // Kotlinは、@Testと@ParameterizedTestを数える
  test('counts @Test and @ParameterizedTest in Kotlin', () => {
    const file = change('src/test/kotlin/ParserTest.kt', [
      'class ParserTest {',
      '    @Test',
      '    fun readsALine() {}',
      '    @ParameterizedTest',
      '    @ValueSource(ints = [1, 2])',
      '    fun readsLines(count: Int) {}',
      '    @Test fun readsNothing() {}',
      '    @TestFactory',
      '}',
    ]);

    expect(countTests(file).added).toBe(3);
  });

  // Swiftは、func test...と@Testを数える
  test('counts func test... and @Test in Swift', () => {
    const file = change('AppTests/ParserTests.swift', [
      'final class ParserTests: XCTestCase {',
      '    func testReadsALine() throws {}',
      '    func makeParser() -> Parser {}',
      '}',
      '@Test func readsTwoLines() {}',
      '@Test("reads nothing")',
      'func readsNothing() {}',
    ]);

    expect(countTests(file).added).toBe(3);
  });

  // C#は、[Fact]・[Theory]・[Test]・[TestMethod]を数える
  test('counts [Fact], [Theory], [Test], and [TestMethod] in C#', () => {
    const file = change('App.Tests/ParserTests.cs', [
      '[TestClass]',
      'public class ParserTests {',
      '    [Fact]',
      '    public void ReadsALine() {}',
      '    [Theory]',
      '    [InlineData(1)]',
      '    public void ReadsLines(int count) {}',
      '    [Test]',
      '    public void ReadsNothing() {}',
      '    [TestMethod]',
      '    public void ReadsAll() {}',
      '    [Fact(Skip = "slow")]',
      '    public void ReadsSlowly() {}',
      '}',
    ]);

    expect(countTests(file).added).toBe(5);
  });
});
