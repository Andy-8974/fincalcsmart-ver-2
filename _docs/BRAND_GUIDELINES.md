# Task 3 — Brand & UI Design Guidelines

> Source of truth for all visual decisions. When in doubt, check `tailwind.config.ts` for the token values.

---

## §1. Color Palette

### Primary Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `brand-teal` | `#1DB584` | CTAs, focus rings, active states, logo dot, teal highlights |
| `brand-teal-dark` | `#18a073` | Hover state for teal buttons/links |
| `brand-teal-pale` | `#E6F7F1` | Teal callout backgrounds, success tints |

### Navy Scale (Dark Backgrounds)

| Token | Hex | Usage |
|-------|-----|-------|
| `brand-navy-deep` | `#060F1A` | Footer background (darkest surface) |
| `brand-navy-mid` | `#0A1628` | Navigation bar, modal overlays |
| `brand-navy` | `#0D1B2A` | Hero strips, primary dark sections |
| `brand-navy-light` | `#0D2137` | Results panels, AI analysis backgrounds |

### Neutral / Gray Scale

| Token | Hex | Usage |
|-------|-----|-------|
| `brand-gray-50` | `#F8FAFB` | Page body background |
| `brand-gray-100` | `#F1F4F7` | Dividers, table stripes, subtle fills |
| `brand-gray-200` | `#E4E9EF` | Card borders, input borders |
| `brand-gray-400` | `#9BA8B5` | Placeholder text, meta labels |
| `brand-gray-600` | `#6B7A8D` | Body secondary text, form labels |

### Semantic / Alert Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Amber | `#C9A84C` | CMHC warnings, calculator icons, data highlights |
| Amber pale | `#FEF9EC` | Amber callout backgrounds |
| Red | `#EF4444` (`red-500`) | Rate shock alerts, overLimit ratios, total interest |
| Blue | `#3B82F6` (`blue-500`) | Loan-related insights (amortization compression) |
| Purple | `#8B5CF6` (`violet-500`) | Tax & salary category accent |
| Emerald | `#10B981` (`emerald-500`) | Positive thresholds, "not applicable" confirmations |

### On-Dark Text Opacity Scale

| Use | Value |
|-----|-------|
| Primary text on dark | `rgba(255,255,255,0.9)` |
| Secondary text on dark | `rgba(255,255,255,0.65)` |
| Muted/label text on dark | `rgba(255,255,255,0.4)` |
| Disabled / placeholder on dark | `rgba(255,255,255,0.25)` |

---

## §2. Typography

**Font family:** Plus Jakarta Sans (loaded via `next/font/google`, variable `--font-jakarta`)  
**Fallback:** system-ui, sans-serif

### Heading Scale

| Level | Size | Weight | Letter-spacing | Usage |
|-------|------|--------|----------------|-------|
| H1 (hero) | 36px / `text-4xl` | 800 | `-0.5px` | Calculator page title |
| H2 (section) | 24px / `text-2xl` | 700 | `-0.3px` | "How It Works", FAQ, Scenarios |
| H3 (card) | 16px / `text-base` | 700 | `0` | Card titles, sidebar headings |
| H4 (sub-label) | 13px | 700 | `+0.08em uppercase` | Category labels, ratio labels |

### Body Scale

| Level | Size | Weight | Color | Usage |
|-------|------|--------|-------|-------|
| Body | 15px | 400 | `#374151` | Formula explanations, scenario text |
| Body sm | 14px | 400 | `#6B7A8D` | FAQ answers, secondary descriptions |
| Caption | 12px | 400 | `#9BA8B5` | Sub-labels, footnotes, helper text |
| Micro | 11px | 600 | varies | Uppercase tracking labels, legal copy |

### Number Display (results)

| Use | Size | Weight | Color |
|-----|------|--------|-------|
| Primary result | 40px | 800 | `#1DB584` |
| Secondary result | 28px | 700 | `#0D1B2A` |
| Breakdown item | 14px | 500 | `#ffffff` (on dark) |

---

## §3. Component Standards

### 3.1 Calculator Cards

**V2 (use this on all V2 calculator pages):**
```
background: #ffffff
border: 1px solid rgba(15,41,66,0.09)
border-radius: 20px
```
Copy the `cardStyle` const from `app/canadian-mortgage-calculator/CanadaMortgageCalculator.tsx` — it is the canonical source.

**V1 (legacy — do not use on V2 pages):**
```
border: 1.5px solid #E4E9EF
border-radius: 16px
```

Dark results card:
```
background: linear-gradient(150deg, #0D2137 0%, #0A1628 55%, #0D1B2A 100%)
border: 1px solid rgba(29,181,132,0.15)
border-radius: 16px
```

### 3.2 Input Fields

```
background: #F8FAFB          (brand-gray-50)
border: 1.5px solid #E4E9EF  (brand-gray-200)
border-radius: 8px            (brand-sm)
padding: 10px 12px
font-size: 14px
color: #0D1B2A

focus:
  border-color: #1DB584
  box-shadow: 0 0 0 2px rgba(29,181,132,0.15)
  outline: none

placeholder:
  color: #9BA8B5
```

**Tailwind class string** (available as `inputCls` from CalculatorLayout):
```
w-full rounded-brand-sm border-[1.5px] border-brand-gray-200 text-brand-navy bg-brand-gray-50
px-3 py-2.5 text-sm transition-colors duration-150
focus:outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/[0.15]
```

### 3.3 Buttons

**Primary CTA (green, light surfaces):**
```
background: #1DB584
color: #ffffff
border-radius: 8px
padding: 9px 16px
font-size: 13.5px / font-weight: 700
hover: background #18a073
transition: background 150ms
```

**Primary CTA (dark, on-navy surfaces):**
```
background: #060F1A
color: #ffffff
border: 1px solid rgba(29,181,132,0.3)
border-radius: 8px
padding: 10px 12px
font-size: 13px / font-weight: 700
animation: teal-glow-pulse 2.8s ease-in-out infinite
hover: translateY(-2px), intensify glow
```

**Outline / Secondary:**
```
background: rgba(255,255,255,0.07)
border: 1.5px solid rgba(255,255,255,0.3)
color: rgba(255,255,255,0.8)
border-radius: 8px
padding: 8px 14px
font-size: 13px / font-weight: 700
```

**Pill toggle (Monthly/Yearly):**
```
container: border 1.5px solid #E4E9EF, background #F8FAFB, border-radius 999px
active: background #1DB584, color #ffffff
inactive: color #6B7A8D, background transparent
```

### 3.4 Form Labels

```
font-size: 12px
font-weight: 600
color: #6B7A8D
display: flex, align-items: center, gap: 4px
margin-bottom: 6px
```

### 3.5 Section Headers (inside insight/analysis panels)

Dark category label:
```
font-size: 11px / font-weight: 700
text-transform: uppercase / letter-spacing: 0.12em
color: rgba(255,255,255,0.3)
```

### 3.6 Insight Cards (Expert Analysis panel)

**Red (Rate Shock):**
```
border: 1px solid #FECACA, border-left: 4px solid #EF4444
background: #FEF2F2
header color: #EF4444
```

**Blue (Amortization Compression):**
```
border: 1px solid #BFDBFE, border-left: 4px solid #60A5FA
background: #EFF6FF
header color: #3B82F6
```

**Green (Insurance Threshold / positive):**
```
border: 1px solid #A7F3D0, border-left: 4px solid #10B981
background: #ECFDF5
header color: #059669
```

**Amber (CMHC required / warning):**
```
border: 1px solid #FDE68A, border-left: 4px solid #F59E0B
background: #FFFBEB
header color: #D97706
```

### 3.7 Charts / Donut

- Inline SVG only — no canvas, no Recharts
- Donut hole: 60% of outer radius
- Stroke-width: variable (proportional to value)
- Center label: 12px / `#6B7A8D` | center value: 16px bold / `#0D1B2A`
- Color sequence: teal → amber → violet → sky → rose

### 3.8 Border Radius Scale

| Token | Value | Use |
|-------|-------|-----|
| `brand-xs` | 4px | Badges, chips |
| `brand-sm` | 8px | Inputs, small buttons |
| `brand-md` | 10px | Toggle buttons |
| `brand-lg` | 12px | Result items, insight cards |
| `brand-xl` | 16px | Calculator cards, content panels |
| `rounded-2xl` | 16px (Tailwind) | Expert Analysis panel |

### 3.9 Box Shadows

```
Card: 0 1px 3px rgba(13,27,42,0.06), 0 1px 2px rgba(13,27,42,0.04)
Dropdown: 0 20px 48px rgba(0,0,0,0.55)
Results (dark card): none — border glow preferred
```

---

## §4. Layout Grid System

| Context | Grid | Gap |
|---------|------|-----|
| Calculator main + sidebar | `grid-cols-1 lg:grid-cols-12` (9+3) | `gap-4` |
| Input card + results card | `lg:grid-cols-12` (7+5) | `gap-4` |
| Payment Breakdown + Scenarios | `grid-cols-1 lg:grid-cols-2` | `gap-4` |
| Footer link columns | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5` | `gap-10` |
| Max content width | `max-w-6xl mx-auto` | Calculator pages (see `DESIGN_SYSTEM_V2.md §2`) |
| Page horizontal padding | `px-4` | Calculator pages |

---

## §5. Brand Don'ts

- ❌ Do not use any blue (`sky-*`, `blue-*`) as a primary action color — that's teal/`#1DB584` only
- ❌ Do not use `rounded-full` on calculator cards — only on badges and pill toggles
- ❌ Do not use `font-size` below 11px anywhere visible
- ❌ Do not use `opacity-50` to disable buttons — use explicit `cursor-not-allowed` + reduced visual weight
- ❌ Do not use `text-gray-*` — always use `text-brand-gray-*` or explicit `#6B7A8D` / `#9BA8B5`
- ❌ Do not add drop shadows to text
- ❌ Do not use gradients on light-background cards — gradients only on dark navy surfaces
