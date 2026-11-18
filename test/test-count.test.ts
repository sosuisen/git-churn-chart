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

  // Javaは、@Testと@ParameterizedTestを数える
  test('counts @Test and @ParameterizedTest in Java', () => {
    const file = change('src/test/java/ParserTest.java', [
      'class ParserTest {',
      '    @Test',
      '    void readsALine() {}',
      '    @ParameterizedTest',
      '    @ValueSource(ints = {1, 2})',
      '    void readsLines(int count) {}',
      '    @BeforeEach',
      '    void setUp() {}',
      '}',
    ]);

    expect(countTests(file).added).toBe(2);
  });

  // C++は、TEST(・TEST_F(・TEST_P(・TEST_CASE(を数える
  test('counts TEST(, TEST_F(, TEST_P(, and TEST_CASE( in C++', () => {
    const file = change('tests/parser_test.cpp', [
      'TEST(Parser, ReadsALine) {}',
      'TEST_F(ParserFixture, ReadsTwoLines) {}',
      'TEST_P(ParserCases, ReadsLines) {}',
      'TEST_CASE("reads nothing") {}',
      'INSTANTIATE_TEST_SUITE_P(Lines, ParserCases, testing::Values(1, 2));',
      '  EXPECT_EQ(1, 1);',
    ]);

    expect(countTests(file).added).toBe(4);
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

  // Emacs Lispは、(ert-deftestを数える
  test('counts (ert-deftest in Emacs Lisp', () => {
    const file = change('test/parser-test.el', [
      '(ert-deftest parser-reads-a-line ()',
      '  (should (parser-read "a")))',
      '(defun parser-test-helper ())',
    ]);

    expect(countTests(file).added).toBe(1);
  });

  // コードでないファイルと、ほかの言語の宣言は数えない
  test('does not count a file that is not code or a declaration of another language', () => {
    const lines = ['#[test]', "test('reads a line', () => {});", '@Test'];

    expect(countTests(change('docs/testing.md', lines)).added).toBe(0);
    expect(countTests(change('Makefile', lines)).added).toBe(0);
    expect(countTests(change('src/lib.rs', lines)).added).toBe(1);
  });

  // コードと数えない場所のファイルは、拡張子が合っていても数えない
  test('does not count a file in a place that does not count as code', () => {
    const lines = ["test('reads a line', () => {});"];

    expect(countTests(change('test/parser.test.ts', lines)).added).toBe(0);
    expect(countTests(change('src/vendor/parser.test.ts', lines)).added).toBe(
      0,
    );
    expect(countTests(change('src/parser.test.min.js', lines)).added).toBe(0);
    expect(countTests(change('src/parser.test.ts', lines)).added).toBe(1);
  });
});
