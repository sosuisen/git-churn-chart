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
const BAR_CORNER = 4;
const MARKER_RADIUS = 4;

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
  const ticks = niceTicks(
    Math.min(0, ...stats.map(s => -s.deleted), ...stats.map(s => s.cumulative)),
    Math.max(0, ...stats.map(s => s.added), ...stats.map(s => s.cumulative)),
  );
  const low = ticks[0] ?? 0;
  const high = ticks.at(-1) ?? 1;
  const toY = (value: number) =>
    PLOT_BOTTOM - ((value - low) / (high - low)) * PLOT_HEIGHT;
  const band = PLOT_WIDTH / stats.length;
  const toX = (index: number) => MARGIN.left + band * (index + 0.5);
  const barWidth = Math.min(MAX_BAR_WIDTH, band / 2);

  const parts = [
    `<svg viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="日ごとの追加行数・削除行数と、純増の累計">`,
    grid(ticks, toY),
    ...stats.map((stat, index) => dayLabel(stat, toX(index))),
    ...stats.map((stat, index) =>
      column('added', toX(index), barWidth, toY(0), toY(stat.added)),
    ),
    ...stats.map((stat, index) =>
      column('deleted', toX(index), barWidth, toY(0), toY(-stat.deleted)),
    ),
    `<line class="baseline" x1="${MARGIN.left}" x2="${MARGIN.left + PLOT_WIDTH}" y1="${round(toY(0))}" y2="${round(toY(0))}"/>`,
    cumulativeLine(stats, toX, toY),
    ...stats.map((_, index) => hitTarget(index, toX(index), band)),
    '</svg>',
  ];
  return parts.filter(part => part !== '').join('\n');
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
  const corner = Math.min(BAR_CORNER, length);
  // The corner bends back toward the baseline. Its direction depends on the side.
  const inward = endY < baselineY ? corner : -corner;
  const base = round(baselineY);
  const end = round(endY);
  const path = [
    `M${left},${base}`,
    `V${round(endY + inward)}`,
    `Q${left},${end} ${left + corner},${end}`,
    `H${right - corner}`,
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
): string {
  const points = stats.map((stat, index) => ({
    x: round(toX(index)),
    y: round(toY(stat.cumulative)),
  }));
  const last = points.at(-1) ?? { x: 0, y: 0 };
  const total = stats.at(-1)?.cumulative ?? 0;
  return [
    `<polyline class="line" points="${points.map(p => `${p.x},${p.y}`).join(' ')}"/>`,
    ...points.map(
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
