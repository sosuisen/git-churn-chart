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
const all = { tab: '全体', heading: 'すべてのファイル', stats };
const code = { tab: '全体', heading: 'コードのみ', stats: codeStats };
const noChanges = buildDailyStats([], '2026-11-18', 3);
const byLanguage = {
  label: '1週間',
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
  label: '1週間',
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

  // 言語を持つセクションは、グラフの下に、言語ごとに1本の線のグラフを描く。棒は描かない
  test('draws a second chart with one line for each language and no bars below the chart', () => {
    const page = renderPage('my-repo', [byLanguage], 0);

    expect(count(page, /<svg /g)).toBe(2);
    expect(count(page, /class="line series-1"/g)).toBe(1);
    expect(count(page, /class="line series-7"/g)).toBe(1);
    expect(count(page, /class="bar /g)).toBe(0);
  });

  // 言語別のグラフの凡例に、言語の名前と、期間全体の純増が並ぶ
  test('lists the name and the net change of each language in the legend of the language chart', () => {
    const page = renderPage('my-repo', [byLanguage], 0);

    expect(page).toContain('Rust<span class="total">+780</span>');
    expect(page).toContain('Java<span class="total">+900</span>');
  });

  // 言語別のグラフの表に、日ごとの、言語ごとの累計が並ぶ
  test('lists the cumulative lines of each language of each day in the table of the language chart', () => {
    const page = renderPage('my-repo', [byLanguage], 0);

    expect(page).toContain('<th>日付</th><th>Rust</th><th>Java</th>');
    expect(page).toContain(
      '<tr><td>2026-11-18</td><td>+780</td><td>+900</td></tr>',
    );
  });

  // 変更のある言語がないとき、言語別のグラフを出さない
  test('shows no language chart when no language has changes', () => {
    const empty = {
      label: '1週間',
      sections: [
        { tab: '全体', heading: 'コード本体', stats: noChanges, languages: [] },
      ],
    };

    expect(count(renderPage('my-repo', [empty], 0), /<svg /g)).toBe(1);
  });

  // 行数を持つ期間のページは、そのファイルの行数のグラフだけを描く。ほかのグラフと、棒の凡例は出さない
  test('draws only the chart of the lines of the tracked file, without the other charts and the legend of bars', () => {
    const page = renderPage('my-repo', [withTracked], 0);

    expect(count(page, /<svg /g)).toBe(1);
    expect(count(page, /class="line count"/g)).toBe(1);
    expect(page).toContain('<h1>my-repo の docs/plans.md の行数</h1>');
    expect(page).toContain('2026-11-16 〜 2026-11-18（3日間）');
    expect(page).not.toContain('<h2>コード本体</h2>');
    expect(page).not.toContain('class="legend"');
  });

  // 行数のグラフは、線の終点に最後の日の行数を表示し、表に日ごとの行数を並べる
  test('shows the lines of the last day at the end of the line and lists the lines of each day in the table', () => {
    const page = renderPage('my-repo', [withTracked], 0);

    expect(page).toContain('>8行</text>');
    expect(page).toContain('<th>日付</th><th>行数</th>');
    expect(page).toContain('<tr><td>2026-11-17</td><td>1,500</td></tr>');
  });

  // 行数を持たない期間は、行数のグラフを描かない
  test('draws no chart of lines when the period has no tracked file', () => {
    expect(renderPage('my-repo', [week], 0)).not.toContain(
      'class="line count"',
    );
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
    const noDays = {
      label: '1週間',
      sections: [{ tab: '全体', heading: 'x', stats: [] }],
    };

    expect(() => renderPage('my-repo', [noDays], 0)).toThrow(RangeError);
  });
});
