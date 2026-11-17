import { describe, expect, test } from 'vitest';
import { addDays, buildDailyStats } from '../src/daily-stats.ts';

// 日付の移動
describe('addDays', () => {
  // 月をまたいで過去へ移動する
  test('moves to the past across a month', () => {
    expect(addDays('2026-11-03', -5)).toBe('2026-10-29');
  });

  // 年をまたいで未来へ移動する
  test('moves to the future across a year', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  // 日付の形式が違うとき、例外を投げる
  test('throws when the date format is wrong', () => {
    expect(() => addDays('2026/11/03', 1)).toThrow(RangeError);
  });
});

// 日ごとの集計
describe('buildDailyStats', () => {
  // 期間は終了日を含み、古い日から順に並ぶ
  test('lists the days from the oldest and includes the end date', () => {
    const stats = buildDailyStats([], '2026-11-18', 14);

    expect(stats).toHaveLength(14);
    expect(stats[0]?.date).toBe('2026-11-05');
    expect(stats[13]?.date).toBe('2026-11-18');
  });

  // 同じ日のコミットは合計する
  test('sums the commits of the same day', () => {
    const commits = [
      { date: '2026-11-18', added: 10, deleted: 2 },
      { date: '2026-11-18', added: 5, deleted: 1 },
    ];

    expect(buildDailyStats(commits, '2026-11-18', 1)).toEqual([
      { date: '2026-11-18', added: 15, deleted: 3, net: 12, cumulative: 12 },
    ]);
  });

  // コミットのない日は0行である
  test('gives 0 lines to a day without commits', () => {
    const commits = [{ date: '2026-11-16', added: 4, deleted: 0 }];

    expect(buildDailyStats(commits, '2026-11-18', 3)[1]).toEqual({
      date: '2026-11-17',
      added: 0,
      deleted: 0,
      net: 0,
      cumulative: 4,
    });
  });

  // 累計は、期間の最初の日からの純増の合計である
  test('accumulates the net change from the first day of the period', () => {
    const commits = [
      { date: '2026-11-16', added: 10, deleted: 0 },
      { date: '2026-11-17', added: 0, deleted: 30 },
      { date: '2026-11-18', added: 5, deleted: 1 },
    ];

    const stats = buildDailyStats(commits, '2026-11-18', 3);

    expect(stats.map(stat => stat.net)).toEqual([10, -30, 4]);
    expect(stats.map(stat => stat.cumulative)).toEqual([10, -20, -16]);
  });

  // 期間の外のコミットは無視する
  test('ignores commits outside the period', () => {
    const commits = [
      { date: '2026-11-15', added: 100, deleted: 0 },
      { date: '2026-11-19', added: 100, deleted: 0 },
    ];

    const stats = buildDailyStats(commits, '2026-11-18', 3);

    expect(stats.map(stat => stat.added)).toEqual([0, 0, 0]);
  });

  // 日数が正の整数でないとき、例外を投げる
  test('throws when days is not a positive integer', () => {
    expect(() => buildDailyStats([], '2026-11-18', 0)).toThrow(RangeError);
  });
});
