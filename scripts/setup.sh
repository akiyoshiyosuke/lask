#!/usr/bin/env bash
# Lask 新環境セットアップ。clone 直後にこれを1回叩けば作業できる状態になる。
#   bash scripts/setup.sh
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
say(){ printf '\n\033[1m%s\033[0m\n' "$*"; }

say "1) リポジトリ確認"
git rev-parse --is-inside-work-tree >/dev/null
git remote -v | head -2

say "2) deploy key（Cowork から push する時だけ必要）"
if [ -f "$ROOT/.gitsecrets/id_ed25519" ]; then
  chmod 700 "$ROOT/.gitsecrets"; chmod 600 "$ROOT/.gitsecrets/id_ed25519"
  git config core.sshCommand "ssh -i $ROOT/.gitsecrets/id_ed25519 -o IdentitiesOnly=yes"
  echo "   .gitsecrets/id_ed25519 を使う設定にした"
else
  # 同じMac内の既存クローンから鍵を拾ってくる
  for c in "$HOME/ClaudeCode/究極のタスク管理サービス" "$HOME/claudecode-2/究極のタスク管理サービス"; do
    if [ -f "$c/.gitsecrets/id_ed25519" ]; then
      mkdir -p "$ROOT/.gitsecrets"; cp "$c/.gitsecrets/"* "$ROOT/.gitsecrets/"
      chmod 700 "$ROOT/.gitsecrets"; chmod 600 "$ROOT/.gitsecrets/id_ed25519"
      git config core.sshCommand "ssh -i $ROOT/.gitsecrets/id_ed25519 -o IdentitiesOnly=yes"
      echo "   $c から鍵をコピーした"; break
    fi
  done
  [ -f "$ROOT/.gitsecrets/id_ed25519" ] || echo "   鍵なし（Macのターミナル/Claude Codeなら ~/.ssh で通るので問題なし）"
fi

say "3) 最新にする"
git switch main >/dev/null 2>&1 || true
git pull --rebase

say "4) 疎通確認"
git ls-remote --heads origin >/dev/null && echo "   origin に届いた"

say "準備完了"
cat <<'MSG'
   次にやること:
     git switch -c feat/<やること>     # 新規開発は必ずブランチ
     ... 作業 ...
     git add <ファイル名> && git commit -m "<何を、なぜ>"
     git push -u origin feat/<やること>

   読むもの:
     CLAUDE.md                      … このリポジトリの憲法
     docs/10-新環境セットアップ.md    … 詳しい運用ルール
     docs/企画書.md / docs/ログ.md    … 思想・決定事項
MSG
