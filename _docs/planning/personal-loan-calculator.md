# Personal Loan Calculator — Planning Document

> Pre-build gate document. Satisfies `_docs/AGENT_MANUAL.md §0` and `_docs/CALCULATOR_TEMPLATE_V2.md §0 Step 0`.
> Do not start implementation until every section is complete.

---

## 1. Calculator Overview

**Calculator name:** Personal Loan Calculator

**URL slug:** `/personal-loan-calculator`

**Category:** Loans

**Target users:** Anyone considering an unsecured personal loan — home renovation, debt consolidation, vehicle purchase, emergency expense, or large one-time purchase. User is mid-decision: they have a loan amount and rate in mind and want to know what it will actually cost them monthly and in total before they sign.

**Country structure:**
- [x] Dual-region — single file with `useRegion()` toggle

**Separate pages justification:** Not applicable. Personal loan math is identical in Canada and the USA — no semi-annual compounding rule (that applies to mortgages only under the Canadian Interest Act), no regulatory stress test, no country-specific insurance product. Currency labels and rate defaults differ, but the formula is the same. One file with a region toggle is correct.

**Business value:** Personal loans are the second-most searched consumer finance topic after mortgages. This calculator fills the Loans category gap and provides a natural cross-link from the mortgage calculators (users who cannot qualify for a home equity loan often turn to personal loans). It stands alone as a useful tool and should link to the Debt Repayment Calculator as a natural next step (once you know your payment, you want a payoff plan).

**Related calculators:**
- Debt Repayment Calculator → link from AI Analysis "next step"
- Mortgage Qualifier Calculator → cross-link for users comparing loan options
- (Future) Debt Consolidation Calculator

---

## 2. User Intent

**What question is the user trying to answer?**
"What will my monthly payment be, and how much will this loan actually cost me in total?"

**What decision are they trying to make?**
Whether to take the loan at this amount, rate, and term — or whether to adjust any of those three variables to make the payment affordable or the total cost acceptable.

**What emotion or concern do they have?**
"Am I paying too much in interest? Is this rate reasonable? Can I afford the monthly payment without overextending myself?"

**Primary decision metric:**
Monthly payment (the number that determines whether the loan fits the budget). Total interest is the secondary gut-check.

---

## 3. Inputs

### Required inputs

| Field label | Input type | Default value | Valid range | Notes |
|-------------|-----------|---------------|-------------|-------|
| Loan Amount | Currency (NumericInput, prefix CA$ / $) | $10,000 | $500 – $100,000 | |
| Annual Interest Rate | Percent (NumericInput, suffix %) | 8.5% | 1% – 49.9% | Cap at 49.9% (Canadian criminal interest rate limit); US has no hard cap but 50% is a safe UI ceiling |
| Loan Term | Pill selector (years) | 3 years | 1 / 2 / 3 / 4 / 5 years | Five pills; not a free-entry field |

### Optional inputs

| Field label | Input type | Default value | Valid range | Notes |
|-------------|-----------|---------------|-------------|-------|
| Annual Income | Currency (NumericInput, prefix CA$ / $) | blank | $1 – $999,999 | Used only for AI Analysis DTI signal; clearly labelled "Optional — for affordability analysis" |

### Country-specific fields

| Field | Canada | USA |
|-------|--------|-----|
| Currency prefix | CA$ | $ |
| Currency label | CAD | USD |
| Rate context (AI copy) | "Prime-based personal loans typically range 8–20% APR" | "Personal loan rates typically range 7–25% APR" |
| Income label | Gross Annual Income (CAD) | Gross Annual Income (USD) |

No Canada-specific formula differences. No CMHC, no stress test, no semi-annual compounding for personal loans.

---

## 4. Outputs

**Primary result:**
Monthly Payment — `$315 / month` — large teal number in Results card

**Secondary results:**

| Output label | Description | Format |
|-------------|-------------|--------|
| Total Interest | Total interest paid over the full term | fmtCAD / fmtUSD |
| Total Cost | Principal + total interest | fmtCAD / fmtUSD |
| Loan Term Summary | "X payments of $Y" | plain text |
| Interest-to-Principal Ratio | Total interest as % of loan amount | `XX.X%` |

**Comparison / scenario outputs:**
Term comparison panel (right visual card): show 2yr, 3yr, and 5yr scenarios at the same rate and amount. Highlight the selected term. Shows monthly payment and total interest for each. Savings line: "Choosing 2 years over 5 years saves $X in interest."

**Visual chart outputs:**
- Left card: DonutChart — Principal vs Total Interest (out of Total Cost). Answers: "How much of what I pay is actually interest?"
- Right card: Term comparison cards — 2yr / 3yr / 5yr scenarios (same pattern as mortgage Compare Scenarios block)

---

## 5. Financial Logic

**Primary formula:**

```
monthlyPayment = L * r / (1 - (1 + r)^-n)

where:
  L = loan amount (principal)
  r = annualRate / 12 / 100   (simple monthly rate — same for CA and US)
  n = loanTermYears * 12      (total number of monthly payments)

totalInterest = (monthlyPayment * n) - L
totalCost     = monthlyPayment * n
interestRatio = totalInterest / L * 100   (as a percentage)
```

**Rate = 0% special case:**
```
monthlyPayment = L / n   (pure principal division, no interest)
totalInterest  = 0
```

**Canada-specific rules:**
None. Personal loans in Canada do not use semi-annual compounding. The Canadian Interest Act semi-annual compounding requirement applies only to mortgages. Personal loan APR is stated and calculated as simple monthly (annualRate / 12). The 49.9% rate cap reflects Canada's criminal interest rate ceiling (the effective annual rate must not exceed 60%; a nominal rate of 49.9% with monthly compounding stays below this ceiling).

**USA-specific rules:**
None structural. APR regulations vary by state but the formula is the same. Rate range in AI copy differs from Canada.

**Assumptions:**
- Fixed interest rate for the full term (no variable rate scenario).
- No origination fee, prepayment penalty, or insurance premium factored into the monthly payment calculation (these vary by lender and are outside the scope of this calculator).
- Payments are monthly and equal (standard amortising loan).

**Limits and thresholds:**

| Variable | Minimum | Maximum | Notes |
|----------|---------|---------|-------|
| Loan Amount | $500 | $100,000 | Most unsecured personal loans are under $100K |
| Annual Rate | 1% | 49.9% | 49.9% CA ceiling; 50% is safe US ceiling — use 49.9% for both |
| Loan Term | 1 year | 5 years | Pill selector; personal loans beyond 5 years are uncommon unsecured |
| Annual Income | $1 | $999,999 | Optional field; no lower cap needed (blank = DTI not shown) |

**Edge cases:**

| Condition | Expected behavior |
|-----------|------------------|
| All inputs zero / blank | Show zero-state card: "$0 / month" with a prompt to enter loan details. No NaN, no error. |
| Loan amount = $0 | monthlyPayment = $0, totalInterest = $0. Zero-state UI. |
| Rate = 0% | Use L/n formula. Show "$0 total interest" in results. AI Analysis: "Interest-free loan — verify terms with your lender." |
| Rate at maximum (49.9%) | Valid calculation. AI Analysis escalates to Caution. Results card shows warning color on total interest line. |
| Income field blank | DTI rows hidden from AI Analysis. All other insights still show. Never show blank AI Analysis card. |
| Region switch mid-session | Currency prefix and label swap immediately. All numbers recalculate. Rate and loan amount values are preserved (they are currency-neutral input numbers). |
| Very large loan ($100,000) at short term (1 year) | Valid — large monthly payment. No error. AI Analysis may flag high monthly burden if income is provided. |
| Division-by-zero | n is always ≥ 12 (minimum 1-year term via pill selector). r=0 is handled by the special case above. No division-by-zero is reachable. |

**Invalid input behavior:**
If the loan amount field is cleared or set to zero, show a zero-state results card with placeholder dashes for secondary stats and a prompt: "Enter a loan amount to see your payment." Do not render NaN or a blank card.

---

## 6. AI Analysis Plan

> Reference: `_docs/FINANCIAL_INTELLIGENCE_FRAMEWORK.md §3–§4`

### Intelligence Model

| Dimension | Value |
|-----------|-------|
| User intent | What will this loan cost monthly and in total? |
| Key inputs | Loan amount, interest rate |
| Key outputs | Monthly payment, total interest |
| Primary decision metric | Monthly payment vs. budget; total interest vs. loan amount |
| Risk signals | Rate > 15%, interest ratio > 30%, DTI > 15% (if income provided) |
| Opportunity signals | Rate > 12% (competitive rate available), shorter term saves meaningful interest |
| Emotional concern | "Am I paying too much? Is this rate fair?" |
| Default state goal | $10K at 8.5% over 3 years → ~$315/month, ~$1,340 total interest → Healthy status on load |
| Edge-case behavior | Rate = 0 → "Interest-free — verify terms"; rate > 30% → Caution escalation |

### Five-question answers

**1. What does this result mean?**
"You will pay [monthlyPayment] every month for [n] months. By the end of the term, [totalCost] will have left your account — [totalInterest] of that is interest, not principal."

**2. Is the user in a good, borderline, or risky position?**

| Status | Condition |
|--------|-----------|
| Healthy | Rate ≤ 12% AND interestRatio ≤ 20% AND (income blank OR DTI ≤ 15%) |
| Watch | Rate 12–15% OR interestRatio 20–35% OR (income provided AND DTI 15–20%) |
| Caution | Rate > 15% OR interestRatio > 35% OR (income provided AND DTI > 20%) |

Default state ($10K, 8.5%, 3yr): rate = 8.5% ✓, interestRatio ≈ 13.4% ✓ → **Healthy** on first load. ✓

**3. What is the main driver?**
Interest rate is the primary driver of total cost. Term length is the primary driver of monthly payment. Identify which of the two is closest to a threshold and surface that one.

**4. What can the user improve?**
- If rate > 12%: "Comparing lenders could reduce your rate. Even 1% less on this loan saves approximately $X."
- If term > 3yr: "Choosing a 3-year term instead of 5 years saves $X in interest and pays off [Y] months sooner."
- If income provided and DTI > 15%: "Reducing the loan amount by $X brings your debt ratio below 15% of income."

**5. What should they watch out for?**
- Rate > 15%: total interest cost exceeds 25%+ of principal — worth shopping around.
- Origination fees (not in this calculator): "Ask your lender for the APR including all fees, which may be higher than the stated rate."

---

### AI Analysis Card Layout

**CTA helper line (above CTA in Results card):**
"Find out if your rate is competitive and how much you could save by adjusting your term."

**CTA label:** "Analyze My Loan Cost"

---

**Top left card — white — Loan Cost Score (SVG arc gauge):**
- Score 0–100 derived from: rate competitiveness (40%), interest-to-principal ratio (40%), DTI if available (20%)
- Score bands: 80–100 Excellent, 60–79 Good, 40–59 Fair, 0–39 Poor
- Teal-to-amber-to-red gradient arc (same as mortgage health score pattern)
- Sub-message examples:
  - Excellent: "Your rate is competitive and the total interest cost is low."
  - Good: "Solid loan terms. Small adjustments could reduce your total cost."
  - Fair: "Your interest cost is above average. Consider a shorter term or better rate."
  - Poor: "High interest cost. Comparing lenders before signing could save hundreds."

**Top right card — dark navy — Key KPIs:**
- Monthly Payment: [fmtCAD(monthlyPayment)]
- Total Interest: [fmtCAD(totalInterest)] ([interestRatio.toFixed(1)]% of principal)
- Payoff in: [n] payments ([loanTermYears] years)
- Monthly Income %: [dtiPct]% of gross income ← only shown if income provided; show "— Add income above" if blank
- One-sentence explanation below: "Every dollar borrowed at [rate]% for [term] years costs [costPerDollar] in interest."

---

**Three insight cards (below top row):**

| # | Title | Left border color | Trigger | Content direction |
|---|-------|------------------|---------|-------------------|
| 1 | Rate Check | Red (Caution) / Amber (Watch) / Green (Healthy) | Always visible | Compare user's rate to typical range for their region. "Your rate of X% is [above/within/below] the typical range for good-credit borrowers ([CA: 8–15%] / [US: 7–20%]). [If above: Comparing 2–3 lenders before signing could reduce your rate.]" |
| 2 | Term Optimisation | Blue | Always visible | Show interest saved by choosing a shorter term. "Shortening to [shorter term] costs [higherPayment]/month but saves [interestSaved] in interest over the life of the loan." Only show shorter term that is a realistic step (e.g., if 5yr selected → show 3yr; if 3yr selected → show 2yr). If already at 1yr, show "You've chosen the shortest term available — minimal interest paid." |
| 3 | Affordability Impact | Amber | Always visible (content varies) | If income provided: "This payment represents [dtiPct]% of your gross monthly income. [Status copy by threshold]." If income blank: "Add your income above to see how this loan fits your budget and get a personalised affordability score." |

**Risk signals:**

| Signal | Threshold | Status escalation |
|--------|-----------|------------------|
| Annual rate | > 15% | Watch → Caution |
| Annual rate | > 25% | Caution (strong) |
| Interest-to-principal ratio | > 35% | Watch |
| Interest-to-principal ratio | > 50% | Caution |
| Monthly payment / monthly income | > 15% | Watch |
| Monthly payment / monthly income | > 20% | Caution |

**Opportunity signals:**

| Signal | Trigger | Suggested action |
|--------|---------|-----------------|
| Rate appears high | rate > 12% (CA) or > 12% (US) | "Comparing lenders may find a better rate" |
| Long term selected | term ≥ 4yr | "Shorter term saves $X" (calculate and show exact figure) |
| Income provided, DTI borderline | DTI 13–20% | "Reducing loan by $X brings ratio to 15%" |

**Next-step guidance:**
"Ready to plan your payoff? Use the [Debt Repayment Calculator](/debt-repayment-calculator) to model extra payments and get a full payoff timeline."

**Tone / copy direction:**
Calm and practical. This is a common, low-drama purchase — not a crisis. Avoid catastrophising high rates; frame them as "worth shopping around" not "you're in trouble." Never imply approval or denial. No "you should definitely…" language. Rate guidance uses regional ranges as educational context only.

---

## 7. Page Structure

| Block | Include? | Notes |
|-------|----------|-------|
| Banner (H1 + lede) | Yes | H1: "Personal Loan Calculator" — Lede: "Calculate your monthly payment and true cost of borrowing in seconds." |
| Input card | Yes | Three required fields + one optional income field with "Optional" badge |
| Results card (dark navy) | Yes | Monthly payment (primary), Total Interest, Total Cost, Term Summary. Helper line + CTA above fold. |
| Visual support (two cards) | Yes | Left: Principal vs Interest donut. Right: Term comparison (2yr / 3yr / 5yr). |
| AI Analysis | Yes | Always visible. CTA scrolls to it. Label: "Analyze My Loan Cost". |
| Amortization schedule | No | Not a mortgage-type calculator. Omit. |
| How It Works | Yes | Formula section: standard amortising loan formula, note on fixed vs variable rate, note on APR vs stated rate |
| FAQ | Yes | Min 5 items (see §8) |
| Disclaimer | Yes | Unconditional, always last |

**AI Analysis display mode:**
- [x] Always visible; CTA button scrolls to section

**Responsive notes:**
Standard V2 responsive behavior. Term pill selector wraps to two rows on 375px (1yr / 2yr / 3yr on row one, 4yr / 5yr on row two) — plan for this in CSS. Income field is full-width below the required inputs row. Visual support cards stack on mobile (donut above, term comparison below).

---

## 8. SEO / Content

**Primary keyword:** personal loan calculator

**Supporting keywords:**
- loan payment calculator
- personal loan interest calculator
- monthly loan payment calculator Canada

**Page title (≤ 60 chars):**
`Personal Loan Calculator — Monthly Payment | FinCalcSmart Pro`

**Meta description (≤ 150 chars):**
`Calculate your monthly personal loan payment and total interest cost. Free for Canada and USA. No sign-up required.`

**FAQ topics (min 5):**

1. How is my personal loan monthly payment calculated?
2. What is a good interest rate for a personal loan in Canada / the USA?
3. Is it better to choose a shorter or longer loan term?
4. What is the difference between APR and interest rate on a personal loan?
5. Can I pay off a personal loan early without penalty?
6. How does a personal loan affect my debt-to-income ratio?
7. What is the maximum personal loan amount I can borrow?

**YMYL / trust notes:**
This is a YMYL page (financial decision support). All rate ranges are cited as "typical" ranges, not guarantees. The calculator does not factor in origination fees, prepayment penalties, or credit score adjustments — this must be noted in How It Works and the Disclaimer. No approval or denial language anywhere.

**Cross-links to add:**
- Debt Repayment Calculator (from AI Analysis next step and How It Works)
- Mortgage Qualifier Calculator (from How It Works: "If you're comparing loan options, see if you qualify for a home equity loan")

---

## 9. CALC_INDEX Update Plan

```ts
// lib/calculators.ts — add to Loans category

{
  label: 'Personal Loan Calculator',
  href: '/personal-loan-calculator',
  description: 'Calculate your monthly payment and total interest cost for any personal loan.',
  category: 'Loans',
  region: 'both',
  icon: CreditCard,         // lucide-react
  iconColor: '#1DB584',
  iconBg: 'rgba(29,181,132,0.10)',
  available: true,
  // No regionRoutes needed — single URL, dual-region toggle
  searchLabel: 'Personal Loan Calculator',
}
```

**Nav notes:**
- No `navHidden` duplicate needed (single file, one URL).
- No `regionRoutes` needed.
- Add `'Personal Loan Calculator': 'Personal Loan'` to the `NAV_LABEL` map in `SiteHeader.tsx` if the mega-menu label needs shortening.
- Add to footer `FOOTER_LINKS` under the Loans section.

---

## 10. QA Checklist

Complete after implementation. Do not declare done until every item is checked.

### Default state
- [ ] Page loads: $10,000 / 8.5% / 3 years → ~$315/month, ~$1,340 total interest — no blank, NaN, or negative values
- [ ] AI Analysis: Loan Cost Score shows `Healthy` on first load (rate 8.5%, interestRatio ~13.4%)
- [ ] CTA helper line and "Analyze My Loan Cost" button visible in Results card; CTA scrolls to AI Analysis (which is always visible)

### Edge cases
- [ ] Loan amount = $0 → zero-state card with prompt, no NaN
- [ ] Rate = 0% → monthlyPayment = L/n, totalInterest = $0, AI Analysis note about interest-free loan
- [ ] Rate = 49.9% → valid calculation, Caution status, no crash
- [ ] Income field blank → DTI rows hidden from AI Analysis; all other insight cards still render
- [ ] Region switch mid-session → currency prefix swaps, numbers preserved

### Output correctness
- [ ] No NaN, Infinity, or negative monetary values displayed
- [ ] All monetary outputs use fmtCAD / fmtUSD formatters
- [ ] `Number.isFinite(n) && n >= 0` guard before every monetary render

### Country and region
- [ ] CA mode: CA$ prefix, CAD label, CA rate context in AI copy
- [ ] US mode: $ prefix, USD label, US rate context in AI copy
- [ ] Region toggle swaps all labels and prefixes correctly; formula unchanged

### Visual and responsive
- [ ] Mobile 375px: term pill row wraps cleanly, no overflow
- [ ] Tablet 768px: visuals stack correctly, AI Analysis top row wraps
- [ ] Desktop 1280px: full layout, AI Analysis gap ~32px
- [ ] Donut chart shows Principal vs Interest slices correctly for all term/rate combinations
- [ ] Term comparison right card highlights the selected term

### Content and compliance
- [ ] `<Disclaimer />` unconditional at bottom
- [ ] AI Analysis inner disclaimer strip present
- [ ] Rate context copy uses "typically" framing — no guarantees
- [ ] Note about origination fees / APR in How It Works
- [ ] Min 5 FAQ items supplied

### Registry and build
- [ ] `CALC_INDEX` entry added with all required fields (`label`, `href`, `description`, `category`, `region`, `icon`, `iconColor`, `iconBg`, `available: true`)
- [ ] `NAV_LABEL` entry added in `SiteHeader.tsx` if needed
- [ ] Footer `FOOTER_LINKS` updated under Loans section
- [ ] `tsc --noEmit` passes with zero errors

---

*Created: 2026-05-26 — template version 2026-05-24*
