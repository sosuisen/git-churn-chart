# architecture

## 全体像

ローカルのGitリポジトリを読み、日ごとの追加行数・削除行数・純増の累計を、1枚のHTMLファイルに出力するコマンドである。画面はない。出力したHTMLをブラウザで開いて見る。

グラフは4つある。コード本体、テストコード、テストの数、すべてのファイルである。3つのタブに分かれる。「コード」にコード本体、「テスト」にテストコードとテストの数、「全体」にすべてのファイルが入る。ページの上のタブで切り替える。テストの数のグラフだけは、行ではなくテストを数える。

コード本体、テストコード、テストの数のグラフの下には、言語別のグラフがある。言語ごとの純増の累計を、線で描く。

期間は、今日までの1年（365日）の中で、ページの上で自由に選べる。開始日と終了日を入力するか、ボタン（1週間、2週間、1か月、3か月、6か月、1年）を押す。HTMLは、1年分の日ごとの数と、グラフを描くスクリプトを持つ。期間を変えると、ブラウザの中でグラフを描き直す。

## モジュール

すべて`src/`にある。クラスは使わず、関数だけで作る。

| ファイル              | 役割                                                                                           | 主な関数                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `main.ts`             | エントリーポイント。引数を読み、下の関数を順に呼ぶ                                             | `main`                                                       |
| `git.ts`              | `git log`を実行する                                                                            | `readPatchLog`                                               |
| `patch-log.ts`        | `git log -p`の出力を、ファイルごとの変更行にする                                               | `parsePatchLog`                                              |
| `code.ts`             | 拡張子とパスで、コードかどうかと、その言語を判定する                                           | `isCode`、`languageOf`、`LANGUAGES`                          |
| `test-path.ts`        | パスで、テストかどうかを判定する                                                               | `isTestPath`                                                 |
| `rust-test-module.ts` | Rustの1つの変更箇所を、本体の行とテストの行に分ける                                            | `splitRustHunk`                                              |
| `category.ts`         | 1つのファイルの変更行を、コード本体・テスト・その他に分ける                                    | `countByCategory`                                            |
| `daily-stats.ts`      | 行数を、日ごとに集計する                                                                       | `buildDailyStats`、`addDays`                                 |
| `test-count.ts`       | 1つのファイルの変更行から、増えたテストと減ったテストを数える                                  | `countTests`                                                 |
| `file-lines.ts`       | 1つのファイルの、日ごとの行数を出す。テキストの行数を数える                                    | `buildFileLines`、`countLines`                               |
| `sections.ts`         | 4つのグラフのデータと見出しを作る                                                              | `buildSections`                                              |
| `page-data.ts`        | 1年分の、グラフごとの日ごとの数を作る                                                          | `buildPageData`、`PAGE_DAYS`                                 |
| `scale.ts`            | 軸の目盛りを決める                                                                             | `niceTicks`                                                  |
| `format.ts`           | 数と日付を文字列にする。HTMLをエスケープする                                                   | `formatSigned`、`formatTick`、`escapeHtml`                   |
| `chart-svg.ts`        | 3種類のグラフをSVGで描く。棒と線のグラフ、言語別の線のグラフ、ファイルの行数の線のグラフである | `renderChartSvg`、`renderLanguagesSvg`、`renderFileLinesSvg` |
| `view.ts`             | ページのデータから1つの期間を切り出し、そのグラフ・凡例・表をHTMLにする                        | `buildView`、`renderView`、`indexOfDate`、`tabsOf`           |
| `page.ts`             | 期間とタブの操作、最初の期間のグラフ、データ、スクリプトをまとめて、HTMLにする                 | `renderPage`                                                 |
| `client.ts`           | ブラウザの中で、期間とタブの操作を受けて、グラフを描き直す                                     | `startPage`                                                  |
| `tooltip.ts`          | ブラウザの中で、グラフのツールチップを出す                                                     | `attachTooltips`                                             |
| `client-script.ts`    | ブラウザで動くモジュールを、1つのスクリプトにつなぐ                                            | `readClientScript`                                           |

依存の向きは、次のとおりである。

```
main → git → patch-log
main → patch-log
main → page-data → sections → category → code, test-path, rust-test-module
                                         code → test-path
                   sections → test-count
                   sections → daily-stats
                   sections → code, view（型だけ）, chart-svg（型だけ）
       page-data → view（型だけ）
       page-data → file-lines → daily-stats
main → file-lines
main → client-script
main → page → view → chart-svg → scale, format
                     view, chart-svg → daily-stats, file-lines（型だけ）
                     view → format
       page → format
client → view, tooltip
```

- 外部に触るのは、`git.ts`、`browser.ts`、`client-script.ts`、`main.ts`だけである。ほかは、ファイルもGitも触らない計算である。
- ブラウザの中でも動くモジュールは、`format.ts`、`scale.ts`、`chart-svg.ts`、`view.ts`、`tooltip.ts`、`client.ts`である。
  - これらは、Node.jsのAPIを使わない。importするのは、この中のモジュールと、型だけである。
  - `readClientScript`が、これらから型・import・`export`を取り除き、1つのスクリプトにつなぐ。だから、トップレベルの名前は、6つのモジュールで重ならないようにする。
  - 型は、Node.jsの`stripTypeScriptTypes`で取り除く。ビルドの手順を増やさないためである。
  - `tooltip.ts`と`client.ts`は、ブラウザの中だけで動く。`client.ts`は、DOMの代用でテストする。`tooltip.ts`は、ブラウザのレイアウトが要るので、テストしない。

## コード本体とテストの分け方

`countByCategory`が、次の順で決める。

1. コードでないファイルは、「その他」である。`isCode`が決める。次のどれかに当たるファイルは、コードではない。
   - 拡張子が`CODE_EXTENSIONS`にない。
   - 名前が`.min.js`で終わる。
   - `vendor`または`proto`という名前のディレクトリの中にある。大文字と小文字は区別しない。
   - `src`という名前のディレクトリの中にない。ただし、`.swift`、`.cs`、`.xaml`、`.el`と、パスがテストを表すファイルは、どこにあってもコードである。
2. パスがテストを表すファイルは、全体が「テスト」である。テスト用のディレクトリの中にあるか、ファイル名がテストを表す語で始まるか終わる。
3. Rustのファイルは、変更箇所ごとに行単位で分ける。`#[cfg(test)]`の付いた定義（ふつうは`mod tests { ... }`）の中の行が「テスト」である。
4. 残りは「コード本体」である。

Rustの行単位の切り分けは、ファイル全体を読まない。変更した行と、変更箇所の見出しだけを使う。

- 見出しは、Gitが`@@ ... @@`の後ろに出す文字列である。変更箇所より上で、行頭が英字で始まる最も近い行が入る。
- テストモジュールの中の行は字下げされている。だから、テストモジュールの中の変更箇所は、見出しが`mod tests {`になる。
- この方法は、rustfmtの整形を前提にする。テストモジュールの中に、行頭から始まる行（複数行の文字列の中身など）があると、そこから後ろを本体と数えることがある。

## 外部とのやり取り

- Git: `git -C <repo> log --since=<開始日> --patch --unified=0 --date=format-local:%Y-%m-%d --pretty=format:@@@commit %cd`を実行し、標準出力を読む。
  - `core.quotePath=false`を付ける。日本語などのパスを、そのまま受け取るためである。
  - `diff.rust.xfuncname`を上書きする。リポジトリがRust用の見出しを有効にしていても、行頭から始まる行を見出しにするためである。
- Git: `--track`が付いていれば、`git -C <repo> show HEAD:<パス>`で、最後のコミットのファイルを読む。`git.ts`の`readHeadFile`が行う。
- ブラウザ: `--open`が付いていれば、OSのコマンド（Windowsは`start`、macOSは`open`、ほかは`xdg-open`）でHTMLを開く。`browser.ts`の`openInBrowser`が行う。
- ファイル: HTMLを1つ書き出す。場所は`--out`で決まる。
- 出力するHTMLは、外部のファイルを読み込まない。CSS・SVG・スクリプトをすべて中に持つ。

## 主な処理の流れ

1. `main`が引数を読み、今日の日付と、最初に出す期間の日数を決める。開始日は、1年（365日）の最初の日である。
2. `readPatchLog`が、開始日以降のログを、差分つきで読む。
3. `parsePatchLog`が、ログをファイルごとの変更行にする。
4. `buildPageData`が、1年分の`buildSections`を呼び、グラフごとの日ごとの追加と削除にする。`--track`が付いていれば、`buildSections`の代わりに`buildFileLines`を呼ぶ。このとき、5のデータは作らない。`buildFileLines`は、今の行数から日ごとの変更をさかのぼり、そのファイルの日ごとの行数を出す。今の行数は、`main`が`readHeadFile`と`countLines`で数える。
5. `buildSections`が、ファイルごとに`countByCategory`で行を分け、`countTests`でテストの宣言を数えて、4つのグラフのデータを作る。コード本体、テストコード、テストの数には、`languageOf`で分けた言語ごとのデータも付ける。言語の色は、`LANGUAGES`の中の位置で決まる。その中で`buildDailyStats`が、日ごとに合計し、変更のない日を0で埋め、累計を計算する。
6. `renderPage`が、タブのボタン、期間のボタン、開始日と終了日の入力をHTMLにする。1年分のデータをJSONで、`readClientScript`のスクリプトをそのまま、ページに入れる。最初の期間のグラフは、`buildView`と`renderView`で描いて、ページに入れておく。だから、スクリプトが動かなくても、最初の期間は読める。
7. `buildView`が、データから期間の日だけを切り出し、累計を期間の最初の日から計算する。期間の中に変更のない言語は外す。`renderView`が、4つのセクションをHTMLにする。選んだタブのセクションのほかは、`hidden`で隠す。セクションごとに`renderChartSvg`がグラフを描く。言語ごとの行数を持つセクションでは、その下に`renderLanguagesSvg`が言語別のグラフを描く。線の右端には、言語の名前を線と同じ色で、期間全体の純増を文字の色で書く。名前が重なるときは、線の右端の順番を保ったまま、上下に離す。ファイルの行数を持つ期間では、セクションの代わりに、`renderFileLinesSvg`が行数のグラフだけを描く。このページには、棒の凡例を出さない。
8. ブラウザでは、`startPage`が操作を受ける。期間のボタンを押すか、開始日か終了日を変えると、7と同じ`buildView`と`renderView`で、グラフを描き直す。タブを押したときも描き直す。選んだタブは覚えているので、期間を変えてもタブはそのままである。
9. `main`がHTMLを書き出し、そのパスを表示する。`--open`が付いていれば、`openInBrowser`がHTMLを既定のブラウザで開く。

## 関連する文書

- [features.md](features.md): 機能の一覧
