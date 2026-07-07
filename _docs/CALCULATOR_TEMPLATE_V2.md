# Master Calculator Template V2 Rules

> The locked Canadian Mortgage Calculator V2 is the master template.
> All new calculators are **built fresh from this template** — not migrated or adapted from old pages.
> Reference file: `app/canadian-mortgage-calculator/CanadaMortgageCalculator.tsx`
>
> V2 card style (copy from `cardStyle` const in the CA calculator):
> `border: '1px solid rgba(15,41,66,0.09)'`, `borderRadius: '20px'`, `background: '#ffffff'`

---

## 0. New Calculator Build Process

Follow these steps in order. **Step 0 is a hard gate — do not skip it.**

---

### Step 0 — Intelligence Gate (required before anything else)

> **AI Analysis is the product differentiator. Calculators are the engine.**
> No new calculator build starts from the UI template or file scaffolding. Strategy, math, and insight plan come first.

Complete every item in `_docs/FINANCIAL_INTELLIGENCE_FRAMEWORK.md §7` before Step 1. Document the answers — do not hold them in your head.

| # | Requirement | Reference |
|---|-------------|-----------|
| 1 | User intent | FIF §2 |
| 2 | Key inputs / key outputs | FIF §2 |
| 3 | Primary decision metric | FIF §2 |
| 4 | Risk signals + opportunity signals | FIF §2, §6 |
| 5 | AI Analysis insight plan (five questions + status labels) | FIF §3 |
| 6 | Default state plan (no `Caution` on first load) | FIF §7.4 |
| 7 | Edge-case plan | FIF §7.5 |
| 8 | SEO / FAQ topics (min 5 questions, primary keyword) | FIF §7.6 |

Do not proceed to Step 1 until all eight items are defined.

---

### Step 1 — Strategy

Clarify with the user before building:

- **Intent** — what decision does this calculator help the user make?
- **Region** — CA only, US only, or dual-region? What differs between regions (rates, rules, labels, currency)?
- **Inputs** — list every required input and every optional input with its default value
- **Outputs** — list the primary result (the number the user came for) and all secondary outputs
- **AI Analysis purpose** — what specific insight does the AI section provide? What is the main product message?

Do not start §2 until these are written down and agreed.

---

### Step 2 — Math / Logic Spec

Write the formulas and assumptions before coding:

- **Formulas** — write out every formula with variable names; cite a source for non-obvious math
- **CA vs US differences** — list any formula differences between regions explicitly; never mix them
- **Default values** — what does the calculator show on first load? Defaults must produce a positive, meaningful result — not blank or zero
- **Edge cases** — what happens at zero income, zero down payment, maximum inputs, or extreme rate values? Define the expected output for each
- **Result states** — list every possible result state (e.g., Approved / Declined / Zero-capacity) and what the UI shows for each

---

### Step 3 — V2 Page Structure

Build in this block order, matching the locked CA Mortgage Calculator V2 exactly:

| Block | Content | Notes |
|-------|---------|-------|
| Banner | H1 + lede (from `page.tsx`) | Gradient shell, `marginTop: '-80px'` |
| Input card | Form fields using `NumericInput` | Light card style; `CA$`/`$` prefix on currency inputs |
| Results card | Dark navy card; primary result in teal; secondary stats | Helper line above CTA explains what AI Analysis reveals; CTA label is calculator-specific |
| Visual support | Two visual cards: left = breakdown (donut/composition), right = comparison/scenario/timeline/trend | Required by default; omit only for qualifier-type tools with no result to visualise |
| **AI Analysis** | Dark header + 3-card row: Health Score, Smart Opt, insight | **Primary product section** — always visible on Qualifier-type; unlocked by CTA on mortgage-type |
| How It Works | Formula + subsections; teal border-left H3s | Static; from `page.tsx` prop |
| FAQ | Min 4 items; from `page.tsx` prop | Generates FAQPage JSON-LD |
| Disclaimer | `<Disclaimer />` — unconditional, always last | Never conditional on results |

---

### Step 4 — QA Before Done

Every item must pass. Do not declare done until all are checked.

- [ ] **Default state** — page loads with a positive, meaningful result; no blank, NaN, Infinity, or negative values
- [ ] **Edge cases** — zero inputs, max inputs, declined/zero-capacity states all render a valid UI without JS errors
- [ ] **Country prefixes** — `CA$` in CA mode, `$` in US mode on every currency input; labels swap correctly
- [ ] **Mobile (375px)** — no overflow, no blank states, all text readable; CSS injection used for show/hide (not Tailwind `md:hidden`)
- [ ] **Tablet (768px)** — grid wraps correctly; AI Analysis 3-card row layout correct
- [ ] **Desktop (1280px)** — full multi-column layout; AI Analysis gap ~32px above section
- [ ] **Visual self-check** — open completed page alongside the locked CA Mortgage Calculator V2; card style (20px radius, `rgba(15,41,66,0.09)` border), spacing, and typography must match
- [ ] **Build** — `tsc --noEmit` passes with zero errors

---

## 1. File Structure

```
app/[slug]/
  page.tsx              ← Server component: metadata, JSON-LD, page shell, formulaSection, faqItems
  [Name]Calculator.tsx  ← 'use client': all state, math, and rendering
```

`page.tsx` renders the gradient shell, banner (H1 + lede), and mounts the calculator.  
The calculator component receives `formulaContent` and `faqItems` as props.

---

## 2. Block Structure (in render order)

| Block | Contents | Notes |
|-------|----------|-------|
| **A — Input panel** | Form fields, loan details, extra payment | Left column on desktop, full-width on mobile |
| **B — Results panel** | Dark navy card: total payment, breakdown stats, CTA unlock button | Right column on desktop |
| **C — Visuals Row** | Payment Breakdown (donut) + Compare Scenarios (term cards) | Side by side on desktop, stacked on mobile |
| **D — AI Analysis** | Dark header + 3-card row: Health Score, Smart Optimization, Rate Shock / Insurance Threshold | Unlocked by CTA in Block B |
| **E — Amortization** | Collapsible accordion: yearly schedule table | Collapsed by default |
| **F — How It Works** | Formula + educational subsections (teal border-left H3s) | Static content from `page.tsx` prop |
| **G — FAQ** | `CalculatorFaqAccordion` with teal chevrons | Items from `page.tsx` prop |
| **Footer** | `Disclaimer` component | Always last |

---

## 3. Block A — Input Panel

- Use `NumericInput` from `app/_mortgage-shared/ui.tsx` for all currency/percent inputs.
- Labels: 12px, semibold, `#6B7A8D`, with `Tooltip` for complex fields.
- Form labels use `<label>` with explicit `htmlFor`.
- Extra payment field is always optional (defaults to 0).
- Loan term selector: pill buttons, not a `<select>`.

---

## 4. Block B — Results Panel

- Dark navy gradient card.
- Primary result: large teal number, "total/mo" sublabel.
- Breakdown rows: P&I, Tax, Insurance, (PMI if applicable) — each with label + value.
- Summary stats below: Loan Amount, Total Interest, Total Cost.
- Unlock CTA button: pulsing teal glow animation.
- Short helper line directly above the CTA explaining what AI Analysis reveals for this specific calculator (e.g., "See how your rate and term affect your total interest cost").
- CTA label must be calculator-specific — not generic. (e.g., "See Your Debt Payoff Plan", "Analyse My Mortgage", "Check My Savings Rate"). Never "View AI Analysis".
- The CTA unlocks Block D (AI Analysis) and scrolls to it.

---

## 5. Block C — Visuals Row

**Default: two visual cards, side by side on desktop, stacked on mobile. Both are required.**  
Left card = breakdown visual (donut chart or composition chart).  
Right card = comparison, scenario, timeline, or trend — whichever best explains the result.  
Visuals must explain the result, not decorate the page. Every visual card should answer a question the user has after reading the result number. Omit only for qualifier-type tools that produce no amortisable or time-based result.

### Payment Breakdown (left)
- `DonutChart` from `app/_mortgage-shared/ui.tsx` — inline SVG, no libraries.
- Monthly / Yearly toggle pill.
- Legend rows below chart.

### Compare Scenarios (right)
- Three term cards: 15-yr, 20-yr, 30-yr.
- Current term highlighted with teal accent.
- Shows payment/mo + total interest.
- Savings summary line at bottom.

---

## 6. Block D — AI Analysis Panel

Header: dark navy gradient, `FinCalc Smart AI` branding, Download PDF + Email Results buttons (non-functional placeholders).

**General pattern — apply to all new calculators:**

Top row — two main cards (desktop: side by side; tablet: left card full-width top, right card below):

- **Card 1 (left) — white card:** Large visual score, circle, percentage, or key number. This is the primary status indicator. Use an SVG arc gauge, ring, or large typographic number depending on what is most legible for the calculator's primary metric.
- **Card 2 (right) — dark navy card:** Two to four KPI numbers with short plain-language labels and a one- or two-sentence explanation below them.

Below the top row — three insight cards:  
Each card: colored left border (red / blue / green / amber) + icon + title + body. Content is calculator-specific. Choose signals from the intelligence model (FIF §6): risk scenario, optimization lever, threshold warning.

---

**Mortgage reference implementation (locked CA template):**

Three-card row (desktop: side by side; tablet: Health Score full-width top, other two below):

### Card 1 — Mortgage Health Score
- SVG arc gauge: 160px mobile, 220px desktop (via CSS media query).
- Score 0–100, label: Poor / Fair / Good / Excellent.
- Teal-to-amber-to-red gradient arc.
- Sub-message consistent with label (no score/label mismatch).
- Market context paragraph below gauge.

### Card 2 — Affordability Ratios
- Front-End DTI vs 28% guideline.
- Back-End DTI vs 36% guideline (if income provided).
- Color-coded: green ≤ guideline, amber slightly over, red significantly over.

### Card 3 — Smart Optimization
- Fixed $100/month extra payment (not a round-up calculation).
- Shows: interest saved, months of earlier payoff.
- Amortization compression copy: "by adding $100.00/month to your payment".

### Insight Cards (below the row)
- Rate Shock: +2% rate scenario.
- Insurance Threshold: shown when down payment is 18–19.9% (PMI-avoidance tip).
- Each card: colored left border (red, blue, green, amber) + icon + title + body.

---

## 7. Block E — Amortization

- Collapsed by default (`aria-expanded="false"`).
- Title uses `clamp(1.05rem, 4.5vw, 1.5rem)` to prevent line break on mobile.
- Yearly summary table: Year, Payment, Principal, Interest, Balance.
- Row count = loan term in years.

---

## 8. Block F — How It Works

- H2 with `BookOpen` icon, color `#1DB584`.
- Each subsection: `<h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3" style={{ borderColor: '#1DB584' }}>`.
- All body text: `text-sm text-slate-600 leading-relaxed`.
- Formula display block: `background: #0A1628`, `color: #1DB584`, monospace, `border-radius: 8px`.
- Tables: teal header `rgba(29,181,132,0.10)`, `#E4E9EF` borders.
- Lists: `text-sm text-slate-600`.

---

## 9. Block G — FAQ

- H2 with `HelpCircle` icon.
- Uses `CalculatorFaqAccordion` from `components/layout/CalculatorFaqAccordion.tsx`.
- Pass `faqs: Faq[]` where `Faq = { question: string; answer: string }`.
- Minimum 4 FAQ items. FAQ items defined in `page.tsx`, passed as prop.
- Also used for `FAQPage` JSON-LD in `page.tsx`.

---

## 10. Country-Specific Logic Rules

- **Never mix Canadian and US math in the same function.**
- Canadian monthly rate: `Math.pow(1 + annualRate / 200, 1/6) - 1` (semi-annual compounding, Interest Act).
- US monthly rate: `annualRate / 12 / 100` (simple monthly).
- Each calculator has its own dedicated file — no shared calculator component between countries.
- The `_mortgage-shared/math.ts` functions are shared utilities (e.g., `buildSchedule`, `calcPayment`) — never modify these without explicit user confirmation.
- PMI is US-only. CMHC/MIP insurance is Canada-only. Keep these completely separate.

---

## 11. Protected Files (never edit without explicit instruction)

- `app/_mortgage-shared/math.ts` — all mortgage math formulas
- `app/_mortgage-shared/ui.tsx` — shared UI primitives
- `app/canadian-mortgage-calculator/CanadaMortgageCalculator.tsx` — locked master template
- `app/us-mortgage-calculator/USAMortgageCalculator.tsx` — locked
- `app/mortgage-qualifier-calculator/MortgageQualifierCalculator.tsx` — locked
- `components/layout/CalculatorLayout.tsx` — page wrapper
- `components/layout/SiteHeader.tsx`
- `components/layout/SiteFooter.tsx`
- `lib/region/context.tsx`
- `tailwind.config.ts`
- `app/layout.tsx`

---

## 12. Qualifier Variant — Dual-Region Calculator

The Mortgage Qualifier (`app/mortgage-qualifier-calculator/`) is a V2 calculator with a different block structure from the mortgage calculator. Use it as the reference for any future dual-region qualifier-type tool.

**Key differences from the mortgage template:**

| Item | Mortgage Calculator | Mortgage Qualifier |
|---|---|---|
| Region handling | Separate CA / US files | Single file, `useRegion()` toggle |
| Primary output | Monthly payment | Max home price / max mortgage |
| AI Analysis role | Supplemental unlock | **Primary product insight — always visible** |
| Amortization block | ✅ Block E | ❌ Not present |
| Compare Scenarios | ✅ Block C | ❌ Not present |

**Canada qualification logic (B-20):**
```ts
// maxMortgage MUST be sized at the stress rate — not the contract rate
const stressRate  = Math.max(annualRate + 2, 5.25);
const rStress     = monthlyRateCA(stressRate);
const maxMortgage = maxPI * (1 - Math.pow(1 + rStress, -n)) / rStress;
// Display P&I uses the actual contract rate
const monthlyPI   = calcPayment(maxMortgage, monthlyRateCA(annualRate), n);
```
Sizing at the contract rate (lower → larger PV) then re-verifying at the stress rate always produces ratios > limit — approved verdict becomes mathematically impossible. See `AGENT_MANUAL.md §3.7`.

**US qualification logic (28/36 rule):**  
Contract rate only, no stress test. Front-end ≤ 28%, back-end ≤ 36%.

**Verdict landscape (CA):**  
Approved when positive capacity. Declined when zero capacity. Borderline is not reachable in normal qualifying path — by construction. Do not attempt to "fix" this.

---

## 13. Edge Case Rules

These apply to every calculator, not just the qualifier.

1. **Never go blank.** A calculator must always render a usable state — empty inputs, zero values, and extreme edge cases must produce a graceful output (zero-state UI, helpful message) rather than a blank card or JS error.
2. **Null-guard before every math block.** Return early or show a zero-state if inputs are missing or invalid.
3. **Zero-capacity state must be explicit.** When max mortgage = $0 (debts exceed qualifying budget), show a distinct UI: label changes to "Down Payment Only", CTA message changes to "See How to Improve", chart shows only down payment slice.
4. **Never display NaN, Infinity, or misleading negative values.** Guard every computed output: if a result is not a finite positive number, show `$0`, `—`, or a contextual zero-state instead. Use `Number.isFinite(n) && n >= 0` before rendering any monetary result.

---

## 14. Claude Completion Checklist

Every calculator build must pass all of these before declaring done. "Done" means every item is checked — not just build passing.

- [ ] **Default state** — load page with no changes; confirm the default verdict/result is positive (Qualifies / a real number), not blank, error, or declined
- [ ] **Edge cases** — zero inputs, maximum inputs, zero-capacity/declined state all render correctly without JS errors; no NaN, Infinity, or negative values displayed
- [ ] **Visual self-check** — open the completed page and the locked CA Mortgage Calculator V2 side by side; confirm card style (20px radius, `rgba(15,41,66,0.09)` border), spacing, typography, and AI Analysis gap all match exactly
- [ ] **Disclaimer** — `<Disclaimer />` is rendered unconditionally at the bottom of every calculator page; AI Analysis panel has the inner disclaimer strip
- [ ] **Country prefixes** — all currency inputs show correct prefix for active region (`CA$` / `$`); labels swap correctly on region toggle
- [ ] **Mobile (375px)** — no layout breaks, no horizontal overflow, prefixes visible, text wraps correctly; CSS injection used for show/hide (not Tailwind `md:hidden`)
- [ ] **Tablet (768px)** — grid transitions correct, no overflow, AI Analysis 3-card row wraps correctly
- [ ] **Desktop (1280px)** — full multi-column layout correct, AI Analysis gap is ~32px
- [ ] **Build** — `tsc --noEmit` passes with zero errors before declaring complete

---

## 15. Product Principle

Build every calculator in this sequence. Do not reorder.

1. **Clear result first** — primary output is immediate, above the fold, unambiguous.
2. **Visual explanation second** — Block C shows why that number is what it is.
3. **AI-assisted insight third** — Block D explains what the result means and what to do next.
4. **Scenario testing only when it naturally helps** — include comparison or scenario tools only when they help users understand the impact of changing an input. Do not add them to drive repeated use or increase complexity.
