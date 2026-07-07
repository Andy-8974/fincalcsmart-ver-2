# Homepage V2 — Implementation Summary

**Date completed:** 2026-05-19
**Status:** Foundation complete · Build passing · Static generation confirmed

---

## 1. Files Changed

| File | Type of change |
|---|---|
| `app/page.tsx` | Removed `force-dynamic`/`revalidate` exports; trust bar mobile hide; section `py` mobile overrides; motion-safe hover classes; guide card arrow classes |
| `components/layout/SiteHeader.tsx` | Nav route fix (`/mortgage-calculator` → `/canadian-mortgage-calculator`); keyboard dropdown handlers; `data-dropdown` attribute; mobile search `aria-label`; hamburger tap target; logo color split |
| `components/layout/SiteFooter.tsx` | Disclaimer row added; category heading contrast lifted; link contrast lifted; footer grid gap mobile; logo color split |
| `components/home/HeroPreview.tsx` | Panel padding mobile override (`p-4 min-[420px]:p-6`); score strip padding mobile |
| `components/home/InsightsShowcase.tsx` | KPI outcome cards redesigned; `Est. interest saved` label; divider padding; `note?` field on `Outcome` type; scenario context notes for all 4 week groups; section `py` mobile override; inner grid gap mobile |
| `components/home/AnalyticsSection.tsx` | Donut navy recolor; bars navy palette; breakdown bars in container; Decide card 3-column grid; house illustration removed; KPI summary boxes; section `py` mobile override; header `mb` mobile override |
| `components/home/CalcCard.tsx` | `motion-reduce:transition-none motion-reduce:!transform-none` on card and arrow |
| `components/ui/RegionToggle.tsx` | `Flag` type widened to `React.ComponentType<{ width?: number; height?: number }>` (pre-existing build error, unblocked by removing `force-dynamic`) |

---

## 2. Final Homepage Section Structure

```
1. HERO                  — Headline · HeroSearch chips · HeroPreview card
2. TRUST BAR             — 4 feature pills (3 on mobile)
3. CALCULATOR DISCOVERY  — 4 CalcCards (2×2 mobile, 4×1 desktop)
4. AI INSIGHTS           — InsightsShowcase: rotating weekly mockup + 3 typed insight items
5. VISUAL ANALYTICS      — AnalyticsSection: Calculate · Analyze · Decide
6. WHY FINCALC SMART     — 2 large feature cards + 4 small cards (dark navy)
7. GUIDES                — 3 guide cards with SVG thumbnails
8. FINAL CTA             — Glow + badge + 2 buttons
9. FOOTER                — Brand col · 4 link cols · disclaimer · bottom bar
```

---

## 3. Desktop Status

- All 8 sections render at full design intent
- Navigation: floating pill with 4 dropdown categories, desktop search, region toggle
- Dropdowns: mouse hover + full keyboard support (Enter/Space/ArrowDown/Escape)
- Hero: 2-column grid with animated HeroPreview on right
- InsightsShowcase: 5fr/6fr split, mockup left, insights right
- AnalyticsSection: 2-column top row (Calculate | Analyze), full-width Decide card below
- Why section: 2 large cards + 4-column small card row
- Guides: 3-column grid with SVG thumbnails
- Footer: 5-column grid (brand + 4 link categories)

---

## 4. Mobile Status

- Hero stacks to single column; HeroPreview panels use reduced padding (`p-4`) below 420px
- Trust bar: 3 items visible on mobile (USA & Canada · AI Insights · Visual Breakdowns); "Mobile-friendly" hidden below 640px
- Calculator Discovery: 2×2 grid maintained on mobile
- InsightsShowcase: full-width mockup card + insights stacked below
- AnalyticsSection: Calculate → Analyze → Decide stacks cleanly in single column
- Why section: 2 large cards stack, 2×2 small card grid
- Guides: single column
- CTA: buttons stack vertically
- Footer: single column, gap-8 between sections
- Section vertical rhythm: all `py-24`/`py-20` desktop values have mobile overrides (`py-16`/`py-14`)
- Hamburger tap target: raised from ~34px to ~42px

---

## 5. QA Fixes Completed

### QA Pass 1 — Critical routing & accessibility
- Nav route `/mortgage-calculator` → `/canadian-mortgage-calculator` corrected
- Keyboard navigation for desktop dropdown triggers (Enter/Space/ArrowDown/Escape)
- Mobile search `aria-label="Search calculators"` added

### QA Pass 2 — Performance, contrast, motion, scenarios
- `force-dynamic` + `revalidate` exports removed; homepage is now fully static
- Footer category heading contrast: `rgba(255,255,255,0.48)` → `rgba(255,255,255,0.60)`
- Footer link text contrast: `text-white/65` → `text-white/80`
- Reduced-motion hover transitions: CSS-only via `motion-safe:` / `motion-reduce:` Tailwind variants — server component stays server component
- Scenario context labels added to all InsightsShowcase outcome cards across all 4 week groups

### QA Pass 3 — Mobile polish
- HeroPreview panel and score strip padding reduced at < 420px breakpoint
- Trust bar mobile crowding resolved (3 items shown, 4th hidden below sm)
- Section vertical rhythm: mobile `py` overrides applied across all major sections
- Hamburger button tap target enlarged
- Footer grid gap tightened on mobile

### Build error unblocked
- `RegionToggle.tsx` pre-existing TypeScript type error fixed (`Flag: () => JSX.Element` → `React.ComponentType<{width?:number;height?:number}>`)

---

## 6. Build Status

```
✓ Compiled successfully
✓ No TypeScript errors
✓ No lint errors
✓ 8/8 static pages generated

Route                              Size      First Load JS
○ /                                7.81 kB   111 kB         ← Static (was SSR)
○ /calculators                     172 B     104 kB
○ /canadian-mortgage-calculator    9.17 kB   117 kB
○ /mortgage-qualifier-calculator   8.36 kB   116 kB
○ /us-mortgage-calculator          7.45 kB   114 kB
```

All routes `○ (Static)`. Homepage previously server-rendered on every request; now prerendered at build time.

---

## 7. Logo Color Rule Applied

**Rule:** `FinCalc` = background-matched base color · `Smart.` = brand teal (`#1DB584`)

| Location | Background | FinCalc | Smart. |
|---|---|---|---|
| Floating pill header | Light/white | Brand navy (inherited from `text-brand-navy`) | Teal |
| Footer brand column | Dark navy `#060F1A` | White (inherited from `text-white`) | Teal |

PRO badge unchanged in both locations.

`HeroPreview.tsx` mock browser chrome label ("FinCalc Smart" in muted gray) intentionally excluded — it is a decorative UI element, not the brand wordmark.

---

## 8. Remaining Follow-Up Items

> These are known and tracked. Do not address without explicit approval.

| Item | Notes |
|---|---|
| **Calculator Search Suggestions** | Typeahead for 2+ char input; needed consistently on desktop nav, mobile nav, hero search, and `/calculators` directory. Tagged as future feature. |
| **Mobile drawer redesign** | Current dark navy drawer predates the light floating nav direction. Needs dedicated design pass. |
| **Mobile drawer keyboard/focus** | Accordion items and links inside the drawer have no keyboard/focus flow audit. |
| **Footer contrast — disclaimer row** | `rgba(255,255,255,0.30)` is intentionally subtle but very low (~1.6:1). Left unchanged by design. |
| **Footer accordion on mobile** | 5 stacked link sections are long on small screens. Accordion pattern explicitly deferred. |
| **Privacy and Terms pages** | `/privacy` and `/terms` linked in footer bottom bar; no pages exist yet. |
| **Guide article pages** | All 3 guide cards link to `/calculators` as placeholder. Need real guide pages. |
| **Footer legal link typo** | `href="\privacy"` uses a backslash — should be `href="/privacy"`. Fix when privacy page is built. |
| **Section contrast — muted labels** | Some decorative labels (e.g. tagline at `rgba(255,255,255,0.48)`) remain below WCAG AA — intentional design choices, not bugs. |

---

## 9. Protected Files

> Do not modify without explicit user instruction.

### Always protected (per `CLAUDE.md`)
- `components/layout/SiteHeader.tsx`
- `components/layout/SiteFooter.tsx`
- `components/layout/CalculatorLayout.tsx`
- `lib/region/context.tsx`
- `tailwind.config.ts`
- `app/layout.tsx`

### Finalized this session — treat as stable
- `components/home/InsightsShowcase.tsx` — mockup structure, outcome card design, 4-week rotating data
- `components/home/AnalyticsSection.tsx` — Calculate/Analyze/Decide layout, chart constants, bar data
- `components/home/HeroPreview.tsx` — score arc, breakdown structure, smart insight card
- `components/home/CalcCard.tsx` — hover behavior, motion-reduce pattern
- `app/page.tsx` — section order, thumbnail SVGs, trust items, Why section card structure, CTA

### Math and calculator logic — always protected
- `app/_mortgage-shared/math.ts`
- All `*Calculator.tsx` client components
