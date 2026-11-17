const TARGET_TICK_COUNT = 5;
const NICE_FACTORS = [1, 2, 5, 10];

/**
 * Returns round tick values that cover `min` to `max`.
 * The first tick is at or below `min`. The last tick is at or above `max`.
 */
export function niceTicks(min: number, max: number): number[] {
  if (min > max) {
    throw new RangeError(`min must not be greater than max: ${min} > ${max}`);
  }
  // A flat range has no step. Line counts are integers, so 1 is the smallest useful step.
  const step = max === min ? 1 : niceStep((max - min) / TARGET_TICK_COUNT);
  const first = Math.floor(min / step) * step;
  const last = Math.max(Math.ceil(max / step) * step, first + step);
  const ticks: number[] = [];
  for (let index = 0; first + index * step <= last; index++) {
    ticks.push(first + index * step);
  }
  return ticks;
}

function niceStep(roughStep: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const factor = NICE_FACTORS.find(f => f * magnitude >= roughStep) ?? 10;
  return Math.max(1, factor * magnitude);
}
