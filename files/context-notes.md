# Context Notes — Phase 1 Dashboard Layout

## Decision Log

### 1. Grid Strategy: 12-col with col-span-8 / col-span-4
**Chosen:** `lg:grid-cols-12` with left=`col-span-8`, right=`col-span-4`
**Rejected:** `lg:grid-cols-[1fr_380px]` (arbitrary pixel right rail) — less flexible for responsive breakpoints
**Reason:** 12-col grid is the Tailwind idiom; 8/4 gives ~67/33 split which matches the wireframe's visual weight. The right panel at col-4 gives ~380–400px on typical 1280px viewports, enough room for the dark results card without crowding.

### 2. Sticky Behavior: `sticky top-8 self-start` on right column wrapper
**Chosen:** `sticky top-8 self-start` on a `<div>` wrapping the results card
**Why `self-start`:** Without `self-start`, a flex/grid child stretches to fill the row height and `sticky` has no effect because the element is already full-height. `self-start` collapses the height to content, allowing the browser to honour `sticky`.
**Trade-off:** If the right card content is taller than the viewport, it won't fully show — acceptable for Phase 1; pagination/scroll-snap can be added later.

### 3. ResultsPanel lifted into right rail
**Current state:** `ResultsPanel` is rendered conditionally inside `CanadaMortgageCalculator` after the `InputGrid`, sandwiched between inputs and charts.
**New state:** `CanadaMortgageCalculator` will expose a `resultsNode` via a render-prop or we will simply restructure so the calculator component accepts an `onResultsChange` callback and the parent (`page.tsx`) composes the layout. 
**Simpler chosen approach:** Keep all state inside `CanadaMortgageCalculator` but split the component's JSX so it returns `{ inputsJSX, resultsJSX }` — **not viable in React without a ref/context.**
**Final decision:** Add a `rightRail` prop to `CalculatorLayout`; `CanadaMortgageCalculator` is split into two sub-components or the calculator renders the full page layout itself (inputs + sticky rail in one component) since it already owns all state. `CalculatorLayout` becomes purely the chrome (heading, lede, formula, FAQs) and accepts `children` for the full calculator body that implements its own internal grid. This is the cleanest option — no prop-drilling, no context.

### 4. Advanced Monthly Costs — Accordion
**Chosen:** Simple controlled `<details>/<summary>` or a `useState` boolean toggle with a chevron SVG
**Rejected:** Headless UI Disclosure (adds dependency)
**Implementation:** `showAdvanced` boolean state, chevron rotates 180° when open. Default: `false` (closed) on first load, matching wireframe.

### 5. Donut chart moves to right rail
**Current:** DonutChart is in a separate `grid-cols-2` card below the results.
**New:** DonutChart renders inside the sticky right rail card, below the loan amount / total interest / total cost row. This matches the wireframe exactly.
**Impact:** The separate "Payment Breakdown" card is removed from the bottom section. "Compare Scenarios" card stays in the bottom section (below the sticky area, as it's less critical to keep visible).

### 6. Empty / placeholder state for results panel
**Chosen:** Show the dark navy card always in the right rail; when `results === null` show "--" dashes for all values. Prevents layout shift when user first lands.

### 7. CalculatorLayout prop change
- Add optional `rightRail?: React.ReactNode` — when present, render asymmetric grid; when absent, fall back to current full-width behaviour (backward compatible for other calculators).
- `InputGrid` export kept for backward compat but deprecated for this page.

## Files to change
1. `src/components/layout/CalculatorLayout.tsx` — add `rightRail` prop + asymmetric grid wrapper
2. `src/app/.../CanadaMortgageCalculator.tsx` — restructure to use new layout + accordion + donut in results panel
3. `src/app/.../page.tsx` — no changes needed (layout composition is internal to CanadaMortgageCalculator)

## What we are NOT changing in Phase 1
- Math (`_mortgage-shared/math.ts`) — untouched
- `InsightPanel` — untouched, stays below the grid
- Amortization schedule card — untouched
- `Disclaimer` — untouched
- FAQ section — untouched
- `formulaSection` — untouched
