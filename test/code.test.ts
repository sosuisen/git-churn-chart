import { describe, expect, test } from 'vitest';
import { isCode, languageOf } from '../src/code.ts';

// ファイルの言語
describe('languageOf', () => {
  // 拡張子から言語の名前を返す。同じ言語の拡張子は、1つの名前になる
  test('names the language of a file by its extension, with one name for one language', () => {
    expect(languageOf('app/src/main.rs')).toBe('Rust');
    expect(languageOf('server/src/main/java/App.java')).toBe('Java');
    expect(languageOf('app/src/App.tsx')).toBe('TypeScript・JavaScript');
    expect(languageOf('app/tools/build.MJS')).toBe('TypeScript・JavaScript');
    expect(languageOf('app/MainWindow.xaml')).toBe('C#・XAML');
    expect(languageOf('engine/src/parser.cpp')).toBe('C++');
  });

  // C++は、.cppだけを数える。ヘッダーと、ほかの拡張子は数えない
  test('counts only .cpp as C++, without headers and other extensions', () => {
    expect(languageOf('engine/src/parser.hpp')).toBeUndefined();
    expect(languageOf('engine/src/parser.h')).toBeUndefined();
    expect(languageOf('engine/src/parser.cc')).toBeUndefined();
    expect(languageOf('engine/src/parser.cxx')).toBeUndefined();
  });

  // 名前が.min.jsで終わるファイルは、コードではない。人が書いたコードではないためである
  test('names no language for a file whose name ends with .min.js', () => {
    expect(languageOf('app/src/lib/pixi.min.js')).toBeUndefined();
    expect(languageOf('app/src/lib/PIXI.MIN.JS')).toBeUndefined();
    expect(languageOf('app/src/lib/admin.js')).toBe('TypeScript・JavaScript');
  });

  // コードでないファイルに、言語はない
  test('names no language for a file that is not code', () => {
    expect(languageOf('README.md')).toBeUndefined();
    expect(languageOf('Makefile')).toBeUndefined();
  });
});

// コードかどうかの判定
describe('isCode', () => {
  // 一覧にある拡張子のファイルはコードである
  test('treats a file with a listed extension as code', () => {
    expect(isCode('app/src/main.rs')).toBe(true);
    expect(isCode('app/App.swift')).toBe(true);
    expect(isCode('app/web/src/App.tsx')).toBe(true);
    expect(isCode('server/src/main/java/App.java')).toBe(true);
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
