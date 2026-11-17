import { renderChartSvg } from './chart-svg.ts';
import type { DailyStat } from './daily-stats.ts';
import { escapeHtml, formatCount, formatSigned } from './format.ts';

const MINUS = '−';

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
.periods { display: flex; flex-wrap: wrap; gap: 4px; margin: 12px 0 16px; }
.periods button { padding: 4px 12px; background: transparent; border: 1px solid var(--border); border-radius: 6px; color: var(--text-secondary); font: inherit; font-size: 13px; cursor: pointer; }
.periods button[aria-pressed="true"] { background: var(--text-primary); border-color: var(--text-primary); color: var(--surface); }
.period { margin: 0 0 16px; color: var(--text-secondary); font-size: 14px; }
.legend { display: flex; flex-wrap: wrap; gap: 4px 20px; margin: 0 0 20px; padding: 0; list-style: none; color: var(--text-secondary); font-size: 13px; }
.legend li { display: flex; align-items: center; gap: 6px; }
.swatch { width: 12px; height: 12px; border-radius: 2px; }
.swatch.line { height: 2px; border-radius: 1px; }
section + section { margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--grid); }
h2 { margin: 0 0 8px; font-size: 16px; }
.chart { position: relative; }
svg { display: block; width: 100%; height: auto; }
.grid { stroke: var(--grid); stroke-width: 1; }
.baseline { stroke: var(--baseline); stroke-width: 1; }
.tick { fill: var(--text-muted); font-size: 12px; font-variant-numeric: tabular-nums; }
.bar.added { fill: var(--added); }
.bar.deleted { fill: var(--deleted); }
.line { fill: none; stroke: var(--cumulative); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.marker { fill: var(--cumulative); stroke: var(--surface); stroke-width: 2; }
.end-label { fill: var(--text-primary); font-size: 13px; font-weight: 600; }
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

// The tooltip only repeats values that the table view also shows.
const SCRIPT = `
for (const chart of document.querySelectorAll('.chart')) {
  const rows = JSON.parse(chart.querySelector('script').textContent);
  const tooltip = chart.querySelector('.tooltip');
  const show = target => {
    const row = rows[Number(target.dataset.index)];
    const title = document.createElement('strong');
    title.textContent = row.date;
    const lines = row.values.map(([label, value]) => {
      const line = document.createElement('div');
      const name = document.createElement('span');
      const amount = document.createElement('span');
      name.textContent = label;
      amount.textContent = value;
      line.append(name, amount);
      return line;
    });
    tooltip.replaceChildren(title, ...lines);
    tooltip.hidden = false;
    const box = target.getBoundingClientRect();
    const base = chart.getBoundingClientRect();
    const half = tooltip.offsetWidth / 2;
    const center = box.left - base.left + box.width / 2;
    tooltip.style.left = Math.min(Math.max(center, half), base.width - half) + 'px';
    tooltip.style.top = box.top - base.top + 'px';
  };
  const hide = () => {
    tooltip.hidden = true;
  };
  for (const target of chart.querySelectorAll('.hit')) {
    target.addEventListener('pointerenter', () => show(target));
    target.addEventListener('pointerleave', hide);
    target.addEventListener('focus', () => show(target));
    target.addEventListener('blur', hide);
  }
}
const buttons = document.querySelectorAll('.periods button');
const views = document.querySelectorAll('.view');
for (const button of buttons) {
  button.addEventListener('click', () => {
    for (const other of buttons) {
      other.setAttribute('aria-pressed', String(other === button));
    }
    for (const view of views) {
      view.hidden = view.dataset.period !== button.dataset.period;
    }
  });
}
`;

/** One chart of the page with its heading. */
export interface ChartSection {
  readonly heading: string;
  /** Days in date order. It must not be empty. */
  readonly stats: readonly DailyStat[];
}

/** One period that the page can show, with its charts. */
export interface Period {
  /** Name of the period. It is shown on the button that selects the period. */
  readonly label: string;
  /** Charts of the period. It must not be empty. All sections cover the same days. */
  readonly sections: readonly ChartSection[];
}

/**
 * Builds a self-contained HTML page. The page has one view for each period.
 * Each view has a chart and a table view for each section, from top to bottom.
 *
 * @param repoName Name of the repository. It is shown in the title.
 * @param periods Periods to show. Each period gets a button that selects it.
 * @param selected Index of the period that the page shows first. It must be an index of `periods`.
 */
export function renderPage(
  repoName: string,
  periods: readonly Period[],
  selected: number,
): string {
  // Without this check, the page would hide every period.
  if (periods[selected] === undefined) {
    throw new RangeError(`selected must be an index of periods: ${selected}`);
  }
  const buttons = periods.map(
    (period, index) =>
      `<button type="button" data-period="${index}" aria-pressed="${index === selected}">${escapeHtml(period.label)}</button>`,
  );
  const views = periods.map((period, index) =>
    renderPeriod(period, index, index === selected),
  );
  const title = `${escapeHtml(repoName)} のコード行数の変化`;
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
<div class="periods" role="group" aria-label="期間">
${buttons.join('\n')}
</div>
<ul class="legend">
<li><span class="swatch" style="background: var(--added)"></span>追加（行。テストの数のグラフでは、テスト）</li>
<li><span class="swatch" style="background: var(--deleted)"></span>削除</li>
<li><span class="swatch line" style="background: var(--cumulative)"></span>純増の累計（追加 ${MINUS} 削除）</li>
</ul>
${views.join('\n')}
</main>
<script>${SCRIPT}</script>
</body>
</html>
`;
}

function renderPeriod(
  period: Period,
  index: number,
  isSelected: boolean,
): string {
  const stats = period.sections[0]?.stats;
  if (stats === undefined) {
    throw new RangeError('sections must not be empty');
  }
  // renderChartSvg rejects empty stats. A second check here would be a duplicate.
  const body = period.sections.map(renderSection).join('\n');
  const first = stats[0]?.date ?? '';
  const last = stats.at(-1)?.date ?? '';
  return `<div class="view" data-period="${index}"${isSelected ? '' : ' hidden'}>
<p class="period">${first} 〜 ${last}（${stats.length}日間）</p>
${body}
</div>`;
}

function renderSection(section: ChartSection): string {
  return `<section>
<h2>${escapeHtml(section.heading)}</h2>
<div class="chart">
${renderChartSvg(section.stats)}
<div class="tooltip" hidden></div>
<script type="application/json">${toJson(section.stats)}</script>
</div>
<details>
<summary>表で見る</summary>
${renderTable(section.stats)}
</details>
</section>`;
}

function renderTable(stats: readonly DailyStat[]): string {
  const rows = stats.map(
    stat =>
      `<tr><td>${stat.date}</td>${labeledValues(stat)
        .map(([, value]) => `<td>${value}</td>`)
        .join('')}</tr>`,
  );
  return `<table>
<thead><tr><th>日付</th><th>追加</th><th>削除</th><th>純増</th><th>累計</th></tr></thead>
<tbody>
${rows.join('\n')}
</tbody>
</table>`;
}

function labeledValues(stat: DailyStat): [label: string, value: string][] {
  return [
    ['追加', stat.added === 0 ? '0' : `+${formatCount(stat.added)}`],
    ['削除', stat.deleted === 0 ? '0' : `${MINUS}${formatCount(stat.deleted)}`],
    ['純増', formatSigned(stat.net)],
    ['累計', formatSigned(stat.cumulative)],
  ];
}

function toJson(stats: readonly DailyStat[]): string {
  const rows = stats.map(stat => ({
    date: stat.date,
    values: labeledValues(stat),
  }));
  // "<" must not appear as is. It could end the script element early.
  return JSON.stringify(rows).replaceAll('<', '\\u003c');
}
