import { describe, expect, test } from 'vitest';
import { renderPage } from '../src/page.ts';
import type { PageData } from '../src/view.ts';

const dates = ['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18'];
const section = (tab: string, heading: string) => ({
  tab,
  heading,
  added: [10, 0, 5, 2],
  deleted: [0, 3, 0, 4],
});
const data: PageData = {
  dates,
  sections: [
    section('コード', 'コード本体'),
    section('テスト', 'テストコード'),
    section('テスト', 'テストの数'),
    section('全体', 'すべてのファイル'),
  ],
};
const tracked: PageData = {
  dates,
  sections: [],
  tracked: { path: 'docs/plans.md', lines: [3, 8, 8, 5] },
};
const SCRIPT = 'function startPage() {}';

/** A page of one year. The buttons of all periods fit in it. */
const yearPage = (days: number) => {
  const zeros = Array.from({ length: 365 }, () => 0);
  const year: PageData = {
    dates: zeros.map((_, index) =>
      new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10),
    ),
    sections: [{ tab: '全体', heading: 'x', added: zeros, deleted: zeros }],
  };
  return renderPage('my-repo', year, days, SCRIPT);
};

// グラフのページ
describe('renderPage', () => {
  // 最初に出す期間は、最後の日で終わる、指定した日数の期間である
  test('shows first the period of the given number of days that ends on the last day', () => {
    const page = renderPage('my-repo', data, 3, SCRIPT);

    expect(page).toContain('2026-11-16 〜 2026-11-18（3日間）');
    expect(page).toContain('累計 0');
  });

  // 開始日と終了日の入力は、最初の期間の日付を持つ。選べる範囲は、ページの最初の日から最後の日までである
  test('gives the inputs of the start and the end the dates of the first period, inside the days of the page', () => {
    const page = renderPage('my-repo', data, 3, SCRIPT);

    expect(page).toContain(
      '<input type="date" id="start" min="2026-11-15" max="2026-11-18" value="2026-11-16">',
    );
    expect(page).toContain(
      '<input type="date" id="end" min="2026-11-15" max="2026-11-18" value="2026-11-18">',
    );
  });

  // 期間のボタンは、1週間・2週間・1か月・3か月・6か月・1年の順に並ぶ。最初の期間と同じ日数のボタンは、押された状態である
  test('lists the buttons of the periods from one week to one year, with the one of the first period pressed', () => {
    const buttons = (page: string) =>
      [
        ...page.matchAll(
          /<button [^>]*data-days="(\d+)" aria-pressed="(\w+)">([^<]*)</g,
        ),
      ].map(match => match.slice(1));

    expect(buttons(yearPage(30))).toEqual([
      ['7', 'false', '1週間'],
      ['14', 'false', '2週間'],
      ['30', 'true', '1か月'],
      ['90', 'false', '3か月'],
      ['180', 'false', '6か月'],
      ['365', 'false', '1年'],
    ]);
    expect(buttons(yearPage(10)).map(([, pressed]) => pressed)).toEqual(
      Array.from({ length: 6 }, () => 'false'),
    );
  });

  // タブごとのボタンを、最初のグラフの順に並べる。最初のタブのボタンは、押された状態である
  test('lists a button for each tab in the order of their first charts, with the first one pressed', () => {
    const page = renderPage('my-repo', data, 3, SCRIPT);

    expect(
      [
        ...page.matchAll(
          /<button [^>]*data-tab="(\d)" aria-pressed="(\w+)">([^<]*)</g,
        ),
      ].map(match => match.slice(1)),
    ).toEqual([
      ['0', 'true', 'コード'],
      ['1', 'false', 'テスト'],
      ['2', 'false', '全体'],
    ]);
  });

  // ページは、すべての日のデータと、渡したスクリプトを持つ。スクリプトは、最初の日数で始まる
  test('has the data of every day and the given script, which starts with the first number of days', () => {
    const page = renderPage('my-repo', data, 3, SCRIPT);

    const json =
      /<script type="application\/json" id="data">(.*?)<\/script>/.exec(
        page,
      )?.[1];
    expect(JSON.parse(json ?? '')).toEqual(data);
    expect(page).toContain(SCRIPT);
    expect(page).toContain(', 3);\n}</script>');
  });

  // スクリプトの中の</script>は、エスケープする。スクリプトの要素を途中で終わらせないためである
  test('escapes </script> in the script, so that it does not end the script element early', () => {
    const page = renderPage('my-repo', data, 3, "const x = '</script>';");

    expect(page).toContain("const x = '<\\/script>';");
  });

  // ファイルの行数のページは、見出しにファイルのパスを書く。タブと、棒の凡例は出さない
  test('writes the path of the file in the title of the page of a tracked file, without the tabs and the legend of bars', () => {
    const page = renderPage('my-repo', tracked, 3, SCRIPT);

    expect(page).toContain('<h1>my-repo の docs/plans.md の行数</h1>');
    expect(page).toContain('class="line count"');
    expect(page).not.toContain('class="legend"');
    expect(page).not.toContain('class="tabs"');
  });

  // リポジトリ名はエスケープして表示する
  test('escapes the repository name', () => {
    const page = renderPage('<script>', data, 3, SCRIPT);

    expect(page).toContain('&lt;script&gt; のコード行数の変化');
    expect(page).not.toContain('<script> のコード行数の変化');
  });

  // 最初の日数が、1からページの日数までの整数でないとき、例外を投げる
  test('throws when the first number of days is not an integer from 1 to the days of the page', () => {
    expect(() => renderPage('my-repo', data, 0, SCRIPT)).toThrow(RangeError);
    expect(() => renderPage('my-repo', data, 5, SCRIPT)).toThrow(RangeError);
    expect(() => renderPage('my-repo', data, 1.5, SCRIPT)).toThrow(RangeError);
  });
});
