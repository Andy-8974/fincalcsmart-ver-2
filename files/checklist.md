# Phase 1 Checklist — Premium Dashboard Layout (Top Half)

## CalculatorLayout Refactor
- [ ] Replace current `InputGrid` (2-col equal split) with a full-width wrapper that accepts children directly
- [ ] Add `sidebarSlot` prop to `CalculatorLayout` so the sticky results panel can be injected from the page
- [ ] Change outer grid to `lg:grid-cols-12` asymmetric: left = `lg:col-span-8`, right = `lg:col-span-4`
- [ ] Right column: `sticky top-8 self-start` so results panel never scrolls away
- [ ] Ensure `CalculatorLayout` still renders `formulaSection`, `faqs`, and `children` below the top grid

## Input Card Styling (CanadaMortgageCalculator)
- [ ] Wrap all left-column inputs in a single white card: `border: 1.5px solid #E4E9EF`, `border-radius: 16px`, `padding: 28px`
- [ ] Inside card: "Mortgage Details" section (always visible)
- [ ] Inside card: "Advanced Monthly Costs" section hidden behind an accordion toggle (chevron icon)
- [ ] Inside card: "Affordability Analysis" checkbox remains as progressive disclosure inside Advanced section
- [ ] Remove old `InputGrid` component usage — inputs now live in the single card

## Sticky Results Panel (right column)
- [ ] Move `ResultsPanel` (dark navy gradient card) out of the results block below inputs — render it in the right column always (even before calculation, show a placeholder state)
- [ ] Results panel shows placeholder/empty state if `results === null`
- [ ] Payment breakdown donut + legend renders inside the sticky card below the payment figures (matches wireframe — donut is in right column, not a separate card below)
- [ ] Compare Scenarios table renders below donut inside the sticky right column card OR as a separate card that stays in the right rail
- [ ] "Download PDF Report" and "Email Results" buttons inside the sticky card

## Layout Wire-up in page.tsx / CalculatorLayout
- [ ] `CalculatorLayout` accepts optional `rightRail?: React.ReactNode` prop
- [ ] When `rightRail` is provided, the heading + lede render full-width above the grid, then split into `col-span-8` / `col-span-4`
- [ ] "How It Works" (`formulaSection`), FAQs, and Related links render below the grid full-width

## Verify
- [ ] On mobile (`< lg`): columns stack, results panel appears below inputs (no sticky)
- [ ] On desktop: inputs scroll, right panel stays fixed in viewport
- [ ] No TypeScript errors on the changed prop interfaces
- [ ] Existing `InsightPanel`, `Disclaimer`, amortization schedule remain intact below the grid
