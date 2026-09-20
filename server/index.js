// Lask — 極小サーバー（Node 標準モジュールだけ。依存ゼロ）
// 役目は3つ：合言葉で守る／ui/ を配る／将来 /api を生やす場所
// 環境変数：PORT（Railway が入れる）／LASK_PASSCODE（合言葉・必須）／LASK_SECRET（Cookie 署名鍵・任意。無ければ合言葉から導出）
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UI = path.join(__dirname, '..', 'ui');
const PORT = process.env.PORT || 3000;
const PASS = (process.env.LASK_PASSCODE || '').trim();
const SECRET = process.env.LASK_SECRET || crypto.createHash('sha256').update('lask-cookie:' + PASS).digest('hex');
const COOKIE = 'lask';
const DAYS = 90;

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };

// 合言葉なしでも配ってよいもの（私的データを含まない）
const PUBLIC = new Set(['/manifest.webmanifest', '/sw.js', '/icon-180.png', '/icon-192.png', '/icon-512.png']);
// パス → ui/ のファイル
const ROUTES = { '/': 'lask-home.html', '/index.html': 'lask-home.html', '/25': 'lask-25.html', '/board': 'lask-board-demo.html' };

function token() { return crypto.createHmac('sha256', SECRET).update('lask-v1').digest('hex'); }
function authed(req) {
  const c = req.headers.cookie || '';
  const m = c.match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([a-f0-9]{64})'));
  if (!m) return false;
  const a = Buffer.from(m[1]), b = Buffer.from(token());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function setCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=${token()}; Max-Age=${DAYS * 86400}; Path=/; HttpOnly; Secure; SameSite=Lax`);
}
function send(res, code, body, type = 'text/plain; charset=utf-8', extra = {}) {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer', ...extra });
  res.end(body);
}
function file(res, name) {
  const p = path.join(UI, name);
  if (!p.startsWith(UI) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) return send(res, 404, 'not found');
  send(res, 200, fs.readFileSync(p), TYPES[path.extname(p)] || 'application/octet-stream');
}
function gate(res, wrong) {
  // 合言葉の画面。存在をなるべく見せない（説明ゼロ・白黒）
  send(res, wrong ? 401 : 200, `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Lask"><link rel="apple-touch-icon" href="/icon-180.png"><link rel="manifest" href="/manifest.webmanifest"><title>Lask</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#e9e8e3;color:#141311;font-family:-apple-system,"Hiragino Sans",system-ui,sans-serif}
form{display:flex;flex-direction:column;gap:12px;width:260px}b{font-size:22px;letter-spacing:-.02em}input{font-size:18px;padding:12px 14px;border:1px solid #d3cfc5;border-radius:12px;background:#fffefb;text-align:center;letter-spacing:.2em}
button{font-size:15px;font-weight:700;padding:13px;border:0;border-radius:12px;background:#141311;color:#fff}small{color:#8b877d;font-size:12px;text-align:center;min-height:1em}</style></head>
<body><form method="post" action="/auth"><b>Lask</b><input name="p" type="password" inputmode="numeric" autocomplete="current-password" autofocus placeholder="合言葉"><button>入る</button><small>${wrong ? '違います' : ''}</small></form></body></html>`, 'text/html; charset=utf-8');
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  if (!PASS) return send(res, 503, 'LASK_PASSCODE が未設定です');
  if (p === '/healthz') return send(res, 200, 'ok');
  if (PUBLIC.has(p)) return file(res, p.slice(1));

  if (req.method === 'POST' && p === '/auth') {
    let body = '';
    req.on('data', d => { body += d; if (body.length > 1e4) req.destroy(); });
    req.on('end', () => {
      const given = (new URLSearchParams(body).get('p') || '').trim();
      const a = Buffer.from(given), b = Buffer.from(PASS);
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) { setCookie(res); return send(res, 303, '', 'text/plain', { Location: '/' }); }
      setTimeout(() => gate(res, true), 800); // 総当たりを遅くする
    });
    return;
  }
  if (p === '/logout') { res.setHeader('Set-Cookie', `${COOKIE}=; Max-Age=0; Path=/`); return send(res, 303, '', 'text/plain', { Location: '/' }); }

  if (!authed(req)) return gate(res, false);
  if (ROUTES[p]) return file(res, ROUTES[p]);
  if (p.startsWith('/api/')) return send(res, 200, JSON.stringify({ ok: true, note: '②実データはここに生える' }), 'application/json; charset=utf-8');
  return file(res, p.slice(1));
});
server.listen(PORT, () => console.log('Lask on :' + PORT));
