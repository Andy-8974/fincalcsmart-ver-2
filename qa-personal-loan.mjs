import { chromium } from '@playwright/test';

const results = [];
const log = (id, pass, note) => { results.push({ id, pass, note }); };

const browser = await chromium.launch({ headless: true });

// ── Desktop ──────────────────────────────────────────────────────────────────
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(e.message));

await page.goto('http://localhost:3000/personal-loan-calculator', { waitUntil: 'networkidle' });
const title = await page.title();
log(1, title.includes('Personal Loan'), 'page load / title: ' + title);

// Default result visible
const bodyText1 = await page.textContent('body');
const hasResult = bodyText1.includes('/month') || bodyText1.includes('Monthly Payment');
const hasNaN1 = bodyText1.includes('NaN') || bodyText1.includes('Infinity');
log(2, hasResult && !hasNaN1, 'default state: result visible=' + hasResult + ', NaN=' + hasNaN1);

// Desktop no overflow
const deskW = await page.evaluate(() => document.documentElement.scrollWidth);
log(3, deskW <= 1280, 'desktop no overflow: scrollWidth=' + deskW);

// AI Analysis always visible
const aiVis = await page.locator('#ai-analysis').isVisible();
log(4, aiVis, 'AI Analysis visible without clicking CTA');

// CTA button
const ctaBtn = page.getByRole('button', { name: /Review Smart Loan Insights/i });
const ctaVis = await ctaBtn.isVisible();
log(5, ctaVis, 'CTA "Review Smart Loan Insights" button visible');

// Donut / SVG
const svgCount = await page.locator('svg').count();
log(6, svgCount >= 3, 'SVGs present (gauge + donut + others): count=' + svgCount);

// Term comparison cards
const termCardCount = await page.locator('.grid >> text=/^\\d yr$/').count();
const pillCount = await page.getByRole('button', { name: /^\d yr$/ }).count();
log(7, pillCount === 5, 'term pills: count=' + pillCount);

// Rate Check USA copy
const rcUS = await page.locator('text=/USA typically range/i').isVisible();
log(8, rcUS, 'Rate Check USA copy visible on default region');

// Income blank — affordability prompt shown
const incPrompt = await page.locator('text=/Add your annual income/i').isVisible();
log(9, incPrompt, 'income blank: add-income prompt in affordability card');

// Income entered
const incInput = page.locator('input[placeholder="Optional"]');
await incInput.click({ clickCount: 3 });
await incInput.pressSequentially('60000');
await page.keyboard.press('Tab');
await page.waitForTimeout(400);
const dtiShown = await page.locator('text=/% of your gross monthly income/').isVisible();
const noPrompt = !(await page.locator('text=/Add your annual income/i').isVisible());
log(10, dtiShown && noPrompt, 'income entered: DTI shown=' + dtiShown + ', prompt gone=' + noPrompt);
await incInput.click({ clickCount: 3 });
await incInput.pressSequentially('0');
await page.keyboard.press('Tab');
await page.waitForTimeout(200);

// Zero rate — nth(2) because nth(0) is header search, nth(1) is loan amount
const rateInput = page.locator('input').nth(2);
await rateInput.click({ clickCount: 3 });
await rateInput.pressSequentially('0');
await page.keyboard.press('Tab');
await page.waitForTimeout(400);
const body0rate = await page.textContent('body');
log(11, !body0rate.includes('NaN') && !body0rate.includes('Infinity'), 'rate=0: no NaN/Infinity');

// High rate
await rateInput.click({ clickCount: 3 });
await rateInput.pressSequentially('35');
await page.keyboard.press('Tab');
await page.waitForTimeout(400);
const bodyHigh = await page.textContent('body');
const cautionVis = await page.locator('text=Caution').first().isVisible();
log(12, !bodyHigh.includes('NaN') && !bodyHigh.includes('Infinity') && cautionVis, 'rate=35: no NaN, Caution visible=' + cautionVis);
await rateInput.click({ clickCount: 3 });
await rateInput.pressSequentially('8.5');
await page.keyboard.press('Tab');
await page.waitForTimeout(200);

// Zero loan amount — nth(1) because nth(0) is header search
const amtInput = page.locator('input').nth(1);
await amtInput.click({ clickCount: 3 });
await amtInput.pressSequentially('0');
await page.keyboard.press('Tab');
await page.waitForTimeout(400);
const bodyZero = await page.textContent('body');
const emptyPromptVis = await page.locator('text=/Enter a loan amount/i').isVisible();
log(13, !bodyZero.includes('NaN') && !bodyZero.includes('Infinity') && emptyPromptVis, 'amount=0: no NaN, empty state shown=' + emptyPromptVis);
await amtInput.click({ clickCount: 3 });
await amtInput.pressSequentially('10000');
await page.keyboard.press('Tab');
await page.waitForTimeout(200);

// 1-year term
await page.getByRole('button', { name: '1 yr' }).click();
await page.waitForTimeout(400);
const body1yr = await page.textContent('body');
const shortestMsg = await page.locator('text=/shortest available term/i').isVisible();
log(14, !body1yr.includes('NaN') && shortestMsg, '1yr term: no NaN, shortest-term message=' + shortestMsg);

// 3-year term
await page.getByRole('button', { name: '3 yr' }).click();
await page.waitForTimeout(400);
const body3yr = await page.textContent('body');
log(15, !body3yr.includes('NaN'), '3yr term: no NaN/Infinity');

// 5-year term
await page.getByRole('button', { name: '5 yr' }).click();
await page.waitForTimeout(400);
const body5yr = await page.textContent('body');
log(16, !body5yr.includes('NaN'), '5yr term: no NaN/Infinity');
await page.getByRole('button', { name: '3 yr' }).click();
await page.waitForTimeout(200);

// /calculators?q=personal
const searchPage = await ctx.newPage();
await searchPage.goto('http://localhost:3000/calculators?q=personal', { waitUntil: 'networkidle' });
const personalFound = await searchPage.locator('text=/Personal Loan/').first().isVisible();
log(17, personalFound, '/calculators?q=personal finds Personal Loan');
await searchPage.close();

// Canada region Rate Check
await page.evaluate(() => { localStorage.setItem('fcs-region', 'ca'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const rcCA = await page.locator('text=/loans in Canada/i').isVisible();
log(18, rcCA, 'CA region: Rate Check shows Canada copy');

// Console errors
log(19, errors.length === 0, errors.length === 0 ? 'no console errors' : 'ERRORS: ' + errors.slice(0, 3).join(' | '));

// ── Tablet 768px ─────────────────────────────────────────────────────────────
const tabCtx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
const tabPage = await tabCtx.newPage();
const tabErrors = [];
tabPage.on('console', m => { if (m.type() === 'error') tabErrors.push(m.text()); });
await tabPage.goto('http://localhost:3000/personal-loan-calculator', { waitUntil: 'networkidle' });
const tabW = await tabPage.evaluate(() => document.documentElement.scrollWidth);
const tabNaN = (await tabPage.textContent('body')).includes('NaN');
log(20, tabW <= 768 && !tabNaN && tabErrors.length === 0, 'tablet 768: scrollWidth=' + tabW + ', NaN=' + tabNaN + ', errors=' + tabErrors.length);
await tabCtx.close();

// ── Mobile 375px ─────────────────────────────────────────────────────────────
const mobCtx = await browser.newContext({ viewport: { width: 375, height: 812 } });
const mobPage = await mobCtx.newPage();
const mobErrors = [];
mobPage.on('console', m => { if (m.type() === 'error') mobErrors.push(m.text()); });
await mobPage.goto('http://localhost:3000/personal-loan-calculator', { waitUntil: 'networkidle' });
const mobW = await mobPage.evaluate(() => document.documentElement.scrollWidth);
const mobNaN = (await mobPage.textContent('body')).includes('NaN');

// Pill wrap check
const mobPillCount = await mobPage.getByRole('button', { name: /^\d yr$/ }).count();
const pillOverflow = await mobPage.evaluate(() => {
  const container = document.querySelector('.loan-term-pills');
  if (!container) return 'container-missing';
  const cRect = container.getBoundingClientRect();
  const pills = container.querySelectorAll('.loan-term-pill');
  let over = false;
  pills.forEach(p => { if (p.getBoundingClientRect().right > cRect.right + 2) over = true; });
  return over ? 'overflow' : 'ok';
});
// Check pill rows — at 375px pills should wrap: row1 has top ~same, row2 has higher top
const pillRows = await mobPage.evaluate(() => {
  const pills = Array.from(document.querySelectorAll('.loan-term-pill'));
  if (pills.length < 5) return 0;
  const tops = pills.map(p => Math.round(p.getBoundingClientRect().top));
  return new Set(tops).size;
});
log(21, mobW <= 375 && !mobNaN, 'mobile 375: scrollWidth=' + mobW + ', NaN=' + mobNaN);
log(22, pillOverflow === 'ok', 'mobile pills no overflow: ' + pillOverflow);
log(23, pillRows >= 2, 'mobile pills wrap to ' + pillRows + ' rows (expected >=2)');
log(24, mobPillCount === 5 && mobErrors.length === 0, 'mobile: all 5 pills found, errors=' + mobErrors.length);
await mobCtx.close();

await browser.close();

// ── Report ────────────────────────────────────────────────────────────────────
console.log('\n=== QA RESULTS ===');
let pass = 0, fail = 0;
results.forEach(r => {
  console.log((r.pass ? '✅' : '❌') + ' [' + r.id + '] ' + r.note);
  r.pass ? pass++ : fail++;
});
console.log('\nTotal: ' + pass + ' pass, ' + fail + ' fail');
