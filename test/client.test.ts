import { describe, expect, test } from 'vitest';
import { readClientScript } from '../src/client-script.ts';
import { startPage } from '../src/client.ts';
import { buildView, type PageData, renderView } from '../src/view.ts';

const dates = [
  '2026-11-13',
  '2026-11-14',
  '2026-11-15',
  '2026-11-16',
  '2026-11-17',
  '2026-11-18',
];
const section = (tab: string, heading: string) => ({
  tab,
  heading,
  added: [1, 2, 3, 4, 5, 6],
  deleted: [0, 0, 0, 0, 0, 0],
});
const data: PageData = {
  dates,
  sections: [section('コード', 'コード本体'), section('全体', 'すべて')],
};

/** A small stand-in for an element of the page. It keeps what the script sets. */
class FakeElement {
  innerHTML = '';
  value = '';
  readonly attributes: Record<string, string> = {};
  readonly listeners: Record<string, () => void> = {};
  readonly dataset: Record<string, string>;

  constructor(dataset: Record<string, string> = {}) {
    this.dataset = dataset;
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  addEventListener(type: string, listener: () => void): void {
    this.listeners[type] = listener;
  }

  /** Runs the listener of an event, as the browser does. */
  fire(type: string): void {
    this.listeners[type]?.();
  }
}

/** A stand-in for the page, with buttons for periods of 2 and 6 days and for two tabs. */
function fakePage() {
  const view = new FakeElement();
  const start = new FakeElement();
  const end = new FakeElement();
  const presets = [
    new FakeElement({ days: '2' }),
    new FakeElement({ days: '6' }),
  ];
  const tabs = [new FakeElement({ tab: '0' }), new FakeElement({ tab: '1' })];
  const one: Record<string, FakeElement> = {
    '#view': view,
    '#start': start,
    '#end': end,
  };
  const many: Record<string, FakeElement[]> = {
    '.periods button': presets,
    '.tabs button': tabs,
  };
  const document = {
    querySelector: (selector: string) => one[selector] ?? null,
    querySelectorAll: (selector: string) => many[selector] ?? [],
  } as unknown as Document;
  const pressed = (buttons: FakeElement[]) =>
    buttons.map(button => button.attributes['aria-pressed']);
  return {
    document,
    view,
    start,
    end,
    presets,
    tabs,
    /** What the page shows now. */
    state: () => ({
      period: /<p class="period">([^<]*)</.exec(view.innerHTML)?.[1],
      start: start.value,
      end: end.value,
      presets: pressed(presets),
      tabs: pressed(tabs),
      visibleTabs: [
        ...view.innerHTML.matchAll(/<section data-tab="(\d)">/g),
      ].map(match => match[1]),
    }),
  };
}

// ページの操作
describe('startPage', () => {
  // 最初に、最後の日で終わる、指定した日数の期間を出す。最初のタブを出す
  test('shows first the period of the given number of days that ends on the last day, with the first tab', () => {
    const page = fakePage();

    startPage(page.document, data, 2);

    expect(page.state()).toEqual({
      period: '2026-11-17 〜 2026-11-18（2日間）',
      start: '2026-11-17',
      end: '2026-11-18',
      presets: ['true', 'false'],
      tabs: ['true', 'false'],
      visibleTabs: ['0'],
    });
  });

  // 期間のボタンを押すと、最後の日で終わる、その日数の期間を出す
  test('shows the period of a button that ends on the last day when the button is pressed', () => {
    const page = fakePage();
    startPage(page.document, data, 2);

    page.presets[1]?.fire('click');

    expect(page.state()).toMatchObject({
      period: '2026-11-13 〜 2026-11-18（6日間）',
      start: '2026-11-13',
      presets: ['false', 'true'],
    });
  });

  // 開始日と終了日を変えると、その期間を出す。同じ期間のボタンがなければ、どのボタンも押されていない
  test('shows the period between the two dates when they change, with no button pressed when no button has that period', () => {
    const page = fakePage();
    startPage(page.document, data, 2);

    page.start.value = '2026-11-14';
    page.start.fire('change');
    page.end.value = '2026-11-16';
    page.end.fire('change');

    expect(page.state()).toMatchObject({
      period: '2026-11-14 〜 2026-11-16（3日間）',
      start: '2026-11-14',
      end: '2026-11-16',
      presets: ['false', 'false'],
    });
  });

  // 最後の日で終わらない期間は、日数がボタンと同じでも、ボタンは押されていない
  test('presses no button for a period that does not end on the last day, even with the days of a button', () => {
    const page = fakePage();
    startPage(page.document, data, 2);

    page.start.value = '2026-11-14';
    page.end.value = '2026-11-15';
    page.end.fire('change');

    expect(page.state()).toMatchObject({
      period: '2026-11-14 〜 2026-11-15（2日間）',
      presets: ['false', 'false'],
    });
  });

  // 開始日が終了日より後のとき、2つの日を入れ替えた期間を出す
  test('shows the period with the two days in order when the start is after the end', () => {
    const page = fakePage();
    startPage(page.document, data, 2);

    page.start.value = '2026-11-18';
    page.end.value = '2026-11-15';
    page.end.fire('change');

    expect(page.state()).toMatchObject({
      period: '2026-11-15 〜 2026-11-18（4日間）',
      start: '2026-11-15',
      end: '2026-11-18',
    });
  });

  // ページの日の外の日付は、最初の日か最後の日に直す。空の日付は、今の日のままにする
  test('moves a date outside the page to the first or the last day, and keeps the day for an empty date', () => {
    const page = fakePage();
    startPage(page.document, data, 2);

    page.start.value = '2020-01-01';
    page.end.value = '';
    page.start.fire('change');

    expect(page.state()).toMatchObject({
      period: '2026-11-13 〜 2026-11-18（6日間）',
      start: '2026-11-13',
      end: '2026-11-18',
    });
  });

  // タブを押すと、そのタブのグラフを出す。期間を変えても、タブはそのままである
  test('shows the charts of a tab when it is pressed, and keeps the tab when the period changes', () => {
    const page = fakePage();
    startPage(page.document, data, 2);

    page.tabs[1]?.fire('click');
    page.presets[1]?.fire('click');

    expect(page.state()).toMatchObject({
      period: '2026-11-13 〜 2026-11-18（6日間）',
      tabs: ['false', 'true'],
      visibleTabs: ['1'],
    });
  });

  // グラフを出す場所のないページでは、何もしない
  test('does nothing on a page without the place for the charts', () => {
    const document = {
      querySelector: () => null,
      querySelectorAll: () => [],
    } as unknown as Document;

    expect(() => startPage(document, data, 2)).not.toThrow();
  });
});

// ページのスクリプト
describe('readClientScript', () => {
  // スクリプトは、ブラウザの中で、テストしたモジュールと同じHTMLを描く
  test('draws in the browser the same HTML as the modules that the tests check', () => {
    const run = new Function(
      'data',
      `${readClientScript()}\nreturn renderView(buildView(data, 1, 4), 1);`,
    );

    expect(run(data)).toBe(renderView(buildView(data, 1, 4), 1));
  });

  // スクリプトのstartPageは、ページの操作を始める
  test('starts the controls of the page with its startPage', () => {
    const page = fakePage();
    const run = new Function(
      'document',
      'data',
      `${readClientScript()}\nstartPage(document, data, 2);`,
    );

    run(page.document, data);
    page.presets[1]?.fire('click');

    expect(page.state().period).toBe('2026-11-13 〜 2026-11-18（6日間）');
  });

  // スクリプトには、importとexportが残らない
  test('leaves no import and no export in the script', () => {
    expect(readClientScript()).not.toMatch(/^(import|export)\b/m);
  });
});
