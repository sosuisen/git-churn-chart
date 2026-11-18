import {
  type LanguageLine,
  renderChartSvg,
  renderFileLinesSvg,
  renderLanguagesSvg,
} from './chart-svg.ts';
import type { DailyStat } from './daily-stats.ts';
import type { DailyLines } from './file-lines.ts';
import { escapeHtml, formatCount, formatSigned, MINUS } from './format.ts';

// This module also runs in the browser. The page draws a new view when the reader changes the period.
// So it must not use Node.js, and it must import only modules that the page also gets.

/** Added and deleted lines of each day. Both arrays have one number for each day of the page. */
export interface DailySeries {
  readonly added: readonly number[];
  readonly deleted: readonly number[];
}

/** The numbers of one language on every day of the page. */
export interface LanguageSeries extends DailySeries {
  /** Name of the language. */
  readonly name: string;
  /** Position of the language in the fixed list of languages, from 0. It selects the color. */
  readonly colorIndex: number;
}

/** The numbers of one chart on every day of the page. */
export interface SectionSeries extends DailySeries {
  /** Name of the tab that shows the chart. */
  readonly tab: string;
  readonly heading: string;
  /** The same numbers split by language. A chart without it has no chart of languages. */
  readonly languages?: readonly LanguageSeries[];
}

/** The number of lines of one file on every day of the page. */
export interface TrackedSeries {
  /** Path of the file. It is shown in the title. */
  readonly path: string;
  /** Number of lines at the end of each day. */
  readonly lines: readonly number[];
}

/**
 * Everything that the page knows about the repository.
 * The page keeps it, and cuts a view out of it for the period that the reader selects.
 */
export interface PageData {
  /** All days of the page in date order, in `YYYY-MM-DD`. It must not be empty. */
  readonly dates: readonly string[];
  /** Charts of the page. It must not be empty, unless `tracked` is set. */
  readonly sections: readonly SectionSeries[];
  /** When it is set, the page shows only the chart of this file. */
  readonly tracked?: TrackedSeries;
}

/** One chart of a view with its heading. */
export interface ChartSection {
  /**
   * Name of the tab that shows the chart. The page shows one tab at a time.
   * The tabs are in the order of their first chart.
   */
  readonly tab: string;
  readonly heading: string;
  /** Days in date order. It must not be empty. */
  readonly stats: readonly DailyStat[];
  /**
   * The same numbers split by language. When it is set, a second chart
   * below the first one shows the cumulative line of each language.
   * Every language covers the same days as `stats`.
   */
  readonly languages?: readonly LanguageLine[];
}

/** The charts of one period. */
export interface View {
  /**
   * Charts of the period. All sections cover the same days.
   * It must not be empty, unless `tracked` is set. Then the page does not show it.
   */
  readonly sections: readonly ChartSection[];
  /** The number of lines of one file. When it is set, the view shows only this chart. */
  readonly tracked?: FileLines;
}

/** The number of lines of one file on each day of a period. */
export interface FileLines {
  /** Path of the file. */
  readonly path: string;
  /** Days in date order. */
  readonly days: readonly DailyLines[];
}

/**
 * Cuts the view of one period out of the data of the page.
 * The cumulative net change starts from the first day of the period.
 * A language without changes in the period is left out.
 *
 * @param from Index of the first day of the period in `data.dates`.
 * @param to Index of the last day of the period in `data.dates`. It must not be less than `from`.
 */
export function buildView(data: PageData, from: number, to: number): View {
  const isIndex = (value: number) =>
    Number.isInteger(value) && value >= 0 && value < data.dates.length;
  if (!isIndex(from) || !isIndex(to) || from > to) {
    throw new RangeError(`the period must be days of the page: ${from}, ${to}`);
  }
  const dates = data.dates.slice(from, to + 1);
  const toStats = (series: DailySeries): DailyStat[] => {
    let cumulative = 0;
    return dates.map((date, offset) => {
      const added = series.added[from + offset] ?? 0;
      const deleted = series.deleted[from + offset] ?? 0;
      const net = added - deleted;
      cumulative += net;
      return { date, added, deleted, net, cumulative };
    });
  };
  const sections = data.sections.map(section => ({
    tab: section.tab,
    heading: section.heading,
    stats: toStats(section),
    ...(section.languages && {
      languages: section.languages
        .map(language => ({
          name: language.name,
          colorIndex: language.colorIndex,
          stats: toStats(language),
        }))
        .filter(line =>
          line.stats.some(stat => stat.added > 0 || stat.deleted > 0),
        ),
    }),
  }));
  const tracked = data.tracked;
  return {
    sections,
    ...(tracked && {
      tracked: {
        path: tracked.path,
        days: dates.map((date, offset) => ({
          date,
          lines: tracked.lines[from + offset] ?? 0,
        })),
      },
    }),
  };
}

/**
 * Finds the day of a date that the reader typed.
 * A date before the first day gives the first day. A date after the last day gives the last day.
 *
 * @param dates Days in date order, in `YYYY-MM-DD`.
 * @param date Date in `YYYY-MM-DD`. Other text gives `undefined`.
 * @returns Index of the day in `dates`.
 */
export function indexOfDate(
  dates: readonly string[],
  date: string,
): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || dates.length === 0) {
    return undefined;
  }
  // Dates in this format sort as text.
  const later = dates.findIndex(day => day >= date);
  return later === -1 ? dates.length - 1 : later;
}

/** Names of the tabs of the page, in the order of their first chart. A page for a tracked file has no tabs. */
export function tabsOf(data: PageData | View): string[] {
  return data.tracked
    ? []
    : [...new Set(data.sections.map(section => section.tab))];
}

/**
 * Draws the charts of one period as HTML.
 * Each section has a chart and a table view. Only the sections of one tab are visible.
 *
 * @param tab Index of the visible tab in the tabs of the view.
 */
export function renderView(view: View, tab: number): string {
  const days = view.tracked?.days ?? view.sections[0]?.stats;
  if (days === undefined) {
    throw new RangeError('sections must not be empty');
  }
  const tabs = tabsOf(view);
  // The chart functions reject empty days. A second check here would be a duplicate.
  const body = view.tracked
    ? renderTracked(view.tracked)
    : view.sections
        .map(section => renderSection(section, tabs.indexOf(section.tab), tab))
        .join('\n');
  const first = days[0]?.date ?? '';
  const last = days.at(-1)?.date ?? '';
  return `<p class="period">${first} 〜 ${last}（${days.length}日間）</p>
${body}`;
}

/** The only chart of a page for a tracked file. The title of the page names the file. */
function renderTracked(tracked: FileLines): string {
  const rows = tracked.days.map(day => ({
    date: day.date,
    values: [['行数', formatCount(day.lines)] as const],
  }));
  return `<section>
${renderChart(renderFileLinesSvg(tracked.days), rows)}
</section>`;
}

/** The values of one day. The tooltip and the table view both show them. */
interface Row {
  readonly date: string;
  readonly values: readonly (readonly [label: string, value: string])[];
}

/**
 * @param tab Index of the tab of the section.
 * @param visibleTab Index of the tab that the page shows.
 */
function renderSection(
  section: ChartSection,
  tab: number,
  visibleTab: number,
): string {
  const languages = section.languages ?? [];
  return `<section data-tab="${tab}"${tab === visibleTab ? '' : ' hidden'}>
<h2>${escapeHtml(section.heading)}</h2>
${renderChart(renderChartSvg(section.stats), section.stats.map(toRow))}
${languages.length === 0 ? '' : renderLanguages(languages)}
</section>`;
}

function renderLanguages(languages: readonly LanguageLine[]): string {
  const items = languages.map(
    ({ name, colorIndex, stats }) =>
      `<li><span class="swatch line" style="background: var(--series-${colorIndex + 1})"></span>${escapeHtml(name)}<span class="total">${formatSigned(stats.at(-1)?.cumulative ?? 0)}</span></li>`,
  );
  return `<h3>言語別の、純増の累計</h3>
<ul class="legend">
${items.join('\n')}
</ul>
${renderChart(renderLanguagesSvg(languages), toLanguageRows(languages))}`;
}

/** A chart with its tooltip and its table view. */
function renderChart(svg: string, rows: readonly Row[]): string {
  const labels = rows[0]?.values.map(([label]) => label) ?? [];
  const bodyRows = rows.map(
    row =>
      `<tr><td>${row.date}</td>${row.values
        .map(([, value]) => `<td>${value}</td>`)
        .join('')}</tr>`,
  );
  // "<" must not appear as is. It could end the script element early.
  const json = JSON.stringify(rows).replaceAll('<', '\\u003c');
  return `<div class="chart">
${svg}
<div class="tooltip" hidden></div>
<script type="application/json">${json}</script>
</div>
<details>
<summary>表で見る</summary>
<table>
<thead><tr><th>日付</th>${labels.map(label => `<th>${escapeHtml(label)}</th>`).join('')}</tr></thead>
<tbody>
${bodyRows.join('\n')}
</tbody>
</table>
</details>`;
}

function toRow(stat: DailyStat): Row {
  return {
    date: stat.date,
    values: [
      ['追加', stat.added === 0 ? '0' : `+${formatCount(stat.added)}`],
      [
        '削除',
        stat.deleted === 0 ? '0' : `${MINUS}${formatCount(stat.deleted)}`,
      ],
      ['純増', formatSigned(stat.net)],
      ['累計', formatSigned(stat.cumulative)],
    ],
  };
}

/** One row for each day, with the cumulative net change of each language. */
function toLanguageRows(languages: readonly LanguageLine[]): Row[] {
  const days = languages[0]?.stats ?? [];
  return days.map((day, index) => ({
    date: day.date,
    values: languages.map(
      ({ name, stats }) =>
        [name, formatSigned(stats[index]?.cumulative ?? 0)] as const,
    ),
  }));
}
