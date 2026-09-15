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
if [ ! -f "$ROOT/.gitsecrets/id_ed25519" ]; then
  # 同じMac内の既存クローンから鍵を拾ってくる
  for c in "$HOME/ClaudeCode/究極のタスク管理サービス" "$HOME/claudecode-2/究極のタスク管理サービス" "$HOME"/mnt/*/; do
    c="${c%/}"; [ "$c" = "$ROOT" ] && continue
    if [ -f "$c/.gitsecrets/id_ed25519" ]; then
      mkdir -p "$ROOT/.gitsecrets"; cp "$c/.gitsecrets/"* "$ROOT/.gitsecrets/"
      echo "   $c から鍵をコピーした"; break
    fi
  done
fi
if [ -f "$ROOT/.gitsecrets/id_ed25519" ]; then
  chmod 700 "$ROOT/.gitsecrets"; chmod 600 "$ROOT/.gitsecrets/id_ed25519"
  # (a) 通常環境向け: core.sshCommand
  git config core.sshCommand "ssh -i $ROOT/.gitsecrets/id_ed25519 -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"
  # (b) Cowork VM 向け: VM が GIT_SSH_COMMAND（proxy 経由の socat）を環境変数で固定していて
  #     core.sshCommand が無視されるので、~/.ssh/config で鍵を指定する（VM はセッション毎に消えるので毎回書く）
  mkdir -p "$HOME/.ssh"; chmod 700 "$HOME/.ssh"
  if ! grep -q "$ROOT/.gitsecrets/id_ed25519" "$HOME/.ssh/config" 2>/dev/null; then
    printf 'Host github.com\n  IdentityFile %s/.gitsecrets/id_ed25519\n  IdentitiesOnly yes\n  StrictHostKeyChecking accept-new\n' "$ROOT" >> "$HOME/.ssh/config"
    chmod 600 "$HOME/.ssh/config"
  fi
  echo "   .gitsecrets/id_ed25519 を使う設定にした（core.sshCommand + ~/.ssh/config）"
else
  echo "   鍵なし（Macのターミナル/Claude Codeなら ~/.ssh で通るので問題なし）"
fi

say "3) 最新にする"
# Cowork の VM はファイルを削除できず .git/*.lock が残ることがある → 退避
for l in "$ROOT"/.git/index.lock "$ROOT"/.git/objects/maintenance.lock; do
  [ -f "$l" ] && mv "$l" "$l.stale.$(date +%s)" 2>/dev/null || true
done
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
