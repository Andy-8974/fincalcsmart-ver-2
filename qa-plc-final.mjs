import { chromium } from '@playwright/test';

const results = [];
const log = (id, pass, note) => { results.push({ id, pass, note }); };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(e.message));

await page.goto('http://localhost:3000/personal-loan-calculator', { waitUntil: 'networkidle' });

// ── Smart Optimization: each term shows next-shorter ─────────────────────────

// Helper: read the Smart Optimization panel text
async function getOptText() {
  return await page.locator('[class*="rounded-2xl"]').filter({ hasText: /Smart Optimization/ }).first().textContent();
}

// 5yr → should say 4yr
await page.getByRole('button', { name: '5 yr' }).click();
await page.waitForTimeout(400);
const opt5 = await getOptText();
const has4yr = opt5.includes('4') && !opt5.match(/switch.*5\s*yr/i);
log('A1', has4yr, '5yr→4yr: opt text contains "4": ' + has4yr + ' | snippet: ' + opt5.substring(0, 120).replace(/\s+/g, ' '));

// 4yr → should say 3yr
await page.getByRole('button', { name: '4 yr' }).click();
await page.waitForTimeout(400);
const opt4 = await getOptText();
const has3yr = opt4.includes('3') && !opt4.match(/switch.*4\s*yr/i);
log('A2', has3yr, '4yr→3yr: opt text contains "3": ' + has3yr);

// 3yr → should say 2yr
await page.getByRole('button', { name: '3 yr' }).click();
await page.waitForTimeout(400);
const opt3 = await getOptText();
const has2yr = opt3.includes('2');
log('A3', has2yr, '3yr→2yr: opt text contains "2": ' + has2yr);

// 2yr → should say 1yr
await page.getByRole('button', { name: '2 yr' }).click();
await page.waitForTimeout(400);
const opt2 = await getOptText();
const has1yr = opt2.includes('1');
log('A4', has1yr, '2yr→1yr: opt text contains "1": ' + has1yr);

// 1yr → should show shortest-term message, no savings number
await page.getByRole('button', { name: '1 yr' }).click();
await page.waitForTimeout(400);
const opt1 = await getOptText();
const noFakeSavings = opt1.includes('shortest') && !opt1.match(/\$[\d,]+.*saved/i);
log('A5', noFakeSavings, '1yr no fake savings, shows shortest: ' + noFakeSavings);

// Reset to 3yr
await page.getByRole('button', { name: '3 yr' }).click();
await page.waitForTimeout(300);

// ── Borrowing Cost gauge consistency ─────────────────────────────────────────

// Rate = 8.5% (default): expect Healthy/Excellent or Good
const body_def = await page.textContent('body');
const bcHealthy = body_def.includes('Healthy') && (body_def.includes('Excellent') || body_def.includes('Good'));
log('B1', bcHealthy, 'default rate 8.5%: Healthy + Good/Excellent visible=' + bcHealthy);

// Rate = 10%: expect Watch/Fair (score ~58 → Fair band 45–64)
const rateInput = page.locator('input').nth(2);
await rateInput.click({ clickCount: 3 });
await rateInput.pressSequentially('10');
await page.keyboard.press('Tab');
await page.waitForTimeout(400);
const body_14 = await page.textContent('body');
const bcWatch = body_14.includes('Watch') && body_14.includes('Fair');
log('B2', bcWatch, 'rate=10%: Watch + Fair visible=' + bcWatch);

// Rate = 25%: expect Caution/Poor
await rateInput.click({ clickCount: 3 });
await rateInput.pressSequentially('25');
await page.keyboard.press('Tab');
await page.waitForTimeout(400);
const body_25 = await page.textContent('body');
const bcCaution = body_25.includes('Caution') && body_25.includes('Poor');
log('B3', bcCaution, 'rate=25%: Caution + Poor visible=' + bcCaution);

// Reset rate
await rateInput.click({ clickCount: 3 });
await rateInput.pressSequentially('8.5');
await page.keyboard.press('Tab');
await page.waitForTimeout(300);

// ── Affordability gauge consistency ──────────────────────────────────────────

const incInput = page.locator('input[placeholder="Optional"]');

// High income (DTI ~7%) → Affordable / Manageable
await incInput.click({ clickCount: 3 });
await incInput.pressSequentially('120000');
await page.keyboard.press('Tab');
await page.waitForTimeout(400);
const body_hi = await page.textContent('body');
const affHi = body_hi.includes('Affordable') && body_hi.includes('Manageable');
log('C1', affHi, 'income 120k (low DTI): Affordable+Manageable=' + affHi);

// Mid income (DTI ~17%) → Watch / Moderate
await incInput.click({ clickCount: 3 });
await incInput.pressSequentially('24000');
await page.keyboard.press('Tab');
await page.waitForTimeout(400);
const body_mid = await page.textContent('body');
const affMid = body_mid.includes('Watch') && body_mid.includes('Moderate');
log('C2', affMid, 'income 24k (mid DTI ~17%): Watch+Moderate=' + affMid);

// Low income (DTI ~35%) → High Burden / High
await incInput.click({ clickCount: 3 });
await incInput.pressSequentially('12000');
await page.keyboard.press('Tab');
await page.waitForTimeout(400);
const body_lo = await page.textContent('body');
const affLo = body_lo.includes('High Burden') && body_lo.includes('High');
log('C3', affLo, 'income 12k (high DTI ~35%): High Burden+High=' + affLo);

// No income → No Income badge visible
await incInput.click({ clickCount: 3 });
await incInput.pressSequentially('0');
await page.keyboard.press('Tab');
await page.waitForTimeout(300);
const body_none = await page.textContent('body');
const affNone = body_none.includes('No Income');
log('C4', affNone, 'no income: No Income badge visible=' + affNone);

// ── Term pills update values ──────────────────────────────────────────────────
// The main payment display has no '/month' suffix; compare "X payments over Y years" text.

await page.getByRole('button', { name: '3 yr' }).click();
await page.waitForTimeout(400);
const meta3 = await page.locator('text=/payments over/').first().textContent();

await page.getByRole('button', { name: '5 yr' }).click();
await page.waitForTimeout(400);
const meta5 = await page.locator('text=/payments over/').first().textContent();
log('D1', meta3 !== meta5, '5yr vs 3yr payment metadata differs: ' + meta3 + ' → ' + meta5);

await page.getByRole('button', { name: '1 yr' }).click();
await page.waitForTimeout(400);
const meta1 = await page.locator('text=/payments over/').first().textContent();
log('D2', meta1 !== meta3, '1yr vs 3yr payment metadata differs: ' + meta1 + ' → ' + meta3);

// No NaN across all terms
await page.getByRole('button', { name: '2 yr' }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: '4 yr' }).click();
await page.waitForTimeout(300);
const body_4yr = await page.textContent('body');
log('D3', !body_4yr.includes('NaN') && !body_4yr.includes('Infinity'), '4yr: no NaN/Infinity');

await page.getByRole('button', { name: '3 yr' }).click();

// ── Console errors ────────────────────────────────────────────────────────────
log('E1', errors.length === 0, errors.length === 0 ? 'no console errors' : 'ERRORS: ' + errors.slice(0, 3).join(' | '));

await browser.close();

console.log('\n=== EXTENDED QA RESULTS ===');
let pass = 0, fail = 0;
results.forEach(r => {
  console.log((r.pass ? '✅' : '❌') + ' [' + r.id + '] ' + r.note);
  r.pass ? pass++ : fail++;
});
console.log('\nTotal: ' + pass + ' pass, ' + fail + ' fail');
