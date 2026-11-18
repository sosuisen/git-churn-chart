import { describe, expect, test } from 'vitest';
import type { ChartSection } from '../src/page.ts';
import type { FileChange } from '../src/patch-log.ts';
import { buildSections } from '../src/sections.ts';

const change = (
  path: string,
  added: string[],
  deleted: string[] = [],
  context = '',
): FileChange => ({
  date: '2026-11-18',
  path,
  hunks: [{ context, added, deleted }],
});

/** Added and deleted lines of each chart as `[added, deleted]`. */
const totals = (changes: FileChange[]) => {
  const [code, tests, , all] = buildSections(changes, '2026-11-18', 1).map(
    section => [section.stats[0]?.added, section.stats[0]?.deleted],
  );
  return { code, tests, all };
};

// ページに並べるグラフ
describe('buildSections', () => {
  // グラフは、コード本体・テストコード・テストの数・すべてのファイルの順に並ぶ
  test('lists the charts in the order of code, tests, number of tests, and all files', () => {
    const headings = buildSections([], '2026-11-18', 1).map(s => s.heading);

    expect(headings).toHaveLength(4);
    expect(headings[0]).toMatch(/^コード本体/);
    expect(headings[1]).toMatch(/^テストコード/);
    expect(headings[2]).toMatch(/^テストの数/);
    expect(headings[3]).toBe('すべてのファイル');
  });

  // コード本体とテストコードの見出しに、対象の拡張子を表示する
  test('shows the code extensions in the headings of code and tests', () => {
    const [code, tests] = buildSections([], '2026-11-18', 1);

    expect(code?.heading).toContain('.rs .swift .kt .cs');
    expect(tests?.heading).toContain('.rs .swift .kt .cs');
  });

  // テストの数のグラフは、行ではなく、増えたテストと減ったテストを数える
  test('counts added and deleted tests, not lines, in the chart of the number of tests', () => {
    const file = change(
      'src/tests/app.rs',
      ['#[test]', 'fn adds() {}', '#[test]', 'fn reads() {}'],
      ['#[test]', 'fn old() {}'],
    );

    const stat = buildSections([file], '2026-11-18', 1)[2]?.stats[0];

    expect([stat?.added, stat?.deleted]).toEqual([2, 1]);
  });

  // コード本体とテストコードは、変更のある言語ごとに、日ごとの行数を持つ。ほかのグラフは持たない
  test('gives code and tests the daily lines of each language with changes, and not the other charts', () => {
    const [code, tests, testCount, all] = buildSections(
      [
        change('src/lib.rs', ['a', 'b'], ['c']),
        change('src/main/java/App.java', ['a']),
        change('src/test/java/AppTest.java', ['a', 'b', 'c']),
        change('README.md', ['a']),
      ],
      '2026-11-18',
      1,
    );
    const lines = (section: ChartSection | undefined) =>
      section?.languages?.map(({ name, stats }) => [
        name,
        stats[0]?.added,
        stats[0]?.deleted,
      ]);

    expect(lines(code)).toEqual([
      ['Rust', 2, 1],
      ['Java', 1, 0],
    ]);
    expect(lines(tests)).toEqual([['Java', 3, 0]]);
    expect(testCount?.languages).toBeUndefined();
    expect(all?.languages).toBeUndefined();
  });

  // 言語の色の番号は、期間の中にある言語が変わっても同じである
  test('keeps the color index of a language when the languages in the period change', () => {
    const java = change('src/main/java/App.java', ['a']);
    const rust = change('src/lib.rs', ['a']);
    const colorOfJava = (changes: FileChange[]) =>
      buildSections(changes, '2026-11-18', 1)[0]?.languages?.find(
        line => line.name === 'Java',
      )?.colorIndex;

    expect(colorOfJava([java])).toBe(6);
    expect(colorOfJava([rust, java])).toBe(6);
  });

  // コードでないファイルは、すべてのファイルにだけ入る
  test('counts a file that is not code only in all files', () => {
    expect(totals([change('README.md', ['a', 'b'], ['c'])])).toEqual({
      code: [0, 0],
      tests: [0, 0],
      all: [2, 1],
    });
  });

  // 本体のコードは、コード本体とすべてのファイルに入る
  test('counts code in code and in all files', () => {
    expect(totals([change('src/App.tsx', ['a', 'b'], ['c'])])).toEqual({
      code: [2, 1],
      tests: [0, 0],
      all: [2, 1],
    });
  });

  // テストのパスにあるコードは、テストコードとすべてのファイルに入る
  test('counts code in a test path in tests and in all files', () => {
    expect(totals([change('src/tests/app.rs', ['a', 'b'], ['c'])])).toEqual({
      code: [0, 0],
      tests: [2, 1],
      all: [2, 1],
    });
  });

  // テストのパスにあっても、コードでないファイルはテストコードに入らない
  test('does not count a file in a test path as tests when it is not code', () => {
    expect(totals([change('tests/fixtures/data.json', ['a'])])).toEqual({
      code: [0, 0],
      tests: [0, 0],
      all: [1, 0],
    });
  });

  // Rustのファイルは、テストモジュールの行をテストコードに、残りをコード本体に分ける
  test('splits a Rust file into tests for the test module and code for the rest', () => {
    const lib = change('src/lib.rs', [
      'fn main() {}',
      '#[cfg(test)]',
      'mod tests {',
      '}',
    ]);

    expect(totals([lib])).toEqual({
      code: [1, 0],
      tests: [3, 0],
      all: [4, 0],
    });
  });

  // Rust以外のファイルは、行単位では分けない
  test('does not split a file of another language line by line', () => {
    const file = change(
      'src/App.swift',
      ['    func testX() {}'],
      [],
      'mod tests {',
    );

    expect(totals([file])).toEqual({
      code: [1, 0],
      tests: [0, 0],
      all: [1, 0],
    });
  });
});
