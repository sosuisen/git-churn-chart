import type { DailyStat } from './daily-stats.ts';
import { formatDay, formatSigned, formatTick } from './format.ts';
import { niceTicks } from './scale.ts';

const WIDTH = 960;
const HEIGHT = 420;
const MARGIN = { top: 24, right: 104, bottom: 40, left: 64 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;
const PLOT_BOTTOM = MARGIN.top + PLOT_HEIGHT;
const MAX_BAR_WIDTH = 24;
// A date such as "12/31" needs this width. Narrower days share one label.
const MIN_DAY_LABEL_WIDTH = 40;
const BAR_CORNER = 4;
const MARKER_RADIUS = 4;
// Markers that are closer than this overlap and hide the line.
const MIN_MARKER_SPACING = 10;

/** The changes of one language. A chart of languages draws it as one line. */
export interface LanguageLine {
  /** Name of the language. */
  readonly name: string;
  /**
   * Position of the language in the fixed list of languages, from 0.
   * It selects the color. So a language keeps its color in every chart.
   */
  readonly colorIndex: number;
  /** Days in date order. */
  readonly stats: readonly DailyStat[];
}

/**
 * Draws the chart as an SVG element.
 * Added lines are columns above zero. Deleted lines are columns below zero.
 * The cumulative net change is a line. All three share one y axis.
 *
 * @param stats Days in date order. It must not be empty.
 */
export function renderChartSvg(stats: readonly DailyStat[]): string {
  if (stats.length === 0) {
    throw new RangeError('stats must not be empty');
  }
  const values = stats.flatMap(s => [s.added, -s.deleted, s.cumulative]);
  return frame(
    '日ごとの追加・削除と、純増の累計',
    stats,
    values,
    ({ toX, toY, band }) => {
      const barWidth = Math.min(MAX_BAR_WIDTH, band / 2);
      return [
        ...stats.map((stat, index) =>
          column('added', toX(index), barWidth, toY(0), toY(stat.added)),
        ),
        ...stats.map((stat, index) =>
          column('deleted', toX(index), barWidth, toY(0), toY(-stat.deleted)),
        ),
        baseline(toY),
        cumulativeLine(stats, toX, toY, band >= MIN_MARKER_SPACING),
      ];
    },
  );
}

/**
 * Draws the cumulative net change of each language as a line.
 * It has no columns. All lines share one y axis.
 *
 * @param lines Languages to draw. It must not be empty. Every language covers the same days.
 */
export function renderLanguagesSvg(lines: readonly LanguageLine[]): string {
  const days = lines[0]?.stats ?? [];
  if (days.length === 0) {
    throw new RangeError('lines must have at least one language with days');
  }
  const totals = lines.flatMap(line => line.stats.map(s => s.cumulative));
  return frame('言語ごとの、純増の累計', days, totals, ({ toX, toY }) => [
    baseline(toY),
    ...lines.map(line => {
      const points = line.stats.map(
        (stat, index) => `${round(toX(index))},${round(toY(stat.cumulative))}`,
      );
      return `<polyline class="line series-${line.colorIndex + 1}" points="${points.join(' ')}"/>`;
    }),
  ]);
}

/** Turns a day and a value into a position in the plot. */
interface Scale {
  /** Center of a day. `index` is the position of the day, from 0. */
  readonly toX: (index: number) => number;
  readonly toY: (value: number) => number;
  /** Width of one day. */
  readonly band: number;
}

/**
 * Draws the parts that every chart has around its marks:
 * the grid, the dates, and the targets for hover.
 *
 * @param label Text that a screen reader says for the chart.
 * @param days Days of the x axis in date order. It must not be empty.
 * @param values Values that the y axis must cover. Zero is always covered.
 * @param drawMarks Draws the marks of the chart with the scale of the frame.
 */
function frame(
  label: string,
  days: readonly DailyStat[],
  values: readonly number[],
  drawMarks: (scale: Scale) => readonly string[],
): string {
  const ticks = niceTicks(Math.min(0, ...values), Math.max(0, ...values));
  const low = ticks[0] ?? 0;
  const high = ticks.at(-1) ?? 1;
  const toY = (value: number) =>
    PLOT_BOTTOM - ((value - low) / (high - low)) * PLOT_HEIGHT;
  const band = PLOT_WIDTH / days.length;
  const toX = (index: number) => MARGIN.left + band * (index + 0.5);
  const labelStep = Math.ceil(MIN_DAY_LABEL_WIDTH / band);

  const parts = [
    `<svg viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${label}">`,
    grid(ticks, toY),
    ...days.map((day, index) =>
      // The count starts from the last day. The last day always has a label.
      (days.length - 1 - index) % labelStep === 0
        ? dayLabel(day, toX(index))
        : '',
    ),
    ...drawMarks({ toX, toY, band }),
    ...days.map((_, index) => hitTarget(index, toX(index), band)),
    '</svg>',
  ];
  return parts.filter(part => part !== '').join('\n');
}

function baseline(toY: (value: number) => number): string {
  const y = round(toY(0));
  return `<line class="baseline" x1="${MARGIN.left}" x2="${MARGIN.left + PLOT_WIDTH}" y1="${y}" y2="${y}"/>`;
}

function grid(
  ticks: readonly number[],
  toY: (value: number) => number,
): string {
  const axisMax = Math.max(...ticks.map(Math.abs));
  return ticks
    .map(tick => {
      const y = round(toY(tick));
      return [
        `<line class="grid" x1="${MARGIN.left}" x2="${MARGIN.left + PLOT_WIDTH}" y1="${y}" y2="${y}"/>`,
        `<text class="tick" x="${MARGIN.left - 8}" y="${y}" dy="0.32em" text-anchor="end">${formatTick(tick, axisMax)}</text>`,
      ].join('\n');
    })
    .join('\n');
}

function dayLabel(stat: DailyStat, x: number): string {
  return `<text class="tick" x="${round(x)}" y="${PLOT_BOTTOM + 20}" text-anchor="middle">${formatDay(stat.date)}</text>`;
}

/** A column with a rounded data end and a square end at the baseline. */
function column(
  series: 'added' | 'deleted',
  centerX: number,
  width: number,
  baselineY: number,
  endY: number,
): string {
  const length = Math.abs(endY - baselineY);
  if (length === 0) {
    return '';
  }
  const left = round(centerX - width / 2);
  const right = round(centerX + width / 2);
  // A corner larger than half the width would make the two curves cross.
  const corner = Math.min(BAR_CORNER, length, width / 2);
  // The corner bends back toward the baseline. Its direction depends on the side.
  const inward = endY < baselineY ? corner : -corner;
  const base = round(baselineY);
  const end = round(endY);
  const path = [
    `M${left},${base}`,
    `V${round(endY + inward)}`,
    `Q${left},${end} ${round(left + corner)},${end}`,
    `H${round(right - corner)}`,
    `Q${right},${end} ${right},${round(endY + inward)}`,
    `V${base}`,
    'Z',
  ].join(' ');
  return `<path class="bar ${series}" d="${path}"/>`;
}

function cumulativeLine(
  stats: readonly DailyStat[],
  toX: (index: number) => number,
  toY: (value: number) => number,
  withMarkers: boolean,
): string {
  const points = stats.map((stat, index) => ({
    x: round(toX(index)),
    y: round(toY(stat.cumulative)),
  }));
  const last = points.at(-1) ?? { x: 0, y: 0 };
  const total = stats.at(-1)?.cumulative ?? 0;
  return [
    `<polyline class="line" points="${points.map(p => `${p.x},${p.y}`).join(' ')}"/>`,
    ...(withMarkers ? points : []).map(
      p =>
        `<circle class="marker" cx="${p.x}" cy="${p.y}" r="${MARKER_RADIUS}"/>`,
    ),
    `<text class="end-label" x="${last.x + 12}" y="${last.y}" dy="0.32em">累計 ${formatSigned(total)}</text>`,
  ].join('\n');
}

/** A full-height target for hover and keyboard focus. It is larger than the marks. */
function hitTarget(index: number, centerX: number, band: number): string {
  return `<rect class="hit" data-index="${index}" tabindex="0" x="${round(centerX - band / 2)}" y="${MARGIN.top}" width="${round(band)}" height="${PLOT_HEIGHT}"/>`;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
