# New Calculator Planning Template

> **Complete every section before writing any code.** This document is the pre-build gate required by `_docs/AGENT_MANUAL.md §0` and `_docs/CALCULATOR_TEMPLATE_V2.md §0 Step 0`. Incomplete sections block implementation.
>
> Copy this file to `_docs/planning/[slug].md` and fill it in.

---

## 1. Calculator Overview

**Calculator name:**
_e.g. HELOC Payment Calculator_

**URL slug:**
_e.g. `/heloc-calculator`_

**Category:**
_Mortgage / Loans / Investing / Financial Planning / Tax & Salary / Retirement_

**Target users:**
_Who is the primary user? What stage of a financial decision are they in?_

**Country structure:**
- [ ] Canada only
- [ ] USA only
- [ ] Dual-region — single file with `useRegion()` toggle
- [ ] Dual-region — separate CA and US pages (justify below)

**Separate pages justification** _(if applicable)_:
_Why do these regions need separate pages rather than a toggle?_

**Business value:**
_One paragraph: what decision does this calculator serve, why does it belong on this platform, and how does it relate to existing calculators?_

**Related calculators:**
_List any calculators this one should link to or that should link here._

---

## 2. User Intent

**What question is the user trying to answer?**
_The single most important question — the one that brought them here._

**What decision are they trying to make?**
_What action will they take (or not take) based on the result?_

**What emotion or concern do they have?**
_What are they worried about while filling in this form? (e.g. "Am I overextending?", "Can I afford this?")_

**Primary decision metric:**
_The single output that tells the user "yes / no / how much." Everything else is supporting context._

---

## 3. Inputs

### Required inputs

| Field label | Input type | Default value | Valid range | Notes |
|-------------|-----------|---------------|-------------|-------|
| | | | | |
| | | | | |
| | | | | |

### Optional inputs

| Field label | Input type | Default value | Valid range | Notes |
|-------------|-----------|---------------|-------------|-------|
| | | | | |
| | | | | |

### Country-specific fields

| Field | Canada | USA |
|-------|--------|-----|
| Currency label | CAD / CA$ | USD / $ |
| | | |
| | | |

_List any inputs that exist in one region only, or that have different labels, ranges, or defaults by region._

---

## 4. Outputs

**Primary result:**
_The main number — what the user came for. Label, unit, and format (e.g. "$2,340 / month")._

**Secondary results:**

| Output label | Description | Format |
|-------------|-------------|--------|
| | | |
| | | |
| | | |

**Comparison / scenario outputs** _(if applicable)_:
_e.g. 3 term-length scenarios, rate sensitivity table — only include if they directly serve the primary decision._

**Visual chart outputs** _(if applicable)_:
_Describe any DonutChart or inline SVG chart. Omit if no chart adds clarity beyond the numbers._

---

## 5. Financial Logic

**Primary formula(s):**
_Write every formula with variable names. Cite a standard or regulatory reference for non-obvious math._

```
e.g. monthlyPayment = P * r / (1 - (1 + r)^-n)
     where r = monthly rate, n = amortization months
```

**Canada-specific rules:**
_Semi-annual compounding, CMHC insurance triggers, B-20 stress test, RRSP/TFSA limits, etc._

**USA-specific rules:**
_PMI threshold (< 20% down), conforming loan limits, 28/36 rule, etc._

**Assumptions:**
_List any assumption baked into the formula that the user does not control._

**Limits and thresholds:**

| Variable | Minimum | Maximum | Notes |
|----------|---------|---------|-------|
| | | | |
| | | | |

**Edge cases:**

| Condition | Expected behavior |
|-----------|------------------|
| All inputs zero / blank | |
| Maximum plausible inputs | |
| Zero down payment | |
| Rate = 0% | |
| Division-by-zero scenario | |
| Region switch mid-calculation | |
| _Add others specific to this calculator_ | |

**Invalid input behavior:**
_What does the UI show when inputs are missing or out of range? No blank cards, no NaN, no Infinity._

---

## 6. AI Analysis Plan

> Reference: `_docs/FINANCIAL_INTELLIGENCE_FRAMEWORK.md §3–§4`

### Five-question answers (complete for low / mid / high result ranges)

**1. What does this result mean?**
_Plain-language translation of the primary output._

**2. Is the user in a good, borderline, or risky position?**
_Define the status label boundaries:_

| Status | Condition |
|--------|-----------|
| Healthy | _e.g. DTI < 36%_ |
| Watch | _e.g. DTI 36–43%_ |
| Caution | _e.g. DTI > 43%_ |

**3. What is the main driver?**
_Which single input most influences the result?_

**4. What can the user improve?**
_Name one concrete lever the user controls._

**5. What should they watch out for?**
_The most likely negative outcome and its trigger condition._

---

### Insight card plan

| Card | Title | Trigger condition | Body copy direction |
|------|-------|------------------|---------------------|
| Health / Score | | Always visible | |
| Key metric card | | Always visible | |
| Risk card | | Only when risk signal present | |
| Opportunity card | | Only when opportunity signal present | |
| Next step | | Always visible | |

**Risk signals:**

| Signal | Threshold | Status escalation |
|--------|-----------|------------------|
| | | |
| | | |

**Opportunity signals:**

| Signal | Trigger | Suggested action |
|--------|---------|-----------------|
| | | |
| | | |

**Next-step guidance:**
_One actionable sentence shown at the bottom of AI Analysis. Link to a related calculator if applicable._

**Tone / copy direction:**
_Any tone notes specific to this calculator's emotional context. Confirm no insight overclaims or constitutes financial advice._

---

## 7. Page Structure

Map every block to the V2 template. Note any deviations and justify them.

| Block | Include? | Notes / deviations |
|-------|----------|--------------------|
| Banner (H1 + lede) | Yes | |
| Input card | Yes | |
| Results card (dark navy) | Yes | |
| Visual support (DonutChart / scenarios) | Yes / No | _Justify if omitted_ |
| AI Analysis | Yes | Unlocked by CTA / always visible |
| Amortization schedule | Yes / No | _Mortgage-type only_ |
| How It Works | Yes | |
| FAQ | Yes | Min 5 items |
| Disclaimer | Yes | Unconditional — always last |

**AI Analysis display mode:**
- [ ] Always visible (Qualifier-type)
- [ ] Unlocked by CTA button (mortgage-type)

**Responsive notes:**
_Any block-level responsive behavior that differs from the standard template._

---

## 8. SEO / Content

**Primary keyword:**
_The exact phrase this page targets._

**Supporting keywords (2–4):**

**Page title (≤ 60 chars):**
`[Calculator Name] — [Region] [Category] Calculator | FinCalcSmart Pro`

**Meta description (≤ 150 chars):**

**FAQ topics (min 5):**

1.
2.
3.
4.
5.

**YMYL / trust notes:**
_Any sensitivity around the financial topic that affects how claims are worded. Note any regulatory references used in How It Works._

**Cross-links to add:**
_Other calculators that should link here, and which pages this calculator should link to._

---

## 9. QA Checklist

Complete after implementation. Do not declare done until every item is checked.

### Default state
- [ ] Page loads with a positive, meaningful result — no blank, NaN, Infinity, or negative values
- [ ] AI Analysis shows a `Healthy` or `Watch` status on first load — never `Caution`
- [ ] Default values produce a representative, non-alarming result

### Edge cases
- [ ] Zero / blank inputs render a graceful zero-state UI (no JS errors)
- [ ] Maximum plausible inputs render correctly
- [ ] All result states (Healthy / Watch / Caution / zero-capacity / declined) render a valid UI
- [ ] Division-by-zero and other formula edge cases are guarded
- [ ] Region switch mid-session produces correct results and labels

### Output correctness
- [ ] No NaN, Infinity, or negative monetary values displayed anywhere
- [ ] All monetary outputs use `fmtCAD` / `fmtCADx` or the equivalent US formatter — never raw `.toFixed(2)`
- [ ] `Number.isFinite(n) && n >= 0` guard applied before every monetary render

### Country and region
- [ ] CA mode: `CA$` prefix on all currency inputs, CAD labels, CA-specific rules active
- [ ] US mode: `$` prefix on all currency inputs, USD labels, US-specific rules active
- [ ] Region toggle swaps all labels, prefixes, and formula branches correctly

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
- [ ] Country-aware routing configured if dual-region (`regionRoutes`, `searchLabel`, `navHidden`)
- [ ] `tsc --noEmit` passes with zero errors

---

*Template version: 2026-05-24 — defined in `_docs/AGENT_MANUAL.md §0`*
