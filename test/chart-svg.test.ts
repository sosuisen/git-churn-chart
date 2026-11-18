import { describe, expect, test } from 'vitest';
import {
  type LanguageLine,
  renderFileLinesSvg,
  renderLanguagesSvg,
} from '../src/chart-svg.ts';

/** A language whose cumulative net change ends at `total` on the second day. */
function language(
  name: string,
  colorIndex: number,
  total: number,
): LanguageLine {
  return {
    name,
    colorIndex,
    stats: [
      { date: '2026-11-17', added: 0, deleted: 0, net: 0, cumulative: 0 },
      {
        date: '2026-11-18',
        added: Math.max(total, 0),
        deleted: Math.max(-total, 0),
        net: total,
        cumulative: total,
      },
    ],
  };
}

interface Label {
  readonly name: string;
  readonly series: string;
  readonly y: number;
}

/** The names at the right end of the lines, in the order of the SVG. */
function labels(svg: string): Label[] {
  const pattern =
    /<text class="series-label (series-\d+)" x="[\d.]+" y="([\d.]+)"[^>]*>([^<]*)<\/text>/g;
  return [...svg.matchAll(pattern)].map(match => ({
    series: match[1] ?? '',
    y: Number(match[2]),
    name: match[3] ?? '',
  }));
}

/** The y position of the last point of each line, in the order of the SVG. */
function lineEnds(svg: string): number[] {
  const pattern = /<polyline class="line series-\d+" points="([^"]*)"/g;
  return [...svg.matchAll(pattern)].map(match =>
    Number(match[1]?.split(' ').at(-1)?.split(',')[1]),
  );
}

// ファイルの行数のグラフ
describe('renderFileLinesSvg', () => {
  // 日が1つもないとき、例外を投げる
  test('throws when there are no days', () => {
    expect(() => renderFileLinesSvg([])).toThrow(RangeError);
  });
});

// 言語別のグラフ
describe('renderLanguagesSvg', () => {
  // 言語が1つもないとき、例外を投げる
  test('throws when there are no languages', () => {
    expect(() => renderLanguagesSvg([])).toThrow(RangeError);
  });

  // 線の右端の高さに、その言語の名前を、線と同じ色で書く
  test('writes the name of each language at the height of the right end of its line, in the color of the line', () => {
    const svg = renderLanguagesSvg([
      language('Rust', 0, 100),
      language('Java', 6, -100),
    ]);

    const [rustEnd, javaEnd] = lineEnds(svg);
    expect(labels(svg)).toEqual([
      { name: 'Rust', series: 'series-1', y: rustEnd },
      { name: 'Java', series: 'series-7', y: javaEnd },
    ]);
  });

  // 右端が近い言語の名前は、重ならないように上下に離す。上下の順番は、線の右端の順番と同じである
  test('moves the names of lines with close ends apart, in the same order from top to bottom as the ends', () => {
    const svg = renderLanguagesSvg([
      language('Rust', 0, 1000),
      language('Swift', 1, 998),
      language('Kotlin', 2, 999),
      language('Java', 6, 0),
    ]);

    const byHeight = labels(svg).toSorted((a, b) => a.y - b.y);
    expect(byHeight.map(label => label.name)).toEqual([
      'Rust',
      'Kotlin',
      'Swift',
      'Java',
    ]);
    const gaps = byHeight.slice(1).map((label, i) => label.y - byHeight[i]!.y);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(16);
  });
});
