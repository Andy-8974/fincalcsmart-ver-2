# FinCalc Smart V2 Design System Rules

> Source of truth for all V2 visual decisions. Supplements `BRAND_GUIDELINES.md` — check both.

---

## 1. Visual Reference

**Homepage** (`app/page.tsx`) is the approved V2 visual reference for marketing sections.  
**Canadian Mortgage Calculator V2** (`app/canadian-mortgage-calculator/`) is the approved reference for mortgage-style calculator pages.  
**US Mortgage Calculator V2** (`app/us-mortgage-calculator/`) mirrors the Canadian template exactly.  
**Mortgage Qualifier Calculator V2** (`app/mortgage-qualifier-calculator/`) is the approved reference for dual-region qualifier-style calculators where AI Analysis is the primary product section.

All four pages above form the official FinCalc Smart V2 foundation. New calculators are built from the V2 template — not migrated from old pages.

Do not deviate from these without explicit user approval.

---

## 2. Page Shell

### Body width
All content is constrained to `max-w-6xl mx-auto`. Do not use `max-w-7xl` on calculator pages.

### Horizontal padding
```
px-4
```

### Background gradient (calculator pages)
Every calculator page uses the same ambient gradient shell — copy this exactly:
```tsx
background: [
  'radial-gradient(ellipse 520px 420px at top left, rgba(29,181,132,0.10) 0%, transparent 100%)',
  'radial-gradient(ellipse 500px 400px at top right, rgba(147,197,253,0.14) 0%, transparent 100%)',
  'radial-gradient(ellipse 420px 360px at 80% 560px, rgba(196,181,253,0.07) 0%, transparent 100%)',
  'linear-gradient(180deg, #f3faf8 0px, #f5f8fd 380px, #f8fafb 740px, #F8FAFB 1080px)',
].join(', ')
```
The gradient covers the banner + calculator workspace. Blocks C–G (How It Works, FAQ, etc.) sit on flat `#F8FAFB`.

### Page top offset
```tsx
style={{ marginTop: '-80px', paddingTop: '80px' }}
```
This creates the seamless header overlap without a white gap.

---

## 3. Color System

Primary brand: `#1DB584` (teal) — CTAs, active states, highlights, border-left accents.  
Dark surface: `#0D1B2A` (navy) — AI Analysis header, results panels.  
Body background: `#F8FAFB`.  
Card border: `#E4E9EF` (1.5px solid).  
Card radius: 16px.

See `BRAND_GUIDELINES.md §1` for the full token table and `tailwind.config.ts` for Tailwind tokens.

---

## 4. Cards

### Light card (default)
```
background: #ffffff
border: 1px solid rgba(15,41,66,0.09)
border-radius: 20px
```
This is the `cardStyle` const used in all locked V2 calculators. The BRAND_GUIDELINES.md §3.1 values (1.5px/#E4E9EF/16px) are V1 — do not use them on V2 calculator pages.

### Dark results card
```
background: linear-gradient(150deg, #0D2137 0%, #0A1628 55%, #0D1B2A 100%)
border: 1px solid rgba(29,181,132,0.15)
border-radius: 16px
```

### AI Analysis panel header
```
background: linear-gradient(135deg, #0D1B2A 0%, #0f2744 100%)
```

---

## 5. Buttons & Icons

- **Icons:** lucide-react only. Named imports only (`import { Calendar } from 'lucide-react'`). No other icon libraries.
- **Icon size in headings:** `w-5 h-5 shrink-0` with `color: #1DB584`.
- **Primary CTA:** `#1DB584` background, white text, 8px radius.
- **Download/Email buttons (dark surface):** `rgba(255,255,255,0.08)` bg, `rgba(255,255,255,0.3)` border.
- **Toggle pills (Monthly/Yearly):** pill container with `#E4E9EF` border; active pill `#1DB584`.

---

## 6. Typography in Calculator Sections

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Page H1 | `clamp(1.5rem, 4vw, 2.25rem)` | 800 | `#0D1B2A` |
| Section H2 | 24px / `text-2xl` | 700 | `#0D1B2A` |
| How It Works H3 | 14px / `text-sm` | 700 | `#0D1B2A`, teal border-left |
| Card sub-label | 11px, uppercase, 0.1em tracking | 700 | `rgba(255,255,255,0.4)` on dark |
| FAQ question | 15px | 700 | `#0D1B2A` |
| FAQ answer | 14px | 400 | `#6B7A8D` |
| Body text (How It Works) | 14px / `text-sm` | 400 | `#475569` |

---

## 7. How It Works Subsection Headings

Every H3 in the How It Works section:
```tsx
<h3
  className="text-sm font-bold text-slate-800 mb-3 border-l-2 pl-3"
  style={{ borderColor: '#1DB584' }}
>
```

---

## 8. Mobile & Tablet Rules

### Breakpoints
- Mobile: < 768px
- Tablet: 768px–1023px
- Desktop: ≥ 1024px

### Responsive visibility approach
Use CSS class + `<style>` JSX block — **not** Tailwind's `hidden md:flex` for complex show/hide logic.
This avoids Tailwind purge issues in dev vs production. Pattern used in both locked calculators:
```tsx
<style>{`
  .my-mobile-el  { display: flex; }
  .my-desktop-el { display: none; }
  @media (min-width: 768px) {
    .my-mobile-el  { display: none !important; }
    .my-desktop-el { display: flex !important; }
  }
`}</style>
```

### SVG sizing on mobile
- Set HTML `width` and `height` attributes for mobile (prevents SVG from expanding in flex containers).
- Override with CSS `!important` at desktop breakpoint for larger sizes.
- `style={{ display: 'block' }}` on all SVGs to prevent inline gap.

### Homepage mobile hero priority
Mobile hero must be **product-first, not text-first**. Required order on mobile:
1. Compact headline (forced 2-line break; `whitespace-nowrap` on "AI-Assisted Insights.")
2. HeroPreview card (product preview — always above search on mobile)
3. Search bar + "Browse all calculators" link

Do not add chips or secondary CTAs under the mobile search bar. Do not lead with long text blocks on mobile. Desktop layout remains 2-column with chips visible — this rule applies to mobile only. Calculator pages are not affected.

### Mobile navigation drawer (V2)
The mobile drawer (`components/layout/SiteHeader.tsx`) is white/frosted-glass — **not dark navy**. Key rules:
- Background: `rgba(255,255,255,0.97)` + `backdropFilter: blur(20px)`
- Top border: `1px solid rgba(13,27,42,0.07)`
- Structure (flex column, fixed `top-[70px]` to `bottom-0`): scrollable content area + pinned CTA strip
- Region toggle: full-width pill at top of drawer, dark navy active state (matches desktop)
- Category list: **flat, no accordion** — all 4 categories and links always visible
- Category labels: `10px uppercase tracking-widest`, color `#1DB584`
- Link rows: icon badge (32×32px) + label, `py-2` padding, `hover:bg-brand-teal/[0.06]`
- "Browse All Calculators →" CTA: `shrink-0` strip pinned to bottom, teal background, always visible
- Body scroll lock: `useEffect` toggling `document.body.style.overflow` on `mobileOpen`
- Desktop nav: completely separate, never affected by mobile drawer changes

### Tablet smart opt row
At 768–1023px, the 3-card AI Analysis row wraps: Health Score full-width top, the two smart cards below side-by-side.
```css
@media (min-width: 768px) and (max-width: 1023px) {
  .smart-opt-row { flex-wrap: wrap; }
  .smart-opt-row > *:first-child { flex: 0 0 100%; }
  .smart-opt-row > *:not(:first-child) { flex: 1 1 0; }
}
```

---

## 9. Vertical Gap Before AI Analysis

On mortgage calculator pages (CA + US), the gap between the Visuals Row and the AI Analysis section is **32px on desktop**, matching the Mortgage Qualifier's `gap-y-8` reference.

Implementation:
- Visuals Row outer wrapper: `pb-0` (no bottom padding)
- Lower sections wrapper: `pt-6 md:pt-8` (24px mobile / 32px desktop)

Do not add extra `pb-*` to the Visuals Row wrapper — it pushes the AI Analysis section too far down.

---

## 10. YMYL / Trust / Disclaimer

Every calculator page must end with a footer disclaimer. Use the shared `Disclaimer` component from `app/_mortgage-shared/ui.tsx`:
```tsx
import { Disclaimer } from '@/app/_mortgage-shared/ui';
<Disclaimer />
```
Output: neutral centered `<p>` — `text-xs text-slate-400 text-center mt-4 pb-12 px-4 leading-relaxed max-w-4xl mx-auto`. Full legal-style wording covering estimates, lender terms, credit profile, and professional advice.

This is non-negotiable for YMYL compliance and Google E-E-A-T signals.

### AI Analysis inner disclaimer (secondary)

Inside every AI Analysis card body, add a footer disclaimer strip as a **sibling div after the body** (not inside it):
```tsx
{/* ── Footer Disclaimer — outside body div, sibling ── */}
<div className="flex items-start gap-2.5 px-5 md:px-6 py-4"
  style={{ borderTop: '1px solid rgba(15,41,66,0.07)', background: '#f8fafb' }}>
  <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" aria-hidden="true" />
  <p className="text-slate-400 text-xs leading-relaxed">
    <strong className="text-slate-500 font-semibold">Disclaimer:</strong> This analysis is for
    illustrative purposes only and does not constitute financial, tax, or mortgage advice.
    Individual results will vary based on lender terms, credit profile, and market conditions.
    Consult a licensed mortgage professional before making financial decisions.
  </p>
</div>
```
The body's bottom padding (`p-4 md:p-5`) provides natural spacing between the last content block and this strip. Do **not** place it inside the body div with negative margins.
