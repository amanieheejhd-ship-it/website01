const { chromium } = require('@playwright/test');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
  });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.mouse.move(180, 180);
  await page.mouse.click(180, 180);
  await page.mouse.wheel(0, 20);
  await page.keyboard.press('ArrowDown');
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await page.evaluate(() => typeof window.__fardeenSeek === 'function')) break;
    await page.mouse.move(180 + attempt, 180);
    await page.mouse.wheel(0, 12);
    await page.waitForTimeout(500);
  }
  if (!(await page.evaluate(() => typeof window.__fardeenSeek === 'function'))) {
    console.log(JSON.stringify(await page.evaluate(() => ({
      spacer: Boolean(document.querySelector('[data-cinematic-spacer]')),
      staticTour: Boolean(document.querySelector('[aria-label="Villa interior rooms"]')),
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
      webgl: Boolean(document.createElement('canvas').getContext('webgl')),
    })), errors));
    await browser.close();
    process.exit(2);
  }
  await page.waitForFunction(() => typeof window.__fardeenSeek === 'function', null, { timeout: 60000 });
  await page.evaluate(() => {
    const spacer = document.querySelector('[data-cinematic-spacer]');
    window.scrollTo(0, spacer.offsetTop);
  });
  await page.waitForFunction(() => {
    const label = [...document.querySelectorAll('span')].find((node) => node.textContent.toLowerCase().includes('preparing the estate'));
    return Boolean(label?.parentElement?.classList.contains('opacity-0'));
  }, null, { timeout: 30000 });
  await page.waitForTimeout(1000);
  const cdp = await page.context().newCDPSession(page);
  fs.mkdirSync('artifacts/sections', { recursive: true });
  const capture = async (progress, file) => {
    await page.evaluate((value) => window.__fardeenSeek(value), progress);
    await page.waitForTimeout(500);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
  };
  const sceneKeys = ['empty-land','foundation','structure','villa','gate','foyer','living','dining','kitchen','powder-room','stairs','landing','master-bedroom','second-bedroom','marble-bathroom','terrace','reveal'];
  const sectionProof = [];
  for (let index = 0; index < sceneKeys.length; index += 1) {
    const file = `artifacts/sections/${String(index + 1).padStart(2, '0')}-${sceneKeys[index]}.png`;
    await capture((index + .8) / sceneKeys.length, file);
    const visibleCaption = await page.evaluate(() => [...document.querySelectorAll('[data-scene-copy]')]
      .filter((element) => Number(getComputedStyle(element).opacity) > .5)
      .map((element) => element.textContent.trim().replace(/\s+/g, ' ')));
    sectionProof.push({ key: sceneKeys[index], visibleCaption, file });
  }
  fs.copyFileSync('artifacts/sections/09-kitchen.png', 'artifacts/interior-kitchen.png');
  fs.copyFileSync('artifacts/sections/13-master-bedroom.png', 'artifacts/interior-master.png');
  fs.copyFileSync('artifacts/sections/15-marble-bathroom.png', 'artifacts/interior-bathroom.png');

  const readVisibility = (progress) => page.evaluate((value) => {
    window.__fardeenSeek(value);
    return window.__fardeenVisibilityState();
  }, progress);
  const tracked = (state) => ({
    interior: state.interior,
    furniture: state.furniture,
    ...Object.fromEntries(Object.entries(state.rooms).map(([name, visible]) => [`room:${name}`, visible])),
  });
  const topInitial = await readVisibility(0);
  const downSamples = [];
  for (let index = 0; index <= 17; index += 1) {
    downSamples.push({ progress: index / 17, state: tracked(await readVisibility(index / 17)) });
  }
  const fullBuild = await readVisibility(1);
  const reverseSamples = [];
  for (let index = 17; index >= 0; index -= 1) {
    reverseSamples.push({ progress: index / 17, state: tracked(await readVisibility(index / 17)) });
  }
  const topAfterReverse = await readVisibility(0);
  await capture(0, 'artifacts/top-empty-after-reverse.png');
  const midReverse = await readVisibility(.55);
  const forwardAgain = await readVisibility(1);

  const downFlicker = [];
  const downSeen = new Map();
  for (const sample of downSamples) {
    for (const [name, visible] of Object.entries(sample.state)) {
      if (downSeen.get(name) && !visible) downFlicker.push({ name, progress: sample.progress });
      if (visible) downSeen.set(name, true);
    }
  }
  const reverseResurrection = [];
  const reverseHidden = new Map();
  for (const sample of reverseSamples) {
    for (const [name, visible] of Object.entries(sample.state)) {
      if (reverseHidden.get(name) && visible) reverseResurrection.push({ name, progress: sample.progress });
      if (!visible) reverseHidden.set(name, true);
    }
  }
  const topClear = (state) => Object.entries(state)
    .filter(([name]) => name !== 'rooms')
    .every(([, visible]) => visible === false)
    && Object.values(state.rooms).every((visible) => visible === false);
  const visibility = {
    topInitial,
    fullBuild,
    midReverse,
    topAfterReverse,
    forwardAgain,
    topInitialClear: topClear(topInitial),
    topAfterReverseClear: topClear(topAfterReverse),
    downFlicker,
    reverseResurrection,
  };
  await capture(0.965, 'artifacts/estate-finished-exterior.png');
  const perf = await page.evaluate(() => window.__fardeenBenchmark(650));
  const runtime = await page.evaluate(() => ({
    scrollSeek: typeof window.__fardeenSeek === 'function',
    loadingComplete: document.querySelector('[data-cinematic-spacer] canvas') !== null,
  }));

  const reduced = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const reducedPage = await reduced.newPage();
  await reducedPage.emulateMedia({ reducedMotion: 'reduce' });
  await reducedPage.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded' });
  const reducedFallback = await reducedPage.evaluate(() => ({
    cinematicMounted: Boolean(document.querySelector('[data-cinematic-spacer]')),
    staticMain: Boolean(document.querySelector('#main-content')),
  }));
  await reduced.close();
  await browser.close();
  console.log(JSON.stringify({ perf, runtime, visibility, sectionProof, reducedFallback, errors }));
})().catch((error) => { console.error(error); process.exit(1); });
