# Task 2 — Master Code Manual for AI Coding Agents

> Written for agents building new calculators. Read every section before writing any code.

---

## §0. Agent Roles & Build Workflow

Before writing any code, every calculator build must pass through five role-defined gates in order. Full definitions in `_docs/AGENT_ROLES_V2.md`.

```
Role 1 — Product Strategy      → business case confirmed, scope locked
Role 2 — Financial Planning     → intelligence model + math spec complete
Role 3 — AI Insight Architect   → insight hierarchy + tone plan written
Role 4 — UX / System Design     → block structure + responsive plan agreed
Role 5 — Logic Validator        → formulas, edge cases, UI states verified (post-build)
```

**AI Analysis is the product differentiator. Calculators are the engine.**
No implementation starts until Roles 1–4 outputs exist. These are not optional planning steps — they are build gates.

**Planning template required:** Copy `_docs/NEW_CALCULATOR_PLANNING_TEMPLATE.md` to `_docs/planning/[slug].md` and complete every section before implementation. A partially filled template does not satisfy this gate.

See also: `_docs/FINANCIAL_INTELLIGENCE_FRAMEWORK.md` (intelligence layer rules), `_docs/CALCULATOR_TEMPLATE_V2.md §0` (step-by-step build process), `_docs/AGENT_ROLES_V2.md` (role responsibilities).

---

## §1. The Master Page System

Every calculator page is a two-file pair:

### 1.1 `page.tsx` — Server Component
Responsible for: SEO metadata, JSON-LD schema, and mounting the layout wrapper.

```tsx
// app/fire-calculator/page.tsx
import type { Metadata } from 'next';
import CalculatorLayout from '@/components/layout/CalculatorLayout';
import FireCalculator from './FireCalculator';

export const metadata: Metadata = {
  title: 'FIRE Calculator — Financial Independence Calculator | FinCalcSmart Pro',
  description: 'Calculate your FIRE number and retirement timeline for Canada and the USA. Free, no sign-up.',
  // Add canonical, openGraph, twitter as needed
};

const FAQS = [
  { question: 'What is the FIRE number?', answer: '...' },
];

export default function FireCalculatorPage() {
  return (
    <CalculatorLayout
      heading="FIRE Calculator"
      lede="Find your Financial Independence number and retirement date."
      showRegionToggle={true}
      faqs={FAQS}
    >
      <FireCalculator />
    </CalculatorLayout>
  );
}
```

### 1.2 `[Name]Calculator.tsx` — Client Component
Responsible for: all state, math, and interactive rendering.

```tsx
// app/fire-calculator/FireCalculator.tsx
'use client';

import { useState, useMemo } from 'react';
import { useRegion } from '@/lib/region/context';
import { FormLabel, inputCls } from '@/components/layout/CalculatorLayout';

export default function FireCalculator() {
  const { region } = useRegion();
  // ... form state, calculations, JSX
}
```

### 1.3 CalculatorLayout Props Reference

```ts
interface CalculatorLayoutProps {
  heading: string;           // H1 text — also used in FAQPage JSON-LD
  lede?: string;             // Subtitle beneath H1
  showRegionToggle?: boolean; // Default: true — set false for single-region tools
  children: ReactNode;       // The interactive calculator (client component)
  formulaSection?: ReactNode; // "How It Works" content
  scenariosSection?: ReactNode; // "Example Scenarios" content
  faqs?: Faq[];              // FAQ items → auto-generates FAQPage JSON-LD
  noCard?: boolean;          // true = calculator manages its own card styling
}
```

### 1.4 Exported layout primitives (import from CalculatorLayout)

```tsx
import {
  ResultsPanel,   // Dark navy results container
  InputGrid,      // Responsive 2-col input grid
  FormLabel,      // Brand-compliant label
  inputCls,       // Brand input className string
  type Faq,       // { question: string; answer: string }
} from '@/components/layout/CalculatorLayout';
```

---

## §2. Component Patterns

### 2.1 Standard Input Field

```tsx
import { FormLabel, inputCls } from '@/components/layout/CalculatorLayout';

<div>
  <FormLabel htmlFor="principal">Loan Amount</FormLabel>
  <input
    id="principal"
    type="number"
    className={inputCls}
    value={form.principal}
    onChange={(e) => set('principal', e.target.value)}
  />
</div>
```

### 2.2 NumericInput (currency/percent prefix/suffix)

```tsx
import { NumericInput } from '@/app/_mortgage-shared/ui';

<NumericInput
  value={form.amount}
  onChange={(v) => set('amount', v)}
  prefix="$"
  // or suffix="%"
  inputClassName={inputCls}
/>
```

### 2.3 Results Panel

```tsx
import { ResultsPanel } from '@/components/layout/CalculatorLayout';

<ResultsPanel minHeight={160}>
  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
    Your FIRE Number
  </p>
  <p style={{ color: '#1DB584', fontSize: 40, fontWeight: 800, letterSpacing: '-2px' }}>
    {fmtCAD(result.fireNumber)}
  </p>
</ResultsPanel>
```

### 2.4 Tooltip

```tsx
import { Tooltip } from '@/app/_mortgage-shared/ui';

<FormLabel htmlFor="swr">
  Safe Withdrawal Rate <Tooltip text="The 4% Rule assumes your portfolio survives 30+ years of withdrawals." />
</FormLabel>
```

### 2.5 DonutChart

```tsx
import { DonutChart, type PieSlice } from '@/app/_mortgage-shared/ui';

const slices: PieSlice[] = [
  { label: 'Investments', value: 850000, color: '#1DB584', alwaysShow: true },
  { label: 'Real Estate',  value: 250000, color: '#F59E0B' },
];

<DonutChart
  slices={slices}
  className="w-44 h-44"
  centerValue="$1.1M"
  centerLabel="net worth"
/>
```

---

## §3. Regional Toggle System

### 3.1 Architecture

The region is a React context stored in `lib/region/context.tsx`, persisted to `localStorage['fcs-region']`. The `RegionToggle` component in `components/ui/RegionToggle.tsx` writes to this context. The `SiteHeader` does not control region — it simply mounts.

### 3.2 Reading the region

```tsx
'use client';
import { useRegion } from '@/lib/region/context';

export default function MyCalculator() {
  const { region } = useRegion(); // 'us' | 'ca'

  const currencySymbol = region === 'ca' ? 'CAD' : 'USD';
  const taxRate        = region === 'ca' ? 0.13  : 0.10; // example
}
```

### 3.3 Swapping formulas by region

```tsx
const useMemo = () => {
  // Canadian mortgage: semi-annual compounding (Interest Act)
  const mRate = region === 'ca'
    ? Math.pow(1 + annualRate / 200, 1/6) - 1   // CA law
    : annualRate / 1200;                           // US simple monthly

  const payment = calcPayment(loanAmount, mRate, months);
};
```

### 3.4 Swapping labels and constraints

```tsx
const REGION_CONFIG = {
  ca: {
    currency:    'CAD',
    taxLabel:    'HST / GST',
    maxAmort:    30,
    incomeLabel: 'Gross Annual Income (CAD)',
  },
  us: {
    currency:    'USD',
    taxLabel:    'Sales Tax',
    maxAmort:    30,
    incomeLabel: 'Gross Annual Income (USD)',
  },
} as const;

const cfg = REGION_CONFIG[region];
```

### 3.5 Single-region calculators

If a calculator is Canada-only (e.g., RRSP, TFSA, CMHC) set `showRegionToggle={false}` in `CalculatorLayout` and hardcode the region logic. Do not import `useRegion()` at all.

### 3.6 Region-conditional rendering

```tsx
{region === 'ca' && (
  <p className="text-xs text-amber-600">CMHC insurance may apply.</p>
)}
{region === 'us' && (
  <p className="text-xs text-blue-600">PMI applies below 20% down.</p>
)}
```

### 3.7 Canada Mortgage Qualifier — B-20 Formula Rule

**Borrowing capacity must be sized at the B-20 stress rate, not the contract rate.**

```tsx
// CORRECT — stress-rate-sized mortgage (actual OSFI B-20 qualifying limit)
const stressRate  = Math.max(annualRate + 2, 5.25);
const rStress     = monthlyRateCA(stressRate);
const maxMortgage = maxPI * (1 - Math.pow(1 + rStress, -n)) / rStress;

// Displayed monthly P&I uses the actual contract rate on that mortgage
const r         = monthlyRateCA(annualRate);
const monthlyPI = calcPayment(maxMortgage, r, n);  // lower than stress-rate payment ✓
```

**Why this matters:** Sizing maxMortgage at the contract rate (lower rate → larger PV) then
re-verifying at the stress rate produces ratios that always exceed the GDS/TDS limits —
making "approved" mathematically impossible. The fix ensures stressPI = maxPI exactly,
so gdsRatio = gdsLimit at the qualifying boundary → approved verdict fires correctly.

**Consequence for verdict states:** A max-capacity qualifier always produces ratios exactly
at their limits. The "borderline" verdict (ratio between limit and limit+5pp) is not reachable
in normal operation — the verdict is always "approved" (positive capacity) or "declined"
(zero capacity / debts exceed TDS budget). This is correct; do not "fix" it.

---

## §4. Performance Constraints

### 4.1 CSS Rules
- **Tailwind classes only** for layout and spacing — no `style={{ margin: ... }}` for things Tailwind handles
- Use `style={{}}` only for brand-specific values not in the config (e.g., exact hex colors, pixel values from the brand spec)
- No `@apply` in `globals.css` — keep it to Tailwind base layer + one custom font variable
- No CSS modules — all styling via Tailwind + inline style for brand tokens

### 4.2 JavaScript bundle rules
- No new `npm install` without user approval
- All chart components must be inline SVG — no canvas libraries
- Use `useMemo` for ALL financial calculations — never run math in render without memoization
- Dynamic imports (`next/dynamic`) only if a component exceeds ~15 KB and is below the fold

### 4.3 Image rules
- Use `next/image` for all images — never raw `<img>`
- All icons from lucide-react — keep tree-shaking intact (named imports only)

### 4.4 Core Web Vitals targets

| Metric | Target |
|--------|--------|
| LCP | < 2.5s |
| CLS | 0 (Ad slots use fixed IAB dimensions via inline style) |
| INP | < 200ms |
| FCP | < 1.8s |

**CLS prevention rules:**
- All AdSlot components use fixed `width` + `height` inline styles — never percentage-based
- Result panels use `minHeight` to reserve space before calculations run
- Font: loaded via `next/font` with `display: swap` — already wired in `app/layout.tsx`

### 4.5 SEO requirements per calculator page
Every `page.tsx` must export:
```ts
export const metadata: Metadata = {
  title: '[Calculator Name] — [Country] [Category] Calculator | FinCalcSmart Pro',
  description: '[One sentence, 150 chars max, includes primary keyword]',
};
```
And the `CalculatorLayout` `faqs` prop auto-generates `FAQPage` JSON-LD — always supply at least 4 FAQs.

---

## §5. Formatting Utilities

```ts
// Monetary — always use these, never raw .toFixed()
fmtCAD(1234567)    // → "$1,234,567"   (no decimals, CAD by default)
fmtCADx(1234.56)   // → "$1,234.56"   (with cents)

// For US dollar amounts, create equivalent helpers in the calculator:
const fmtUSD  = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtUSDx = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
```

---

## §6. New Calculator Scaffolding Checklist

Build new calculators **fresh from the V2 template** (`app/canadian-mortgage-calculator/`). Do not adapt old pages.

> **Intelligence gate — required before any file is created.**
> Complete all eight pre-build requirements in `_docs/FINANCIAL_INTELLIGENCE_FRAMEWORK.md §7` first.
> Then complete the 4-step build process in `_docs/CALCULATOR_TEMPLATE_V2.md §0` (Step 0 → Strategy → Math Spec → Page Structure → QA).
>
> **AI Analysis is the product differentiator. Calculators are the engine.**
> No new calculator starts from UI or template scaffolding alone — strategy + math spec + AI Analysis insight plan must be defined before any code is written. The checklist below maps to Step 3 and Step 4 of that process.

- [ ] Create `app/[slug]/page.tsx` with correct `metadata` export and `CalculatorLayout` wrapper
- [ ] Create `app/[slug]/[Name]Calculator.tsx` with `'use client'` directive
- [ ] Define `FormState` interface at top of calculator file
- [ ] Define `Results` interface at top of calculator file
- [ ] Wrap all math in `useMemo`, dependency array includes all relevant form fields
- [ ] Add `null` guard — return early if inputs are invalid; never render NaN, Infinity, or negative monetary values
- [ ] Copy `cardStyle` const from CA calculator: `border: '1px solid rgba(15,41,66,0.09)', borderRadius: '20px'`
- [ ] Place `<Disclaimer />` (from `_mortgage-shared/ui`) unconditionally at the bottom — never conditional on results
- [ ] Results card: short helper line directly above the CTA button describes what AI Analysis reveals for this calculator; CTA label is calculator-specific (never generic "View AI Analysis")
- [ ] Visual support: two cards present — left = breakdown visual (donut or composition), right = comparison/scenario/timeline/trend; both explain the result, not decoration
- [ ] AI Analysis panel: always include the inner disclaimer strip (ShieldAlert + text)
- [ ] Supply minimum 4 FAQ items to `CalculatorLayout`
- [ ] Add the calculator to `lib/calculators.ts` → `CALC_INDEX` with `label`, `href`, `description`, `category`, `region`, `icon`, `iconColor`, `iconBg`, and `available: true`. This is the single source of truth for search, mega-menu, footer, and the calculators directory — do not add entries anywhere else.
- [ ] If the calculator is a country-specific variant of an existing type (e.g., US version of a CA calculator), follow the §8 country-aware routing pattern: add `regionRoutes` + `searchLabel` to the canonical entry, and set `navHidden: true` on the duplicate entry.
- [ ] The mega-menu derives from `CALC_INDEX` automatically (filtered by `!navHidden`). No manual update to `SiteHeader.tsx` is needed unless the category is new.
- [ ] Test region toggle (if applicable) — verify currency prefixes (`CA$` / `$`) and labels swap correctly on both CA and US
- [ ] Mobile/tablet/desktop QA: 375px, 768px, 1280px — no overflow, no blank states, correct responsive layout
- [ ] Visual self-check: open completed page alongside locked CA Mortgage Calculator V2; spacing, card style, and typography must match

---

## §7. Search System

### 7.1 Architecture

| File | Role |
|------|------|
| `lib/calculators.ts` → `CALC_INDEX` | Single source of truth for all calculator metadata. Every search surface reads from here. |
| `components/ui/CalcSearch.tsx` | Reusable search UI — three variants: `hero` (homepage pill + CTA button), `header` (compact desktop input), `drawer` (compact mobile nav input). |
| `app/calculators/CalculatorsClient.tsx` | Client component; reads `initialQuery` prop (from URL `?q=`), filters `CALC_INDEX`, renders category sidebar + card grid. |
| `app/calculators/page.tsx` | Async server component; reads `searchParams.q`, passes it as `initialQuery` to `CalculatorsClient`. |

### 7.2 Adding a new calculator to search

When a new calculator is ready to ship, add it to `CALC_INDEX` in `lib/calculators.ts` with `available: true`. Set `available: false` while building — it will appear in the `/calculators` directory as "Coming Soon" but will not appear in the `CalcSearch` dropdown.

**Do not add calculator entries anywhere else.** `CalcSearch`, `CalculatorsClient`, and any future search surface all derive from `CALC_INDEX` automatically.

Required `CalcEntry` fields: `label`, `href`, `description`, `category`, `region` (`'ca'` | `'us'` | `'both'`), `icon` (lucide-react component), `iconColor`, `iconBg`, `available`.

Optional `CalcEntry` fields — use when a calculator has country-specific variants (see §8 for the full pattern):

| Field | Type | Purpose |
|-------|------|---------|
| `navHidden` | `boolean` | Hides entry from mega-menu and search. The page still exists at its `href` for direct access and SEO. |
| `regionRoutes` | `{ ca: string; us: string }` | When set, all navigation and search surfaces resolve the destination URL from this map using the active region rather than `href`. |
| `searchLabel` | `string` | Generic label shown in search results instead of the full country-specific title (e.g., `'Mortgage Calculator'` instead of `'Canadian Mortgage Calculator'`). |

### 7.3 Search routing behaviour

`CalcSearch` scores results (exact label = 3, prefix = 2, contains = 1.5, description = 1, category = 0.5) and routes on Enter / button click:

- **Single result, or top score === 3 (exact label match):** navigates directly to the calculator page.
- **Multiple results, top score < 3:** navigates to `/calculators?q=<query>` where the full filtered list is shown.

The `/calculators` page reads `q` server-side and pre-fills the search input so results are immediately visible without client-side hydration delay.

**Country-aware navigation in search:** If the matched entry has `regionRoutes`, the navigate callback resolves the destination as `entry.regionRoutes[region]` instead of `entry.href`. The result label shows `entry.searchLabel ?? entry.label` so the user sees the generic name (e.g., "Mortgage Calculator"), not the country-specific internal title.

**`navHidden` entries are excluded from search.** The `AVAILABLE` array is filtered with `c.available && !c.navHidden` at module load. This prevents duplicate country-specific versions from appearing alongside their canonical counterpart. See §8 for the full reasoning.

### 7.4 `/calculators` URL parameters

The `/calculators` page supports two URL parameters, both read server-side and passed as props to `CalculatorsClient`:

| Param | Example | Effect |
|-------|---------|--------|
| `?q=` | `/calculators?q=mortgage` | Pre-fills the search input; filters by relevance score |
| `?category=` | `/calculators?category=Mortgage` | Pre-selects the matching sidebar category; filters to that category |

Both params can coexist but `setQuery` clears `activeCategory` and vice-versa in the client.

**Homepage category chips use `?category=`.** Do not link homepage chips directly to calculator pages — link them to `/calculators?category=CategoryName`.

### 7.5 Future search improvements (not started)

- Arrow-key navigation in the `CalcSearch` dropdown
- Richer autocomplete: category labels, region badges, highlighted match text
- AI-powered semantic search: natural language intent matching

---

## §8. Calculator Discovery & Country-Aware Routing

> **This section is authoritative.** Read it before building any calculator that has a country-specific variant, and before touching any navigation, footer, or search surface.

### 8.1 The core rule

**Navigation shows tool type, not country variant.**

The country/region toggle is the control. The mega-menu, footer, and search show one generic entry per calculator type. Clicking it resolves to the correct country page based on the active region.

❌ **Wrong — duplicates in nav:**
```
Mortgage section shows:
  • Canadian Mortgage
  • US Mortgage
```

✅ **Correct — one generic entry, country-aware destination:**
```
Mortgage section shows:
  • Mortgage  →  /canadian-mortgage-calculator  (Canada active)
              →  /us-mortgage-calculator         (USA active)
```

### 8.2 CALC_INDEX fields for country-aware routing

Three optional fields on `CalcEntry` implement this pattern:

```ts
// lib/calculators.ts

// ── Canonical entry — visible in nav, search, mega-menu ──
{
  label: 'Canadian Mortgage Calculator',  // internal label; used for scoring in CalcSearch
  href:  '/canadian-mortgage-calculator', // fallback if regionRoutes not set
  region: 'both',                         // covers both regions
  available: true,
  regionRoutes: {
    ca: '/canadian-mortgage-calculator',
    us: '/us-mortgage-calculator',
  },
  searchLabel: 'Mortgage Calculator',     // what the user sees in search results
  // ... icon, category, etc.
},

// ── Country-specific duplicate — SEO page lives, nav hidden ──
{
  label: 'US Mortgage Calculator',
  href:  '/us-mortgage-calculator',
  region: 'us',
  available: true,
  navHidden: true,   // excluded from mega-menu and search; page still accessible directly
  // ... icon, category, etc.
},
```

**What each field does:**

| Field | Mega-menu | Search | Footer | Direct URL |
|-------|-----------|--------|--------|------------|
| `navHidden: true` | Hidden | Hidden | n/a (footer is hardcoded) | Still works |
| `regionRoutes` | Resolves href by region | Resolves href by region | Resolves href by region | Not used |
| `searchLabel` | Uses `NAV_LABEL` map | Shown as result title | n/a | Not used |

### 8.3 Where regionRoutes is resolved

Every navigation surface that links to a calculator must resolve `regionRoutes` if it exists:

**Mega-menu (`SiteHeader.tsx`):**
```tsx
href={item.regionRoutes?.[region] ?? item.href}
```

**Footer (`SiteFooter.tsx`):**
```tsx
href={link.regionRoutes?.[region] ?? link.href}
// FooterLink type includes: regionRoutes?: { ca: string; us: string }
```

**Search (`CalcSearch.tsx`):**
```tsx
const href = entry.regionRoutes?.[region] ?? entry.href;
router.push(href);
```

The `region` value (`'ca'` | `'us'`) always comes from `useRegion()` — never hardcoded.

### 8.4 Mega-menu display labels

The mega-menu uses a `NAV_LABEL` map in `SiteHeader.tsx` to override the internal `CALC_INDEX` label with a short navigation label:

```ts
const NAV_LABEL: Record<string, string> = {
  'Canadian Mortgage Calculator': 'Mortgage',   // canonical → generic nav label
  'Mortgage Qualifier Calculator': 'Mortgage Qualifier',
  // ... one entry per calculator that needs a shorter label
};
```

`NAV_LABEL` is **only for the mega-menu**. Do not use it in search results — use `searchLabel` on the `CalcEntry` instead.

### 8.5 Homepage category chips

Homepage chips are **category shortcuts**, not direct calculator links.

```ts
// components/home/HeroSearch.tsx
const CHIPS = [
  { label: 'Mortgage',           href: '/calculators?category=Mortgage' },
  { label: 'Loans',              href: '/calculators?category=Loans' },
  { label: 'Financial Planning', href: '/calculators?category=Financial Planning' },
  { label: 'Investing',          href: '/calculators?category=Investing' },
  { label: 'Tax & Salary',       href: '/calculators?category=Tax & Salary' },
];
```

**Do not link chips to individual calculator pages.** The `?category=` URL param pre-selects the sidebar filter on `/calculators` so the user sees all tools in that category. This is country-neutral and requires no region logic.

### 8.6 Adding a future country-specific calculator

When a new calculator needs separate Canada and USA pages (e.g., Income Tax CA vs US):

1. **Build both pages** at their own slugs (`/income-tax-calculator-ca`, `/income-tax-calculator-us` or whatever the SEO slug strategy dictates). Both pages remain live.

2. **In `CALC_INDEX`:** Pick one entry as the canonical nav entry. Add `regionRoutes` and `searchLabel`. Mark the other entry `navHidden: true`.

3. **Add to `NAV_LABEL`** in `SiteHeader.tsx` with the short generic label.

4. **Footer:** If the calculator appears in `SiteFooter.tsx`'s `FOOTER_LINKS`, add `regionRoutes` to the `FooterLink` entry using the `FooterLink` type.

5. **No other changes needed.** Mega-menu, search, and category filter all derive from `CALC_INDEX` automatically.

### 8.7 What NOT to do

- ❌ Do not show both "Canadian X" and "US X" as separate items in the mega-menu, footer, or search results.
- ❌ Do not hardcode a country-specific `href` (e.g., `/canadian-mortgage-calculator`) anywhere in navigation without a `regionRoutes` fallback.
- ❌ Do not link homepage chips directly to individual calculator pages.
- ❌ Do not create a second region/country system — always use `useRegion()` from `lib/region/context`.
- ❌ Do not add `navHidden` entries to the footer's `FOOTER_LINKS` — the footer is a separate hardcoded list; manage it directly.
- ❌ Do not remove `navHidden: true` entries from `CALC_INDEX` — they represent live SEO pages.

### 8.8 Known limitation — Mobile Navigation (Phase 2)

The mobile drawer (`SiteHeader.tsx`) does **not** yet apply `regionRoutes` or `NAV_LABEL`-style short labels. As of V1 QA (2026-05-23):

- Mobile drawer shows "Canadian Mortgage Calculator" (full CALC_INDEX label, not "Mortgage")
- Mobile drawer Mortgage link always resolves to `item.href` (`/canadian-mortgage-calculator`), ignoring `regionRoutes`

This is a documented gap, not a bug to fix now. No duplicate entries appear (the `MEGA_CATEGORIES` filter already excludes `navHidden` items from the mobile drawer). Fix is planned as **Mobile Navigation V2 Phase 2a** — see `PROJECT_STATUS.md`.

### 8.9 All Calculators V2 — `/calculators` page architecture

> LOCKED · QA PASSED · 2026-06-09. Files: `app/calculators/page.tsx` + `app/calculators/CalculatorsClient.tsx`.

The `/calculators` directory page is the primary discovery surface. Its V2 architecture must be understood by any agent extending it.

**Page split (Next.js 15 App Router pattern):**
```
app/calculators/
  page.tsx              ← Server component: metadata + searchParams → CalculatorsClient
  CalculatorsClient.tsx ← 'use client': all interactive state, filtering, search, URL sync
```

**`page.tsx`** reads `searchParams` as a Promise (Next.js 15 requirement) and passes `initialQuery` and `initialCategory` as props. Background gradient and `-80px / 80px` scroll margin live here.

**`CalculatorsClient.tsx` key patterns:**

```tsx
// Search scoring — all weights are intentional, do not change without user approval
function scoreEntry(entry: CalcEntry, q: string): number {
  // label=3, searchLabel=3, description=2, category=1, region=0.5
}

// Active filter — null=All, 'canada-only'=special branch, else=category name
const [activeFilter, setActiveFilter] = useState<string | null>(initialCategory || null);

// URL sync — skips first render to avoid overwriting initial searchParams
const isFirstRender = useRef(true);
useEffect(() => {
  if (isFirstRender.current) { isFirstRender.current = false; return; }
  // router.replace(pathname + ?q=...&category=..., { scroll: false })
}, [query, activeFilter]);

// Featured entries — type-safe filter required
const featuredEntries = FEATURED_HREFS
  .map(href => visibleList.find(e => e.href === href))
  .filter((e): e is CalcEntry => e !== undefined);
```

**Chip filter system:**
- `CHIPS` constant defines all chip labels, values, and counts.
- Hard-coded chip counts (`count: 5` etc.) — update these manually when new calculators are added to `CALC_INDEX`.
- `'canada-only'` is a special `activeFilter` value — checked before regular category branch: `entry.region === 'ca'`.
- Search and category are fully independent — neither clears the other on change.

**Card variants:**
- `CalcCard` — white card for the main grid. Hover via `onMouseEnter`/`onMouseLeave` DOM style manipulation.
- `DarkCalcCard` + `DarkRegionBadge` — dark navy card used only in the Featured Popular panel. Same hover pattern.
- Do not use `group-hover:` Tailwind classes for card hover — they require arbitrary values that touch `tailwind.config.ts`.

**When adding a new calculator to CALC_INDEX:**
1. Update the matching chip `count` in `CHIPS` if the category chip count changes.
2. If the new calculator should appear in Featured Popular, add its `href` to `FEATURED_HREFS`.
3. If it is Canada-only (`region: 'ca'`), it will automatically appear under Canada Only filter — no code change needed.

---

## §9. Flagship Insight Module Pattern

> Confirmed standard as of FIRE Calculator V1 (2026-06-04). Two calculators use this pattern: Retirement Savings Calculator V1 ("Retirement Readiness Insight") and FIRE Calculator V1 ("Financial Independence Insight").

### 9.1 What is a flagship insight module?

A **flagship insight module** is the named AI Analysis section of a calculator that goes beyond a generic "AI Analysis" label. It has a product name, a branded sublabel, and a results object structured for future reuse on the AI Insights page.

Use this pattern for any calculator where the AI section is the primary product differentiator — not just a supporting summary.

### 9.2 Required structure

**Header:**
```tsx
<p className="text-white text-lg md:text-xl font-bold tracking-tight">
  FinCalc <span style={{ color: '#F97316' }}>Smart</span> [Product Name] Insight
</p>
<p className="text-slate-400" style={{ fontSize: '11px' }}>AI-assisted insights by FinCalc Smart</p>
```

- `[Product Name]` is a short noun phrase: "Retirement Readiness", "Financial Independence", etc.
- Sublabel is always exactly: `AI-assisted insights by FinCalc Smart`
- Do not use "Powered by", "Generated by", or any variant.

**Header action buttons** (Download PDF / Email Results — both disabled placeholders):
- Desktop (`lg:`+): right-aligned in the same header row as the title.
- Tablet/mobile: stacked below the title (`flex-col` until `lg:flex-row`).

### 9.3 Results object — summary-card fields

The calculator's results `useMemo` must expose these fields for future AI Insights page consumption. Add them even if the AI Insights page is not built yet.

| Field | Type | Description |
|---|---|---|
| `readinessScore` | `number` (0–100) | Primary health/readiness score |
| A primary output value | `number` | The headline result (e.g., `projectedSavings`, `fireAge`) |
| A goal/target value | `number \| null` | The user's goal or FIRE target |
| A progress % | `number` | Progress toward goal (0–100) |
| A gap/surplus value | `number` | Gap or surplus vs goal |
| `statusLabel` | `string` | Short state label: "On Track", "Building", "At Risk", etc. |

The exact field names should match the calculator domain. Document them in `PROJECT_STATUS.md` in the calculator's lock entry.

### 9.4 When to use this pattern

Use the flagship insight module pattern when:
- The AI section is the primary reason to use the calculator (not a secondary summary)
- The calculator has a named readiness/health score (0–100 gauge)
- The results object exposes summary-card-ready fields

Do **not** apply this pattern to utility calculators (sales tax, salary, etc.) where the AI section is supplementary.

### 9.5 AI Insights page — LOCKED V1

The `/ai-insights` page (`app/ai-insights/page.tsx`) is live and locked. It is a premium product showcase (RSC, no `'use client'`) with four sections: Hero, Calculate → Analyze → Decide, What could your numbers reveal?, and a final CTA. Do not edit without explicit approval.

The results object fields in §9.3 remain the data contract for any future cross-calculator dashboard or summary card surface.

---

## §10. Shared Page-Width / Container Rule

> Established 2026-06-11. Applies to all non-calculator pages.

### 10.1 The rule

Every new non-calculator page (landing pages, showcase pages, editorial content, guides, comparison pages) must inherit the homepage primary inner-container classes. Do not invent a new `max-width` for each page.

**Homepage container (source of truth):**
```
mx-auto max-w-6xl px-4
```

### 10.2 How to apply

- Full-width section backgrounds (`<section>` with a gradient or colour) are permitted — do not remove them.
- The inner content wrapper (`<div>` directly inside `<section>`) must use the shared container.
- All major sections on the same page (hero, feature sections, grids, SEO blocks, CTA) must use the same container classes so their left/right boundaries align.
- Navigation may remain slightly wider than page content — this is expected and correct.

```tsx
// Correct pattern — same container on every section:
<section style={{ background: '...' }}>
  <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20 lg:py-24">
    {/* content */}
  </div>
</section>
```

### 10.3 Pre-completion verification checklist

Before declaring a new page complete, verify all of the following:

- [ ] All major section inner containers use `mx-auto max-w-6xl px-4`
- [ ] Content left/right boundaries align across all sections
- [ ] Navigation visibly wider than page content (not equal width)
- [ ] Desktop 1280px: balanced side margins, no content touching the viewport edge
- [ ] Tablet 768px: layout wraps correctly, no overflow
- [ ] Mobile 375px: `px-4` gives correct gutters, no overflow
- [ ] No horizontal scrollbar at any breakpoint

### 10.4 Pages corrected to this standard

| Page | Previous | Corrected |
|------|----------|-----------|
| `/ai-insights` (all sections) | `max-w-7xl` + responsive px | `max-w-6xl px-4` |
| `/calculators` | `max-w-7xl` + responsive px | `max-w-6xl px-4` |

### 10.5 Future pages

Apply this rule immediately when building: `/financial-guides`, any future landing pages, comparison pages, editorial content. Do not wait for a separate width-correction pass.

---

## §11. Financial Guide Article Template

> Established 2026-06-13 with Mortgage Affordability Guide V1. Applies to all pages under `app/guides/`.

### 11.1 File structure

Every guide lives at:

```
app/guides/[slug]/
  page.tsx          ← RSC: metadata (title, description, openGraph, JSON-LD Article schema) + ArticleLayout wrapper
```

Shared infrastructure (do not modify without explicit approval):

```
app/guides/_shared/
  ArticleLayout.tsx        ← ambient gradient shell + overflow-x-clip; accepts children
  GuideCTA.tsx             ← CTA panel (wired to the active calculator for this topic)
  RatioBar.tsx             ← horizontal ratio bar component
  ArticleDisclaimer.tsx    ← bottom disclaimer block
```

### 11.2 JSON-LD schema

Every guide page must export an Article (or FAQPage) JSON-LD block via `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(...) }} />` inside the RSC.

Minimum required fields: `@type: "Article"`, `headline`, `description`, `datePublished`, `dateModified`, `publisher` (`@type: "Organization"`, `name`, `url`).

### 11.3 ArticleLayout gradient trick

`ArticleLayout` uses `overflow-x-clip` combined with `marginTop: -80px` / `paddingTop: 80px` on the top gradient element so the ambient radial gradient bleeds behind the sticky nav without causing horizontal overflow. Do not remove these values.

### 11.4 Scenario card — InsightsShowcase pattern

Any "Illustrative Scenario" product card inside a guide must reuse the exact layered structure from `components/home/InsightsShowcase.tsx`. Do not approximate from screenshots or invent a new visual treatment.

Required layers (in order):
1. **Back card** — `absolute inset-x-3 -bottom-3 rounded-brand-xl border border-brand-gray-100 bg-white` (depth effect)
2. **Outer card** — `relative overflow-hidden rounded-brand-xl border border-brand-gray-200 bg-white` + shared box-shadow
3. **Chrome header** — `#F8FAFB` background, `#E4E9EF` border-bottom, uppercase tracking label + region badge
4. **Input tiles** — `bg-brand-gray-50` grid, `rounded-brand-sm border border-brand-gray-200 px-3 py-2`
5. **Dark result panel** — `mx-4 mb-4 rounded-brand-lg p-3.5`, `linear-gradient(150deg, #0D2137 0%, #0A1628 100%)`, teal border
6. **Footer** — `border-t border-brand-gray-100 px-4 py-2`, `#F8FAFB` background, disclaimer copy

Dark panel typography rules:
- Value labels: `text-white/55`
- Primary metric values: `text-white/90` (or `text-white` for full opacity when contrast requires)
- Teal positive values: `color: '#1DB584'`
- Amber caution values: `color: '#C9A84C'`
- Section sub-labels: `color: 'rgba(255,255,255,0.45)'`

### 11.5 Verified scenario values (Mortgage Affordability Guide V1)

| Input | Value |
|-------|-------|
| Gross income | CA$120,000 / yr |
| Monthly debt | CA$650 / mo |
| Home price | CA$650,000 |
| Down payment | CA$130,000 (20%) |
| Mortgage rate | 5.19% |
| Amortization | 25 years |

| Output | Value | Formula / source |
|--------|-------|-----------------|
| Mortgage required | CA$520,000 | Home price − down payment |
| Qualifying rate | 7.19% | max(5.19% + 2%, 5.25%) |
| Monthly payment | CA$3,082 | `calcPayment(520000, monthlyRateCA(5.19), 300)` |
| Est. GDS ratio | ~37% | (3,082 + 450 + 125) / (120,000/12) |
| Est. TDS ratio | ~43% | (3,082 + 450 + 125 + 650) / (120,000/12) |

Illustrative costs used: CA$450/mo property tax + CA$125/mo heat.

### 11.6 Metadata decision — locked

The guide's `<title>` tag uses the long-form SEO title directly (not appended by the root layout `| FinCalcSmart`). This is intentional — guide titles already include brand-adjacent keywords and are longer than calculator titles. Do not change this pattern without user approval.

### 11.7 Section structure — locked for V1

The Mortgage Affordability Guide V1 has six sections:

| # | Section | Key content |
|---|---------|-------------|
| 01 | Hero | H1 + lede + metadata chips + ambient gradient |
| 02 | How Much Can You Afford? | GDS/TDS ratio bars, qualifying rate explainer |
| 03 | Scenario Illustration | InsightsShowcase card (left) + 4-lever editorial list (right) |
| 04 | Three Mistakes | 3-card grid of common borrower mistakes |
| 05 | Calculator CTA | `<GuideCTA />` wired to `/mortgage-qualifier-calculator` |
| 06 | Disclaimer | `<ArticleDisclaimer />` |

Do not add, remove, or reorder sections without explicit user approval.

### 11.8 QA record — Mortgage Affordability Guide V1

> QA completed: 2026-06-13 · Result: **8/8 PASS** · `tsc --noEmit` clean

| Check | Result |
|-------|--------|
| Runtime — no server errors, page loads | ✅ |
| TypeScript — `tsc --noEmit` clean | ✅ |
| Routes/links — CTA links to correct calculator | ✅ |
| Metadata/SEO — title, description, JSON-LD Article present | ✅ |
| Content integrity — no placeholder text, no "undefined" in body content | ✅ |
| Scenario math — all 5 output values verified correct | ✅ |
| Accessibility basics — single H1, heading hierarchy, aria-hidden decorative | ✅ |
| Responsive regression — 375px / 768px / 1280px, no overflow | ✅ |

### 11.9 Approved inner editorial layout — 2×2 open grid

> Established 2026-06-13 with Emergency Fund Guide V1.

The locked outer guide shell (ArticleLayout, section wrappers, Scenario card, GuideCTA, ArticleDisclaimer) is fixed and must not change. The inner information layout inside each section **may be selected based on content** using only the approved patterns below.

**Rule:** An exact structural clone of the Mortgage Affordability Guide does not require preserving empty space caused by mismatched content density. Select the approved inner layout that best fits the content. Do not free-form invent new patterns.

#### Approved inner editorial layout patterns

| Pattern | Tailwind | When to use |
|---------|----------|-------------|
| Single-column divider list | `flex flex-col` | Default; 5+ items or long per-item copy |
| **2×2 open grid** | `grid grid-cols-1 md:grid-cols-2 gap-x-10` | Short four-item frameworks or four action levers |
| Three-column grid | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` | Three common mistakes (with responsive border classes from MG) |
| Comparison panel | Left `5fr` / Right `7fr` column ratio | Scenario card + observations layout |

#### 2×2 grid implementation rules

- Outer section container: remove `max-w-3xl` — use full section width within `max-w-6xl`
- Grid class: `grid grid-cols-1 md:grid-cols-2 gap-x-10`
- Item borders: inline `border-t` on each item div (not a separate `h-px` divider element)
- Item 0: `py-5 pt-0` (no top border)
- Items 1, 2, 3: `border-t` (top border; item 1 also gets `md:border-t-0` to suppress border in desktop right column row 1)
- No card backgrounds, no shadows — open editorial style preserved
- Concluding notes and footnotes: remain full-width below the grid (inside the same outer wrapper)

#### 11.10 QA record — Emergency Fund Guide V1

> QA completed: 2026-06-13 · Result: **PASS** · `tsc --noEmit` clean · `next build` clean

| Check | Result |
|-------|--------|
| Runtime — no server errors, no console warnings, page loads | ✅ |
| TypeScript — `tsc --noEmit` clean | ✅ |
| Build — `next build` 0 errors, static route `/guides/emergency-fund` generated | ✅ |
| Routes/links — breadcrumbs, primary CTA (`/emergency-fund-calculator`), secondary CTA (`/savings-goal-calculator`) | ✅ |
| Metadata/SEO — title, description, Article JSON-LD, BreadcrumbList JSON-LD, datePublished 2026-06-13 | ✅ |
| Content integrity — sections 01–05, no undefined/NaN/Infinity, AI-assisted wording, disclaimer | ✅ |
| Scenario math — CA$24,000 target / 1.25 months / CA$19,000 gap / 38 months / ~3 yr 2 mo all verified | ✅ |
| Lever math — CA$750/mo=26mo · CA$2,000 lump=CA$17,000/34mo · CA$3,200 essential=CA$19,200/CA$14,200/29mo | ✅ |
| Responsive regression — 375px (1-col grids) / 768px (2-col grids) / 1280px (2-col grids), no overflow | ✅ |
| Accessibility basics — single H1, heading hierarchy, aria-hidden decorative elements | ✅ |

### 11.11 QA record — Compound Interest Guide V1

> QA completed: 2026-06-16 · Result: **PASS** · `tsc --noEmit` clean · `next build` clean

| Check | Result |
|-------|--------|
| Runtime — no server errors, no console warnings, page loads | ✅ |
| TypeScript — `tsc --noEmit` clean | ✅ |
| Build — `next build` 0 errors, static route `/guides/compound-interest` generated (34 pages total) | ✅ |
| Routes/links — breadcrumbs, primary CTA (`/compound-interest-calculator`), secondary CTA (`/investment-fees-calculator`) | ✅ |
| Metadata/SEO — title "How Compound Interest Works — Long-Term Growth Guide", description, Article JSON-LD, BreadcrumbList JSON-LD (3 items), datePublished 2026-06-13 | ✅ |
| Content integrity — sections 01–05, no undefined/NaN/Infinity, no guaranteed-return language, AI-assisted wording, disclaimer | ✅ |
| Scenario math — CA$264,122 final balance / CA$130,000 contributed / CA$134,122 growth / 50.8% / 49.2% / pctSum 100.0% verified in browser | ✅ |
| Comparison math — comp1 ~CA$94,172 / comp2 ~CA$115,511 / comp3 ~CA$58,509 / comp4 ~CA$29,163 — all guide "approximately" values accurate | ✅ |
| Responsive regression — 375px (1-col grids, stacked) / 768px (2-col grids, same-row) / 1280px (2-col grids, same-row), no overflow | ✅ |
| Accessibility — 26/26 SVGs aria-hidden, zero unnamed links, zero body H3s, no flag emoji | ✅ |

---

## §12. Common PDF Download V1 — Standard

> Prototype approved 2026-06-16 on `/retirement-planning-calculator`. Architecture is locked. Do not change the engine or type system without explicit user approval.

### 12.1 Architecture overview

```
lib/pdf/
  pdfTypes.ts          ← ReportData + all sub-interfaces (locked)
  pdfTheme.ts          ← C (colors), P (page geometry), F (font), lh() (locked)
  pdfEngine.ts         ← buildReportDocument() + generatePDF() + helpers (locked)
  adapters/
    retirementAdapter.ts   ← Locked prototype adapter (Family 1)
    savingsGoalAdapter.ts  ← Locked (Family 1, Batch 2 first — 2026-06-17)
    mortgageAdapter.ts          ← Locked (Family 3, Batch 1 — 2026-06-17); CA+US; Health Score two-mode scoring; Mortgage family regional reuse validated 2026-06-18
    investmentGrowthAdapter.ts  ← Locked (Family 2, Batch 1 — 2026-06-17); CA+US; approved reusable pattern for Investment Growth family
    investmentFeesAdapter.ts    ← Locked (Family 2, Batch 2 — 2026-06-18); CA+US; 3-segment composition bar; Fee Drag Score
    roiAdapter.ts               ← Locked (Family 2, Batch 2 — 2026-06-18); CA+US; profit/loss donut; ROI Health Score; optional annualized ROI + target
    loanAdapter.ts              ← Locked (Family 4, Batch 2 — 2026-06-18); CA+US; shared for personal-loan + car-loan; loanType discriminant; principal/interest composition bar; Borrowing Cost Score
    taxIncomeAdapter.ts         ← Locked (Family 5, Batch 2 — 2026-06-18); CA+US; salary-calculator; user-entered deduction rate only; Pay Clarity Score from component state (no duplicate formula); region-specific methodology + disclaimer (CA: CPP/EI/provincial; US: FICA/Medicare/state); take-home/deductions composition bar
    [name]Adapter.ts            ← One per report family (see §12.4)
```

**jsPDF is lazy-loaded.** Never import it at module level. Always use `await import('jspdf')` inside the async handler. This keeps the initial bundle clean (retirement page: 118 kB first load — jsPDF is a separate 542 kB chunk loaded only on click).

### 12.2 Adding a PDF adapter — required pattern

```tsx
// 1. In the calculator component
const [pdfGenerating, setPdfGenerating] = useState(false);

async function handleDownloadPDF() {
  if (!results || pdfGenerating) return;
  setPdfGenerating(true);
  try {
    const { buildXxxPDF } = await import('@/lib/pdf/adapters/xxxAdapter');
    await buildXxxPDF(results, region, fmt, fmtx);
  } catch (err) {
    console.error('PDF generation failed:', err);
  } finally {
    setPdfGenerating(false);
  }
}

// 2. Button state
<button onClick={handleDownloadPDF} disabled={!results || pdfGenerating}>
  {pdfGenerating ? 'Generating…' : 'Download PDF'}
</button>
```

### 12.3 Currency formatters in adapters

PDF adapters must use PDF-specific internal formatters. Do NOT pass through the calculator's `fmt`/`fmtx` directly — those use `en-CA` locale which produces `$` not `CA$`.

```ts
// Inside buildXxxReportData() — always override, never trust passed-in formatters:
function makePdfFmt(region: 'ca' | 'us'): (n: number) => string {
  const currency = region === 'ca' ? 'CAD' : 'USD';
  return (n) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}
// en-US + CAD → "CA$1,736,885"
// en-US + USD → "$2,143,780"
```

### 12.4 Report family → adapter mapping

See `PROJECT_STATUS.md` → Common PDF Download — Rollout Plan for the full table. Summary:

| Family | Adapter | Calculators |
|--------|---------|-------------|
| 1 — Retirement / Goal Progress | retirementAdapter (locked) | retirement-planning-calculator ✅ |
| 1 — Goal Progress | savingsGoalAdapter (locked) | savings-goal-calculator ✅ |
| 1 — Retirement / Withdrawal | withdrawalAdapter (locked, CA+US) | retirement-withdrawal-calculator ✅ |
| 1 — FIRE | fireAdapter (locked, CA+US) | fire-calculator ✅ |
| 1 — CA Registered | canadaRegisteredAdapter (locked, CA) | tfsa-calculator ✅ · rrsp-savings-calculator ✅ |
| 2 — Investment Growth | investmentGrowthAdapter (locked, CA+US) | compound-interest-calculator ✅ |
| 2 — Investment Growth | investmentFeesAdapter (locked, CA+US) | investment-fees-calculator ✅ |
| 2 — Investment Growth | roiAdapter (locked, CA+US) | roi-calculator ✅ |
| 3 — Mortgage | mortgageAdapter (locked, CA+US) | canadian-mortgage-calculator ✅ · us-mortgage-calculator ✅ |
| 3 — Mortgage Qualifier | mortgageQualifierAdapter (locked, CA+US) | mortgage-qualifier-calculator ✅ |
| 3 — Mortgage Refinance | mortgageRefinanceAdapter (locked, CA+US) | mortgage-refinance-calculator ✅ |
| 4 — Loan / Debt | loanAdapter (locked, CA+US) | personal-loan-calculator ✅ · car-loan-calculator ✅ |
| 4 — Debt Repayment | debtRepaymentAdapter (locked, CA+US) | debt-repayment-calculator ✅ |
| 5 — Tax / Income | taxIncomeAdapter (locked, CA+US) | salary-calculator ✅ |
| 5 — Income Tax | taxAdapter (locked, CA+US) | income-tax-calculator ✅ |
| 5 — Sales Tax | salesTaxAdapter (locked, CA+US) | sales-tax-calculator (no button — simple calc, no AI panel) |
| 6 — Cash Flow | emergencyFundAdapter (locked, CA+US) | emergency-fund-calculator ✅ |
| 7 — Net Worth | netWorthAdapter (locked, CA+US) | net-worth-calculator ✅ |
| 8 — Rent vs Buy | rentVsBuyAdapter (locked, CA+US) | rent-vs-buy-calculator ✅ |
| 8 — Lump Sum vs DCA | lumpSumVsDcaAdapter (locked, CA+US) | lump-sum-vs-dca-calculator ✅ |
| 9 — Eligibility | cmhcAdapter (locked, CA) | cmhc-mortgage-insurance-calculator ✅ |

### 12.5 Page layout rules

| Rule | Value |
|------|-------|
| Page size | US Letter (215.9 × 279.4mm) |
| Margins | 19mm horizontal, 18mm vertical |
| Inner width | 177.9mm |
| Footer Y | 267mm |
| Safe content zone | `P.safeY = 257mm` — nothing drawn below this |
| Safe page break | `ensureSpace(doc, data, y, needed)` — call before any block that may overflow |
| Page count | `doc.getNumberOfPages()` dynamic — never hardcode total pages |
| Footer | Drawn via `setPage(pg)` loop after all content pages are complete |

### 12.6 Report page counts

| Format | When to use | Examples |
|--------|-------------|---------|
| 1-page | Simple snapshot: ≤ 6 metrics, no time series, no key drivers needed | salary-calculator, sales-tax-calculator |
| 2-page | Standard: projections, composition visual, AI summary, methodology | most calculators |
| 3-page | Complex: multi-horizon tables, year-by-year simulation, age timelines | rent-vs-buy, fire-calculator, retirement-withdrawal |

### 12.7 Scope constraints (permanent)

- No Email Results — placeholder button only
- No backend PDF service — all client-side
- No custom font embedding — Helvetica for V1
- No full amortization schedule unless explicitly required for a specific calculator
- No html2canvas or screenshot capture
- No AI-generated text not derived from live calculator values
- PDF values must match the live calculator UI output exactly

### 12.8 Sample PDFs

Generated to `_docs/sample-pdfs/` via `npx tsx scripts/generateSamplePDFs.ts`. Current samples:

| File | Scenario |
|------|---------|
| `fincalc-smart-retirement-report-ca-2026-06-16.pdf` | Retirement · CA · Behind Target |
| `fincalc-smart-retirement-report-us-2026-06-16.pdf` | Retirement · US · On Track |
| `fincalc-smart-retirement-report-ca-2026-06-16-ontrack.pdf` | Retirement · CA · On Track (grammar + driver text verification) |
| `fincalc-smart-retirement-report-us-2026-06-16-behind.pdf` | Retirement · US · Behind Target (driver text regression) |
| `fincalc-smart-savings-goal-report-ca-2026-06-16.pdf` | Savings Goal · CA · Behind Target · vehicle |
| `fincalc-smart-savings-goal-report-us-2026-06-16.pdf` | Savings Goal · US · On Track · home down payment |
| `fincalc-smart-canadian-mortgage-report-2026-06-16.pdf` | Mortgage · CA · 20% down · CA$650K · Excellent (93) |
| `fincalc-smart-canadian-mortgage-report-2026-06-16-cmhc.pdf` | Mortgage · CA · 5% down · CA$520K · CMHC · Needs Attention (30) |
| `fincalc-smart-compound-interest-report-ca-2026-06-17.pdf` | Compound Interest · CA · $5K + $200/mo · 6% monthly · 20yr · Good (77) · Healthy |
| `fincalc-smart-compound-interest-report-us-2026-06-17.pdf` | Compound Interest · US · $10K + $500/mo · 4.5% annually · 10yr · Poor (34) · Caution |
| `fincalc-smart-us-mortgage-report-2026-06-16.pdf` | Mortgage · US · 20% down · $450K · no PMI · Excellent (93) |
| `fincalc-smart-us-mortgage-report-2026-06-16-pmi.pdf` | Mortgage · US · 10% down · $380K · PMI $142.50/mo (~yr 9) · Manageable (48) |
| `fincalc-smart-salary-report-2026-06-16-ca.pdf` | Salary · CA · $75K/Annual/Biweekly/25% → CA$56,250 take-home · Pay Clarity 75 (Low Deduction Load) |
| `fincalc-smart-salary-report-2026-06-16-us.pdf` | Salary · US · $95K/Annual/Semi-monthly/28% → $68,400 take-home · Pay Clarity 72 (Low Deduction Load) |

### 11.12 QA record — Retirement Savings Guide V1

> QA completed: 2026-06-16 · Result: **PASS** · `tsc --noEmit` clean · `next build` clean

**Route:** `/guides/how-much-to-retire` · Template: STRICT CLONE MODE from locked guides · Nominal balances only — inflation not modeled; disclosed in Section 01 prose.

| Check | Result |
|-------|--------|
| Runtime — no server errors, no console warnings, page loads | ✅ |
| TypeScript — `tsc --noEmit` clean | ✅ |
| Build — `next build` 0 errors, static route `/guides/how-much-to-retire` generated (35 pages total) | ✅ |
| Routes/links — breadcrumbs, primary CTA (`/retirement-planning-calculator`), secondary CTA (`/retirement-withdrawal-calculator`) | ✅ |
| Metadata/SEO — title "How Much Do You Need to Retire? — Retirement Savings Guide", description, Article JSON-LD, BreadcrumbList JSON-LD (3 items), datePublished 2026-06-16 | ✅ |
| Content integrity — sections 01–05, no NaN/undefined, AI-assisted wording, disclaimer, nominal-balance disclosure, CPP/OAS/Social Security/fees/taxes/volatility/withdrawals identified as outside the model | ✅ |
| Scenario math — CA$652,822 projected / CA$205,000 contributed / CA$447,822 growth / ~65.3% progress / CA$347,178 shortfall / ~CA$846/mo required / ~CA$346/mo additional — verified against live calculator | ✅ |
| Comparison math — retire at 68 ~CA$800,900 / CA$750/mo ~CA$903,950 / CA$50K start ~CA$803,387 / 4% return ~CA$430,000 — all "approximately" values accurate | ✅ |
| Responsive regression — 375px (1-col grids stacked, no overflow) / 768px (2-col grids same-row, mistakes 2-col, no overflow) / 1280px (2-col grids same-row 540px/540px, mistakes 3-col, no overflow) | ✅ |
| Accessibility — 26/26 SVGs aria-hidden, zero unnamed links/buttons, zero body H3s | ✅ |
