import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });

// ── 1. Does fill() actually update React state? Test with pressSequentially ──
const ctx1 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p1 = await ctx1.newPage();
await p1.goto('http://localhost:3000/personal-loan-calculator', { waitUntil: 'networkidle' });

// Rate input: triple-click to select all, then type
const rateInput = p1.locator('input').nth(1);
await rateInput.click({ clickCount: 3 });
await rateInput.pressSequentially('35');
await p1.keyboard.press('Tab');
await p1.waitForTimeout(600);
const body1 = await p1.textContent('body');
const statusLabels = body1.match(/(Healthy|Watch|Caution)/g) || [];
console.log('pressSequentially rate=35 → status labels:', [...new Set(statusLabels)]);

// ── 2. Does pill click actually update loanTermYears? Check via data attributes ──
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p2 = await ctx2.newPage();
await p2.goto('http://localhost:3000/personal-loan-calculator', { waitUntil: 'networkidle' });

// Click 1yr
const pill1 = p2.getByRole('button', { name: '1 yr' });
console.log('\n1yr button count:', await pill1.count());
await pill1.click();
await p2.waitForTimeout(600);
const body2 = await p2.textContent('body');

// What does Term Comparison show?
const tcText = body2.match(/Term Comparison[\s\S]{0,400}/);
console.log('After 1yr click - Term Comparison section:', tcText ? tcText[0].substring(0, 300) : 'not found');
// Does it show 1/2/3 year scenarios (expected for loanTermYears=1)?
const has1yrScenario = body2.includes('1 yr') && body2.includes('2 yr') && body2.includes('3 yr');
const has2_3_5 = body2.includes('2 yr') && body2.includes('3 yr') && body2.includes('5 yr');
console.log('Has [1,2,3] scenario cards (expected for 1yr):', has1yrScenario);
console.log('Still showing [2,3,5] scenario cards (3yr default):', has2_3_5);

// Directly check Term Optimisation
const shortestVisible = body2.includes('shortest available term');
console.log('Shortest available term message visible:', shortestVisible);

// Try via evaluate to see actual React state
const termYears = await p2.evaluate(() => {
  // Check the button styles to infer which term is active
  const pills = Array.from(document.querySelectorAll('.loan-term-pill'));
  const active = pills.find(p => p.style.background && p.style.background.includes('59,130,246'));
  return active ? active.textContent.trim() : 'none found';
});
console.log('Active pill (blue background):', termYears);

// ── 3. Can we click the pill another way? ─────────────────────────────────────
// Try clicking by text content via CSS
await p2.locator('.loan-term-pill').first().click();
await p2.waitForTimeout(600);
const body3 = await p2.textContent('body');
const activeAfter = await p2.evaluate(() => {
  const pills = Array.from(document.querySelectorAll('.loan-term-pill'));
  const active = pills.find(p => p.style.background && p.style.background.includes('59,130,246'));
  return active ? active.textContent.trim() : 'none found';
});
console.log('\nAfter .loan-term-pill.first() click - Active pill:', activeAfter);
const shortest2 = body3.includes('shortest available term');
console.log('Shortest message visible:', shortest2);

// ── 4. Income field pressSequentially ─────────────────────────────────────────
const ctx4 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p4 = await ctx4.newPage();
await p4.goto('http://localhost:3000/personal-loan-calculator', { waitUntil: 'networkidle' });
const incomeInput = p4.locator('input[placeholder="Optional"]');
await incomeInput.click();
await incomeInput.pressSequentially('60000');
await p4.keyboard.press('Tab');
await p4.waitForTimeout(600);
const body4 = await p4.textContent('body');
const hasDTI = body4.includes('of gross income') && !body4.match(/of gross income[\s\S]{0,50}Add your annual income/);
const hasPaymentPct = body4.match(/[\d.]+% of your gross monthly income/);
console.log('\nIncome pressSequentially 60000 - DTI text found:', hasDTI);
console.log('Payment % match:', hasPaymentPct ? hasPaymentPct[0] : 'not found');
const addIncomeStillShown = body4.includes('Add your annual income above to see how');
console.log('Add-income prompt still shown:', addIncomeStillShown);

// ── 5. Empty amount via pressSequentially ─────────────────────────────────────
const ctx5 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p5 = await ctx5.newPage();
await p5.goto('http://localhost:3000/personal-loan-calculator', { waitUntil: 'networkidle' });
const amtInput = p5.locator('input').nth(0);
await amtInput.click({ clickCount: 3 });
await amtInput.pressSequentially('0');
await p5.keyboard.press('Tab');
await p5.waitForTimeout(600);
const body5 = await p5.textContent('body');
const emptyMsg = body5.includes('Enter a loan amount to see your monthly payment');
console.log('\nAmount=0 pressSequentially - empty state message visible:', emptyMsg);

await browser.close();
console.log('\nDone.');
