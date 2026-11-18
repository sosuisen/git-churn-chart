import { attachTooltips } from './tooltip.ts';
import { buildView, indexOfDate, type PageData, renderView } from './view.ts';

// This module runs only in the browser. The page gets it as a part of its script.

/**
 * Makes the controls of the page work: the buttons of the periods,
 * the two dates, the tabs, and the tooltips of the charts.
 * It draws the view again each time the reader changes the period or the tab.
 *
 * @param days Length of the period that the page shows first. It ends on the last day of the page.
 */
export function startPage(
  document: Document,
  data: PageData,
  days: number,
): void {
  const view = document.querySelector<HTMLElement>('#view');
  const start = document.querySelector<HTMLInputElement>('#start');
  const end = document.querySelector<HTMLInputElement>('#end');
  if (view === null || start === null || end === null) {
    return;
  }
  const presets = [
    ...document.querySelectorAll<HTMLElement>('.periods button'),
  ];
  const tabs = [...document.querySelectorAll<HTMLElement>('.tabs button')];
  const last = data.dates.length - 1;
  const state = { from: Math.max(0, last - (days - 1)), to: last, tab: 0 };

  const show = () => {
    view.innerHTML = renderView(
      buildView(data, state.from, state.to),
      state.tab,
    );
    start.value = data.dates[state.from] ?? '';
    end.value = data.dates[state.to] ?? '';
    const length = state.to - state.from + 1;
    for (const button of presets) {
      // A button is pressed only when the page shows exactly its period.
      const isShown =
        state.to === last && Number(button.dataset.days) === length;
      button.setAttribute('aria-pressed', String(isShown));
    }
    for (const button of tabs) {
      const isShown = Number(button.dataset.tab) === state.tab;
      button.setAttribute('aria-pressed', String(isShown));
    }
  };

  for (const button of presets) {
    button.addEventListener('click', () => {
      state.from = Math.max(0, last - (Number(button.dataset.days) - 1));
      state.to = last;
      show();
    });
  }
  for (const button of tabs) {
    button.addEventListener('click', () => {
      state.tab = Number(button.dataset.tab);
      show();
    });
  }
  const readDates = () => {
    // A date that is empty or half typed keeps the day that the page shows.
    const from = indexOfDate(data.dates, start.value) ?? state.from;
    const to = indexOfDate(data.dates, end.value) ?? state.to;
    // A start after the end still gives a period. The two days change places.
    state.from = Math.min(from, to);
    state.to = Math.max(from, to);
    show();
  };
  start.addEventListener('change', readDates);
  end.addEventListener('change', readDates);
  attachTooltips(document, view);
  show();
}
