# Lask（究極のタスク管理サービス）

企画＋UI＋極小サーバーのリポジトリ。2026-09-20 に「サービスとして出す」が大ゴールになり、①iPhone アプリ（PWA）→ ②実データ → ③意味があるかの判定、の順で進める（`docs/ログ.md` 2026-09-20）。設計は「企画書」と「HTML」の2本立てで、両方を更新し続ける。

**作業を始める前に `docs/企画書.md` と `docs/ログ.md` を読む。** 思想・原則・決定事項はすべてここにある。

- 正本はこのフォルダの `docs/`。Notion（https://www.notion.so/3d1380f385cf81e5bfbddbd82f7764f5 ）は 2026-09-08 までの内容。Notion に書ける環境なら同じ内容を反映する

## セッションの型（毎回・省略しない）

1. **始める前**: `git switch main && git pull --rebase` → `git switch -c feat/<やること>`（docs だけなら `docs/<やること>`）
2. 作業
3. **終わったら**: `git add <ファイル名明示>` → commit → `git push -u origin <branch>`。未 push を残して終わらない
- Cowork の VM はセッションごとに変わるので、`git pull` が鍵エラーになったら `bash scripts/setup.sh` を叩き直す（`core.sshCommand` の絶対パスを今のセッションに直す）＋ `ssh-keyscan github.com >> ~/.ssh/known_hosts`
- Cowork の VM はファイルを削除できないので git が `.git/index.lock` を消せず残ることがある → 次の commit 前に `mv .git/index.lock .git/index.lock.stale`（Mac 側では `rm .git/*.lock*` で掃除）
- 同じ理由で **Cowork の VM では `git switch`/`checkout`/`reset --hard` で作業ファイルを差し替えられない**（unlink できずに失敗し、index だけ壊れる）。別ブランチの先端から始めたい時は `git switch -c <new>`（今のコミットのまま）→ `git update-ref refs/heads/<new> <base>` → `git read-tree HEAD` で、作業ツリーを触らずに枝と index だけ合わせる（作業ツリーが base と同じ内容である時だけ使う）
- 接続フォルダ名は Unicode 正規化の違いで `cd "$HOME/mnt/究極の…"` が通らないことがある → `cd "$HOME"/mnt/*/` で入る

## 構成
```
docs/企画書.md      企画書（思想・発生エンジン・原則・ビジネスモデル・UI変遷。§1〜§17）
docs/ログ.md        企画書に無い本人発言と決定（憲法の層など）。新しい発言・決定は末尾に追記
docs/10-新環境セットアップ.md  別マシン・別Claudeから入る時の手順書（clone/pull/ブランチ/push/認証）
ui/lask-home.html   本体。6タブ（今日/夢/人/配分/自動/Laskとは）＋詳細ページ。単一HTML・外部依存なし。幅600px以下 or ホーム画面起動で「アプリモード」（枠なし・下タブ）
ui/manifest.webmanifest, ui/sw.js, ui/icon-*.png  PWA 用（合言葉なしで配ってよい唯一のファイル群）
server/index.js     極小サーバー（依存は pg だけ）。合言葉→Cookie 90日／ui/ を配る／`/api/op` `/api/state` `/api/ops` `/api/health`
server/db.js        Lask 自身の DB（Railway Postgres）。ops（操作履歴・追記のみ）と state（いまの状態）だけ。他OSの DB には書かない
server/mothership.js 未転記の ops を秋好OS の 📦母艦 に「秋好の入力」として転記（NOTION_TOKEN が要る。view は転記しない）
railway.json        Railway の設定（main push で自動デプロイ）。環境変数は .env.example
ui/lask-25.html     25歳が使った場合の版（機構は同じ、木の頂点が「なりたい状態」）
ui/lask-board-demo.html  取締役会向けデモ（2026-09-15）。実データ・スマホ幅専用・6タブ（今日/夢/人/配分/自動/Laskとは）。「Laskとは」LP は恒久（本人指示 9/14）。デモ本体を消す時も LP は残す
scripts/shot.mjs    スクショ生成（Playwright）
```
- 本体を直すときは `ui/lask-home.html` だけ。`lask-25.html` には波及させない
- 旧案（案A〜E・v0.1〜v0.8）と送付用の派生版は 2026-09-11 に削除済み。復活させない
- 人に見せる版が要るときは別ファイルで作り、渡し終わったら消す（本体に取り込まない）

## 開発
- ビルド不要。`ui/lask-home.html` をブラウザで直接開く（幅を 600px 以下にするとアプリモード）
- サーバーを手元で: `LASK_PASSCODE=xxxx npm start` → http://localhost:3000 （合言葉画面 → `/`）。`/25` `/board` も配る
- 本番: https://lask-production.up.railway.app （Railway プロジェクト `accomplished-encouragement`・サービス `lask`。GitHub `akiyoshiyosuke/lask` に接続、push で自動デプロイ、ポート 8080）。Variables に `LASK_PASSCODE`（合言葉）・`DATABASE_URL`（Postgres 参照）・`NOTION_TOKEN`（母艦転記）。値はリポジトリに書かない。非公開・合言葉つき・noindex
- 本番に繋ぐブランチは Railway の Settings → Source → Branch。2026-09-20 時点は `feat/app-pwa`（main マージ後に `main` へ戻す）
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
