import { describe, expect, test } from 'vitest';
import { isCode } from '../src/code.ts';

// コードかどうかの判定
describe('isCode', () => {
  // 一覧にある拡張子のファイルはコードである
  test('treats a file with a listed extension as code', () => {
    expect(isCode('app/src/main.rs')).toBe(true);
    expect(isCode('app/App.swift')).toBe(true);
    expect(isCode('app/web/src/App.tsx')).toBe(true);
  });

  // 拡張子の大文字と小文字は区別しない
  test('ignores the case of the extension', () => {
    expect(isCode('app/Main.KT')).toBe(true);
  });

  // ドキュメント・設定・ロックファイル・画像はコードではない
  test('does not treat documents, settings, lock files, and images as code', () => {
    expect(isCode('README.md')).toBe(false);
    expect(isCode('app/Cargo.toml')).toBe(false);
    expect(isCode('app/Cargo.lock')).toBe(false);
    expect(isCode('app/package.json')).toBe(false);
    expect(isCode('docs/flow.svg')).toBe(false);
  });

  // HTML・CSSと、スクリプト（シェル・PowerShell・バッチ・Python・Kotlin Script）はコードではない
  test('does not treat HTML, CSS, and scripts as code', () => {
    expect(isCode('server/tools/check.py')).toBe(false);
    expect(isCode('app/build.gradle.kts')).toBe(false);
    expect(isCode('app/index.html')).toBe(false);
    expect(isCode('app/style.css')).toBe(false);
    expect(isCode('build.sh')).toBe(false);
    expect(isCode('build.ps1')).toBe(false);
    expect(isCode('app/gradlew.bat')).toBe(false);
  });

  // 拡張子のないファイルはコードではない
  test('does not treat a file without an extension as code', () => {
    expect(isCode('Makefile')).toBe(false);
    expect(isCode('app.rs/LICENSE')).toBe(false);
  });
});
