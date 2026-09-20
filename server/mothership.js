// 秋好OS の 📦母艦（全入力の原本）へ、Lask の操作を「秋好の入力」として転記する。
// 読むのは Lask 自身の ops だけ。母艦には page を1件足すだけで、既存行は触らない。
// NOTION_TOKEN が無ければ何もしない（ops は Lask の DB に残り、後から追いつく）。
import { unmirrored, markMirrored } from './db.js';

const TOKEN = process.env.NOTION_TOKEN;
const DB = process.env.MOTHERSHIP_DB_ID || 'd7a9c4a9b3964b8198b272b9f83b88b4';
const PAGE = { home: '今日', tree: '夢', ppl: '人', bal: '配分', log: '自動', about: 'Laskとは' };
const AREA = { work: '仕事', health: '体', home: '個人', hobby: '個人', dream: '個人' };

const jst = d => new Date(new Date(d).getTime() + 9 * 3600e3);
const pad = n => String(n).padStart(2, '0');
function fmt(d) { const j = jst(d); return `${j.getUTCFullYear()}-${pad(j.getUTCMonth() + 1)}-${pad(j.getUTCDate())} ${pad(j.getUTCHours())}:${pad(j.getUTCMinutes())}`; }
function bizday(d) { const j = jst(new Date(new Date(d).getTime() - 4 * 3600e3)); return `${j.getUTCFullYear()}-${pad(j.getUTCMonth() + 1)}-${pad(j.getUTCDate())}`; }

function line(o) {
  const where = (PAGE[o.page] || o.page || '') + 'タブ' + (o.section ? `「${o.section}」` : '');
  const what = o.item ? `「${o.item}」に` : '';
  const val = o.value != null && o.value !== '' && o.kind === 'range' ? `（${o.value}%）` : '';
  return `${fmt(o.ts)} Lask ${where}で ${what}「${o.label}」${val}`;
}

function body(o) {
  const t = txt => [{ type: 'text', text: { content: String(txt).slice(0, 1900) } }];
  return {
    parent: { database_id: DB },
    properties: {
      'タイトル': { title: t(`Lask ${o.label}：${o.item || o.section || PAGE[o.page] || ''}`.slice(0, 120)) },
      '全文': { rich_text: t(line(o)) },
      '入力元': { select: { name: 'Lask' } },
      '型': { select: { name: '記録' } },
      '形式': { select: { name: 'text' } },
      '領域': { select: { name: AREA[o.area] || '未分類' } },
      '発言者': { rich_text: t('秋好（Lask の操作）') },
      '冪等キー': { rich_text: t(`lask:op:${o.id}`) },
      '文脈': { rich_text: t(JSON.stringify({ kind: o.kind, page: o.page, section: o.section, item: o.item, label: o.label, value: o.value, effect: o.effect, key: o.key })) },
      '日時': { date: { start: new Date(o.ts).toISOString() } },
      '業務日': { rich_text: t(bizday(o.ts)) },
      '送出状況': { select: { name: '送出不要' } },
    },
  };
}

async function push(o) {
  const r = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
    body: JSON.stringify(body(o)),
  });
  if (!r.ok) throw new Error(`notion ${r.status}: ${(await r.text()).slice(0, 300)}`);
}

let busy = false;
export async function tick() {
  if (!TOKEN || busy) return;
  busy = true;
  try {
    const rows = await unmirrored(10);
    for (const o of rows) {
      try { await push(o); await markMirrored(o.id); }
      catch (e) { console.warn('[mothership]', o.id, e.message); await markMirrored(o.id, e.message); if (/429|5\d\d/.test(e.message)) break; }
      await new Promise(r => setTimeout(r, 350)); // Notion 3req/s
    }
  } finally { busy = false; }
}

export function start() {
  if (!TOKEN) { console.warn('[mothership] NOTION_TOKEN 未設定 → 母艦への転記は待機（ops は溜まる）'); return; }
  setInterval(() => tick().catch(e => console.warn('[mothership]', e.message)), 20_000);
  tick().catch(() => {});
}
