// This module runs only in the browser. The page gets it as a part of its script.

/** The values of one day, as the view writes them next to a chart. */
interface TooltipRow {
  readonly date: string;
  readonly values: readonly (readonly [label: string, value: string])[];
}

/**
 * Shows the values of a day in a tooltip while the pointer or the focus is on the day.
 * The tooltip only repeats values that the table view also shows.
 *
 * @param view Element that holds the charts. It gets new charts each time the period changes.
 * So the view listens, not each chart.
 */
export function attachTooltips(document: Document, view: HTMLElement): void {
  const show = (event: Event) => {
    const target = event.target instanceof Element ? event.target : null;
    const hit = target?.closest<SVGElement>('.hit');
    const chart = hit?.closest<HTMLElement>('.chart');
    const tooltip = chart?.querySelector<HTMLElement>('.tooltip');
    const json = chart?.querySelector('script')?.textContent;
    if (!hit || !chart || !tooltip || !json) {
      return;
    }
    const rows: TooltipRow[] = JSON.parse(json);
    const row = rows[Number(hit.dataset.index)];
    if (row === undefined) {
      return;
    }
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
    const box = hit.getBoundingClientRect();
    const base = chart.getBoundingClientRect();
    const half = tooltip.offsetWidth / 2;
    const center = box.left - base.left + box.width / 2;
    tooltip.style.left = `${Math.min(Math.max(center, half), base.width - half)}px`;
    tooltip.style.top = `${box.top - base.top}px`;
  };
  const hide = (event: Event) => {
    const target = event.target instanceof Element ? event.target : null;
    const tooltip = target
      ?.closest('.chart')
      ?.querySelector<HTMLElement>('.tooltip');
    if (tooltip) {
      tooltip.hidden = true;
    }
  };
  // These events bubble. `pointerenter` and `focus` do not.
  view.addEventListener('pointerover', show);
  view.addEventListener('pointerout', hide);
  view.addEventListener('focusin', show);
  view.addEventListener('focusout', hide);
}
