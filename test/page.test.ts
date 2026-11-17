import { describe, expect, test } from 'vitest';
import { buildDailyStats } from '../src/daily-stats.ts';
import { renderPage } from '../src/page.ts';

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
const all = { heading: 'すべてのファイル', stats };
const code = { heading: 'コードのみ', stats: codeStats };

const count = (text: string, pattern: RegExp) =>
  [...text.matchAll(pattern)].length;

// グラフのページ
describe('renderPage', () => {
  // 追加のある日ごとに追加の棒を、削除のある日ごとに削除の棒を描く
  test('draws a bar for each day with added lines and each day with deleted lines', () => {
    const page = renderPage('my-repo', [all]);

    expect(count(page, /class="bar added"/g)).toBe(2);
    expect(count(page, /class="bar deleted"/g)).toBe(1);
  });

  // 累計の線は、日ごとに1つの点を持つ
  test('draws one point of the cumulative line for each day', () => {
    const page = renderPage('my-repo', [all]);

    expect(count(page, /class="marker"/g)).toBe(3);
  });

  // 線の終点に、期間全体の純増を表示する
  test('shows the net change of the whole period at the end of the line', () => {
    expect(renderPage('my-repo', [all])).toContain('累計 +780');
  });

  // 表には、日ごとの追加・削除・純増・累計が並ぶ
  test('lists added, deleted, net, and cumulative lines of each day in the table', () => {
    const page = renderPage('my-repo', [all]);

    expect(page).toContain(
      '<tr><td>2026-11-18</td><td>+30</td><td>−450</td><td>−420</td><td>+780</td></tr>',
    );
  });

  // セクションごとに、見出し・グラフ・表を、渡した順に上から並べる
  test('places a heading, a chart, and a table for each section in the given order', () => {
    const page = renderPage('my-repo', [all, code]);

    expect(count(page, /<svg /g)).toBe(2);
    expect(count(page, /<table>/g)).toBe(2);
    expect(page.indexOf('<h2>すべてのファイル</h2>')).toBeGreaterThan(-1);
    expect(page.indexOf('<h2>コードのみ</h2>')).toBeGreaterThan(
      page.indexOf('<h2>すべてのファイル</h2>'),
    );
  });

  // 各セクションのグラフは、そのセクションの行数を表示する
  test('shows the lines of its own section in each chart', () => {
    const page = renderPage('my-repo', [all, code]);

    expect(page).toContain('累計 +780');
    expect(page).toContain('累計 +900');
  });

  // 期間の最初の日と最後の日を表示する
  test('shows the first day and the last day of the period', () => {
    expect(renderPage('my-repo', [all])).toContain(
      '2026-11-16 〜 2026-11-18（3日間）',
    );
  });

  // リポジトリ名はエスケープして表示する
  test('escapes the repository name', () => {
    const page = renderPage('<script>', [all]);

    expect(page).toContain('&lt;script&gt; のコード行数の変化');
    expect(page).not.toContain('<script> のコード行数の変化');
  });

  // セクションが1つもないとき、例外を投げる
  test('throws when there are no sections', () => {
    expect(() => renderPage('my-repo', [])).toThrow(RangeError);
  });

  // セクションに日が1つもないとき、例外を投げる
  test('throws when a section has no days', () => {
    expect(() => renderPage('my-repo', [{ heading: 'x', stats: [] }])).toThrow(
      RangeError,
    );
  });
});
