'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { useRegion } from '@/lib/region/context';
import { NumericInput, Tooltip, DonutChart, type PieSlice } from '../_mortgage-shared/ui';
import { fmtCAD, fmtCADx, fmtUSD, fmtUSDx } from '../_mortgage-shared/math';
import MobileCalcCTA from '@/components/ui/MobileCalcCTA';
import CalculatorFaqAccordion from '@/components/layout/CalculatorFaqAccordion';
import {
  AlertTriangle, BookOpen, Download,
  FileText, HelpCircle, Info, Mail, ShieldAlert, Sparkles, TrendingDown, Wallet,
} from 'lucide-react';
import { buildTaxPDF } from '@/lib/pdf/adapters/taxAdapter';

// ─── Tax year (update each January) ──────────────────────────────────────────

const TAX_YEAR = 2025;

// ─── Types ────────────────────────────────────────────────────────────────────

type FilingStatus = 'single' | 'mfj';

interface FormState {
  grossIncome:        string;
  provinceManualRate: string;
  stateRate:          string;
}

interface TaxResults {
  grossIncome:         number;
  federalTax:          number;
  provinceTax:         number;
  totalTax:            number;
  afterTaxIncome:      number;
  monthlyTakeHome:     number;
  effectiveRate:       number;
  marginalFederalRate: number;
  incomeBand:          string;
  stdDeductionApplied: number;
  bpaCredit:           number;
}

// ─── Tax constants — update each January ─────────────────────────────────────

interface TaxBracket { min: number; rate: number; }

// Canada federal 2025 (approximate — CRA indexes annually)
const CA_FEDERAL_BRACKETS: TaxBracket[] = [
  { min: 0,       rate: 15   },
  { min: 57375,   rate: 20.5 },
  { min: 114750,  rate: 26   },
  { min: 158519,  rate: 29   },
  { min: 220000,  rate: 33   },
];
const CA_BASIC_PERSONAL_AMOUNT = 16129; // 2025 approximate
const CA_BPA_CREDIT_RATE       = 0.15;  // lowest federal rate

// USA federal 2025 — Single
const US_FEDERAL_BRACKETS_SINGLE: TaxBracket[] = [
  { min: 0,       rate: 10 },
  { min: 11925,   rate: 12 },
  { min: 48475,   rate: 22 },
  { min: 103350,  rate: 24 },
  { min: 197300,  rate: 32 },
  { min: 250525,  rate: 35 },
  { min: 626350,  rate: 37 },
];

// USA federal 2025 — Married Filing Jointly
const US_FEDERAL_BRACKETS_MFJ: TaxBracket[] = [
  { min: 0,       rate: 10 },
  { min: 23850,   rate: 12 },
  { min: 96950,   rate: 22 },
  { min: 206700,  rate: 24 },
  { min: 394600,  rate: 32 },
  { min: 501050,  rate: 35 },
  { min: 751600,  rate: 37 },
];

const US_STANDARD_DEDUCTION_SINGLE = 15000; // 2025
const US_STANDARD_DEDUCTION_MFJ    = 30000; // 2025

// Canada approximate provincial income tax rates (flat estimate — not bracket-accurate)
// These are rough effective rates for educational planning only.
interface ProvinceRate { code: string; label: string; rate: number; isManual?: boolean; }

const CA_PROVINCE_APPROX_RATES: ProvinceRate[] = [
  { code: 'AB',     label: 'Alberta (AB)',                  rate: 10   },
  { code: 'BC',     label: 'British Columbia (BC)',         rate: 10.5 },
  { code: 'MB',     label: 'Manitoba (MB)',                 rate: 14.5 },
  { code: 'NB',     label: 'New Brunswick (NB)',            rate: 15.5 },
  { code: 'NL',     label: 'Newfoundland & Labrador (NL)', rate: 17.5 },
  { code: 'NS',     label: 'Nova Scotia (NS)',              rate: 18.5 },
  { code: 'NT',     label: 'Northwest Territories (NT)',    rate: 8.9  },
  { code: 'NU',     label: 'Nunavut (NU)',                  rate: 9.4  },
  { code: 'ON',     label: 'Ontario (ON)',                  rate: 11   },
  { code: 'PE',     label: 'Prince Edward Island (PE)',     rate: 16   },
  { code: 'QC',     label: 'Québec (QC)',                   rate: 22   },
  { code: 'SK',     label: 'Saskatchewan (SK)',             rate: 12.2 },
  { code: 'YT',     label: 'Yukon (YT)',                    rate: 9.5  },
  { code: 'manual', label: 'Manual Rate', rate: 0, isManual: true },
];

const DEFAULT_PROVINCE = 'ON';

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS: FormState = {
  grossIncome:        '80000',
  provinceManualRate: '0',
  stateRate:          '5',
};

// ─── Math — do not modify ─────────────────────────────────────────────────────

function progressiveTax(income: number, brackets: TaxBracket[]): number {
  if (income <= 0) return 0;
  let tax = 0;
  for (let i = 0; i < brackets.length; i++) {
    if (income <= brackets[i].min) break;
    const upper = i + 1 < brackets.length ? brackets[i + 1].min : Infinity;
    tax += (Math.min(income, upper) - brackets[i].min) * (brackets[i].rate / 100);
  }
  return tax;
}

function getMarginalRate(income: number, brackets: TaxBracket[]): number {
  let rate = brackets[0].rate;
  for (const b of brackets) {
    if (income > b.min) rate = b.rate;
    else break;
  }
  return rate;
}

function getIncomeBand(income: number, brackets: TaxBracket[]): string {
  if (income <= 0) return `${brackets[0].rate}% federal bracket`;
  let band = brackets[0];
  for (const b of brackets) {
    if (income > b.min) band = b;
    else break;
  }
  return `${band.rate}% federal bracket`;
}

function safe(n: number): number {
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function computeResults(
  form: FormState,
  filingStatus: FilingStatus,
  isCA: boolean,
  province: string,
): TaxResults | null {
  const grossIncome = parseFloat(form.grossIncome) || 0;
  if (grossIncome <= 0) return null;

  let federalTax: number;
  let provinceTax: number;
  let marginalFederalRate: number;
  let incomeBand: string;
  let stdDeductionApplied = 0;
  let bpaCredit = 0;

  if (isCA) {
    const rawFed   = progressiveTax(grossIncome, CA_FEDERAL_BRACKETS);
    bpaCredit      = safe(Math.min(rawFed, CA_BASIC_PERSONAL_AMOUNT * CA_BPA_CREDIT_RATE));
    federalTax     = safe(rawFed - bpaCredit);
    marginalFederalRate = getMarginalRate(grossIncome, CA_FEDERAL_BRACKETS);
    incomeBand     = getIncomeBand(grossIncome, CA_FEDERAL_BRACKETS);

    const preset   = CA_PROVINCE_APPROX_RATES.find((p) => p.code === province);
    const provPct  = preset?.isManual
      ? Math.max(0, parseFloat(form.provinceManualRate) || 0)
      : (preset?.rate ?? 0);
    provinceTax = safe(grossIncome * (provPct / 100));
  } else {
    const brackets     = filingStatus === 'mfj' ? US_FEDERAL_BRACKETS_MFJ : US_FEDERAL_BRACKETS_SINGLE;
    const stdDeduction = filingStatus === 'mfj' ? US_STANDARD_DEDUCTION_MFJ : US_STANDARD_DEDUCTION_SINGLE;
    stdDeductionApplied = stdDeduction;
    const taxable  = Math.max(0, grossIncome - stdDeduction);
    federalTax     = safe(progressiveTax(taxable, brackets));
    marginalFederalRate = taxable > 0 ? getMarginalRate(taxable, brackets) : brackets[0].rate;
    incomeBand     = taxable <= 0 ? 'Below standard deduction' : getIncomeBand(taxable, brackets);

    const sRate    = Math.max(0, parseFloat(form.stateRate) || 0);
    provinceTax    = safe(grossIncome * (sRate / 100));
  }

  const totalTax       = safe(federalTax + provinceTax);
  const afterTaxIncome = safe(grossIncome - totalTax);
  const monthlyTakeHome = afterTaxIncome / 12;
  const effectiveRate  = grossIncome > 0 ? safe((totalTax / grossIncome) * 100) : 0;

  return {
    grossIncome, federalTax, provinceTax, totalTax,
    afterTaxIncome, monthlyTakeHome,
    effectiveRate, marginalFederalRate, incomeBand,
    stdDeductionApplied, bpaCredit,
  };
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

const selectCls = inputClsCompact + ' cursor-pointer';
const selectStyle: React.CSSProperties = {
  appearance: 'none',
  paddingRight: '2rem',
  backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
};

function pillStyle(active: boolean): React.CSSProperties {
  return active
    ? { background: '#1DB584', color: '#fff', border: '1.5px solid #1DB584' }
    : { background: 'rgba(15,41,66,0.04)', color: '#4B5563', border: '1.5px solid rgba(15,41,66,0.10)' };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface IncomeTaxCalculatorProps {
  formulaContent?: ReactNode;
  faqItems?: Array<{ question: string; answer: string }>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function IncomeTaxCalculator({ formulaContent, faqItems = [] }: IncomeTaxCalculatorProps) {
  const { region } = useRegion();
  const isCA = region === 'ca';

  const [form, setForm]                 = useState<FormState>(DEFAULTS);
  const [filingStatus, setFilingStatus] = useState<FilingStatus>('single');
  const [province, setProvince]         = useState<string>(DEFAULT_PROVINCE);
  const [aiCtaHovered, setAiCtaHovered] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const fmt  = isCA ? fmtCAD  : fmtUSD;
  const fmtx = isCA ? fmtCADx : fmtUSDx;
  const currencyPrefix = isCA ? 'CA$' : '$';

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const results = useMemo(
    () => computeResults(form, filingStatus, isCA, province),
    [form, filingStatus, isCA, province],
  );

  const donutSlices = useMemo((): PieSlice[] | null => {
    if (!results) return null;
    return [
      { label: 'After-Tax Income', value: results.afterTaxIncome, color: '#1DB584', alwaysShow: true },
      { label: 'Federal Tax',      value: results.federalTax,     color: '#F59E0B', alwaysShow: true },
      { label: isCA ? 'Approx. Provincial Tax' : 'Est. State/Local Tax',
        value: results.provinceTax, color: '#64748B', alwaysShow: results.provinceTax > 0 },
    ];
  }, [results, isCA]);

  // Take-Home Clarity Score — higher = more take-home relative to gross
  const clarityScore = results
    ? Math.max(0, Math.min(100, Math.round(100 - results.effectiveRate * 1.5)))
    : 0;
  const clarityLabel = clarityScore >= 70 ? 'Low Tax Load' : clarityScore >= 55 ? 'Moderate' : 'High Tax Load';
  const clarityColor = clarityScore >= 70 ? '#1DB584' : clarityScore >= 55 ? '#F59E0B' : '#EF4444';
  const clarityBg    = clarityScore >= 70 ? 'rgba(29,181,132,0.10)' : clarityScore >= 55 ? 'rgba(245,158,11,0.10)' : 'rgba(239,68,68,0.10)';

  const activeProvince = CA_PROVINCE_APPROX_RATES.find((p) => p.code === province);

  function scrollToAI() {
    const el = document.getElementById('ai-analysis');
    if (!el) return;
    const navH = (document.querySelector('header') as HTMLElement | null)?.getBoundingClientRect().height ?? 64;
    window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - navH - 16), behavior: 'smooth' });
  }

  // Labels that switch by region
  const provinceTaxLabel = isCA ? 'Approx. Provincial Tax' : 'Est. State/Local Tax';
  const filingLabels: Record<FilingStatus, string> = {
    single: 'Single',
    mfj: isCA ? 'Married' : 'Married Filing Jointly',
  };

  async function handleDownloadPDF() {
    if (!results || pdfLoading) return;
    setPdfLoading(true);
    try {
      await buildTaxPDF({
        grossIncome:          results.grossIncome,
        region,
        province:             isCA ? activeProvince?.label : undefined,
        filingStatus:         !isCA ? filingStatus : undefined,
        stateRate:            !isCA ? (parseFloat(form.stateRate) || 0) : undefined,
        stdDeductionApplied:  results.stdDeductionApplied,
        federalTax:           results.federalTax,
        provinceTax:          results.provinceTax,
        totalTax:             results.totalTax,
        afterTaxIncome:       results.afterTaxIncome,
        monthlyTakeHome:      results.monthlyTakeHome,
        effectiveRate:        results.effectiveRate,
        marginalFederalRate:  results.marginalFederalRate,
        incomeBand:           results.incomeBand,
        bpaCredit:            results.bpaCredit,
        taxYear:              TAX_YEAR,
        clarityScore,
        clarityLabel,
      });
    } catch (e) {
      console.error('PDF generation failed', e);
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-y-6 md:gap-y-7 min-w-0">

      <style>{`
        @keyframes teal-glow-itax {
          0%, 100% { box-shadow: 0 0 0 1px rgba(29,181,132,0.3), 0 0 14px rgba(29,181,132,0.12); }
          50%       { box-shadow: 0 0 0 1px rgba(29,181,132,0.6), 0 0 26px rgba(29,181,132,0.28); }
        }
        .btn-ai-cta-itax {
          animation: teal-glow-itax 2.8s ease-in-out infinite;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }
        .btn-ai-cta-itax:hover {
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
                <FileText size={15} color="white" strokeWidth={2.2} aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                  Tax &amp; Salary
                </p>
                <p className="text-base font-bold" style={{ color: '#0D1B2A' }}>Income Details</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-4 md:gap-x-5 mb-5">

              {/* Annual Gross Income */}
              <div className="col-span-2">
                <label className={navyLabelCls} style={navyLabelStyle}>
                  Annual Gross Income
                  <Tooltip text="Enter your total annual employment income before any taxes or deductions. Employment income only — capital gains, rental, or business income are not included in this estimate." />
                </label>
                <NumericInput
                  value={form.grossIncome}
                  onChange={(v) => set('grossIncome', v)}
                  prefix={currencyPrefix}
                  inputClassName={inputClsCompact}
                />
              </div>

              {/* Filing Status */}
              <div className="col-span-2">
                <label className={navyLabelCls} style={navyLabelStyle}>
                  Filing Status
                  <Tooltip text={
                    isCA
                      ? 'Canada uses individual filing — federal brackets apply to your income regardless of marital status. This selection does not change the federal calculation.'
                      : 'Married Filing Jointly uses wider federal brackets and a higher standard deduction, typically reducing total federal tax compared to two separate Single filers.'
                  } />
                </label>
                <div className="flex gap-2">
                  {(['single', 'mfj'] as FilingStatus[]).map((fs) => (
                    <button
                      key={fs}
                      type="button"
                      className="flex-1 font-semibold text-xs py-2 rounded-lg transition-colors duration-150"
                      onClick={() => setFilingStatus(fs)}
                      style={pillStyle(filingStatus === fs)}
                    >
                      {filingLabels[fs]}
                    </button>
                  ))}
                </div>
                {isCA && (
                  <p className="mt-1 text-[10px]" style={{ color: '#9BA8B5' }}>
                    Canada uses individual filing — marital status does not change federal brackets in this estimate.
                  </p>
                )}
              </div>

              {/* CA: Province / Territory */}
              {isCA && (
                <div className="col-span-2">
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Province / Territory
                    <Tooltip text="Provincial income tax rates shown are flat approximations for educational purposes. Actual provincial tax uses progressive brackets — results will differ from an official tax calculation." />
                  </label>
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className={selectCls}
                    style={selectStyle}
                  >
                    {CA_PROVINCE_APPROX_RATES.map((p) => (
                      <option key={p.code} value={p.code}>{p.label}</option>
                    ))}
                  </select>
                  {province !== 'manual' && (
                    <p className="mt-0.5 text-[10px]" style={{ color: '#9BA8B5' }}>
                      Approx. provincial rate: {activeProvince?.rate ?? 0}% — educational flat estimate only
                    </p>
                  )}
                  {province === 'QC' && (
                    <p className="mt-1 text-[10px]" style={{ color: '#D97706' }}>
                      Québec has a separate provincial tax system with a federal abatement. This estimate is more approximate than other provinces.
                    </p>
                  )}
                </div>
              )}

              {/* CA: Manual provincial rate */}
              {isCA && province === 'manual' && (
                <div className="col-span-2">
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Custom Provincial Rate %
                    <Tooltip text="Enter your estimated provincial income tax rate as a percentage of gross income. This is a flat approximation — provincial tax actually uses progressive brackets." />
                  </label>
                  <NumericInput
                    value={form.provinceManualRate}
                    onChange={(v) => set('provinceManualRate', v)}
                    suffix="%"
                    inputClassName={inputClsCompact}
                  />
                </div>
              )}

              {/* US: State/local rate */}
              {!isCA && (
                <div className="col-span-2">
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Est. State/Local Tax Rate %
                    <Tooltip text="Enter your combined state and local income tax rate as a percentage of gross income. State rates vary widely — some states have no income tax. Check your state's tax authority for current rates." />
                  </label>
                  <NumericInput
                    value={form.stateRate}
                    onChange={(v) => set('stateRate', v)}
                    suffix="%"
                    inputClassName={inputClsCompact}
                  />
                  <p className="mt-0.5 text-[10px]" style={{ color: '#9BA8B5' }}>
                    Use 0% if your state has no income tax. State/local tax applied as flat rate on gross income.
                  </p>
                </div>
              )}

            </div>

            {/* Tax year note */}
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: 'rgba(29,181,132,0.06)', border: '1px solid rgba(29,181,132,0.18)' }}>
              <Info size={12} style={{ color: '#1DB584', flexShrink: 0 }} aria-hidden />
              <p className="text-[10.5px]" style={{ color: '#0a5f44' }}>
                {TAX_YEAR} estimate · Employment income only · Educational purposes only
                {isCA ? ' · Does not include CPP or EI' : ' · Does not include FICA or Medicare'}
              </p>
            </div>

          </div>
        </div>

        {/* Mobile CTA */}
        <div className="lg:hidden">
          <MobileCalcCTA />
        </div>

        {/* ── Results Dark Card ──────────────────────────────────────────── */}
        <div id="calc-results" className="lg:col-span-5" style={{ scrollMarginTop: '80px' }}>
          <div
            className="flex flex-col h-full p-5 md:p-6 rounded-[20px]"
            style={{
              background: 'linear-gradient(150deg, #0D2137 0%, #0A1628 55%, #0D1B2A 100%)',
              border: '1px solid rgba(29,181,132,0.22)',
              minHeight: 340,
              boxShadow: '0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(29,181,132,0.08)',
            }}
          >
            {!results && (
              <div className="flex flex-1 items-center justify-center py-12">
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px', textAlign: 'center', lineHeight: 1.7 }}>
                  Enter your income to see estimated tax results.
                </p>
              </div>
            )}

            {results && (
              <div className="flex flex-col flex-1 gap-4">

                {/* Hero */}
                <div className="rounded-xl p-4"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
                    Est. After-Tax Income
                  </p>
                  <p style={{ color: '#1DB584', fontSize: '36px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1, marginTop: 6 }}>
                    {fmtx(results.afterTaxIncome)}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginTop: 5, fontWeight: 500 }}>
                    {TAX_YEAR} estimate · {results.effectiveRate.toFixed(1)}% effective tax rate
                  </p>
                </div>

                {/* Stat rows */}
                <div className="px-1 divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  {[
                    { label: 'Annual Gross Income',        value: fmt(results.grossIncome),              color: '#CBD5E1', bold: false },
                    { label: 'Est. Federal Tax',           value: fmt(results.federalTax),               color: '#F59E0B', bold: false },
                    { label: provinceTaxLabel,             value: fmt(results.provinceTax),              color: '#94a3b8', bold: false },
                    { label: 'Est. Total Tax',             value: fmt(results.totalTax),                 color: '#ffffff', bold: true  },
                    { label: 'Est. Monthly Take-Home',     value: fmtx(results.monthlyTakeHome) + '/mo', color: '#1DB584', bold: true  },
                    { label: 'Effective Tax Rate',         value: results.effectiveRate.toFixed(1) + '%', color: '#CBD5E1', bold: false },
                    { label: 'Marginal Federal Rate',      value: results.marginalFederalRate + '%',      color: '#CBD5E1', bold: false },
                  ].map(({ label, value, color, bold }) => (
                    <div key={label} className="flex items-center justify-between py-1.5">
                      <span className="text-[12.5px]" style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</span>
                      <span className="text-[12.5px]" style={{ color, fontWeight: bold ? 700 : 600 }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Income band + deduction note */}
                <div className="px-1 space-y-1">
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Income band: <span style={{ color: 'rgba(255,255,255,0.60)' }}>{results.incomeBand}</span>
                  </p>
                  {isCA && results.bpaCredit > 0 && (
                    <p className="text-[10.5px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
                      Basic Personal Amount credit applied: {fmtx(results.bpaCredit)}
                    </p>
                  )}
                  {!isCA && results.stdDeductionApplied > 0 && (
                    <p className="text-[10.5px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
                      Standard deduction applied: {fmt(results.stdDeductionApplied)}
                    </p>
                  )}
                </div>

                <div style={{ height: 1, background: 'rgba(255,255,255,0.10)' }} />

                {/* CTA */}
                <div className="pt-1">
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginBottom: 8, fontStyle: 'italic' }}>
                    Educational estimate — see AI analysis for context and limits.
                  </p>
                  <button
                    className="btn-ai-cta-itax w-full font-bold overflow-hidden"
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

      {/* ══ Block B: Tax Breakdown + Income After Tax ═══════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">

        {/* ── Tax Breakdown Donut ────────────────────────────────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Tax Breakdown
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Tax Breakdown</h3>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(13,27,42,0.45)' }}>
                Estimated federal, provincial/state, and take-home share of gross income
              </p>
            </div>

            {(!results || !donutSlices) && (
              <div className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}>
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter your income to see the tax breakdown.
                </p>
              </div>
            )}

            {results && donutSlices && (
              <div className="flex flex-col md:flex-row items-center gap-4 flex-1">
                <div className="shrink-0">
                  <DonutChart
                    slices={donutSlices}
                    className="w-52 h-52"
                    centerValue={fmtx(results.afterTaxIncome)}
                    centerLabel="take-home / yr"
                  />
                </div>
                <div className="w-full md:flex-1 divide-y" style={{ borderColor: 'rgba(15,41,66,0.07)' }}>
                  {[
                    { label: 'After-Tax Income', value: results.afterTaxIncome, color: '#1DB584' },
                    { label: 'Est. Federal Tax',  value: results.federalTax,    color: '#F59E0B' },
                    { label: provinceTaxLabel,    value: results.provinceTax,   color: '#64748B' },
                  ].map(({ label, value, color }) => {
                    const pct = results.grossIncome > 0 ? Math.round((value / results.grossIncome) * 100) : 0;
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
                  <div className="pt-2">
                    <p className="text-[10px] italic" style={{ color: '#9BA8B5' }}>
                      {isCA
                        ? 'Estimated federal + approx. provincial tax only. Does not include CPP, EI, or other deductions/credits.'
                        : 'Estimated federal + approx. state/local tax only. Does not include FICA, Medicare, or other deductions/credits.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Income After Tax ───────────────────────────────────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Income After Tax
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Gross to After-Tax</h3>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(13,27,42,0.45)' }}>
                How your gross income splits across taxes and take-home
              </p>
            </div>

            {!results && (
              <div className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}>
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter your income to see the comparison.
                </p>
              </div>
            )}

            {results && (() => {
              const g = results.grossIncome;
              const segments = [
                { label: 'After-Tax Income', value: results.afterTaxIncome, color: '#1DB584' },
                { label: 'Est. Federal Tax',  value: results.federalTax,    color: '#F59E0B' },
                { label: provinceTaxLabel,    value: results.provinceTax,   color: '#64748B' },
              ].map((s) => ({ ...s, pct: g > 0 ? (s.value / g) * 100 : 0 }));

              return (
                <div className="flex flex-col flex-1">

                  {/* Large headline */}
                  <div className="mb-4 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>
                      Estimated After-Tax Income
                    </p>
                    <p className="font-extrabold" style={{ color: '#1DB584', fontSize: 'clamp(1.9rem,5vw,2.6rem)', letterSpacing: '-1.5px', lineHeight: 1 }}>
                      {fmtx(results.afterTaxIncome)}
                    </p>
                    <p className="text-xs mt-1.5" style={{ color: '#94a3b8' }}>
                      per year · {results.effectiveRate.toFixed(1)}% effective rate
                    </p>
                  </div>

                  {/* Horizontal pill bar */}
                  <div style={{ height: 36, borderRadius: 50, display: 'flex', overflow: 'hidden', marginBottom: 18 }}>
                    {segments.map((s) =>
                      s.pct > 0 ? (
                        <div
                          key={s.label}
                          style={{ width: `${s.pct.toFixed(2)}%`, background: s.color, flexShrink: 0, transition: 'width 0.6s ease' }}
                        />
                      ) : null
                    )}
                  </div>

                  {/* Stat rows */}
                  <div className="space-y-2 flex-1">
                    {[
                      { label: 'Gross Income',     value: fmt(results.grossIncome),               dotColor: '#CBD5E1', valueColor: '#0D1B2A' },
                      { label: 'After-Tax Income', value: fmt(results.afterTaxIncome),            dotColor: '#1DB584', valueColor: '#1DB584' },
                      { label: 'Est. Federal Tax', value: fmt(results.federalTax),                dotColor: '#F59E0B', valueColor: '#D97706' },
                      { label: provinceTaxLabel,   value: fmt(results.provinceTax),               dotColor: '#64748B', valueColor: '#64748B' },
                      { label: 'Effective Rate',   value: results.effectiveRate.toFixed(1) + '%', dotColor: '#94a3b8', valueColor: '#0D1B2A' },
                    ].map(({ label, value, dotColor, valueColor }) => (
                      <div key={label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: dotColor, flexShrink: 0 }} />
                          <span style={{ fontSize: '12.5px', color: '#4B5563' }}>{label}</span>
                        </div>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: valueColor }}>{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Monthly callout */}
                  <div className="mt-4 rounded-xl px-4 py-3"
                    style={{ background: 'rgba(29,181,132,0.07)', border: '1px solid rgba(29,181,132,0.18)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#1DB584' }}>
                      Est. Monthly Take-Home
                    </p>
                    <p className="text-xl font-extrabold" style={{ color: '#0D1B2A', letterSpacing: '-0.5px' }}>
                      {fmtx(results.monthlyTakeHome)}<span className="text-sm font-semibold text-slate-400">/month</span>
                    </p>
                  </div>
                </div>
              );
            })()}
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
                FinCalc <span style={{ color: '#1DB584' }}>Smart</span> AI Income Tax Analysis
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>
                AI-assisted insights by FinCalc Smart
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={!results || pdfLoading}
              aria-disabled={!results || pdfLoading}
              title={!results ? 'Calculate first to generate a report' : 'Download PDF report'}
              className="inline-flex items-center gap-1.5"
              style={{
                background: '#1DB584', color: '#ffffff', borderRadius: 9999,
                padding: '7px 16px', fontSize: '13px', fontWeight: 700,
                opacity: (!results || pdfLoading) ? 0.65 : 1,
                cursor: (!results || pdfLoading) ? 'not-allowed' : 'pointer',
              }}>
              <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {pdfLoading ? 'Generating…' : 'Download PDF'}
            </button>
            <button disabled aria-disabled="true" title="Coming soon"
              className="inline-flex items-center gap-1.5 cursor-not-allowed select-none"
              style={{ border: '1.5px solid rgba(255,255,255,0.30)', color: 'rgba(255,255,255,0.78)', background: 'rgba(255,255,255,0.06)', borderRadius: 9999, padding: '7px 16px', fontSize: '13px', fontWeight: 700 }}>
              <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden />
              Email Results
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 md:p-5" style={{ background: '#f4f6f9' }}>

          {!results && (
            <div className="flex flex-col items-center justify-center py-10 rounded-2xl gap-3"
              style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.08)' }}>
              <Sparkles className="w-5 h-5" style={{ color: '#1DB584' }} aria-hidden />
              <p className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>
                Enter your income above to get AI tax insights.
              </p>
              <p className="text-xs text-center px-4" style={{ color: '#94a3b8', maxWidth: 340 }}>
                Your Take-Home Clarity Score, effective vs marginal rate breakdown, and monthly take-home will appear here.
              </p>
            </div>
          )}

          {results && (() => {
            // Gauge math — 240° sweep, GR=68
            const GR   = 68;
            const GC   = 2 * Math.PI * GR;
            const GARC = (240 / 360) * GC;
            const GFIL = GARC * (clarityScore / 100);

            const gapBetweenEffAndMarginal = results.marginalFederalRate - results.effectiveRate;

            return (
              <>
                {/* ── Row 1: Clarity Score + Smart Result ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                  {/* Left — Take-Home Clarity Score */}
                  <div className="rounded-2xl p-4 flex flex-col"
                    style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.09)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                        <span className="text-sm font-bold text-slate-800">Take-Home Clarity Score</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                        style={{ background: clarityBg, color: clarityColor }}>
                        {clarityLabel}
                      </span>
                    </div>

                    <div className="flex flex-col items-center flex-1">
                      {/* Gauge */}
                      <div style={{ position: 'relative', width: 200, height: 200, flexShrink: 0 }}>
                        <svg viewBox="0 0 180 180" width="200" height="200" style={{ display: 'block' }} aria-hidden>
                          <circle cx="90" cy="90" r={GR} fill="none"
                            stroke="rgba(15,41,66,0.09)" strokeWidth="12" strokeLinecap="round"
                            strokeDasharray={`${GARC.toFixed(1)} ${(GC - GARC).toFixed(1)}`}
                            transform="rotate(150, 90, 90)"
                          />
                          <circle cx="90" cy="90" r={GR} fill="none"
                            stroke={clarityColor} strokeWidth="12" strokeLinecap="round"
                            strokeDasharray={`${GFIL.toFixed(1)} ${(GC - GFIL).toFixed(1)}`}
                            transform="rotate(150, 90, 90)"
                            style={{ transition: 'stroke-dasharray 0.9s ease' }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingBottom: 20 }}>
                          <span style={{ fontSize: 'clamp(2.4rem, 6vw, 3.2rem)', fontWeight: 800, color: '#0D1B2A', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                            {clarityScore}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500, lineHeight: 1.6 }}>/100</span>
                        </div>
                      </div>

                      {/* Summary line */}
                      <p className="text-center mt-1 mb-2" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(13,27,42,0.50)' }}>
                        Estimated <span style={{ color: clarityColor, fontWeight: 700 }}>{(100 - results.effectiveRate).toFixed(1)}%</span> of gross income retained
                      </p>

                      {/* 3-stat row */}
                      <div className="grid grid-cols-3 gap-2.5 w-full mt-1">
                        {[
                          { label: 'After-Tax',    value: fmtx(results.afterTaxIncome),  color: '#1DB584', bg: 'rgba(29,181,132,0.08)',  border: 'rgba(29,181,132,0.22)'  },
                          { label: 'Total Tax',    value: fmt(results.totalTax),          color: '#D97706', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.22)'  },
                          { label: 'Eff. Rate',    value: results.effectiveRate.toFixed(1) + '%', color: '#1e3a5f', bg: 'rgba(15,41,66,0.05)', border: 'rgba(15,41,66,0.11)' },
                        ].map(({ label, value, color, bg, border }) => (
                          <div key={label} className="rounded-xl text-center"
                            style={{ background: bg, border: `1px solid ${border}`, padding: '10px 4px' }}>
                            <p style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 5 }}>
                              {label}
                            </p>
                            <p style={{ fontSize: '12px', fontWeight: 800, color, lineHeight: 1, letterSpacing: '-0.2px' }}>
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>

                      <p className="text-slate-400 mt-3 text-center" style={{ fontSize: '11px', lineHeight: 1.55 }}>
                        {clarityLabel === 'Low Tax Load'
                          ? `At ${results.effectiveRate.toFixed(1)}% effective rate, a relatively high share of your income is retained as take-home.`
                          : clarityLabel === 'Moderate'
                            ? `At ${results.effectiveRate.toFixed(1)}% effective rate, your take-home share is moderate — typical for this income level.`
                            : `At ${results.effectiveRate.toFixed(1)}% effective rate, a significant portion goes to income taxes in this estimate.`
                        }
                      </p>
                    </div>
                  </div>

                  {/* Right — Dark Result Card */}
                  <div className="rounded-2xl p-4 flex flex-col"
                    style={{ background: 'linear-gradient(145deg, #0D1B2A 0%, #0c1e3a 100%)', border: '1px solid rgba(29,181,132,0.18)', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                      <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#1DB584' }}>
                        Tax Estimate Result
                      </span>
                    </div>

                    <div className="flex flex-col justify-center flex-1">
                      {/* Main number block */}
                      <div className="rounded-xl flex flex-col items-center justify-center px-4 py-5 mb-3"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                        <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.40)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
                          Est. Take-Home Income
                        </p>
                        <span className="font-extrabold tabular-nums"
                          style={{ fontSize: 'clamp(1.9rem, 5vw, 2.6rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                          {fmtx(results.afterTaxIncome)}
                        </span>
                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>per year</p>
                      </div>

                      {/* Secondary stats */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="flex flex-col justify-center rounded-xl px-3 py-2.5"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '0.95rem', lineHeight: 1.2 }}>
                            {results.effectiveRate.toFixed(1)}%
                          </div>
                          <div className="text-slate-400 text-xs">Effective tax rate</div>
                        </div>
                        <div className="flex flex-col justify-center rounded-xl px-3 py-2.5"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '0.95rem', lineHeight: 1.2 }}>
                            {results.marginalFederalRate}%
                          </div>
                          <div className="text-slate-400 text-xs">Marginal federal rate</div>
                        </div>
                      </div>

                      <div className="rounded-xl px-3 py-2.5 mb-3"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Income band</p>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{results.incomeBand}</p>
                      </div>

                      <p className="text-[11px] italic leading-relaxed" style={{ color: 'rgba(255,255,255,0.28)' }}>
                        {TAX_YEAR} estimate · Employment income only · Does not include payroll deductions, credits, or deductions.
                      </p>
                    </div>
                  </div>

                </div>{/* end Row 1 */}

                {/* ── Row 2: Three Insight Cards ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  {/* Effective vs Marginal Rate */}
                  <div className="rounded-2xl p-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="flex items-center justify-center shrink-0"
                        style={{ width: 28, height: 28, borderRadius: 8, background: '#dcfce7' }}>
                        <TrendingDown className="w-3.5 h-3.5 text-emerald-600" aria-hidden />
                      </span>
                      <p className="text-xs font-bold text-emerald-700">Effective vs Marginal Rate</p>
                    </div>
                    <p className="text-[13px] font-bold text-emerald-800 mb-1">
                      {results.effectiveRate.toFixed(1)}% effective · {results.marginalFederalRate}% marginal
                    </p>
                    <p className="text-[12px] text-slate-600 leading-relaxed">
                      Your effective tax rate ({results.effectiveRate.toFixed(1)}%) is what you actually pay as a share of gross income.
                      Your marginal federal rate ({results.marginalFederalRate}%) applies only to the last dollar earned.
                      {gapBetweenEffAndMarginal > 0
                        ? <> The {gapBetweenEffAndMarginal.toFixed(1)}% gap exists because lower brackets apply to earlier income — not all income is taxed at {results.marginalFederalRate}%.</>
                        : null
                      }
                    </p>
                  </div>

                  {/* Monthly Take-Home View */}
                  <div className="rounded-2xl p-4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="flex items-center justify-center shrink-0"
                        style={{ width: 28, height: 28, borderRadius: 8, background: '#e0f2fe' }}>
                        <Info className="w-3.5 h-3.5 text-sky-600" aria-hidden />
                      </span>
                      <p className="text-xs font-bold text-sky-700">Monthly Take-Home View</p>
                    </div>
                    <p className="text-[13px] font-bold text-sky-800 mb-1">
                      Approx. {fmtx(results.monthlyTakeHome)}/month
                    </p>
                    <p className="text-[12px] text-slate-600 leading-relaxed">
                      Based on this estimate, your {fmt(results.afterTaxIncome)} annual after-tax income averages{' '}
                      <strong className="text-sky-700">{fmtx(results.monthlyTakeHome)}/month</strong>.
                      Actual monthly take-home will differ based on payroll timing, deductions, and employer setup.
                    </p>
                  </div>

                  {/* Tax Estimate Limits — required */}
                  <div className="rounded-2xl p-4" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="flex items-center justify-center shrink-0"
                        style={{ width: 28, height: 28, borderRadius: 8, background: '#fef3c7' }}>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" aria-hidden />
                      </span>
                      <p className="text-xs font-bold text-amber-700">Tax Estimate Limits</p>
                    </div>
                    <p className="text-[13px] font-bold text-amber-800 mb-1">Not included in this estimate</p>
                    <ul className="text-[11.5px] text-slate-600 leading-relaxed space-y-0.5 list-none">
                      {[
                        isCA ? 'CPP and EI premiums' : 'FICA and Medicare',
                        'Personal deductions or credits',
                        isCA ? 'RRSP / TFSA deductions' : '401(k) / IRA deductions',
                        isCA ? 'Actual provincial brackets' : 'State bracket progression',
                        'Capital gains or investment income',
                        'Self-employment or business income',
                        isCA ? 'Provincial surtaxes or credits' : 'AMT or itemized deductions',
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-1.5">
                          <span style={{ color: '#D97706', marginTop: 2, flexShrink: 0 }}>·</span>
                          {item}
                        </li>
                      ))}
                    </ul>
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
            This analysis is for educational and illustrative purposes only. Tax rates, brackets, and credits change annually.
            Results do not reflect payroll deductions, personal credits, RRSP/401(k) contributions, capital gains, or province/state-specific rules.
            This is not tax, legal, or financial advice.
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
        This calculator provides educational estimates only. Tax rates, brackets, and credits change annually. Results do not account
        for personal deductions, tax credits, payroll deductions, benefit adjustments, RRSP/401(k) contributions, capital gains,
        self-employment income, or province/state-specific surtaxes and credits. Actual taxes owed depend on your complete financial
        picture. This is not tax, legal, accounting, or financial advice. Use official CRA or IRS tools, or consult a qualified tax
        professional, for official tax calculations.
      </p>

    </div>
  );
}
