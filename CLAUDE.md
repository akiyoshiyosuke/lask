# Lask（究極のタスク管理サービス）

企画＋UIモックのリポジトリ。実装コードはまだ無い。設計は「企画書」と「HTMLモック」の2本立てで、両方を更新し続ける。

**作業を始める前に `docs/企画書.md` と `docs/ログ.md` を読む。** 思想・原則・決定事項はすべてここにある。

- 正本はこのフォルダの `docs/`。Notion（https://www.notion.so/3d1380f385cf81e5bfbddbd82f7764f5 ）は 2026-09-08 までの内容。Notion に書ける環境なら同じ内容を反映する

## セッションの型（毎回・省略しない）

1. **始める前**: `git switch main && git pull --rebase` → `git switch -c feat/<やること>`（docs だけなら `docs/<やること>`）
2. 作業
3. **終わったら**: `git add <ファイル名明示>` → commit → `git push -u origin <branch>`。未 push を残して終わらない
- Cowork の VM はセッションごとに変わるので、`git pull` が鍵エラーになったら `bash scripts/setup.sh` を叩き直す（`core.sshCommand` の絶対パスを今のセッションに直す）＋ `ssh-keyscan github.com >> ~/.ssh/known_hosts`
- Cowork の VM はファイルを削除できないので git が `.git/index.lock` を消せず残ることがある → 次の commit 前に `mv .git/index.lock .git/index.lock.stale`（Mac 側では `rm .git/*.lock*` で掃除）
- 接続フォルダ名は Unicode 正規化の違いで `cd "$HOME/mnt/究極の…"` が通らないことがある → `cd "$HOME"/mnt/*/` で入る

## 構成
```
docs/企画書.md      企画書（思想・発生エンジン・原則・ビジネスモデル・UI変遷。§1〜§17）
docs/ログ.md        企画書に無い本人発言と決定（憲法の層など）。新しい発言・決定は末尾に追記
docs/10-新環境セットアップ.md  別マシン・別Claudeから入る時の手順書（clone/pull/ブランチ/push/認証）
ui/lask-home.html   本体モック。5タブ＋詳細ページ。単一HTML・外部依存なし
ui/lask-25.html     25歳が使った場合の版（機構は同じ、木の頂点が「なりたい状態」）
ui/lask-board-demo.html  取締役会向けデモ（2026-09-15）。実データ・スマホ幅専用・6タブ（今日/夢/人/配分/自動/Laskとは）。「Laskとは」LP は恒久（本人指示 9/14）。デモ本体を消す時も LP は残す
scripts/shot.mjs    スクショ生成（Playwright）
```
- 本体を直すときは `ui/lask-home.html` だけ。`lask-25.html` には波及させない
- 旧案（案A〜E・v0.1〜v0.8）と送付用の派生版は 2026-09-11 に削除済み。復活させない
- 人に見せる版が要るときは別ファイルで作り、渡し終わったら消す（本体に取り込まない）

## 開発
- ビルド不要。`ui/lask-home.html` をブラウザで直接開く
- スクショ: `npm i && npx playwright install chromium` → `npm run shot`（全タブ）／`npm run shot -- ppl t1`（指定）→ `shots/<id>.png`
  - `SCALE`（既定1.24）で解像度、`CHROMIUM` で既存Chromiumのパスを指定できる
  - 対象は `lask-home.html` のみ（`lask-25.html` は別構造で `#view` にJS描画）
  - 縦に長すぎる画像はアップロードで弾かれることがある → タブ単位で撮る／`SCALE` を下げる

## lask-home.html の構造
- `.page` を `show(id, isTab)` で切り替える自前ルーター。`data-go` で詳細へ、`data-jump` で同一ページ内スクロール
- `data-go` の飛び先が無いと自動で `.nolink` が付き、`›` が消える
- タブ: `home`今日 / `tree`夢 / `ppl`人 / `bal`配分 / `log`自動。詳細ページ: `t1 t2 p1 p2 d4 f1 w1 v1`
- CSS変数: `--work/--home/--dream/--hobby/--health` が5領域の色、`--ask` が警告色

## git（新規に触る時は必ず）

- リポジトリ: `git@github.com:akiyoshiyosuke/lask.git`（**private**。公開化しない）
- **作業前に必ず `git switch main && git pull --rebase`**。別マシン・別 Claude セッションの続きである可能性が常にある
- **新規開発・変更は必ずブランチを切る**（`git switch -c feat/<やること>`）。main に直接コミットしない
- **未 push の変更を手元に残したままセッションを終わらせない**。`git add <ファイル名を明示>`（`add -A` / `commit -a` は使わない）→ commit → `git push -u origin <branch>`
- main へのマージはオーナーの合図があってから（`git merge --no-ff`）
- push 済みの履歴を書き換えない
- `docs/ログ.md` は末尾に追記（途中に差し込まない＝衝突を作らない）
- 新しい環境・別の Claude から入る時は **`docs/10-新環境セットアップ.md` を上から通す**

## ルール
- 本人の発言は原文ママで残す。Claudeの案は「Claude提案（本人未確認）」と明記して区別する
- 決まったことは `docs/` に書いてからUIに反映する（UIだけ変えて終わりにしない）
- モック（実データは 2026-09-11 9:00 時点）と `docs/` には秋好の実データ・私的な発言が入っている。公開URL化・外部共有・公開リポジトリ化はしない
- Notionに触れたら必ずページURLを貼る
