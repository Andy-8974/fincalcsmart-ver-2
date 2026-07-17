# FinCalcSmart — Agent Operating Manual

> **Auto-loaded by Claude Code on every session.** All agents must read and comply with every rule here before touching any file.

> **Before any product, IA, UX, SEO, or architecture decision where the right path isn't obvious, read `_docs/PROJECT_VISION.md` first.** It defines the long-term vision and philosophy of FinCalc Smart and changes rarely — CLAUDE.md governs *how* to implement, PROJECT_VISION.md governs *why* and *toward what end*.

---

## 1. Project Identity

| Key | Value |
|-----|-------|
| Product | FinCalcSmart Pro — financial calculators for USA & Canada |
| Stack | Next.js 15 (App Router) · TypeScript · Tailwind CSS 3 · lucide-react |
| Primary goal | Maximum Core Web Vitals score on every calculator page |
| Design system | Dark-navy / teal brand — full spec in `_docs/BRAND_GUIDELINES.md` |

---

## 2. Non-Negotiable Rules (read before every task)

### 2.1 Never touch these files without explicit user instruction
- `components/layout/SiteHeader.tsx` — finalized master header
- `components/layout/SiteFooter.tsx` — finalized master footer
- `components/layout/CalculatorLayout.tsx` — master page wrapper
- `lib/region/context.tsx` — global region state (USA/Canada)
- `tailwind.config.ts` — brand token source of truth
- `app/layout.tsx` — root HTML shell

### 2.2 Calculator page structure — always follow this pattern
Every calculator lives at:
```
app/[slug]/
  page.tsx          ← Server component: metadata + CalculatorLayout wrapper
  [Name]Calculator.tsx  ← 'use client' component: all interactive logic
```

### 2.3 No new dependencies without approval
- No component libraries (MUI, Chakra, shadcn, etc.)
- No charting libraries (Chart.js, Recharts, etc.) — use the existing `DonutChart` in `app/_mortgage-shared/ui.tsx` as a pattern for inline SVG charts
- No date libraries — use native `Intl` APIs
- lucide-react is the only approved icon library

### 2.4 Math logic is sacred
- Never refactor or "simplify" financial calculation functions in `app/_mortgage-shared/math.ts` or inside any calculator component without the user confirming the formula is correct first
- All monetary outputs must use `fmtCAD` / `fmtCADx` (or the US equivalents) — never raw `toFixed(2)`

---

## 3. Key File Map

```
app/
  _mortgage-shared/         ← Shared mortgage math + UI primitives
    math.ts                 ← All mortgage formulas (CA semi-annual compounding)
    ui.tsx                  ← NumericInput, Tooltip, DonutChart
    InsightPanel.tsx        ← Expert Analysis panel logic
  canadian-mortgage-calculator/
    page.tsx                ← SEO metadata + CalculatorLayout
    CanadaMortgageCalculator.tsx  ← Master template (fully finalized)
  us-mortgage-calculator/
    page.tsx
    USAMortgageCalculator.tsx
  calculators/page.tsx      ← /calculators directory listing
  layout.tsx                ← Root layout (font, RegionProvider, Header, Footer)
  page.tsx                  ← Homepage (needs full redesign — placeholder only)

components/layout/
  SiteHeader.tsx            ← Sticky nav with dropdowns + search (client)
  SiteFooter.tsx            ← Dark footer with social icons (client)
  CalculatorLayout.tsx      ← Per-calculator page wrapper (server)
  CalculatorFaqAccordion.tsx ← FAQ expand/collapse (client)

components/ui/
  AdSlot.tsx                ← IAB ad placeholders (CLS = 0)
  RegionToggle.tsx          ← USA/Canada flag toggle

lib/region/context.tsx      ← RegionContext + useRegion() hook
_docs/                      ← Agent documentation (do not delete)
```

---

## 4. Regional System (USA vs Canada)

The region state is global, persisted to `localStorage` under key `fcs-region`.

```tsx
// Reading region in any client component:
import { useRegion } from '@/lib/region/context';
const { region, setRegion } = useRegion();
// region === 'us' | 'ca'
```

**Pattern for dual-region calculators:**
```tsx
const isCA = region === 'ca';
const rate  = isCA ? monthlyRateCA(annualRate) : annualRate / 12;
const label = isCA ? 'CAD' : 'USD';
```

Full rules in `_docs/AGENT_MANUAL.md §3`.

---

## 5. Quick References

- Long-term vision & philosophy (core doc) → `_docs/PROJECT_VISION.md`
- Brand colors → `_docs/BRAND_GUIDELINES.md`
- Full agent manual → `_docs/AGENT_MANUAL.md`
- Pre-launch checklist → `_docs/AGENT_READINESS_CHECKLIST.md`
- Target folder structure → `_docs/FOLDER_STRUCTURE.md`
