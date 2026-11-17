import { describe, expect, test } from 'vitest';
import { isTestPath } from '../src/test-path.ts';

// パスによるテストの判定
describe('isTestPath', () => {
  // テスト用のディレクトリの中のファイルはテストである
  test('treats a file in a test directory as a test', () => {
    expect(isTestPath('server/core/tests/export/mod.rs')).toBe(true);
    expect(isTestPath('app/e2e/helpers.ts')).toBe(true);
    expect(isTestPath('app/app/src/androidTest/java/Helper.kt')).toBe(true);
    expect(isTestPath('app/test/helper.el')).toBe(true);
  });

  // 名前がTestsで終わるディレクトリの中のファイルはテストである
  test('treats a file in a directory that ends with Tests as a test', () => {
    expect(isTestPath('app/Tests/AppCoreTests/Fixture.swift')).toBe(true);
    expect(isTestPath('app/App.Tests/Helper.cs')).toBe(true);
    expect(isTestPath('app/viewer-tests/Helper.cs')).toBe(true);
    expect(isTestPath('app/UITests/Launch.swift')).toBe(true);
  });

  // 名前がテストを表す語で終わるファイルはテストである
  test('treats a file whose name ends with a test word as a test', () => {
    expect(isTestPath('app/src/parser.test.ts')).toBe(true);
    expect(isTestPath('app/src/parser.spec.ts')).toBe(true);
    expect(isTestPath('server/src/sync_tests.rs')).toBe(true);
    expect(isTestPath('app/src/ParserTests.swift')).toBe(true);
    expect(isTestPath('app/src/ParserTest.kt')).toBe(true);
    expect(isTestPath('app/my-mode-test.el')).toBe(true);
  });

  // 名前がテストを表す語で始まるファイルはテストである
  test('treats a file whose name starts with a test word as a test', () => {
    expect(isTestPath('server/src/export/tests.rs')).toBe(true);
    expect(isTestPath('server/src/test_helpers.rs')).toBe(true);
  });

  // 本体のコードはテストではない
  test('does not treat code as a test', () => {
    expect(isTestPath('server/core/src/lib.rs')).toBe(false);
    expect(isTestPath('app/src/App.tsx')).toBe(false);
  });

  // testという文字を含むだけの名前は、テストではない
  test('does not treat a name that only contains the letters test as a test', () => {
    expect(isTestPath('app/src/latest.rs')).toBe(false);
    expect(isTestPath('app/contests/main.rs')).toBe(false);
    expect(isTestPath('app/src/attestation.swift')).toBe(false);
    expect(isTestPath('app/src/testimony.ts')).toBe(false);
  });
});
