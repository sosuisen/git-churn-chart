2026-11-18 ギア5速：テストもコードもAIが書く。人間は仕様書やADRを作成するだけで、コードレビューはしない

# plans

## ユーザータスク

- [ ] テストの数のグラフを、3つ目に足す
  - [ ] Rustは、`#[test]`と`#[tokio::test]`などを数える。`#[cfg(test)]`は数えない
  - [ ] 削除した宣言は、減ったテストとして数える
  - [ ] TypeScript・JavaScriptは、`test(`と`it(`を数える
  - [ ] Kotlinは、`@Test`を数える
  - [ ] Swiftは、`func test...`と`@Test`を数える
  - [ ] C#は、`[Fact]`・`[Theory]`・`[Test]`・`[TestMethod]`を数える
  - [ ] Emacs Lispは、`(ert-deftest`を数える
  - [ ] コードでないファイルと、ほかの言語の宣言は数えない
  - [ ] グラフは、コード本体・テストコード・テストの数・すべてのファイルの順に並ぶ
