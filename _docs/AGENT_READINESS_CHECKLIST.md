# Task 4 — Agent Readiness Checklist

> Complete every item below before initializing agents. Items marked 🔴 are blockers — agents cannot work correctly without them.

---

## A. Repository Health

- [ ] 🔴 Run `npm run build` — confirm zero TypeScript errors and zero build failures
- [ ] 🔴 Run `npm run lint` — confirm zero ESLint errors
- [ ] 🔴 `CLAUDE.md` exists at project root (auto-loaded by Claude Code on every agent session)
- [ ] 🔴 `_docs/` folder contains all four documentation files (AGENT_MANUAL, BRAND_GUIDELINES, FOLDER_STRUCTURE, this file)
- [ ] Archive cleanup complete — legacy `.docx`, `.pdf`, `.backup.tsx`, `files/`, `files.zip`, `brand-guidelines.html` moved to `/archive/`
- [ ] `tsconfig.tsbuildinfo` deleted from repo (build artifact — should be in `.gitignore`)

---

## B. Git Hygiene

- [ ] 🔴 `.gitignore` includes: `node_modules/`, `.next/`, `tsconfig.tsbuildinfo`, `*.tsbuildinfo`, `.env*`
- [ ] All current work committed to a stable branch (e.g., `main` or `v2-master`)
- [ ] Create a clean branch for each agent's work stream before initializing (e.g., `feat/fire-calculator`, `feat/tfsa-calculator`)
- [ ] Confirm no uncommitted changes on the master branch before agents begin

---

## C. Master Template Verification

- [ ] 🔴 The Canadian Mortgage Calculator (`/canadian-mortgage-calculator`) loads and calculates correctly
- [ ] 🔴 The US Mortgage Calculator (`/us-mortgage-calculator`) loads and calculates correctly
- [ ] 🔴 The Mortgage Qualifier Calculator (`/mortgage-qualifier-calculator`) loads and qualifies correctly in both CA and US modes
- [ ] 🔴 Region toggle (USA/Canada flags) switches correctly and persists on refresh
- [ ] Header dropdowns open on hover and all 12 links are present
- [ ] Footer social icons (X, LinkedIn, Email) link correctly
- [ ] Footer calculator links use correct slug format (`/fire-calculator`, `/mortgage-calculator`, etc.)
- [ ] Mobile hamburger menu opens and closes correctly
- [ ] Search input is visible in header (desktop) and mobile menu

---

## D. Component Inventory Check

Confirm these files exist and are unmodified:

- [ ] 🔴 `components/layout/SiteHeader.tsx`
- [ ] 🔴 `components/layout/SiteFooter.tsx`
- [ ] 🔴 `components/layout/CalculatorLayout.tsx`
- [ ] 🔴 `components/layout/CalculatorFaqAccordion.tsx`
- [ ] 🔴 `components/ui/RegionToggle.tsx`
- [ ] 🔴 `components/ui/AdSlot.tsx`
- [ ] 🔴 `lib/region/context.tsx`
- [ ] 🔴 `app/_mortgage-shared/math.ts`
- [ ] 🔴 `app/_mortgage-shared/ui.tsx`
- [ ] 🔴 `tailwind.config.ts` (brand color tokens intact)

---

## E. Agent Initialization Configuration

Before passing a task to each agent, verify the prompt includes:

- [ ] 🔴 The specific calculator slug and full name (e.g., "FIRE Calculator" → `/fire-calculator`)
- [ ] 🔴 Whether it is Canada-only, USA-only, or dual-region
- [ ] 🔴 The primary formula/math the calculator must implement (with source cited)
- [ ] 🔴 Reference to `_docs/AGENT_MANUAL.md §6` (scaffolding checklist) and `_docs/BRAND_GUIDELINES.md`
- [ ] The entry in `lib/calculators.ts → CALC_INDEX` that needs `available: true` when the calculator goes live
- [ ] The nav category it belongs to (Mortgage / Financial Planning / Loans / Tax & Salary)
- [ ] Minimum FAQ count (4) and suggested FAQ topics

---

## F. Calculator Roadmap — Agent Assignment

Use this table to track which agent owns which calculator and its status:

| Calculator | Slug | Region | Category | Agent | Status |
|-----------|------|--------|----------|-------|--------|
| Canadian Mortgage Calculator | `/canadian-mortgage-calculator` | CA | Mortgage | — | ✅ Live (LOCKED) |
| US Mortgage Calculator | `/us-mortgage-calculator` | US | Mortgage | — | ✅ Live (LOCKED) |
| Mortgage Qualifier Calculator | `/mortgage-qualifier-calculator` | Both | Mortgage | — | ✅ Live (LOCKED) |
| Debt Repayment Calculator | `/debt-repayment-calculator` | Both | Loans | — | ✅ Live (LOCKED) |
| Personal Loan Calculator | `/personal-loan-calculator` | Both | Loans | — | ✅ Live (LOCKED) |
| Car Loan Calculator | `/car-loan-calculator` | Both | Loans | — | ✅ Live (LOCKED) |
| Investment Fees Calculator | `/investment-fees-calculator` | Both | Investing | — | ✅ Live (LOCKED) |
| ROI Calculator | `/roi-calculator` | Both | Investing | — | ✅ Live (LOCKED) |
| Emergency Fund Calculator | `/emergency-fund-calculator` | Both | Financial Planning | — | ✅ Live (LOCKED) |
| Net Worth Calculator | `/net-worth-calculator` | Both | Financial Planning | — | ✅ Live (LOCKED) |
| Retirement Savings Calculator | `/retirement-planning-calculator` | Both | Retirement | — | ✅ Live (LOCKED) |
| Retirement Withdrawal Calculator | `/retirement-withdrawal-calculator` | Both | Retirement | — | ✅ Live (LOCKED · QA PASSED) |
| CMHC Mortgage Insurance Calc. | `/cmhc-mortgage-insurance-calculator` | CA | Mortgage | — | ✅ Live (LOCKED) |
| Rent vs Buy Calculator | `/rent-vs-buy-calculator` | Both | Mortgage | — | ✅ Live (LOCKED) |
| Mortgage Refinance Calculator | `/mortgage-refinance-calculator` | Both | Mortgage | — | ✅ Live (LOCKED) |
| FIRE Calculator | `/fire-calculator` | Both | Retirement | — | ✅ Live (LOCKED) |
| TFSA Calculator | `/tfsa-calculator` | CA | Financial Planning | — | ✅ Live (LOCKED) |
| RRSP Savings Calculator | `/rrsp-savings-calculator` | CA | Financial Planning | — | ✅ Live (LOCKED) |
| Compound Interest Calculator | `/compound-interest-calculator` | Both | Investing | — | ✅ Live (LOCKED) |
| Lump Sum vs Monthly Investment Calculator | `/lump-sum-vs-dca-calculator` | Both | Investing | — | ✅ Live (LOCKED) |
| Sales Tax Calculator | `/sales-tax-calculator` | Both | Tax & Salary | — | ✅ Live (LOCKED · QA PASSED) |
| Salary Calculator | `/salary-calculator` | Both | Tax & Salary | — | ✅ Live (LOCKED · QA PASSED) |
| Savings Goal Calculator | `/savings-goal-calculator` | Both | Financial Planning | — | ✅ Live (LOCKED · QA PASSED) |
| Income Tax Calculator | `/income-tax-calculator` | Both | Tax & Salary | — | ✅ Live (LOCKED · QA PASSED) |

---

## G. Page-Layout Readiness Check (non-calculator pages only)

Run this check before declaring any non-calculator page (landing, showcase, editorial, guides) complete.

- [ ] All major section inner containers use `mx-auto max-w-6xl px-4` (homepage container — see `AGENT_MANUAL.md §10`)
- [ ] Section boundaries align: hero / feature sections / grids / SEO blocks share the same left/right edge
- [ ] Navigation visibly wider than page content
- [ ] Desktop 1280px: balanced side margins, no content touching viewport edge
- [ ] Tablet 768px: layout wraps correctly, no overflow
- [ ] Mobile 375px: correct gutters, no horizontal overflow
- [ ] `tsc --noEmit` clean

---

## H. Performance Gate (run before each agent's PR is merged)

- [ ] Run Lighthouse on the new calculator page — LCP < 2.5s, CLS = 0
- [ ] Verify `useMemo` wraps all calculation logic (check for raw math in render)
- [ ] Confirm no new packages were added to `package.json` without approval
- [ ] Confirm `metadata` export exists in `page.tsx` with correct title + description
- [ ] Confirm minimum 4 FAQ items are passed to `CalculatorLayout`
- [ ] Confirm new calculator is added to `lib/calculators.ts → CALC_INDEX` with `available: true`
- [ ] Confirm new calculator appears in the correct `SiteHeader.tsx` dropdown (if in nav)
- [ ] **Calculator page input card icon must match the `icon` field in `CALC_INDEX` for the same calculator.** Use the lucide-react icon from `CALC_INDEX` directly — do not use a different icon or an inline SVG. `CALC_INDEX` is the source of truth for calculator icons.
- [ ] Bottom disclaimer renders unconditionally at the bottom of the page (not conditional on results). **Do not use the shared `<Disclaimer />` component for non-mortgage calculators** — it contains mortgage-specific wording. Write an inline `<p>` with calculator-appropriate copy instead.
- [ ] Currency prefix check: CA mode shows `CA$`, US mode shows `$` on all monetary inputs
- [ ] Visual self-check: page open alongside locked CA Mortgage Calculator V2 — card style (20px radius, rgba border), spacing, AI Analysis gap (~32px) all match
- [ ] Mobile (375px): no overflow, no blank states, prefixes readable
- [ ] Tablet (768px): grid wraps correctly, AI Analysis 3-card row layout correct
- [ ] Desktop (1280px): full multi-column layout, AI Analysis gap correct
- [ ] `tsc --noEmit` passes with zero errors

---

## I. Environment Variables (if/when needed)

Currently no `.env` variables are required. When adding:
- Google Analytics → `NEXT_PUBLIC_GA_ID`
- Ad network → `NEXT_PUBLIC_AD_SLOT_ID`
- Email service → `EMAIL_API_KEY` (server-side only — never `NEXT_PUBLIC_`)

Create `.env.local` (never commit) and `.env.example` (commit with placeholders).

---

## J. PDF Download Readiness Check (run before adding PDF to any calculator)

> Based on the locked prototype (`/retirement-planning-calculator`). See `AGENT_MANUAL.md §12` for full rules.

**Architecture gates:**
- [ ] Report family identified (see `PROJECT_STATUS.md` → PDF Rollout Plan)
- [ ] Correct adapter identified or confirmed as needing a new one
- [ ] Adapter uses internal PDF formatters (`makePdfFmt`/`makePdfFmtx` — NOT passed-in `fmt`/`fmtx`)
- [ ] CA region → `en-US` + `CAD` → `CA$` prefix confirmed
- [ ] US region → `en-US` + `USD` → `$` prefix confirmed
- [ ] All monetary values in report use PDF formatter, not `toFixed()` or raw number
- [ ] Adapter exports both `build[Name]ReportData()` (pure mapper) and `build[Name]PDF()` (browser entry)
- [ ] Calculator component lazy-loads adapter: `await import('@/lib/pdf/adapters/[name]Adapter')`
- [ ] Calculator component has `pdfGenerating` state; button shows "Generating…" while in progress
- [ ] Email Results button remains disabled with "· Soon" label

**Report content gates:**
- [ ] All values in PDF match live calculator UI output
- [ ] No hardcoded or estimated values — all from results object
- [ ] No AI-generated text that isn't derived from live calculator data
- [ ] `statusLabel` / readiness score / status-aware text correct for On Track and Behind Target states
- [ ] Key drivers text is status-aware (on-track vs behind-target wording differs)
- [ ] Methodology section lists: what the calculator does + excluded factors
- [ ] Educational disclaimer present on page 2

**Layout gates:**
- [ ] `ensureSpace()` called before every block that may span a page break
- [ ] No content below `P.safeY = 257mm`
- [ ] Footer rendered via `doc.setPage(pg)` loop (never hardcoded total pages)
- [ ] Page count is correct (1-page simple / 2-page standard / 3-page complex)

**Quality gates:**
- [ ] `tsc --noEmit` clean after adapter added
- [ ] `next build` clean — calculator first-load JS unchanged (jsPDF not in initial bundle)
- [ ] Sample PDFs generated for CA and US variants
- [ ] Sample PDFs verified: CA uses `CA$`, US uses `$`, no CA$ in US PDF
- [ ] Grammar correct: `reflects an excellent` not `a excellent`

---

## Summary — Agent Launch Gate

```
✅ npm run build  → 0 errors
✅ npm run lint   → 0 errors  
✅ CLAUDE.md      → exists at root
✅ _docs/         → 4 files present
✅ Master template → Canadian + US calculators load correctly
✅ Region toggle  → works and persists
✅ Agent prompts  → include slug, region, formula, and doc references
```

**Only initialize agents when all 🔴 blockers above are cleared.**

---

## Discovery Page Status

| Page | Status | Notes |
|------|--------|-------|
| `/calculators` — All Calculators V2 | ✅ LOCKED · QA PASSED (2026-06-09) | Full V2 upgrade: `scoreEntry()` search scoring, 8-chip filter row (All / Mortgage / Financial Planning / Investing / Retirement / Loans / Tax & Salary / Canada Only), Featured Popular dark navy panel, URL sync, 23 visible entries, mobile-first. See `AGENT_MANUAL.md §8.9` for full architecture. **When adding a new calculator to `CALC_INDEX`:** update the chip `count` in `CHIPS` inside `CalculatorsClient.tsx` for the matching category chip; if the new calculator should be featured, add its `href` to `FEATURED_HREFS`. |

---

## Financial Guides Status

| Guide | Route | Status | Notes |
|-------|-------|--------|-------|
| Mortgage Affordability Guide V1 | `/guides/mortgage-affordability` | ✅ LOCKED · QA PASSED (2026-06-13) | First Financial Guide Article. RSC only. Establishes the repeatable Financial Guide Article Template — see `AGENT_MANUAL.md §11`. Scenario card uses InsightsShowcase pattern. CTA wired to `/mortgage-qualifier-calculator`. |
| Emergency Fund Guide V1 | `/guides/emergency-fund` | ✅ LOCKED · QA PASSED (2026-06-13) | Second Financial Guide Article. RSC only. Built from Mortgage Affordability Guide V1 (STRICT CLONE MODE). Template: Financial Guide Article Template (`AGENT_MANUAL.md §11`). Sections 02 and 04 use approved 2×2 open editorial grid (`§11.9`). Primary CTA → `/emergency-fund-calculator`. Secondary CTA → `/savings-goal-calculator`. Responsive PASS · tsc clean · next build clean. |
| How Much Do You Need to Retire? | `/guides/how-much-to-retire` | ✅ LOCKED · QA PASSED (2026-06-16) | Fourth and final pre-launch Financial Guide Article. RSC only. Built from locked guides (STRICT CLONE MODE). Template: Financial Guide Article Template (`AGENT_MANUAL.md §11`). Section 02 uses approved 2×2 open editorial grid (4 calculator inputs). InsightsShowcase amber border (Behind Target shortfall). Nominal-balance limitation disclosed in Section 01 prose. All out-of-scope factors (inflation, CPP/OAS, Social Security, taxes, fees, volatility, withdrawals) named explicitly. Primary CTA → `/retirement-planning-calculator`. Secondary CTA → `/retirement-withdrawal-calculator`. QA record: `AGENT_MANUAL.md §11.12`. Responsive PASS · tsc clean · next build clean. **Completes four planned pre-launch Financial Guides.** |
| Compound Interest Guide V1 | `/guides/compound-interest` | ✅ LOCKED · QA PASSED (2026-06-16) | Third Financial Guide Article. RSC only. Built from locked guides (STRICT CLONE MODE). Template: Financial Guide Article Template (`AGENT_MANUAL.md §11`). Sections 02 and 04A use approved 2×2 open editorial grid (`§11.9`). Section 04B uses 3-col mistakes grid. InsightsShowcase teal border (positive growth outcome). Verified scenario: CA$264,122 / CA$130,000 / CA$134,122 / 50.8%. Primary CTA → `/compound-interest-calculator`. Secondary CTA → `/investment-fees-calculator`. QA record: `AGENT_MANUAL.md §11.11`. Responsive PASS · tsc clean · next build clean. |

**When building a new guide:**
- Follow the section structure from the nearest locked guide (use Mortgage Affordability Guide V1 as default)
- Use `app/guides/_shared/` infrastructure (ArticleLayout, GuideCTA, RatioBar, ArticleDisclaimer)
- Scenario cards must use the InsightsShowcase layered structure exactly (§11.4)
- Select inner editorial layout based on content — approved patterns in `§11.9` (1-col list, 2×2 grid, 3-col grid)
- Include Article + BreadcrumbList JSON-LD schemas in `page.tsx`
- Apply `mx-auto max-w-6xl px-4` to all inner containers (§10 rule)
- QA: run checklist (runtime, tsc, build, routes, metadata/JSON-LD, content, math, a11y, responsive)
