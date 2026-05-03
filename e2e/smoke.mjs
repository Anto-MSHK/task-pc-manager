import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const SCREENSHOT_DIR = new URL('./screenshots/', import.meta.url);
const TEST_EMAIL = 'admin@promo.test';
const TEST_PASSWORD = 'password123';

const RUN_TAG = Math.random().toString(36).slice(2, 6).toUpperCase();
const TEST_PROMOCODE = `E2E${RUN_TAG}15`;

mkdirSync(fileURLToPath(SCREENSHOT_DIR), { recursive: true });

const failures = [];
let stepCounter = 0;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function step(page, name, fn) {
  stepCounter += 1;
  const safeName = name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
  const label = `[${String(stepCounter).padStart(2, '0')}] ${name}`;
  console.log(`${label} ...`);
  try {
    await fn();
    console.log(`${label} OK`);
  } catch (error) {
    console.log(`${label} FAIL`);
    failures.push({ step: label, error: error?.message ?? String(error) });
  } finally {
    try {
      await page.screenshot({
        path: fileURLToPath(new URL(`${String(stepCounter).padStart(2, '0')}-${safeName}.png`, SCREENSHOT_DIR)),
        fullPage: true,
      });
    } catch (err) {
      console.log(`  (screenshot failed: ${err?.message ?? err})`);
    }
  }
}

async function ensureNoModal(page) {
  await page.locator('body').click({ position: { x: 5, y: 5 }, force: true }).catch(() => {});
  await page.waitForFunction(
    () => !document.querySelector('.ant-modal-wrap:not([style*="display: none"])'),
    null,
    { timeout: 5_000 },
  ).catch(() => {});
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (error) => {
    consoleErrors.push(`pageerror: ${error.message}`);
  });

  await step(page, 'open login page', async () => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
    await page.waitForURL(/\/login$/);
    await page.waitForSelector('text=Sign in');
  });

  await step(page, 'login as admin', async () => {
    await page.fill('input[placeholder="user@example.com"]', TEST_EMAIL);
    await page.fill('input[placeholder="Password"]', TEST_PASSWORD);
    await page.click('button:has-text("Login")');
    await page.waitForURL((url) => !/\/login$/.test(url.pathname), { timeout: 10_000 });
    await page.waitForSelector('text=Dashboard');
  });

  await step(page, 'dashboard KPI cards visible', async () => {
    await page.waitForFunction(() => {
      const text = document.body.innerText;
      return /Active users/i.test(text) && /Promo usages/i.test(text) && /Discount given/i.test(text);
    }, null, { timeout: 10_000 });
  });

  await step(page, 'dashboard table loads users', async () => {
    await page.waitForSelector('table tbody tr', { timeout: 15_000 });
    const rowCount = await page.locator('table tbody tr').count();
    if (rowCount === 0) throw new Error('Dashboard table is empty');
    const aliceVisible = await page.locator('text=Alice Admin').first().isVisible();
    if (!aliceVisible) throw new Error('Alice Admin row not visible');
  });

  await step(page, 'navigate to Users analytics via URL', async () => {
    await page.goto(`${FRONTEND_URL}/analytics/users`, { waitUntil: 'networkidle' });
    await page.waitForSelector('table tbody tr', { timeout: 10_000 });
    const rowCount = await page.locator('table tbody tr').count();
    if (rowCount === 0) throw new Error('Users analytics table empty');
    if (!(await page.locator('text=ivy@promo.test').first().isVisible())) {
      throw new Error('Expected user (ivy@promo.test) not visible');
    }
  });

  await step(page, 'navigate to Promocodes via URL', async () => {
    await page.goto(`${FRONTEND_URL}/analytics/promocodes`, { waitUntil: 'networkidle' });
    await page.waitForSelector('table tbody tr', { timeout: 10_000 });
    const summer = await page.locator('text=SUMMER20').first().isVisible();
    const blackFriday = await page.locator('text=BLACKFRIDAY30').first().isVisible();
    if (!summer || !blackFriday) {
      throw new Error('Expected promocodes (SUMMER20, BLACKFRIDAY30) not visible');
    }
  });

  await step(page, `create new promocode ${TEST_PROMOCODE}`, async () => {
    await page.click('button:has-text("Create promocode")');
    await page.waitForSelector('.ant-modal-content', { state: 'visible' });

    await page.locator('.ant-modal input[placeholder="SUMMER25"]').fill(TEST_PROMOCODE);
    await page
      .locator('.ant-modal .ant-form-item:has(label:text("Discount %")) input.ant-input-number-input')
      .fill('15');

    // Wait for response from POST /promocodes before reading state
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().endsWith('/promocodes') && resp.request().method() === 'POST',
      { timeout: 10_000 },
    );
    await page.locator('.ant-modal-footer .ant-btn-primary').click();
    const response = await responsePromise;
    if (!response.ok()) {
      throw new Error(`Promocode create returned ${response.status()}`);
    }

    // Reload the page and check the new promocode is in the table
    await page.goto(`${FRONTEND_URL}/analytics/promocodes`, { waitUntil: 'networkidle' });
    await page.waitForSelector('table tbody tr', { timeout: 10_000 });
    await page.waitForFunction(
      (code) =>
        Array.from(document.querySelectorAll('table tbody tr')).some(
          (tr) => tr.textContent?.includes(code),
        ),
      TEST_PROMOCODE,
      { timeout: 10_000 },
    );
  });

  await step(page, 'navigate to Promo usages via URL', async () => {
    await page.goto(`${FRONTEND_URL}/analytics/promo-usages`, { waitUntil: 'networkidle' });
    await page.waitForSelector('table tbody tr', { timeout: 10_000 });
    const usageRows = await page.locator('table tbody tr').count();
    if (usageRows === 0) throw new Error('Promo usages table empty');
    if (!(await page.locator('text=SUMMER20').first().isVisible())) {
      throw new Error('Expected promocode usage (SUMMER20) not visible');
    }
  });

  await step(page, 'orders page: create order', async () => {
    await page.goto(`${FRONTEND_URL}/orders`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Create order');
    const amountInput = page.locator('.ant-card:has-text("Create order") input.ant-input-number-input');
    await amountInput.fill('123.45');
    await page.click('.ant-card:has-text("Create order") button:has-text("Create")');
    await page.waitForFunction(() => /Order created/.test(document.body.innerText), null, { timeout: 8_000 });
    await page.waitForSelector('text=Latest order', { timeout: 8_000 });
  });

  await step(page, `orders page: apply ${TEST_PROMOCODE} to created order`, async () => {
    const orderIdInput = page
      .locator('.ant-card:has-text("Apply promocode") input[placeholder="Mongo order id"]');
    const orderId = await orderIdInput.inputValue();
    if (!orderId) throw new Error('Order id was not auto-populated by the create-order step');

    await page
      .locator('.ant-card:has-text("Apply promocode") input[placeholder="SUMMER25"]')
      .fill(TEST_PROMOCODE);
    await page.click('.ant-card:has-text("Apply promocode") button:has-text("Apply")');
    await page.waitForFunction(
      () => /Promocode applied/.test(document.body.innerText),
      null,
      { timeout: 8_000 },
    );

    await page.waitForFunction(
      () => {
        const text = document.body.innerText;
        const finalMatch = text.match(/Final:\s*([\d.]+)/);
        return finalMatch && Number(finalMatch[1]) > 0 && Number(finalMatch[1]) < 123.45;
      },
      null,
      { timeout: 5_000 },
    );
  });

  await step(page, 'duplicate apply blocked', async () => {
    await page
      .locator('.ant-card:has-text("Apply promocode") input[placeholder="SUMMER25"]')
      .fill(TEST_PROMOCODE);
    await page.click('.ant-card:has-text("Apply promocode") button:has-text("Apply")');
    await page.waitForFunction(
      () => /already applied|Conflict|409/i.test(document.body.innerText),
      null,
      { timeout: 5_000 },
    );
  });

  await step(page, 'logout returns to login', async () => {
    await ensureNoModal(page);
    await page.click('button:has-text("Logout")');
    await page.waitForURL(/\/login$/);
  });

  await browser.close();

  console.log('\n=== Console errors captured ===');
  if (consoleErrors.length === 0) {
    console.log('(none)');
  } else {
    for (const err of consoleErrors) console.log(' -', err);
  }

  console.log('\n=== Summary ===');
  console.log(`Steps run: ${stepCounter}`);
  console.log(`Failures: ${failures.length}`);
  for (const fail of failures) console.log(' !', fail.step, '->', fail.error);

  if (failures.length > 0) process.exit(1);
}

await main();
