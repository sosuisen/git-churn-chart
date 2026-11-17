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
const week = { label: '1週間', sections: [all] };
const both = { label: '2週間', sections: [all, code] };
const month = { label: '1か月', sections: [code] };

const count = (text: string, pattern: RegExp) =>
  [...text.matchAll(pattern)].length;

// グラフのページ
describe('renderPage', () => {
  // 追加のある日ごとに追加の棒を、削除のある日ごとに削除の棒を描く
  test('draws a bar for each day with added lines and each day with deleted lines', () => {
    const page = renderPage('my-repo', [week], 0);

    expect(count(page, /class="bar added"/g)).toBe(2);
    expect(count(page, /class="bar deleted"/g)).toBe(1);
  });

  // 累計の線は、日ごとに1つの点を持つ
  test('draws one point of the cumulative line for each day', () => {
    const page = renderPage('my-repo', [week], 0);

    expect(count(page, /class="marker"/g)).toBe(3);
  });

  // 線の終点に、期間全体の純増を表示する
  test('shows the net change of the whole period at the end of the line', () => {
    expect(renderPage('my-repo', [week], 0)).toContain('累計 +780');
  });

  // 表には、日ごとの追加・削除・純増・累計が並ぶ
  test('lists added, deleted, net, and cumulative lines of each day in the table', () => {
    const page = renderPage('my-repo', [week], 0);

    expect(page).toContain(
      '<tr><td>2026-11-18</td><td>+30</td><td>−450</td><td>−420</td><td>+780</td></tr>',
    );
  });

  // セクションごとに、見出し・グラフ・表を、渡した順に上から並べる
  test('places a heading, a chart, and a table for each section in the given order', () => {
    const page = renderPage('my-repo', [both], 0);

    expect(count(page, /<svg /g)).toBe(2);
    expect(count(page, /<table>/g)).toBe(2);
    expect(page.indexOf('<h2>すべてのファイル</h2>')).toBeGreaterThan(-1);
    expect(page.indexOf('<h2>コードのみ</h2>')).toBeGreaterThan(
      page.indexOf('<h2>すべてのファイル</h2>'),
    );
  });

  // 各セクションのグラフは、そのセクションの行数を表示する
  test('shows the lines of its own section in each chart', () => {
    const page = renderPage('my-repo', [both], 0);

    expect(page).toContain('累計 +780');
    expect(page).toContain('累計 +900');
  });

  // 期間の最初の日と最後の日を表示する
  test('shows the first day and the last day of the period', () => {
    expect(renderPage('my-repo', [week], 0)).toContain(
      '2026-11-16 〜 2026-11-18（3日間）',
    );
  });

  // 30日のグラフでは、横軸の日付を1日おきに書く。最後の日は必ず書く
  test('writes the date of every second day in a chart of 30 days, with the last day', () => {
    const longStats = buildDailyStats([], '2026-11-18', 30);
    const long = { label: '1か月', sections: [{ ...all, stats: longStats }] };

    const page = renderPage('my-repo', [long], 0);

    expect(count(page, /text-anchor="middle"/g)).toBe(15);
    expect(page).toContain('>11/18</text>');
    expect(page).not.toContain('>11/17</text>');
  });

  // 90日以上のグラフでは、累計の線に点を描かない。点が重なって、線が見えなくなるためである
  test('draws no points on the cumulative line in a chart of 90 days', () => {
    const longStats = buildDailyStats([], '2026-11-18', 90);
    const long = { label: '3か月', sections: [{ ...all, stats: longStats }] };

    const page = renderPage('my-repo', [long], 0);

    expect(count(page, /class="marker"/g)).toBe(0);
    expect(count(page, /class="line"/g)).toBe(1);
  });

  // 期間ごとのボタンを、渡した順に並べる
  test('places a button for each period in the given order', () => {
    const page = renderPage('my-repo', [week, month], 0);

    expect(page.indexOf('>1週間</button>')).toBeGreaterThan(-1);
    expect(page.indexOf('>1か月</button>')).toBeGreaterThan(
      page.indexOf('>1週間</button>'),
    );
  });

  // 選んだ期間のグラフだけを表示し、ほかの期間は隠す
  test('shows only the view of the selected period and hides the others', () => {
    const page = renderPage('my-repo', [week, month], 1);

    expect(page).toContain('<div class="view" data-period="0" hidden>');
    expect(page).toContain('<div class="view" data-period="1">');
  });

  // 選んだ期間のボタンは、押された状態である
  test('marks only the button of the selected period as pressed', () => {
    const page = renderPage('my-repo', [week, month], 1);

    expect(page).toContain('aria-pressed="false">1週間</button>');
    expect(page).toContain('aria-pressed="true">1か月</button>');
  });

  // リポジトリ名はエスケープして表示する
  test('escapes the repository name', () => {
    const page = renderPage('<script>', [week], 0);

    expect(page).toContain('&lt;script&gt; のコード行数の変化');
    expect(page).not.toContain('<script> のコード行数の変化');
  });

  // 選んだ期間が範囲の外のとき、例外を投げる
  test('throws when the selected period is out of range', () => {
    expect(() => renderPage('my-repo', [week], 1)).toThrow(RangeError);
  });

  // セクションが1つもないとき、例外を投げる
  test('throws when there are no sections', () => {
    const empty = { label: '1週間', sections: [] };

    expect(() => renderPage('my-repo', [empty], 0)).toThrow(RangeError);
  });

  // セクションに日が1つもないとき、例外を投げる
  test('throws when a section has no days', () => {
    const noDays = { label: '1週間', sections: [{ heading: 'x', stats: [] }] };

    expect(() => renderPage('my-repo', [noDays], 0)).toThrow(RangeError);
  });
});
