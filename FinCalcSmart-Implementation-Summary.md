# FinCalcSmart V2 — Engineering & Architecture Implementation Summary

---

## 1. Current Tech Stack

### Frameworks
- **Next.js 15.2.4** (App Router, SSG/ISR-ready)
- **React 18.3.1**
- **TypeScript 5.6.2** (strict mode, no `any`)

### Libraries
- **lucide-react 1.14.0** — sole approved icon library (23 icons actively used in `SiteHeader`)
- **Font Awesome 5 (CDN)** — loaded via `<link>` in `app/layout.tsx` as a secondary icon fallback; not tree-shaken, adds render-blocking weight
- **next/font/google** — Plus Jakarta Sans loaded with `font-display: swap`
- No charting libraries, no date libraries, no form libraries, no animation libraries

### Styling System
- **Tailwind CSS 3.4.5** utility-first — no CSS modules, no Emotion, no styled-components
- Custom brand token layer extends the default theme in `tailwind.config.ts`:
  - **Colors**: `brand-navy` (4 shades), `brand-teal`, `brand-amber`, `brand-gray` (6-stop scale)
  - **Border-radius**: `brand-xs` through `brand-xl` (4px → 16px grid)
  - **Shadows**: `brand-card` (light), `brand-dropdown` (heavy)
- Inline `style={}` used for dynamic colors (e.g., teal result text) that Tailwind cannot generate at runtime

### Animation System
- **None implemented.** No Framer Motion, CSS `@keyframes`, or Tailwind `animate-` utilities are in use. UI transitions are limited to Tailwind `transition-colors` on hover states.

### Chart Libraries
- **Zero external chart libraries.** All visualizations use a handbuilt `DonutChart` SVG component in `app/_mortgage-shared/ui.tsx` (~60 lines). No Chart.js, Recharts, or Visx.

---

## 2. Existing Architecture

### Folder Structure
```
app/
  layout.tsx                      ← Root HTML shell (font, RegionProvider, Header, Footer)
  page.tsx                        ← Homepage placeholder (26 lines — needs redesign)
  globals.css                     ← Tailwind base imports only
  _mortgage-shared/               ← Shared primitives (math, UI atoms, insight cards)
  calculators/page.tsx            ← /calculators directory listing (189 lines)
  canadian-mortgage-calculator/   ← Implemented (page.tsx + 963-line client component)
  us-mortgage-calculator/         ← Implemented (page.tsx + 541-line client component)
  mortgage-qualifier-calculator/  ← Implemented (page.tsx + 922-line client component)

components/
  layout/                         ← SiteHeader, SiteFooter, CalculatorLayout, FaqAccordion
  ui/                             ← AdSlot, RegionToggle

lib/region/context.tsx            ← Global RegionContext (us | ca)
_docs/                            ← Brand guidelines, agent manual, folder structure
```

### Component Structure
- **3-tier hierarchy**: Layout shells (Header/Footer/CalculatorLayout) → Calculator client components → Shared primitives (NumericInput, Tooltip, DonutChart, InsightPanel)
- **Server / Client split**: `page.tsx` = server component (metadata, JSON-LD, layout props); `[Name]Calculator.tsx` = `'use client'` (all interactivity)
- **`CalculatorLayout`** is the master wrapper (459 lines) and also exports reusable primitives: `ResultsPanel`, `InputGrid`, `FormLabel`, `inputCls`

### Reusable Systems

| System | Location | Used By |
|--------|----------|---------|
| Mortgage math | `_mortgage-shared/math.ts` | All 3 calculators |
| NumericInput | `_mortgage-shared/ui.tsx` | All 3 calculators |
| Tooltip | `_mortgage-shared/ui.tsx` | All 3 calculators |
| DonutChart (SVG) | `_mortgage-shared/ui.tsx` | CA mortgage, US mortgage |
| InsightPanel / TriggerCard | `_mortgage-shared/InsightPanel.tsx` | All 3 calculators |
| CalculatorLayout | `components/layout/CalculatorLayout.tsx` | All 3 calculators |
| AdSlot | `components/ui/AdSlot.tsx` | CalculatorLayout |
| RegionToggle | `components/ui/RegionToggle.tsx` | CalculatorLayout hero |
| RegionContext | `lib/region/context.tsx` | All client components |

### Routing Structure

| Route | Status |
|-------|--------|
| `/` | Placeholder |
| `/calculators` | Implemented (listing page) |
| `/canadian-mortgage-calculator` | Implemented |
| `/us-mortgage-calculator` | Implemented |
| `/mortgage-qualifier-calculator` | Implemented |
| `/cmhc-mortgage-insurance-calculator` | Linked in nav — **not implemented** |
| `/fire-calculator`, `/rrsp-calculator`, `/tfsa-calculator`, `/personal-loan-calculator`, etc. | Linked in nav — **not implemented** |
| `/privacy`, `/terms`, `/sitemap.xml` | Linked in footer — **not implemented** |

---

## 3. Current UI/UX Status

### What Is Already Modernized
- **Dark-navy hero strips** on all calculator pages — polished, on-brand
- **Dark gradient result cards** (ResultsPanel) — distinctive and readable
- **Custom SVG donut chart** — no library bloat, matches brand palette
- **InsightPanel / TriggerCard system** — genuinely smart, contextual financial coaching cards
- **Sticky sidebar layout** (lg+) with ad slot reservation — zero CLS
- **RegionToggle** — clean flag-based switcher, localStorage-persisted
- **SiteHeader** — fully responsive with dropdown nav, mobile hamburger, search

### What Still Feels Outdated
- **Homepage** (`app/page.tsx`) — 26-line slate-colored placeholder, completely undesigned
- **Calculators listing page** — functional but sparse, no visual hierarchy or filtering
- **No animation or micro-interaction** anywhere — results appear instantly without any transition, which feels flat
- **Amortization table** — raw `<table>` with minimal styling, no scrollable container on mobile
- **"Coming soon" links in nav** — point to unbuilt routes, will 404

### Strengths of the Current Design
- Consistent dark/light contrast system (navy results vs white form cards)
- Brand token system in `tailwind.config.ts` enforces color discipline across all components
- Typography is clean — Plus Jakarta Sans with a clear weight hierarchy (600 labels, 400 body, 700 headings)
- The InsightPanel triggers genuinely differentiate this product from generic calculator sites
- Ad slots are dimensionally locked — no layout shifts

### Weaknesses of the Current Design
- **No transitions or animations** — UI feels static
- **Input density is inconsistent** — CA mortgage form has 13 fields with inconsistent grouping; some groups have labels, others don't
- **Mobile form UX** — 2-column input grid on mobile works but inputs feel cramped at narrower widths
- **No visual feedback for valid/invalid inputs** — no error states, no inline validation
- **Donut chart responsiveness** — fixed `w-36 h-36` by default; not resized dynamically based on viewport
- **Scenario comparison cards** — functionally present but visually dense; no clear champion/winner callout

---

## 4. Calculator System Status

### Current Calculator Architecture
Every calculator follows this invariant pattern:
1. `DEFAULTS` constant object (top of file) — form defaults
2. `FormState` interface
3. `Results` interface
4. `useState<FormState>` + `set(field, value)` helper
5. `useMemo<Results>` block — all math computed here
6. Render: `InputGrid` left side, `ResultsPanel` right side, then scenario comparison, then amortization schedule

### Reusable Calculator Logic
- **`math.ts`** is fully shared: `monthlyRateCA`, `monthlyRateUS`, `calcPayment`, `buildSchedule`, `fmtCAD`, `fmtUSD`, `freqPayment`, `getCmhcRate`, `parseN`
- **What is NOT shared yet**: Each calculator has its own `useMemo` block with bespoke logic. The CA and US mortgage calculators are ~70% structurally identical and are prime candidates for a shared `useMortgageCalculator()` hook
- **`InsightPanel`** is shared but insights are partially hard-coded inside each calculator

### Mobile Responsiveness
- **Passing**: Single-column layout on mobile, hamburger nav, region toggle stacks properly
- **Acceptable**: 2-column input grid on mobile (compact but functional)
- **Needs work**:
  - Amortization schedule table overflows on small screens (no horizontal scroll wrapper)
  - Donut chart fixed size (`w-36 h-36`) — not responsive
  - Scenario comparison row wraps awkwardly between `sm:` and `lg:` breakpoints
  - Sidebar hidden on < xl — users on md/lg viewports get no sidebar, which is fine, but the main column then has awkward max-width at those sizes

### Compact Input Layout Evaluation
- The CA mortgage calculator has **13 inputs** across 2 columns — this is near the ceiling for usability
- The mortgage qualifier has **10 inputs** — more comfortable
- **Core problem**: No sectioning or visual grouping of fields (e.g., "Loan Details" vs "Monthly Costs" vs "Income & Debts"). Users must scan the entire form to find a specific field
- **Recommendation**: Add `<fieldset>`-style section dividers without changing the grid structure

---

## 5. Design Consistency Audit

### Spacing Consistency
- **Mostly consistent**: `p-6 lg:p-8` on calculator cards, `gap-4 md:gap-x-8 md:gap-y-5` on input grids
- **Inconsistency found**: Some inline sections use `mb-4` while others use `space-y-4` — no single pattern
- **Hero section padding** varies slightly between calculators (should be normalized in `CalculatorLayout`)

### Typography Consistency
- **Labels**: `FormLabel` export from CalculatorLayout standardizes to 12px / 600wt / `brand-gray-500` — consistently applied
- **Result values**: Teal text in `ResultsPanel` (`text-brand-teal`) — consistent across all calculators
- **Headings in results**: Mix of `text-sm`, `text-xs`, `text-base` without a clear hierarchy rule
- **Section headings** (e.g., "Scenario Comparison", "Amortization Schedule") use different weights/sizes across calculators — not normalized

### Button Consistency
- **Primary CTA** (CalculatorLayout header button): Amber — consistent
- **Form toggle buttons** (monthly/bi-weekly, amount/percent): Teal active, neutral inactive — consistent
- **"Show amortization table" toggle**: Varies in styling between CA and US calculators — minor inconsistency
- **No disabled state styling** defined for any button

### Card Consistency
- **Calculator card**: White, `border-[1.5px] border-[#E4E9EF]`, `rounded-brand-xl`, `shadow-brand-card` — consistent
- **Result panel**: Dark gradient, defined in `ResultsPanel` export — consistent
- **Insight/TriggerCards**: Left-color-border cards in InsightPanel — consistent
- **Scenario comparison cards**: Inline-styled differently in CA vs US calculators — **inconsistent**

### Chart Consistency
- **DonutChart** is used in CA and US mortgage calculators but **not** in the mortgage qualifier — inconsistent treatment of the results section
- **Color assignments** for pie slices differ between CA (teal P&I + amber tax + purple insurance + blue condo) and US (same but pink PMI) — intentional but worth documenting
- **Amortization chart**: No chart — raw table only. A balance-over-time line chart would be a high-value addition

---

## 6. Technical Debt

### Duplicated Components
- **CA and US mortgage calculators share ~70% structural logic** — `FormState`, `Results`, `useMemo` calculation pattern, results layout, scenario table. No shared hook yet.
- **Insight logic** (rate shock, round-up, insurance threshold) is copy-pasted with minor variations across CA and US calculators; InsightPanel centralizes the display but not the data-generation logic
- **FaqAccordion** exists twice: one in `_mortgage-shared/ui.tsx` (unused) and one in `components/layout/CalculatorFaqAccordion.tsx` (active)

### Inconsistent Patterns
- **Scenario cards**: CA mortgage uses one styling approach; US mortgage uses a slightly different structure — should be normalized into a `ScenarioCard` component
- **Nav links**: `SiteHeader.tsx` has hardcoded calculator URLs that point to unimplemented routes (e.g., `/mortgage-calculator`, `/cmhc-mortgage-insurance-calculator`, `/fire-calculator`)
- **Imports**: Some files import from `'@/app/_mortgage-shared/ui'`, others from relative paths — not normalized

### Hardcoded Styling
- Dynamic brand colors applied via `style={{ color: '#1DB584' }}` throughout calculator files — these should use Tailwind classes or CSS variables for consistency
- Some padding/gap values appear as inline styles rather than Tailwind classes
- Icon SVGs in `InsightPanel.tsx` (`IconZap`, `IconTrend`, `IconTarget`) are inline — not reusable

### Scalability Concerns
- **No shared types file** — `FormState`, `Results` interfaces re-declared in each calculator; adding a 4th calculator means another full re-implementation
- **No route registry** — nav links in `SiteHeader`, footer links in `SiteFooter`, and the `/calculators` listing page all maintain their own separate lists of calculator URLs and labels
- **Long calculator components** — at 963 lines, `CanadaMortgageCalculator.tsx` is approaching unmaintainable territory; splitting into sub-components (`<ScenarioSection>`, `<AmortizationSection>`, `<AffordabilitySection>`) would improve this

---

## 7. SEO & Routing Status

### Current URL Structure
- Clean, descriptive slugs: `/canadian-mortgage-calculator`, `/us-mortgage-calculator`, `/mortgage-qualifier-calculator`
- No dynamic route segments — all pages are static
- `/calculators` serves as a directory index

### Canada / USA Separation Readiness
- **Regional logic is runtime-driven, not URL-driven** — the mortgage qualifier shows both CA and US results on the same URL based on `useRegion()`
- **No separate `/ca/` or `/us/` URL namespacing** — this is intentional (single URL, region toggled client-side) but means:
  - Google cannot index region-specific content separately
  - `hreflang` annotations are not possible without URL separation
  - This is the primary SEO architectural risk for the dual-region strategy

### Metadata System
- Root `metadata` in `app/layout.tsx`: title template, base description, OpenGraph site name, `metadataBase` set to `https://www.fincalcsmart.com`
- Each `page.tsx` exports a full `metadata` object: custom title, description, keywords, OpenGraph
- `FAQPage` JSON-LD embedded via `dangerouslySetInnerHTML` script tag in each page
- **Missing**: `canonical` link tags, `og:image`, Twitter card tags, `robots.txt`, `sitemap.xml`

### Schema Implementation
- **FAQPage JSON-LD**: Implemented on all 3 calculator pages — well-structured
- **No other schema types**: No `Organization`, `WebSite`, `BreadcrumbList`, `SoftwareApplication`, or `FinancialProduct` schemas — all high-value additions for financial calculator SERPs

---

## 8. Performance Overview

### Current Bottlenecks
- **Font Awesome CDN** (`<link>` in `app/layout.tsx`) — render-blocking, downloads ~70KB of CSS for icons used as fallbacks only. Should be replaced with lucide-react equivalents and removed.
- **963-line client component** (`CanadaMortgageCalculator.tsx`) — entire file is one `'use client'` bundle; no code splitting possible within it. Not critical now, but will grow.

### Large Components

| File | Lines | Client Bundle Impact |
|------|-------|---------------------|
| `CanadaMortgageCalculator.tsx` | 963 | High |
| `MortgageQualifierCalculator.tsx` | 922 | High |
| `CalculatorLayout.tsx` | 459 | Medium (server + exported primitives) |
| `SiteHeader.tsx` | 342 | Medium |
| `InsightPanel.tsx` | 293 | Medium |
| `USAMortgageCalculator.tsx` | 541 | High |

### Rendering Concerns
- **No Suspense boundaries** around calculator components — if a calculator throws during render, entire page fails
- **No `React.memo`** on sub-components — every `useState` update re-renders all child components, including the `DonutChart` SVG; acceptable at current scale but will degrade with more fields
- **Amortization schedule** (`buildSchedule()`) — up to 360 iterations in memory per recalculation; not virtualized; acceptable now but if displayed as a full visual it would need windowing

### Mobile Performance Risks
- **Font Awesome CDN** is the biggest mobile risk — extra DNS lookup + 70KB CSS on every page load
- **`useMemo` recalculation on every input change** — runs synchronously on the main thread; on low-end mobile devices with 13+ form fields this could cause input lag; currently undetected but worth measuring
- **No image optimization** — no `<Image>` usage yet (no images currently); will matter when og:image or calculator illustrations are added

---

## 9. Recommended Priority Order

| Priority | Task | Reason |
|----------|------|--------|
| 1 | **Remove Font Awesome CDN, replace with lucide-react** | Render-blocking CSS, ~70KB on every page, zero benefit |
| 2 | **Fix broken nav links** (point only to implemented routes) | Active 404s damage SEO and user trust |
| 3 | **Add `robots.txt` and `sitemap.xml`** | Blocking Googlebot discovery; footer already links to sitemap |
| 4 | **Add `canonical` meta tags** to all calculator pages | Duplicate content risk; low effort, high SEO value |
| 5 | **Redesign homepage** (`app/page.tsx`) | Current state is a dev placeholder visible to real users |
| 6 | **Add `og:image`** to all pages | Social sharing shows no image; simple static image per page |
| 7 | **Extract `useMortgageCalculator()` shared hook** | Removes ~400 lines of duplication; required before adding more calculators |
| 8 | **Add form section dividers** (loan details / monthly costs / income) | UX improvement, no structural change |
| 9 | **Build `/privacy` and `/terms` pages** | Linked from footer; legal requirement for ad networks |
| 10 | **Add more schemas** (`Organization`, `BreadcrumbList`, `SoftwareApplication`) | Free SERP enhancement |
| 11 | **Implement next 2–3 calculators** following the established template | Breadth of coverage drives organic traffic |
| 12 | **Centralize nav/route registry** (`lib/nav-config.ts`) | Prevents nav vs footer vs listing page drift |

---

## 10. Refactor Risk Assessment — What Should NOT Be Rebuilt from Scratch

| Component | Risk Level | Reason |
|-----------|-----------|--------|
| `math.ts` | **Critical — do not touch without confirmed formula verification** | CA semi-annual compounding formula, CMHC brackets, GDS/TDS limits, and stress test logic are financially precise and tested through the UI. Any refactor must be validated against known outputs. |
| `CanadaMortgageCalculator.tsx` | **High — extract, don't rewrite** | 963 lines of financial logic, form state, and display logic that is working correctly. Extract sub-components instead of rewriting. |
| `CalculatorLayout.tsx` | **High — frozen per CLAUDE.md** | Master layout with embedded primitives exported to every calculator. A rewrite breaks all 3 existing calculators simultaneously. |
| `SiteHeader.tsx` | **High — frozen per CLAUDE.md** | Fully finalized with responsive nav, dropdowns, and search. |
| `lib/region/context.tsx` | **High — frozen per CLAUDE.md** | Global state with localStorage persistence. Changing the API or key breaks all calculators. |
| `InsightPanel.tsx` | **Medium — extend, don't replace** | TriggerCard system is unique IP. The display logic is solid; the risk is in the data-generation functions inside each calculator that feed it. |
| `DonutChart` in `ui.tsx` | **Low-medium** | Small, self-contained. Could be extracted or enhanced without risk, but there's no reason to — it works well. |
| `tailwind.config.ts` | **High — frozen per CLAUDE.md** | Brand token source of truth. Changing a color token breaks every component silently. |
| `MortgageQualifierCalculator.tsx` | **Medium** | Dual-region logic and stress test math are complex and correct. Same guidance as Canadian calculator — extract, don't rewrite. |

---

## 11. Suggested Next Step — Highest ROI

**Remove the Font Awesome CDN and redesign the homepage.**

These are two fast wins that unlock everything else:

1. **Font Awesome removal** takes ~30 minutes: audit which FA icons are actually used (likely very few), swap each for its lucide-react equivalent, delete the `<link>` from `app/layout.tsx`. Result: removes a render-blocking resource from every page load with zero visual regression.

2. **Homepage redesign** is the single biggest trust signal for new users and organic search. The current 26-line placeholder is actively visible to real traffic. A proper homepage with a hero, featured calculator cards, and a brief value proposition converts visitors and establishes the brand. It builds on top of the existing `CalculatorLayout` primitives and requires no new infrastructure — just a well-structured `app/page.tsx`.

Together these two tasks take 1–2 days and produce the largest visible improvement relative to effort invested.

---

*~5,800 lines of source code across 36 files · 3 calculators implemented · 0 external databases · 0 API dependencies*
