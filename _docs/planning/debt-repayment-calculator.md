# Planning Doc — Debt Repayment Calculator

> Status: **Pre-build gate complete.** All Role 1–4 outputs defined. Implementation may begin.
>
> Slug: `/debt-repayment-calculator`
> Created: 2026-05-24
> Template version: NEW_CALCULATOR_PLANNING_TEMPLATE.md 2026-05-24

---

## 1. Calculator Overview

**Calculator name:** Debt Repayment Calculator

**URL slug:** `/debt-repayment-calculator`

**Category:** Loans

**Target users:** Anyone carrying personal debt (credit card, personal loan, line of credit, student loan) who wants to understand their payoff timeline and the impact of paying more each month. Typically mid-decision: they already have the debt and are asking "how do I get out of this, and how fast?"

**Country structure:**
- [x] Dual-region — single file with `useRegion()` toggle

**Separate pages justification:** Not applicable. Core debt amortization math is identical in both countries. The Canadian Interest Act semi-annual compounding rule applies to mortgages — not personal loans, credit cards, or lines of credit. The only regional difference is currency label (CAD vs USD) and default values.

**Business value:** Debt repayment is a universal personal finance concern. This calculator serves users who have already taken on debt and need a concrete path out. It provides a natural on-ramp to higher-value calculators: a user who pays off their credit card is a near-term candidate for the Mortgage Qualifier. It fills a high-traffic keyword gap ("debt payoff calculator", "credit card payoff calculator") that the mortgage-focused existing pages do not address.

**Related calculators:**
- Canadian Mortgage Calculator — cross-link for users who want to redirect freed-up debt payments to a mortgage
- US Mortgage Calculator — same rationale
- Mortgage Qualifier Calculator — "once this debt is cleared, see what mortgage you qualify for"

---

## 2. User Intent

**What question is the user trying to answer?**
"How long until I am debt-free, and how much will this debt cost me in total?"

**What decision are they trying to make?**
Whether to increase their monthly payment — and by how much. The calculator must make the cost of waiting concrete (extra months, extra dollars of interest) so the user can make an informed choice about paying more aggressively.

**What emotion or concern do they have?**
"I feel stuck. I'm paying every month but the balance barely moves. Is this ever going to end?"

The tone of the AI Analysis must be calm and motivating — show a clear path forward, not a verdict on their choices to date.

**Primary decision metric:**
**Debt-free date** (expressed as a calendar month + year, e.g., "June 2028"). Supported by months-to-payoff and total interest. The debt-free date is the number the user acts on.

---

## 3. Inputs

### Required inputs

| Field label | Input type | Default value | Valid range | Notes |
|-------------|-----------|---------------|-------------|-------|
| Current Balance | Currency (NumericInput) | 5,000 | > 0, ≤ 500,000 | CA$ or $ prefix per region |
| Annual Interest Rate | Percent (NumericInput) | 19.99 | 0–100 | Typical credit card rate; label "Annual Interest Rate (%)" |
| Monthly Payment | Currency (NumericInput) | 150 | > 0 | Must exceed monthly interest charge or show warning |

### Optional inputs

| Field label | Input type | Default value | Valid range | Notes |
|-------------|-----------|---------------|-------------|-------|
| Extra Monthly Payment | Currency (NumericInput) | 0 | ≥ 0, ≤ 10,000 | Drives the comparison scenario; key product moment |

### Country-specific fields

| Field | Canada | USA |
|-------|--------|-----|
| Currency prefix | CA$ | $ |
| Currency label | CAD | USD |
| Default balance | CA$5,000 | $5,000 |
| Default payment | CA$150 | $150 |

No formula differences between regions. Only labels and currency prefix change.

---

## 4. Outputs

**Primary result:** **Months to pay off** — displayed as a calendar date ("Debt-free by June 2028") plus the count ("42 months"). The date format is more emotionally real than a number of months alone.

**Secondary results:**

| Output label | Description | Format |
|-------------|-------------|--------|
| Total Interest Paid | Sum of all interest charges over the life of repayment | fmtCAD / fmtUSD |
| Total Amount Paid | Principal + total interest | fmtCAD / fmtUSD |
| Monthly Interest Charge | Interest accruing this month at current balance | fmtCAD / fmtUSD — shown as a "cost of carrying" figure |

**Comparison / scenario outputs:**
Two-column comparison: **Current Plan** (minimum payment) vs **Accelerated Plan** (minimum + extra payment). Only shown when extra payment > 0. Shows:
- Debt-free date for each plan
- Total interest for each plan
- Interest saved
- Months saved

This is the key product moment — making the extra payment impact concrete.

**Visual chart outputs:**
A simple inline SVG **payoff timeline chart** showing the balance declining over time. Two lines when extra payment > 0: current plan (slower curve) vs accelerated plan (faster curve). X-axis = months, Y-axis = remaining balance. No external library — inline SVG following the `DonutChart` pattern in `_mortgage-shared/ui.tsx`. Single line when extra payment = 0.

The chart replaces the Compare Scenarios cards from the mortgage template. No donut chart needed — the payoff timeline is more informative for this calculator type.

---

## 5. Financial Logic

**Primary formula(s):**

```
Standard loan amortization (monthly compounding):

r = annualRate / 100 / 12         // monthly interest rate
n = -ln(1 - r × balance / payment) / ln(1 + r)   // months to payoff

totalPaid    = payment × n
totalInterest = totalPaid - balance

// With extra payment:
n_accel      = -ln(1 - r × balance / (payment + extraPayment)) / ln(1 + r)

// Debt-free date: add n months to current month
debtFreeDate = new Date(); debtFreeDate.setMonth(current + Math.ceil(n))
```

Source: Standard loan amortization formula (actuarial method). Reference: CFPB consumer financial education materials; same formula used by every major bank's debt payoff estimator.

**Canada-specific rules:**
None. The Canadian Interest Act semi-annual compounding requirement applies to mortgages, not to personal loans, credit cards, or lines of credit. Personal debt in Canada compounds monthly, identical to the US. Do not apply the `Math.pow(1 + annualRate / 200, 1/6) - 1` formula here.

**USA-specific rules:**
None beyond standard monthly compounding.

**Assumptions:**
- Interest rate is fixed for the life of repayment (no variable rate modeling)
- No new charges are added to the balance (static balance assumption)
- Payments are made on the same day each month (no day-count adjustment)
- The final payment may be smaller than the regular payment (partial last payment)

**Limits and thresholds:**

| Variable | Minimum | Maximum | Notes |
|----------|---------|---------|-------|
| Balance | $1 | $500,000 | Clamp; show warning above $100k |
| Annual rate | 0% | 100% | Rate = 0 is valid (interest-free loan) |
| Monthly payment | $1 | $500,000 | Must exceed r × balance or show error |
| Extra payment | $0 | $10,000 | Default 0 |

**Edge cases:**

| Condition | Expected behavior |
|-----------|------------------|
| Payment ≤ monthly interest charge | Block calculation. Show inline error: "Your payment doesn't cover the monthly interest. Increase your payment to make progress on the balance." No result rendered. |
| Balance = 0 or blank | Zero-state UI: "Enter your balance to see your payoff timeline." No NaN. |
| Rate = 0% | Payoff = Math.ceil(balance / payment) months. Total interest = $0. Valid — show result normally. |
| Rate > 50% | Show Caution status. Note in AI Analysis: "Rates above 50% are typical of payday loans or high-risk products — consider consolidation options." |
| Extra payment ≥ balance | Accelerated plan shows payoff in 1 month. Total interest = r × balance × 1. Valid result. |
| Payment > balance | Payoff in 1 month (final payment < regular payment). Guard: Math.min(regularPayment, remainingBalance) for last-month payment. |
| All inputs zero / blank | Zero-state UI with placeholder text. No JS errors. No NaN or Infinity displayed. |
| Region switch mid-session | Currency label swaps (CA$ ↔ $). Formula unchanged. Results remain valid. |
| Very large balance (e.g. $500,000) | Valid. Render normally. AI Analysis may flag long payoff timeline as Watch or Caution. |
| n result is NaN or Infinity | Guard: if `!Number.isFinite(n) || n <= 0`, show payment-too-low error state. |

**Invalid input behavior:**
All monetary outputs guarded with `Number.isFinite(n) && n >= 0` before render. Show `—` or `$0` for any result that fails the guard. Never display NaN, Infinity, or negative values. The payment-too-low condition is the most likely real-world invalid state and gets its own named error UI.

---

## 6. AI Analysis Plan

> Reference: `_docs/FINANCIAL_INTELLIGENCE_FRAMEWORK.md §3–§4`

### Calculator Intelligence Model

| Dimension | Value |
|-----------|-------|
| User intent | How long until I'm debt-free? Can I accelerate it? |
| Key inputs | Balance, interest rate, monthly payment, extra payment |
| Key outputs | Debt-free date, total interest, interest saved by extra payment |
| Primary decision metric | Debt-free date (months to payoff) |
| Risk signals | Rate > 30%; payoff > 60 months; payment barely covers interest; total interest > 50% of balance |
| Opportunity signals | Extra payment = 0 (user hasn't explored acceleration); interest rate > 20% (consolidation may help) |
| Emotional concern | "I feel stuck — is this ever going to end?" |
| Default state goal | Show a concrete payoff date that is near enough to feel achievable, with a clear "add $X/month to finish sooner" message |
| Edge-case behavior | Payment-too-low → named error state; zero balance → zero-state placeholder; zero rate → valid simplified result |

### AI Analysis display mode
- [x] Always visible (Qualifier-type) — debt status insight is immediately valuable; no CTA gate needed

---

### Five-question answers

**1. What does this result mean?**
Plain language: "At your current payment of [amount]/month, you'll pay off this debt by [Month Year] — [n] months from now. Over that time, you'll pay [total interest] in interest on top of the [balance] you owe today."

**2. Is the user in a good, borderline, or risky position?**

| Status | Condition |
|--------|-----------|
| Healthy | Payoff ≤ 24 months AND rate ≤ 20% |
| Watch | Payoff 25–60 months OR rate 20–30% |
| Caution | Payoff > 60 months OR rate > 30% OR total interest > 60% of opening balance |

Note: "Healthy" does not mean debt-free — it means the repayment plan is on a manageable trajectory.

**3. What is the main driver?**
Determined dynamically. Show whichever factor most impacts payoff time:
- If rate > 25%: "Your interest rate is the main driver — a lower rate would significantly reduce your total cost."
- If payment < 1.5× monthly interest: "Your payment amount is the main driver — even a small increase has a large effect on total interest."
- Otherwise: "Your balance is the main driver — staying consistent with payments is your clearest path forward."

**4. What can the user improve?**
If extra payment = 0: "Adding [suggested amount, e.g. $50 or $100]/month to your payment would save you approximately [X] months and [Y] in interest. Try the Extra Monthly Payment field above."
If extra payment > 0: "You're already accelerating your payoff. Consider whether this payment level is sustainable — consistency matters more than maximum extra payments."

**5. What should they watch out for?**
"If your interest rate changes (e.g. a promotional rate expires or a line of credit rate rises), your payoff date will shift significantly. A 5-point rate increase on this balance would add approximately [X] months and [Y] in interest."

---

### Insight card plan

| Card | Title | Trigger condition | Body copy direction |
|------|-------|------------------|---------------------|
| Health / Score | Debt Repayment Status | Always visible | Status label (Healthy / Watch / Caution) + debt-free date + total interest |
| Key metric card | Interest Cost Breakdown | Always visible | Monthly interest charge vs principal reduction; shows "how much of your payment goes to interest" |
| Opportunity card | Extra Payment Impact | Only when extra payment = 0 OR < $100/month | Show impact of adding $100/month: interest saved + months saved |
| Risk card | High Interest Rate | Only when rate > 25% | Note that at this rate, consolidation or balance transfer may reduce total cost |
| Next step | Always visible | Suggest Mortgage Qualifier if payoff < 18 months ("Once this debt is cleared, find out what mortgage you qualify for") |

**Risk signals:**

| Signal | Threshold | Status escalation |
|--------|-----------|------------------|
| Interest rate | > 30% | Watch → Caution |
| Payoff timeline | > 60 months | Watch → Caution |
| Total interest > 60% of balance | Computed | Caution (with framing: "worth reviewing whether a lower-rate option is available") |
| Payment-to-interest ratio | payment < 1.1× monthly interest | Caution — payment barely reduces principal |

**Opportunity signals:**

| Signal | Trigger | Suggested action |
|--------|---------|-----------------|
| Extra payment not used | extraPayment = 0 | Show what $100/month extra would save |
| High rate + positive credit context | rate > 20%, no consolidation note yet | Mention balance transfer / consolidation as a topic to explore with lender |

**Next-step guidance:**
"Once your debt is paid off, redirect those payments toward your savings goals. If homeownership is your next step, the [Mortgage Qualifier Calculator] can show you what you'd qualify for with this payment freed up."

**Tone / copy direction:**
This calculator serves users who are in financial stress or recovery. Tone must be calm, constructive, and forward-looking. Never frame current debt as a failure — frame every insight as "here is your path forward." Avoid: "You're in trouble", "This is dangerous", "You should have paid this off sooner." Use: "Here's how to get there faster", "One change that helps", "Your payoff is within reach."

---

## 7. Page Structure

| Block | Include? | Notes / deviations |
|-------|----------|--------------------|
| Banner (H1 + lede) | Yes | H1: "Debt Repayment Calculator" / lede: "See exactly when you'll be debt-free — and how much faster you can get there." |
| Input card | Yes | 3 required fields + 1 optional extra payment field |
| Results card (dark navy) | Yes | Primary: Debt-free date. Secondary: total interest, total paid, monthly interest charge |
| Visual support (payoff timeline chart) | Yes | Inline SVG balance-over-time chart. Two lines when extra payment > 0. Replaces Compare Scenarios cards. No donut chart (not meaningful for payoff data). |
| AI Analysis | Yes | Always visible — Qualifier-type. No CTA unlock. |
| Amortization schedule | No | Not included. Yearly schedule is less useful here than the comparison scenario. May add in future iteration. |
| How It Works | Yes | Formula section + assumptions (fixed rate, static balance) |
| FAQ | Yes | Min 5 items — see §8 |
| Disclaimer | Yes | Unconditional, always last |

**AI Analysis display mode:**
- [x] Always visible (Qualifier-type) — no CTA gate

**Responsive notes:**
- Input card: single column at 375px and 768px; 2-column at 1280px
- Results card: full-width at all breakpoints (primary result is large teal date)
- Payoff chart: full-width SVG, scales with container; minimum 280px height at 375px
- AI Analysis 3-card row: Health full-width at top on tablet, two below; all three side-by-side at 1280px
- Comparison columns (current vs accelerated): stack vertically at 375px, side by side at ≥ 640px

---

## 8. SEO / Content

**Primary keyword:** `debt repayment calculator`

**Supporting keywords:**
- `debt payoff calculator`
- `credit card payoff calculator`
- `loan repayment calculator`

**Page title (≤ 60 chars):**
`Debt Repayment Calculator | FinCalcSmart Pro`

**Meta description (≤ 150 chars):**
`See exactly when you'll be debt-free and how much interest you'll pay. Calculate how extra monthly payments slash your payoff timeline.`

**FAQ topics (min 5):**

1. How is my debt payoff date calculated?
2. Why does so much of my payment go to interest at first?
3. How much does an extra monthly payment actually save?
4. What is a good interest rate on personal debt?
5. Should I pay off debt before saving or investing?
6. What happens if I miss a payment?
7. How is Canadian personal loan interest calculated compared to mortgages?

**YMYL / trust notes:**
Debt is a sensitive financial topic. Calculators must use educational framing throughout — "a common approach is," "many financial advisors suggest," never "you must" or "you should." The AI Analysis Caution status for high-rate debt should mention "speaking with a lender or credit counselor" rather than prescribing a specific action. No claims about guaranteed savings or credit outcomes.

**Cross-links to add:**
- This page → Canadian Mortgage Calculator ("redirect freed payments to a mortgage")
- This page → US Mortgage Calculator (same)
- This page → Mortgage Qualifier Calculator ("find out what you qualify for once debt is cleared")
- Canadian Mortgage Calculator → this page (reverse: "carrying consumer debt? see how it affects your timeline")
- Mortgage Qualifier Calculator → this page (reverse: mention as a companion for debt-to-income improvement)

---

## 9. Default State Plan

Default inputs produce a meaningful, non-alarming result:

| Input | Default | Rationale |
|-------|---------|-----------|
| Balance | $5,000 | Common credit card balance — relatable, not extreme |
| Annual rate | 19.99% | Typical Canadian and US credit card rate |
| Monthly payment | $150 | Slightly above minimum for this balance (minimum would be ~$100) |
| Extra payment | $0 | Default off — extra payment field is the key product moment, revealed by user action |

**Default result:**
- Rate: 19.99% → monthly rate r = 0.001666
- n = -ln(1 - 0.016658 × 5,000 / 150) / ln(1.016658) ≈ 49 months
- Total interest ≈ $2,350
- Debt-free date ≈ June 2030

AI Analysis default status: **Watch** — 49 months is a meaningful payoff timeline and 19.99% is a high rate, but the result is not alarming. The opportunity card fires immediately (extra payment = 0), showing what $100/month extra saves.

Default state is never Caution on first load. ✓

---

## 10. QA Checklist

Complete after implementation. Do not declare done until every item is checked.

### Default state
- [ ] Page loads with debt-free date displayed — no blank, NaN, Infinity, or negative values
- [ ] AI Analysis shows `Watch` status on first load — never `Caution`
- [ ] Default values produce a representative, non-alarming result

### Edge cases
- [ ] Payment ≤ monthly interest → named error state, no result rendered, no JS errors
- [ ] Balance = 0 or blank → zero-state placeholder, no JS errors
- [ ] Rate = 0% → payoff = Math.ceil(balance / payment), interest = $0, result shown normally
- [ ] Rate > 50% → Caution status, note in AI Analysis
- [ ] Extra payment ≥ balance → 1-month payoff shown correctly
- [ ] Region switch mid-session → labels swap, formula unchanged, results valid
- [ ] All inputs zeroed → graceful zero-state, no JS errors

### Output correctness
- [ ] No NaN, Infinity, or negative monetary values displayed anywhere
- [ ] All monetary outputs use `fmtCAD` / `fmtCADx` or equivalent — never raw `.toFixed(2)`
- [ ] `Number.isFinite(n) && n >= 0` guard applied before every monetary render
- [ ] Debt-free date computed correctly using current month as start point

### Country and region
- [ ] CA mode: `CA$` prefix on all currency inputs, CAD labels
- [ ] US mode: `$` prefix on all currency inputs, USD labels
- [ ] Region toggle swaps all labels and prefixes correctly

### Visual and responsive
- [ ] Mobile 375px — no overflow, no blank states, all text readable
- [ ] Tablet 768px — grid transitions correct, AI Analysis 3-card row wraps correctly
- [ ] Desktop 1280px — full multi-column layout, AI Analysis gap ~32px
- [ ] Card style matches locked template: `border: '1px solid rgba(15,41,66,0.09)'`, `borderRadius: '20px'`
- [ ] Visual self-check: page opened alongside locked CA Mortgage Calculator V2 — spacing and typography match

### Content and compliance
- [ ] `<Disclaimer />` rendered unconditionally at the bottom
- [ ] AI Analysis panel has inner disclaimer strip (ShieldAlert + text)
- [ ] No AI Analysis insight overclaims or constitutes financial advice
- [ ] Min 5 FAQ items supplied to `CalculatorLayout`

### Registry and build
- [ ] `CALC_INDEX` entry added in `lib/calculators.ts` with all required fields
- [ ] Country-aware routing configured (`regionRoutes`, `searchLabel`, `navHidden` as needed)
- [ ] `tsc --noEmit` passes with zero errors

---

*Planning doc version: 2026-05-24*
