const MINUS = '−';
const COMPACT_FROM = 10_000;

/** Formats a count with thousands separators: `1,234`. */
export function formatCount(value: number): string {
  return Math.abs(value).toLocaleString('en-US');
}

/** Formats a number with its sign: `+1,234`, `−56`, `0`. */
export function formatSigned(value: number): string {
  if (value === 0) {
    return '0';
  }
  return `${value > 0 ? '+' : MINUS}${formatCount(value)}`;
}

/**
 * Formats an axis tick. One axis uses one style.
 * It is compact (`10K`) when the axis reaches 10,000.
 *
 * @param axisMax Largest absolute tick value on the axis.
 */
export function formatTick(value: number, axisMax: number): string {
  const sign = value < 0 ? MINUS : '';
  if (axisMax < COMPACT_FROM) {
    return `${sign}${formatCount(value)}`;
  }
  const thousands = Math.abs(value) / 1000;
  return value === 0 ? '0' : `${sign}${formatCount(thousands)}K`;
}

/** Shortens `YYYY-MM-DD` to `M/D` for the x axis. */
export function formatDay(date: string): string {
  const [, month, day] = date.split('-');
  return `${Number(month)}/${Number(day)}`;
}

/** Escapes text for HTML and SVG content and attribute values. */
export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
