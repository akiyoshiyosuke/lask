// Lask の自前DB（Railway Postgres）。操作履歴（ops）と現在の状態（state）だけを持つ。
// 他OSのDBには一切書かない。DATABASE_URL が無ければメモリで動く（再起動で消える・警告を出す）。
import pg from 'pg';

const url = process.env.DATABASE_URL;
let pool = null;
const mem = { ops: [], state: new Map(), seq: 0 };

export const hasDb = () => !!pool;

export async function init() {
  if (!url) { console.warn('[db] DATABASE_URL 未設定 → メモリ動作（再起動で消える）'); return; }
  pool = new pg.Pool({ connectionString: url, max: 3, ssl: url.includes('railway.internal') ? false : { rejectUnauthorized: false } });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ops (
      id BIGSERIAL PRIMARY KEY,
      ts TIMESTAMPTZ NOT NULL DEFAULT now(),
      kind TEXT NOT NULL,
      page TEXT, section TEXT, item TEXT, label TEXT, value TEXT,
      key TEXT, effect TEXT, area TEXT, ua TEXT,
      mirrored_at TIMESTAMPTZ, mirror_tries INT NOT NULL DEFAULT 0, mirror_error TEXT
    );
    CREATE TABLE IF NOT EXISTS state (
      key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS ops_mirror ON ops (id) WHERE mirrored_at IS NULL;
  `);
  console.log('[db] ready');
}

export async function addOp(o) {
  if (!pool) { const row = { id: ++mem.seq, ts: new Date().toISOString(), ...o }; mem.ops.push(row); if (o.effect) mem.state.set(o.key, { effect: o.effect, label: o.label, value: o.value }); return row; }
  const { rows } = await pool.query(
    `INSERT INTO ops (kind,page,section,item,label,value,key,effect,area,ua) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, ts`,
    [o.kind, o.page, o.section, o.item, o.label, o.value == null ? null : String(o.value), o.key, o.effect, o.area, o.ua]);
  if (o.effect && o.key) {
    if (o.effect === 'undone' || o.effect === 'unpressed') await pool.query(`DELETE FROM state WHERE key=$1`, [o.key]);
    else await pool.query(`INSERT INTO state (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=now()`,
      [o.key, JSON.stringify({ effect: o.effect, label: o.label, value: o.value })]);
  }
  return { ...o, ...rows[0] };
}

export async function getState() {
  if (!pool) return Object.fromEntries(mem.state);
  const { rows } = await pool.query(`SELECT key, value FROM state`);
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

export async function recentOps(limit = 50) {
  if (!pool) return mem.ops.slice(-limit).reverse();
  const { rows } = await pool.query(`SELECT id,ts,kind,page,section,item,label,value,effect,area,mirrored_at FROM ops ORDER BY id DESC LIMIT $1`, [limit]);
  return rows;
}

// 母艦へ未転記のもの（view は転記しない＝Lask 内だけの履歴）
export async function unmirrored(limit = 10) {
  if (!pool) return [];
  const { rows } = await pool.query(`SELECT * FROM ops WHERE mirrored_at IS NULL AND kind<>'view' AND mirror_tries<20 ORDER BY id LIMIT $1`, [limit]);
  return rows;
}
export async function markMirrored(id, err) {
  if (!pool) return;
  if (err) await pool.query(`UPDATE ops SET mirror_tries=mirror_tries+1, mirror_error=$2 WHERE id=$1`, [id, String(err).slice(0, 500)]);
  else await pool.query(`UPDATE ops SET mirrored_at=now(), mirror_error=NULL WHERE id=$1`, [id]);
}
