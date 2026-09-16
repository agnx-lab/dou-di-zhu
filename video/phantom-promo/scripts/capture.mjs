import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const {chromium} = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../public/textures/live');
const chrome = process.env.PHANTOM_CHROME ||
  'C:/Users/wolfg/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';

await fs.mkdir(outDir, {recursive: true});
const browser = await chromium.launch({headless: true, executablePath: chrome});
const context = await browser.newContext({
  viewport: {width: 1920, height: 1080},
  deviceScaleFactor: 2,
  colorScheme: 'dark',
  reducedMotion: 'no-preference',
});

const inventory = {pageW: 1920, pageH: 1080, capturedAt: '2026-09-13', pages: {}};

async function settle(page, ms = 1200) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
}

async function capture(name, url, afterStart = []) {
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 45000});
  await settle(page, 1800);
  await page.screenshot({path: path.join(outDir, `${name}-full.png`), fullPage: true});

  const state = await page.evaluate(() => {
    const pick = (node) => {
      const rect = node.getBoundingClientRect();
      return {
        tag: node.tagName.toLowerCase(),
        text: (node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 180),
        aria: node.getAttribute('aria-label'),
        x: rect.x + scrollX,
        y: rect.y + scrollY,
        w: rect.width,
        h: rect.height,
      };
    };
    return {
      title: document.title,
      scrollHeight: document.documentElement.scrollHeight,
      buttons: [...document.querySelectorAll('button')].map(pick),
      landmarks: [...document.querySelectorAll('header,nav,main,section,aside,[role="dialog"]')].map(pick),
    };
  });
  inventory.pages[name] = {...state, errors};

  for (const step of afterStart) {
    if (step.click) {
      const target = page.getByRole('button', {name: step.click}).first();
      await target.waitFor({state: 'visible', timeout: 15000});
      await target.click();
    }
    await settle(page, step.waitMs || 1200);
    await page.screenshot({path: path.join(outDir, `${name}-${step.name}.png`), fullPage: true});
  }
  await page.close();
}

await capture('lobby', 'http://localhost:5173/');
await capture('watch', 'http://localhost:5173/?mode=real', [
  {name: 'dealing', click: '开始发牌与推演', waitMs: 450},
  {name: 'reveal', waitMs: 900},
  {name: 'thinking-a', waitMs: 5200},
  {name: 'thinking-b', waitMs: 9200},
  {name: 'thinking-c', waitMs: 12000},
]);
await capture('play', 'http://localhost:5173/?mode=play', [
  {name: 'dealing', click: '同意并开始发牌', waitMs: 450},
  {name: 'ready', waitMs: 2500},
]);

await fs.writeFile(path.resolve(here, '../src/live-layout.json'), JSON.stringify(inventory, null, 2));
await browser.close();
console.log(`Captured ${Object.keys(inventory.pages).length} page states to ${outDir}`);

