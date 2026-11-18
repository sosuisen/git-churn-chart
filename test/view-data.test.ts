import { describe, expect, test } from 'vitest';
import { buildView, indexOfDate, type PageData, tabsOf } from '../src/view.ts';

const dates = ['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18'];
const data: PageData = {
  dates,
  sections: [
    {
      tab: 'コード',
      heading: 'コード本体',
      added: [10, 0, 5, 2],
      deleted: [0, 3, 0, 4],
      languages: [
        {
          name: 'Rust',
          colorIndex: 0,
          added: [10, 0, 0, 0],
          deleted: [0, 3, 0, 0],
        },
        {
          name: 'Java',
          colorIndex: 6,
          added: [0, 0, 5, 2],
          deleted: [0, 0, 0, 4],
        },
      ],
    },
    {
      tab: '全体',
      heading: 'すべてのファイル',
      added: [10, 1, 5, 2],
      deleted: [0, 3, 0, 4],
    },
  ],
};
const tracked: PageData = {
  dates,
  sections: [],
  tracked: { path: 'docs/plans.md', lines: [3, 8, 8, 5] },
};

// ページのデータから、1つの期間を切り出す
describe('buildView', () => {
  // 期間の中の日だけを、日付の順に持つ
  test('has only the days of the period in date order', () => {
    const view = buildView(data, 1, 2);

    expect(view.sections[0]?.stats.map(stat => stat.date)).toEqual([
      '2026-11-16',
      '2026-11-17',
    ]);
  });

  // 累計は、期間の最初の日から数える
  test('counts the cumulative net change from the first day of the period', () => {
    const view = buildView(data, 1, 3);

    expect(view.sections[0]?.stats).toEqual([
      { date: '2026-11-16', added: 0, deleted: 3, net: -3, cumulative: -3 },
      { date: '2026-11-17', added: 5, deleted: 0, net: 5, cumulative: 2 },
      { date: '2026-11-18', added: 2, deleted: 4, net: -2, cumulative: 0 },
    ]);
  });

  // セクションは、タブと見出しを引き継ぐ
  test('keeps the tab and the heading of each section', () => {
    const view = buildView(data, 0, 3);

    expect(view.sections.map(({ tab, heading }) => [tab, heading])).toEqual([
      ['コード', 'コード本体'],
      ['全体', 'すべてのファイル'],
    ]);
  });

  // 期間の中に変更のない言語は、入れない。言語を持たないセクションは、言語を持たないままである
  test('leaves out a language without changes in the period, and gives no languages to a section without them', () => {
    const view = buildView(data, 2, 3);

    expect(
      view.sections[0]?.languages?.map(({ name, colorIndex, stats }) => [
        name,
        colorIndex,
        stats.at(-1)?.cumulative,
      ]),
    ).toEqual([['Java', 6, 3]]);
    expect(view.sections[1]?.languages).toBeUndefined();
  });

  // 行数を持つデータからは、期間の中の日ごとの行数を切り出す
  test('cuts the lines of each day of the period out of the data of a tracked file', () => {
    expect(buildView(tracked, 1, 3).tracked).toEqual({
      path: 'docs/plans.md',
      days: [
        { date: '2026-11-16', lines: 8 },
        { date: '2026-11-17', lines: 8 },
        { date: '2026-11-18', lines: 5 },
      ],
    });
    expect(buildView(data, 1, 3).tracked).toBeUndefined();
  });

  // 1日だけの期間も切り出せる
  test('cuts a period of one day', () => {
    expect(buildView(data, 3, 3).sections[0]?.stats).toHaveLength(1);
  });

  // 期間がページの日の外にあるとき、または最初の日が最後の日より後のとき、例外を投げる
  test('throws when the period is outside the days of the page, or when it starts after its end', () => {
    expect(() => buildView(data, -1, 2)).toThrow(RangeError);
    expect(() => buildView(data, 0, 4)).toThrow(RangeError);
    expect(() => buildView(data, 2, 1)).toThrow(RangeError);
    expect(() => buildView(data, 0.5, 2)).toThrow(RangeError);
  });
});

// 入力した日付から、ページの日を探す
describe('indexOfDate', () => {
  // ページにある日付は、その日の位置を返す
  test('gives the position of a date of the page', () => {
    expect(indexOfDate(dates, '2026-11-15')).toBe(0);
    expect(indexOfDate(dates, '2026-11-17')).toBe(2);
  });

  // 最初の日より前の日付は最初の日を、最後の日より後の日付は最後の日を返す
  test('gives the first day for an earlier date and the last day for a later date', () => {
    expect(indexOfDate(dates, '2025-01-01')).toBe(0);
    expect(indexOfDate(dates, '2027-01-01')).toBe(3);
  });

  // 日付でない文字列と、空の文字列は、どの日も返さない
  test('gives no day for text that is not a date, and for empty text', () => {
    expect(indexOfDate(dates, '')).toBeUndefined();
    expect(indexOfDate(dates, '2026-11')).toBeUndefined();
    expect(indexOfDate([], '2026-11-17')).toBeUndefined();
  });
});

// ページのタブ
describe('tabsOf', () => {
  // タブの名前を、最初のグラフの順に、重複なしで返す
  test('lists the names of the tabs in the order of their first charts, each one once', () => {
    const sections = ['コード', 'テスト', 'テスト', '全体'].map(tab => ({
      tab,
      heading: tab,
      added: [],
      deleted: [],
    }));

    expect(tabsOf({ dates, sections })).toEqual(['コード', 'テスト', '全体']);
  });

  // ファイルの行数のページには、タブがない
  test('lists no tabs for the page of a tracked file', () => {
    expect(tabsOf(tracked)).toEqual([]);
  });
});
