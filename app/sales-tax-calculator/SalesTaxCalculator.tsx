'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { useRegion } from '@/lib/region/context';
import { NumericInput, Tooltip, DonutChart, type PieSlice } from '../_mortgage-shared/ui';
import { fmtCAD, fmtCADx, fmtUSD, fmtUSDx } from '../_mortgage-shared/math';
import MobileCalcCTA from '@/components/ui/MobileCalcCTA';
import CalculatorFaqAccordion from '@/components/layout/CalculatorFaqAccordion';
import {
  AlertTriangle, BookOpen, HelpCircle, Info,
  Receipt, ShieldAlert, Sparkles, TrendingDown, TrendingUp,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type CalcMode = 'add' | 'remove';

interface FormState {
  amount: string;
  manualRate: string;
}

interface TaxResults {
  preTax: number;
  taxAmount: number;
  total: number;
  taxShare: number;      // tax ÷ total (%)
  statutoryRate: number; // rate as entered (%)
}

// ─── Canada province preset rates ─────────────────────────────────────────────

interface TaxComponent {
  label: string; // 'GST' | 'HST' | 'PST' | 'QST'
  rate: number;  // as percent
}

interface ProvincePreset {
  code: string;
  label: string;
  rate: number;
  note: string;
  components: TaxComponent[];
}

const CA_PRESETS: ProvincePreset[] = [
  { code: 'AB', label: 'Alberta (AB)',                  rate: 5,      note: 'GST only',           components: [{ label: 'GST', rate: 5 }] },
  { code: 'BC', label: 'British Columbia (BC)',         rate: 12,     note: 'GST 5% + PST 7%',    components: [{ label: 'GST', rate: 5 }, { label: 'PST', rate: 7 }] },
  { code: 'MB', label: 'Manitoba (MB)',                 rate: 12,     note: 'GST 5% + PST 7%',    components: [{ label: 'GST', rate: 5 }, { label: 'PST', rate: 7 }] },
  { code: 'NB', label: 'New Brunswick (NB)',            rate: 15,     note: 'HST',                 components: [{ label: 'HST', rate: 15 }] },
  { code: 'NL', label: 'Newfoundland & Labrador (NL)', rate: 15,     note: 'HST',                 components: [{ label: 'HST', rate: 15 }] },
  { code: 'NT', label: 'Northwest Territories (NT)',    rate: 5,      note: 'GST only',            components: [{ label: 'GST', rate: 5 }] },
  { code: 'NS', label: 'Nova Scotia (NS)',              rate: 14,     note: 'HST',                 components: [{ label: 'HST', rate: 14 }] },
  { code: 'NU', label: 'Nunavut (NU)',                  rate: 5,      note: 'GST only',            components: [{ label: 'GST', rate: 5 }] },
  { code: 'ON', label: 'Ontario (ON)',                  rate: 13,     note: 'HST',                 components: [{ label: 'HST', rate: 13 }] },
  { code: 'PE', label: 'Prince Edward Island (PE)',     rate: 15,     note: 'HST',                 components: [{ label: 'HST', rate: 15 }] },
  { code: 'QC', label: 'Québec (QC)',                   rate: 14.975, note: 'GST 5% + QST 9.975%', components: [{ label: 'GST', rate: 5 }, { label: 'QST', rate: 9.975 }] },
  { code: 'SK', label: 'Saskatchewan (SK)',             rate: 11,     note: 'GST 5% + PST 6%',    components: [{ label: 'GST', rate: 5 }, { label: 'PST', rate: 6 }] },
  { code: 'YT', label: 'Yukon (YT)',                    rate: 5,      note: 'GST only',            components: [{ label: 'GST', rate: 5 }] },
  { code: 'manual', label: 'Manual Rate',               rate: 0,      note: '',                    components: [] },
];

const DEFAULT_PROVINCE = 'ON';

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS: FormState = {
  amount: '100',
  manualRate: '10',
};

// ─── Math — do not modify ─────────────────────────────────────────────────────

function computeResults(
  amount: number,
  ratePercent: number,
  mode: CalcMode,
): TaxResults | null {
  if (amount <= 0 || ratePercent < 0 || !Number.isFinite(amount) || !Number.isFinite(ratePercent)) return null;

  const rate = ratePercent / 100;

  let preTax: number;
  let taxAmount: number;
  let total: number;

  if (mode === 'add') {
    preTax    = amount;
    taxAmount = Math.round(amount * rate * 100) / 100;
    total     = preTax + taxAmount;
  } else {
    // Remove tax: amount is the tax-included total
    preTax    = Math.round((amount / (1 + rate)) * 100) / 100;
    taxAmount = Math.round((amount - preTax) * 100) / 100;
    total     = amount;
  }

  const taxShare = total > 0 ? (taxAmount / total) * 100 : 0;

  return { preTax, taxAmount, total, taxShare, statutoryRate: ratePercent };
}

// ─── Component breakdown math — do not modify ─────────────────────────────────

interface ComponentAmount {
  label: string;
  rate: number;
  amount: number;
}

function computeComponentAmounts(
  preTax: number,
  totalTax: number,
  components: TaxComponent[],
): ComponentAmount[] {
  if (components.length === 0) return [];
  if (components.length === 1) {
    return [{ label: components[0].label, rate: components[0].rate, amount: totalTax }];
  }
  const result: ComponentAmount[] = [];
  let sumSoFar = 0;
  for (let i = 0; i < components.length; i++) {
    const c = components[i];
    if (i === components.length - 1) {
      const remaining = Math.round((totalTax - sumSoFar) * 100) / 100;
      result.push({ label: c.label, rate: c.rate, amount: remaining });
    } else {
      const amt = Math.round(preTax * (c.rate / 100) * 100) / 100;
      sumSoFar += amt;
      result.push({ label: c.label, rate: c.rate, amount: amt });
    }
  }
  return result;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  border: '1px solid rgba(15,41,66,0.09)',
  borderRadius: '20px',
  background: '#ffffff',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 2px 10px rgba(0,0,0,0.03)',
};

const inputClsCompact =
  'w-full rounded-brand-sm border-[1.5px] border-brand-gray-200 text-brand-navy bg-brand-gray-50 ' +
  'pr-2 md:pr-3 pl-3 py-1.5 md:py-2 text-sm transition-colors duration-150 ' +
  'focus:outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/[0.15]';

const navyLabelStyle: React.CSSProperties = {
  fontWeight: 700, color: '#0D1B2A',
  display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4,
};
const navyLabelCls = 'text-[10px] md:text-xs';

function pillStyle(active: boolean): React.CSSProperties {
  return active
    ? { background: '#1DB584', color: '#fff', border: '1.5px solid #1DB584' }
    : { background: 'rgba(15,41,66,0.04)', color: '#4B5563', border: '1.5px solid rgba(15,41,66,0.10)' };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SalesTaxCalculatorProps {
  formulaContent?: ReactNode;
  faqItems?: Array<{ question: string; answer: string }>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SalesTaxCalculator({ formulaContent, faqItems = [] }: SalesTaxCalculatorProps) {
  const { region } = useRegion();
  const isCA = region === 'ca';

  const [form, setForm]             = useState<FormState>(DEFAULTS);
  const [mode, setMode]             = useState<CalcMode>('add');
  const [province, setProvince]     = useState<string>(DEFAULT_PROVINCE);
  const [aiCtaHovered, setAiCtaHovered] = useState(false);

  const fmt  = isCA ? fmtCAD  : fmtUSD;
  const fmtx = isCA ? fmtCADx : fmtUSDx;
  const currencyPrefix = isCA ? 'CA$' : '$';

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Resolve active rate
  const isManual = !isCA || province === 'manual';
  const activePreset = isCA ? CA_PRESETS.find((p) => p.code === province) ?? null : null;
  const activeRate: number = isManual
    ? (parseFloat(form.manualRate) || 0)
    : (activePreset?.rate ?? 0);

  const amount = parseFloat(form.amount) || 0;

  const results = useMemo(
    () => computeResults(amount, activeRate, mode),
    [amount, activeRate, mode],
  );

  const donutSlices = useMemo((): PieSlice[] | null => {
    if (!results) return null;
    return [
      { label: 'Pre-tax Amount', value: results.preTax,     color: '#1DB584', alwaysShow: true },
      { label: 'Sales Tax',      value: results.taxAmount,  color: '#F59E0B', alwaysShow: true },
    ];
  }, [results]);

  // Component breakdown — only when CA preset (non-manual) is active
  const showComponents = isCA && !isManual && activePreset !== null && activePreset.components.length > 0;
  const componentAmounts = useMemo((): ComponentAmount[] => {
    if (!results || !activePreset || isManual) return [];
    return computeComponentAmounts(results.preTax, results.taxAmount, activePreset.components);
  }, [results, activePreset, isManual]);

  function scrollToAI() {
    const el = document.getElementById('ai-analysis');
    if (!el) return;
    const navH = (document.querySelector('header') as HTMLElement | null)?.getBoundingClientRect().height ?? 64;
    window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - navH - 16), behavior: 'smooth' });
  }

  // Rate context for AI insights
  const rateCtx =
    activeRate <= 3  ? { label: 'Very Low',  color: '#1DB584', bg: '#ECFDF5', border: '#A7F3D0', textCls: 'text-emerald-700', iconBg: '#dcfce7' }
    : activeRate <= 7  ? { label: 'Low',     color: '#22C55E', bg: '#F0FDF4', border: '#BBF7D0', textCls: 'text-green-700',   iconBg: '#dcfce7' }
    : activeRate <= 10 ? { label: 'Moderate', color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', textCls: 'text-amber-600',  iconBg: '#fef3c7' }
    : activeRate <= 13 ? { label: 'Average',  color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', textCls: 'text-amber-600',  iconBg: '#fef3c7' }
    : { label: 'High',  color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', textCls: 'text-red-600', iconBg: '#fee2e2' };

  const amountLabel = mode === 'add' ? 'Amount (before tax)' : 'Tax-included Amount';
  const amountTooltip = mode === 'add'
    ? 'Enter the price before sales tax. The calculator will add tax to find your total.'
    : 'Enter the total price including tax. The calculator will extract the pre-tax amount and tax.';

  return (
    <div className="flex flex-col gap-y-6 md:gap-y-7 min-w-0">

      <style>{`
        @keyframes teal-glow-tax {
          0%, 100% { box-shadow: 0 0 0 1px rgba(29,181,132,0.3), 0 0 14px rgba(29,181,132,0.12); }
          50%       { box-shadow: 0 0 0 1px rgba(29,181,132,0.6), 0 0 26px rgba(29,181,132,0.28); }
        }
        .btn-ai-cta-tax {
          animation: teal-glow-tax 2.8s ease-in-out infinite;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }
        .btn-ai-cta-tax:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 0 1px rgba(29,181,132,0.75), 0 0 32px rgba(29,181,132,0.38) !important;
          animation: none;
        }
      `}</style>

      {/* ══ Block A: Input + Results ════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6">

        {/* ── Input Card ────────────────────────────────────────────────── */}
        <div className="lg:col-span-7 lg:self-start" style={cardStyle}>
          <div className="p-5 md:p-6">

            {/* Card header */}
            <div className="flex items-center gap-3 mb-5">
              <div style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                background: 'linear-gradient(135deg,#1DB584 0%,#0fa36e 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(29,181,132,0.30)',
              }}>
                <Receipt size={15} color="white" strokeWidth={2.2} aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                  Tax &amp; Salary
                </p>
                <p className="text-base font-bold" style={{ color: '#0D1B2A' }}>Sales Tax Details</p>
              </div>
            </div>

            {/* Mode toggle */}
            <div className="mb-4">
              <label className={navyLabelCls} style={navyLabelStyle}>
                Calculation Mode
                <Tooltip text="Add Tax: enter the pre-tax price and find the total. Remove Tax: enter the tax-included total and find the pre-tax amount." />
              </label>
              <div className="flex gap-2">
                {(['add', 'remove'] as CalcMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className="flex-1 font-semibold text-xs py-2.5 rounded-lg transition-colors duration-150"
                    onClick={() => setMode(m)}
                    style={pillStyle(mode === m)}
                  >
                    {m === 'add' ? 'Add Tax' : 'Remove Tax'}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[10px]" style={{ color: '#9BA8B5' }}>
                {mode === 'add'
                  ? 'Enter the pre-tax price — we calculate the tax and total.'
                  : 'Enter the tax-included total — we extract the pre-tax amount and tax.'}
              </p>
            </div>

            {/* Canada province selector — before Amount/Rate so preset drives the rate */}
            {isCA && (
              <div className="mb-4">
                <label className={navyLabelCls} style={navyLabelStyle}>
                  Province / Territory
                  <Tooltip text="Select your province or territory to auto-fill the combined sales tax rate, or choose Manual Rate to enter your own." />
                </label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className={inputClsCompact}
                  style={{ cursor: 'pointer' }}
                >
                  {CA_PRESETS.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.label}{p.note ? ` — ${p.note}` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px]" style={{ color: '#9BA8B5' }}>
                  General combined rates for illustration. Verify for your product type and location.
                </p>
              </div>
            )}

            {/* Amount + Rate row */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-3 md:gap-x-5 mb-4">
              <div>
                <label className={navyLabelCls} style={navyLabelStyle}>
                  {amountLabel}
                  <Tooltip text={amountTooltip} />
                </label>
                <NumericInput
                  value={form.amount}
                  onChange={(v) => set('amount', v)}
                  prefix={currencyPrefix}
                  inputClassName={inputClsCompact}
                />
              </div>

              {/* Rate input — read-only when preset active, editable when manual */}
              <div>
                <label className={navyLabelCls} style={navyLabelStyle}>
                  Tax Rate
                  <Tooltip text={
                    isManual
                      ? isCA
                        ? 'Enter your combined provincial/territorial sales tax rate.'
                        : 'Enter your combined state, county, and local sales tax rate.'
                      : `Preset rate for ${activePreset?.label ?? ''} — ${activePreset?.note ?? ''}.`
                  } />
                </label>
                {isManual ? (
                  <NumericInput
                    value={form.manualRate}
                    onChange={(v) => set('manualRate', v)}
                    suffix="%"
                    inputClassName={inputClsCompact}
                  />
                ) : (
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 md:py-2 rounded-brand-sm text-sm font-semibold"
                    style={{
                      border: '1.5px solid rgba(29,181,132,0.35)',
                      background: 'rgba(29,181,132,0.06)',
                      color: '#0D1B2A',
                      minHeight: 38,
                    }}
                  >
                    <span className="flex-1 tabular-nums">
                      {activePreset?.rate.toFixed(activePreset.rate % 1 === 0 ? 0 : 3)}%
                    </span>
                    <span className="text-[10px] font-normal shrink-0" style={{ color: '#1DB584' }}>
                      {activePreset?.note}
                    </span>
                  </div>
                )}
                {!isCA && (
                  <p className="mt-0.5 text-[10px]" style={{ color: '#9BA8B5' }}>
                    Enter your combined local sales tax rate.
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Mobile CTA */}
        <div className="lg:hidden">
          <MobileCalcCTA />
        </div>

        {/* ── Results Card ───────────────────────────────────────────────── */}
        <div id="calc-results" className="lg:col-span-5" style={{ scrollMarginTop: '80px' }}>
          <div
            className="flex flex-col h-full p-5 md:p-6 rounded-[20px]"
            style={{
              background: 'linear-gradient(150deg, #0D2137 0%, #0A1628 55%, #0D1B2A 100%)',
              border: '1px solid rgba(29,181,132,0.22)',
              minHeight: 320,
              boxShadow: '0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(29,181,132,0.08)',
            }}
          >
            {!results && (
              <div className="flex flex-1 items-center justify-center py-12">
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px', textAlign: 'center', lineHeight: 1.7 }}>
                  Enter an amount to see your tax breakdown.
                </p>
              </div>
            )}

            {results && (
              <div className="flex flex-col flex-1 gap-4">

                {/* Mode badge + hero */}
                <div className="rounded-xl p-4"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(29,181,132,0.20)', color: '#1DB584' }}
                    >
                      {mode === 'add' ? 'Add Tax' : 'Remove Tax'}
                    </span>
                  </div>
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
                    {mode === 'add' ? 'Total After Tax' : 'Pre-tax Amount'}
                  </p>
                  <p style={{ color: '#1DB584', fontSize: '36px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1, marginTop: 6 }}>
                    {mode === 'add' ? fmtx(results.total) : fmtx(results.preTax)}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginTop: 5, fontWeight: 500 }}>
                    {mode === 'add'
                      ? `${fmtx(results.preTax)} + ${fmtx(results.taxAmount)} tax`
                      : `${fmtx(results.total)} total → ${fmtx(results.taxAmount)} tax`
                    }
                  </p>
                </div>

                {/* Stat rows */}
                <div className="px-1 divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>

                  {/* Pre-tax */}
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Pre-tax Amount</span>
                    <span className="text-[13px]" style={{ color: '#CBD5E1', fontWeight: 600 }}>{fmtx(results.preTax)}</span>
                  </div>

                  {/* Tax — component breakdown or single row */}
                  {showComponents && componentAmounts.length > 1 ? (
                    <>
                      {componentAmounts.map((c) => (
                        <div key={c.label} className="flex items-center justify-between py-1.5">
                          <span className="text-[13px]" style={{ color: '#CBD5E1' }}>
                            {c.label}{' '}
                            <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: '11px' }}>
                              ({c.rate.toFixed(c.rate % 1 === 0 ? 0 : 3)}%)
                            </span>
                          </span>
                          <span className="text-[13px]" style={{ color: '#F59E0B', fontWeight: 600 }}>{fmtx(c.amount)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Total Tax</span>
                        <span className="text-[13px]" style={{ color: '#F59E0B', fontWeight: 700 }}>{fmtx(results.taxAmount)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[13px]" style={{ color: '#CBD5E1' }}>
                        {showComponents && componentAmounts.length === 1 ? componentAmounts[0].label : 'Sales Tax'}
                      </span>
                      <span className="text-[13px]" style={{ color: '#F59E0B', fontWeight: 600 }}>{fmtx(results.taxAmount)}</span>
                    </div>
                  )}

                  {/* Total */}
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Total (tax-included)</span>
                    <span className="text-[13px]" style={{ color: '#1DB584', fontWeight: 700 }}>{fmt(results.total)}</span>
                  </div>

                  {/* Rate / share */}
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px]" style={{ color: '#CBD5E1' }}>{'Tax share of total'}</span>
                    <span className="text-[13px]" style={{ color: '#CBD5E1', fontWeight: 600 }}>{results.taxShare.toFixed(2)}%</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Statutory Rate</span>
                    <span className="text-[13px]" style={{ color: '#CBD5E1', fontWeight: 600 }}>{activeRate.toFixed(activeRate % 1 === 0 ? 0 : 3)}%</span>
                  </div>

                </div>

                <div style={{ height: 1, background: 'rgba(255,255,255,0.12)' }} />

                {/* CTA */}
                <div className="pt-1">
                  <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.52)', marginBottom: 8, fontStyle: 'italic' }}>
                    See a full breakdown and tax context below.
                  </p>
                  <button
                    className="btn-ai-cta-tax w-full font-bold overflow-hidden"
                    onClick={scrollToAI}
                    onMouseEnter={() => setAiCtaHovered(true)}
                    onMouseLeave={() => setAiCtaHovered(false)}
                    style={{
                      position: 'relative', background: '#060F1A', color: '#ffffff',
                      borderRadius: 8, height: 40, fontSize: '13px',
                      border: '1px solid rgba(29,181,132,0.4)',
                    }}
                  >
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', opacity: aiCtaHovered ? 0 : 1, transition: 'opacity 200ms ease', pointerEvents: 'none' }}>
                      Review Tax Insights ↓
                    </span>
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', opacity: aiCtaHovered ? 1 : 0, transition: 'opacity 200ms ease', pointerEvents: 'none' }}>
                      <Sparkles size={13} style={{ marginRight: 6, color: '#1DB584' }} aria-hidden />
                      See AI Tax Analysis ↓
                    </span>
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>{/* end Block A */}

      {/* ══ Block B: Tax Breakdown + Mode Result ════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">

        {/* ── Tax Breakdown (donut) ─────────────────────────────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Breakdown
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Tax Breakdown</h3>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(13,27,42,0.45)' }}>
                Pre-tax amount vs. sales tax portion
              </p>
            </div>

            {(!results || !donutSlices) && (
              <div className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}>
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter an amount to see the breakdown.
                </p>
              </div>
            )}

            {results && donutSlices && (
              <div className="flex flex-col md:flex-row items-center gap-4 flex-1">
                <div className="shrink-0">
                  <DonutChart
                    slices={donutSlices}
                    className="w-52 h-52"
                    centerValue={fmt(results.total)}
                    centerLabel="total after tax"
                  />
                </div>
                <div className="w-full md:flex-1 divide-y" style={{ borderColor: 'rgba(15,41,66,0.07)' }}>
                  {[
                    { label: 'Pre-tax Amount', value: results.preTax,    color: '#1DB584', pctOf: results.total },
                    { label: 'Sales Tax',      value: results.taxAmount, color: '#F59E0B', pctOf: results.total },
                    { label: 'Total',          value: results.total,     color: '#0D1B2A', pctOf: results.total },
                  ].map(({ label, value, color, pctOf }) => {
                    const pct = pctOf > 0 ? ((value / pctOf) * 100).toFixed(1) : '0.0';
                    return (
                      <div key={label} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                          <span style={{ color: '#4B5563', fontSize: '12.5px' }}>{label}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-slate-400">{pct}%</span>
                          <span className="font-semibold" style={{ color: '#0D1B2A', fontSize: '12.5px' }}>{fmt(value)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Mode Result Card ──────────────────────────────────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                {mode === 'add' ? 'Add Tax Result' : 'Remove Tax Result'}
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>
                {mode === 'add' ? 'Add Tax Calculation' : 'Remove Tax Calculation'}
              </h3>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(13,27,42,0.45)' }}>
                {mode === 'add'
                  ? 'Starting from pre-tax amount, adding sales tax'
                  : 'Extracting pre-tax amount from tax-included total'}
              </p>
            </div>

            {!results && (
              <div className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}>
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter an amount to see the calculation.
                </p>
              </div>
            )}

            {results && (
              <div className="flex flex-col flex-1 gap-3">

                {/* Formula display */}
                <div className="rounded-xl p-4"
                  style={{ background: 'rgba(29,181,132,0.06)', border: '1px solid rgba(29,181,132,0.18)' }}>
                  {mode === 'add' ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: '#4B5563' }}>Pre-tax amount</span>
                        <span className="font-bold tabular-nums" style={{ color: '#0D1B2A', fontSize: '14px' }}>{fmtx(results.preTax)}</span>
                      </div>
                      {showComponents && componentAmounts.length > 1 ? (
                        <>
                          {componentAmounts.map((c) => (
                            <div key={c.label} className="flex items-center justify-between">
                              <span className="text-xs" style={{ color: '#4B5563' }}>
                                + {c.label} ({c.rate.toFixed(c.rate % 1 === 0 ? 0 : 3)}%)
                              </span>
                              <span className="font-bold tabular-nums" style={{ color: '#F59E0B', fontSize: '14px' }}>+{fmtx(c.amount)}</span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between">
                            <span className="text-xs" style={{ color: '#6B7280' }}>= Total tax</span>
                            <span className="font-semibold tabular-nums" style={{ color: '#F59E0B', fontSize: '13px' }}>{fmtx(results.taxAmount)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: '#4B5563' }}>
                            + {showComponents && componentAmounts.length === 1 ? componentAmounts[0].label : 'Sales tax'} ({activeRate.toFixed(activeRate % 1 === 0 ? 0 : 3)}%)
                          </span>
                          <span className="font-bold tabular-nums" style={{ color: '#F59E0B', fontSize: '14px' }}>+{fmtx(results.taxAmount)}</span>
                        </div>
                      )}
                      <div style={{ height: 1, background: 'rgba(29,181,132,0.25)', margin: '2px 0' }} />
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold" style={{ color: '#0D1B2A' }}>= Total after tax</span>
                        <span className="font-extrabold tabular-nums" style={{ color: '#1DB584', fontSize: '16px' }}>{fmtx(results.total)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: '#4B5563' }}>Tax-included total</span>
                        <span className="font-bold tabular-nums" style={{ color: '#0D1B2A', fontSize: '14px' }}>{fmtx(results.total)}</span>
                      </div>
                      {showComponents && componentAmounts.length > 1 ? (
                        <>
                          {componentAmounts.map((c) => (
                            <div key={c.label} className="flex items-center justify-between">
                              <span className="text-xs" style={{ color: '#4B5563' }}>
                                − {c.label} ({c.rate.toFixed(c.rate % 1 === 0 ? 0 : 3)}%)
                              </span>
                              <span className="font-bold tabular-nums" style={{ color: '#F59E0B', fontSize: '14px' }}>−{fmtx(c.amount)}</span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between">
                            <span className="text-xs" style={{ color: '#6B7280' }}>= Total tax</span>
                            <span className="font-semibold tabular-nums" style={{ color: '#F59E0B', fontSize: '13px' }}>{fmtx(results.taxAmount)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: '#4B5563' }}>
                            − {showComponents && componentAmounts.length === 1 ? componentAmounts[0].label : 'Sales tax'} ({activeRate.toFixed(activeRate % 1 === 0 ? 0 : 3)}%)
                          </span>
                          <span className="font-bold tabular-nums" style={{ color: '#F59E0B', fontSize: '14px' }}>−{fmtx(results.taxAmount)}</span>
                        </div>
                      )}
                      <div style={{ height: 1, background: 'rgba(29,181,132,0.25)', margin: '2px 0' }} />
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold" style={{ color: '#0D1B2A' }}>= Pre-tax amount</span>
                        <span className="font-extrabold tabular-nums" style={{ color: '#1DB584', fontSize: '16px' }}>{fmtx(results.preTax)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stat grid */}
                <div className="grid grid-cols-2 gap-2.5 mt-1">
                  {[
                    { label: 'Pre-tax Amount', value: fmt(results.preTax),    color: '#1DB584', bg: 'rgba(29,181,132,0.07)',  border: 'rgba(29,181,132,0.18)' },
                    { label: 'Sales Tax',      value: fmt(results.taxAmount), color: '#D97706', bg: 'rgba(245,158,11,0.07)',  border: 'rgba(245,158,11,0.18)' },
                    { label: 'Total',          value: fmt(results.total),     color: '#0D1B2A', bg: 'rgba(15,41,66,0.05)',   border: 'rgba(15,41,66,0.12)'   },
                    {
                      label: 'Tax share of total',
                      value: `${results.taxShare.toFixed(2)}%`,
                      color: '#4B5563',
                      bg: 'rgba(15,41,66,0.03)',
                      border: 'rgba(15,41,66,0.09)',
                    },
                  ].map(({ label, value, color, bg, border }) => (
                    <div key={label} className="rounded-xl text-center"
                      style={{ background: bg, border: `1px solid ${border}`, padding: '10px 6px' }}>
                      <p style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 5 }}>
                        {label}
                      </p>
                      <p style={{ fontSize: '13px', fontWeight: 800, color, lineHeight: 1 }}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Remove-tax clarification */}
                {mode === 'remove' && results && (
                  <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 mt-1"
                    style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                    <Info size={13} className="shrink-0 mt-0.5 text-amber-500" aria-hidden />
                    <p className="text-[11px] leading-relaxed text-amber-700">
                      Tax share of total ({results.taxShare.toFixed(2)}%) is lower than the statutory rate ({activeRate.toFixed(activeRate % 1 === 0 ? 0 : 3)}%) because the tax is calculated on the pre-tax base, not the total.
                    </p>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>

      </div>{/* end Block B */}

      {/* ══ Block C: AI Analysis ════════════════════════════════════════════ */}
      <div
        id="ai-analysis"
        className="overflow-hidden"
        style={{ ...cardStyle, padding: 0, scrollMarginTop: '80px' }}
      >

        {/* Dark header */}
        <div
          className="px-4 md:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
          style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #0f2744 100%)' }}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center shrink-0"
              style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(29,181,132,0.18)' }}>
              <Sparkles className="w-4 h-4" style={{ color: '#1DB584' }} aria-hidden />
            </span>
            <div>
              <p className="text-white text-lg md:text-xl font-bold tracking-tight">
                FinCalc <span style={{ color: '#1DB584' }}>Smart</span> AI Sales Tax Analysis
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>
                AI-assisted insights by FinCalc Smart
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 md:p-5" style={{ background: '#f4f6f9' }}>

          {!results && (
            <div className="flex flex-col items-center justify-center py-10 rounded-2xl gap-3"
              style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.08)' }}>
              <Sparkles className="w-5 h-5" style={{ color: '#1DB584' }} aria-hidden />
              <p className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>
                Enter an amount above to get AI tax insights.
              </p>
              <p className="text-xs text-center px-4" style={{ color: '#94a3b8', maxWidth: 340 }}>
                Your tax breakdown, rate context, and checkout impact will appear here.
              </p>
            </div>
          )}

          {results && (() => {
            const mainResultLabel = mode === 'add' ? 'Estimated Tax' : 'Pre-tax Amount';
            const mainResultValue = mode === 'add' ? results.taxAmount : results.preTax;

            return (
              <>
                {/* ── Row 1: Tax Share + Smart Lever ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                  {/* Left — Tax Share */}
                  <div className="rounded-2xl p-4 flex flex-col"
                    style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.09)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                        <span className="text-sm font-bold text-slate-800">Tax Share</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                        style={{ background: rateCtx.bg, color: rateCtx.color }}>
                        {rateCtx.label} Rate
                      </span>
                    </div>

                    {/* Main metric */}
                    <div className="flex flex-col items-center justify-center flex-1 py-4">
                      <span className="tabular-nums font-extrabold"
                        style={{ fontSize: 'clamp(2.2rem, 5vw, 3rem)', color: '#0D1B2A', letterSpacing: '-1.5px', lineHeight: 1 }}>
                        {results.taxShare.toFixed(1)}%
                      </span>
                      <span className="text-xs text-slate-400 mt-1">
                        {'Tax share of total'}
                      </span>

                      {/* 3-stat row */}
                      <div className="grid grid-cols-3 gap-3 w-full mt-4">
                        {[
                          { label: 'Pre-tax',    value: fmt(results.preTax),    color: '#1DB584', bg: 'rgba(29,181,132,0.08)',  border: 'rgba(29,181,132,0.22)' },
                          { label: 'Sales Tax',  value: fmt(results.taxAmount), color: '#D97706', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.22)' },
                          { label: 'Total',      value: fmt(results.total),     color: '#1e3a5f', bg: 'rgba(15,41,66,0.05)',   border: 'rgba(15,41,66,0.11)'   },
                        ].map(({ label, value, color, bg, border }) => (
                          <div key={label} className="rounded-xl text-center"
                            style={{ background: bg, border: `1px solid ${border}`, padding: '10px 6px 10px' }}>
                            <p style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6 }}>
                              {label}
                            </p>
                            <p style={{ fontSize: '13px', fontWeight: 800, color, lineHeight: 1, letterSpacing: '-0.2px' }}>
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>

                      <p className="text-slate-400 mt-3 text-center" style={{ fontSize: '11px', lineHeight: 1.55 }}>
                        At {activeRate.toFixed(activeRate % 1 === 0 ? 0 : 3)}% rate,{' '}
                        {mode === 'add'
                          ? `${results.taxShare.toFixed(2)}% of your total payment goes to sales tax.`
                          : `${results.taxShare.toFixed(2)}% of the tax-included price was sales tax.`
                        }
                      </p>
                    </div>
                  </div>

                  {/* Right — Smart dark card */}
                  <div className="rounded-2xl p-4 flex flex-col"
                    style={{ background: 'linear-gradient(145deg, #0D1B2A 0%, #0c1e3a 100%)', border: '1px solid rgba(29,181,132,0.15)', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                      <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#1DB584' }}>
                        {mode === 'add' ? 'Tax Amount' : 'Pre-tax Recovery'}
                      </span>
                    </div>

                    <div className="flex flex-col justify-center flex-1">
                      <div className="rounded-xl flex flex-col items-center justify-center px-4 py-5 mb-3"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                        <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.40)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
                          {mainResultLabel}
                        </p>
                        <span className="font-extrabold tabular-nums"
                          style={{ fontSize: 'clamp(1.9rem, 5vw, 2.6rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                          {fmtx(mainResultValue)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 mb-3">
                        <div className="flex flex-col justify-center rounded-xl px-3 py-2.5"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '0.95rem', lineHeight: 1.2 }}>
                            {fmt(results.total)}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                            <span className="text-slate-400 text-xs">Total</span>
                          </div>
                        </div>
                        <div className="flex flex-col justify-center rounded-xl px-3 py-2.5"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '0.95rem', lineHeight: 1.2 }}>
                            {activeRate.toFixed(activeRate % 1 === 0 ? 0 : 3)}%
                          </div>
                          <div className="flex items-center gap-1.5">
                            <TrendingDown className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                            <span className="text-slate-400 text-xs">Statutory rate</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] italic leading-relaxed" style={{ color: 'rgba(255,255,255,0.30)' }}>
                        {mode === 'add'
                          ? `${fmtx(results.preTax)} pre-tax + ${fmtx(results.taxAmount)} tax = ${fmtx(results.total)} total.`
                          : `${fmtx(results.total)} total − ${fmtx(results.taxAmount)} tax = ${fmtx(results.preTax)} pre-tax.`
                        }
                      </p>
                    </div>
                  </div>

                </div>{/* end Row 1 */}

                {/* ── Row 2: Three insight cards ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  {/* Tax Rate Check */}
                  <div className="rounded-2xl p-4"
                    style={{ background: rateCtx.bg, border: `1px solid ${rateCtx.border}` }}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="flex items-center justify-center shrink-0"
                        style={{ width: 28, height: 28, borderRadius: 8, background: rateCtx.iconBg }}>
                        <AlertTriangle className={`w-3.5 h-3.5 ${rateCtx.textCls}`} aria-hidden />
                      </span>
                      <p className={`text-xs font-bold ${rateCtx.textCls}`}>Tax Rate Check</p>
                    </div>
                    <p className={`text-[13px] font-bold mb-1 ${rateCtx.textCls}`}>
                      {activeRate.toFixed(activeRate % 1 === 0 ? 0 : 3)}% — {rateCtx.label}
                    </p>
                    <p className="text-[12px] text-slate-600 leading-relaxed">
                      {activeRate === 0
                        ? 'A 0% rate means no sales tax applies. Confirm this is correct for your product and location.'
                        : activeRate <= 7
                          ? `${activeRate.toFixed(activeRate % 1 === 0 ? 0 : 3)}% is on the lower end of North American sales tax rates (typical range: 5–15%). Common in GST-only regions.`
                          : activeRate <= 10
                            ? `${activeRate.toFixed(activeRate % 1 === 0 ? 0 : 3)}% is a moderate rate — typical for combined GST/PST or some US state rates.`
                            : activeRate <= 13
                              ? `${activeRate.toFixed(activeRate % 1 === 0 ? 0 : 3)}% is an average combined rate — common for HST provinces like Ontario.`
                              : `${activeRate.toFixed(activeRate % 1 === 0 ? 0 : 3)}% is on the higher end. HST provinces (NB, NL, NS, PE) and some US localities reach this range.`
                      }
                    </p>
                  </div>

                  {/* Add vs Remove Tax */}
                  <div className="rounded-2xl p-4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="flex items-center justify-center shrink-0"
                        style={{ width: 28, height: 28, borderRadius: 8, background: '#e0f2fe' }}>
                        <Info className="w-3.5 h-3.5 text-sky-600" aria-hidden />
                      </span>
                      <p className="text-xs font-bold text-sky-700">Add vs Remove Tax</p>
                    </div>
                    <p className="text-[13px] font-bold text-sky-800 mb-1">
                      {mode === 'add' ? 'Adding tax mode' : 'Removing tax mode'}
                    </p>
                    <p className="text-[12px] text-slate-600 leading-relaxed">
                      {mode === 'add'
                        ? <>You entered <strong className="text-sky-700">{fmtx(results.preTax)}</strong> pre-tax. At {activeRate.toFixed(activeRate % 1 === 0 ? 0 : 3)}%, the total you pay is <strong className="text-sky-700">{fmtx(results.total)}</strong>. Flip to <em>Remove Tax</em> mode to reverse-check a tax-included price.</>
                        : <>You entered <strong className="text-sky-700">{fmtx(results.total)}</strong> tax-included. At {activeRate.toFixed(activeRate % 1 === 0 ? 0 : 3)}%, the pre-tax price was <strong className="text-sky-700">{fmtx(results.preTax)}</strong>. Flip to <em>Add Tax</em> mode to calculate from a pre-tax price.</>
                      }
                    </p>
                  </div>

                  {/* Receipt / Checkout Context */}
                  <div className="rounded-2xl p-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="flex items-center justify-center shrink-0"
                        style={{ width: 28, height: 28, borderRadius: 8, background: '#dcfce7' }}>
                        <Receipt className="w-3.5 h-3.5 text-emerald-600" aria-hidden />
                      </span>
                      <p className="text-xs font-bold text-emerald-700">Receipt Context</p>
                    </div>
                    <p className="text-[13px] font-bold text-emerald-800 mb-1">
                      {fmt(results.taxAmount)} in tax
                    </p>
                    <p className="text-[12px] text-slate-600 leading-relaxed">
                      On a {fmt(mode === 'add' ? results.preTax : results.total)} purchase at {activeRate.toFixed(activeRate % 1 === 0 ? 0 : 3)}%,
                      you pay <strong className="text-emerald-700">{fmt(results.taxAmount)}</strong> in sales tax.
                      Over 10 similar purchases, that&apos;s <strong className="text-emerald-700">{fmt(results.taxAmount * 10)}</strong> in tax annually.
                    </p>
                  </div>

                </div>{/* end Row 2 */}

              </>
            );
          })()}

        </div>{/* end body */}

        {/* Inner disclaimer */}
        <div className="flex items-start gap-2.5 px-5 md:px-6 py-4"
          style={{ borderTop: '1px solid rgba(15,41,66,0.07)', background: '#f8fafb' }}>
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" aria-hidden />
          <p className="text-slate-400 text-xs leading-relaxed">
            <strong className="text-slate-500 font-semibold">Disclaimer:</strong>{' '}
            Educational estimate only. Sales tax rules vary by province, state, locality, product type, exemptions, tax holidays, and business-specific rules. Canada preset rates are general combined rates for illustrative purposes. USA rate must be entered manually. Rates may change — always verify with your provincial/state tax authority. This is not tax or legal advice.
          </p>
        </div>

      </div>{/* end Block C */}

      {/* ══ How It Works ══════════════════════════════════════════════════════ */}
      {formulaContent && (
        <div style={cardStyle} className="p-6 md:p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
            How It Works
          </h2>
          <div className="space-y-4 text-sm md:text-base text-slate-600 leading-relaxed">
            {formulaContent}
          </div>
        </div>
      )}

      {/* ══ FAQ ═══════════════════════════════════════════════════════════════ */}
      {faqItems.length > 0 && (
        <div style={cardStyle} className="p-6 md:p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2.5">
            <HelpCircle className="w-5 h-5 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
            Frequently Asked Questions
          </h2>
          <CalculatorFaqAccordion faqs={faqItems} />
        </div>
      )}

      {/* ══ Bottom disclaimer ════════════════════════════════════════════════ */}
      <p className="text-xs text-slate-400 text-center mt-4 pb-12 px-4 leading-relaxed max-w-4xl mx-auto">
        This calculator is for educational and illustrative purposes only. Sales tax rules vary by province, state, locality, product type, exemptions, tax holidays, and business-specific rules. Canada preset rates are general combined rates and may not reflect your specific situation. USA rate must be entered manually as US sales tax varies by state, county, city, and district. Rates may change — always verify with your provincial/state tax authority or a qualified professional. This is not tax or legal advice.
      </p>

    </div>
  );
}
