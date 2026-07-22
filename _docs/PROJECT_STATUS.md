# FinCalc Smart V2 — Project Status & Roadmap

> Last updated: 2026-07-21 — Income Tax Calculator V1 validated and locked (source methodology fully reverse-engineered and independently validated for both US progressive federal tax and Canada progressive federal tax, with flat state/local and provincial approximations confirmed as documented scope; 2025 Canadian federal brackets updated to official CRA values, first federal bracket corrected to 14.5% (2025 blended rate under Bill C-4) with the BPA non-refundable credit conversion rate corrected to match at 14.5%; 2025 US standard deductions updated to Single $15,750 / Married Filing Jointly $31,500; a marginal-rate boundary audit confirmed the Canada $200,000 scenario's correct federal marginal rate is 29% — not 26% as an earlier report had mis-transcribed, a report-writing error with no production code defect found; finite-input guard added against non-finite numeric input; PDF status/clarity label alignment brought into parity with the UI; `scripts/generateSamplePDFs.ts` sample data updated to the corrected 2025 statutory values; UI/PDF/AI-Insight parity, responsive QA, TypeScript, and production-build checks all passed). See "Income Tax Calculator V1 — Validation & Lock" below.
>
> Last updated: 2026-07-21 — Salary Calculator V1 re-validated and locked (source methodology reverse-engineered and confirmed; salary normalization for Annual/Monthly/Biweekly/Weekly/Hourly inputs and Monthly/Semi-monthly/Biweekly/Weekly/Daily/Hourly output conversions independently re-verified; flat user-entered deduction-rate methodology and 0%–99% clamp confirmed; gross/deduction/take-home reconciliation, Pay Clarity Score/label logic, and region/currency handling validated; a Weekly pay-frequency period-count inconsistency corrected — Weekly period count now uses the user-entered `weeksPerYear` instead of a hardcoded `52`, with the Hero, Pay Conversion table, AI Insight copy, and PDF all brought into agreement, fractional `weeksPerYear` values supported without forced rounding, and default 52-week behavior unchanged; UI/PDF parity, responsive, TypeScript, and production-build QA all passed). See "Salary Calculator V1 — Validation & Lock" below.
>
> Last updated: 2026-07-20 — Savings Goal Calculator V1 re-validated and locked (growth methodology, end-of-month contribution timing, goal projection, required-monthly reverse-PMT formula, and goal-timeline methodology all independently re-verified with zero discrepancies; Infinity/NaN input guard verified; PDF Goal Progress % cap corrected from 200% to 100% to match the UI; donut chart and readiness gauge exact-goal boundary contradiction fixed by switching their branch selectors from a strict `surplus > 0` check to the canonical `leverState === 'on-track'`; readiness score changed from rounding to flooring raw progress percentage, preventing a premature "100/Excellent" score from displaying alongside a "Nearly There" status for progress in `[99.5, 100)`; AI Insight branches validated across all 9 named scenarios; responsive, PDF-parity, TypeScript, and production-build QA all passed). See "Savings Goal Calculator V1 — Validation & Lock" below.
>
> Last updated: 2026-07-20 — RRSP Savings Calculator V1 boundary/overflow follow-up validated and locked (`parseAmt()` overflow guard added — extreme finite inputs like `1e308` now clamp locally at `Number.MAX_SAFE_INTEGER` instead of reaching `Infinity`; "Fully Used" room-usage badge boundary corrected from rounded-percentage (`Math.round(roomUsedPct) >= 100`) to actual remaining-room state (`roomRemaining <= 0`), preventing 99.50%–99.99% usage with positive room remaining from being mislabeled as fully used; growth methodology, room-check formula, and tax-reduction estimate confirmed unchanged). See "RRSP Savings Calculator V1 — Validation & Lock" below.
>
> Last updated: 2026-07-20 — TFSA Contribution & Growth Calculator V1 post-lock correction: "Fully Used" room-usage badge boundary corrected from rounded-percentage to actual remaining-room state (`roomRemaining <= 0`), matching the identical fix applied to the RRSP Savings Calculator, preventing 99.50%–99.99% usage with positive room remaining from being mislabeled as fully used; no TFSA financial outputs or methodology changed. See "RRSP Savings Calculator V1 — Validation & Lock" below.
>
> Last updated: 2026-07-20 — TFSA Contribution & Growth Calculator V1 re-validated and re-locked (Infinity/NaN input guard added using `Number.isFinite()` to the four unbounded numeric fields — pasting `"Infinity"` or `"1e500"` previously produced a literal NaN in the Tax-Free Growth Score gauge; exactly-100%-room-usage status badge standardized to "Fully Used" across all three display sites, which previously showed "Nearly Full" in two locations while a third showed "Fully Used" for the identical state; growth methodology, effective monthly rate, compound-frequency conversion, end-of-month contribution timing, first-year TFSA room methodology, current-balance-excluded-from-room-usage handling, and CRA-scope copy all independently re-verified and unchanged; Growth Score and Room Status confirmed to be independent metrics — documented as accepted behavior, not a bug). See "TFSA Contribution & Growth Calculator V1 — Validation & Lock" below.
>
> Last updated: 2026-07-20 — Lump Sum vs Monthly Investment Calculator V1 re-validated and re-locked (NaN/Infinity display cascade fixed with finite-number guarding on the Total Amount input, "How It Works" contribution-timing copy corrected to describe actual end-of-month ordinary-annuity timing, PDF significance-threshold wording corrected from 5% to 0.5%, PDF advantage-color mapping aligned with the UI's Minimal/Moderate/Strong states, and an unsourced historical lump-sum-outperformance claim replaced with wording grounded in the calculator's own fixed-rate methodology; lump-sum and monthly-investment formulas, comparison end date, equal-total-capital handling, and compound-frequency conversion all independently re-verified and unchanged). See "Lump Sum vs Monthly Investment Calculator V1 — Validation & Lock" below.
>
> Last updated: 2026-07-19 — FIRE Calculator V1 re-validated and re-locked (hero "Projected Portfolio" label no longer implies a FIRE date is reached in the not-reachable state — now reads "Projected Portfolio (20 Years)"; Savings Pace contributions-total copy fixed to exclude current assets from the contributions figure, removing a double-count; the shared PDF adapter's composition bar and "Total Contributions" figures brought into parity with the UI, basis switched from FIRE target to projected value at FIRE date. Follow-up round also fully quantified the five-years-sooner lever's year-rounding behavior — bounded at ≤11 months, always conservative, left documented not fixed per explicit instruction; financial formulas, binary search, and score thresholds unchanged). See "FIRE Calculator V1 — Follow-up Validation & Fix Round" below.
>
> Last updated: 2026-07-19 — Retirement Withdrawal Calculator V1 validated, methodology-fixed, and locked (End-of-Year final-withdrawal overcount fixed, positive Target Ending Balance scenarios now surface a distinct Target Balance Reached state, zero-withdrawal-horizon scenarios now surface a No Withdrawal Phase Simulated state, the numeric Sustainability Score is no longer displayed as meaningful in either special state — gauge/AI Insight/PDF now show "Goal Met" / "Not Rated" — and a static FAQ inflation-compounding example corrected; normal sustainability score thresholds and withdrawal/inflation methodology unchanged). See "Retirement Withdrawal Calculator V1 — Validation, Methodology Fixes & Lock" below.
>
> Last updated: 2026-07-19 — Retirement Savings Calculator V1 re-validated and re-locked (FAQ vs. "How It Works" Assumptions-list copy parity fixed — 2 missing bullets on future contribution increases and tax-advantaged account room checking added to match the FAQ; financial logic unchanged). See "Retirement Savings Calculator V1 — Follow-up Validation & Fix Round" below.
>
> Last updated: 2026-07-19 — RRSP Savings Calculator V1 re-validated and re-locked (stale 2025 RRSP figures updated to 2026 across the calculator and its FAQ copy, fractional sub-$1 over-room excess no longer misleadingly displays as `$0`, and the shared PDF adapter's tax-reduction estimate now shows neutral "Not estimated" wording instead of a misleading `$0` when marginal tax rate or available room is 0, with TFSA PDF output confirmed unaffected; financial logic unchanged). See "RRSP Savings Calculator V1 — Follow-up Validation & Fix Round" below.
>
> Last updated: 2026-07-19 — TFSA Contribution & Growth Calculator V1 re-validated and re-locked (growthPct display mislabeling fixed in `TFSACalculator.tsx`, PDF-only Rule of 72 wording in the shared `canadaRegisteredAdapter.ts` now falls back to neutral language at 0% and near-0% returns instead of showing a misleading multi-hundred-year doubling claim, with RRSP PDF output confirmed unaffected; financial logic unchanged). See "TFSA Contribution & Growth Calculator V1 — Follow-up Validation & Fix Round" below.
>
> Last updated: 2026-07-19 — Emergency Fund Calculator V1 re-validated and re-locked (PDF/UI month-formatting parity fix, PDF readiness-accent color parity fix, Smart Optimization "$X sooner" self-contradiction fixed, PDF at-target/surplus key-driver copy fixed, mobile Savings Timeline chart legend/stat-row overflow fixed at 375px; financial logic unchanged). See "Emergency Fund Calculator V1 — Follow-up Validation & Fix Round" below.
>
> Last updated: 2026-07-19 — Debt Repayment Calculator V1 re-validated and re-locked (PDF fee-methodology copy fix, Annual Rate validation caption + 99.9% clamp, chart Y-axis k/M-notation fix at multi-million scale, Smart Opportunity "$0 savings" self-contradiction fixed at 0% interest; financial logic unchanged). See "Debt Repayment Calculator V1 — Follow-up Validation & Fix Round" below.
>
> Last updated: 2026-07-18 — Personal Loan Calculator V1 re-validated and re-locked (Annual Rate validation caption, chart Y-axis k/M-notation fix at multi-million scale, mobile chart legend fix, Smart Optimization "$0 savings" self-contradiction fixed at 0% interest, Loan Cost Score explanation copy corrected; financial logic unchanged). See "Personal Loan Calculator V1 — Follow-up Validation & Fix Round" below.
>
> Last updated: 2026-07-18 — Investment Fees Calculator V1 re-validated and re-locked (Portfolio Breakdown % reconciliation, mobile chart legend fix, rate/fee validation captions + comparison-fee badge clamp fix, PDF adapter composition-percentage parity fix; financial logic unchanged). See "Investment Fees Calculator V1 — Follow-up Validation & Fix Round" below.
>
> Last updated: 2026-07-18 — Car Loan Calculator V1 re-validated and re-locked (rate validation caption, mobile chart legend fix, down-payment-exceeds-price caption; financial logic unchanged). See "Car Loan Calculator V1 — Follow-up Validation & Fix Round" below.
>
> Last updated: 2026-07-18 — Compound Interest Calculator V1 re-validated and re-locked (rate validation caption, mobile chart legend fix, PDF accent color standardization, large-number guard-rail clamps; financial logic unchanged). See "Compound Interest Calculator V1 — QA Record" below.
>
> Last updated: 2026-07-16 — Post-Launch Platform Foundation (July 2026) recorded: XML sitemap, robots.txt, canonical domain redirect, homepage structured data foundation, mobile navigation update, Continue Planning V1, Project Vision Alignment, and Platform Documentation. Master Roadmap V2 is maintained externally by Andrew and governs current priorities and sequencing; this file remains the durable in-repository record of completed and locked work. See "Post-Launch Platform Foundation — July 2026" below.

---

## Locked (do not touch without approval)

| Calculator | Status | File | Notes |
|------------|--------|------|-------|
| Canadian Mortgage Calculator V2 | ✅ LOCKED | `app/canadian-mortgage-calculator/` | Master V2 template reference; `cardStyle` const is the canonical card spec. Intelligence Patch A locked 2026-05-28 — Health Score two-mode scoring + Smart Optimization input-aware levers. See QA record below. |
| US Mortgage Calculator V2 | ✅ LOCKED | `app/us-mortgage-calculator/` | Mirrors CA template exactly. Intelligence Patch A locked 2026-05-28 — Health Score two-mode scoring + Smart Optimization input-aware levers. See QA record below. |
| Mortgage Qualifier Calculator V2 | ✅ LOCKED | `app/mortgage-qualifier-calculator/` | Dual-region; B-20 + 28/36; AI Analysis is primary product section — always visible. Product-logic patch locked 2026-05-28 — see QA record below. |
| Homepage V2 | ✅ LOCKED | `app/page.tsx` | Visual reference for marketing sections only — not a code reference for calculators |
| Mobile Navigation V2 | ✅ Phase 1 LOCKED | `components/layout/SiteHeader.tsx` | White/glass drawer, flat category list, pinned CTA, body scroll lock. Phase 2 (animation, focus trap) not started. |
| Search Functionality Phase 1 | ✅ LOCKED | `components/ui/CalcSearch.tsx` · `lib/calculators.ts` · `app/calculators/` | CalcSearch (hero / header / drawer variants); CALC_INDEX as single metadata source; `/calculators?q=` and `/calculators?category=` URL filtering active. Bug fixes applied 2026-05-25: `onNavigate` callback prop (mobile drawer now closes after navigation); header dropdown width `w-80 right-0` (320px right-aligned, was overflowing). |
| Debt Repayment Calculator V1 | ✅ LOCKED | `app/debt-repayment-calculator/` | Single-debt, dual-region via `useRegion()`; Annual Fees input (display-only — does not affect the payoff simulation); Payoff Timeline (SVG line chart) + Debt Breakdown (SVG bar chart); AI Debt Analysis always visible; `dps-gauge` 160px/220px responsive arc gauge; CTA scroll uses `getBoundingClientRect`-based offset; CALC_INDEX `available: true`. **Re-validated 2026-07-19** (see follow-up QA record): PDF fee-methodology copy corrected to state fees do not affect the payoff timeline, Annual Rate inline validation caption + clamp (0–99.9%), chart Y-axis k/M-notation fix at multi-million-dollar balances, and Smart Opportunity "$0 savings" self-contradiction fixed at 0% interest (both the results-card CTA and the AI card now gate on actual savings) — financial formulas unchanged. Future V2: multi-debt, debt names, avalanche/snowball strategy. |
| Personal Loan Calculator V1 | ✅ LOCKED | `app/personal-loan-calculator/` | Single dual-region page via `useRegion()`; inputs: loan amount, annual rate, loan term (1–5yr pills), optional annual income; CTA: "Review Smart Loan Insights"; Payment Breakdown donut; Term Comparison stacked bar chart (5-bar, teal=principal, amber=interest); Loan Analysis card (Borrowing Cost arc gauge + Affordability arc gauge); Smart Optimization Found card (next-shorter term, no generic extra-payment); Rate Check + Term Optimization + Affordability insight cards; Base QA 24/24 · Extended QA 16/16 · tsc clean; CALC_INDEX `available: true`. **Re-validated 2026-07-18** (see follow-up QA record): Annual Rate inline validation caption (0–49.9%), chart Y-axis k/M-notation fix at multi-million scale, mobile Term Comparison chart legend clipping at 375px fixed, Smart Optimization "$0 savings" self-contradiction fixed at 0% interest, and Loan Cost Score explanation copy corrected to match the actual 2-dimension/50-50 formula — financial formulas unchanged. Future V2: origination fee / APR-adjusted cost, saved scenarios, lender/rate comparison, optional extra payment modeling. |
| Car Loan Calculator V1 | ✅ LOCKED | `app/car-loan-calculator/` | Single dual-region page via `useRegion()`; built from Personal Loan template; same monthly-compounding amortization math for CA and US (no semi-annual compounding); inputs: vehicle price, down payment, annual rate, loan term pills (24/36/48/60/72/84 months, default 60), optional annual income; derived: amount financed = vehicle price − down payment (clamped ≥ 0); results card: monthly payment, total interest, total loan payments, amount financed; Payment Breakdown donut; Term Comparison 6-bar stacked chart; Borrowing Cost gauge + Affordability gauge; Smart Optimization card uses Down Payment Impact lever (suggests max($1,000, 5% of vehicle price) increase; shows strong equity state when down ≥ 20%); Rate Check + Term Optimization + Affordability insight cards; QA 25/25 · tsc clean; CALC_INDEX `available: true`. **Re-validated 2026-07-18** (see follow-up QA record): Annual Rate inline validation caption (0–49.9%, mirrors Retirement/Compound Interest pattern), mobile Term Comparison chart legend clipping at 375px fixed, and new down-payment-exceeds-vehicle-price caption (region-aware `$0`/`CA$0`) — financial formulas unchanged. Future V2: trade-in value, amount owed on trade-in, sales tax, dealer/registration fees, out-the-door price, negative equity warning, insurance cost, lease vs buy. |
| Emergency Fund Calculator V1 | ✅ LOCKED | `app/emergency-fund-calculator/` | Single dual-region page via `useRegion()`; built from Compound Interest Calculator structure; educational estimate — no bank, account, product, or investment recommendations; inputs: monthly essential expenses, current emergency savings, monthly savings contribution, Income Stability pills (Stable/Moderate/Variable, default Moderate), Target Coverage pills (3/6/9/12mo, default 6mo); math: targetAmount = targetMonths × monthlyExpenses, currentCoverageMonths = currentSavings / monthlyExpenses, gap/surplus, monthsToTarget = gap / contribution, suggestedMonthly = gap / 12; results card: current coverage months (hero), fund target, savings gap/surplus, months to target, recommended coverage from stability; Emergency Fund Coverage donut (below-target: Current Savings + Remaining Gap; surplus: Fund Target + Surplus); Savings Timeline 5-bar chart (3/6/12/18/24mo projections, first-to-target bar highlighted, amber target dashed line); Emergency Readiness Score gauge; Target Progress gauge; Smart Optimization three states: below-target + contribution (months to target), below-target + no contribution (gap + suggested monthly), at/above-target (surplus / Goal Achieved); Coverage Check + Risk Adjustment + Savings Plan insight cards; Income Stability drives recommended coverage context only — does not override user-selected Target Coverage; Risk Adjustment insight flags mismatch between selection and income type; fmtMonths helper formats as "X mo" or "X yr Y mo"; teal/green primary accent; amber/red for caution/gap states only; QA 40/40 · tsc clean · next build clean; CALC_INDEX `available: true`. **Re-validated 2026-07-19** (see follow-up QA record): PDF `fmtMonths` rounding aligned with the UI's ceiling-based algorithm (was previously round-remainder based, causing UI/PDF display mismatches), PDF `readinessAccent` color now derives from the canonical `readinessStatus` field instead of independent thresholds, Smart Optimization "$100/month sooner" copy fixed to derive its delta from the same rounded values shown to the user (was self-contradictory), PDF key-driver copy fixed for at-target/surplus scenarios (previously read "closes the $0 gap in approximately 0 mo"), and mobile Savings Timeline chart stat-row/legend overflow at 375px fixed via `flex-wrap` — financial formulas unchanged. Future V2: interest modeling on savings, debt trade-off analysis, insurance modifier, joint/individual household view, inflation adjustment, expense category breakdown, regional cost-of-living; detailed savings schedule table deferred to cross-calculator Detailed Schedules Patch V2. |
| Net Worth Calculator V1 | ✅ LOCKED | `app/net-worth-calculator/` | Single dual-region page via `useRegion()`; built from ROI Calculator structure; educational estimate only — no investment, product, bank, account, real estate, or debt-product recommendations; focuses on balance-sheet interpretation: net worth, total assets, total liabilities, debt-to-asset ratio, liquidity position; inputs: Cash & Savings, Investments / Retirement, Home / Real Estate Value, Vehicles & Other Assets (assets); Mortgage Balance, Loans & Credit Cards, Other Debts (liabilities); results: Net Worth (hero), Total Assets, Total Liabilities, Debt-to-Asset Ratio, Liquid Assets %; Asset Composition donut (4 asset slices, center = total assets); Net Worth Snapshot 3-bar chart (Total Assets teal / Total Liabilities amber / Net Worth dark navy positive or red negative) with bubble/callout above Net Worth bar; Net Worth Health Score gauge (debt-to-asset based, 0–100); Liquidity Strength gauge (liquid % of total assets); Smart Optimization four states: negative net worth (liabilities above total assets), high debt load (D/A ≥ 50%, debt reduction to reach 25% D/A), low liquidity (liquid < 10%, gap to reach 10% of assets), healthy (positive NW, manageable debt); Asset Mix Check + Debt Load Check + Liquidity Check insight cards; 25% D/A and 10% liquid thresholds are educational reference points only — not advice; tsc clean; CALC_INDEX `available: true`. Future V2: monthly income for optional D/I context, target net worth, period-to-period tracking, real estate appreciation/depreciation, inflation-adjusted NW, retirement readiness connection, detailed asset/liability schedule table (Detailed Schedules Patch V2), shared chart mobile legend/sidebar polish for ROI + Net Worth. |
| ROI Calculator V1 | ✅ LOCKED | `app/roi-calculator/` | Single dual-region page via `useRegion()`; built from Compound Interest Calculator structure; educational estimate — no investment, business, stock, fund, real estate, or marketing recommendations; inputs: initial investment/cost, final value/revenue, additional costs, optional holding period (enables annualized ROI), optional target ROI % (enables goal tracking); results card: ROI %, net profit/loss, total cost, break-even status, annualized ROI (when period entered), target gap/surplus (when target entered); ROI Breakdown donut with profit-state (Initial Cost + Additional Costs + Net Profit, center = Final Value) and loss-state (Recovered Value + Net Loss, center = Total Cost) — loss state avoids misleading green Initial Cost slice; ROI Comparison 3-bar chart (Break-even / Actual / Target); ROI Health Score gauge (`clamp(0,100, 50 + roi×1.5)`); Target Progress gauge; Smart Optimization four states: behind-target (additional value needed), on-track (surplus above target), no-target + profit (profit above break-even), no-target + loss (break-even gap); Profitability Check + Break-even Analysis + Annualized Return insight cards; ROI ≤ −100% safe (annualized skipped, 100% loss donut shows Net Loss only); tsc clean · next build clean; CALC_INDEX `available: true`. Future V2: taxes on gain, financing costs, inflation-adjusted real ROI, IRR/NPV cash-flow schedule, scenario comparison, risk-adjusted return, holding period optimization; detailed ROI schedule table deferred to cross-calculator Detailed Schedules Patch V2. |
| Compound Interest Calculator V1 | ✅ LOCKED | `app/compound-interest-calculator/` | Single dual-region page via `useRegion()`; built from Investment Fees Calculator structure; educational estimate — no investment product recommendations; EAR→EMR conversion applied per compound frequency (Annually/Semi-Ann./Monthly/Daily); inputs: initial investment, monthly contribution, annual rate, compound frequency pills, years invested pills (5/10/20/30/40, default 20), optional target amount, optional starting age (copy-only); results card: final balance, total interest earned, total contributions, target gap/surplus (when target set) or interest share (when no target); Growth Breakdown donut; Growth Over Time stacked bar chart with true relative scaling, selected-year bubble anchored to bar height, small value labels on non-selected bars, and target line when safely within chart bounds; Compounding Power Score gauge; Target Progress gauge; Smart Optimization three states: behind-target (extra monthly needed), on-track (projected surplus), no-target (+$100/month boost); zero-rate scenario uses contribution-only wording; Starting Age adds "by age X" copy only — does not affect calculations; Time Horizon Impact + Contribution Power + Frequency Impact insight cards; QA 20/20 · tsc clean; CALC_INDEX `available: true`. **Re-validated 2026-07-18** (see follow-up QA record): Annual Rate inline validation caption (0–49.9%, mirrors Retirement Calculator pattern), mobile Growth Over Time chart legend clipping at 375px fixed, PDF "Estimated Investment Growth" accent color standardized to teal across `investmentGrowthAdapter.ts`, and guard-rail max clamps added ($100,000,000 Initial Investment / $1,000,000 Monthly Contribution) — financial formulas unchanged. Future V2: growth projection schedule table, inflation-adjusted real return, tax wrapper toggle, lump sum vs DCA comparison, reverse solver (required rate or years), withdrawal phase extension. |
| Investment Fees Calculator V1 | ✅ LOCKED | `app/investment-fees-calculator/` | Single dual-region page via `useRegion()`; built from Personal Loan / Car Loan template; educational estimate — no investment product recommendations; monthly-compounding FV math applied at gross rate, net rate (current fee), and comparison fee rate; inputs: initial investment, monthly contribution, expected annual return (before fees), current annual fee %, years invested pills (10/15/20/25/30, default 20), comparison fee %; results card: portfolio value after fees, lost to fees, value at comparison fee, total contributions; Portfolio Breakdown donut (3 slices: contributions/net returns/lost to fees); Fee Impact Over Time 6-bar stacked chart (5/10/15/20/25/30yr); selected-year bubble anchored to selected bar height; Fee Drag Score gauge + Growth Efficiency gauge; Smart Optimization card uses Lower Fee Impact lever (fee savings vs comparison fee; Low-Cost Position state when current fee ≤ comparison fee); Fee Benchmark + Time Horizon Impact + Contribution Equivalent insight cards; fee-exceeds-return warning banner; QA 32/32 · tsc clean; CALC_INDEX `available: true`. **Re-validated 2026-07-18** (see follow-up QA record): Portfolio Breakdown donut percentage denominator corrected (rows-sum basis instead of `grossFV`), mobile Fee Impact Over Time chart legend clipping at 375px fixed, Annual Return / Annual Fee / Comparison Fee inline validation captions added (0–49.9%, mirrors Retirement/Compound Interest/Car Loan pattern), comparison-fee badge clamp fix, and `investmentFeesAdapter.ts` PDF composition-percentage basis brought into parity with the UI — financial formulas unchanged. Future V2: inflation adjustment, tax drag, variable return scenarios, year-by-year schedule table, three-way fee comparison, lump sum vs DCA analysis. |
| Retirement Savings Calculator V1 | ✅ LOCKED | `app/retirement-planning-calculator/` | Dual-region via `useRegion()`; built from Compound Interest Calculator V1 as primary template; Emergency Fund Calculator V1 as goal progress/gap inspiration; educational estimate — no investment, tax, CPP/OAS, Social Security, pension, or withdrawal-rate modeling; inputs: current savings, monthly contribution, annual return, current age, retirement age, retirement goal, compound frequency; years to retirement derived (retirementAge − currentAge, min 1); results card: projected retirement savings (hero), investment growth, total contributions, goal gap/surplus, additional monthly needed (when behind); Retirement Growth Journey: stacked area chart (3 bands — existing savings growth / contribution principal / investment growth above contributions), dashed orange goal line, retirement-age callout dot + value label, HTML x-axis labels with first/last anchor-aligned to avoid overflow; Retirement Goal Progress: semi-circle (180°) SVG arc gauge, goal progress %, behind/nearly-there/on-track/no-goal badge states; AI section named "Retirement Readiness Insight" with sublabel "AI-assisted insights by FinCalc Smart"; Retirement Readiness Score gauge (0–100, Excellent/Good/Fair/Poor); Goal Progress gauge; Action Required smart lever (full-width hero + 2-col stat cards below) / On Track lever / No-Goal prompt; Savings Pace + Time Horizon Impact + Goal Gap Check insight cards; PMT reverse-solve for required monthly contribution: `C = (goal − P×(1+r)^n) × r ÷ ((1+r)^n − 1)`, 0%-return safe path; results object exposes `readinessScore`, `projectedSavings`, `retirementGoal`, `goalProgressPct`, `gapOrSurplus`, `additionalMonthlyNeeded`, `statusLabel`, `smartActionText` for future AI Insights summary card; `Target` icon (orange #F97316) in CALC_INDEX; tsc clean; CALC_INDEX `available: true`. **Re-validated 2026-07-19** (see follow-up QA record): FAQ vs. "How It Works" Assumptions-list copy parity fixed (2 missing bullets — no contribution increases modeled, no tax-advantaged account room checking — added to the "How It Works" section to match the FAQ) — financial formulas unchanged. Future V2: CPP/OAS/Social Security income modeling, inflation adjustment, withdrawal-rate phase, tax-wrapper toggle (RRSP/401k/TFSA), retirement spending needs, detailed growth schedule table. |
| TFSA Contribution & Growth Calculator V1 | ✅ LOCKED | `app/tfsa-calculator/` | Canada-only; user-entered contribution room; first-year room check only; static JSX annual limit table (not `.map()` — see §Server Component Table Rule below). **Re-validated 2026-07-19** (see follow-up QA record): displayed tax-free growth percentage corrected to derive from `taxFreeGrowth / projectedValue` instead of a mislabeled internal field, and the shared PDF adapter's Rule of 72 wording now uses neutral fallback copy at 0% and near-0% returns (previously produced misleading claims like "doubles every 720 years") — financial formulas unchanged. **Re-validated 2026-07-20** (see "Validation & Lock" record): Infinity/NaN input guard added using `Number.isFinite()` to the four unbounded numeric fields, and the room-usage status badge at exactly 100% used standardized to "Fully Used" across all three display sites (was inconsistently "Nearly Full" in two of them) — financial formulas unchanged. **Post-lock correction 2026-07-20:** the "Fully Used" badge boundary was further corrected from a rounded room-used percentage to the actual remaining-room state (`roomRemaining <= 0`), preventing 99.50%–99.99% usage with positive room remaining from being mislabeled as fully used — no TFSA financial outputs or methodology changed. Future V2: lifetime cumulative room calculator, multi-year contribution schedule, inflation-adjusted projected value, RRSP vs TFSA comparison toggle, withdrawal and recontribution modeling, spousal TFSA illustration. |
| RRSP Savings Calculator V1 | ✅ LOCKED | `app/rrsp-savings-calculator/` | Canada-only; user-entered RRSP deduction room; first-year room check; simplified tax reduction estimate (in-room first-year contribution × marginal tax rate); if over-room, tax estimate capped at entered available room; if room = 0, tax estimate = 0; `Landmark` icon (teal); built from TFSA Calculator V1 as primary template. **Re-validated 2026-07-19** (see follow-up QA record): stale 2025 RRSP figures updated to 2026 ($33,810 annual maximum, 2027 filing-deadline framing, with copy distinguishing the annual ceiling from personal deduction room), fractional-overage display bug fixed (sub-$1 excess now shows cents instead of misleadingly rounding to `$0`), and the shared PDF adapter's tax-reduction estimate now shows neutral "Not estimated" wording instead of a misleading `$0` when marginal tax rate or available room is 0 — financial formulas unchanged. **Re-validated 2026-07-20** (see "Validation & Lock" record): an `Infinity`/`NaN` overflow guard was added to `parseAmt()` so extreme finite inputs (e.g. `1e308`) now clamp locally at `Number.MAX_SAFE_INTEGER` instead of reaching `Infinity`, and the "Fully Used" room-usage badge boundary was corrected from a rounded room-used percentage to the actual remaining-room state (`roomRemaining <= 0`), preventing 99.50%–99.99% usage with positive room remaining from being mislabeled as fully used — growth methodology, room-check formula, and tax-reduction estimate unchanged. |
| CMHC Mortgage Insurance Calculator V1 | ✅ LOCKED · QA PASSED | `app/cmhc-mortgage-insurance-calculator/` |
| Rent vs Buy Calculator V1 | ✅ LOCKED · QA PASSED | `app/rent-vs-buy-calculator/` | Dual-region; decision calculator; grouped bar + break-even timeline SVG charts; AI Rent vs Buy Analysis. Down payment $ / % toggle. CMHC/PMI excluded — disclosed in warning + disclaimer. | Canada-only; estimates CMHC mortgage default insurance premium, down payment %, base mortgage, total mortgage with premium, eligibility/status; down payment $ / % toggle; amortization 25/30yr pills; first-time buyer + new build toggles; 30-year insured amortization warning when neither toggle is active; eligibility gates: ≥$1.5M ineligible, ≥20% no premium, below-minimum; CMHC premium tiers: 5%–9.99%=4.00%, 10%–14.99%=3.10%, 15%–19.99%=2.80%, 20%+=none; CMHC Premium Impact donut (teal base / amber premium, center=total mortgage); CMHC Premiums by Down Payment 7-bar comparison chart (5%/7.5%/10%/12.5%/15%/17.5%/20%, selected bar amber with bubble+outline, faded amber non-selected, teal 20% bar); AI Analysis: "FinCalc Smart AI CMHC Insurance Analysis" — status card, smart threshold lever (next-threshold extra down payment needed + premium saving), Eligibility Check + Premium Impact + Down Payment Thresholds insight cards, Insurance Summary stats grid; input buttons match Personal Loan Calculator solid-teal-selected style; color system: amber=CMHC cost, teal=no-premium/positive; Province/PST is V2 scope; `ShieldCheck` icon (teal); built from Mortgage Qualifier Calculator V2 structure + Canadian Mortgage Calculator V2 math/wording. |
| Salary Calculator V1 | ✅ LOCKED · QA PASSED · PDF V1 LOCKED | `app/salary-calculator/` | Dual-region; gross-to-net pay breakdown; Pay Conversion horizontal bar chart (7 rows, log-scale bars); Pay Clarity Score arc gauge (GR=68, 200px); Deduction Impact dark card; DonutChart take-home/yr; AI Salary Analysis always visible. No Province/State, no official tax brackets, no CPP/EI/FICA. **PDF V1:** `taxIncomeAdapter.ts` (Family 5 representative) — Download PDF button live; 2-page standard layout; estimated take-home wording only; Pay Clarity Score sourced directly from component-level computed values (no duplicate formula); region-specific methodology + disclaimer (CA: CPP/EI/provincial; US: FICA/Medicare/state). **Re-validated 2026-07-21** (see "Validation & Lock" record): a Weekly pay-frequency period-count inconsistency corrected — Weekly period count now uses the user-entered `weeksPerYear` (was hardcoded `52` in the take-home-per-paycheque calculation while the Pay Conversion table already used `weeksPerYear`), with the Hero, Pay Conversion table, AI Insight copy, and PDF all brought into agreement; fractional `weeksPerYear` values supported without forced rounding; default 52-week behavior unchanged — salary normalization, output conversions, deduction-rate methodology, and score logic unchanged. |
| Sales Tax Calculator V1 | ✅ LOCKED · QA PASSED | `app/sales-tax-calculator/` | Dual-region; Add Tax / Remove Tax modes; Canada province/territory presets with GST/PST/QST/HST component breakdowns; USA manual rate only; no preset database for USA; Canada input order: Calculation Mode → Province/Territory → Amount → Tax Rate; Tax Breakdown donut; Add/Remove Tax Calculation card; AI Sales Tax Analysis (Tax Share card + dark smart result card + 3 insight cards); `Receipt` icon (purple #8B5CF6). |
| Mortgage Refinance Calculator V1 | ✅ LOCKED · QA PASSED | `app/mortgage-refinance-calculator/` | Dual-region; estimates whether refinancing may reduce monthly payments, how long to recover refi costs, and total interest impact over a selected comparison horizon; built from Personal Loan Calculator V1 layout + shared mortgage math; inputs: current balance, current rate, years remaining, new rate, new amortization (10/15/20/25/30yr pills), refinance costs, cash-out amount, comparison horizon (3/5/7/10yr pills); no editable current payment field — current payment calculated from balance/rate/yearsRemaining, helper copy notes actual lender payment may include escrow; new principal = balance + cash-out; decision states: `saves` (teal) / `no-break-even` (amber) / `costs-more` (red); break-even = $0 costs → Immediate, costs > 0 and savings > 0 → Math.ceil(costs/savings), savings ≤ 0 → null; term-extension warning fires in smart lever when newAmortization > Math.ceil(yearsRemaining); Current vs New Payment two-bar SVG chart with savings/increase bubble; Break-even Timeline SVG line chart (cumulative savings line / refi cost dashed line / break-even marker or not-reached state); AI section: "FinCalc Smart AI Refinance Analysis" — left result card + right dark smart lever card (term-extension warning takes priority) + Monthly Payment Change / Break-even Check / Total Interest Impact insight cards; CA: semi-annual compounding via `monthlyRateCA`; US: monthly compounding via `monthlyRateUS`; `RefreshCw` icon (teal); `tsc --noEmit` clean. |
| Retirement Withdrawal Calculator V1 | ✅ LOCKED · QA PASSED | `app/retirement-withdrawal-calculator/` | Dual-region via `useRegion()`; year-by-year drawdown simulation (max 50yr horizon); deferral phase (portfolio grows when currentAge < withdrawalStartAge); Beginning/End-of-Year withdrawal timing; inflation-adjusted withdrawals; outputs: estimated years lasting, depletion age, first-year withdrawal rate, sustainability status (Sustainable/Watch/At Risk/Depleted), Withdrawal Pressure Score (0–100, rate-based); bar+line SVG drawdown timeline chart; Sustainability Snapshot semi-circle gauge; Withdrawal Pressure Score full-arc gauge (GR=68, 200px, matches Pay Clarity Score quality); AI Withdrawal Analysis module; `Banknote` icon (orange #F97316); QA 9/9 PASS · tsc clean. **Re-validated 2026-07-19** (see follow-up validation record): End-of-Year simulation no longer overcounts the final year's withdrawal past available funds; positive Target Ending Balance scenarios now report a distinct "Target Balance Reached" state instead of being mislabeled as plain depletion; zero-withdrawal-horizon scenarios (deferral period exceeds the 50-year simulation) now report "No Withdrawal Phase Simulated" instead of a false "Sustainable" reading; the numeric Sustainability Score is no longer shown as meaningful in either special state — gauge, AI Insight, and PDF now display "Goal Met" / "Not Rated" text instead; static FAQ inflation-compounding example corrected. Sustainability score thresholds, rate thresholds, Withdrawal Pressure Score, and withdrawal/inflation methodology unchanged. Future V2: RRIF minimum withdrawals (CA), CPP/OAS/Social Security income offset, taxes on withdrawals, sequence-of-returns simulation, Monte Carlo, account withdrawal order. |
| Savings Goal Calculator V1 | ✅ LOCKED | `app/savings-goal-calculator/` | Dual-region via `useRegion()`; monthly-compounding FV projection + reverse PMT solve for required monthly contribution; goal types: Vehicle / Home Down Payment / Vacation / Education / Other (label only — no effect on math); inputs: savings goal, current savings, monthly contribution, annual return %, time horizon (years); outputs: projected savings, total contributions, estimated growth, goal gap/surplus, progress %, required monthly, additional monthly needed, time to goal (600mo cap); Goal Readiness Score card (Pay Clarity Score pattern — 200px semi-circle gauge, GR=60, 3 stat boxes, summary line); Goal Breakdown donut (on-track: teal goal + `#334155` surplus; off-track: amber projected + `#334155` gap); Savings Growth Timeline bar chart (dark navy `#334155` below-target, teal at/above-target); AI Goal Analysis module; `Target` icon (amber #F59E0B); QA 12/12 PASS · tsc clean. Mobile chart sidebar overflow bug fixed during QA. **Re-validated 2026-07-20** (see "Validation & Lock" record): Infinity/NaN input guard added to `parseAmt()`, PDF Goal Progress % cap corrected from 200% to 100% to match the UI, donut chart/readiness gauge exact-goal boundary contradiction fixed (branch selectors switched from strict `surplus > 0` to canonical `leverState === 'on-track'`), and readiness score changed from rounding to flooring raw progress percentage to prevent a premature "100/Excellent" score alongside a "Nearly There" status for progress in `[99.5, 100)` — growth methodology, contribution timing, required-monthly formula, and goal-timeline methodology unchanged. Future V2: Rule of 72 integration, multiple concurrent goals, inflation adjustment, account type / interest rate comparison. |
| Income Tax Calculator V1 | ✅ LOCKED | `app/income-tax-calculator/` | Dual-region via `useRegion()`; 2025 federal tax brackets for Canada (5 brackets, progressive on gross) and USA (7 brackets, progressive on taxable income after standard deduction); BPA non-refundable credit: `min(rawFed, BPA × 0.145)`, cannot reduce below zero (Canada); standard deduction $15,750 Single / $31,500 MFJ (USA, 2025); flat approximate provincial rates per province (Canada, educational only); manual state/local rate % on gross income (USA); filing status selector (affects US standard deduction only); province/territory selector (Canada — 13 options alphabetical + Manual Rate); `safe()` guard on all math outputs; outputs: federal tax, provincial/state tax, total tax, after-tax income, monthly take-home, effective rate %, marginal rate %; Take-Home Clarity Score gauge (GR=68, 200px, 240° sweep — matches Pay Clarity Score pattern); Tax Breakdown donut (teal after-tax / amber federal / `#64748B` slate provincial-state); Gross to After-Tax pill composition card (large teal headline + pill bar `borderRadius:50` + 5-row stat table + monthly callout); AI Income Tax Analysis: result card (effective rate summary) + dark smart lever card (Tax Efficiency message) + Marginal Rate Check + Income Allocation + Tax Planning Tip insight cards; `FileText` icon (`#8B5CF6` purple in CALC_INDEX nav system only — not in calculator UI); no CPP/EI/FICA/Medicare; educational estimates only; `TAX_YEAR = 2025` constant; QA 12/12 PASS · tsc clean. **Validated & locked 2026-07-21** (see "Validation & Lock" record): 2025 Canadian federal brackets updated to official CRA values with the first bracket corrected to 14.5% (2025 blended rate) and the BPA credit conversion rate corrected to match at 14.5% (was 15%); 2025 US standard deductions updated to $15,750 Single / $31,500 MFJ (was $15,000 / $30,000); marginal-rate boundary audit confirmed Canada $200,000 correctly resolves to a 29% federal marginal rate; finite-input guard added; PDF status/clarity alignment and sample-PDF generator brought into parity with the corrected 2025 values — progressive-tax and marginal-rate selection logic itself was independently verified correct and unchanged. Future V2: progressive provincial brackets (all 13 CA provinces/territories), Ontario surtax, Quebec abatement, RRSP deduction input, CPP/EI itemized (CA), FICA/Medicare itemized (US), capital gains income type, self-employment income, multi-year bracket comparison. |
| FIRE Calculator V1 | ✅ LOCKED | `app/fire-calculator/` | Dual-region via `useRegion()`; built from Retirement Savings Calculator V1 as primary template; binary-search time-to-FIRE solver; inputs: current age, current invested assets, monthly investment, annual expenses, expected annual return, FIRE multiple pills (20×/25×/30×/33×), compound frequency, optional annual income; outputs: FIRE target, progress %, gap, years to FIRE, FIRE age, projected portfolio at FIRE, total contributions, investment growth, savings rate (when income entered); already-FI state; not-reachable state; 0% return safe; annual expenses = $0 clean fallback; FIRE Progress Journey layered chart (initial assets / contributions / investment growth / portfolio line / orange dashed FIRE target); Financial Independence Progress semi-circle gauge; AI section named "Financial Independence Insight" with sublabel "AI-assisted insights by FinCalc Smart" — second flagship insight module after Retirement Readiness Insight (see `AGENT_MANUAL.md §9`); results object exposes readinessScore, fireAge, fireTarget, currentProgress, gapToFIRE for future AI Insights summary card; `Flame` icon (orange #F97316); tsc clean; CALC_INDEX `available: true`. **Re-validated 2026-07-19** (see follow-up QA record): hero "Projected Portfolio at FIRE" label now reads "Projected Portfolio (20 Years)" when the not-reachable state is active (was misleadingly implying a FIRE date regardless of state), Savings Pace copy fixed to exclude current assets from the displayed contributions total, and `fireAdapter.ts` composition-bar/Total-Contributions PDF fields brought into parity with the UI (basis switched from FIRE target to projected value at FIRE date) — financial formulas, binary search, and score thresholds unchanged. Future V2: inflation adjustment, withdrawal-rate phase, CPP/OAS/Social Security income, tax-wrapper toggle, detailed growth schedule table. |
| Lump Sum vs Monthly Investment Calculator V1 | ✅ LOCKED | `app/lump-sum-vs-dca-calculator/` | Single dual-region page via `useRegion()`; built from Compound Interest Calculator V1 as primary template; Investment Fees Calculator V1 as comparison/AI framing inspiration; educational estimate — no investment recommendations; compares investing full capital immediately (lump sum) versus equal monthly contributions over a selected spread period, with all invested funds then compounding to the final horizon; two-phase monthly strategy FV: annuityFV × (1+r)^(H−S) where H = horizon months, S = spread months; inputs: total amount to invest, annual return rate, compound frequency pills (Annually/Semi-Ann./Monthly/Daily, default Monthly), investment horizon pills (5/10/15/20/30yr, default 10yr), monthly spread period pills (3/6/12/24/36 mo, default 24 mo); results card: lump sum final value, monthly strategy final value, monthly amount, spread period, growth difference; comparison badge (teal "Lump Sum +$X ahead" or neutral "Outcomes are similar"); Final Value Comparison donut (2 slices: lump sum teal / monthly strategy sky blue); Growth Over Time dual-bar chart (teal = lump sum, sky = monthly strategy) with gap bubble at selected year; Timing Advantage gauge (0–100 score) + Monthly Strategy callout circle; Lump Sum Growth Advantage smart lever (two states: lump-ahead / similar); Time in Market Impact + Return Rate Sensitivity + Strategy Tradeoff insight cards; neutral educational tone — does not recommend either strategy; calculator-specific disclaimer: fixed return, spread period only (not full horizon), no tax/inflation/transaction costs/volatility; mobile input layout: 2-col numeric inputs always + full-width pill groups below divider; DEFAULT_SPREAD = 24 months; 0% return safe; $0 amount safe; QA regression passed; tsc clean; CALC_INDEX `available: true`. **Re-validated 2026-07-20** (see "Validation & Lock" record): NaN/Infinity display cascade on the Total Amount input fixed with finite-number guarding, "How It Works" contribution-timing copy corrected to describe actual end-of-month ordinary-annuity timing, PDF significance-threshold wording corrected from 5% to 0.5%, PDF advantage-color mapping aligned with the UI, and an unsourced "lump sum outperforms two-thirds of the time" claim replaced with wording grounded in the calculator's fixed-rate methodology — financial formulas unchanged. Future V2: tax wrapper toggle, inflation adjustment, market volatility simulation, lump sum deployed across multiple entry points (not just equal monthly spread). |
| Navigation & Discovery Foundation V1 | ✅ LOCKED · QA PASSED | `lib/calculators.ts` · `components/layout/SiteHeader.tsx` · `components/layout/SiteFooter.tsx` · `components/ui/CalcSearch.tsx` · `components/home/HeroSearch.tsx` · `app/calculators/` | 6-category mega-menu; country-aware routing via `regionRoutes`; `navHidden` deduplication; `searchLabel`; homepage chips → `?category=`; `/calculators?category=` URL filter. See `AGENT_MANUAL.md §8` for the full rule set. |
| All Calculators V2 | ✅ LOCKED · QA PASSED | `app/calculators/page.tsx` · `app/calculators/CalculatorsClient.tsx` | Full V2 upgrade of the `/calculators` discovery page. H1 "All Financial Calculators" + subtitle + trust chips; `scoreEntry()` search scoring (label=3, searchLabel=3, description=2, category=1, region=0.5); horizontal chip filters (All / Mortgage / Financial Planning / Investing / Retirement / Loans / Tax & Salary / Canada Only); Featured Popular section (dark navy premium panel with `DarkCalcCard`); white card grid with hover via `onMouseEnter`/`onMouseLeave`; simultaneous search+category filter (no mutual exclusion); URL sync (`?q=` + `?category=`) with `useRef(true)` guard to skip initial render; 23 visible entries (1 `navHidden` US Mortgage excluded); Canada Only filter (`entry.region === 'ca'` → CMHC / TFSA / RRSP); SEO content block; mobile-first no horizontal overflow; tsc clean; QA 9/9 PASS. Content width corrected 2026-06-11 to `mx-auto max-w-6xl px-4` (homepage container match). |
| AI Insights Page V1 | ✅ LOCKED · QA PASSED | `app/ai-insights/page.tsx` | Premium product showcase for FinCalc Smart's main differentiator: smart calculators with AI-assisted insights. RSC (no `'use client'`). Four sections: (1) Hero — product mockup left / copy right on desktop, copy stacks first on mobile, mortgage sample inputs, donut + bar chart + metrics + floating Mortgage Health Score card, two CTAs (Explore Calculators / View Examples); (2) Dark navy Calculate → Analyze → Decide — three white cards + scenario strip (Extra CA$150/mo → CA$28,400 saved → 2 yrs faster); (3) What could your numbers reveal? — Mortgage large card + Savings Goal + Retirement + Tax & Salary cards with calculator links; (4) Final CTA — dark navy, Explore All Calculators, educational disclaimer, Canada & USA. All three main sections use shared homepage container `mx-auto max-w-6xl px-4`. Metadata: `title: 'AI-Assisted Financial Insights'` (root layout appends ` | FinCalc Smart`). tsc clean · QA PASS. |
| Mortgage Affordability Guide V1 | ✅ LOCKED · QA PASSED | `app/guides/mortgage-affordability/page.tsx` | First Financial Guide Article. RSC only — no `'use client'`. Six sections: Hero (H1 + lede + metadata chips) / GDS–TDS explainer with ratio bars / Illustrative Scenario card (InsightsShowcase pattern) + 4-lever editorial list / Three Mistakes 3-card grid / GuideCTA (→ `/mortgage-qualifier-calculator`) / ArticleDisclaimer. Scenario card uses exact InsightsShowcase layered structure: back-card depth shadow → white outer → `#F8FAFB` chrome header → `bg-brand-gray-50` input tiles → dark gradient panel (`linear-gradient(150deg, #0D2137 0%, #0A1628 100%)`) → light footer. Verified scenario: CA$650K price / CA$130K down (20%) / 5.19% / 25yr → mortgage CA$520K / qualifying rate 7.19% / monthly payment CA$3,082 / GDS ~37% / TDS ~43% (costs: CA$450/mo tax + CA$125/mo heat). Metadata `<title>` uses long-form SEO title directly (root layout `| FinCalc Smart` suffix intentionally excluded — V1 locked decision). Article JSON-LD schema present. tsc clean · QA 8/8 PASS. See `AGENT_MANUAL.md §11` for the reusable Financial Guide Article Template. |
| Retirement Savings Guide V1 | ✅ LOCKED · QA PASSED | `app/guides/how-much-to-retire/page.tsx` | Fourth and final pre-launch Financial Guide Article. RSC only — no `'use client'`. Built from locked guides (STRICT CLONE MODE). Five sections: 01 Hero / 02 The Inputs That Shape the Projection (2×2 open grid — four calculator inputs: current savings, contributions, time, return) / 03 See It in Action (InsightsShowcase, amber border for Behind Target shortfall) / 04 What Can Change the Outcome Most (2×2 levers + 3-col mistakes grid) / 05 GuideCTA + Disclaimer. Nominal balances only — inflation not modeled; disclosed explicitly in Section 01 prose and scenario footer. CPP, OAS, Social Security, pensions, fees, taxes, withdrawals, and volatility identified as outside the model. Verified scenario: CA$25,000 / CA$500/mo / 6% / Monthly / 30yr / Goal CA$1,000,000 → projected CA$652,822 / contributions CA$205,000 / growth CA$447,822 / progress 65.3% / shortfall CA$347,178 / required CA$846/mo / additional CA$346/mo / status Behind Target. Four comparisons: retire at 68 ~CA$800,900 / CA$750/mo ~CA$903,950 / CA$50K start ~CA$803,387 / 4% return ~CA$430,000. Primary CTA → `/retirement-planning-calculator`. Secondary CTA → `/retirement-withdrawal-calculator`. Article + BreadcrumbList JSON-LD. datePublished 2026-06-16. tsc clean · next build clean · QA PASS (§11.12). |
| Compound Interest Guide V1 | ✅ LOCKED · QA PASSED | `app/guides/compound-interest/page.tsx` | Third Financial Guide Article. RSC only — no `'use client'`. Built from locked guides (STRICT CLONE MODE). Five sections: 01 Hero / 02 The Four Forces (2×2 open grid) / 03 See It in Action (InsightsShowcase — teal border for positive growth) / 04 What Changes the Result Most (2×2 levers + 3-col mistakes grid) / 05 GuideCTA + Disclaimer. Verified scenario: CA$10,000 initial + CA$500/mo / 6% / Monthly / 20yr → CA$264,122 final / CA$130,000 contributed / CA$134,122 growth / 50.8%. Primary CTA → `/compound-interest-calculator`. Secondary CTA → `/investment-fees-calculator`. Article + BreadcrumbList JSON-LD. datePublished 2026-06-13. tsc clean · next build clean · QA PASS (§11.11). |
| Emergency Fund Guide V1 | ✅ LOCKED · QA PASSED | `app/guides/emergency-fund/page.tsx` | Second Financial Guide Article. RSC only — no `'use client'`. Built from Mortgage Affordability Guide V1 via STRICT CLONE MODE. Five sections: 01 Hero / 02 How much should you save? (five-factor grid + 2×2 target framework) / 03 Illustrative Scenario (InsightsShowcase pattern — amber teal border signals funding shortfall state) / 04 Reach the goal faster (2×2 improvement levers + three common-mistakes 3-col grid) / 05 GuideCTA + ArticleDisclaimer. Sections 02 and 04 use the approved 2×2 open editorial grid (`grid grid-cols-1 md:grid-cols-2 gap-x-10` — see `AGENT_MANUAL.md §11.9`). Primary CTA → `/emergency-fund-calculator`. Secondary CTA → `/savings-goal-calculator`. Verified scenario: CA$4,000/mo × 6mo = CA$24,000 target / CA$5,000 saved (1.25mo) / CA$19,000 gap / 38 months (~3 yr 2 mo) at CA$500/mo. Levers: CA$750/mo → 26mo; CA$2,000 lump sum → CA$17,000 gap / 34mo; CA$3,200 essential → CA$19,200 target / CA$14,200 gap / 29mo. Article + BreadcrumbList JSON-LD. datePublished 2026-06-13. tsc clean · next build clean · QA PASS. |

See `CALCULATOR_TEMPLATE_V2.md` for the V2 template rules and the Qualifier variant rules.

---

## Navigation & Discovery Foundation V1 — QA Record

> QA completed: 2026-05-23 · Result: **PASS**

### Confirmed working

- Desktop header: `Logo | Calculators | AI Insights | Financial Guides | Search | Region Toggle`
- Mega-menu: 6 categories (Mortgage, Financial Planning, Investing, Retirement, Loans, Tax & Salary)
- Mega-menu: one generic "Mortgage" entry — no Canadian/US duplicates
- Mega-menu Mortgage: Canada → `/canadian-mortgage-calculator` · USA → `/us-mortgage-calculator`
- Footer Mortgage: same country-aware routing
- Direct SEO routes all return 200: `/canadian-mortgage-calculator`, `/us-mortgage-calculator`, `/mortgage-qualifier-calculator`
- Homepage chips: all 5 route to `?category=` params, none link directly to calculator pages
- `/calculators?category=X`: sidebar highlights and filters correctly for all 6 categories
- `/calculators?q=mortgage`: shows "Canadian Mortgage Calculator" only — no separate US duplicate
- Hero search "Mortgage Calculator": Canada → CA route · USA → US route
- `navHidden` entries excluded from all generic discovery surfaces (mega-menu, `CalcSearch`, `CalculatorsClient`)
- TypeScript: clean · Browser console: no errors or hydration warnings

### Bugs fixed during QA

**1. `components/home/HeroSearch.tsx`**
Loans, Financial Planning, Investing, and Tax & Salary chips still routed to plain `/calculators`.
Fixed: all 5 chips now use `?category=` URL params.

**2. `app/calculators/CalculatorsClient.tsx`**
`CalculatorsClient` did not filter `navHidden` entries, so `/calculators?q=mortgage` returned "Canadian Mortgage Calculator" and "US Mortgage Calculator" as separate results.
Fixed: base list now uses `CALC_INDEX.filter(e => !e.navHidden)`, consistent with `CalcSearch`.

### Known limitation — Mobile Navigation V2 Phase 2

Mobile drawer calculator links do **not** yet follow the same `regionRoutes` / `NAV_LABEL` / `searchLabel` logic as the desktop mega-menu:


- Mobile drawer shows "Canadian Mortgage Calculator" as the label (not "Mortgage")
- Mobile drawer Mortgage link always goes to `/canadian-mortgage-calculator` regardless of active region
- No duplicate mortgage entries appear, so this does not block the new calculator build phase

**Do not fix this until Mobile Navigation V2 Phase 2 is explicitly planned.** It requires applying `regionRoutes` routing and `NAV_LABEL`-style short labels inside the mobile drawer items in `SiteHeader.tsx`.

---

## Debt Repayment Calculator V1 — QA Record

> QA completed: 2026-05-25 · Result: **PASS**

### Confirmed working

- Desktop: 2-column grid, input card `lg:self-start` (no empty stretch), results card fills height
- Mobile (375px): single column, no horizontal overflow, charts scroll horizontally in container
- Tablet (768px): 2-column grid, AI Analysis stacks correctly
- Both scroll CTAs: "See How to Save $X ↓" (dark CTA in results card) and `#ai-analysis` anchor both scroll to correct position accounting for sticky header height via `getBoundingClientRect`
- `scrollMarginTop: '80px'` set on both `#calc-results` and `#ai-analysis`
- PTL state (monthly payment ≥ monthly interest): warning renders, no NaN in output
- Zero-rate state (0% interest): renders clean, no divide-by-zero, no NaN
- Region toggle CA/US: currency labels swap (`CA$` / `$`), calculations update correctly
- AI Debt Analysis: always visible (not gated on scroll or interaction)
- Debt Payoff Status gauge: 160px mobile / 220px desktop via `.dps-gauge` CSS class
- CTA hover flip: "See How to Save $X ↓" ↔ "Unlock AI Debt Analysis ↓"
- Search (header): "debt" → Debt Repayment Calculator result appears
- Search (mobile drawer): result click navigates and closes drawer correctly
- `tsc --noEmit`: zero errors
- CALC_INDEX: `available: true`, description matches spec

### Bugs fixed during QA

**1. `components/ui/CalcSearch.tsx` — Mobile drawer stays open after navigation**
`navigate` callback was missing `onNavigate?.()` call. Also `submitQuery` else branch (Enter key → `/calculators?q=`) did not call `onNavigate?.()`. Fixed: both paths now call `onNavigate?.()`. `onNavigate` added to `navigate` useCallback deps.

**2. `components/ui/CalcSearch.tsx` — Header dropdown too narrow**
Dropdown `className` used `w-full` for all variants, binding it to the ~200px input container in the header. Fixed: `variant === 'header'` now gets `w-80 right-0` (320px, right-aligned).

**3. `components/layout/SiteHeader.tsx` — Drawer `onNavigate` wired**
`<CalcSearch variant="drawer" onNavigate={() => setMobileOpen(false)} />` added so the drawer closes on navigation.

### Future V2 scope (not started)

Multi-debt support: named debts, avalanche/snowball strategy selection, per-debt extra payment allocation logic, consolidated payoff timeline across all debts.

---

## Debt Repayment Calculator V1 — Follow-up Validation & Fix Round

> QA completed: 2026-07-19 · Result: **PASS — V1 Ready to Lock**

A full end-to-end re-validation (methodology reverse-engineered and confirmed from source, independent financial validation via a standalone Node reimplementation of the payoff simulation, input validation review, live-scenario reconciliation, chart/AI/PDF validation, responsive QA at 375/768/1280px, content/SEO review, and technical QA) closed 4 approved AUTO-PROCEED fixes. Financial logic (`calcExactPayoff`, `computeResult`'s month-by-month simulation, `debtMonthlyRate`, the display-only treatment of annual fees) was explicitly out of scope and was not touched.

The as-built calculator is single-debt only — there is no avalanche/snowball/multi-debt logic in the code, consistent with the existing Future V2 scope note above. This re-validation covered the calculator as built; multi-debt-specific scenarios were skipped rather than treated as missing functionality.

### Fixes applied

1. **PDF fee-methodology copy** (`lib/pdf/adapters/debtRepaymentAdapter.ts`) — the `whatItDoes` methodology line and the `p2` insight paragraph both previously claimed annual fees were "distributed as a monthly charge added to each payment obligation" and "included in the payoff calculation" — directly contradicting the actual display-only treatment (fees are shown as a cost total but never enter the amortization loop). Both corrected to state that fees are shown as an additional cost and do not affect the payoff timeline.
2. **Annual Rate validation caption + clamp** — the rate input previously had no upper bound (`Math.max(0, parseFloat(...) || 0)`), unlike its sibling calculators. Added a `Math.min(99.9, ...)` clamp plus an inline amber (`#f59e0b`) caption below the field — "Rate must be 0–99.9%. Using X%." — mirroring the pattern already live in Retirement, Compound Interest, Car Loan, Personal Loan, and Investment Fees.
3. **Chart Y-axis tick-label formatting (k/M-notation)** — at extreme balances (approaching the max-valid-input scenario), the Payoff Timeline chart's Y-axis ticks would render as unreadable multi-digit K-notation (e.g. `$10000K`). Added M-notation switching (`$X.XXM`) once the balance reaches $1,000,000+, matching the helper pattern already verified in the locked Personal Loan Calculator.
4. **"$0 self-contradiction" at 0% interest** — both the results-card CTA button ("See How to Save $X ↓") and the "Smart Opportunity Found" AI card could previously claim a savings opportunity while showing $0 interest saved and/or 0 months saved (e.g. at a 0% rate where only the fixed $100/mo comparison has no interest to save). Both now compute the active interest-saved/months-saved figures explicitly and fall back to a "No Additional Savings" state when there is genuinely nothing to show — adapted from, but not identical to, the Personal Loan Calculator's equivalent fix, since Debt Repayment's 0%-rate case still has a genuine months-saved benefit from an extra payment (unlike Personal Loan's discrete-term case, which has zero benefit at 0%).

### Confirmed working

- Methodology independently reimplemented and cross-checked against multiple scenarios (defaults, zero-interest, near-cap/near-minimum-payment, small-balance-payoff-in-one-month, user-extra-payment) — all matched the live app exactly
- FAQ's specific numeric claim ("$100/mo extra on $5,000 @ 19.99%/$150 base cuts payoff roughly in half and saves over $1,200 in interest") verified live and accurate: base = 50 months / $2,357 interest; +$100/mo = 25 months saved (exactly half) / $1,225 saved
- Default scenario renders and reconciles exactly: Debt-Free Date, month-1 interest/principal split, Debt Breakdown donut percentages (68%/32%, reconciling to totals), AI status badge (47% interest → "Watch"), Payment Efficiency (44%), "Smart Opportunity Found" card ($1,225 saved / 25 mo earlier) — no regression from the fixes
- USA/Canada region parity confirmed live (currency prefix and values switch correctly; personal debt compounds monthly in both regions, unlike CA mortgages)
- PDF generation confirmed working post-fix (button enabled, click succeeds, zero console errors)
- No horizontal overflow and no chart-legend clipping at 375/768/1280px — this calculator's Payoff Timeline legend already uses `flex-wrap` (not the `flex-row`-forces-overflow pattern that required fixing in Car Loan, Personal Loan, Compound Interest, and Investment Fees), so no mobile legend bug exists here
- Content/SEO: metadata, H1, "How It Works," FAQ, and FAQPage JSON-LD reviewed — all copy correctly scoped to a single-debt calculator, no claims of avalanche/snowball/multi-debt features
- `npx tsc --noEmit`: clean, before and after all 4 fixes
- `next build`: clean, 43/43 static pages
- `next lint`: not configured in this project (no ESLint config exists) — treated as N/A, consistent with prior sibling-calculator validations
- No new dependencies introduced

### Live-verification note

Three of the four fixes (the rate-clamp caption at out-of-range values, the chart k/M-notation at an extreme balance, and the 0%-rate "No Additional Savings" branch) could not be exercised via simulated form input in this validation session — a session-local browser-automation limitation caused typed/simulated input to update the input field's displayed value without propagating to the component's React state, confirmed with direct evidence (the field visibly showed the new value while computed results kept showing the prior scenario's output). This mirrors an earlier, separately-diagnosed tooling issue in the same session (region-toggle clicks), not an application defect. All three fixes were instead verified via direct source review and clean `tsc`/build output, and each mirrors an already-live-verified pattern from a locked sibling calculator (Personal Loan Calculator, Car Loan Calculator).

### Known non-blocking findings (not fixed, out of scope)

- **Sitewide `NumericInput` label-association gap** — confirmed present here too (the `<label>` wraps only the tooltip trigger button, not the actual `<input>`, so no accessible `htmlFor` association exists). Same sitewide gap already on record from the Personal Loan Calculator and Car Loan Calculator follow-up rounds — reported per standing instruction, not reopened or fixed here.
- **H1→H3 heading skip** — "Debt Breakdown" and "Payoff Timeline" are H3 with no intervening H2, matching the shared "CA Mortgage breakdown layout" structure referenced in the component's own comments. Appears to be an existing shared-layout pattern, not something introduced by this validation — informational only, not fixed here since it would touch shared layout structure.
- **Dual interest-ratio denominators (UI vs. PDF)** — the on-page "Debt Payoff Status" badge uses `totalInterest / balance` while the PDF composition-bar status uses `totalInterest / (balance + totalInterest)`. Same non-bug pattern already flagged during the Investment Fees Calculator follow-up round — the two ratios serve different purposes (debt-relative cost vs. share-of-total-outlay) and are each internally consistent; not a defect.

---

## Personal Loan Calculator V1 — QA Record

> QA completed: 2026-05-27 · Result: **PASS** · Base QA 24/24 · Extended QA 16/16

### Confirmed working

- Desktop (1280px): 2-column grid, no overflow, all cards render
- Tablet (768px): layout wraps correctly, no overflow
- Mobile (375px): single column, pills wrap to ≥2 rows, no horizontal overflow
- Term pills (1yr–5yr): all 5 render, each updates monthly payment, term metadata, and all downstream cards
- Smart Optimization: 5yr→4yr, 4yr→3yr, 3yr→2yr, 2yr→1yr; 1yr shows "shortest available term" with no savings figure
- Borrowing Cost gauge: Excellent/Healthy (rate 8.5%), Fair/Watch (rate 10%), Poor/Caution (rate 25%)
- Affordability gauge: Affordable/Manageable (income 120k), Watch/Moderate (income 24k), High Burden/High (income 12k), No Income badge (blank)
- Bottom Affordability insight card: green ≤15% DTI, amber 15–20%, red >20%
- Rate Check: USA copy on default region, Canada copy after region switch
- Zero-rate loan (0%): renders clean, no NaN / Infinity
- High-rate loan (35%): Caution badge visible, no NaN
- Zero loan amount: empty state message "Enter a loan amount", no NaN
- Income blank → "Add your annual income" prompt visible; income entered → DTI% shown, prompt gone
- No console errors; tsc --noEmit clean
- CALC_INDEX `available: true`; `/calculators?q=personal` returns Personal Loan result

### Future V2 scope (not started)

Origination fee / APR-adjusted cost display; saved loan scenarios; lender/rate comparison table; optional extra payment modeling.

---

## Personal Loan Calculator V1 — Follow-up Validation & Fix Round

> QA completed: 2026-07-18 · Result: **PASS — V1 Ready to Lock**

A full end-to-end re-validation (payment formula reverse-engineered and confirmed from source, 9 required test scenarios A–I independently hand-calculated, input validation review, chart/AI/PDF reconciliation, responsive & accessibility QA at 375/768/1280px, content/SEO review, and technical QA) closed 5 approved AUTO-PROCEED fixes. Financial formulas (`calcPayment`, `computeResults`, monthly-compounding methodology, the 49.9% rate clamp, and the Loan Cost Score / Rate Check / Affordability thresholds) were explicitly out of scope and were not touched.

### Fixes applied

1. **Annual Rate validation caption** — the input previously accepted an out-of-range typed value (e.g. "999") while `computeResults()` silently clamped it to 49.9% for calculation, with no visible feedback. Added an inline amber (`#f59e0b`) caption below the field — "Rate must be 0–49.9%. Using X%." — mirroring the same pattern already live in Retirement, Compound Interest, Car Loan, and Investment Fees.
2. **Chart Y-axis tick-label formatting (k/M-notation)** — at extreme loan amounts (max-valid-input scenario, $9,999,999), the Term Comparison chart's Y-axis ticks rendered as unreadable `$6830k $13661k $20491k $27321k`. Replaced the inline tick formatter with a `fmtTick()` helper that switches to M-notation (`$6.83M`, `$13.66M`, etc.) once `yMax ≥ $1,000,000`, retaining the existing k-notation/decimal logic below that threshold.
3. **Mobile chart legend clipping at 375px** — the Term Comparison chart's stat row + legend sidebar used `flex-row sm:flex-col`, cramming stats and legend into one line at 375px and clipping. Changed both wrappers to unconditional `flex-col`, matching the same fix already applied to Car Loan, Compound Interest, and Investment Fees. Desktop (≥640px) is unchanged.
4. **Smart Optimization "$0" self-contradiction at 0% interest** — at a 0% rate, the "Smart Optimization Found" card still displayed, showing $0 interest saved from switching to a shorter term — a self-contradictory claim that nothing was actually found. Added a condition (`shorterTermOpt.interestSaved > 0`) gating the "Smart Optimization Found" headline/card, plus a new explicit "No Interest Savings" branch reading "a shorter term won't reduce interest at a 0% rate" for the 0%-rate case.
5. **Loan Cost Score explanation copy fix** — the "How It Works" panel described a 3-dimension, 40/40/20-point score (including "Payment-to-income ratio") that didn't match the actual 2-dimension, 50/50-point formula in code — payment-to-income is scored separately in the Affordability card, not part of the Loan Cost Score at all. Rewrote the copy to describe the actual formula and added a clarifying sentence distinguishing it from the Affordability card.

### Confirmed working

- Financial parity verified live across all 9 required test scenarios (A–I): default $315.68/mo, zero-interest exactly $277.78/mo ($0 interest), small loan $86.07/mo, large loan $10,379.18/mo, high interest (45%) $510.71/mo, long-term $556.11/mo, maximum valid inputs ($9,999,999/49.9%/5yr) $455,342.35/mo with no NaN/overflow, invalid inputs (negative/blank/oversized text/rate=999%) all handled gracefully, region toggle (USA↔Canada) confirmed calculation-identical (monthly compounding is region-agnostic for personal loans)
- Annual Rate validation: 999% input → caption "Rate must be 0–49.9%. Using 49.9%." + Monthly Payment and all AI Insight cards recalculate consistently at the clamped rate
- Smart Optimization: 0% rate now shows "No Interest Savings" messaging instead of a misleading $0 savings claim; all other rates unaffected
- Chart Y-axis: multi-million-dollar scale now renders `$6.83M`/`$13.66M`/etc.; re-verified no regression at smaller ($623k) scale, still renders correct k-notation
- 375px: Term Comparison stat row and legend stack cleanly, no clipping, no horizontal scroll
- 768px / 1280px: unaffected, layout unchanged; no horizontal overflow at any breakpoint
- PDF: generates with no console errors across 3 scenarios (Default, Zero-interest, High-interest); `loanAdapter.ts` (shared with Car Loan) confirmed pure pass-through architecture — no PDF-side fix needed
- AI Insight thresholds (Loan Cost Score ≥80/65/45, Rate Check 12%/15%, Affordability/DTI 15%/20%) verified directly against source — internally consistent, including the intentional Watch-override behavior (Good/Excellent score still shows Watch if rate>12% or interest ratio>20%)
- Content/SEO: metadata and FAQ JSON-LD present and accurate; FAQ copy cross-checked against actual formula/scoring logic; no internal links present to validate; per-page metadata pattern consistent sitewide
- `npx tsc --noEmit`: clean
- `next build`: clean, all 43 routes compiled and statically generated
- No console errors, hydration warnings, or runtime warnings

### Known non-blocking finding (not fixed, out of scope)

**Sitewide `NumericInput` label-association gap.** The shared `NumericInput` component (`app/_mortgage-shared/ui.tsx`) has no `id` prop, so no calculator using it (Personal Loan, Car Loan, Compound Interest, Retirement, Investment Fees, mortgage calculators) can produce a working `<label htmlFor>` association or accessible name for its text inputs. Confirmed via live DOM inspection on both Personal Loan (dangling `htmlFor` referencing an ID that's never applied) and Car Loan (labels have no `htmlFor` at all) — same root cause, same missing accessible name. Fixing this requires adding `id`/`aria-label` support to the shared `NumericInput` component, which affects every locked calculator — flagged for a dedicated shared-component approval task, not fixed here. Also noted: redundant/dead-code region branching in the Rate Check card (`isHigh`/`isBorderline` compute identical values on both CA/US branches) — zero functional impact, informational only.

---

## Investment Fees Calculator V1 — QA Record

> QA completed: 2026-05-29 · Result: **PASS** · 32/32 checks

### Confirmed working

- Desktop (1280px): 7/5 grid, input card + results card side-by-side, no overflow
- Tablet (768px): stacked layout, year pills wrap cleanly, no overflow
- Mobile (375px): single column, year pills wrap 3+2, no horizontal overflow
- All inputs update results correctly: initial investment, monthly contribution, annual return, current fee, comparison fee, years pills
- Year pills (10/15/20/25/30): all update portfolio value, chart, and AI Analysis
- Fee difference badge: "Comparison is X.XX% lower/higher than current fee" — clear wording, correct colour (amber when current is higher, teal when lower)
- Fee-exceeds-return warning banner: fires when current fee ≥ expected annual return, no crash, no NaN
- Results card: Portfolio Value After Fees, Lost to Fees, Value at Comparison Fee, Total Contributions — all correct at defaults and edge cases
- Portfolio Breakdown donut: 3 slices (contributions teal / net returns slate / lost to fees amber); center shows net portfolio value
- Fee Impact Over Time chart: 6 bars (5/10/15/20/25/30yr); selected year highlighted with teal border; Fees Lost bubble anchored near bar top
- Smart Optimization (current fee > comparison fee): fee savings + monthly equivalent displayed correctly
- Low-Cost Position state: fires when current fee ≤ comparison fee; shows growth efficiency, no fake savings
- Fee Drag Score gauge: score 53 at 1.5% fee (Fair/Watch); score 4 at 3.5% (Poor/Caution); correct copy per state
- Growth Efficiency gauge: 83% kept at defaults; tracks correctly with fee changes
- Fee Benchmark insight card: correct tier labels (low / below average / typical / high) by fee range
- Time Horizon Impact card: fees at 10/20/30yr computed and displayed correctly
- Contribution Equivalent card: extra monthly to offset drag computed correctly
- Zero contribution + zero investment: shows empty state, no NaN
- Zero fee: $0 lost to fees, Low-Cost Position active, no NaN
- High fee (3.5%): score 4, Caution, correct copy, no NaN
- No investment product recommendations (Vanguard, iShares, Questrade, etc.)
- Disclaimer: investment-specific wording only — no mortgage or loan wording
- Header search, hero search, /calculators?q=investment: Investment Fees Calculator found correctly
- No NaN / Infinity / blank UI across all scenarios
- No horizontal overflow at 375px or 1280px
- No console errors
- `tsc --noEmit` clean

### Future V2 scope (not started)

Inflation adjustment; tax drag on investment gains; variable return scenarios (pessimistic/expected/optimistic); year-by-year schedule table; three-way fee comparison; lump sum vs DCA analysis toggle.

### Non-blocking cleanup (future sweep)

Unused `feeDiffPct` variable declared in component body (badge rendered via inline IIFE instead). `noUnusedLocals` not enabled — TypeScript does not flag it. Harmless.

---

## Investment Fees Calculator V1 — Follow-up Validation & Fix Round

> QA completed: 2026-07-18 · Result: **PASS — V1 Ready to Lock**

A full end-to-end re-validation (fee methodology reverse-engineered and confirmed from source, 13 required test scenarios A–M independently hand-calculated, input validation review, chart/AI/PDF reconciliation, responsive QA at 375/768/1280px, and technical QA) closed 4 approved AUTO-PROCEED fixes. Financial formulas (`calcFV`, `computeResults`, monthly-compounding methodology, Fee Drag Score / Growth Efficiency / Fee Benchmark thresholds) were explicitly out of scope and were not touched.

### Fixes applied

1. **Portfolio Breakdown donut percentage basis** — the donut's three slice percentages (contributions / net returns / lost to fees) were computed as a share of `grossFV`, which could produce a misleading or non-100%-summing split in edge cases (e.g. `netReturns` clamping to 0 in heavy fee-drag scenarios). Changed the denominator to `rowsSum` (the sum of the three displayed row values themselves), guaranteeing the donut always reflects an accurate proportional split of what's actually shown.
2. **Mobile Chart Legend clipping at 375px** — the Fee Impact Over Time chart's stat row + legend sidebar used `flex-row sm:flex-col`, cramming stats and legend into one line at 375px and clipping. Changed the outer wrapper to unconditional `flex-col`, matching the working pattern already applied to Compound Interest and Car Loan. Desktop (≥640px) is unchanged.
3. **Missing rate/fee validation captions** — Expected Annual Return, Annual Fee %, and Comparison Fee % all accepted out-of-range typed values (e.g. "999") while `computeResults()` silently clamped each to 0–49.9% for calculation, with no visible feedback. Added inline amber (`#f59e0b`) captions below each field — "Return/Fee must be 0–49.9%. Using X%." — mirroring the pattern already live in Retirement, Compound Interest, and Car Loan. As part of this fix, the existing "Comparison is X% lower/higher than current fee" badge was also corrected: it previously computed `cur`/`cmp` with only `Math.max(0, ...)` (no upper clamp), so an out-of-range typed fee could produce a badge percentage inconsistent with the clamped value actually used in calculation. Both values now use the same `Math.max(0, Math.min(49.9, ...))` clamp as `computeResults()`.
4. **PDF adapter composition-percentage parity** — `investmentFeesAdapter.ts` independently computed its own Portfolio Breakdown percentages as a share of `input.grossFV`, the same basis the UI had just been fixed away from. This never produced a sum >100%, but could produce a materially misleading 100/0/0 split in a 0%-return-with-fee edge case. Changed to the same `rowsSum` basis as the UI fix (item 1), so the PDF and UI now always show identical composition percentages.

### Confirmed working

- Financial parity verified live across all 13 required test scenarios (A–M): no-fee FV, fee-adjusted FV, contributions, growth, fee impact, lost growth, scenario differences, zero-rate, zero-fee, and rounding all independently hand-calculated and matched the live app — with "fees paid" vs. "lost growth" vs. "scenario difference" explicitly distinguished per the documented methodology (`lostToFees = grossFV − netFV`; `feeSavings = cmpFV − netFV`)
- Rate/fee validation: out-of-range typed values (e.g. 999%) on Annual Return, Annual Fee, and Comparison Fee each show the correct clamped caption and calculation
- Comparison-fee badge: now shows a percentage consistent with the clamped fee actually used in calculation, in both directions (current > comparison and current < comparison)
- Portfolio Breakdown donut: percentage split always sums to 100% and reflects the same proportional basis as the results card, including the 0%-return edge case
- PDF: generates with no console errors across 3 scenarios (Default, Zero-fee, High-fee-long-term); composition percentages confirmed to match the UI in source (pure pass-through architecture — PDF does not recompute financial figures independently)
- AI Insight thresholds (Fee Drag Score ≥80/65/45, Growth Efficiency ≥95/85/70, Fee Benchmark <0.20/0.75/1.50) verified directly against source code — internally consistent
- 375px: Fee Impact Over Time stat row and legend stack cleanly, no clipping, no horizontal scroll
- 768px / 1280px: unaffected, layout unchanged
- Region toggle (USA ↔ Canada): currency prefix and all new captions update correctly
- `npx tsc --noEmit`: clean
- `next build`: clean, all 43 routes compiled and statically generated
- No console errors, hydration warnings, or runtime warnings

### Known non-blocking finding (not fixed, out of scope)

Remaining sibling calculators sharing the pre-existing chart-legend `flex-row sm:flex-col` pattern (`lump-sum-vs-dca-calculator`, `emergency-fund-calculator`, `net-worth-calculator`, `personal-loan-calculator`, `roi-calculator`) still carry the same latent 375px clipping bug. Left untouched — explicitly out of scope for this task, which was scoped to the Investment Fees Calculator only. (Compound Interest, Car Loan, and now Investment Fees have been fixed in successive follow-up rounds.)

---

## Emergency Fund Calculator V1 — QA Record

> QA completed: 2026-06-02 · Result: **PASS** · 40/40 checks · tsc clean · next build clean

### Confirmed working

- Desktop (1280px): 7/5 grid, input card + results card side-by-side, no overflow
- Tablet (768px): stacked layout, no overflow
- Mobile (375px): two-column input grid restored; Income Stability pills wrap 2+1 on narrow screens via `ef-stability-pill` class; Target Coverage pills 4-in-a-row; no overflow
- Default math: expenses $3,000 · savings $10,000 · contribution $500 · 6mo → target $18,000 · coverage 3.3mo · gap $8,000 · 1yr 4mo ✓
- Stable → "3–4 months" recommended; Moderate → "4–6 months"; Variable → "9–12 months" ✓
- Target Coverage pills (3/6/9/12mo): update target, gap/surplus, donut, chart, and AI Analysis without overriding Income Stability recommendation ✓
- Below-target + contribution > 0: lever shows months to target ("1 yr 4 mo" at defaults) ✓
- Below-target + contribution = 0: lever shows gap $8,000 and suggested $667/mo (gap ÷ 12) ✓
- At/above-target: "Goal Achieved" lever, surplus shown, On Track gauge ✓
- Current savings = 0: 0.0mo coverage, full gap, readiness score 0, no NaN ✓
- Monthly expenses = 0: safe empty state, no NaN, no Infinity ✓
- fmtMonths: $500/mo → "1 yr 4 mo"; $100/mo → "6 yr 8 mo"; under 12 months → "X mo" ✓
- Coverage donut — below-target: Current Savings (teal) + Remaining Gap (slate), center = target ✓
- Coverage donut — surplus: Fund Target (teal) + Surplus (navy), center = target ✓
- Savings Timeline: bars at 3/6/12/18/24mo; first-to-target bar gets teal bracket + bubble; flat bars when contribution = 0; amber dashed target line ✓
- Risk Adjustment insight: Variable + 3mo selection → "below the recommended 9-month minimum" mismatch flag ✓
- Smart Optimization mobile and desktop versions render consistently ✓
- No bank, account, HYSA, product, or investment recommendations ✓
- Disclaimer: EF-specific ("changes in expenses, income, emergencies") — no mortgage/loan wording ✓
- Header search "emergency" → Emergency Fund Calculator found; `/calculators?q=emergency` → Financial Planning category ✓
- Page icon: Umbrella matches CALC_INDEX ✓
- Teal/green primary accent confirmed — no `#F59E0B` in brand/accent inline styles; Download PDF button `rgb(29,181,132)` ✓
- Amber/red used only for caution/gap states ✓
- No console errors ✓

### Math verified at defaults

`targetAmount = 6 × 3000 = 18,000` ✓  
`currentCoverageMonths = 10,000 / 3,000 = 3.33 → 3.3mo` ✓  
`gap = 18,000 − 10,000 = 8,000` ✓  
`monthsToTarget = 8,000 / 500 = 16mo = 1yr 4mo` ✓  
`suggestedMonthly (0-contribution state) = 8,000 / 12 = $667` ✓

### Future V2 scope (not started)

High-yield savings interest modeling (reduces months-to-target); emergency fund vs high-interest debt trade-off; insurance coverage modifier; joint vs individual household view; inflation adjustment on target over time; expense category breakdown; regional cost-of-living context. Detailed savings schedule table deferred to cross-calculator Detailed Schedules Patch V2.

---

## Emergency Fund Calculator V1 — Follow-up Validation & Fix Round

> QA completed: 2026-07-19 · Result: **PASS — V1 Ready to Lock**

A full end-to-end re-validation (methodology reverse-engineered and confirmed from source, independent hand/Node-script recalculation across default/at-target-surplus/no-savings scenarios, AI Insights consistency review, chart accuracy review, PDF-vs-UI parity review, FAQ/content/SEO review, responsive QA at 375/768px, and technical QA) closed 5 approved AUTO-PROCEED fixes. Financial methodology (`computeResults`, the linear no-interest gap/timeline math, and the Readiness Score / Target Progress scoring thresholds) was explicitly out of scope and was not touched.

### Fixes applied

1. **PDF `fmtMonths` rounding parity** (`lib/pdf/adapters/emergencyFundAdapter.ts`) — the PDF used a round-remainder month formatter while the UI used a ceiling-based one, producing both UI/PDF display mismatches and standalone nonsensical output (e.g. "1 yr 12 mo"). PDF's `fmtMonths` rewritten to match the UI's ceiling-based algorithm exactly.
2. **PDF readiness accent-color parity** (`lib/pdf/adapters/emergencyFundAdapter.ts`) — `readinessAccent` previously used its own independent 70/45 score thresholds instead of the canonical `readinessStatus` (Healthy/Watch/Caution) field already passed into the adapter, risking a different color in the PDF than what the UI showed for the same score. Now derives directly from `input.readinessStatus`.
3. **Smart Optimization "$X sooner" self-contradiction** (`EmergencyFundCalculator.tsx`) — the "Adding an extra $100/month would get you there... X sooner" copy computed the "sooner" delta from unrounded raw values while displaying rounded month counts, producing an arithmetically inconsistent statement (displayed durations differing by 2 months while the copy claimed "3 mo sooner"). Fixed to compute the delta from the same rounded (`Math.ceil`) values actually shown to the user.
4. **PDF at-target/surplus key-driver copy** (`lib/pdf/adapters/emergencyFundAdapter.ts`) — in at-target/surplus scenarios, `keyDrivers[1]` read the nonsensical "closes the $0 gap in approximately 0 mo." Added an `atTarget`-first branch describing the surplus instead, reusing the `atTarget` flag already computed earlier in the function.
5. **Mobile Savings Timeline chart legend/stat-row overflow at 375px** (`EmergencyFundCalculator.tsx`) — the stat row (AT 24 MONTHS / CONTRIBUTION / TARGET) and legend (Below target / At target / Target) used `flex-row` with no wrapping below the `sm:` breakpoint, overflowing off the right edge of a 375px viewport (dashed "Target" swatch clipped). Fixed by adding `flex-wrap` on mobile only (`sm:flex-nowrap sm:flex-col` preserved for the tablet/desktop sidebar layout) — same pattern already live in the Debt Repayment Calculator. This is a newly found instance of the sitewide mobile-legend bug already on record from the Compound Interest, Car Loan, Investment Fees, and Personal Loan follow-up rounds; unlike those, it was fixed here rather than only flagged.

### Confirmed working

- Core formulas (`Fund Target`, `Current Coverage`, `Savings Gap`, `Months to Target`) independently re-verified against 3 scenarios (default moderate/below-target, surplus/at-target with $0 contribution, no-savings/no-contribution) — all matched exactly, both by hand and via a standalone Node re-implementation
- AI Insights (Readiness Score gauge, Target Progress gauge, Smart Optimization card, Coverage Check / Risk Adjustment / Savings Plan insight cards) never contradict the underlying calculations post-fix
- Donut chart and Savings Timeline bar chart math confirmed accurate and internally consistent with displayed figures
- PDF now matches the UI exactly for month formatting, readiness accent color, and at-target/surplus key-driver copy
- FAQ and "How It Works" content cross-checked against actual behavior (Months to Target formula example, zero-contribution flat-line chart behavior, no-interest/consistent-contribution/stable-expense assumptions) — all accurate, no changes needed
- Metadata title/description and FAQPage JSON-LD reviewed — accurate, no overclaiming
- 375px: no horizontal overflow (`document.documentElement.scrollWidth === window.innerWidth` confirmed), stat row and legend wrap cleanly
- 768px: sidebar/column layout unaffected by the mobile fix
- `npx tsc --noEmit`: clean, before and after all 5 fixes
- `next build`: clean, all 43 routes compiled and statically generated

### Known non-blocking findings (not fixed, out of scope)

- **Readiness Score vs. Target Progress threshold mismatch (scoring logic).** Both gauges derive from the same underlying `rawScore = currentSavings / targetAmount × 100`, but use different breakpoints: Readiness Score → "Watch" at 40–59%, "Caution" below 40%; Target Progress → "Behind" below 70%. For any rawScore in the 40–69% band this produces two simultaneously visible badges with conflicting visual severity for the same number (e.g. amber "Fair/Watch" next to red "56%/Behind" at rawScore = 56%). Flagged for a product decision (align thresholds vs. keep as an intentional dual-scale design) — not fixed here since it touches scoring logic.
- **Stale sample PDFs.** `_docs/sample-pdfs/fincalc-smart-emergency-fund-report-2026-06-16-us.pdf` and `-ca.pdf` predate fixes 1–4 above and no longer reflect current PDF output. Not regenerated in this round.
- **Sitewide `NumericInput` label-association gap** — same gap already on record from the Personal Loan, Car Loan, and Debt Repayment follow-up rounds (no `id`/`htmlFor` association on the shared `NumericInput` component). Confirmed present here too; not fixed, per standing instruction to track it as a dedicated shared-component task.

---

## Net Worth Calculator V1 — QA Record

> QA completed: 2026-06-02 · Result: **PASS** · tsc clean

### Confirmed working

- Desktop (1280px): 7/5 grid, input card + results card side-by-side, no overflow
- Tablet (768px): stacked layout, all cards render, no overflow
- Mobile (375px): two-column input grid (assets / liabilities), no horizontal scroll exposed
- All 7 inputs update results reactively: Cash & Savings, Investments / Retirement, Home / Real Estate Value, Vehicles & Other Assets, Mortgage Balance, Loans & Credit Cards, Other Debts
- Default math: $725,000 total assets · $415,000 total liabilities · $310,000 net worth · 57.2% D/A · 3.4% liquid ✓
- Positive net worth state: teal hero, "positive net worth" subtext ✓
- Negative net worth state (mortgage $800k): −$90,000, "liabilities exceed assets" ✓
- Debt-only state (all assets = 0, liabilities > 0): "debt with no assets on record", D/A and liquid % show "—", no division error ✓
- All-inputs-zero: safe empty state message in results card and AI section, no hero, no NaN/Infinity ✓
- Negative input (−50,000 Cash & Savings): clamped to 0, no NaN/Infinity, total assets = 0 ✓
- Asset Composition donut: renders with all 4 asset categories; empty state when assets = 0 ✓
- Donut handles single-category asset correctly ✓
- Net Worth Snapshot chart: Total Assets (teal) / Total Liabilities (amber) / Net Worth (dark navy positive, red negative) — all distinct ✓
- Net Worth bubble/callout: renders above bar with "Net Worth" label and formatted value ✓
- Net Worth Health Score gauge: 24/Poor at defaults (D/A 57.2%), correct label/color/copy ✓
- Liquidity Strength gauge: Low at defaults (3.4% liquid), correct label/color/copy ✓
- Lever A (negative NW): "liabilities above total assets" — total assets + total liabilities KPIs ✓
- Lever B (high debt, D/A ≥ 50%): "debt reduction to reach 25% D/A" — $233,750 at defaults, math verified ✓
- Lever C (low liquidity): "liquidity gap to reach 10% of total assets" — $49,100 at test state, math verified ✓
- Lever D (healthy): "Healthy Balance Sheet / positive net worth with manageable debt load" ✓
- Asset Mix Check / Debt Load Check / Liquidity Check insight cards update correctly ✓
- No product/investment/bank/account/debt recommendations ✓
- Net-worth-specific disclaimer: "asset sale costs, debt terms, personal circumstances" — no mortgage or loan wording ✓
- Header search "net worth" → Net Worth Calculator result appears ✓
- `/calculators?q=net+worth` → single correct result, Financial Planning category ✓
- Footer nav: Net Worth Calculator listed under Financial Planning ✓
- Page icon: teal Scale icon matches CALC_INDEX ✓
- Input card icon: teal gradient — not amber ✓
- Teal/green confirmed as primary accent; amber/red only for caution/debt/deficit states ✓
- No NaN / Infinity / blank UI across all scenarios ✓
- No server errors ✓
- `tsc --noEmit` clean ✓

### Math verified at defaults

`totalAssets = 25,000 + 75,000 + 600,000 + 25,000 = 725,000` ✓  
`totalLiabilities = 400,000 + 15,000 + 0 = 415,000` ✓  
`netWorth = 725,000 − 415,000 = 310,000` ✓  
`debtToAssetRatio = 415,000 / 725,000 × 100 = 57.24% → 57.2%` ✓  
`liquidPct = 25,000 / 725,000 × 100 = 3.45% → 3.4%` ✓  
`healthScore = clamp(0, 100, 100 − 57.2 × 1.33) = clamp(0, 100, 24) = 24` ✓  
`debtReductionNeeded (Lever B) = 415,000 − 0.25 × 725,000 = 415,000 − 181,250 = 233,750` ✓

### Non-blocking caveat

Net Worth Snapshot chart legend/sidebar items can clip slightly beyond the visible area at 375px mobile due to the shared ROI-style `flex-row sm:flex-col` chart sidebar pattern. No horizontal scroll is exposed — clipped by `overflow-x-hidden` on the page wrapper. Does not affect usability or data visibility. Logged for future shared chart polish: "Fix mobile legend/sidebar clipping in ROI + Net Worth chart cards."

### Future V2 scope (not started)

Monthly income input for optional debt-to-income context; target net worth; period-to-period net worth tracking; real estate appreciation/depreciation assumptions; inflation-adjusted net worth; retirement readiness connection; detailed asset/liability schedule table (deferred to cross-calculator Detailed Schedules Patch V2); shared chart mobile legend/sidebar polish for ROI + Net Worth.

---

## ROI Calculator V1 — QA Record

> QA completed: 2026-06-02 · Result: **PASS** · tsc clean · next build clean

### Confirmed working

- Desktop (1280px): 7/5 grid, input card + results card side-by-side, no overflow
- Tablet (768px): stacked layout, all fields visible, no overflow
- Mobile (375px): single column, no horizontal overflow
- All inputs update results: initial cost, final value, additional costs, holding period, target ROI %
- Default math: totalCost $10,500 · netProfit +$2,500 · ROI +23.8% · annualized +11.3%/yr · target gap −$125 ✓
- Positive ROI state: teal ROI %, "profitable return" subtitle, profit lever ✓
- Break-even state (finalValue = totalCost): 0.0%, "at break-even" badge, clean render ✓
- Loss state (finalValue < totalCost): amber ROI %, "loss on investment", loss lever ✓
- ROI ≤ −100% (finalValue = 0): −100.0%, no NaN, no Infinity, annualized skipped, 100% Net Loss donut ✓
- Target below actual (target=20%, actual=23.8%): On Track, $400 surplus ✓
- Target above actual (target=25%, actual=23.8%): Close (99%), $125 additional value needed ✓
- Target blank: No Target gauge, profit/loss break-even lever ✓
- Annualized ROI: shows in results card when period entered; absent from results card when period blank ✓
- ROI Breakdown donut — profit state: Initial Cost + Additional Costs + Net Profit, center = Final Value ✓
- ROI Breakdown donut — loss state: Recovered Value (slate) + Net Loss (amber), center = Total Cost; no Initial Cost green slice; Recovered Value omitted at 100% loss ✓
- ROI Comparison chart: Break-even / Actual (with ROI bubble) / Target (when target entered) ✓
- ROI Health Score: 86/100 Excellent at defaults, status/label/copy consistent ✓
- Target Progress gauge: 99% Close at defaults, On Track when target below actual ✓
- Smart Optimization: all four states render on mobile and desktop ✓
- Profitability Check / Break-even Analysis / Annualized Return insight cards all update ✓
- No investment, business, stock, fund, or real estate recommendations ✓
- Disclaimer: ROI-specific wording (taxes, fees, financing costs) — no mortgage wording ✓
- Search: header search, `/calculators?q=roi` — ROI Calculator found, Investing category ✓
- CALC_INDEX: `available: true`, `searchLabel: 'ROI Calculator'` ✓
- Page icon: BarChart3 matches CALC_INDEX icon ✓
- No NaN / Infinity / blank UI across all scenarios ✓
- No console errors ✓

### Math verified

`totalCost = 10000 + 500 = 10500` ✓  
`roiPct = (13000 − 10500) / 10500 × 100 = 23.81%` ✓  
`annualizedROI = (1 + 0.2381)^(1/2) − 1 = 11.3%/yr` ✓  
`targetFinalValue = 10500 × 1.25 = 13125; gap = 13000 − 13125 = −$125` ✓  

### Future V2 scope (not started)

Taxes on gain; financing/borrowing costs; inflation-adjusted real ROI; IRR/NPV cash-flow schedule; scenario comparison (pessimistic/expected/optimistic); risk-adjusted return; holding period optimization. Detailed ROI schedule table deferred to cross-calculator Detailed Schedules Patch V2.

---

## Compound Interest Calculator V1 — QA Record

> QA completed: 2026-06-02 · Result: **PASS** · 20/20 checks

### Confirmed working

- Desktop (1280px): 7/5 grid, input card + results card side-by-side, no overflow
- Tablet (768px): stacked layout, pills single row, no overflow
- Mobile (375px): single column, frequency pills wrap 2+2, year pills wrap 3+2, no overflow
- Year pills (5/10/20/30/40yr): all update final balance, Growth Breakdown donut, Growth Over Time chart, and AI Analysis
- 40yr: $453,085 final balance · Power Score 100/100 Excellent · chart bubble shows interest $352,085 ✓
- Bar chart: true relative scaling — bars at 5yr/10yr visibly shorter than 30yr/40yr; value labels on non-selected bars readable
- Target $50,000 < projection: On Track, 200% of target, surplus +$58,959 correctly shown in results card and Smart Lever ✓
- Target $200,000 > projection: Behind, 54%, $197.04/mo extra monthly contribution needed ✓
- Target line: renders in chart when target is set and within safe chart bounds ✓
- Starting Age 30: "by age 50" copy appears in results subtitle and AI analysis copy; does not affect any calculation ✓
- Starting Age blank: no "by age" copy — clean ✓
- Zero rate + target set: "contribution increase needed" / "With a 0% return assumption, your balance grows only through contributions." wording ✓
- Zero initial investment ($0 initial, $200/mo): $92,408 at 20yr, 6%, monthly — monthly-only FV correct ✓
- Zero monthly contribution ($5,000 initial, $0/mo): $16,551 at 20yr, 6%, monthly — lump-sum-only FV correct ✓
- Both zero: safe empty state in results card, donut area, chart area, and AI Analysis — no NaN / Infinity / blank UI ✓
- No console errors; no warnings
- `tsc --noEmit` clean

### Math verified at defaults

`$5,000 initial · $200/mo · 6% · 20yr · Monthly` → $108,959 ✓  
`$0 initial · $200/mo · 6% · 20yr · Monthly` → $92,408 ✓  
`$5,000 initial · $0/mo · 6% · 20yr · Monthly` → $16,551 ✓  
`extraMonthlyNeeded` for $200k target at defaults → $197.04/mo ✓ (targetGap / annuityFactor)

### Future V2 scope (not started)

Growth Projection Schedule table; inflation-adjusted real return; tax wrapper toggle (TFSA / RRSP / taxable); lump sum vs DCA comparison toggle; reverse solver (required rate or years to reach target); withdrawal phase extension (decumulation).

---

## Compound Interest Calculator V1 — Follow-up Validation & Fix Round

> QA completed: 2026-07-18 · Result: **PASS — V1 Ready to Lock**

A scoped, audit-driven fix round (4 approved items) closed the remaining findings from a full read-only validation pass. Financial formulas, compounding methodology, and calculation logic were explicitly out of scope and were not touched.

### Fixes applied

1. **Annual Rate Validation (HIGH)** — the input previously displayed the raw typed value (e.g. "999") while `computeResults()` silently clamped it to 49.9% for calculation, with no visible feedback. Added an inline amber (`#f59e0b`) caption below the field — "Rate must be 0–49.9%. Using X%." — shown whenever the typed value is out of range, reusing the exact pattern already live in `RetirementSavingsCalculator.tsx`. The 49.9% clamp itself is unchanged.
2. **Mobile Chart Legend (LOW)** — the "Growth Over Time" stat row + legend sidebar used `flex-row sm:flex-col`, cramming 3 stat items and the legend into one line at 375px and clipping. Changed the outer wrapper to unconditional `flex-col`, matching the already-working pattern in `SavingsGoalCalculator.tsx`. Desktop (≥640px) is unchanged — `sm:flex-col` already resolved to the same layout at those widths.
3. **PDF Accent Color (LOW)** — "Estimated Investment Growth" was inconsistently colored across the PDF (`amber` in Executive Summary and results table, `slate` in the composition bar). Standardized to `teal` in all three places in `investmentGrowthAdapter.ts`, matching the platform convention already established in `retirementAdapter.ts` (Investment Growth = teal, Contributions = slate).
4. **Large Number UX (OPTIONAL, implemented)** — added guard-rail max clamps isolated to this component: Initial Investment capped at $100,000,000, Monthly Contribution capped at $1,000,000/month, each with a matching amber validation caption. No existing platform precedent for a dollar-amount max clamp existed; thresholds were chosen generously to never constrain realistic use while preventing display-overflow on pathological inputs.

### Confirmed working

- Financial parity verified live across 5 scenarios — all identical to the pre-fix baseline: Default ($108,959 / $53,000 / $55,959), Principal-only ($16,551), Contributions-only ($92,408 / $48,000), Zero-interest ($53,000 / $0), Long-term 40yr ($453,085 / $101,000 / $352,085)
- Annual Rate validation: 999% input → caption "Rate must be 0–49.9%. Using 49.9%." + calculation correctly uses 49.9%
- Large-number clamp: $999,999,999,999 initial investment → caption "Max supported is $100,000,000. Using $100,000,000." + calculation correctly uses the clamp
- 375px: Growth Over Time stat row and legend stack cleanly, no clipping, no horizontal scroll
- 768px / 1280px: unaffected, layout unchanged
- PDF: generates with no console errors; all three "Investment Growth" color references confirmed `teal` in source
- `npx tsc --noEmit`: clean
- `next build`: clean, all 43 routes compiled and statically generated
- `next lint`: blocked by the same pre-existing repo-wide missing-ESLint-config issue encountered during the Retirement Calculator audit — not a regression from this change
- No console errors, hydration warnings, or runtime warnings

### Known non-blocking finding (not fixed, out of scope)

7 of the 8 other calculators sharing this same chart-legend pattern (`car-loan-calculator`, `investment-fees-calculator`, `lump-sum-vs-dca-calculator`, `emergency-fund-calculator`, `net-worth-calculator`, `personal-loan-calculator`, `roi-calculator`) still use the old `flex-row sm:flex-col` wrapper and likely share the same latent 375px clipping bug. Left untouched — explicitly out of scope for this task, which was scoped to the Compound Interest Calculator only.

---

## Lump Sum vs Monthly Investment Calculator V1 — QA Record

> QA completed: 2026-06-03 · Result: **PASS** · tsc clean

### Confirmed working

- Desktop (1280px): 2-col numeric inputs + full-width pill groups in one panel (no left/right column split); 7/5 outer grid; results card side-by-side; no overflow
- Tablet (768px): stacked layout; Investment Horizon + Monthly Spread Period side-by-side in 2-col pill row; no overflow
- Mobile (375px): Total Amount and Annual Return Rate side by side (2-col); Compound Frequency / Investment Horizon / Monthly Spread Period each in a separate full-width row; no pill crowding; no horizontal overflow (confirmed programmatically)
- Default scenario: $10,000 / 7% / Monthly / 10yr / 24mo → $416.67/mo, lump sum $20,097, monthly strategy $18,702, gap +$1,394 ✓
- Spread period pills (3/6/12/24/36mo): all update monthly amount, monthly strategy FV, gap, AI Analysis copy, and chart correctly
  - 3mo: $3,333.33/mo · gap +$232 ✓
  - 6mo: $1,666.67/mo · gap +$404 ✓
  - 12mo: $833.33/mo · gap +$742 ✓
  - 24mo: $416.67/mo · gap +$1,394 ✓
  - 36mo: $277.78/mo · gap +$2,017 ✓
- Investment horizon pills (5/10/15/20/30yr): all update results and chart; 30yr gap bubble correct (+$5,630 at 24mo spread)
- Compound frequency pills: all switch cleanly, results update correctly
- 0% return: "Outcomes are similar at this return rate" badge, both FVs = $10,000, +$0 gap, no NaN ✓
- $0 amount: clean empty state — no NaN, no Infinity, no broken UI ✓
- $1M at 25% return: no overflow; large values format correctly ✓
- AI Analysis: "spreading over 24 months gives up $5,630 in projected growth / compared with investing the full $10,000 immediately at 7% over 30 years" ✓
- Neutral disclaimer on smart lever: "This does not mean lump sum is always the right personal choice. Monthly investing may reduce entry-point stress, but this fixed-return model shows the cost of waiting to be fully invested." ✓
- AI Analysis disclaimer + page footer disclaimer: both mention fixed assumed return, spread period only (not full horizon), no tax/inflation/transaction costs/volatility, not financial advice ✓
- No investment recommendation language ✓
- Header search / `/calculators?q=lump`: Lump Sum vs Monthly Investment Calculator found in Investing category ✓
- CALC_INDEX: `available: true`, `icon: GitCompare`, `iconColor: '#0EA5E9'`, `searchLabel: 'Lump Sum vs DCA Calculator'` ✓
- Page header icon matches CALC_INDEX icon (GitCompare) ✓
- No console errors ✓
- `tsc --noEmit` clean ✓

### Math verified at defaults

`lumpFV = 10,000 × (1 + r)^120 = $20,097` at r = effective monthly rate for 7% monthly compounding ✓  
`dcaMonthly = 10,000 / 24 = $416.67` ✓  
`annuityFV = 416.67 × [(1+r)^24 − 1] / r` then grown by `(1+r)^96` = $18,702 ✓  
`gainDelta = 20,097 − 18,702 = $1,394` ✓  
`0% return: lumpFV = 10,000; dcaFV = 416.67 × 24 = 10,000; gap = $0` ✓

### Bugs fixed during QA / polish

- `DEFAULT_SPREAD` changed from `12` → `24` months (QA spec required 24mo as default)
- Mobile input layout restructured: `grid grid-cols-2` now wraps numeric inputs only; pill groups moved to a full-width section below a divider; pill CSS `min-width` constraints removed; Investment Horizon + Monthly Spread Period placed in `grid grid-cols-1 md:grid-cols-2` (side-by-side on md+, full-width on mobile)
- Regression QA passed after mobile layout patch: all pills functional, no overflow, results correct ✓

### Future V2 scope (not started)

Tax wrapper toggle (TFSA / RRSP / ISA / taxable); inflation adjustment on projected values; market volatility simulation (multiple return scenarios); lump sum deployed across multiple unequal entry points; reverse solver (what spread period costs X% in final value); partial lump sum + partial DCA hybrid scenario.

---

## Lump Sum vs Monthly Investment Calculator V1 — Validation & Lock

> Re-validated: 2026-07-20 · Result: **PASS — V1 LOCKED**

Full end-to-end re-validation of the original V1 QA Record above (formulas independently re-derived and verified from source, 36 independent test scenarios exercised via a standalone Node script, financial-assumption and copy review, PDF field-level verification via a standalone transpiled adapter test harness across Moderate/Strong/Minimal/zero-return scenarios, live browser QA, and technical QA) surfaced one display bug, one copy-accuracy gap, and three PDF-only consistency issues; all five were fixed under confirmed scope and independently re-verified. Lump-sum and monthly-investment formulas, comparison methodology, and compound-frequency handling were not touched.

### Validated

- Lump-sum and monthly-investment formulas independently verified.
- Monthly strategy confirmed as end-of-month ordinary-annuity timing.
- Both strategies confirmed to use the same comparison end date.
- Equal total capital confirmed across both strategies.
- Compound-frequency conversion validated across all supported frequencies.
- Zero-return equality state verified.
- NaN/Infinity display cascade fixed with finite-number guarding.
- "How It Works" contribution-timing copy corrected to match the actual methodology.
- PDF significance-threshold wording corrected from 5% to 0.5%.
- PDF advantage-color mapping aligned with the UI.
- Unsourced historical outperformance claim replaced with fixed-rate methodology wording.
- Responsive, PDF, SEO, TypeScript, and production-build QA passed.

### Fixes applied

1. **NaN/Infinity display cascade** (`LumpSumVsDCACalculator.tsx`) — `totalAmount` parsing used `Math.max(0, parseFloat(form.totalAmount) || 0)`, which does not catch `Infinity` (the `|| 0` idiom only guards against `NaN`/falsy, and `Infinity` is truthy). Fixed by parsing to `parsedTotal` and gating with `Number.isFinite(parsedTotal) ? parsedTotal : 0` before the `Math.max(0, ...)` clamp.
2. **"How It Works" contribution-timing copy** (`page.tsx`) — the static explanation described annuity-due (start-of-month) contribution timing, but the actual monthly-strategy math uses end-of-month ordinary-annuity timing. Corrected to: "Contributions are treated as end-of-month deposits: the first contribution compounds for H − 1 months; the last contribution compounds for H − S months."
3. **PDF significance-threshold wording** (`lumpSumVsDcaAdapter.ts`) — methodology copy stated the "similar outcomes" significance threshold was ">5% absolute gain difference," which did not match the actual `deltaIsSignificant` threshold used by the calculator. Corrected to ">0.5% absolute gain difference (as a share of total invested amount)."
4. **PDF advantage-color mapping** (`lumpSumVsDcaAdapter.ts`) — the PDF's `advantageAccent` used a three-way `Strong → teal / Moderate → amber / Minimal → slate` mapping that did not match the UI's actual two-state coloring. Corrected to `Minimal → amber / Moderate & Strong → teal`, aligned with the UI.
5. **Unsourced historical outperformance claim** (`lumpSumVsDcaAdapter.ts`) — the PDF's methodology paragraph stated "research consistently shows lump sum outperforms DCA approximately two-thirds of the time in equity markets," an uncited empirical claim not produced by this calculator. Replaced with wording that attributes the result to the calculator's own constant-positive-return assumption rather than an implied market forecast.

### Confirmed working

- 36 independent test scenarios (default, all 5 spread-period pills, all 5 horizon pills, all 4 compound-frequency pills, 0% return, $0 amount, large-value inputs) cross-checked against a standalone Node reimplementation of the formulas — all matched.
- PDF field-level verification via a standalone transpiled copy of `lumpSumVsDcaAdapter.ts` executed directly in Node (bypassing the browser's PDF renderer): confirmed `advantageAccent`, the "Lump Sum Advantage" results-row accent, composition-bar segment colors, and the insight paragraph wording across Default/Moderate, Strong, Minimal, and zero-return/equality scenarios.
- Live browser PDF downloads spot-checked across the same four scenarios for UI/PDF parity.
- `npx tsc --noEmit` and `npx next build` both clean after the fix round.
- No changes made to `lumpFV`, `dcaMonthly`, `annuityFV`, `gainDelta`, `advantageScore`, or any other computed financial value.

---

## TFSA Contribution & Growth Calculator V1 — QA Record

> QA completed: 2026-06-03 · Result: **PASS** · tsc clean

### Confirmed working

- Desktop (1280px): 7/5 grid, input card + results card side-by-side, no overflow
- Tablet (768px): stacked layout, no overflow
- Mobile (375px): two-column input grid; pill rows full-width below divider; no horizontal overflow; "One-Time Contribution" label fits; "Available Room" helper text short and readable
- Default scenario: balance $10,000 · room $7,000 · one-time $5,000 · monthly $150 · 6% · 15yr · Monthly → first-year plan $6,800 · room remaining $200 · not over-limit ✓
- Over-room state: monthly $200 → first-year plan $7,400 → over by $400 → red over-room warning fires; copy says "Verify with CRA" only; no penalty/legal advice language ✓
- Available room = $0: "Enter available room" placeholder, no gauge arc, results show "—" for room fields, no NaN ✓
- Available room = $500: over-room fires correctly (plan $6,800 > $500) ✓
- Available room = $7,000 (default): `roomUsedPct` 97.1%, badge "Nearly Full", no over-room ✓
- Available room = $50,000: badge "Partial", lever "Room Opportunity", no NaN ✓
- Balance = $0: results compute from one-time + monthly only, no NaN ✓
- One-time = $0, monthly = $0: safe empty state, no results shown ✓
- Monthly = $0: lump-sum-only projection correct, no division by zero ✓
- Large values (balance $1M, room $50k): all values format correctly, no horizontal overflow ✓
- 0% return: `calcFVRate` zero-rate path fires, no NaN, no division by zero; growth score 0/Poor/Caution ✓
- 6%, 15%, 25% returns: capped at 49.9% internally; all finite ✓
- All four compound frequencies (Annually/Semi-Ann./Monthly/Daily): results update, no NaN ✓
- Horizon pills (5/10/15/20/30yr): all update projection and AI Analysis ✓
- Donut: contributions + tax-free growth slices correct; center shows projected TFSA value ✓
- Room usage gauge: arc transitions; over-room badge red; nearly-full badge amber; partial badge teal ✓
- AI Analysis — Tax-Free Growth Score gauge: correct score/label/color per scenario ✓
- AI Analysis — Contribution Room Usage gauge: matches room card ✓
- Smart lever four states (over-room / room-opportunity / room-nearly-used / no-room): all render on mobile and desktop ✓
- Insight cards: Contribution Plan / Tax-Free Growth Potential / Over-Contribution Risk all update ✓
- Over-contribution card: orange when over-room; purple when within room; educational language only ✓
- No investment/tax/legal advice language anywhere on page ✓
- Page disclaimer: TFSA-specific, Canada-only, no mortgage or loan wording ✓
- "Verify with CRA My Account" appears in: page subtitle, input helper text, gauge placeholder, AI analysis text, inner disclaimer, footer disclaimer ✓
- Page does not claim to calculate exact CRA room ✓
- 2026 TFSA limit ($7,000) framed as illustrative/educational throughout ✓
- FAQ: 7 items covering TFSA basics, contribution room, why manual room entry, how room check works, over-contribution, withdrawals, assumptions ✓
- How It Works: Growth Projection formula, Room Check formula, Effective Monthly Rate formula, Assumptions — all present ✓
- Annual limit table: static JSX rows (no `.map()`) — see §Server Component Table Rule ✓
- Header search / `/calculators?q=tfsa`: TFSA Calculator found in Financial Planning category ✓
- CALC_INDEX: `available: true` ✓
- No console errors · no hydration warnings ✓
- `tsc --noEmit` clean ✓

### Math verified at defaults

`plannedFirstYear = 5,000 + 150 × 12 = 6,800` ✓  
`roomRemaining = 7,000 − 6,800 = 200` ✓  
`overRoom = false` (6,800 < 7,000) ✓  
Over-room test (monthly $200): `7,400 − 7,000 = $400` over ✓

### Server Component Table Rule

The TFSA annual limit table in `page.tsx` (`formulaContent`) was written as **static JSX `<tr>` rows** rather than the `as const` array `.map()` pattern used in some other calculator formula sections.

**Why:** In Next.js 15 App Router server components, an `as const` typed array declaration inside a top-level `const` that is passed as a JSX prop can trigger a runtime error when the module is evaluated during the RSC pass. The static JSX approach avoids this entirely with no functional downside.

**Rule for future server-component educational tables:** Write educational data tables as static JSX `<tr>` rows directly in `page.tsx`. Do not use `as const` arrays with `.map()` for inline table data inside server-component `const` declarations.

### Future V2 scope (not started)

Lifetime cumulative room calculator (from eligibility year, withdrawal history, prior contributions); multi-year contribution schedule; inflation-adjusted projected value; RRSP vs TFSA comparison toggle; withdrawal and recontribution modeling; spousal TFSA illustration.

---

## TFSA Contribution & Growth Calculator V1 — Follow-up Validation & Fix Round

> QA completed: 2026-07-19 · Result: **PASS — V1 Ready to Lock**

A full end-to-end re-validation (methodology reverse-engineered and confirmed from source, independent scenario validation across 13+ test cases via a standalone Node reimplementation, CRA-fact and copy verification, state/messaging edge-case audit, live browser + responsive + PDF verification, content/SEO review, and technical QA) closed one AUTO-PROCEED display fix in the TFSA component and one approved shared-adapter fix in the PDF layer, run as a follow-up round after the user flagged the shared-adapter issue for approval. Financial formulas (`calcFVRate`, room-check math, growth score, RRSP-specific logic) were explicitly out of scope and were not touched.

### Fixes applied

1. **`growthPct` display mislabeling** (`app/tfsa-calculator/TFSACalculator.tsx`) — two on-page locations displayed `results.growthPct.toFixed(1)}%` as a "tax-free growth" percentage, but `growthPct` was actually computed relative to total contributions, not projected value, producing a misleading figure. Both display sites replaced with an inline calculation, `((results.taxFreeGrowth / Math.max(1, results.projectedValue)) * 100).toFixed(1)}%`, so the displayed percentage matches its own label. No underlying calculation function was changed.
2. **PDF-only Rule of 72 wording** (`lib/pdf/adapters/canadaRegisteredAdapter.ts`, shared by TFSA and RRSP) — the `keyDrivers[0]` narrative used `72 / Math.max(input.annualRate, 0.1)`, which produced misleading output at 0% or near-0% returns (e.g., "funds approximately double every 720 years"). Added a threshold gate: at `annualRate <= 0` or where the resulting doubling period exceeds 100 years, the copy now falls back to neutral wording ("At the selected return rate, meaningful investment growth is limited...") instead of showing an extreme or undefined doubling claim. Normal positive rates are unaffected and retain the original Rule of 72 sentence with the calculated year count. Scope was confirmed limited to lines constructing `growthDriverText`/`keyDrivers[0]` — no other adapter output (executive summary, composition bar, `p1`/`p2`/`p3` insight paragraphs, inputs, results, methodology, disclaimer, filename/scenarioId generation, or any RRSP-specific field) was changed.

### Confirmed working

- Independent Node reimplementation of the TFSA growth/room-check methodology matched the live app across 13+ scenarios (defaults, zero balance, zero one-time/monthly contribution, room boundary/over/under states, all 4 compound frequencies, all 5 horizon pills, decimal and boundary rate values, room-exactly-full edge case)
- CRA-related copy (contribution room framing, "Verify with CRA My Account" placement, no-exact-room-calculation disclaimers, 2026 TFSA limit framed as illustrative) verified accurate throughout the page
- Responsive layout confirmed clean at 375/768/1280px, no horizontal overflow
- `growthPct` fix verified live across default, exactly-full-room, over-contribution, zero-return, and extreme-rate scenarios at both desktop and mobile widths — displayed percentage now matches its "tax-free growth" label in all cases
- Rule of 72 fix verified via standalone Node reproduction of the exact new logic across 0%, 0.3%, 0.72% (boundary), 1%, 6%, and 45% annual rates — 0% and very-low rates correctly fall back to neutral wording; boundary/normal/high rates correctly retain sane Rule-of-72 wording
- Rule of 72 fix verified live via PDF generation on both calculators: TFSA @ 0% and @ 6% (normal), RRSP @ 0% and @ 6% (normal) — all four PDFs generated with zero console errors
- RRSP-specific PDF fields (`marginalTaxRate`, `estimatedTaxRefund`, tax-reduction copy) confirmed unaffected by the shared-adapter change — same untouched code paths, RRSP page live-tested post-fix with no regressions
- `npx tsc --noEmit`: clean, before and after both fixes
- `npx next build`: clean, all 43 routes compiled and statically generated including `/tfsa-calculator` and `/rrsp-savings-calculator`
- No console errors, hydration warnings, or dev-server errors observed at any point during verification

### Known non-blocking finding (not fixed, out of scope)

**Sitewide `NumericInput` label-association gap.** Consistent with the same finding already on record from the Personal Loan, Car Loan, and other sibling-calculator follow-up rounds — the shared `NumericInput` component has no `id` prop, so no calculator using it can produce a working `<label htmlFor>` association. Not fixed here; flagged for a dedicated shared-component approval task.

---

## TFSA Contribution & Growth Calculator V1 — Validation & Lock

> Re-validated: 2026-07-20 · Result: **PASS — V1 LOCKED**

Full end-to-end re-validation (methodology reverse-engineered and independently re-derived from source via a standalone Node script — not copied from the production code — covering the growth formula, effective-monthly-rate derivation, all four compound frequencies, and the first-year room-check methodology; TFSA-room boundary testing; label and composition-percentage review; excess-contribution and score-state review; CRA-scope copy review; PDF field-level verification via a standalone `tsx` harness importing the real adapter directly; live browser QA including 8 named PDF-generation scenarios and responsive QA at 375/768/1280px; and technical QA) surfaced two display-only bugs, both fixed under confirmed AUTO-PROCEED scope and independently re-verified. Growth formula, effective monthly rate, compound-frequency conversion, first-year room-check formula, and score thresholds were not touched.

### Validated

- Growth methodology independently verified.
- Effective annual rate and compound-frequency conversion validated.
- End-of-month contribution timing confirmed.
- First-year TFSA room methodology verified.
- Current balance correctly excluded from contribution-room usage.
- Future annual room intentionally not modeled.
- CRA scope and educational disclaimers validated.
- Existing balance and new contribution labeling verified.
- Composition percentages verified.
- Excess-contribution state validated.
- Infinity/NaN input guard added using `Number.isFinite()`.
- Exactly-100% room badge standardized to "Fully Used."
- Responsive, PDF, SEO, TypeScript, and production-build QA passed.
- Growth Score and Room Status confirmed to be independent metrics and documented as accepted behavior.

### Fixes applied

1. **Infinity/NaN input guard** (`app/tfsa-calculator/TFSACalculator.tsx`) — `currentBalance`, `plannedOneTime`, and `monthlyContribution` parsing used `Math.max(0, parseFloat(s) || 0)`, which does not catch `Infinity` (the `|| 0` idiom only guards against `NaN`/falsy, and `Infinity` is truthy). Pasting `"Infinity"` or `"1e500"` into any of these fields produced a literal `NaN` in the Tax-Free Growth Score gauge. Fixed with a shared `parseAmt()` helper gated by `Number.isFinite()`, applied to all four unbounded numeric fields (matches the precedent set in the Lump Sum vs DCA Calculator fix).
2. **Room-usage badge inconsistency at exactly 100%** (`app/tfsa-calculator/TFSACalculator.tsx`) — the shared `roomBadge` computation had no 100%-specific case, so two display sites showed "Nearly Full" (the `≥85%` bucket) at exactly full room usage, while a third site had a one-off inline override producing "Fully Used" for the identical state — two different status words visible simultaneously on the same page. Added a `Math.round(roomUsedPct) >= 100 ? 'Fully Used'` case to the shared `roomBadge` computation and removed the now-redundant inline override, so all three sites read the same value.

### Confirmed working

- Independent from-scratch Node reimplementation of the FV/annuity formula, EAR/effective-monthly-rate derivation, and all four compound frequencies matched the app's own functions bit-for-bit (diff = 0.000000) across defaults, balance-only, one-time-only, monthly-only, all-combined, zero-return, short/medium/long horizons, every compound frequency, near-zero-decimal and max-clamp values, invalid pasted strings, and Infinity/NaN-inducing inputs.
- TFSA first-year room-check formula boundary-tested at no-contribution, partial-use, exactly-full-room, $0.01-below/above room, large-excess, zero-room, monthly-alone-exceeds, one-time-alone-exceeds, and combined-exceeds cases — all correct; current balance confirmed excluded from room usage; future-year room accumulation confirmed not modeled.
- UI/PDF parity confirmed via a standalone `tsx` harness importing `buildCanadaRegisteredReportData` directly from `canadaRegisteredAdapter.ts` (bypassing the browser's jsPDF renderer) across 10 named scenarios; composition-bar percentages summed to exactly 100% in every case.
- 8 required PDF-generation scenarios (Default, Existing-balance-only, Monthly-contribution-only, Exactly-full-room, Excess-room, Zero-return, Long-horizon, Large-value) generated live in-browser with zero console errors.
- Responsive QA at 375/768/1280px: zero horizontal overflow (verified via a full-page DOM `scrollWidth`/`clientWidth` scan, not visual spot-check only), gauges/charts/legends/warning cards/large numbers/AI cards/PDF button all rendered correctly at every width, no console errors.
- The Infinity-guard fix verified live: pasting `"Infinity"` into Current Balance now computes as if balance were $0, matching the independently-computed value exactly, with no NaN anywhere.
- The badge fix verified live: re-ran the exactly-full-room scenario ($5,800 one-time + $100/mo against $7,000 room) post-fix — all dollar figures identical to pre-fix ($55,586 / $26,786 / $28,800 / $7,000 / $0), only the badge text changed, now consistently "Fully Used" in all three locations.
- `npx tsc --noEmit`: clean.
- `npx next build`: clean, all 43 routes generated, `/tfsa-calculator` unchanged at 10.5 kB / 124 kB First Load JS.
- No changes made to `calcFVRate`, `getEffectiveMonthlyRate`, the room-check formula, growth score thresholds, or any other computed financial value.

### Accepted, non-blocking: Growth Score / Room Status are independent metrics

The Tax-Free Growth Score (compounding-quality metric) and Room Usage state (CRA-room-compliance metric) are computed independently by design, so a scenario can legitimately show "100/100 Excellent" growth score simultaneously with "Over Limit" room state (reproduced live, e.g. $0 balance / $1,000 room / $500 monthly / 49.9% rate / 30yr). This is two independently-valid metrics rather than a math error and was reviewed and accepted as-is — no display-precedence or scoring-formula change made.

---

## CMHC Mortgage Insurance Calculator V1 — QA Record

> QA completed: 2026-06-05 · Result: **PASS** · tsc clean

### Confirmed working

- Desktop (1280px): 7/5 grid, input card + results card side-by-side, no overflow
- Mobile (375px): single column, no horizontal overflow (confirmed programmatically — `scrollWidth === 375`)
- Route loads, no server errors, no console errors, no hydration warnings
- Navigation, search, and CALC_INDEX all find CMHC Insurance Calculator correctly
- Default scenario ($650K price / $50K down / 25yr): $24,000 CMHC premium @ 4.00% → $624,000 total mortgage ✓
- Down payment $ / % toggle: syncs correctly in both directions; helper text updates; no NaN
- Amortization 25/30yr pills: update correctly; no state bleed
- First-Time Home Buyer and New Build toggles: all four combinations work
- 30-year warning state: amber inline warning + "CMHC Insured — 30yr Warning" results badge when amortization=30, FTHB=No, NewBuild=No ✓
- Below-minimum state: red badge, $0 premium, correct gap shown ✓
- 20%+ no-premium state: teal "No Insurance Required" badge, $0 CMHC premium ✓
- $1.5M+ ineligible state: red "CMHC Ineligible" badge, correct disclaimer ✓
- CMHC premium tiers confirmed: 5%=4.00% / 10%=3.10% / 15%=2.80% / 20%=0 ✓
- Minimum down payment formula: ≤$500K=5%, $500K–$1,499,999=(5% on first $500K + 10% above) ✓
- CMHC Premium Impact donut: teal base mortgage / amber premium; center=total mortgage; legend with % share; readable on mobile
- CMHC Premiums by Down Payment chart: 7 bars at 5%/7.5%/10%/12.5%/15%/17.5%/20%; selected bar amber + outline + white bubble; faded amber non-selected; teal $0 bar at 20%; 58% bar width; no overflow
- AI Analysis: status card + smart threshold lever + 3 insight cards + Insurance Summary stats grid — all stack correctly on mobile
- No NaN / Infinity anywhere in page text across all states ✓
- `tsc --noEmit` clean ✓

### Math verified at defaults

`minDownPayment($650K) = 500,000×0.05 + 150,000×0.10 = $25,000 + $15,000 = $40,000` ✓  
`baseMortgage = 650,000 − 50,000 = $600,000` ✓  
`cmhcRate(7.69%) = 4.00%` ✓  
`cmhcPremium = 600,000 × 0.04 = $24,000` ✓  
`totalMortgage = 600,000 + 24,000 = $624,000` ✓

### Bugs / polish fixed during build and QA

1. **Structure rebuilt to V2 pattern** — Initial version used a custom paragraph-only AI Analysis layout. Rebuilt to match Mortgage Qualifier Calculator V2 structure: status card + dark smart lever card + three insight cards + stats grid.
2. **Down payment $ / % toggle added** — V1 spec required dual-mode input; implemented with mode sync on toggle.
3. **Input button style updated** — Toggle buttons (amortization, FTHB, New Build) changed to match Personal Loan Calculator solid-teal-selected / muted-slate-unselected style.
4. **Down payment prefix** — Amount-mode prefix changed from `CA$` to `$` to prevent mobile input truncation (same pattern as Canadian Mortgage Calculator down payment input).
5. **Visual cards iterated** — Original horizontal segmented bar → replaced with: (left) DonutChart matching Investment Fees Calculator size/style; (right) 7-bar vertical comparison chart matching Personal Loan Term Comparison proportions.
6. **Color system corrected** — amber/orange = CMHC insurance cost; teal/green = no premium / positive outcome. Applied consistently across donut, donut legend value text, bar chart fills and outline.

### Accepted V1 concern

`$ / %` toggle has minor round-trip precision drift (e.g., $50,000 → 7.69% → $49,985). This is a floating-point rounding artifact, not a logic bug. Accepted for V1.

### Future V2 scope (not started)

Province selector; provincial sales tax on CMHC premium (applicable in ON, QC, MB, SK — payable at closing, not financed); more detailed lender/eligibility explanation; optional side-by-side down payment scenario comparison; possibly integrate estimated mortgage payment impact (not amortization schedule unless separately planned).

---

## FIRE Calculator V1 — QA Record

> QA completed: 2026-06-04 · Result: **PASS** · tsc clean

### Confirmed working

- Desktop (1280px): 2-column grid, input card + results card side-by-side, no overflow
- Tablet (768px): stacked layout, no overflow; AI Insight header buttons stack below title
- Mobile (375px): single column, no horizontal overflow (confirmed programmatically — 0 overflowing elements)
- Default scenario: age 30 · assets $50,000 · monthly $1,500 · expenses $48,000 · 7% · 25× → FIRE target $1,200,000 · progress 4% · gap $1,150,000 · FIRE age 53 · 23 years ✓
- FIRE multiple pills: 20×=$960k/Age 50 · 25×=$1.2M/Age 53 · 30×=$1.44M/Age 55 · 33×=$1.584M/Age 56 — all correct ✓
- Compound frequency pills (Annually/Semi-Ann./Monthly/Daily): all reactive, results update ✓
- Annual Expenses = $0: clean fallback message ("Enter your annual expenses"), no NaN, no chart shown ✓
- Expenses $12,000: target $300,000 · Age 39 ✓
- Expenses $200,000: target $5,000,000 · Age 71 ✓
- Assets = $0: gap $1,200,000 · Age 55 · 0% progress ✓
- Monthly investment = $0 + assets = $0: "Not reachable" state ✓
- Already FI (assets $2M > target $1.2M): FIRE Age = current age (30) · 100% progress ✓
- Return = 0%: Age 94 (linear solve: gap $1.15M ÷ $1,500/mo) — no NaN ✓
- Return = 25%: Age 40 ✓
- Annual income blank/$0: savings rate hidden (`savingsRate = null`) ✓
- Annual income $100,000: savings rate shown ✓
- FIRE Progress Journey layered chart: Initial Assets / Future Contributions / Investment Growth stacked areas; Portfolio Value teal line; orange dashed FIRE Target line; FIRE Age callout — all correct at all breakpoints ✓
- Financial Independence Progress semi-circle gauge: renders correctly; target/portfolio/gap/FIRE age rows correct ✓
- AI Analysis: Readiness Score gauge · FI Progress gauge · Building Toward FI card · Savings Pace · FIRE Target · Time to Independence insight cards — all render ✓
- No NaN / Infinity / blank UI across all scenarios ✓
- No horizontal overflow at 375px, 768px, or 1280px ✓
- No console errors · no hydration warnings ✓
- Copy: educational, not advisory; no guaranteed FIRE language; 4% rule described as "widely cited rule of thumb — not guaranteed" ✓
- Disclaimer: covers taxes, inflation, investment fees, CPP/OAS, Social Security, pension income, healthcare costs, sequence-of-returns risk ✓
- CALC_INDEX `available: true` · search "fire" → FIRE Calculator found in Retirement category ✓
- `tsc --noEmit` clean ✓

### Math verified at defaults

`FIRE target = 48,000 × 25 = $1,200,000` ✓  
`progress = 50,000 / 1,200,000 × 100 = 4%` ✓  
`gap = 1,200,000 − 50,000 = $1,150,000` ✓  
`FV at month 276 (23yr) ≈ $1,202,729 ≥ $1,200,000` → FIRE Age 53 ✓

### Bugs / polish fixed during QA

1. **FIRE Progress Journey chart** — original single-line chart replaced with layered stacked-area chart: Initial Assets (slate), Future Contributions (soft blue), Investment Growth (teal) — three polygons beneath the portfolio line. `FireChartSample` extended with `ia` and `tc` fields; `sampleAt()` inner function computes both per data point.
2. **AI Insight header layout** — tablet/mobile: buttons stacked below title instead of crowding the row (`sm:flex-row` → `lg:flex-row`). Desktop unchanged.

### Future V2 scope (not started)

Inflation adjustment on FIRE target and projected value; withdrawal-rate modeling (portfolio drawdown phase); CPP/OAS/Social Security income offset; tax-wrapper toggle (RRSP/TFSA/401k); detailed year-by-year growth schedule table (Detailed Schedules Patch V2); spousal/joint FIRE view; Monte Carlo / sequence-of-returns simulation.

---

## FIRE Calculator V1 — Follow-up Validation & Fix Round

> Re-validated: 2026-07-19 · Result: **PASS** · financial formulas unchanged

### Fixes applied

1. **Hero "Projected Portfolio" label** (`FIRECalculator.tsx`) — previously always read "Projected Portfolio at FIRE" even in the not-reachable state (no FIRE date exists), implying a date that isn't projected to occur. Now reads "Projected Portfolio (20 Years)" whenever `fireAge === null`.
2. **Savings Pace contributions-total copy** (`FIRECalculator.tsx`) — the displayed contributions figure previously included `currentAssets` inside `totalContribs`, double-counting starting assets as if they were contributions. Now derives the displayed figure as `Math.max(0, totalContribs - currentAssets)`, and the sentence reads "your contributions total $X" instead of "total contributions reach $X".
3. **PDF adapter parity fix** (`lib/pdf/adapters/fireAdapter.ts`) — the composition bar and every "Total Contributions" PDF field used raw `totalContribs` (same double-count as #2) and computed composition-bar percentages against `fireTarget` instead of the actual projected value at the FIRE date. Both now use a shared `contribsOnly = totalContribs - currentAssets` value (5 call sites) and the composition-bar denominator switched from `fireTarget` to `projectedAtFIRE`, matching the UI exactly.

### Investigated, left documented (not fixed, per explicit instruction)

- **Five-years-sooner lever rounding (Finding B)** — the lever computes its target horizon as `roundedYearsToFIRE − 5` (whole years, ×12) rather than a literal `monthsToFIRE − 60`. Fully quantified this round: maximum discrepancy is **11 months**, always in the conservative direction (lever target is later than a literal 60-months-sooner point, never earlier); discrepancy is exactly 0 whenever `monthsToFIRE` is a multiple of 12; a mechanically distinct 12-month discrepancy occurs right at the `yearsToFIRE = 5` boundary due to the `Math.max(1, ...)` floor. Boundary-tested: exactly 5y / 5y1mo / 4y11mo / already-FI / unreachable / zero-return / zero-contribution / decimal-contribution — no crashes, no NaN, no negative values in any case. Left as-is per user instruction excluding "Years-to-FIRE rounding" from this round's changes.

### Confirmed working (this round)

- Readiness score: every threshold boundary (progress cap at 100%, age-bonus breaks at 5/10/20/35y, savings-bonus breaks at 15/30/50%, label breaks at 45/65/80) transitions cleanly with no off-by-one or floating-point edge issues.
- Savings rate: silently clamps at 100% for any input ≥100% (carried-forward minor finding, no UI disclosure — not in scope this round).
- PDF generation verified clean across Already-FI, Not-reachable, On-track-with-savings-rate, and Building (sooner-lever) scenarios.
- 768px (tablet) breakpoint: no horizontal overflow, chart legend wraps via `flex-wrap`, zero elements exceed viewport bounds (verified via DOM measurement).

### Known non-blocking findings (not fixed, out of scope)

- Savings-rate 100% clamp has no visual disclosure when the true rate exceeds 100%.
- Finding A (years-to-FIRE ceiling rounding, flagged in a prior validation round) remains a separate open item, explicitly excluded from this round's scope.

---

## Retirement Savings Calculator V1 — QA Record

> QA completed: 2026-06-03 · Result: **PASS** · tsc clean

### Confirmed working

- Desktop (1280px): 7/5 grid on input/results, 7/5 grid on chart/gauge, AI Analysis 2-col; no overflow
- Tablet (768px): stacked layout, no overflow
- Mobile (375px): two-column input grid; pill row full-width; no horizontal overflow
- Default scenario: savings $25,000 · monthly $500 · 6% · 35→65 · goal $1,000,000 · Monthly → projected $652,822 · contributions $205,000 · growth $447,822 · gap $347,178 · additional monthly $345.62 · goal progress 65% · readiness 61/Fair/Watch ✓
- Behind-target state: Behind Target badge, Action Required lever (full-width hero `+$345.62/mo` + two stat cards), amber accent throughout ✓
- On-track state: Monthly $1,500 → On Track badge, teal lever with surplus displayed, no Action Required copy ✓
- Age edge cases: 65/65 → clamps to 1yr; 66/65 → clamps to 1yr; 25/65 → 40yr; no NaN/Infinity ✓
- 0% return: PMT reverse-solve uses `(goal − currentSavings) / n` path, no division by zero ✓
- All four compound frequencies (Annually/Semi-Ann./Monthly/Daily): results update cleanly ✓
- $0 savings + $500/mo: results compute from contributions only, no NaN ✓
- $0 monthly + $25,000 savings: lump-sum-only projection correct ✓
- $0 goal: no-goal state, Enter Goal prompt, no NaN ✓
- Both zero: empty state, no results rendered ✓
- Large values ($1M savings / $10k/mo / $5M goal): format correctly, no overflow ✓
- Growth Journey chart: 3 stacked area bands render; orange dashed goal line present; retirement-age callout dot + value label present; Age 35 / Age 50 / Age 65 x-axis labels correct ✓
- Goal Progress gauge: semi-circle SVG arc renders; progress %, badge, gap/surplus rows correct ✓
- Retirement Readiness Insight header: "AI-assisted insights by FinCalc Smart" sublabel ✓
- CALC_INDEX `available: true`; search "retirement" → Retirement Savings Calculator found ✓
- No console errors · no hydration warnings ✓
- `tsc --noEmit` clean ✓

### Math verified at defaults

`projectedSavings = calcFVRate(r_monthly_6%, 360, 25000, 500) = $652,822` ✓  
`totalContributions = 25,000 + 500 × 360 = $205,000` ✓  
`investmentGrowth = 652,822 − 205,000 = $447,822` ✓  
`goalGap = 1,000,000 − 652,822 = $347,178` ✓  
`additionalMonthlyNeeded = (1,000,000 − 25,000×(1+r)^360) × r ÷ ((1+r)^360 − 1) − 500 = $345.62` ✓  
`goalProgressPct = 652,822 / 1,000,000 × 100 = 65.3%` ✓

### Bugs fixed during QA / polish

**1. Smart lever layout** — Original 3-column side-by-side flex layout (hero | required total | goal gap) caused crowding and potential overflow on narrow desktop columns. Replaced with single unified flex-col layout: full-width amber hero block + `grid grid-cols-2` stat cards below + supporting copy. No mobile/desktop branching needed.

**2. X-axis label overflow** — All three x-axis labels used `transform: translateX(-50%)`. First label at `left: 0%` extended outside the left edge; last label at `left: 100%` extended outside the right edge, causing 14px `scrollWidth` overflow on the chart container. Fixed: first label uses `transform: none` (left-anchored); last label uses `translateX(-100%)` (right-anchored); middle label keeps `translateX(-50%)`.

**3. "Powered by FinCalc Smart AI" → "AI-assisted insights by FinCalc Smart"** — Sublabel wording updated per platform direction.

### Flagship AI Insight Module — Pattern Note

The "Retirement Readiness Insight" AI section is the first calculator to use the named flagship insight module pattern. Confirmed as standard with FIRE Calculator V1 ("Financial Independence Insight"). **Pattern now documented in `AGENT_MANUAL.md §9`.**

### Future V2 scope (not started)

CPP/OAS/Social Security income modeling; withdrawal-rate phase (decumulation); inflation-adjusted projected value; tax-wrapper toggle (RRSP/401k/TFSA); retirement spending needs; detailed year-by-year growth schedule table (Detailed Schedules Patch V2); FIRE crossover connection; spousal/joint retirement view.

---

## Retirement Savings Calculator V1 — Follow-up Validation & Fix Round

> QA completed: 2026-07-19 · Result: **PASS — V1 LOCKED**

A full end-to-end re-validation (methodology reverse-engineered and confirmed from source, independent scenario validation across 20 test cases via a standalone Node reimplementation, financial-assumption and copy review, live browser + DOM-verified responsive QA at 375/768/1280px, PDF validation across 6 named scenarios via an independent cross-check of the adapter's derived fields, SEO review, and technical QA) closed one approved AUTO-PROCEED fix. Financial formulas (`calcFVRate`, `getEffectiveMonthlyRate`, the PMT reverse-solve, and the Readiness Score weighting) were explicitly out of scope and were not touched.

### Fixes applied

1. **FAQ / "How It Works" Assumptions-list parity** (`app/retirement-planning-calculator/page.tsx`) — the FAQ's "What assumptions does this calculator make?" answer named 5 assumptions, 2 of which ("no future contribution increases modeled," "no RRSP/401(k)/IRA/TFSA room checking") were absent from the "How It Works → Assumptions" bullet list. Added the 2 missing bullets ("No contribution increases," "No account room checking") so both sections now enumerate the same 7 assumptions. Copy-only change — no formula, clamp, or scoring logic touched.

### Confirmed working

- Independent Node reimplementation of `computeResults()` matched the live source byte-exact across 20 scenarios (the 17 required categories plus no-goal, large-surplus, and all-zero extras), including all 4 compounding frequencies, 5 horizon lengths, decimal and boundary values (age 18/99/100, rate 49.9%, goal-progress thresholds at exactly 100/75/50%), and invalid-input handling — no `NaN`/`Infinity` propagation anywhere
- PDF adapter (`lib/pdf/adapters/retirementAdapter.ts`) derived fields independently cross-checked against the UI results across all 6 named PDF scenarios (Default, Zero return, Zero contribution, High contribution, Near retirement, Long horizon): composition bar sums to exactly 100.0000% in every case, goal-progress % in the PDF executive summary matches the UI badge exactly, and no `$0` self-contradiction occurs between `isBehind` and the Required/Additional Monthly fields in any scenario
- Live "Download PDF" click (Default scenario) completed with zero console errors
- Responsive QA at 1280/768/375px verified via direct DOM measurement (`getBoundingClientRect`/`scrollWidth`) after a session-specific screenshot-tool rendering artifact made pixel screenshots unreliable this round — confirmed zero horizontal overflow at all 3 widths, the Growth Journey chart legend correctly wraps to 2 rows at 375px without overflowing the viewport, all gauge/chart SVGs stay within their containers, no clipped currency text among 41 checked dollar-figure elements, and the mobile/desktop Smart Lever blocks (`lg:hidden` / `hidden lg:flex`) flip exclusively with no duplicate or missing content at either breakpoint
- Financial-assumption review: no UI, PDF, or FAQ copy implies guaranteed returns, guaranteed retirement outcome, or constitutes advice; the "not modeled" disclosure is consistent across the UI footer disclaimer, the AI-insight-panel disclaimer, and the PDF disclaimer/`notModeled` list
- `npx tsc --noEmit`: clean, before and after the fix
- `npx next build`: clean, 43/43 static pages, `/retirement-planning-calculator` unchanged at 15.7 kB / 118 kB First Load JS

### Known non-blocking findings (not fixed, out of scope)

- **`goalProgressPct`/`statusLabel` rounding-boundary self-contradiction.** `goalProgressPct` can display as rounded "100%" while `statusLabel` (computed from the unrounded raw value) still reads "Nearly There," producing copy like "Nearly There · 100% of goal" in 3 render sites (results-card badge, Goal Progress gauge center %, gauge status label). Reproduced independently at a goal set $0.10 above the projected balance. Rare in practice (requires the goal to land within pennies of the exact projection). Not fixed — any fix touches the status-threshold comparison, which is scoring-adjacent logic reserved for approval.
- **Sitewide `NumericInput` label-association gap.** Consistent with the same finding already on record from the Personal Loan, Car Loan, TFSA, and RRSP follow-up rounds — the shared `NumericInput` component has no `id` prop, so no calculator using it can produce a working `<label htmlFor>` association. Not fixed here; flagged for a dedicated shared-component approval task.

---

## RRSP Savings Calculator V1 — QA Record

> QA completed: 2026-06-04 · Result: **PASS** · tsc clean

### Confirmed working

- Desktop (1280px): 7/5 grid, input card + results card side-by-side, no overflow
- Tablet (768px): stacked layout, no overflow
- Mobile (375px): two-column input grid, pill rows full-width below divider, no horizontal overflow
- Default scenario: balance $25,000 · room $32,490 · one-time $10,000 · monthly $500 · 33% tax · 6% · 20yr · Monthly → projected $346,878 · contributions $155,000 · growth $191,878 · tax reduction $5,280 · first-year plan $16,000 ✓
- Over-room state: room $5,000 / first-year plan $16,000 → over by $11,000; amber/red gauge fires; "100%+" center label; tax estimate caps at room; over-room warning in results + AI Analysis; no penalty/legal advice language ✓
- availableRoom = 0: gauge shows "Enter deduction room above" placeholder; tax estimate = $0 (not based on first-year plan); no NaN ✓
- availableRoom = $1,000 (small room): over-room fires correctly; tax estimate = $330 (1,000 × 33%) ✓
- availableRoom = $100,000 (large room): badge "Partial", lever "Room Opportunity", no NaN ✓
- Tax rate 0%: tax estimate $0 · 20%: $3,200 · 33%: $5,280 · 50%: $8,000 — all correct ✓
- Over-room tax cap: firstYr $22,000, room $20,000 → taxBase = $20,000 → $6,600 at 33% ✓ (not $7,260)
- Zero balance, zero one-time, zero monthly: safe results; no NaN/Infinity ✓
- 0% return: safe, growth = 0, no division by zero ✓
- 25% return: large values finite and readable ✓
- All compound frequencies (Annually/Semi-Ann./Monthly/Daily): results update correctly ✓
- Horizon pills (5/10/15/20/30yr): all update projection and AI Analysis ✓
- RRSP Growth Composition card: centered projected value, pill composition bar (no donut), legend, stat rows ✓
- Contribution Room + Tax Refund Impact card: Retirement-style semi-circle gauge, condensed stat rows, "100%+" over-limit label ✓
- AI Analysis: Growth Score gauge + Room Usage gauge + Smart Lever (4 states) + 3 insight cards ✓
- Smart Lever states: over-room (amber) / room-opportunity (teal) / room-nearly-used (teal) / no-room (neutral) ✓
- Estimated Tax Reduction insight card: "simplified estimate only" copy present; no tax advice language ✓
- No horizontal overflow at any breakpoint ✓
- No console errors; no hydration warnings ✓
- `tsc --noEmit` clean ✓
- CALC_INDEX `available: true`; `/calculators?q=rrsp` → RRSP Savings Calculator found in Financial Planning ✓
- Page icon `Landmark` (teal) matches CALC_INDEX icon ✓
- Canada-only disclaimer present; CRA My Account / Notice of Assessment / Form T1028 all referenced ✓
- Page does not claim to calculate exact CRA room ✓
- No CPP/OAS/RRIF/spousal RRSP/HBP/LLP copy ✓

### Math verified at defaults

`plannedFirstYear = 10,000 + 500 × 12 = 16,000` ✓  
`roomRemaining = 32,490 − 16,000 = 16,490` ✓  
`roomUsedPct = 16,000 / 32,490 × 100 = 49.2%` ✓  
`taxRefundBase = min(16,000, 32,490) = 16,000` ✓  
`estimatedTaxRefund = 16,000 × 0.33 = 5,280` ✓  
`projectedValue = calcFVRate(r_monthly_6%, 240, 35,000, 500) = 346,878` ✓

### Bugs / polish fixed during build and QA

1. **Left visual card** — Initial build used a `DonutChart` (same as TFSA). Replaced with RRSP Growth Composition: centered projected value + pill-shaped horizontal composition bar (navy for contributions, teal for growth) + stat rows. Removes circle-chart repetition from the page.
2. **Right visual card** — Small 148×148 circular arc gauge replaced with the Retirement-style semi-circle (SEMI_R=88, strokeWidth=22, larger and visually stronger).
3. **Over-limit center label** — `'!!'` replaced with `'100%+'`; center text color uses `roomGaugeColor` (red) in over-room state.
4. **availableRoom = 0 tax estimate edge case** — `taxRefundBase` fallback was `plannedFirstYear`; corrected to `0` so no room entered → tax estimate = $0.

### Tax estimate logic — full rules

| State | taxRefundBase | Behaviour |
|---|---|---|
| availableRoom = 0 | 0 | Tax estimate = $0; no room entered |
| Within room | `firstYearPlan` | Full first-year plan is deductible base |
| Over-room | `availableRoom` | Capped at entered room (over-room portion is not deductible) |

### Future V2 scope (not started)

Spousal RRSP illustration; RRSP vs TFSA comparison toggle; RRIF conversion modeling (defer to separate RRIF calculator); HBP / LLP illustration (separate product scope); CPP/OAS income bridge; inflation-adjusted projected value; multi-year contribution schedule; CRA RRSP room history table (educational only, not CRA data); detailed year-by-year growth schedule (Detailed Schedules Patch V2).

---

## RRSP Savings Calculator V1 — Follow-up Validation & Fix Round

> QA completed: 2026-07-19 · Result: **PASS — V1 LOCKED**

A full end-to-end re-validation (methodology reverse-engineered and confirmed from source, independent scenario validation across 17 test cases via a standalone Node reimplementation, CRA-fact and copy verification, state/messaging edge-case audit, live browser + responsive + PDF verification, content/SEO review, and technical QA) closed three approved fixes: one stale-year copy update, one display-formatting bug, and one approved shared-adapter fix in the PDF layer. Financial formulas (`calcFVRate`, room-check math, tax-reduction estimate, growth score) were explicitly out of scope and were not touched.

### Fixes applied

1. **Stale 2025 RRSP figures updated to 2026** (`app/rrsp-savings-calculator/RRSPSavingsCalculator.tsx`, `app/rrsp-savings-calculator/page.tsx`) — the default deduction-room value and all "How RRSP Deduction Room Works" / FAQ copy referenced the 2025 annual dollar maximum ($32,490) and the 2025 filing deadline framing ("March 2, 2026"). Updated to the 2026 annual dollar maximum ($33,810) and the 2027 filing-deadline framing ("60th day of 2027 — typically March 1, 2027"), with wording that explicitly distinguishes the annual dollar ceiling from the user's personal CRA-issued deduction limit, so no copy implies every user has $33,810 of available room.
2. **Fractional-overage display bug** (`app/rrsp-savings-calculator/RRSPSavingsCalculator.tsx`) — a sub-$1 over-room excess (e.g. $0.04) rendered as `$0` (or `-$0`) under the whole-dollar `fmtCAD` formatter, misleadingly implying no overage. Added a `fmtOverage()` helper that uses cents-precision `fmtCADx` only when `0 < overRoomBy < 1`, and whole-dollar `fmtCAD` otherwise. Applied at all 6 display sites that show `overRoomBy` (results-card room line, room-status pill warning, Contribution Room card remaining-room line, AI insight room-usage message, and the mobile + desktop over-room banner numbers). The underlying strict `plannedFirstYear > availableRoom` comparison and the `overRoomBy` calculation itself were not altered.
3. **PDF zero-tax-estimate parity** (`lib/pdf/adapters/canadaRegisteredAdapter.ts`, shared by TFSA and RRSP) — when marginal tax rate is 0% or entered deduction room is 0, the UI intentionally shows no tax-reduction estimate, but the PDF previously computed and displayed a numeric "$0" estimated tax reduction in these cases, misleadingly implying a calculated result of zero rather than "not calculated." Added a `showTaxEstimate` gate (`!isTFSA && marginalTaxRate > 0 && availableRoom > 0`) that switches the PDF's narrative paragraph, executive-summary metric, and results-table row to neutral "Not estimated" wording when the gate is false. Scope was confirmed limited to the RRSP-only branches of `p1`, `executiveSummary.metrics`, and `results.rows` — no TFSA branch, and no other adapter output, was changed. The underlying tax-reduction formula was not altered.

### Confirmed working

- Independent Node reimplementation of the RRSP growth/room-check/tax-estimate methodology matched the documented formulas across 17 scenarios (defaults, zero return, zero marginal tax rate, zero room, plan-exactly-equals-room, room-opportunity, room-nearly-used, over-room, zero balance/one-time/monthly, high-balance/long-horizon, all 4 compound frequencies, all 5 horizon pills, decimal and boundary rate values, marginal-rate clamp, all-zero inputs, over-room + zero tax rate)
- Repo-wide grep confirmed zero remaining stale 2025 RRSP references outside this file after Fix 1
- Fix 2 verified via standalone Node reproduction of the exact `fmtOverage` logic: sub-dollar overage displays in cents (e.g. `$0.04`), exact-equality produces no warning (`overRoom` false), normal overage and the $1.00 boundary both display as whole dollars — confirmed at all 6 call sites via source grep after the fix (2 sites — the mobile and desktop over-room banner numbers — were found still on `fmtCAD` during final re-verification and corrected)
- Fix 3 verified via standalone Node reproduction of the exact `showTaxEstimate` logic across RRSP-default, zero-marginal-rate, zero-room, and both-zero scenarios (all correctly gate to "Not estimated") and TFSA scenarios (gate structurally excluded, TFSA output unaffected)
- `npx tsc --noEmit`: clean
- `npx next build`: clean, all 43 routes compiled and statically generated including `/rrsp-savings-calculator` and `/tfsa-calculator`

### Known non-blocking findings (not fixed, out of scope)

- **Live interactive re-computation testing was blocked by a browser-preview-tool limitation in this session** — typed/set input values updated the DOM but the React `results` recomputation did not visibly refresh in the preview pane. This was reproduced identically on an unmodified sibling calculator (`/tfsa-calculator`) and with a plain button-click state setter unrelated to any text-input path, ruling out a regression in this session's edits. Verification was substituted with independent Node.js re-computation of the exact source logic against all required scenarios; this is a tooling/environment artifact, not a code defect.
- **Sitewide `NumericInput` label-association gap.** Consistent with the same finding already on record from the Personal Loan, Car Loan, TFSA, and other sibling-calculator follow-up rounds — the shared `NumericInput` component has no `id` prop, so no calculator using it can produce a working `<label htmlFor>` association. Not fixed here; flagged for a dedicated shared-component approval task.

---

## RRSP Savings Calculator V1 — Validation & Lock

> Validated: 2026-07-20 · Result: **PASS — V1 LOCKED**

A final boundary/overflow follow-up round (independent re-derivation of the "Fully Used" room-usage badge boundary condition, live boundary testing at 99.49%/99.50%/99.99%/exactly-100%/just-above-100% room usage across all three badge display sites, investigation of the two previously-flagged `1e308` overflow scenarios for reachability through the live `NumericInput` fields and downstream NaN/Infinity propagation, and final `tsc`/`next build` verification) closed two approved fixes, both display/input-guard only. Growth methodology, effective monthly-rate/compound-frequency handling, first-year RRSP room formula, and the tax-reduction estimate formula were explicitly out of scope and were not touched.

### Validated

- Growth methodology independently verified.
- Effective monthly-rate and compound-frequency handling validated.
- End-of-month monthly contribution timing confirmed.
- First-year RRSP room methodology verified.
- Existing balance correctly excluded from room usage.
- Future annual room intentionally not modeled.
- Tax-refund estimate correctly capped at available room.
- Excess contributions do not inflate the refund estimate.
- Existing balance and contribution labeling validated.
- Growth composition validated.
- Excess-room and score states validated.
- Infinity/NaN input guard added.
- Extreme finite inputs capped locally at `Number.MAX_SAFE_INTEGER` to prevent overflow.
- "Fully Used" badge changed to use actual remaining-room state.
- PDF/UI parity validated.
- Responsive QA passed at 375px, 768px, and 1280px.
- TypeScript and production build passed.

### Fixes applied

1. **"Fully Used" room badge boundary corrected** (`app/rrsp-savings-calculator/RRSPSavingsCalculator.tsx`) — the badge condition used `Math.round(roomUsedPct) >= 100`, which JavaScript's round-half-up behavior causes to fire at 99.50% usage (and any value up to 99.99%) despite positive dollars of room still remaining. Corrected to `roomRemaining <= 0`, which is exactly zero only when the plan truly consumes 100% of available room. Live-verified at 99.49% (Nearly Full, correct), 99.50% with positive room remaining (now Nearly Full, was previously Fully Used), 99.99% with positive room remaining (now Nearly Full), exactly 100% / $0 remaining (Fully Used), and above 100% (Over Limit) — consistent across all three badge display sites, zero console errors.
2. **`parseAmt()` overflow guard added** (`app/rrsp-savings-calculator/RRSPSavingsCalculator.tsx`) — pathological finite inputs (e.g. `1e308`) were reachable through the live numeric fields and, once multiplied inside the growth formula, could overflow to `Infinity` and produce `NaN`/`Infinity` in the results panel, charts, AI Insights, and PDF. `parseAmt()` now clamps to `Math.min(n, Number.MAX_SAFE_INTEGER)` in addition to its existing `Number.isFinite()` guard, so extreme finite inputs are capped locally before reaching the growth formula. This is a numeric safety ceiling, not a financial policy threshold — no legitimate contribution/balance value is affected.

### Confirmed working

- Badge-boundary regression suite (99.49% / 99.50% / 99.99% / exactly 100% / above 100%) passed at all three UI display sites, live-verified via `form_input` + full-page text-content scan.
- Both previously-flagged `1e308` overflow scenarios re-tested live through the actual `NumericInput` fields post-fix: values clamp to `Number.MAX_SAFE_INTEGER`, no `NaN`/`Infinity` reaches the results card, charts, AI Insights, or PDF.
- Independent Node re-implementation harness (454/454 scenarios) re-run against the updated `parseAmt()` clamp logic — all passing.
- Standalone `tsx` harness importing `buildCanadaRegisteredReportData` directly re-run across 9 named scenarios — Room Used % and refund output identical pre- and post-fix (the badge fix is UI-display-only and does not touch the PDF adapter).
- No changes made to `calcFVRate`, `getEffectiveMonthlyRate`, the room-check formula, the tax-reduction estimate, or any other computed financial value.
- `npx tsc --noEmit`: clean.
- `npx next build`: clean.

### Also applied under this approval: TFSA post-lock badge correction

The identical `Math.round(roomUsedPct) >= 100` → `roomRemaining <= 0` correction was applied to the already-locked TFSA Contribution & Growth Calculator (`app/tfsa-calculator/TFSACalculator.tsx`), per explicit approval, display-only:

- Corrected the "Fully Used" badge boundary to use `roomRemaining <= 0` instead of rounded room-used percentage.
- This prevents 99.50%–99.99% usage with positive room remaining from being mislabeled as fully used.
- No TFSA financial outputs or methodology changed.

Live-verified at the same five boundary cases across all three TFSA badge display sites, zero console errors. No other TFSA change was made.

---

## Retirement Savings Calculator — Visual Polish Note (post-lock)

Applied 2026-06-04. No logic changes. The Retirement Goal Progress semi-circle gauge (`app/retirement-planning-calculator/RetirementSavingsCalculator.tsx`) was visually strengthened after lock:
- `SEMI_R` 68 → 88, `CX` 82 → 104, `CY` 82 → 100 (larger arc, clipping fix)
- `strokeWidth` 13 → 22 (heavier arc matching RRSP room gauge weight)
- Stat row padding `py-2` → `py-1` (condensed stat block below gauge)

No QA record update required — logic and math unchanged.

---

## Detailed Schedules Patch V2 — Planned (not started)

> Plan recorded: 2026-06-02 · Do not begin until explicitly scoped and approved

Five calculators need a downloadable or on-page schedule table as a V2 feature. These should be planned and built together as a single cross-calculator patch:

| Calculator | Schedule type |
|---|---|
| Personal Loan | Payment Schedule (amortization by month) |
| Car Loan | Payment Schedule (amortization by month) |
| Debt Repayment | Payoff Schedule (balance by month) |
| Compound Interest | Growth Projection Schedule (balance by year) |
| Investment Fees | Fee Impact Schedule (balance by year, net vs gross) |
| Net Worth | Asset/Liability Schedule (categorised breakdown table) |

**Do not add schedule tables to any of these calculators individually.** Build as a coordinated patch with a shared table component so style and behaviour are consistent across all five.

---

## Visual Consistency Polish — 2026-05-29

Applied after Investment Fees Calculator V1 lock. Affected files: all loan and mortgage calculator components.

### Changes applied

**1. Donut chart size standardised to 208px (`w-52 h-52`)**

Investment Fees Calculator Portfolio Breakdown donut established as the visual target. All other calculator breakdown donuts updated from `w-44 h-44` (176px) to `w-52 h-52` (208px):
- Personal Loan: Payment Breakdown donut
- Car Loan: Payment Breakdown donut
- Debt Repayment: Breakdown donut
- Mortgage Qualifier: Qualification Snapshot donut
- Canadian Mortgage: Payment Breakdown donut
- US Mortgage: inline-style wrapper updated from `width: 176` → `width: 208`

The small inline indicator donut in Mortgage Qualifier (`w-28 h-28`) was intentionally left unchanged — it is a different UI element.

**2. Smart Optimization tablet layout fixed**

All Smart Optimization / Smart Opportunity cards had `md:hidden` / `hidden md:flex` breakpoints that activated the horizontal KPI layout at 768px (tablet). At tablet the AI Analysis panel is already split into 2 columns (50% each), leaving insufficient space for the horizontal three-box layout, causing overlap.

Fix applied: `md:hidden` → `lg:hidden` and `hidden md:flex` → `hidden lg:flex` across all Smart Optimization card variants in:
- Investment Fees Calculator (2 states × mobile/desktop = 4 occurrences)
- Car Loan Calculator (4 occurrences)
- Personal Loan Calculator (4 occurrences)
- Debt Repayment Calculator (2 occurrences)

Horizontal layout now only activates at `lg` (1024px+) where the card has sufficient width.

**3. Selected-bar bubble anchored to bar height**

The floating fixed-top bubble zone that sat disconnected from bar height was replaced with bar-anchored positioning across three calculators:

- **Investment Fees**: removed fixed `BUBBLE_H` zone; bubble placed with `position: absolute, bottom: barH + 12` inside the selected bar's inner relative div.
- **Personal Loan**: same fix applied; `BUBBLE_H = 68` removed; minHeight updated.
- **Car Loan**: same fix applied; `BUBBLE_H = 68` removed; minHeight updated.

Bubble now tracks the selected bar's height and sits approximately 12px above the bar top, moving up and down as the selected term or inputs change.

---

## Car Loan Calculator V1 — QA Record

> QA completed: 2026-05-29 · Result: **PASS** · 25/25 checks
> Disclaimer patch: 2026-05-29 — bottom disclaimer made calculator-specific across all three loan calculators (see below)

### Confirmed working

- Desktop (1280px): 7/5 grid, input card + results card side-by-side, no overflow
- Tablet (768px): single-column stacked, six term pills in one row, no overflow
- Mobile (375px): single column, six pills wrap 3+3 cleanly, no horizontal overflow
- Term pills (24/36/48/60/72/84m): all update monthly payment, term metadata, and all downstream cards
- Term Comparison chart: 6-bar stacked chart; selected term highlighted with teal border + bubble callout; updates correctly for all six terms
- Amount Financed: correctly derived as vehicle price − down payment; clamped to ≥ 0 (no NaN/Infinity)
- Down > Price edge case: all outputs show $0, no NaN, no blank UI
- Down payment % badge: colour-coded (teal ≥ 20%, amber ≥ 10%, grey below); updates live
- Down Payment Impact lever (down < 20%): shows estimated interest saved + monthly reduction for max($1,000, 5% of vehicle price) increase
- Strong Down Payment state (down ≥ 20%): fires exactly at 20.0%, shows equity position stats, no savings figure
- Borrowing Cost gauge: score/label/color/copy all correct across low, mid, and high rate inputs
- Affordability gauge (income blank): shows "—" with "No Income" badge
- Affordability gauge (income entered): DTI 14.4% at defaults with $50k income → "Affordable" badge, correct copy
- Rate Check copy: car-specific benchmarks ("new car loans 5–12%", "used car loans 8–18%")
- Zero-rate loan (0%): $500.00/mo exactly ($30,000 ÷ 60), $0 interest, clean render
- High-rate loan (29.9%): Borrowing Cost score 0, "Caution" status, correct copy, no NaN
- Header search: typing "car" returns Car Loan Calculator result
- Hero search: typing "car" returns Car Loan Calculator result
- Mobile drawer search: Car Loan found, click navigates to `/car-loan-calculator`, drawer closes after click
- `/calculators?q=car`: Car Loan Calculator visible and correctly labelled as "CA & USA"
- No horizontal overflow at 375px or 1280px
- No console errors
- `tsc --noEmit` clean
- Disclaimer: "taxes, dealer fees, insurance" — no mortgage-specific wording

### Disclaimer patch — 2026-05-29

The shared `Disclaimer` component in `_mortgage-shared/ui.tsx` contains mortgage-specific wording ("mortgage terms", "amortization period", "licensed mortgage professional"). All three loan calculators were updated to replace `<Disclaimer />` with inline calculator-specific copy:

| Calculator | Bottom disclaimer |
|---|---|
| Personal Loan | "…lender terms, fees, credit profile, approval requirements, or repayment conditions…" |
| Car Loan | "…auto loan terms, taxes, dealer fees, insurance, credit profile, approval requirements…" |
| Debt Repayment | "…credit card terms, loan agreements, fees, interest changes, minimum payment rules…" |

The shared `Disclaimer` component was not modified — mortgage calculators continue using it unchanged. The `Disclaimer` import was removed from each loan calculator file.

### Future V2 scope (not started)

Trade-in value; amount owed on trade-in; sales tax; dealer and registration fees; out-the-door price; negative equity warning; insurance cost; lease vs buy comparison.

---

## Car Loan Calculator V1 — Follow-up Validation & Fix Round

> QA completed: 2026-07-18 · Result: **PASS — V1 Ready to Lock**

A scoped, audit-driven fix round (3 approved AUTO-PROCEED items) closed the remaining findings from a full end-to-end validation pass covering financial formulas, input validation, 8 core test scenarios, responsive QA, PDF, and AI Insight consistency. Financial formulas (`calcPayment`, `computeResults`), amortization methodology, and default assumptions were explicitly out of scope and were not touched.

### Fixes applied

1. **Annual Rate Validation caption** — the input previously accepted an out-of-range typed value (e.g. "999") while `computeResults()` silently clamped it to 49.9% for calculation, with no visible feedback. Added an inline amber (`#f59e0b`) caption below the field — "Rate must be 0–49.9%. Using X%." — mirroring the same pattern already live in `RetirementSavingsCalculator.tsx` and just re-applied to Compound Interest. The 49.9% clamp itself is unchanged.
2. **Mobile Chart Legend clipping at 375px** — the Term Comparison chart's stat row + legend sidebar used `flex-row sm:flex-col`, cramming the Monthly/Total Cost/Interest stats and the Principal/Interest legend into one line at 375px and clipping. Changed the outer wrapper to unconditional `flex-col`, matching the working pattern in `SavingsGoalCalculator.tsx` (and the fix just applied to Compound Interest). Desktop (≥640px) is unchanged — `sm:flex-col` already resolved to the same layout at those widths.
3. **Down Payment Exceeding Vehicle Price** — previously silently zeroed the amount financed with no user-facing explanation. Added an inline amber caption — "Down payment can't exceed vehicle price. Amount financed is {currency}0." — using the existing region-aware `currencyPrefix`. Confirmed Monthly Payment, Total Interest, and Amount Financed all render `$0` (or `CA$0`) gracefully with no NaN/crash.

### Confirmed working

- Financial parity verified live across all 8 required scenarios: Default $601.14, Zero down $701.33, Large down (loan $5,000) $100.19, Zero-interest exactly $500.00 ($0 interest), $30k/6%/60mo reference consistent with the known $579.98 benchmark, long-term 84mo clean, max valid inputs ($9,994,999 financed, 49.9%, 84mo) → $429,647.52/mo with no NaN/overflow, invalid values (negative down payment clamps to $0, down > price shows new caption) all handled gracefully
- Annual Rate validation: 55% input → caption "Rate must be 0–49.9%. Using 49.9%." + Monthly Payment, Borrowing Cost Score, and all AI Insight cards recalculate consistently at the clamped rate
- Down > price: caption renders in both USA (`$0`) and Canada (`CA$0`) regions; Payment Breakdown chart shows a graceful "No data" state, no crash
- 375px: Term Comparison stat row and legend stack cleanly, no clipping, no horizontal scroll
- 768px / 1280px: unaffected, layout unchanged (confirmed via computed DOM styles — legend row uses `min-w-0` with no truncation)
- PDF: generates with no console errors, page remains intact; `loanAdapter.ts` (shared with Personal Loan) already internally consistent — no PDF color fix needed
- Region toggle (USA ↔ Canada): currency prefix and all captions update correctly
- AI Insight cards (Rate Check, Term Optimization, Borrowing Cost Score, Affordability, Smart Optimization): stayed consistent with displayed figures across every scenario tested, including the 49.9%-clamped edge case
- `npx tsc --noEmit`: clean
- `next build`: clean, all 43 routes compiled and statically generated
- No console errors, hydration warnings, or runtime warnings

### Known non-blocking finding (not fixed, out of scope)

6 of the 8 other calculators sharing this chart-legend pattern (`investment-fees-calculator`, `lump-sum-vs-dca-calculator`, `emergency-fund-calculator`, `net-worth-calculator`, `personal-loan-calculator`, `roi-calculator`) still use the old `flex-row sm:flex-col` wrapper and likely share the same latent 375px clipping bug. Left untouched — explicitly out of scope for this task, which was scoped to the Car Loan Calculator only. (Compound Interest was fixed in the prior follow-up round; Car Loan is now fixed here.)

---

## Mortgage Qualifier Calculator V2 — Product-Logic Patch QA Record

> Patch locked: 2026-05-28 · QA result: **PASS** · 19/19 checks

### Changes locked

- **Verdict logic**: passing ratios always show green "Qualifies". Borderline fires only when ratios exceed the limit but are within 5pp (genuine near-miss). Far-over shows red "Does Not Qualify". Previous logic incorrectly showed Borderline for passing ratios that landed near the limit (which is structurally always the case for a max-budget result).
- **Ratio section renamed**: "Affordability Ratios" → "Qualifying Ratios at Maximum Budget". Subtitle and explanatory note added: "Ratios are calculated at your maximum qualifying price. At a lower purchase price, your ratios improve proportionally."
- **Shared ratio color/state system**: single `ratioStateOf()` helper and `RATIO_COLORS` constant drives all four surfaces — top navy result card, ratio section percentage + progress bar + badge, and AI verdict chips. States: `pass` (green), `at-limit` (amber, fires when 1dp-rounded ratio exactly equals the limit), `over` (red).
- **AI "Key Results" card replaced with "Smart Optimization Found"**: no longer repeats Max Home Price / Max Mortgage / Monthly P&I. Shows one actionable lever — debt-reduction lever (when monthly debts > 0) or income lever (when debts = 0) — with estimated dollar gain labeled as an estimate.
- **AI "Qualification Status" insight replaced with "What's Limiting You"**: five branches cover housing-cost constraint, TDS-with-debts constraint, TDS-without-debts constraint, GDS constraint, and both-over. Answers "what is limiting my qualification" with specific ratio figures.

### QA confirmed

- CA default scenario: GDS lands at 32.0% / 32% → amber "At estimated limit", verdict green "Qualifies" ✅
- USA default scenario: both paths correct ✅
- Exact-limit (28.0%/28%): amber everywhere ✅
- Near-miss failing (33.5%/32%): Borderline ✅
- Far-over (40%/32%): Does Not Qualify ✅
- Color consistency top navy card ↔ ratio section ↔ AI chips ✅
- Smart Optimization: debt lever when debts > 0, income lever when debts = 0 ✅
- What's Limiting You: all branches render correctly ✅
- Mobile 375px / tablet 768px: no overflow ✅
- No NaN / Infinity / blank UI ✅
- `tsc --noEmit` clean ✅

### Known non-blocking items

- Three dead variables remain (`displayVerdictReason`, `gdsChip`/`tdsChip`, `leverGainLabel`) — harmless, `noUnusedLocals` not enabled. Clean up in a future sweep.
- Income lever gain is an approximation (does not model the CA insured/conventional GDS-limit flip). Intentionally labeled "Estimate based on current inputs."

---

## Mortgage Calculator Intelligence Patch A — QA Record

> Patch locked: 2026-05-28 · QA result: **PASS** · US 13/13 · Canada 13/13

### Applies to

- `app/us-mortgage-calculator/USAMortgageCalculator.tsx`
- `app/canadian-mortgage-calculator/CanadaMortgageCalculator.tsx`

### Changes locked

**1. Mortgage Health Score — two-mode scoring**

- `incomeEntered = parseN(form.grossIncome) > 0` gates both modes in the render IIFE.
- **Mode A** (income entered): DTI/GDS/TDS-based scoring. Score, label, color, and copy all derive from the same ratio values — no internal inconsistency. Driver-aware copy: front-end/GDS pressure uses housing cost wording only (no debt reduction); back-end/TDS pressure uses debt reduction wording; low dp / insurance status used when ratios are healthy.
- **Mode B** (no income): scored on down payment, insurance status (PMI for US / CMHC for CA), and rate only. Assumed income (`ASSUMED_ANNUAL_INCOME`) is still computed in `useMemo` for the ratio display section but is never used to produce Health Score numbers or copy. Copy explicitly says income is needed for full DTI/GDS/TDS analysis.
- Tooltip updates dynamically per mode.

**2. Smart Optimization Found — input-aware lever selection**

Replaced the always-on hardcoded `$100/mo extra payment` logic with a priority-ordered lever IIFE:

| Priority | US lever | CA lever |
|----------|----------|----------|
| 1 | PMI threshold (18–20% dp): extra dp needed, monthly PMI saving, instant return % | CMHC/default insurance threshold (18–20% dp): same structure, CMHC wording |
| 2 | High DTI (income entered): GDS/front-end binding → housing cost gap; back-end binding → debt reduction gap | High GDS/TDS (income entered): same logic, GDS/TDS labels |
| 3 | Term compression: 30yr → 20yr interest saved | Term compression: 30yr → 25yr (uses `scenario25`); 25yr → 20yr (computed inline via `calcPayment`) |
| 4 | Scaled extra payment: `max(100, round(basePI × 5%, nearest $50))`, `buildSchedule` in render IIFE | Same |

Both mobile and desktop Smart Opt blocks render `lever.bigNum`, `lever.subCopy`, `lever.kpi1Val/Label/Icon`, `lever.kpi2Val/Label/Icon`. "Estimate based on current inputs — actual lender results may vary." disclaimer on both.

Wording is region-specific: PMI for US; CMHC / mortgage default insurance for Canada.

### QA confirmed

- Income blank: Mode B fires, no fake DTI, "add income" copy visible ✅
- Income entered: Mode A fires, score/label/color/copy consistent ✅
- GDS/front-end high: no debt reduction wording in lever or copy ✅
- TDS/back-end high: debt reduction wording correct ✅
- Insurance threshold lever (18–20% dp): correct wording per region, no cross-region terminology ✅
- Term compression: US 30yr→20yr · CA 30yr→25yr · CA 25yr→20yr all produce positive interest saved ✅
- Fallback scaled extra payment: fires when no higher-priority lever applies ✅
- Mobile and desktop blocks show identical lever content ✅
- No NaN / Infinity / blank UI ✅
- No console errors ✅
- No horizontal overflow at 375px / 768px / desktop ✅
- `tsc --noEmit` clean ✅

### Cleanup additions locked with Patch A (same session)

- **CA input prefix**: All Canadian money inputs changed from `$` to `CA$`. `NumericInput` handles multi-char prefix padding automatically (`2.75rem`).
- **CA Health Score label band**: Removed `'Manageable'` (35–49). Scores below 50 now map to `'Needs Attention'` / red. Four bands: Excellent (80+) teal · Good (65+) teal · Fair (50+) amber · Needs Attention (<50) red.
- **Smart Optimization wording clarification**: Added `mainLabel` (bold white, short label) + `supportCopy` (slate-400, explanatory sentence) fields to all lever branches in both US and CA. `bigNum` for DTI/GDS/TDS pressure levers appends `/mo`. KPI labels updated per lever type.
- **US 30yr→20yr lever removed**: Too aggressive as a default recommendation. US now falls through to scaled extra payment when no PMI threshold or high DTI lever applies.
- **CA `'Earlier payoff'` vs US `'Faster payoff'`**: CA fallback KPI2 label is `'Earlier payoff'` — minor inconsistency, non-blocking, noted for future cleanup sweep.

### Future Patch B (not started — do not touch until separately planned)

- Compare Scenarios visual redesign (stacked principal/interest bar chart)
- Possible 25-year scenario expansion for US (requires approval before start)
- CA fallback KPI2 label `'Earlier payoff'` → `'Faster payoff'` alignment (trivial, fold into next sweep)
- Do not begin until explicitly scoped and approved

---

## Rent vs Buy Calculator V1 — QA Record

> QA completed: 2026-06-06 · Result: **PASS** · tsc clean

### Confirmed working

- Desktop (1280px): 7/5 grid, input card + results card side-by-side, no overflow
- Mobile (375px): single column, 2-col input grid inside card, no horizontal overflow
- Default scenario ($2,200 rent / $650K home / $130K down / 5.25% / 25yr / 10yr horizon): results render, decision shows, charts load ✓
- 0% rent increase: rentMonthly stays flat year-over-year, no NaN ✓
- 0% home growth: homeValue = purchasePrice each year, equity derived correctly, no NaN ✓
- 0% investment return: opportunityCost = 0, no NaN ✓
- 0 down payment: dpAmt = 0, full loan amount, PMI/CMHC warning fires, no NaN/Infinity ✓
- 20% down payment: exact 20.0% — no PMI/CMHC warning (condition is strict `< 20`) ✓
- Very high rent: cumRent scales linearly, no overflow ✓
- Very high home price: all monetary values scale, no overflow ✓
- Decision states: Buying Appears Lower-Cost / Renting Appears Lower-Cost / Close Call all render ✓
- Break-even callout: correct year shown when buy net cost < cumulative rent; amber "no break-even" state when not reached ✓
- CA region: all monetary inputs show `CA$` (Monthly Rent, Purchase Price, Down Payment, Insurance+Maintenance, HOA) ✓
- US region: all monetary inputs show `$` ✓
- AI Analysis: decision card, smart driver card, 3 insight cards, stat grid — all render ✓
- No NaN / Infinity / blank UI across all tested scenarios ✓
- No horizontal overflow at 375px or 1280px ✓
- No console errors ✓
- `tsc --noEmit` clean ✓

### Bugs / polish fixed during QA

1. **Down payment input flex wrapper mobile issue** — Previous session: fixed flex wrapper to prevent collapse on 375px.
2. **Hardcoded `$` labels in charts** — Previous session: `compact()` and `fmtKLine()` functions corrected to use `moneyPrefix`.
3. **Unused imports removed** — Previous session.
4. **Down Payment, Insurance + Maintenance, HOA input prefixes** — This session: lines 421, 490, 496 changed from hardcoded `"$"` to `moneyPrefix` for CA region consistency.

### Accepted V1 concern

Selected-bar tooltip in the Rent vs Buy Cost bar chart uses `position: absolute` centered on bar. At 375px the tooltip on the leftmost/rightmost bar may clip slightly past the card edge visually. No horizontal scroll is caused. Accepted for V1.

### Core math

- Monthly ownership cost = P&I + property tax + insurance/maintenance + HOA
- Rent cost grows annually by rent increase %
- Buy net cost = cumulative cash paid (closing costs + down payment + all monthly ownership) minus estimated equity
- Mortgage balance reduced via standard amortization loop (CA: semi-annual compounding via `monthlyRateCA`; US: monthly compounding via `monthlyRateUS`)
- Home value grows by assumed annual appreciation
- Break-even year = first year where buy net cost drops below cumulative rent cost
- Opportunity cost of down payment shown as context only — not subtracted from rent cost
- CMHC/PMI excluded from V1; disclosed with inline warning (< 20% down) and footer disclaimer

### Future V2 scope (not started)

CMHC/PMI math integration; province/state-specific closing costs; property transfer / land transfer tax; realtor commission / sale cost modeling; capital gains / tax assumptions; detailed amortization schedule; more advanced sensitivity analysis.

---

## Mortgage Refinance Calculator V1 — QA Record

> QA completed: 2026-06-06 · Result: **PASS** · tsc clean

### Confirmed working

- Desktop (1280px): 7/5 grid, input card + results card side-by-side, no overflow
- Tablet (768px): two-column input layout, all fields and pills visible, no overflow
- Mobile (375px): two-column input grid maintained, amortization pills wrap correctly, no horizontal overflow
- Route loads, no server errors, no console errors, no hydration warnings
- Default math: current payment $3,159.38 · new payment $2,628.03 · monthly savings $531.34 · break-even Month 6 · interest savings $13,793 · net savings $28,881 ✓
- `saves` state (teal "Refinancing May Reduce Cost" badge): default inputs ✓
- `no-break-even` state (amber "Break-even Beyond Horizon"): refi costs $100,000 → break-even Month 189, beyond 5yr/60mo horizon ✓
- `costs-more` state (red "New Payment Would Be Higher"): new rate 7.5% / 10yr amort → payment increase confirmed ✓
- `refinanceCosts = 0`: break-even shows "Immediate", net savings = $31,881 (correctly $3k higher than with $3k costs) ✓
- `cashOut = $20,000`: new principal shows $470,000, savings reduced to $414.54 ✓
- `cashOut = $200,000`: new principal $650,000, "New Payment Would Be Higher" badge, +$636.67/mo ✓
- Term extension warning: yearsRemaining=5, newAmortization=25yr → "+20 yrs TERM EXTENSION WARNING" smart lever fires; "partly due to the term extension" copy in interest impact insight card ✓
- Current rate = 0%: null guard fires, empty state renders, no NaN/Infinity ✓
- New rate = 0%: null guard fires, empty state renders, no NaN/Infinity ✓
- Both rates = 25%: valid output, no NaN ✓
- Current vs New Payment bar chart: bars and savings bubble render correctly in all states ✓
- Break-even Timeline SVG chart: cumulative savings line, refi cost dashed line, Mo 6 crossover marker ✓
- AI Analysis — result card, smart lever card, 3 insight cards: all render and update correctly ✓
- Bottom disclaimer: covers lender terms, CMHC/PMI caveat, cash-out caveat, no advice claims ✓
- `tsc --noEmit` clean ✓

### Math verified at defaults (CA semi-annual compounding, balance $450k, rate 5.75%, 20yr, new rate 4.99%, 25yr amort, $3k costs, 5yr horizon)

`mRateCurr = (1 + 5.75/200)^(1/6) − 1` ✓  
`paymentCurr = calcPayment(450000, mRateCurr, 240) = $3,159.38` ✓  
`paymentNew = calcPayment(450000, mRateNew, 300) = $2,628.03` ✓  
`monthlySavings = 3159.38 − 2628.03 = $531.34` ✓  
`breakEvenMonths = ceil(3000 / 531.34) = Month 6` ✓  
`interestSavings (5yr) = $13,793` ✓  
`netSavings (5yr) = 531.34 × 60 − 3000 = $28,881` ✓

### Key V1 decisions

- No editable current payment input — current payment derived from balance, rate, and years remaining. Helper copy notes actual lender payment may include taxes, insurance, or escrow.
- Term-extension warning takes priority over simple savings message in the smart lever.
- `refinanceCosts = 0` produces break-even = 0 (Immediate) rather than null.
- Guards: current rate ≤ 0 or > 30 → null; new rate ≤ 0 or > 30 → null; years remaining < 0.5 or > 40 → null.

### Future V2 scope (not started)

More detailed refinance cost breakdown; lender-specific penalty estimate; optional user-entered actual current payment with clear escrow warning; full amortization schedule comparison; cash-out LTV / eligibility warning; CMHC/PMI or insurance handling for refinance.

---

## Salary Calculator V1 — QA Record

> QA completed: 2026-06-06 · Result: **PASS** · 9/9 checks · tsc --noEmit clean (SWC dev-mode HMR artifact noted — non-blocking)

### Calculator summary

- **Route:** `/salary-calculator`
- **Dual-region:** `useRegion()` — US (`$`) / Canada (`CA$`)
- **Inputs:** Gross salary amount, Pay frequency pills (Hourly / Daily / Weekly / Biweekly / Semi-monthly / Monthly / Annual), Estimated deduction % slider/input, optional Take-Home Override toggle
- **Outputs:** Annual gross, monthly gross, take-home pay, annual deductions, pay clarity score, deduction impact
- **No official tax data:** No Province/State selector, no CRA/IRS tax brackets, no CPP/EI/FICA/Medicare/Social Security — educational estimate via user-entered deduction %

### Visual cards

- **Pay Conversion — Gross Pay by Period:** horizontal bar chart with 7 rows (Annual / Monthly / Semi-monthly / Biweekly / Weekly / Daily / Hourly); log-scale bar widths (`Math.log`-based); selected row: teal gradient pill + teal label + amount; unselected: slate pill; label column 128px right-aligned, `whiteSpace: nowrap`; thin vertical divider; amount column 78px right-aligned; selected bar outline 1.5px teal @ 4px offset on inner bar div (not track wrapper); `overflow-hidden` removed from track so outline is not clipped
- **Pay Clarity Score — Deduction Impact:** dark navy card (`linear-gradient(145deg, #0D1B2A, #0c1e3a)`); header ("DEDUCTION IMPACT" + Sparkles icon) pinned top; content vertically centred in remaining space via `flex flex-col justify-center flex-1`; left: SVG arc gauge (GR=68, GC=2πGR, 240° sweep, viewBox 0 0 180 180, 200px container, cx/cy=90, strokeWidth=12, score `clamp(2.4rem,6vw,3.2rem)`, `/100` at 0.7rem, paddingBottom 20); right: DonutChart `centerLabel="take-home / yr"` (shortened from "annual take-home" — inner radius 38px too narrow); 3-stat row (Take-Home teal / Deductions amber / Gross Pay navy)
- **AI Salary Analysis:** always visible; Pay Clarity Score gauge (0–100, ≥70=Low/teal, ≥55=Moderate/amber, else=High/red); Deduction Load insight card; Hourly Equivalent lever; Pay vs Deductions breakdown copy

### Core logic

```
annualGross = gross × periodsPerYear (based on selected pay frequency)
annualDeductions = annualGross × (deductionPct / 100)
annualTakeHome = annualGross − annualDeductions
takeHomePct = annualTakeHome / annualGross × 100
payClarityScore = clamp(0, 100, map(takeHomePct, 0–100 → 0–100))
conversionRows: [Annual, Monthly, Semi-monthly, Biweekly, Weekly, Daily, Hourly]
dailyGross = annualGross / 260 (52 weeks × 5 days)
hourlyEquivalent = dailyGross / 8
log-scale bar width: Math.max(8, Math.round((Math.log(Math.max(value,1)) / Math.log(annualGross)) × 100))
```

### QA checks confirmed

1. **Math at defaults** (Annual $80,000 / 25% deductions): annualTakeHome $60,000 · annualDeductions $20,000 · Pay Clarity Score correct ✓
2. **Pay frequency pills** — all 7 pills (Hourly/Daily/Weekly/Biweekly/Semi-monthly/Monthly/Annual) convert correctly to annual gross and downstream outputs ✓
3. **Edge cases** — $0 gross: empty state, no NaN; $1M salary: all values format correctly; 0% deductions: 100% take-home, score = 100/Excellent; 99% deductions: near-$0 take-home, score = 0/High Deduction Load ✓
4. **Region toggle** — US: `$` prefix; Canada: `CA$` prefix; both update all monetary outputs ✓
5. **Responsive** — Desktop 1280px: 2-col grid, no overflow; Tablet 768px: stacked, no overflow; Mobile 375px: single column, zero overflowing elements (confirmed via DOM `getBoundingClientRect`) ✓
6. **Pay Conversion selected bar** — selected pay frequency row shows teal pill + outline wrapping only actual bar width (not full track); `Semi-monthly` label does not wrap ✓
7. **Pay Clarity Score gauge** — arc renders at correct fill for score; score number and `/100` visible; no "Low Deduction Load" label showing inside arc (removed) ✓
8. **AI Salary Analysis** — always visible; all insight cards render; Deduction Impact header aligns with Pay Clarity Score header; Hourly Equivalent lever updates with salary changes ✓
9. **Copy & disclaimer** — no official tax advice language; deduction % framed as educational estimate; salary-specific disclaimer present (no mortgage/loan wording) ✓

### Dev-mode artifact (non-blocking)

Next.js SWC compiler showed `"Unexpected token div at line 227"` in browser console during one hot-reload cycle. `tsc --noEmit` passed clean — TypeScript parser found no errors. Page rendered correctly throughout. Determined to be a stale HMR artifact from dev-mode hot-reload cycles, not a live code error. No fix required.

### Visual polish patch log (all applied before lock)

1. conversionRows extended to 7 rows (added Daily + Hourly)
2. Pay Conversion redesigned as true horizontal bar chart (label column → divider → bar track → amount column)
3. Selected bar outline moved to inner bar div only (not full-row highlight)
4. Outline offset 4px from bar edge (`outlineOffset: 4px`)
5. Outline wraps only actual filled bar width (`overflow-hidden` removed from track wrapper)
6. `Semi-monthly` label no longer wraps (label column 106px → 128px, `whiteSpace: nowrap`, right-aligned)
7. Pay Clarity gauge enlarged and matched to Mortgage Health Score then enlarged further (GR 52→68, viewBox 140→180, 160px→200px, cx/cy 70→90)
8. "Low Deduction Load" label removed from arc bottom
9. "DEDUCTION IMPACT" header pinned to top (outer `justify-center` removed; inner `flex-1 justify-center` wrapper added)
10. DonutChart `centerLabel` changed from `"annual take-home"` to `"take-home / yr"` (inner radius overflow fix)

### Future V2 scope (not started)

Province/State selector with official marginal tax rates; CPP/EI (CA) and FICA/Medicare (US) itemized breakdown; annual tax credit inputs (RRSP contributions, TFSA room); multi-income household view; pay stub download; year-over-year salary growth comparison; employer vs employee cost view.

---

## Salary Calculator V1 — Validation & Lock

> Re-validated: 2026-07-21 · Result: **PASS — V1 LOCK APPROVED**

Full end-to-end re-validation of the original V1 QA Record above (source methodology reverse-engineered and confirmed, independent financial validation via a standalone Node reimplementation of the salary-normalization/conversion/deduction formulas, exhaustive boundary testing, PDF/UI parity review via a standalone transpiled-adapter harness, responsive QA, and technical QA), followed by a targeted fix closing a Weekly pay-frequency period-count inconsistency identified during that validation.

### Validated

- Source methodology reverse-engineered and validated against the calculator's own "How It Works" copy.
- Salary normalization validated for Annual, Monthly, Biweekly, Weekly, and Hourly inputs — each independently re-derived to annual gross with zero discrepancies.
- Monthly, Semi-monthly, Biweekly, Weekly, Daily, and Hourly output conversions validated — every period value reconciles exactly against annual gross.
- Flat user-entered deduction-rate methodology confirmed (no official CRA/IRS bracket data used, consistent with the calculator's educational-estimate scope).
- Deduction-rate clamp validated at 0%–99%, including adversarial inputs above 100% and below 0%.
- Gross, deduction, and take-home reconciliation validated (`annualDeductions + annualTakeHome == annualGross`) across the full scenario matrix.
- Pay Clarity Score and label logic validated — monotonic non-decreasing across the takeHomePct range, no contradictory branch seams.
- Region and currency handling validated — US (`$`) and Canada (`CA$`) both reconcile identically (deduction arithmetic is region-independent by design).
- UI/PDF parity validated via a standalone transpiled-adapter harness (`taxIncomeAdapter.ts` compiled and run in isolation, outputs compared against live UI text) — exact parity confirmed.
- Weekly pay-period inconsistency corrected:
  - Weekly period count now uses the user-entered `weeksPerYear` instead of a hardcoded `52`.
  - Hero, Pay Conversion table, AI Insight copy, and PDF now all use the same weekly period count.
  - Fractional `weeksPerYear` values (e.g. 45.5) remain supported without forced rounding of the underlying calculation — only cosmetic display formatting is applied.
  - Default 52-week behavior unchanged.
- Responsive QA passed at 375px, 768px, and 1280px — no overflow or layout regressions.
- `npx tsc --noEmit` and `npx next build` both clean.

### Fix applied

**Weekly pay-period consistency fix** (`app/salary-calculator/SalaryCalculator.tsx`, `lib/pdf/adapters/taxIncomeAdapter.ts`) — `periodsPerYear` for `payFreq === 'Weekly'` previously resolved to a hardcoded `52` in the take-home-per-paycheque calculation while the always-visible Weekly row in the Pay Conversion table divided by the user-entered `weeksPerYear`, producing a silent mismatch for any non-default weeks-per-year entry (contract/seasonal work). `PERIODS_PER_YEAR` is now typed `Record<Exclude<PayFreq,'Weekly'>, number>` with a ternary (`payFreq === 'Weekly' ? weeksPerYear : PERIODS_PER_YEAR[payFreq]`) supplying the Weekly case dynamically. Hero, gross/take-home per paycheque, "paycheques per year" text, the Pay Conversion table, AI Insight copy, and the PDF adapter all now derive from the same dynamic value. A `formatPeriods()` helper displays fractional weeks (e.g. `45.5`) without forced rounding. Monthly/Semi-monthly/Biweekly period counts, the flat deduction-rate methodology, score/preset/region logic, and all shared components were left untouched.

### Confirmed working

- Independent Node-harness regression (53/53 checks passed) re-deriving the fixed formula from scratch — covering Weekly @ 52/48/50/45.5, Hourly mode with non-52 weeks, zero-deduction, 99%-deduction, and a cross-check proving the Weekly table row reconciles against `weeksPerYear` independent of the currently selected Pay Frequency.
- Standalone transpiled-adapter PDF harness confirmed exact text/value parity with the live UI at `weeksPerYear` = 48, 45.5, and 52.
- Live browser verification across `weeksPerYear` = 48, 50, 45.5, Hourly mode, zero income, zero/99% deduction, and both US/CA regions — no discrepancies.
- Full regression matrix (Annual/Monthly/Semi-monthly/Biweekly/Weekly variants/Hourly/zero-income/zero-deduction/99%-deduction/US/CA) confirmed unaffected.
- `npx tsc --noEmit`: clean. `npx next build`: clean, all routes compiled.
- No console errors or responsive regressions observed at 375px, 768px, or 1280px.

---

## Sales Tax Calculator V1 — QA Record

> QA completed: 2026-06-06 · Result: **PASS** · 12/12 checks · tsc --noEmit clean

### Calculator summary

- **Route:** `/sales-tax-calculator`
- **Dual-region:** `useRegion()` — Canada (`CA$`) / USA (`$`)
- **Modes:** Add Tax (pre-tax → total) · Remove Tax (tax-included → pre-tax)
- **Canada inputs (in order):** Calculation Mode → Province / Territory → Amount → Tax Rate
- **USA inputs (in order):** Calculation Mode → Amount → Tax Rate
- **No preset database for USA** — manual combined local rate only

### Canada province/territory presets

Alphabetical order, Manual Rate at bottom:

| Province / Territory | Rate | Components |
|---|---|---|
| Alberta (AB) | 5% | GST only |
| British Columbia (BC) | 12% | GST 5% + PST 7% |
| Manitoba (MB) | 12% | GST 5% + PST 7% |
| New Brunswick (NB) | 15% | HST |
| Newfoundland & Labrador (NL) | 15% | HST |
| Northwest Territories (NT) | 5% | GST only |
| Nova Scotia (NS) | 14% | HST |
| Nunavut (NU) | 5% | GST only |
| Ontario (ON) | 13% | HST |
| Prince Edward Island (PE) | 15% | HST |
| Québec (QC) | 14.975% | GST 5% + QST 9.975% |
| Saskatchewan (SK) | 11% | GST 5% + PST 6% |
| Yukon (YT) | 5% | GST only |
| Manual Rate | user-entered | — |

Province preset selected → rate auto-filled / read-only. Manual Rate selected → rate editable. No edit button.

### Core math

**Add Tax:**
```
tax = amount × rate
total = amount + tax
Canada components: amount × component rate (last component absorbs remainder)
```

**Remove Tax:**
```
preTax = amount ÷ (1 + totalRate)
totalTax = amount − preTax
Canada components: preTax × component rate (last component absorbs remainder)
tax share of total = tax ÷ tax-included total
```

**Important wording:** Use "Tax share of total" for tax ÷ total — not "effective tax rate." Tax share is always lower than statutory rate in Remove Tax mode (mathematically correct).

### Visual cards

- **Tax Breakdown donut:** Pre-tax amount (teal) + Sales Tax (amber); center = total after tax
- **Add/Remove Tax Calculation card:** formula-style breakdown with GST/PST/QST/HST lines when Canada preset active
- **AI Sales Tax Analysis:** Tax Share white card (pre-tax/tax/total stat row) + dark smart result card (Tax Amount or Pre-tax Recovery) + three insight cards (Tax Rate Check / Add vs Remove Tax / Receipt Context)

### QA checks confirmed

1. **Route / no errors** — loads, no server/console/hydration errors ✓
2. **tsc --noEmit** — clean ✓
3. **Canada input order** — Calculation Mode → Province / Territory → Amount → Tax Rate ✓
4. **USA input order** — Calculation Mode → Amount → Tax Rate; no province selector ✓
5. **Province presets** — alphabetical, Manual Rate last, all rates and component notes correct ✓
6. **Add Tax math** — BC 12%: $100 → $12 tax, $112 total; GST $5.00 + PST $7.00 shown ✓
7. **Remove Tax math** — BC 12%: $100 tax-included → $89.29 pre-tax, $10.71 tax; GST $4.46 + PST $6.25 shown ✓
8. **Canada manual rate** — editable; $100 at 10% = $110 ✓
9. **USA manual rate** — no province selector; $100 at 10% = $110 ✓
10. **Mobile 375px** — no horizontal overflow ✓
11. **Visual cards / AI Analysis** — all cards readable ✓
12. **Disclaimer** — "Canada preset rates are general combined rates… USA rate must be entered manually… not tax or legal advice" ✓

### Key V1 decisions

- Canada input order finalized as: Calculation Mode → Province / Territory → Amount → Tax Rate (province drives the preset rate, so it appears before Amount)
- USA has no preset database in V1 — manual combined local rate only
- No quantity field, no product category exemptions, no tax holidays, no business remittance logic
- "Tax share of total" wording enforced in all three label locations (dark results card, Mode Result card, AI Analysis Tax Share sub-label)
- Last-component remainder pattern in `computeComponentAmounts` ensures displayed component amounts always sum exactly to total tax (avoids floating-point drift, e.g. QC: GST $5.00 + QST $9.98 = $14.98)

### Future V2 scope (not started)

US state/city/ZIP address lookup; sales tax API integration; product category exemptions; tax holidays; quantity / multiple item support; business remittance tools; more detailed Canada tax-rule notes by province and product type.

---

## Retirement Withdrawal Calculator V1 — QA Record

> QA completed: 2026-06-07 · Result: **PASS** · 9/9 checks · tsc --noEmit clean

### Calculator summary

- **Route:** `/retirement-withdrawal-calculator`
- **Dual-region:** `useRegion()` — CA (`CA$`) / US (`$`)
- **Inputs:** Current savings, annual withdrawal, annual return %, inflation rate %, current age, withdrawal start age, target ending balance, withdrawal timing (Beginning / End of Year)
- **Outputs:** Estimated years lasting, depletion age, first-year withdrawal rate, sustainability status, sustainability score, Withdrawal Pressure Score, total withdrawn, remaining balance
- **Math:** Year-by-year simulation (max `MAX_HORIZON = 50`); `withdrawal_n = annualWithdrawal × (1 + inflation)^n`; Beginning-of-Year: `(balance − withdrawal_n) × (1 + return)`; End-of-Year: `balance × (1 + return) − withdrawal_n`; deferral phase: growth only when `currentAge < withdrawalStartAge`

### Sustainability status thresholds

| Outcome | Status |
|---|---|
| Not depleted (lasts 50yr) | Sustainable |
| Lasts ≥ 30yr | Sustainable |
| Lasts 20–29yr | Watch |
| Lasts 10–19yr | At Risk |
| Lasts < 10yr | Depleted |

### Withdrawal Pressure Score

Rate-based 0–100 score (independent of simulation outcome):
- First-year rate < 3.5% → base 12 (Conservative ≤ 30)
- First-year rate < 5% → base 38 (Moderate ≤ 55)
- First-year rate < 6% → base 62 (Watch ≤ 72)
- First-year rate ≥ 6% → base 82 (Elevated Pressure > 72)
- Inflation > 4% → +10; > 3% → +5; depleted < 10yr → +15; depleted < 20yr → +10

### Visual cards

- **Retirement Drawdown Timeline:** Bar+line SVG chart; bars at 5yr age intervals (2yr if horizon ≤ 12yr); bar color teal (sustainable) or teal/amber/red by balance ratio (depleted); polyline connecting bar tops; deferral region: blue-tinted rect + dashed line + "Withdrawals start" floating label; depletion marker: two-line tspan pill (62×28px); ending balance teal dot; immediate-depletion empty state ("Portfolio depletes immediately...")
- **Sustainability Snapshot:** Semi-circle SVG arc gauge; sustainability score 0–100; Sustainable/Watch/At Risk/Depleted states
- **Withdrawal Pressure Score gauge:** Full-arc SVG gauge, GR=68, viewBox 180×180, 200px container, strokeWidth=12 — matches Pay Clarity Score spec; 3-stat row (Year 1 Withdrawal / First-Year Rate / Inflation Rate)
- **Three insight cards:** Withdrawal Rate Check · Inflation Pressure · Longevity Buffer

### QA checks confirmed

1. **Route / no server errors** — loads cleanly, no hydration warnings ✓
2. **Default math** ($500k savings / $25k annual / 6% return / 2.5% inflation / Age 65 / End-of-Year): years lasting 36, depletion age 101 (Sustainable), first-year rate 5.0%, sustainability score correct ✓
3. **Timing toggle** — Beginning vs End of Year: Beginning-of-Year depletes earlier than End-of-Year at same inputs ✓
4. **Deferral phase** — withdrawalStartAge 70 / currentAge 65: balance grows 5yr before withdrawals; chart shows deferral region; first-year rate uses portfolio value at withdrawal start ✓
5. **Depletion states** — high withdrawal ($60k on $500k): depletes in <10yr; "Depleted" status; "At Risk" at mid withdrawal; Sustainable at low withdrawal ✓
6. **Edge cases** — 0% return: simulation runs, no divide-by-zero; 0% inflation: withdrawals constant, no NaN; withdrawal > starting balance: immediate depletion, empty-state chart shown ✓
7. **Visual cards** — gauge arcs render at all score levels; bar chart displays correct bars and colors; depletion pill positions within chart bounds ✓
8. **Responsive** — Mobile 375px: no horizontal overflow; Tablet 768px: stacks correctly; Desktop 1280px: full multi-column layout ✓
9. **Copy / disclaimer** — educational wording; no guaranteed sustainability language; no RRIF/CPP/OAS/Social Security advice; withdrawal-specific disclaimer ✓

### Bugs fixed during QA

1. **Unused `Activity` import** — `Activity` was imported from lucide-react but never used after the Withdrawal Analysis gauge was replaced by the Withdrawal Pressure Score (Zap-based). Removed from the import line.
2. **Blank chart on immediate depletion** — When `snaps.length < 2` (withdrawal ≥ starting balance depletes at simulation year 0), the chart was returning `null` silently, leaving the chart card title visible but body empty. Fixed: replaced `return null` with a proper empty-state div: "Portfolio depletes immediately at this withdrawal amount. Reduce your annual withdrawal to see a timeline."

### Accepted V1 concern

Depletion pill at the far left or right edge of the chart may be partially covered by chart padding at extreme age values. No horizontal scroll is caused. Accepted for V1.

### Future V2 scope (not started)

RRIF minimum withdrawal rules (Canada); CPP, OAS, Social Security, and pension income offset (reduces required portfolio withdrawal); taxes on withdrawals; investment fees; sequence-of-returns risk / Monte Carlo simulation; account withdrawal order strategy (RRSP/TFSA/taxable); provincial/state-specific rules; year-by-year withdrawal schedule table (Detailed Schedules Patch V2); inflation-adjusted real return display; withdrawal amount optimization solver.

---

## Retirement Withdrawal Calculator V1 — Validation, Methodology Fixes & Lock

**PASS — 2026-07-19.** Full end-to-end validation of the original V1 QA Record above surfaced three methodology bugs and one presentation gap; all four were fixed under explicit user-approved scope, independently re-verified, and the calculator is re-locked with normal scoring thresholds and withdrawal/inflation methodology unchanged.

### Fixes applied

1. **End-of-Year final-withdrawal overcount** — In End-of-Year withdrawal timing, the simulation's final depletion year was crediting `totalWithdrawn` with the full nominal withdrawal even when the remaining balance could not cover it, overstating total lifetime withdrawals. Fixed by capping the final year's counted withdrawal at `Math.max(0, balance + thisWithdrawal - target)`, so `totalWithdrawn` never exceeds what the portfolio actually had available.
2. **Target Balance Reached state** — Scenarios where the portfolio depletes down to a positive `targetEndingBalance` (i.e. the user's own target is reached, not a $0 wipeout) were previously reported as plain "Depleted," which read as a negative outcome for what is actually a successful plan. These now compute a distinct `targetReached` boolean and surface as "Target Balance Reached" across the hero status, depletion pill, chart, gauge, AI Insight, and PDF.
3. **No Withdrawal Phase Simulated state** — Scenarios where the deferral period (time before `withdrawalStartAge`) consumes the entire 50-year simulation horizon so `yearsLasting === 0` with no depletion were previously falling through to a false "Sustainable" reading, since no withdrawal years were ever actually simulated. These now compute a distinct `noWithdrawalPhase` boolean and surface as "No Withdrawal Phase Simulated" in the same locations as above.
4. **Sustainability Score display suppressed for non-applicable states** — For both `targetReached` and `noWithdrawalPhase`, the 0–100 numeric Sustainability Score is not a meaningful assessment (it was never evaluated against real withdrawal years in either case), but the gauge, AI Insight text, and PDF were still rendering a numeric score as though it were. Added `sustainabilityScoreRated` / `sustainabilityScoreDisplay` presentation fields (computed identically in the component and independently derived in the PDF adapter from the existing `targetReached`/`noWithdrawalPhase` fields — no adapter interface change needed): the gauge ring, big-number, "/100" suffix, and caption now show "Goal Met" for Target Balance Reached and "Not Rated" for No Withdrawal Phase Simulated, with the numeric score and "/100" hidden in both cases. Normal scoring thresholds and the score formula itself are unchanged.
5. **Static inflation FAQ example corrected** — The FAQ's worked example of a $30,000 withdrawal growing at 2.5% inflation stated "$38,200 after 10 years and $48,800 after 20 years"; corrected to "$38,400 after 10 years and $49,200 after 20 years" to match actual compounding math.

Normal scoring thresholds, rate thresholds, the Withdrawal Pressure Score, and the underlying withdrawal/inflation simulation methodology were not touched by any of the above.

### Confirmed working

- Regression-tested across 5 scenarios: Target Balance Reached, No Withdrawal Phase Simulated, normal depleted, normal sustainable, and the calculator's default inputs — each verified live in-browser (hero status, gauge, AI Insight card, chart) and via PDF export.
- Independent Node/tsx script exercising `buildWithdrawalReportData` directly confirmed PDF executive-summary metric, results-table row, and insight paragraph all display "Goal Met" / "Not Rated" / the correct numeric score in the right states.
- `npx tsc --noEmit` and `npx next build` both clean after every fix round.
- Withdrawal Pressure Score confirmed unchanged (spot-checked at 92/100 and 97/100 against the existing formula).

### Known non-blocking findings (not fixed, out of scope)

- Depletion pill at the far left or right edge of the chart may be partially covered by chart padding at extreme age values (carried over from original QA Record; no horizontal scroll caused, accepted for V1).

---

## Savings Goal Calculator V1 — QA Record

> QA completed: 2026-06-08 · Result: **PASS** · 12/12 checks · tsc clean

### Calculator summary

- **Route:** `/savings-goal-calculator`
- **Dual-region:** `useRegion()` — CA (`CA$`) / US (`$`)
- **Goal types:** Vehicle · Home Down Payment · Vacation · Education · Other — label only, no effect on math
- **Inputs:** Savings goal, current savings, monthly contribution, annual return %, time horizon (years)
- **Outputs:** Projected savings, total contributions, estimated growth, goal gap/surplus, progress %, required monthly contribution, additional monthly needed, time to goal (600-month cap)

### Core logic

```
r = annualReturn / 100 / 12
n = timeHorizonYears × 12
FV_current = currentSavings × (1 + r)^n
FV_contributions = monthlyContribution × ((1 + r)^n − 1) / r    [r = 0: contribution × n]
projectedSavings = FV_current + FV_contributions
goalGap = max(0, savingsGoal − projectedSavings)
surplus = max(0, projectedSavings − savingsGoal)
progressPct = projectedSavings / savingsGoal × 100
FV_needed = savingsGoal − FV_current (clamped ≥ 0)
requiredMonthly = FV_needed × r / ((1 + r)^n − 1)    [r = 0: FV_needed / n]
additionalMonthly = max(0, requiredMonthly − monthlyContribution)
timeToGoal = month-by-month solve, cap 600mo; alreadyReached / neverReached edge cases
safe(n) = Number.isFinite(n) && n >= 0 ? n : 0   [guards all math outputs]
```

### Visual cards

- **Goal Readiness Score:** Pay Clarity Score pattern — 200px semi-circle SVG gauge (GR=60, strokeWidth=12, viewBox="0 0 180 180", 240° sweep); score = `Math.min(100, progressPct)`; teal (≥100%) / amber (≥60%) / red (<60%) color bands; summary line ("You are ahead of your goal" / "You are X% of the way to your goal"); 3 stat boxes: Projected (teal) · Goal Amount (navy) · Surplus/Remaining Gap (teal on-track, amber off-track)
- **Goal Breakdown donut:** On-track: teal `#1DB584` Goal Amount + `#334155` Surplus. Off-track: amber `#f59e0b` Projected + `#334155` Remaining Gap. Center = goal amount.
- **Savings Growth Timeline bar chart:** 6-bar stacked (contributions base + growth layer); contribution layer `#334155` (dark navy) when below target, `#1DB584` (teal) when at/above target; growth layer always teal; chart legend dot `#334155` · amber target dashed line
- **AI Goal Analysis:** always visible; Goal Readiness Score (0–100); smart lever: On Track (surplus) / Needs More (additional monthly) / No Progress (no contribution); Goal Progress + Time to Goal + Contribution Impact insight cards

### QA checks confirmed

1. **Route / no server errors** — loads cleanly, no hydration errors (DonutChart SVG float precision difference noted as benign, same across all DonutChart pages) ✓
2. **Default math** ($10,000 goal / $1,000 current / $200/mo / 5% return / 3yr): projected savings $8,988 · progress 89.9% · goal gap $1,012 · required monthly $226 · additional needed $26 · time to goal 34mo ✓
3. **Goal types** — all 5 pills (Vehicle / Home Down Payment / Vacation / Education / Other) switch correctly; readiness card title and summary line update; no math change ✓
4. **On-track state** — currentSavings $10,000 / goal $5,000: surplus card fires (teal), donut shows surplus slice, summary line "ahead" ✓
5. **Edge case: 0% return** — linear accumulation path (FV_contributions = contribution × n); no divide-by-zero; requiredMonthly = FV_needed / n ✓
6. **Edge case: 0 contribution + 0% return** — current savings only; no time-to-goal solve; neverReached edge case handled gracefully ✓
7. **Edge case: already reached** — currentSavings ≥ goal: alreadyReached path fires; progressPct ≥ 100; no negative gap ✓
8. **Safe guard** — all monetary/time outputs pass through `safe()` before render; no NaN or Infinity shown ✓
9. **Region toggle** — CA region: `CA$` prefix on all monetary inputs and outputs; US region: `$` prefix ✓
10. **Visual cards** — Goal Readiness gauge renders at correct fill; 3 stat boxes update; donut slices correct in both on-track and off-track states; bar chart colors match EF Calculator pattern ✓
11. **Responsive** — Desktop 1280px: no overflow; Tablet 768px: stacks correctly; Mobile 375px: zero overflow elements (bug fixed during QA) ✓
12. **Copy / disclaimer** — educational wording; no investment advice; no account/product recommendations; no inflation or tax claims; goal-type pill labeled "reference label only" in FAQ ✓

### Bug fixed during QA

**Mobile chart sidebar overflow** (375px `scrollWidth=403 > clientWidth=302`):
- Root cause: sidebar container had `flex flex-row sm:flex-col` — on mobile the stat boxes and legend sat side-by-side, too wide for 375px
- Fix: changed to `flex flex-col sm:flex-col` — stats and legend stack vertically on mobile
- Result after fix: `scrollWidth=375 === clientWidth=375` ✓

### Known benign issue

DonutChart SVG path `d` attribute shows a floating-point precision difference between server and client render (e.g. `35.95051346380453` vs `35.950513463804526`). Not introduced by this calculator — same hydration note exists across all DonutChart pages in the project. No fix needed; not blocking.

### Key V1 decisions

- Goal Type pill is a reference label only — changing it does not alter any formula or input
- Monthly compounding only (no frequency picker in V1)
- Time-to-goal solve is month-by-month iteration; cap 600 months to prevent infinite loop on impossible scenarios
- No inflation, no taxes, no account-type rules, no contribution limits — educational estimate only
- `safe()` guard on all math outputs prevents NaN/Infinity in UI across all input combinations
- Bar chart uses `#334155` (not near-black `#1e3a5f`) to match the donut gap slice color — unified color system

### Future V2 scope (not started)

Multiple concurrent goals; Rule of 72 educational integration; inflation-adjusted goal amount; account type / interest rate comparison (TFSA vs RRSP vs HYSA); detailed monthly contribution schedule table (Detailed Schedules Patch V2); lump-sum vs monthly-contributions comparison; target date picker (calendar date → derived years); contribution increase modeling.

---

## Savings Goal Calculator V1 — Validation & Lock

> Re-validated: 2026-07-20 · Result: **PASS — V1 LOCKED**

Full end-to-end re-validation of the original V1 QA Record above (methodology reverse-engineered and confirmed from source, independent financial validation via a standalone Node reimplementation of the growth/required-contribution/timeline formulas, exhaustive boundary and score-threshold testing, live 9-scenario AI Insight verification, PDF/UI parity review, responsive QA, and technical QA), followed by a targeted follow-up round closing a readiness-score/status boundary contradiction identified during that validation. Growth formula, end-of-month contribution timing, required-monthly (reverse PMT) formula, goal-timeline (`solveTimeToGoal`) methodology, `leverState` thresholds, and input ranges/presets were all confirmed unchanged — no financial methodology was altered at any point in this round.

### Validated

- Growth methodology (`FV_current` + `FV_contributions`, monthly compounding) independently re-derived and verified — no discrepancies.
- Monthly end-of-month (ordinary-annuity) contribution timing confirmed consistent across the growth formula, the `solveTimeToGoal` iteration, and on-page copy.
- Goal projection (`projectedSavings`) independently re-verified across a broad scenario matrix, including zero-return and zero-contribution paths.
- Required monthly contribution (reverse PMT) independently re-derived and cross-checked by manual arithmetic across multiple scenarios — confirmed as the correct algebraic inverse of the growth formula.
- Goal timeline methodology (`solveTimeToGoal`, 600-month cap, `alreadyReached`/`neverReached` handling) boundary-tested, including current-savings-equals-goal and ±$0.01 boundary cases.
- Exact-goal boundary (`projectedSavings === savingsGoal`, `surplus === 0`) validated live — donut chart and readiness gauge now agree with `leverState`/`readinessStatus` at this boundary (see Fix 3 below).
- Goal-reached state (`alreadyReached`) validated — correctly inclusive (`currentSavings >= goal`), consistent with `leverState`.
- AI Insight branches validated live across all 9 named scenarios (default, goal-already-reached, exact-goal, slight shortfall, large shortfall, zero return, zero contribution, long horizon, large value) — copy and numbers matched expected values in every case.
- Infinity/NaN input guard (`parseAmt()`) verified — adversarial input strings (`"1e999"`, `"Infinity"`, non-numeric garbage) clamp safely instead of propagating `NaN`/`Infinity` into displayed output.
- PDF Goal Progress % cap corrected to match the UI's 100% display cap (was capped at 200% in the PDF only).
- Exact-goal UI consistency corrected — donut chart and readiness gauge branch selection now use the canonical `leverState` field instead of a strict `surplus > 0` check that diverged at the exact-goal boundary.
- Readiness score now derived from floored raw progress (`Math.floor(progressPct)`, not `Math.round`) to prevent a premature "100/Excellent" score from displaying while `readinessStatus` still reads "Nearly There" for any progress in `[99.5, 100)`.
- Responsive QA passed at 375/768/1280px, including a 9-digit large-value stress test at 375px — zero overflow or layout defects.
- PDF/UI parity validated — the PDF adapter (`savingsGoalAdapter.ts`) consumes the same `results` object rendered in the UI with no independent recomputation, structurally guaranteeing financial-value parity; confirmed unaffected by, and automatically corrected by, the readiness-score fix (no adapter-side rounding logic exists for `readinessScore`).
- `npx tsc --noEmit` and `npx next build` both clean throughout every round of this validation.

### Fixes applied

1. **Infinity/NaN input guard** (`SavingsGoalCalculator.tsx:95-98`) — `parseAmt()` now clamps non-finite (`NaN`/`Infinity`) and negative input to `0` and caps at `Number.MAX_SAFE_INTEGER`, preventing adversarial input strings from propagating `Infinity`/`NaN` into the growth, timeline, and required-contribution math.
2. **PDF Goal Progress % cap parity** (`lib/pdf/adapters/savingsGoalAdapter.ts:176,264`) — changed `Math.min(200, Math.round(input.progressPct))` to `Math.min(100, Math.round(input.progressPct))` at both occurrences, matching the UI's existing 100% display cap.
3. **Exact-goal boundary UI consistency** (`SavingsGoalCalculator.tsx:643,1007`) — the donut chart's `isOnTrack` and the readiness gauge's `isAhead` branch-selectors used `results.surplus > 0` (strict), diverging from the canonical inclusive `leverState`/`readinessStatus` checks exactly at `projectedSavings === savingsGoal`. Both now read `results.leverState === 'on-track'`, eliminating the contradictory "On Track / 100/100" alongside "Remaining Gap $0%" state.
4. **Readiness score premature-100 fix** (`SavingsGoalCalculator.tsx:197`) — `readinessScore` changed from `Math.round(Math.min(100, Math.max(0, progressPct)))` to `Math.min(100, Math.max(0, Math.floor(progressPct)))`. Previously, any `progressPct` in `[99.5, 100)` rounded up to a displayed score of 100 ("Excellent") while `readinessStatus` (which uses raw `progressPct >= 100`) still read "Nearly There" — an internal contradiction. Flooring instead of rounding means the score can no longer claim 100 before actual progress reaches 100%; `readinessStatus`'s "On Track" threshold and the gauge arc fill (which already used raw `progressPct` directly) were unaffected.

### Confirmed working

- 30/30 independent Node-harness test cases matched production output, including Infinity/NaN-producing adversarial inputs.
- Live boundary verification of the readiness-score fix at `progressPct` = 99.49%, 99.50%, 99.99%, exactly 100%, and 105% (above target) — Score, Status, and AI Insight copy consistent at every point; Score never displays 100 unless actual progress has reached 100%.
- No regression across any of the 9 named AI Insight scenarios after either fix round.
- `npx tsc --noEmit`: clean. `npx next build`: clean, all 43 routes compiled, `/savings-goal-calculator` at 14.8 kB / 117 kB First Load JS.
- No console or dev-server errors observed at any point.

### Known non-blocking observation (not fixed, out of scope)

Two pre-existing descriptive captions — the header line "of \{goal\} goal · X% reached" and the readiness-gauge summary line "You are X% of the way to your goal" — use standard `Math.round(progressPct)` rather than the floor-based logic applied to `readinessScore`, so they can still display "100%" for actual progress in `[99.5, 100)`. This is independent of the `readinessScore`/`readinessLabel`/`readinessStatus` system the approved fix targeted and was not part of its scope; flagged for awareness only, not fixed.

---

## Income Tax Calculator V1 — QA Record

> QA completed: 2026-06-09 · Result: **PASS** · 12/12 checks · tsc --noEmit clean · Phase 1 build-out complete

### Calculator summary

- **Route:** `/income-tax-calculator`
- **Dual-region:** `useRegion()` — Canada (`CA$`) / USA (`$`)
- **Canada inputs:** Gross Income, Filing Status (display only), Province/Territory selector (13 options + Manual Rate), Manual Rate override
- **USA inputs:** Gross Income, Filing Status (Single / Married Filing Jointly — affects standard deduction), State/Local Rate %
- **Outputs:** Federal Tax, Provincial/State Tax, Total Tax, After-Tax Income, Monthly Take-Home, Effective Rate %, Marginal Rate %
- **TAX_YEAR constant:** 2025 (update each January)

### Core logic

```
CA:
  rawFed = progressive brackets(grossIncome, CA_BRACKETS)
  bpaCredit = min(rawFed, BPA × 0.15)
  federalTax = max(0, rawFed − bpaCredit)
  provinceTax = grossIncome × provinceRate
  totalTax = federalTax + provinceTax
  afterTaxIncome = grossIncome − totalTax
  effectiveRate = totalTax / grossIncome × 100
  marginalRate = highest bracket rate reached

US:
  taxableIncome = max(0, grossIncome − standardDeduction)
  federalTax = progressive brackets(taxableIncome, US_BRACKETS)
  stateTax = grossIncome × stateRate
  totalTax = federalTax + stateTax
  afterTaxIncome = grossIncome − totalTax
  effectiveRate = totalTax / grossIncome × 100
  marginalRate = highest bracket rate reached on taxableIncome

safe(n) = Number.isFinite(n) && n >= 0 ? n : 0  [guards all outputs]
monthlyTakeHome = afterTaxIncome / 12
takeHomeClarityScore = clamp(0, 100, round(100 − effectiveRate × 1.5))
```

### Visual cards

- **Take-Home Clarity Score gauge:** dark navy card; SVG arc gauge GR=68, 200px, 240° sweep, viewBox 180×180; score 0–100; teal (≥60) / amber (≥45) / red (<45) color bands; matches Pay Clarity Score (Salary Calculator) spec
- **Tax Breakdown donut:** teal `#1DB584` after-tax / amber `#F59E0B` federal / slate `#64748B` provincial-state; centerLabel "take-home / yr"; h3 "Tax Breakdown"
- **Gross to After-Tax pill composition card:** large teal "ESTIMATED AFTER-TAX INCOME" headline + `fmtx(afterTaxIncome)` in teal; fully-rounded pill bar (`borderRadius: 50`, `height: 36`) with teal/amber/slate segments; 5-row stat table (Gross Income / After-Tax Income / Est. Federal Tax / Provincial-State Tax / Effective Rate) with dot indicators; monthly take-home callout (`rgba(29,181,132,0.07)` background)
- **AI Income Tax Analysis:** always visible; result card (effective rate / marginal rate / monthly take-home); dark smart lever card (Tax Efficiency — Take-Home Clarity Score + keep-rate message); Marginal Rate Check / Income Allocation / Tax Planning Tip insight cards

### Default outputs

**Canada (ON, $80,000 gross, Single, 11% provincial):**
- Federal Tax: $10,825 · Provincial Tax: $8,800 · Total Tax: $19,625
- After-Tax Income: ~$60,375 (may show $60,374.98 — float arithmetic, non-blocking)
- Monthly Take-Home: $5,031.25 · Effective Rate: 24.5% · Marginal Rate: 20.5%

**USA ($80,000 gross, Single, 5% state/local):**
- Federal Tax: $9,214 · State Tax: $4,000 · Total Tax: $13,214
- After-Tax Income: $66,786 · Monthly Take-Home: $5,565.50
- Effective Rate: 16.5% · Marginal Rate: 22%

### QA checks confirmed

1. **Route / no server errors** — loads cleanly, no hydration warnings, no console errors ✓
2. **CA default math** ($80,000 gross / ON / Single): federal $10,825 · provincial $8,800 · after-tax ~$60,375 · effective 24.5% · marginal 20.5% ✓
3. **US default math** ($80,000 gross / Single / 5% state): federal $9,214 · state $4,000 · after-tax $66,786 · effective 16.5% · marginal 22% ✓
4. **Filing status** — US MFJ: standard deduction $30,000 (vs $15,000 Single), federal tax reduces correctly; CA: no math change ✓
5. **Province selector** — all presets update provincial rate and label; Manual Rate unlocks editable field ✓
6. **Edge cases** — $0 income: empty state, no NaN/Infinity; $1M: all values format correctly; income below BPA (CA) / below standard deduction (US): federal tax = 0, no negative ✓
7. **Region toggle** — CA: CA$ prefix, province selector visible; US: $ prefix, state rate input visible; all outputs update ✓
8. **Visual cards** — gauge arc renders at correct fill; donut 3-slice correct; pill bar segments proportional; stat rows all populate; monthly callout shows ✓
9. **AI Analysis** — all cards visible; score and copy update with inputs ✓
10. **Responsive** — Desktop 1280px: 2-col grid; Tablet 768px: stacks; Mobile 375px: no horizontal overflow ✓
11. **Copy / disclaimer** — "educational only" language; no official tax advice; CPP/EI/FICA excluded + disclosed; TAX_YEAR 2025 noted ✓
12. **tsc --noEmit** — clean ✓

### Known non-blocking items

- CA after-tax income may display as $60,374.98 instead of $60,375.00 at $80k gross due to floating-point arithmetic in the progressive bracket loop (`10,825.025 + 8,800 = 19,625.025`). Same pattern as DonutChart SVG precision across all calculators. Educational V1 — no fix required.
- `FileText` icon color in `CALC_INDEX` is purple (`#8B5CF6`) — intentional. Purple is used only in the nav system (mega-menu, search, directory chips). Calculator UI uses teal exclusively.

### V1 decisions

- Provincial rates are flat approximations (not progressive bracket tables) — clearly disclosed in FAQ and disclaimer
- State/local rate is user-entered manually — no US state preset database in V1
- No CPP, EI, FICA, Medicare, or payroll deductions — educational income tax estimate only
- BPA non-refundable credit cannot reduce federal tax below zero (`max(0, ...)`)
- Standard deduction subtracted before bracket math (US), not after
- Take-Home Clarity Score uses `100 − effectiveRate × 1.5` — same formula as Pay Clarity Score (Salary Calculator)

### Future V2 scope (not started)

Progressive provincial bracket tables for all 13 CA provinces/territories; Ontario surtax; Quebec abatement (16.5%); RRSP deduction input (reduces federal + provincial taxable income); CPP/EI itemized breakdown (CA); FICA/Medicare itemized (US); capital gains income type; self-employment income; multi-income household; year-over-year tax estimate comparison; detailed bracket-by-bracket breakdown table.

---

## Income Tax Calculator V1 — Validation & Lock

> Re-validated: 2026-07-21 · Result: **PASS — V1 LOCKED**

### Validated

- Source methodology fully reverse-engineered and independently validated
- 2025 tax-year implementation verified
- US progressive federal tax validated
- Canada progressive federal tax validated
- US flat state/local approximation validated
- Canada flat provincial approximation validated
- 2025 Canadian federal brackets updated to official values
- Canadian first federal bracket corrected to 14.5%
- Canadian BPA credit conversion corrected to 14.5%
- 2025 US standard deductions updated: Single: $15,750; Married Filing Jointly: $31,500
- Federal, provincial/state, total tax, and after-tax reconciliation independently verified
- Marginal-rate boundary validation completed
- Canada $200,000 marginal rate confirmed at 29%
- Finite-input guard added for invalid numeric input
- PDF status and clarity label fully aligned with UI
- Sample PDF generator updated to 2025 statutory values
- UI/PDF parity verified
- AI Insight values verified
- PDF generation verified
- Responsive QA passed (375px / 768px / 1280px)
- TypeScript validation passed
- Production build passed

### Known Scope (intentional)

- Flat provincial/state approximation
- BPA phase-out not implemented
- CRA Top-Up Tax Credit not implemented
- CPP/EI/FICA/Medicare not modeled
- Educational estimate only

---

## All Calculators V2 — QA Record

> QA completed: 2026-06-09 · Result: **PASS** · 9/9 checks · tsc clean
> Visual polish patch applied same session: Featured Popular section restyled to dark navy premium panel.

### Confirmed working

1. **Route / no server errors** — `/calculators` loads cleanly, no hydration warnings, no console errors ✓
2. **Search** — `scoreEntry()` weighted scoring (label=3, searchLabel=3, description=2, category=1, region=0.5); "mortgage" → Canadian Mortgage Calculator only (US Mortgage `navHidden` excluded); "savings" returns correct multi-result list ✓
3. **Category chips** — All / Mortgage / Financial Planning / Investing / Retirement / Loans / Tax & Salary / Canada Only; each filters to correct entries with correct count display ✓
4. **Canada Only filter** — `entry.region === 'ca'` → 3 entries: CMHC Insurance / TFSA / RRSP ✓
5. **Search + category simultaneously** — both apply independently, neither clears the other (V1 mutual-exclusion bug fixed) ✓
6. **Featured Popular section** — renders when no query and no filter active; dark navy gradient panel (`linear-gradient(160deg, #091523 0%, #0D1B2A 45%, #0A1628 100%)`); `DarkCalcCard` style (rgba bg, white text, amber Canada badge, ghost CA&USA badge) ✓
7. **URL sync** — typing query updates `?q=`; clicking chip updates `?category=`; initial `?q=` and `?category=` searchParams pre-fill state; `useRef(true)` guard prevents initial-render URL replace ✓
8. **Mobile 375px** — no horizontal overflow; chip row scrolls horizontally with hidden scrollbar; all cards single-column; no clipping ✓
9. **SEO block** — renders below the calculator grid; copy present; no overflow ✓

### Architecture notes

- `page.tsx`: server component; reads `searchParams` (Promise, Next.js 15); passes `initialQuery` and `initialCategory` to `CalculatorsClient`
- `CalculatorsClient.tsx`: `'use client'`; `useState` for `query` and `activeFilter`; `useMemo` for `visibleList`, `filtered`, `featuredEntries`; URL sync in `useEffect` with `isFirstRender` ref guard
- `FEATURED_HREFS` hardcoded array of 6 hrefs; `featuredEntries` derived via type-predicate filter `(e): e is CalcEntry => e !== undefined`
- `activeFilter: string | null` — `null` = All; `'canada-only'` = Canada Only special branch; else = category name string
- `DarkCalcCard` and `DarkRegionBadge` — dark-themed variants used only in the Featured Popular panel; hover via `onMouseEnter`/`onMouseLeave` DOM style manipulation (no Tailwind arbitrary values)

### Future V2 scope

Arrow-key navigation in chip row; animated card transitions on filter change; "Recently Viewed" strip (localStorage); calculator comparison mode (side-by-side); related-categories suggestion when zero results; AI-powered semantic search (Phase 4+).

---

## Next Calculators to Build

New calculators are **built fresh from the V2 template** — not migrated from old pages. Apply `CALCULATOR_TEMPLATE_V2.md` exactly.

| Calculator | Slug | Priority |
|------------|------|----------|
| HELOC Calculator | TBD | Medium |

Car Loan V2 items are tracked in the QA record above. Do not begin until explicitly scoped.

Build order: follow user direction.

---

## Future Features (not started)

### PDF Report Template
- "Download PDF" button in AI Analysis is a placeholder.
- When built: generate a branded single-page PDF with inputs, results, amortization summary, and Health Score.
- Approach: server-side route or browser `window.print()` with print-specific CSS.

### Mobile Calculator UX V2
- Current mobile layout is functional but optimized for desktop-first.
- Future: sticky bottom input bar on mobile, swipe between blocks, collapsible input panel.

### Related Calculators / Related Articles
- Block below FAQ: 2–3 cards linking to related tools.
- E.g., US Mortgage page → links to Mortgage Qualifier, Rent vs Buy.
- Also: editorial content links for SEO (blog-style, not yet built).

### Search Functionality — Phase 2+ (not started)
- Phase 1 complete: `CalcSearch` component (hero / header / drawer variants), `CALC_INDEX` as single metadata source, `/calculators?q=` URL filtering.
- Phase 2: Arrow-key navigation in the `CalcSearch` dropdown; keyboard focus management.
- Phase 3: Richer autocomplete — show category labels, region badges, highlighted match text.
- Phase 4: AI-powered semantic search — natural language queries, intent matching.

### Mobile Navigation — Phase 2+ (not started)
- Phase 1 complete: white/glass drawer, flat list, pinned CTA, scroll lock.
- Phase 2a *(known limitation from QA)*: apply `regionRoutes` to mobile drawer Mortgage link; use short nav labels (`NAV_LABEL`-style) in mobile drawer items. Currently drawer shows "Canadian Mortgage Calculator" and always links to the CA route regardless of active region.
- Phase 2b: open/close animation (slide-down + fade), close on backdrop tap.
- Phase 3: keyboard focus trap, Escape-to-close, optional Home link above region toggle.

---

## Homepage Status

- Homepage V2 (`app/page.tsx`) is part of the official V2 foundation.
- Mobile product-first pass complete (2026-05-23). Status: live — can receive further polish, not a blocker.
- Use only as a visual reference for marketing sections. Do not use as a code reference for calculator pages.
- Mobile hero is product-first: compact headline → HeroPreview card → search action. Do not make mobile hero text-heavy.
- Desktop layout remains product/marketing balanced (2-column, chips visible, full search). Do not apply mobile hero rules to desktop.
- Calculator pages are not affected by any homepage mobile layout rules.

---

## AI Insights Page V1 — QA Record

> QA completed: 2026-06-11 · Result: **PASS**

### Page structure confirmed

- Hero: product mockup (left desktop / top mobile), copy (right desktop / top mobile via CSS flex order), floating Mortgage Health Score card
- Section 2: dark navy background, three white cards (Calculate / Analyze / Decide), scenario strip
- Section 3: curiosity-driven four-example layout (Mortgage large / Savings Goal medium / Retirement + Tax & Salary small)
- Section 4: dark navy final CTA

### QA confirmed

- H1 count: 1 ✅ (duplicate H1 bug found and fixed during QA — CopyBlock was rendered twice with `lg:hidden`/`hidden lg:block`; fixed with single CopyBlock using CSS flex `order-first lg:order-last`)
- Metadata title: `AI-Assisted Financial Insights` — root layout appends ` | FinCalc Smart` correctly ✅
- All CTA / calculator links correct ✅
- No server errors ✅
- No console errors ✅
- No hydration warnings ✅
- No horizontal overflow at 375px / 768px / 1280px ✅
- Desktop 1280px: hero two-column, Section 2 cards side by side, Section 3 grid balanced ✅
- Tablet 768px: layout wraps correctly, no overflow ✅
- Mobile 375px: copy stacks first, chrome dots hidden, glass card hidden, metrics grid equal-width 3-column, Section 2 heading single-line at `text-xl`, donut centered ✅
- `tsc --noEmit` clean ✅

### Bugs fixed during QA

1. **Duplicate H1** — CopyBlock rendered twice (once `lg:hidden`, once `hidden lg:block`) for responsive layout. Both removed; single CopyBlock with CSS flex order (`order-first lg:order-last`) used instead. H1 count corrected to 1.
2. **Metadata title duplication** — Page title included ` | FinCalc Smart`; root layout's `template` appended it again, producing "FinCalc Smart | FinCalc Smart". Fixed: page title simplified to `AI-Assisted Financial Insights`.

---

## Shared Page-Width / Container Standard — Established 2026-06-11

All non-calculator pages must use the homepage primary inner-container pattern for all main content sections.

**Homepage container:** `mx-auto max-w-6xl px-4`

### Rule

- Do not invent a new `max-width` for each new page.
- Full-width section backgrounds (`<section>` with a background color or gradient) are permitted; only the inner content wrapper must use the shared container.
- All major sections on the same page must align to the same left/right boundaries unless an intentional exception is documented.
- Navigation may remain slightly wider than page content.

### Pages corrected to this standard (2026-06-11)

| Page | Previous container | Corrected to |
|------|--------------------|--------------|
| `/ai-insights` Hero | `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8` | `mx-auto max-w-6xl px-4` |
| `/ai-insights` Section 2 | `mx-auto max-w-6xl px-4 sm:px-6 lg:px-8` | `mx-auto max-w-6xl px-4` |
| `/ai-insights` Section 3 | `mx-auto max-w-6xl px-4 sm:px-6 lg:px-8` | `mx-auto max-w-6xl px-4` |
| `/calculators` | `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8` | `mx-auto max-w-6xl px-4` |

### Applies to all future non-calculator pages

Including but not limited to: `/financial-guides`, any future landing pages, comparison pages, and editorial content pages.

---

## Common PDF Download V1 — Locked Prototype (2026-06-16)

> Prototype built and approved on `/retirement-planning-calculator`. Architecture is locked. Do not redesign.

### Approved architecture

| Constraint | Value |
|-----------|-------|
| PDF library | jsPDF 2.x — lazy-loaded on click via `await import('jspdf')` |
| Screenshot capture | None — no html2canvas |
| Page capture | None — vector-only, data-driven |
| Engine | `lib/pdf/pdfEngine.ts` — shared, calculator-agnostic |
| Adapters | `lib/pdf/adapters/[name]Adapter.ts` — one per report family |
| Types | `lib/pdf/pdfTypes.ts` — `ReportData` interface |
| Theme | `lib/pdf/pdfTheme.ts` — `C` (colors), `P` (page geometry), `F` (font) |
| Page size | US Letter (215.9 × 279.4mm), A4-safe 19mm H / 18mm V margins |
| Font | Helvetica (V1) |
| Default page count | 2 pages standard; 1 page simple; 3 pages complex |
| Footer-safe zone | `P.safeY = 257mm` — no content below this line |
| Safe page break | `ensureSpace(doc, data, y, needed)` — adds page + mini-header if needed |
| Currency | CA region: `en-US` locale + `CAD` → `CA$` · US region: `en-US` locale + `USD` → `$` |
| Email Results | Disabled (placeholder only) — not implemented |
| Backend PDF service | None — entirely client-side |

### Approved report structure

**Page 1:** brand header · report title · generated date/time · scenario reference ID · region + currency · source URL · executive summary + key metrics · composition visual (vector bar) · AI-assisted summary · inputs & assumptions

**Page 2:** detailed results · key drivers / possible adjustments · methodology (what it does + what is not modeled) · educational disclaimer · footer + page number

### Locked visual system

- White page base / soft-gray section fills (`C.softGray`)
- Navy executive panel (`C.navy`)
- Teal positive accents (`C.teal`)
- Restrained amber caution accents (`C.amber`)
- No decorative images or per-calculator design variations
- Dynamic total page count via `doc.getNumberOfPages()` + `doc.setPage(pg)` loop

### Verified (prototype)

| Check | Result |
|-------|--------|
| Canada · CAD with `CA$` formatting | ✅ |
| United States · USD with `$` formatting | ✅ |
| On Track key drivers wording | ✅ |
| Behind Target key drivers wording | ✅ |
| Two-page pagination | ✅ |
| No footer / disclaimer collision | ✅ |
| Page balance (inputs on page 1) | ✅ |
| Grammar: `reflects an excellent trajectory` | ✅ |
| `tsc --noEmit` clean | ✅ |
| `next build` clean (retirement page 118 kB, jsPDF not in initial bundle) | ✅ |

### Source files

| File | Role |
|------|------|
| `lib/pdf/pdfTypes.ts` | `ReportData`, `MetricItem`, `CompositionSegment`, `InputSection`, `ResultSection`, `MethodologySection`, `InsightBlock`, `ReportHeader`, `ExecutiveSummary`, `CompositionBar` |
| `lib/pdf/pdfTheme.ts` | `C` colors · `P` page geometry (`safeY: 257`) · `F` font · `lh()` line-height helper |
| `lib/pdf/pdfEngine.ts` | `buildReportDocument(data)` · `generatePDF(data, filename)` · `ensureSpace()` · height pre-calculators · footer loop |
| `lib/pdf/adapters/retirementAdapter.ts` | `buildRetirementReportData()` (pure mapper) · `buildRetirementPDF()` (browser entry point) · `RetirementAdapterInput` |
| `lib/pdf/adapters/savingsGoalAdapter.ts` | `buildSavingsGoalReportData()` · `buildSavingsGoalPDF()` · `SavingsGoalAdapterInput` |
| `lib/pdf/adapters/mortgageAdapter.ts` | `buildMortgageReportData()` · `buildMortgagePDF()` · `MortgageAdapterInput` (CA) · `buildUSMortgageReportData()` · `buildUSMortgagePDF()` · `USMortgageAdapterInput` (US) · internal `makePdfFmt()` (en-US+CAD→CA$) + `makePdfFmtUS()` (en-US+USD→$) · Health Score two-mode scoring · PMI (US) / CMHC (CA) |
| `lib/pdf/adapters/investmentGrowthAdapter.ts` | `buildInvestmentGrowthReportData()` · `buildInvestmentGrowthPDF()` · `InvestmentGrowthAdapterInput` · `CIFreq` · Compounding Power Score · milestone fields sourced from live CIResults |
| `scripts/generateSamplePDFs.ts` | Node/tsx script — generates sample PDFs to `_docs/sample-pdfs/` |
| `_docs/sample-pdfs/` | Sample PDFs: Retirement (4) · Savings Goal (2) · Canadian Mortgage (2 — standard + CMHC) · Compound Interest (2 — CA long-term + US shorter) · US Mortgage (2 — standard no-PMI + PMI 10% down) · Investment Fees (2 — CA high-fee + US low-fee) · ROI (2 — CA profitable/on-target + US loss) · Personal Loan (2 — CA Good + US Poor) · Car Loan (2 — CA Fair + US Good/strong equity) · Salary (2 — CA $75k/25% + US $95k/28%) |
| `lib/pdf/adapters/investmentFeesAdapter.ts` | `buildInvestmentFeesReportData()` · `buildInvestmentFeesPDF()` · `InvestmentFeesAdapterInput` · 3-segment composition bar (contributions / net returns / lost to fees) · Fee Drag Score |
| `lib/pdf/adapters/roiAdapter.ts` | `buildROIReportData()` · `buildROIPDF()` · `ROIAdapterInput` · profit/loss donut · ROI Health Score · optional annualized ROI + target tracking |

---

## Common PDF Download — Rollout Plan

> Defined 2026-06-16. Controls adapter build order for all 24 public calculators.
> Do not begin a batch until the previous batch is fully verified.

### Report families

Calculators are grouped into families based on data structure. One adapter per family where data structures match. Calculator-specific adapters only when data structures materially differ.

| # | Family | Calculators | Adapter |
|---|--------|-------------|---------|
| 1 | Retirement / Goal Progress | retirement-planning-calculator ✅, savings-goal-calculator, fire-calculator, retirement-withdrawal-calculator, rrsp-savings-calculator, tfsa-calculator | `retirementAdapter` (locked) · `fireAdapter` · `withdrawalAdapter` · `canadaRegisteredAdapter` |
| 2 | Investment Growth | compound-interest-calculator, investment-fees-calculator, roi-calculator | `investmentGrowthAdapter` (locked — approved reusable pattern) |
| 3 | Mortgage | canadian-mortgage-calculator, us-mortgage-calculator, mortgage-qualifier-calculator, mortgage-refinance-calculator | `mortgageAdapter` · `mortgageQualifierAdapter` · `mortgageRefinanceAdapter` |
| 4 | Loan / Debt | personal-loan-calculator, car-loan-calculator, debt-repayment-calculator | `loanAdapter` · `debtRepaymentAdapter` |
| 5 | Tax / Income | income-tax-calculator, salary-calculator, sales-tax-calculator | `taxAdapter` · `salesTaxAdapter` |
| 6 | Cash Flow / Savings | emergency-fund-calculator | `cashFlowAdapter` |
| 7 | Net Worth / Snapshot | net-worth-calculator | `netWorthAdapter` |
| 8 | Comparison | rent-vs-buy-calculator, lump-sum-vs-dca-calculator | `comparisonAdapter` |
| 9 | Eligibility / Insurance | cmhc-mortgage-insurance-calculator | `cmhcAdapter` |

---

### Full calculator registry

| Route | Calculator Name | Region | Family | PDF Status | Adapter | Hero Metric | Key Report Metrics | Visual | Status Source | Complexity |
|-------|----------------|--------|--------|------------|---------|-------------|-------------------|--------|---------------|------------|
| /retirement-planning-calculator | Retirement Savings Calculator | Both | 1 | ✅ Locked | retirementAdapter | Projected savings | Projected savings · goal · gap/surplus · goal progress % · additional monthly · readiness score (0–100) | Composition bar: contributions vs growth | statusLabel / readinessScore | — |
| /savings-goal-calculator | Savings Goal Calculator | Both | 1 | ✅ Locked (2026-06-17) | savingsGoalAdapter | Projected savings | Projected savings · goal · gap/surplus · progress % · required monthly · time to goal | Composition bar: contributions vs growth | Goal Readiness Score | Low |
| /fire-calculator | FIRE Calculator | Both | 1 | ⬜ Batch 3 | fireAdapter (new) | FIRE age | FIRE target · progress % · gap · years to FIRE · projected portfolio · contributions · growth · FI Progress Score | Composition bar: initial assets + contributions + growth | FI Progress Score / already-FI / not-reachable | High |
| /retirement-withdrawal-calculator | Retirement Withdrawal Calculator | Both | 1 | ⬜ Batch 2 | withdrawalAdapter (new) | Est. years lasting | Years lasting · depletion age · first-year withdrawal rate · sustainability status · Withdrawal Pressure Score | Drawdown composition bar: years funded vs depleted | sustainability status / Withdrawal Pressure Score | Medium |
| /rrsp-savings-calculator | RRSP Savings Calculator | CA | 1 | ⬜ Batch 3 | canadaRegisteredAdapter (new) | Projected RRSP balance | Projected balance · total contributions · growth · estimated tax savings · contribution room used/remaining | Composition bar: contributions vs growth | On Track / Over Room / No Room | Low |
| /tfsa-calculator | TFSA Calculator | CA | 1 | ⬜ Batch 3 | canadaRegisteredAdapter (shared with RRSP) | Projected TFSA balance | Projected balance · total contributions · tax-free growth · room used · room remaining | Composition bar + room usage bar | On Track / Nearly Full / Over Room | Low |
| /compound-interest-calculator | Compound Interest Calculator | Both | 2 | ✅ Locked (2026-06-17) | investmentGrowthAdapter | Final balance | Final balance · total contributions · interest earned · growth % · optional goal progress | Composition bar: contributions vs interest | Compounding Power Score | Medium |
| /investment-fees-calculator | Investment Fees Calculator | Both | 2 | ✅ Locked (2026-06-18) | investmentFeesAdapter | Portfolio after fees | Portfolio after fees · lost to fees · value at comparison fee · total contributions · Fee Drag Score | Composition bar: contributions vs net returns vs fees lost | Fee Drag Score | Medium |
| /roi-calculator | ROI Calculator | Both | 2 | ✅ Locked (2026-06-18) | roiAdapter | ROI % | Net profit/loss · total cost · ROI % · annualized ROI (if period) · target gap/surplus · ROI Health Score | Profit/loss donut (cost vs profit or recovered vs loss) | ROI Health Score | Low |
| /canadian-mortgage-calculator | Canadian Mortgage Calculator | CA | 3 | ✅ Locked (2026-06-17) | mortgageAdapter | Monthly payment | Monthly payment · total interest · total payments · amortization · Mortgage Health Score | Composition bar: principal vs interest | Mortgage Health Score (two-mode) | High |
| /us-mortgage-calculator | US Mortgage Calculator | US | 3 | ⬜ Batch 2 | mortgageAdapter region variant | Monthly payment | Same as CA · US monthly compounding · USD | Composition bar | Mortgage Health Score | Low |
| /mortgage-qualifier-calculator | Mortgage Qualifier Calculator | Both | 3 | ⬜ Batch 2 | mortgageQualifierAdapter (new) | Max qualifying mortgage | Max mortgage · max purchase price · monthly P&I · GDS ratio · TDS ratio · verdict | GDS/TDS ratio composition bars | Approved / Declined | Medium |
| /mortgage-refinance-calculator | Mortgage Refinance Calculator | Both | 3 | ⬜ Batch 3 | mortgageRefinanceAdapter (new) | Monthly savings | Current vs new payment · monthly savings · break-even months · total interest impact · refi decision | Bar: current vs new payment | saves / no-break-even / costs-more | Medium |
| /cmhc-mortgage-insurance-calculator | CMHC Insurance Calculator | CA | 9 | ⬜ Batch 3 | cmhcAdapter (new, CA-only) | CMHC premium | Premium amount · premium rate % · base mortgage · total mortgage · down payment % · eligibility status | Premium tier bar | Eligible / Ineligible / No Insurance Required | Medium |
| /personal-loan-calculator | Personal Loan Calculator | Both | 4 | ✅ Locked (2026-06-18) | loanAdapter | Monthly payment | Monthly payment · total interest · total payments · term · Borrowing Cost Score | Composition bar: principal vs interest | Borrowing Cost Score | Low |
| /car-loan-calculator | Car Loan Calculator | Both | 4 | ✅ Locked (2026-06-18) | loanAdapter (shared with personal loan) | Monthly payment | Monthly payment · total interest · total payments · amount financed · down payment · Borrowing Cost Score | Composition bar: principal vs interest | Borrowing Cost Score | Low |
| /debt-repayment-calculator | Debt Repayment Calculator | Both | 4 | ⬜ Batch 3 | debtRepaymentAdapter (new) | Time to payoff | Time to payoff · total interest · total paid · monthly payment · annual fee impact · Payoff Status Score | Payoff timeline bar | Payoff Status Score | Medium |
| /income-tax-calculator | Income Tax Calculator | Both | 5 | ✅ Locked (2026-07-21) | taxAdapter | After-tax income | Federal tax · provincial/state tax · total tax · effective rate % · marginal rate % · monthly take-home · Take-Home Clarity Score | Composition bar: after-tax vs federal vs provincial/state | Take-Home Clarity Score | Medium |
| /salary-calculator | Salary Calculator | Both | 5 | ✅ Locked (2026-06-18) | taxIncomeAdapter (locked, CA+US) | Annual gross | Annual gross · annual take-home · estimated deductions · Pay Clarity Score | Composition bar: take-home vs deductions | Pay Clarity Score | Low |
| /sales-tax-calculator | Sales Tax Calculator | Both | 5 | ⬜ Batch 3 | salesTaxAdapter (new) | Tax amount | Amount pre-tax · tax amount · amount post-tax · effective rate % · CA component breakdown (GST/PST/HST) | Composition bar: base vs tax vs optional components | Add Tax / Remove Tax mode | Low |
| /emergency-fund-calculator | Emergency Fund Calculator | Both | 6 | ⬜ Batch 1 | cashFlowAdapter (new) | Fund coverage (months) | Fund target · current coverage (months) · gap · months to target · Emergency Readiness Score | Coverage bar: current savings vs remaining gap | Emergency Readiness Score / statusLabel | Low |
| /net-worth-calculator | Net Worth Calculator | Both | 7 | ⬜ Batch 1 | netWorthAdapter (new) | Net worth | Total assets · total liabilities · net worth · D/A ratio · liquid % · Net Worth Health Score | Asset composition bar: 4 asset categories | Net Worth Health Score | Medium |
| /rent-vs-buy-calculator | Rent vs Buy Calculator | Both | 8 | ⬜ Batch 1 | comparisonAdapter (new) | Decision verdict | Rent cost · net buy cost · decision (Buying/Renting/Close Call) at each horizon · break-even point | Cost comparison bar: rent vs net buy (per horizon) | Buying / Renting / Close Call | High |
| /lump-sum-vs-dca-calculator | Lump Sum vs Monthly Investment | Both | 8 | ⬜ Batch 3 | comparisonAdapter minor mapping | Lump sum vs monthly FV | Lump sum FV · monthly strategy FV · gap · monthly amount · Timing Advantage Score | Dual-value composition bar | Timing Advantage Score | Medium |

**Page counts by complexity:**
- **1-page** (simple snapshot): sales-tax-calculator, salary-calculator
- **2-page** (standard): all others unless noted below
- **3-page** (complex): rent-vs-buy-calculator (multi-horizon table), fire-calculator (age timeline), retirement-withdrawal-calculator (year-by-year simulation detail)

---

### Batch 1 — Major family validation (7 calculators)

Validates one representative from each major report family. Must be complete before Batch 2 begins.

| Priority | Route | Family | New Adapter | Complexity | Notes |
|----------|-------|--------|-------------|-----------|-------|
| ✅ Done | /retirement-planning-calculator | 1 — Retirement | retirementAdapter | — | Locked prototype |
| ✅ Done | /canadian-mortgage-calculator | 3 — Mortgage | mortgageAdapter | High | Locked 2026-06-17. CA semi-annual compounding. 2-page standard+CMHC. Composition bar: principal vs interest. Health Score two-mode scoring mirrored in handleDownloadPDF. |
| ✅ Done | /compound-interest-calculator | 2 — Investment Growth | investmentGrowthAdapter | Medium | Locked 2026-06-17. CA+US. FV annuity formula. Compounding Power Score. Approved reusable pattern for Investment Growth family (investment-fees, roi). |
| ✅ Done | /us-mortgage-calculator | 3 — Mortgage | mortgageAdapter (region reuse) | Medium | Locked 2026-06-18. US monthly compounding, USD, PMI (not CMHC), DTI 28/36 (not GDS/TDS). 2-page standard+PMI. Mortgage family regional reuse validated. |
| 3 | /emergency-fund-calculator | 6 — Cash Flow | cashFlowAdapter | Low | Simplest structure: coverage months, gap, readiness score. Good early win. |
| 4 | /rent-vs-buy-calculator | 8 — Comparison | comparisonAdapter | High | Most complex in batch: multi-horizon decision card. Consider 3-page layout. |
| 5 | /income-tax-calculator | 5 — Tax/Income | taxAdapter | Medium | Federal + provincial/state breakdown. Validates tax family. |
| 6 | /net-worth-calculator | 7 — Net Worth | netWorthAdapter | Medium | Snapshot format. No time-series projection. Validates snapshot family. |

---

### Batch 2 — Adapter reuse with minor mapping (9 calculators)

All Batch 2 calculators share data structure with a Batch 1 adapter. Expected: thin wrapper or minor field remapping only.

| Route | Reuses | Mapping changes |
|-------|--------|----------------|
| ~~savings-goal-calculator~~ | ✅ savingsGoalAdapter locked 2026-06-17 | — |
| ~~us-mortgage-calculator~~ | ✅ mortgageAdapter extended CA+US, locked 2026-06-18 | Region = US, monthly compounding, USD, PMI not CMHC, DTI not GDS/TDS |
| ~~personal-loan-calculator~~ | ✅ loanAdapter locked 2026-06-18 | term in years, shorter-term opt |
| ~~car-loan-calculator~~ | ✅ loanAdapter locked 2026-06-18 | vehicle price + down payment rows, shorter-term + down-opt levers |
| /investment-fees-calculator | investmentGrowthAdapter | Three-value comparison (gross / net / comparison fee) |
| /roi-calculator | investmentGrowthAdapter | Hero = ROI % not FV; no time-series chart; optional annualized |
| ~~salary-calculator~~ | ✅ taxIncomeAdapter locked 2026-06-18 | New dedicated adapter (Family 5 first representative); CA+US; user-entered deduction rate only; Pay Clarity Score from component state; region-specific methodology + disclaimer |
| /mortgage-qualifier-calculator | mortgageQualifierAdapter | Verdict format (Approved/Declined); GDS/TDS ratios as hero |
| /retirement-withdrawal-calculator | withdrawalAdapter | Year-by-year simulation results; sustainability status as status |

---

### Batch 3 — Custom adapters and complex calculators (8 calculators)

These require new adapters or significant adapter logic beyond family reuse.

| Route | Reason for custom work |
|-------|----------------------|
| /fire-calculator | Binary-search FIRE solver; age timeline; already-FI / not-reachable edge states |
| /debt-repayment-calculator | Payoff timeline; annual fee impact; distinct from loan calculators |
| /mortgage-refinance-calculator | Break-even logic; current-vs-new payment comparison format |
| /cmhc-mortgage-insurance-calculator | CA-only; eligibility tier table; snapshot format (no time series) |
| /lump-sum-vs-dca-calculator | Two-strategy comparison structure; Timing Advantage Score |
| /tfsa-calculator | CA-only; contribution room tracking; two outputs (projected + room usage) |
| /rrsp-savings-calculator | CA-only; tax savings estimate adds second output category |
| /sales-tax-calculator | CA province component breakdown; Add/Remove mode affects data shape |

---

### Adapter reuse summary

| Adapter | Calculators covered |
|---------|-------------------|
| `retirementAdapter` (locked) | retirement-planning-calculator ✅ |
| `savingsGoalAdapter` (locked) | savings-goal-calculator ✅ |
| `fireAdapter` (new) | fire-calculator |
| `withdrawalAdapter` (new) | retirement-withdrawal-calculator |
| `canadaRegisteredAdapter` (new) | tfsa-calculator · rrsp-savings-calculator |
| `investmentGrowthAdapter` (locked) | compound-interest-calculator ✅ |
| `investmentFeesAdapter` (locked) | investment-fees-calculator ✅ |
| `roiAdapter` (locked) | roi-calculator ✅ |
| `mortgageAdapter` (locked, CA+US) | canadian-mortgage-calculator ✅ · us-mortgage-calculator ✅ |
| `mortgageQualifierAdapter` (new) | mortgage-qualifier-calculator |
| `mortgageRefinanceAdapter` (new) | mortgage-refinance-calculator |
| `loanAdapter` (locked) | personal-loan-calculator ✅ · car-loan-calculator ✅ |
| `debtRepaymentAdapter` (new) | debt-repayment-calculator |
| `taxIncomeAdapter` (locked) | salary-calculator ✅ |
| `taxAdapter` (new) | income-tax-calculator |
| `salesTaxAdapter` (new) | sales-tax-calculator |
| `cashFlowAdapter` (new) | emergency-fund-calculator |
| `netWorthAdapter` (new) | net-worth-calculator |
| `comparisonAdapter` (new) | rent-vs-buy-calculator · lump-sum-vs-dca-calculator |
| `cmhcAdapter` (new) | cmhc-mortgage-insurance-calculator |

**Total adapters locked: 22** (9 prior + 13 new 2026-06-19: withdrawalAdapter · fireAdapter · canadaRegisteredAdapter · mortgageQualifierAdapter · mortgageRefinanceAdapter · debtRepaymentAdapter · taxAdapter · salesTaxAdapter · emergencyFundAdapter · netWorthAdapter · rentVsBuyAdapter · lumpSumVsDcaAdapter · cmhcAdapter). **All 13 calculator Download PDF buttons wired and live.** tsc clean · next build clean (35 pages).

### Common PDF Download V1 — COMPLETE (2026-06-19)

All 24 public calculators now have PDF adapters or confirmed no-button status (sales-tax-calculator has no AI panel). Rollout is complete. No remaining PDF adapter work unless a new calculator is added.

**Adapters locked:** retirementAdapter · savingsGoalAdapter · mortgageAdapter (CA+US) · investmentGrowthAdapter · investmentFeesAdapter · roiAdapter · loanAdapter · taxIncomeAdapter · withdrawalAdapter · fireAdapter · canadaRegisteredAdapter · mortgageQualifierAdapter · mortgageRefinanceAdapter · debtRepaymentAdapter · taxAdapter · salesTaxAdapter · emergencyFundAdapter · netWorthAdapter · rentVsBuyAdapter · lumpSumVsDcaAdapter · cmhcAdapter

---

## Post-Launch Platform Foundation — July 2026

> Master Roadmap V2 is maintained externally by Andrew and governs current priorities and sequencing. It is not stored in this repository. `PROJECT_STATUS.md` is the durable in-repository record of completed and locked work and must not be treated as the active roadmap. At the end of every future Platform Foundation task, `PROJECT_STATUS.md` must be updated after live QA and final PASS. Future or unapproved tasks must not be added here as though they are active work.

Status legend used below: **COMPLETE** — implemented and verified. **LOCKED** — implemented, QA-approved, and not open for casual changes. **PARTIALLY COMPLETE** — a valid foundation exists, but a wider audit or implementation remains. **PAUSED** — intentionally not active.

| Item | Status | Details |
|------|--------|---------|
| XML Sitemap | ✅ COMPLETE | `app/sitemap.ts` implemented; production sitemap live; includes core static routes, guides, and calculator routes; submitted to Google Search Console. |
| robots.txt | ✅ COMPLETE | `app/robots.ts` implemented; allows public crawling; references the production XML sitemap. |
| Canonical Domain Redirect | ✅ COMPLETE | Non-www domain permanently redirects to the canonical production domain `https://www.fincalcsmart.com`; path and query strings preserved. Page-level canonical tags and hreflang have not been audited. |
| Homepage Structured Data Foundation | 🟡 PARTIALLY COMPLETE | Organization, WebSite, and SearchAction schema implemented on the homepage. Calculator-level, guide-level, and platform-wide structured data have not yet received the planned dedicated audit. |
| Mobile Navigation Update | ✅ COMPLETE / LOCKED | AI Insights and Financial Guides added to the mobile drawer; production verification completed. |
| Continue Planning V1 | ✅ COMPLETE / LOCKED | Recent calculator usage stored locally; homepage Continue Planning widget shows up to five recently used calculators; first-visit auto-expand; collapsed pill remains after dismissal; production verification completed. This is a returning-user experience foundation, not a saved-account or cloud workspace system. |
| Project Vision Alignment | ✅ COMPLETE / LOCKED | All project participants (Andrew, ChatGPT, Claude, and external review via Gemini) aligned on the long-term vision: "Build the most trusted AI-assisted personal financial platform for everyday people." Establishes the permanent philosophy guiding all future implementation decisions. See `PROJECT_VISION.md`. |
| Google Analytics | ⏸ PAUSED | Previous GA implementation attempt was rolled back; no active GA implementation is currently present; work remains paused pending a safe implementation plan. |
| Platform Documentation | ✅ COMPLETE — DOCUMENTATION FOUNDATION | `PROJECT_VISION.md` created; `PROJECT_STATUS.md` is the durable completion-history document. Master Roadmap V2 remains external, maintained by Andrew, and is not stored in this repository. |

Common PDF Download V1 remains recorded in its original entry above (`Common PDF Download V1 — COMPLETE (2026-06-19)`) — status unchanged and consistent with this Platform Foundation record; not duplicated here.

---

## Key Constraints (always apply)

- No new npm dependencies without user approval.
- lucide-react is the only icon library.
- No charting libraries — inline SVG only.
- Math files are sacred — never refactor without formula confirmation.
- Canadian and US calculators stay separate — no shared calculator component.
- **Navigation shows tool type, not country variant.** Mega-menu, footer, and search show one generic entry per calculator type. Country routing is resolved via `regionRoutes` using the active region. See `AGENT_MANUAL.md §8`.
- **Homepage chips route to `/calculators?category=X`, not to individual calculator pages.** They are category shortcuts, not direct links.
- **`CALC_INDEX` is the single source of truth** for all navigation, search, and directory surfaces. Do not hardcode calculator links in nav/footer/search outside of what `CALC_INDEX` drives.
