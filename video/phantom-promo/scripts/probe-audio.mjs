import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const require = createRequire(import.meta.url);
const {chromium} = require('playwright');
const chrome = process.env.PHANTOM_CHROME ||
  'C:/Users/wolfg/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const browser = await chromium.launch({headless: true, executablePath: chrome});
const page = await browser.newPage();
for (const file of process.argv.slice(2)) {
  const url = /^https?:\/\//.test(file) ? file : pathToFileURL(file).href;
  const duration = await page.evaluate(async (src) => {
    const audio = new Audio(src);
    await new Promise((resolve, reject) => {
      audio.addEventListener('loadedmetadata', resolve, {once: true});
      audio.addEventListener('error', () => reject(new Error(`Cannot read ${src}`)), {once: true});
    });
    return audio.duration;
  }, url);
  console.log(JSON.stringify({file, duration}));
}
await browser.close();
