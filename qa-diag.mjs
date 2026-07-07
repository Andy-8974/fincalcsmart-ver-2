import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });

// ── Check 1: console errors — do they pre-exist on debt repayment page? ──────
const ctx1 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p1 = await ctx1.newPage();
const drErrors = [];
p1.on('console', m => { if (m.type() === 'error') drErrors.push(m.text()); });
await p1.goto('http://localhost:3000/debt-repayment-calculator', { waitUntil: 'networkidle' });
console.log('Debt Repayment console errors:', drErrors.length, drErrors.slice(0, 5));
await ctx1.close();

// ── Check 2: what are the 404 resources on personal loan? ─────────────────────
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p2 = await ctx2.newPage();
const p2errors = [];
p2.on('requestfailed', r => p2errors.push('FAIL: ' + r.url()));
p2.on('response', r => { if (r.status() === 404) p2errors.push('404: ' + r.url()); });
await p2.goto('http://localhost:3000/personal-loan-calculator', { waitUntil: 'networkidle' });
console.log('\nPersonal Loan 404s:', p2errors.slice(0, 10));
await ctx2.close();

// ── Check 3: income fill — what text is in the body after filling? ─────────────
const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p3 = await ctx3.newPage();
await p3.goto('http://localhost:3000/personal-loan-calculator', { waitUntil: 'networkidle' });
const incomeInput = p3.locator('input[placeholder="Optional"]');
console.log('\nIncome input count:', await incomeInput.count());
await incomeInput.click();
await incomeInput.fill('60000');
await p3.waitForTimeout(600);
// Check the KPI card text
const kpiText = await p3.locator('.dps-gauge').first().isVisible();
console.log('Gauge visible:', kpiText);
// Check for % of gross income text anywhere
const body3 = await p3.textContent('body');
const hasDTI = body3.includes('of gross income') || body3.includes('of gross monthly income');
console.log('Body has DTI text:', hasDTI);
// Find the exact text rendered
const matches = body3.match(/[\d.]+%[^<]*income/g);
console.log('DTI matches in body:', matches ? matches.slice(0, 5) : 'none');
// Also check for affordability card
const affText = body3.match(/This payment is[\s\S]{0,100}/);
console.log('Affordability text:', affText ? affText[0].substring(0, 100) : 'not found');
await ctx3.close();

// ── Check 4: rate=35 Caution — what status labels are visible? ────────────────
const ctx4 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p4 = await ctx4.newPage();
await p4.goto('http://localhost:3000/personal-loan-calculator', { waitUntil: 'networkidle' });
const rateInput = p4.locator('input').nth(1);
await rateInput.fill('35');
await p4.keyboard.press('Tab');
await p4.waitForTimeout(500);
const body4 = await p4.textContent('body');
const statusMatches = body4.match(/(Healthy|Watch|Caution|Excellent|Good|Fair|Poor)/g);
console.log('\nRate=35 status labels found:', [...new Set(statusMatches || [])]);
const caution4 = await p4.locator('text=Caution').count();
console.log('Caution element count:', caution4);
await ctx4.close();

// ── Check 5: zero amount — what shows in results card? ────────────────────────
const ctx5 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p5 = await ctx5.newPage();
await p5.goto('http://localhost:3000/personal-loan-calculator', { waitUntil: 'networkidle' });
const amtInput = p5.locator('input').nth(0);
await amtInput.fill('0');
await p5.keyboard.press('Tab');
await p5.waitForTimeout(500);
const body5 = await p5.textContent('body');
const hasEnterPrompt = body5.includes('Enter a loan amount');
const hasEmptyText = body5.includes('Enter a loan amount to see your monthly payment');
console.log('\nAmount=0: Enter prompt:', hasEnterPrompt, '| exact match:', hasEmptyText);
const resultsCard = p5.locator('#calc-results');
const resultsText = await resultsCard.textContent();
console.log('Results card text (first 200):', resultsText ? resultsText.trim().substring(0, 200) : 'empty');
await ctx5.close();

// ── Check 6: 1yr term shortest message ────────────────────────────────────────
const ctx6 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p6 = await ctx6.newPage();
await p6.goto('http://localhost:3000/personal-loan-calculator', { waitUntil: 'networkidle' });
await p6.getByRole('button', { name: '1 yr' }).click();
await p6.waitForTimeout(500);
const body6 = await p6.textContent('body');
const hasShortestMsg = body6.includes('shortest available term') || body6.includes("shortest");
console.log('\n1yr term: has shortest message:', hasShortestMsg);
const termOptText = body6.match(/Term Optim[\s\S]{0,200}/);
console.log('Term Optimisation text:', termOptText ? termOptText[0].substring(0, 200) : 'not found');
await ctx6.close();

// ── Check 7: CA region — does text appear? ────────────────────────────────────
const ctx7 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p7 = await ctx7.newPage();
await p7.goto('http://localhost:3000/personal-loan-calculator', { waitUntil: 'networkidle' });
await p7.evaluate(() => { localStorage.setItem('fcs-region', 'ca'); });
await p7.reload({ waitUntil: 'networkidle' });
await p7.waitForTimeout(800);
const body7 = await p7.textContent('body');
const hasCA = body7.includes('Canada');
const caText = body7.match(/loans in Canada[\s\S]{0,100}/);
const rateCheckText = body7.match(/Rate Check[\s\S]{0,200}/);
console.log('\nCA region: body has "Canada":', hasCA);
console.log('CA rate check text:', caText ? caText[0].substring(0, 100) : 'not found');
console.log('Rate Check section:', rateCheckText ? rateCheckText[0].substring(0, 200) : 'not found');
// Also check region indicator
const caPrefix = body7.includes('CA$');
console.log('CA$ prefix visible:', caPrefix);
await ctx7.close();

await browser.close();
console.log('\nDiagnostics complete.');
