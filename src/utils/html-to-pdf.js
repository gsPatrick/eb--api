const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

let browserPromise;

function resolveExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const candidates = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

async function getBrowser() {
  if (!browserPromise) {
    const executablePath = resolveExecutablePath();
    if (!executablePath) {
      throw new Error(
        'Chromium not found. Set PUPPETEER_EXECUTABLE_PATH or install Chromium for HTML document rendering.'
      );
    }

    browserPromise = puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    });
  }

  return browserPromise;
}

async function renderHtmlToPdf(html, { filename, outputDir }) {
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, filename);

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: filePath,
      format: 'Letter',
      printBackground: true,
      margin: { top: '0.35in', right: '0.4in', bottom: '0.45in', left: '0.4in' },
    });
  } finally {
    await page.close();
  }

  return filePath;
}

async function closeBrowser() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}

module.exports = {
  renderHtmlToPdf,
  closeBrowser,
  resolveExecutablePath,
};
