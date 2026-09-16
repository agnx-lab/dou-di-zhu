import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const {chromium} = require('playwright-core');
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

async function ready(page, url) {
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 45000});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1800);
  return errors;
}

async function snap(page, name) {
  await page.screenshot({path: path.join(outDir, `${name}.png`), fullPage: true});
}

const watch = await context.newPage();
const watchErrors = await ready(watch, 'http://localhost:5173/?mode=real');
await watch.getByRole('button', {name: '开始发牌与推演'}).click();
await watch.waitForTimeout(3300);
for (let index = 1; index <= 14; index++) {
  await watch.waitForTimeout(1750);
  await snap(watch, `v3-turn-${String(index).padStart(2, '0')}`);
}

const play = await context.newPage();
const playErrors = await ready(play, 'http://localhost:5173/?mode=play');
await play.getByRole('button', {name: '同意并开始发牌'}).click();
await play.waitForTimeout(3200);
await snap(play, 'v3-human-ready');
const advice = play.locator('.advice-button').first();
if (await advice.isVisible()) {
  await advice.click();
  await play.waitForTimeout(650);
  await snap(play, 'v3-human-advice-selected');
}

await browser.close();
const errors = [...watchErrors, ...playErrors];
if (errors.length) throw new Error(`Browser errors during V3 capture:\n${errors.join('\n')}`);
console.log('Captured 14 real autoplay states and 2 human-assist states for V3.');
