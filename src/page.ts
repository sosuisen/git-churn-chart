import { escapeHtml, MINUS } from './format.ts';
import { buildView, type PageData, renderView, tabsOf } from './view.ts';

/** Periods that the page offers as buttons. Each one ends on the last day of the page. */
const PRESETS = [
  { days: 7, label: '1週間' },
  { days: 14, label: '2週間' },
  { days: 30, label: '1か月' },
  { days: 90, label: '3か月' },
  { days: 180, label: '6か月' },
  { days: 365, label: '1年' },
] as const;

const STYLE = `
:root {
  color-scheme: light;
  --page: #f9f9f7;
  --surface: #fcfcfb;
  --text-primary: #0b0b0b;
  --text-secondary: #52514e;
  --text-muted: #898781;
  --grid: #e1e0d9;
  --baseline: #c3c2b7;
  --border: rgba(11, 11, 11, 0.1);
  --added: #2a78d6;
  --deleted: #eb6834;
  --cumulative: #1baf7a;
  --series-1: #2a78d6;
  --series-2: #eb6834;
  --series-3: #1baf7a;
  --series-4: #eda100;
  --series-5: #e87ba4;
  --series-6: #008300;
  --series-7: #6250d6;
  --series-8: #e34948;
}
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --page: #0d0d0d;
    --surface: #1a1a19;
    --text-primary: #f0efec;
    --text-secondary: #c3c2b7;
    --grid: #2c2c2a;
    --baseline: #383835;
    --border: rgba(255, 255, 255, 0.1);
    --added: #3987e5;
    --deleted: #d95926;
    --cumulative: #199e70;
    --series-1: #3987e5;
    --series-2: #d95926;
    --series-3: #199e70;
    --series-4: #c98500;
    --series-5: #d55181;
    --series-6: #0ca30c;
    --series-7: #9085e9;
    --series-8: #e66767;
  }
}
body {
  margin: 0;
  padding: 24px 16px;
  background: var(--page);
  color: var(--text-primary);
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
}
main {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
}
h1 { margin: 0; font-size: 20px; }
.tabs { display: flex; flex-wrap: wrap; gap: 4px; margin: 12px 0 0; border-bottom: 1px solid var(--border); }
.tabs button { padding: 8px 16px; margin-bottom: -1px; background: transparent; border: 0; border-bottom: 2px solid transparent; color: var(--text-secondary); font: inherit; font-size: 14px; cursor: pointer; }
.tabs button[aria-pressed="true"] { border-bottom-color: var(--text-primary); color: var(--text-primary); font-weight: 600; }
.periods { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin: 12px 0 16px; }
.periods label { display: flex; align-items: center; gap: 6px; margin-left: 12px; color: var(--text-secondary); font-size: 13px; }
.periods input { padding: 3px 8px; background: transparent; border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font: inherit; font-size: 13px; font-variant-numeric: tabular-nums; }
.periods button { padding: 4px 12px; background: transparent; border: 1px solid var(--border); border-radius: 6px; color: var(--text-secondary); font: inherit; font-size: 13px; cursor: pointer; }
.periods button[aria-pressed="true"] { background: var(--text-primary); border-color: var(--text-primary); color: var(--surface); }
.period { margin: 0 0 16px; color: var(--text-secondary); font-size: 14px; }
.legend { display: flex; flex-wrap: wrap; gap: 4px 20px; margin: 0 0 20px; padding: 0; list-style: none; color: var(--text-secondary); font-size: 13px; }
.legend li { display: flex; align-items: center; gap: 6px; }
.swatch { width: 12px; height: 12px; border-radius: 2px; }
.swatch.line { height: 2px; border-radius: 1px; }
section + section { margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--grid); }
h2 { margin: 0 0 8px; font-size: 16px; }
h3 { margin: 24px 0 8px; color: var(--text-secondary); font-size: 14px; }
h3 + .legend { margin-bottom: 8px; }
.legend .total { color: var(--text-primary); font-variant-numeric: tabular-nums; }
.chart { position: relative; }
svg { display: block; width: 100%; height: auto; }
.grid { stroke: var(--grid); stroke-width: 1; }
.baseline { stroke: var(--baseline); stroke-width: 1; }
.tick { fill: var(--text-muted); font-size: 12px; font-variant-numeric: tabular-nums; }
.bar.added { fill: var(--added); }
.bar.deleted { fill: var(--deleted); }
.line { fill: none; stroke: var(--cumulative); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.line.series-1 { stroke: var(--series-1); }
.line.series-2 { stroke: var(--series-2); }
.line.series-3 { stroke: var(--series-3); }
.line.series-4 { stroke: var(--series-4); }
.line.series-5 { stroke: var(--series-5); }
.line.series-6 { stroke: var(--series-6); }
.line.series-7 { stroke: var(--series-7); }
.line.series-8 { stroke: var(--series-8); }
.line.count { stroke: var(--series-1); }
.marker { fill: var(--cumulative); stroke: var(--surface); stroke-width: 2; }
.end-label { fill: var(--text-primary); font-size: 13px; font-weight: 600; }
.series-label { font-size: 12px; font-weight: 600; }
.series-total { fill: var(--text-primary); font-variant-numeric: tabular-nums; }
.series-label.series-1 { fill: var(--series-1); }
.series-label.series-2 { fill: var(--series-2); }
.series-label.series-3 { fill: var(--series-3); }
.series-label.series-4 { fill: var(--series-4); }
.series-label.series-5 { fill: var(--series-5); }
.series-label.series-6 { fill: var(--series-6); }
.series-label.series-7 { fill: var(--series-7); }
.series-label.series-8 { fill: var(--series-8); }
.hit { fill: var(--text-primary); fill-opacity: 0; outline: none; }
.hit:hover, .hit:focus { fill-opacity: 0.06; }
.tooltip {
  position: absolute;
  transform: translateX(-50%);
  padding: 8px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-size: 13px;
  white-space: nowrap;
  pointer-events: none;
}
.tooltip strong { display: block; margin-bottom: 4px; }
.tooltip div { display: flex; justify-content: space-between; gap: 16px; color: var(--text-secondary); }
.tooltip span:last-child { color: var(--text-primary); font-variant-numeric: tabular-nums; }
details { margin-top: 16px; font-size: 14px; }
summary { cursor: pointer; color: var(--text-secondary); }
table { margin-top: 8px; border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
th, td { padding: 4px 12px; border-bottom: 1px solid var(--grid); text-align: right; }
th { color: var(--text-secondary); font-weight: 600; }
th:first-child, td:first-child { text-align: left; }
`;

/**
 * Builds a self-contained HTML page.
 * The page shows the charts of one period. The reader selects the period
 * with a button or with two dates, inside the days of `data`.
 * The page draws the first period itself. So it is readable without the script.
 *
 * @param repoName Name of the repository. It is shown in the title.
 * @param days Length of the period that the page shows first. It ends on the last day of `data`.
 * It must be an integer from 1 to the number of days of `data`.
 * @param clientScript JavaScript that defines `startPage`. `readClientScript` builds it.
 */
export function renderPage(
  repoName: string,
  data: PageData,
  days: number,
  clientScript: string,
): string {
  if (!Number.isInteger(days) || days < 1 || days > data.dates.length) {
    throw new RangeError(
      `days must be an integer from 1 to ${data.dates.length}: ${days}`,
    );
  }
  const last = data.dates.length - 1;
  const first = last - (days - 1);
  const presets = PRESETS.filter(preset => preset.days <= data.dates.length);
  const buttons = presets.map(
    preset =>
      `<button type="button" data-days="${preset.days}" aria-pressed="${preset.days === days}">${preset.label}</button>`,
  );
  const dateInput = (id: string, label: string, index: number) =>
    `<label>${label}<input type="date" id="${id}" min="${data.dates[0]}" max="${data.dates[last]}" value="${data.dates[index]}"></label>`;
  const tabButtons = tabsOf(data).map(
    (tab, index) =>
      `<button type="button" data-tab="${index}" aria-pressed="${index === 0}">${escapeHtml(tab)}</button>`,
  );
  const tabBar =
    tabButtons.length === 0
      ? ''
      : `<div class="tabs" role="group" aria-label="グラフの種類">
${tabButtons.join('\n')}
</div>
`;
  const title = data.tracked
    ? `${escapeHtml(repoName)} の ${escapeHtml(data.tracked.path)} の行数`
    : `${escapeHtml(repoName)} のコード行数の変化`;
  // The legend explains the bars and the cumulative line. A page for a tracked file has neither.
  const legend = data.tracked
    ? ''
    : `<ul class="legend">
<li><span class="swatch" style="background: var(--added)"></span>追加（行。テストの数のグラフでは、テスト）</li>
<li><span class="swatch" style="background: var(--deleted)"></span>削除</li>
<li><span class="swatch line" style="background: var(--cumulative)"></span>純増の累計（追加 ${MINUS} 削除）</li>
</ul>
`;
  // "<" must not appear as is. It could end the script element early.
  const json = JSON.stringify(data).replaceAll('<', '\\u003c');
  // The script writes "</script>" in the HTML of a chart. As is, it would end this script element.
  const script = clientScript.replaceAll('</script', '<\\/script');
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${STYLE}</style>
</head>
<body>
<main>
<h1>${title}</h1>
${tabBar}<div class="periods" role="group" aria-label="期間">
${buttons.join('\n')}
${dateInput('start', '開始日', first)}
${dateInput('end', '終了日', last)}
</div>
${legend}<div id="view">
${renderView(buildView(data, first, last), 0)}
</div>
</main>
<script type="application/json" id="data">${json}</script>
<script>{
${script}
startPage(document, JSON.parse(document.getElementById('data').textContent), ${days});
}</script>
</body>
</html>
`;
}
