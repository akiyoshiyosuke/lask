// lask-home.html の各ページを縦長PNGで撮る
// 使い方: npm run shot            → 全タブ
//         npm run shot -- ppl t1   → 指定ページのみ
// 出力:   shots/<id>.png
// 環境変数: SCALE（既定1.24）/ CHROMIUM（既存Chromiumのパス。未指定ならPlaywright同梱版）
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TABS = ['home', 'tree', 'ppl', 'bal', 'log'];
const ids = process.argv.length > 2 ? process.argv.slice(2) : TABS;
const outDir = path.join(root, 'shots');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage({
  viewport: { width: 1400, height: 1000 },
  deviceScaleFactor: Number(process.env.SCALE || 1.24),
});
await page.goto(pathToFileURL(path.join(root, 'ui/lask-home.html')).href);
// スクロール領域を伸ばして1枚に収める
await page.addStyleTag({ content: '.scr{height:auto!important}.view{overflow:visible!important;height:auto!important}.phone{height:auto!important}' });

for (const id of ids) {
  if (!(await page.$(`.page#${id}`))) { console.error(`skip: #${id} が無い`); continue; }
  await page.evaluate(([id, tab]) => show(id, tab), [id, TABS.includes(id)]);
  await page.waitForTimeout(150);
  const out = path.join(outDir, `${id}.png`);
  await (await page.$('.phone')).screenshot({ path: out }); // clipではなく要素を撮る
  console.log(out);
}
await browser.close();
