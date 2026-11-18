import { describe, expect, test } from 'vitest';
import { buildPageData, PAGE_DAYS } from '../src/page-data.ts';
import type { FileChange } from '../src/patch-log.ts';

const change = (
  date: string,
  path: string,
  added: string[],
  deleted: string[] = [],
): FileChange => ({ date, path, hunks: [{ context: '', added, deleted }] });

// ページのデータ
describe('buildPageData', () => {
  // 終了日までの1年（365日）の日付を、古い日から順に持つ
  test('has the dates of one year (365 days) to the end date, from the oldest', () => {
    const { dates } = buildPageData([], '2026-11-18');

    expect(dates).toHaveLength(PAGE_DAYS);
    expect(PAGE_DAYS).toBe(365);
    expect(dates[0]).toBe('2025-11-19');
    expect(dates.at(-1)).toBe('2026-11-18');
  });

  // グラフごとに、タブ・見出しと、日ごとの追加と削除を持つ
  test('has the tab, the heading, and the added and deleted numbers of each day for each chart', () => {
    const { sections } = buildPageData(
      [
        change('2026-11-17', 'src/lib.rs', ['a', 'b'], ['c']),
        change('2026-11-18', 'README.md', ['a']),
      ],
      '2026-11-18',
    );

    expect(sections.map(section => section.tab)).toEqual([
      'コード',
      'テスト',
      'テスト',
      '全体',
    ]);
    expect(sections[0]?.heading).toMatch(/^コード本体/);
    expect(sections[0]?.added.slice(-2)).toEqual([2, 0]);
    expect(sections[0]?.deleted.slice(-2)).toEqual([1, 0]);
    expect(sections[3]?.added.slice(-2)).toEqual([2, 1]);
    expect(sections[3]?.added).toHaveLength(PAGE_DAYS);
  });

  // 言語を持つグラフは、言語ごとに、色の番号と、日ごとの追加と削除を持つ
  test('has the color index and the added and deleted numbers of each day for each language', () => {
    const { sections } = buildPageData(
      [change('2026-11-18', 'src/main/java/App.java', ['a', 'b'], ['c'])],
      '2026-11-18',
    );

    expect(
      sections[0]?.languages?.map(({ name, colorIndex, added, deleted }) => [
        name,
        colorIndex,
        added.at(-1),
        deleted.at(-1),
        added.length,
      ]),
    ).toEqual([['Java', 6, 2, 1, PAGE_DAYS]]);
    expect(sections[3]?.languages).toBeUndefined();
  });

  // ファイルを指定すると、そのファイルの日ごとの行数を持つ。ほかのグラフは持たない
  test('has the lines of each day of the tracked file and no other charts when a file is tracked', () => {
    const data = buildPageData(
      [
        change('2026-11-18', 'README.md', ['a', 'b']),
        change('2026-11-18', 'src/lib.rs', ['a']),
      ],
      '2026-11-18',
      { path: 'README.md', lines: 5 },
    );

    expect(data.tracked?.path).toBe('README.md');
    expect(data.tracked?.lines.slice(-2)).toEqual([3, 5]);
    expect(data.tracked?.lines).toHaveLength(PAGE_DAYS);
    expect(data.dates.at(-1)).toBe('2026-11-18');
    expect(data.sections).toEqual([]);
  });

  // ファイルを指定しないとき、行数を持たない
  test('has no lines when no file is tracked', () => {
    expect(buildPageData([], '2026-11-18').tracked).toBeUndefined();
  });
});
