import { describe, expect, test } from 'vitest';
import { parsePatchLog } from '../src/patch-log.ts';

const patch = (...lines: string[]) => lines.join('\n');

// git log -p の出力の読み取り
describe('parsePatchLog', () => {
  // ファイルごとに、コミットの日付・パス・追加した行・削除した行を返す
  test('returns the date, the path, the added lines, and the deleted lines of each file', () => {
    const log = patch(
      '@@@commit 2026-11-17',
      'diff --git a/src/a.rs b/src/a.rs',
      'index 111..222 100644',
      '--- a/src/a.rs',
      '+++ b/src/a.rs',
      '@@ -3,2 +3 @@ fn main() {',
      '-    old1();',
      '-    old2();',
      '+    new1();',
    );

    expect(parsePatchLog(log)).toEqual([
      {
        date: '2026-11-17',
        path: 'src/a.rs',
        hunks: [
          {
            context: 'fn main() {',
            deleted: ['    old1();', '    old2();'],
            added: ['    new1();'],
          },
        ],
      },
    ]);
  });

  // 1つのファイルに複数の変更箇所があるとき、すべて同じファイルに入る
  test('puts every hunk of a file into the same file', () => {
    const log = patch(
      '@@@commit 2026-11-17',
      '--- a/a.rs',
      '+++ b/a.rs',
      '@@ -1 +1 @@',
      '-a',
      '+b',
      '@@ -9,0 +10 @@ mod tests {',
      '+    c',
    );

    const [file] = parsePatchLog(log);

    expect(file?.hunks.map(hunk => hunk.context)).toEqual(['', 'mod tests {']);
  });

  // 複数のコミットがあるとき、それぞれのファイルにそのコミットの日付が付く
  test('gives each file the date of its own commit', () => {
    const log = patch(
      '@@@commit 2026-11-17',
      '--- a/a.rs',
      '+++ b/a.rs',
      '@@ -1 +1 @@',
      '-a',
      '+b',
      '',
      '@@@commit 2026-11-16',
      '--- a/b.rs',
      '+++ b/b.rs',
      '@@ -0,0 +1 @@',
      '+c',
    );

    expect(parsePatchLog(log).map(file => [file.date, file.path])).toEqual([
      ['2026-11-17', 'a.rs'],
      ['2026-11-16', 'b.rs'],
    ]);
  });

  // 新しく作ったファイルは、新しいパスで返す
  test('returns a new file with its new path', () => {
    const log = patch(
      '@@@commit 2026-11-17',
      '--- /dev/null',
      '+++ b/src/new.rs',
      '@@ -0,0 +1 @@',
      '+fn f() {}',
    );

    expect(parsePatchLog(log)[0]?.path).toBe('src/new.rs');
  });

  // 消したファイルは、元のパスで返す
  test('returns a deleted file with its old path', () => {
    const log = patch(
      '@@@commit 2026-11-17',
      '--- a/src/old.rs',
      '+++ /dev/null',
      '@@ -1 +0,0 @@',
      '-fn f() {}',
    );

    expect(parsePatchLog(log)[0]?.path).toBe('src/old.rs');
  });

  // 名前を変えたファイルは、新しいパスで返す
  test('returns a renamed file with its new path', () => {
    const log = patch(
      '@@@commit 2026-11-17',
      'diff --git a/old/a.rs b/new/a.rs',
      'similarity index 90%',
      'rename from old/a.rs',
      'rename to new/a.rs',
      '--- a/old/a.rs',
      '+++ b/new/a.rs',
      '@@ -1 +1 @@',
      '-a',
      '+b',
    );

    expect(parsePatchLog(log)[0]?.path).toBe('new/a.rs');
  });

  // 空白を含むパスは、Gitが末尾に付けるタブを除いて返す
  test('removes the tab that Git adds after a path with a space', () => {
    const log = patch(
      '@@@commit 2026-11-17',
      '--- a/my file.rs\t',
      '+++ b/my file.rs\t',
      '@@ -1 +1 @@',
      '-a',
      '+b',
    );

    expect(parsePatchLog(log)[0]?.path).toBe('my file.rs');
  });

  // 見出しのように見える変更行も、変更行として数える
  test('counts a changed line that looks like a header as a changed line', () => {
    const log = patch(
      '@@@commit 2026-11-17',
      '--- a/notes.md',
      '+++ b/notes.md',
      '@@ -1,2 +1,2 @@',
      '--- a/fake',
      '-@@@commit 1999-01-01',
      '+++ b/fake',
      '+@@ -1 +1 @@',
    );

    expect(parsePatchLog(log)).toEqual([
      {
        date: '2026-11-17',
        path: 'notes.md',
        hunks: [
          {
            context: '',
            deleted: ['-- a/fake', '@@@commit 1999-01-01'],
            added: ['++ b/fake', '@@ -1 +1 @@'],
          },
        ],
      },
    ]);
  });

  // 「ファイル末尾に改行なし」の印は、行として数えない
  test('does not count the no-newline mark as a line', () => {
    const log = patch(
      '@@@commit 2026-11-17',
      '--- a/a.rs',
      '+++ b/a.rs',
      '@@ -1 +1 @@',
      '-a',
      '\\ No newline at end of file',
      '+b',
      '\\ No newline at end of file',
    );

    const [file] = parsePatchLog(log);

    expect(file?.hunks[0]?.deleted).toEqual(['a']);
    expect(file?.hunks[0]?.added).toEqual(['b']);
  });

  // 変更していない前後の行は、追加にも削除にも数えない
  test('does not count an unchanged line as added or deleted', () => {
    const log = patch(
      '@@@commit 2026-11-17',
      '--- a/a.rs',
      '+++ b/a.rs',
      '@@ -1,3 +1,3 @@',
      ' before',
      '-a',
      '+b',
      ' after',
      '@@ -9 +9 @@',
      '-c',
      '+d',
    );

    const [file] = parsePatchLog(log);

    expect(file?.hunks.map(hunk => [hunk.deleted, hunk.added])).toEqual([
      [['a'], ['b']],
      [['c'], ['d']],
    ]);
  });

  // バイナリファイルは変更箇所を持たないので、結果に入らない
  test('leaves out a binary file because it has no hunks', () => {
    const log = patch(
      '@@@commit 2026-11-17',
      'diff --git a/logo.png b/logo.png',
      'index 111..222 100644',
      'Binary files a/logo.png and b/logo.png differ',
    );

    expect(parsePatchLog(log)).toEqual([]);
  });

  // コミットがないとき、結果は空である
  test('returns nothing when there are no commits', () => {
    expect(parsePatchLog('')).toEqual([]);
  });
});
