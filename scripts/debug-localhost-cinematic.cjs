const { chromium } = require('@playwright/test');
const fs = require('node:fs');

const baseUrl = process.env.CINEMATIC_DEBUG_URL || 'http://localhost:3000';
const outputDir = process.env.CINEMATIC_DEBUG_DIR || 'artifacts/runtime-localhost';
const sceneCount = 13;

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  const scripts = new Set();
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    const url = response.url();
    if (/\.(?:js|mjs)(?:\?|$)/.test(url)) scripts.add(url);
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.mouse.move(180, 180);
  await page.mouse.click(180, 180);
  await page.mouse.wheel(0, 28);
  for (let attempt = 0; attempt < 24; attempt += 1) {
    if (await page.evaluate(() => typeof window.__fardeenSeek === 'function')) break;
    await page.mouse.wheel(0, 12);
    await page.waitForTimeout(400);
  }
  const activated = await page.evaluate(() => typeof window.__fardeenSeek === 'function');
  if (!activated) {
    fs.mkdirSync(outputDir, { recursive: true });
    await page.screenshot({ path: `${outputDir}/00-activation-failed.png`, fullPage: true });
    const diagnostic = await page.evaluate(async () => ({
      href: location.href,
      body: document.body.innerText.slice(0, 500),
      cinematicSpacer: Boolean(document.querySelector('[data-cinematic-spacer]')),
      canvas: Boolean(document.querySelector('[data-cinematic-spacer] canvas')),
      scriptSources: [...document.scripts].map((script) => script.src).filter(Boolean),
      serviceWorkers: 'serviceWorker' in navigator
        ? (await navigator.serviceWorker.getRegistrations()).map((registration) => registration.active?.scriptURL ?? null)
        : [],
      cacheKeys: 'caches' in window ? await caches.keys() : [],
    }));
    const result = {
      baseUrl,
      capturedAt: new Date().toISOString(),
      activated: false,
      diagnostic,
      observedScripts: [...scripts],
      errors,
    };
    fs.writeFileSync(`${outputDir}/runtime.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
    await Promise.race([browser.close(), new Promise((resolve) => setTimeout(resolve, 2500))]);
    process.exit(3);
  }
  await page.evaluate(() => {
    const spacer = document.querySelector('[data-cinematic-spacer]');
    window.scrollTo(0, spacer.offsetTop);
  });
  await page.waitForTimeout(900);
  const cinematic = page.locator('[data-cinematic-spacer] > div');
  await cinematic.scrollIntoViewIfNeeded();
  fs.mkdirSync(outputDir, { recursive: true });

  const sample = async (time, name) => {
    await page.evaluate((progress) => window.__fardeenSeek(progress), time / sceneCount);
    await page.waitForTimeout(500);
    await cinematic.screenshot({ path: `${outputDir}/${name}.png` });
    return page.evaluate(() => ({
      state: window.__fardeenVisibilityState?.() ?? null,
      camera: window.__fardeenCameraState?.() ?? null,
      signature: window.__fardeenBuildSignature ?? null,
    }));
  };

  const approach = await sample(4.8, '01-normal-approach');
  const interior = await sample(5.5, '02-interior-start');
  const master = await sample(8.8, '03-master');
  const terrace = await sample(11.8, '04-terrace');
  const final = await sample(12.8, '05-final');
  const reverse = await sample(8.8, '06-reverse-master');
  const browserState = await page.evaluate(async () => ({
    href: location.href,
    scriptSources: [...document.scripts].map((script) => script.src).filter(Boolean),
    resourceScripts: performance.getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((name) => /\.(?:js|mjs)(?:\?|$)/.test(name)),
    serviceWorkers: 'serviceWorker' in navigator
      ? (await navigator.serviceWorker.getRegistrations()).map((registration) => registration.active?.scriptURL ?? null)
      : [],
    cacheKeys: 'caches' in window ? await caches.keys() : [],
  }));
  const result = {
    baseUrl,
    capturedAt: new Date().toISOString(),
    hooks: await page.evaluate(() => ({
      seek: typeof window.__fardeenSeek,
      visibility: typeof window.__fardeenVisibilityState,
      camera: typeof window.__fardeenCameraState,
      setCamera: typeof window.__fardeenSetCamera,
    })),
    samples: { approach, interior, master, terrace, final, reverse },
    browserState,
    observedScripts: [...scripts],
    errors,
  };
  fs.writeFileSync(`${outputDir}/runtime.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  await Promise.race([browser.close(), new Promise((resolve) => setTimeout(resolve, 2500))]);
  process.exit(errors.length ? 2 : 0);
})().catch((error) => { console.error(error); process.exit(1); });
