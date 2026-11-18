import { describe, expect, test } from 'vitest';
import { buildDailyStats } from '../src/daily-stats.ts';
import { renderView } from '../src/view.ts';

const stats = buildDailyStats(
  [
    { date: '2026-11-16', added: 1200, deleted: 0 },
    { date: '2026-11-18', added: 30, deleted: 450 },
  ],
  '2026-11-18',
  3,
);
const codeStats = buildDailyStats(
  [{ date: '2026-11-16', added: 900, deleted: 0 }],
  '2026-11-18',
  3,
);
const all = { tab: '全体', heading: 'すべてのファイル', stats };
const code = { tab: '全体', heading: 'コードのみ', stats: codeStats };
const noChanges = buildDailyStats([], '2026-11-18', 3);
const byLanguage = {
  sections: [
    {
      tab: '全体',
      heading: 'コード本体',
      stats: noChanges,
      languages: [
        { name: 'Rust', colorIndex: 0, stats },
        { name: 'Java', colorIndex: 6, stats: codeStats },
      ],
    },
  ],
};
const withTracked = {
  sections: [{ tab: '全体', heading: 'コード本体', stats: noChanges }],
  tracked: {
    path: 'docs/plans.md',
    days: [
      { date: '2026-11-16', lines: 12 },
      { date: '2026-11-17', lines: 1500 },
      { date: '2026-11-18', lines: 8 },
    ],
  },
};
const tabbed = {
  sections: [
    { tab: 'コード', heading: 'コード本体', stats },
    { tab: 'テスト', heading: 'テストコード', stats },
    { tab: 'テスト', heading: 'テストの数', stats },
    { tab: '全体', heading: 'すべてのファイル', stats },
  ],
};
const week = { sections: [all] };
const both = { sections: [all, code] };
const month = { sections: [code] };

const count = (text: string, pattern: RegExp) =>
  [...text.matchAll(pattern)].length;

// 1つの期間のグラフ
describe('renderView', () => {
  // 追加のある日ごとに追加の棒を、削除のある日ごとに削除の棒を描く
  test('draws a bar for each day with added lines and each day with deleted lines', () => {
    const html = renderView(week, 0);

    expect(count(html, /class="bar added"/g)).toBe(2);
    expect(count(html, /class="bar deleted"/g)).toBe(1);
  });

  // 累計の線は、日ごとに1つの点を持つ
  test('draws one point of the cumulative line for each day', () => {
    const html = renderView(week, 0);

    expect(count(html, /class="marker"/g)).toBe(3);
  });

  // 線の終点に、期間全体の純増を表示する
  test('shows the net change of the whole period at the end of the line', () => {
    expect(renderView(week, 0)).toContain('累計 +780');
  });

  // 表には、日ごとの追加・削除・純増・累計が並ぶ
  test('lists added, deleted, net, and cumulative lines of each day in the table', () => {
    const html = renderView(week, 0);

    expect(html).toContain(
      '<tr><td>2026-11-18</td><td>+30</td><td>−450</td><td>−420</td><td>+780</td></tr>',
    );
  });

  // セクションごとに、見出し・グラフ・表を、渡した順に上から並べる
  test('places a heading, a chart, and a table for each section in the given order', () => {
    const html = renderView(both, 0);

    expect(count(html, /<svg /g)).toBe(2);
    expect(count(html, /<table>/g)).toBe(2);
    expect(html.indexOf('<h2>すべてのファイル</h2>')).toBeGreaterThan(-1);
    expect(html.indexOf('<h2>コードのみ</h2>')).toBeGreaterThan(
      html.indexOf('<h2>すべてのファイル</h2>'),
    );
  });

  // 各セクションのグラフは、そのセクションの行数を表示する
  test('shows the lines of its own section in each chart', () => {
    const html = renderView(both, 0);

    expect(html).toContain('累計 +780');
    expect(html).toContain('累計 +900');
  });

  // 期間の最初の日と最後の日を表示する
  test('shows the first day and the last day of the period', () => {
    expect(renderView(week, 0)).toContain('2026-11-16 〜 2026-11-18（3日間）');
  });

  // 30日のグラフでは、横軸の日付を1日おきに書く。最後の日は必ず書く
  test('writes the date of every second day in a chart of 30 days, with the last day', () => {
    const longStats = buildDailyStats([], '2026-11-18', 30);
    const long = { sections: [{ ...all, stats: longStats }] };

    const html = renderView(long, 0);

    expect(count(html, /text-anchor="middle"/g)).toBe(15);
    expect(html).toContain('>11/18</text>');
    expect(html).not.toContain('>11/17</text>');
  });

  // 90日以上のグラフでは、累計の線に点を描かない。点が重なって、線が見えなくなるためである
  test('draws no points on the cumulative line in a chart of 90 days', () => {
    const longStats = buildDailyStats([], '2026-11-18', 90);
    const long = { sections: [{ ...all, stats: longStats }] };

    const html = renderView(long, 0);

    expect(count(html, /class="marker"/g)).toBe(0);
    expect(count(html, /class="line"/g)).toBe(1);
  });

  // 言語を持つセクションは、グラフの下に、言語ごとに1本の線のグラフを描く。棒は描かない
  test('draws a second chart with one line for each language and no bars below the chart', () => {
    const html = renderView(byLanguage, 0);

    expect(count(html, /<svg /g)).toBe(2);
    expect(count(html, /class="line series-1"/g)).toBe(1);
    expect(count(html, /class="line series-7"/g)).toBe(1);
    expect(count(html, /class="bar /g)).toBe(0);
  });

  // 言語別のグラフの凡例に、言語の名前と、期間全体の純増が並ぶ
  test('lists the name and the net change of each language in the legend of the language chart', () => {
    const html = renderView(byLanguage, 0);

    expect(html).toContain('Rust<span class="total">+780</span>');
    expect(html).toContain('Java<span class="total">+900</span>');
  });

  // 言語別のグラフの表に、日ごとの、言語ごとの累計が並ぶ
  test('lists the cumulative lines of each language of each day in the table of the language chart', () => {
    const html = renderView(byLanguage, 0);

    expect(html).toContain('<th>日付</th><th>Rust</th><th>Java</th>');
    expect(html).toContain(
      '<tr><td>2026-11-18</td><td>+780</td><td>+900</td></tr>',
    );
  });

  // 変更のある言語がないとき、言語別のグラフを出さない
  test('shows no language chart when no language has changes', () => {
    const empty = {
      sections: [
        { tab: '全体', heading: 'コード本体', stats: noChanges, languages: [] },
      ],
    };

    expect(count(renderView(empty, 0), /<svg /g)).toBe(1);
  });

  // 行数を持つ期間のページは、そのファイルの行数のグラフだけを描く。ほかのグラフと、棒の凡例は出さない
  test('draws only the chart of the lines of the tracked file, without the other charts and the legend of bars', () => {
    const html = renderView(withTracked, 0);

    expect(count(html, /<svg /g)).toBe(1);
    expect(count(html, /class="line count"/g)).toBe(1);
    expect(html).toContain('2026-11-16 〜 2026-11-18（3日間）');
    expect(html).not.toContain('<h2>コード本体</h2>');
  });

  // 行数のグラフは、線の終点に最後の日の行数を表示し、表に日ごとの行数を並べる
  test('shows the lines of the last day at the end of the line and lists the lines of each day in the table', () => {
    const html = renderView(withTracked, 0);

    expect(html).toContain('>8行</text>');
    expect(html).toContain('<th>日付</th><th>行数</th>');
    expect(html).toContain('<tr><td>2026-11-17</td><td>1,500</td></tr>');
  });

  // 行数を持たない期間は、行数のグラフを描かない
  test('draws no chart of lines when the period has no tracked file', () => {
    expect(renderView(week, 0)).not.toContain('class="line count"');
  });

  // 選んだタブのグラフだけを表示し、ほかのタブのグラフは隠す
  test('shows only the charts of the selected tab and hides the charts of the other tabs', () => {
    const tabsOfSections = (html: string) =>
      [...html.matchAll(/<section data-tab="(\d)"( hidden)?>/g)].map(match =>
        match.slice(1),
      );

    expect(tabsOfSections(renderView(tabbed, 0))).toEqual([
      ['0', undefined],
      ['1', ' hidden'],
      ['1', ' hidden'],
      ['2', ' hidden'],
    ]);
    expect(tabsOfSections(renderView(tabbed, 1))).toEqual([
      ['0', ' hidden'],
      ['1', undefined],
      ['1', undefined],
      ['2', ' hidden'],
    ]);
  });

  // セクションが1つもないとき、例外を投げる
  test('throws when there are no sections', () => {
    const empty = { sections: [] };

    expect(() => renderView(empty, 0)).toThrow(RangeError);
  });

  // セクションに日が1つもないとき、例外を投げる
  test('throws when a section has no days', () => {
    const noDays = {
      sections: [{ tab: '全体', heading: 'x', stats: [] }],
    };

    expect(() => renderView(noDays, 0)).toThrow(RangeError);
  });
});
