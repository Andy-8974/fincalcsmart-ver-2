'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { NumericInput, Tooltip } from '../_mortgage-shared/ui';
import { fmtCAD, fmtCADx } from '../_mortgage-shared/math';
import MobileCalcCTA from '@/components/ui/MobileCalcCTA';
import CalculatorFaqAccordion from '@/components/layout/CalculatorFaqAccordion';
import {
  Activity, AlertTriangle, BookOpen, Download,
  HelpCircle, Landmark, Mail, ShieldAlert, Sparkles, TrendingUp, Zap,
} from 'lucide-react';
import { buildCanadaRegisteredPDF } from '@/lib/pdf/adapters/canadaRegisteredAdapter';

// ─── Types ────────────────────────────────────────────────────────────────────

type FreqKey = 'annually' | 'semi' | 'monthly' | 'daily';

interface FormState {
  currentBalance:      string;
  availableRoom:       string;
  plannedOneTime:      string;
  monthlyContribution: string;
  marginalTaxRate:     string;
  annualRate:          string;
}

interface RRSPResults {
  currentBalance:      number;
  availableRoom:       number;
  plannedOneTime:      number;
  monthlyContribution: number;
  marginalTaxRate:     number;
  annualRate:          number;
  freq:                FreqKey;
  yearsInvested:       number;
  effectiveMonthlyRate: number;
  // Growth
  effectivePrincipal:  number;
  projectedValue:      number;
  totalContributions:  number;
  investmentGrowth:    number;
  growthPct:           number;
  // Room (first-year)
  plannedFirstYear:    number;
  roomRemaining:       number;
  roomUsedPct:         number;
  overRoom:            boolean;
  overRoomBy:          number;
  // Tax refund estimate
  taxRefundBase:       number; // portion of first-year plan that is within room
  estimatedTaxRefund:  number;
  // Growth score
  growthScore:         number;
  growthLabel:         'Excellent' | 'Good' | 'Fair' | 'Poor';
  growthStatus:        'Healthy' | 'Watch' | 'Caution';
  growthColor:         string;
  growthBg:            string;
  // Room gauge
  roomGaugeColor: string;
  roomGaugeBg:    string;
  roomBadge:      string;
  // Smart lever
  leverState: 'over-room' | 'room-opportunity' | 'room-nearly-used' | 'no-room';
  // Inline pill
  roomPillState: 'over' | 'full' | 'remaining' | 'no-room-entered';
  // Milestones
  valAt10: number; growthAt10: number;
  valAt20: number; growthAt20: number;
  valAt30: number; growthAt30: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULTS: FormState = {
  currentBalance:      '25000',
  availableRoom:       '33810',
  plannedOneTime:      '10000',
  monthlyContribution: '500',
  marginalTaxRate:     '33',
  annualRate:          '6',
};

const DEFAULT_YEARS = 20;
const YEAR_OPTIONS  = [5, 10, 15, 20, 30] as const;
const DEFAULT_FREQ: FreqKey = 'monthly';

const FREQ_OPTIONS: { key: FreqKey; label: string; periods: number }[] = [
  { key: 'annually', label: 'Annually',  periods: 1   },
  { key: 'semi',     label: 'Semi-Ann.', periods: 2   },
  { key: 'monthly',  label: 'Monthly',   periods: 12  },
  { key: 'daily',    label: 'Daily',     periods: 365 },
];

// ─── Math helpers ─────────────────────────────────────────────────────────────

function safe(n: number): number {
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function fmtOverage(n: number): string {
  return n > 0 && n < 1 ? fmtCADx(n) : fmtCAD(n);
}

function getEffectiveMonthlyRate(annualRatePct: number, periods: number): number {
  if (Math.abs(annualRatePct) < 1e-10) return 0;
  const eAR = Math.pow(1 + annualRatePct / 100 / periods, periods) - 1;
  const eMR = Math.pow(1 + eAR, 1 / 12) - 1;
  return Number.isFinite(eMR) ? eMR : 0;
}

function calcFVRate(r: number, months: number, principal: number, monthly: number): number {
  if (months <= 0) return Math.max(0, principal);
  if (Math.abs(r) < 1e-10) return Math.max(0, principal + monthly * months);
  const growth = Math.pow(1 + r, months);
  if (!Number.isFinite(growth)) return Math.max(0, principal + monthly * months);
  return Math.max(0, principal * growth + monthly * (growth - 1) / r);
}

function parseAmt(s: string): number {
  const n = parseFloat(s);
  return Math.max(0, Math.min(Number.isFinite(n) ? n : 0, Number.MAX_SAFE_INTEGER));
}

function computeResults(form: FormState, freq: FreqKey, yearsInvested: number): RRSPResults | null {
  const currentBalance      = parseAmt(form.currentBalance);
  const availableRoom       = parseAmt(form.availableRoom);
  const plannedOneTime      = parseAmt(form.plannedOneTime);
  const monthlyContribution = parseAmt(form.monthlyContribution);
  const marginalTaxRate     = Math.max(0, Math.min(100, parseFloat(form.marginalTaxRate) || 0));
  const annualRate          = Math.max(0, Math.min(49.9, parseFloat(form.annualRate)     || 0));

  if (currentBalance <= 0 && plannedOneTime <= 0 && monthlyContribution <= 0) return null;

  const periods = FREQ_OPTIONS.find(f => f.key === freq)!.periods;
  const r       = getEffectiveMonthlyRate(annualRate, periods);
  const months  = yearsInvested * 12;

  // ── Growth projection ──
  const effectivePrincipal = currentBalance + plannedOneTime;
  const projectedValue     = calcFVRate(r, months, effectivePrincipal, monthlyContribution);
  const totalContributions = Math.max(0, effectivePrincipal + monthlyContribution * months);
  const investmentGrowth   = Math.max(0, projectedValue - totalContributions);
  const growthPct          = totalContributions > 0 ? (investmentGrowth / totalContributions) * 100 : 0;

  // ── Room check (first-year only) ──
  const plannedFirstYear = plannedOneTime + monthlyContribution * 12;
  const roomRemaining    = availableRoom > 0 ? Math.max(0, availableRoom - plannedFirstYear) : 0;
  const roomUsedPct      = availableRoom > 0 ? Math.min(110, (plannedFirstYear / availableRoom) * 100) : 0;
  const overRoom         = availableRoom > 0 && plannedFirstYear > availableRoom;
  const overRoomBy       = overRoom ? plannedFirstYear - availableRoom : 0;

  // ── Estimated tax refund — based on in-room portion only ──
  const taxRefundBase      = availableRoom > 0 ? Math.min(plannedFirstYear, availableRoom) : 0;
  const estimatedTaxRefund = taxRefundBase * (marginalTaxRate / 100);

  // ── Growth score ──
  const growthScore = Math.round(Math.min(100, growthPct * 1.5));
  const growthLabel: RRSPResults['growthLabel'] =
    growthScore >= 80 ? 'Excellent' : growthScore >= 65 ? 'Good' : growthScore >= 45 ? 'Fair' : 'Poor';
  const growthStatus: RRSPResults['growthStatus'] =
    growthLabel === 'Poor' ? 'Caution' : growthLabel === 'Fair' ? 'Watch' : 'Healthy';
  const growthColor = growthStatus === 'Healthy' ? '#1DB584' : growthStatus === 'Watch' ? '#f59e0b' : '#ef4444';
  const growthBg    = growthStatus === 'Healthy' ? 'rgba(29,181,132,0.10)' : growthStatus === 'Watch' ? 'rgba(245,158,11,0.10)' : 'rgba(239,68,68,0.10)';

  // ── Room gauge ──
  const roomGaugeColor = overRoom ? '#ef4444' : roomUsedPct >= 85 ? '#f59e0b' : '#1DB584';
  const roomGaugeBg    = overRoom ? 'rgba(239,68,68,0.10)' : roomUsedPct >= 85 ? 'rgba(245,158,11,0.10)' : 'rgba(29,181,132,0.10)';
  const roomBadge      = availableRoom === 0 ? 'Not Entered' : overRoom ? 'Over Limit' : roomRemaining <= 0 ? 'Fully Used' : roomUsedPct >= 85 ? 'Nearly Full' : roomUsedPct > 0 ? 'Partial' : 'Unused';

  // ── Lever state ──
  const leverState: RRSPResults['leverState'] =
    availableRoom === 0 ? 'no-room' :
    overRoom            ? 'over-room' :
    roomRemaining > 500 ? 'room-opportunity' :
    'room-nearly-used';

  // ── Pill state ──
  const roomPillState: RRSPResults['roomPillState'] =
    availableRoom === 0 ? 'no-room-entered' :
    overRoom            ? 'over' :
    roomRemaining === 0 ? 'full' :
    'remaining';

  // ── Milestones ──
  function milestoneVal(yr: number) {
    const m  = yr * 12;
    const fv = calcFVRate(r, m, effectivePrincipal, monthlyContribution);
    const tc = Math.max(0, effectivePrincipal + monthlyContribution * m);
    return { fv, growth: Math.max(0, fv - tc) };
  }
  const { fv: valAt10, growth: growthAt10 } = milestoneVal(10);
  const { fv: valAt20, growth: growthAt20 } = milestoneVal(20);
  const { fv: valAt30, growth: growthAt30 } = milestoneVal(30);

  return {
    currentBalance, availableRoom, plannedOneTime, monthlyContribution, marginalTaxRate, annualRate,
    freq, yearsInvested, effectiveMonthlyRate: r,
    effectivePrincipal, projectedValue, totalContributions, investmentGrowth, growthPct,
    plannedFirstYear, roomRemaining, roomUsedPct, overRoom, overRoomBy,
    taxRefundBase, estimatedTaxRefund,
    growthScore, growthLabel, growthStatus, growthColor, growthBg,
    roomGaugeColor, roomGaugeBg, roomBadge,
    leverState, roomPillState,
    valAt10, growthAt10, valAt20, growthAt20, valAt30, growthAt30,
  };
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  border: '1px solid rgba(15,41,66,0.09)',
  borderRadius: '20px',
  background: '#ffffff',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 2px 10px rgba(0,0,0,0.03)',
};

const inputClsBase =
  'w-full rounded-brand-sm border-[1.5px] border-brand-gray-200 text-brand-navy bg-brand-gray-50 ' +
  'px-3 py-2.5 text-sm transition-colors duration-150 ' +
  'focus:outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/[0.15]';

const inputClsCompact = inputClsBase
  .replace('py-2.5', 'py-1 md:py-2')
  .replace('px-3', 'pr-2 md:pr-3 pl-3');

const navyLabelStyle: React.CSSProperties = {
  fontWeight: 700, color: '#0D1B2A',
  display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4,
};
const navyLabelCls = 'text-[10px] md:text-xs';

// ─── Props ────────────────────────────────────────────────────────────────────

interface RRSPCalculatorProps {
  formulaContent?: ReactNode;
  faqItems?: Array<{ question: string; answer: string }>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RRSPSavingsCalculator({
  formulaContent,
  faqItems = [],
}: RRSPCalculatorProps) {
  const [form, setForm]   = useState<FormState>(DEFAULTS);
  const [freq, setFreq]   = useState<FreqKey>(DEFAULT_FREQ);
  const [yearsInvested, setYears] = useState<number>(DEFAULT_YEARS);
  const [aiCtaHovered, setAiCtaHovered] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const results = useMemo(
    () => computeResults(form, freq, yearsInvested),
    [form, freq, yearsInvested],
  );

  async function handleDownloadPDF() {
    if (!results || pdfLoading) return;
    setPdfLoading(true);
    try {
      await buildCanadaRegisteredPDF({
        accountType:         'rrsp',
        currentBalance:      results.currentBalance,
        availableRoom:       results.availableRoom,
        plannedOneTime:      results.plannedOneTime,
        monthlyContribution: results.monthlyContribution,
        annualRate:          results.annualRate,
        freq:                results.freq,
        yearsInvested:       results.yearsInvested,
        projectedValue:      results.projectedValue,
        totalContributions:  results.totalContributions,
        taxFreeGrowth:       results.investmentGrowth,
        growthPct:           results.growthPct,
        plannedFirstYear:    results.plannedFirstYear,
        roomUsedPct:         results.roomUsedPct,
        overRoom:            results.overRoom,
        overRoomBy:          results.overRoomBy,
        growthScore:         results.growthScore,
        growthLabel:         results.growthLabel,
        marginalTaxRate:     results.marginalTaxRate,
        estimatedTaxRefund:  results.estimatedTaxRefund,
        valAt10:             results.valAt10,
        valAt20:             results.valAt20,
        valAt30:             results.valAt30,
      });
    } catch (e) {
      console.error('PDF generation failed', e);
    } finally {
      setPdfLoading(false);
    }
  }

  function scrollToAI() {
    const el = document.getElementById('ai-analysis');
    if (!el) return;
    const navH = (document.querySelector('header') as HTMLElement | null)?.getBoundingClientRect().height ?? 64;
    window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - navH - 16), behavior: 'smooth' });
  }

  return (
    <div className="flex flex-col gap-y-7 md:gap-y-8 min-w-0">

      <style>{`
        @keyframes teal-glow-rrsp {
          0%, 100% { box-shadow: 0 0 0 1px rgba(29,181,132,0.3), 0 0 14px rgba(29,181,132,0.12); }
          50%       { box-shadow: 0 0 0 1px rgba(29,181,132,0.6), 0 0 26px rgba(29,181,132,0.28); }
        }
        .btn-ai-cta-rrsp {
          animation: teal-glow-rrsp 2.8s ease-in-out infinite;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }
        .btn-ai-cta-rrsp:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 0 1px rgba(29,181,132,0.75), 0 0 32px rgba(29,181,132,0.38) !important;
          animation: none;
        }
        .rrsp-pill      { flex: 1; min-width: 0; text-align: center; }
        .rrsp-year-pill { flex: 1; min-width: 0; text-align: center; }
        .rrsp-pills     { display: flex; flex-wrap: wrap; gap: 6px; }
      `}</style>

      {/* ══ Block A: Input Card (7) + Results Card (5) ═══════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6">

        {/* ── Input Card ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-7 lg:self-start" style={cardStyle}>
          <div className="p-5 md:p-6">

            <div className="flex items-center gap-3 mb-4 md:mb-5">
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: 'linear-gradient(135deg,#1DB584 0%,#0ea56e 100%)',
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(29,181,132,0.30)',
              }}>
                <Landmark size={15} color="white" strokeWidth={2.2} aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                  Canada · Registered Account
                </p>
                <p className="text-base font-bold" style={{ color: '#0D1B2A' }}>RRSP Details</p>
              </div>
            </div>

            {/* ── Row 1: Balance + Room | One-Time + Rate ── */}
            <div className="grid grid-cols-2 gap-x-3 md:gap-x-5 mb-3">

              {/* Left */}
              <div className="space-y-3 min-w-0">
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Current RRSP Balance
                    <Tooltip text="The current value of your RRSP account. This is your starting balance for the projection." />
                  </label>
                  <NumericInput
                    value={form.currentBalance}
                    onChange={(v) => set('currentBalance', v)}
                    prefix="CA$"
                    inputClassName={inputClsCompact}
                  />
                </div>
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    RRSP Deduction Room
                    <Tooltip text="Your available RRSP deduction room as shown in CRA My Account or your Notice of Assessment. This calculator does not calculate or verify your exact CRA room." />
                  </label>
                  <NumericInput
                    value={form.availableRoom}
                    onChange={(v) => set('availableRoom', v)}
                    prefix="CA$"
                    inputClassName={inputClsCompact}
                  />
                  <p className="mt-0.5 text-[10px]" style={{ color: '#9BA8B5' }}>From CRA My Account / NOA</p>
                </div>
              </div>

              {/* Right */}
              <div className="border-l pl-2 md:pl-5 space-y-3 min-w-0" style={{ borderColor: 'rgba(15,41,66,0.08)' }}>
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    One-Time Contribution
                    <Tooltip text="A lump sum you plan to contribute now. Checked against your entered deduction room together with your first year of monthly contributions." />
                  </label>
                  <NumericInput
                    value={form.plannedOneTime}
                    onChange={(v) => set('plannedOneTime', v)}
                    prefix="CA$"
                    inputClassName={inputClsCompact}
                  />
                </div>
                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Annual Return
                    <Tooltip text="Assumed annual growth rate for this illustration. Actual RRSP returns depend on your investments and are not guaranteed." />
                  </label>
                  <NumericInput
                    value={form.annualRate}
                    onChange={(v) => set('annualRate', v)}
                    suffix="%"
                    inputClassName={inputClsCompact}
                  />
                  <p className="mt-0.5 text-[10px]" style={{ color: '#9BA8B5' }}>Applied to projection</p>
                </div>
              </div>

            </div>

            {/* ── Row 2: Monthly + Marginal Rate ── */}
            <div className="grid grid-cols-2 gap-x-3 md:gap-x-5 mb-4">
              <div className="min-w-0">
                <label className={navyLabelCls} style={navyLabelStyle}>
                  Monthly Contribution
                  <Tooltip text="An amount added to your RRSP each month. The first 12 months are included in the first-year deduction room check." />
                </label>
                <NumericInput
                  value={form.monthlyContribution}
                  onChange={(v) => set('monthlyContribution', v)}
                  prefix="CA$"
                  inputClassName={inputClsCompact}
                />
                <p className="mt-0.5 text-[10px]" style={{ color: '#9BA8B5' }}>Ongoing after one-time</p>
              </div>
              <div className="border-l pl-2 md:pl-5 min-w-0" style={{ borderColor: 'rgba(15,41,66,0.08)' }}>
                <label className={navyLabelCls} style={navyLabelStyle}>
                  Marginal Tax Rate
                  <Tooltip text="Your combined federal + provincial marginal tax rate. Used only for the simplified tax refund estimate. Check your Notice of Assessment or a provincial tax table. This is not tax advice." />
                </label>
                <NumericInput
                  value={form.marginalTaxRate}
                  onChange={(v) => set('marginalTaxRate', v)}
                  suffix="%"
                  inputClassName={inputClsCompact}
                />
                <p className="mt-0.5 text-[10px]" style={{ color: '#9BA8B5' }}>Federal + provincial combined</p>
              </div>
            </div>

            {/* ── Pill groups ── */}
            <div className="pt-3 space-y-3" style={{ borderTop: '1px solid rgba(15,41,66,0.07)' }}>
              <div>
                <label className={navyLabelCls} style={navyLabelStyle}>
                  Compound Frequency
                  <Tooltip text="How often returns are compounded in this projection." />
                </label>
                <div className="rrsp-pills">
                  {FREQ_OPTIONS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      className="rrsp-pill font-semibold text-xs py-1.5 rounded-lg transition-colors duration-150"
                      onClick={() => setFreq(f.key)}
                      style={
                        freq === f.key
                          ? { background: '#1DB584', color: '#fff', border: '1.5px solid #1DB584' }
                          : { background: 'rgba(15,41,66,0.04)', color: '#4B5563', border: '1.5px solid rgba(15,41,66,0.10)' }
                      }
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={navyLabelCls} style={navyLabelStyle}>
                  Investment Horizon
                </label>
                <div className="rrsp-pills">
                  {YEAR_OPTIONS.map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      className="rrsp-year-pill font-semibold text-xs py-1.5 rounded-lg transition-colors duration-150"
                      onClick={() => setYears(yr)}
                      style={
                        yearsInvested === yr
                          ? { background: '#1DB584', color: '#fff', border: '1.5px solid #1DB584' }
                          : { background: 'rgba(15,41,66,0.04)', color: '#4B5563', border: '1.5px solid rgba(15,41,66,0.10)' }
                      }
                    >
                      {yr}yr
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile CTA */}
        <div className="lg:hidden">
          <MobileCalcCTA />
        </div>

        {/* ── Results Card ─────────────────────────────────────────────────── */}
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
                  Enter an RRSP balance or contribution amount to see your projection.
                </p>
              </div>
            )}

            {results && (
              <div className="flex flex-col flex-1 gap-4">

                {/* Hero: Projected RRSP Value */}
                <div
                  className="rounded-xl p-4"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(29,181,132,0.18)' }}
                >
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(29,181,132,0.7)' }}>
                    Projected RRSP Value
                  </p>
                  <p style={{ color: '#1DB584', fontSize: '36px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1, marginTop: 6 }}>
                    {fmtCAD(safe(results.projectedValue))}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '11px', marginTop: 4, fontWeight: 500 }}>
                    after {results.yearsInvested} years · tax-deferred growth illustration
                  </p>
                </div>

                {/* Stats */}
                <div className="space-y-0 px-1 divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#334155' }} />
                      <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Estimated Investment Growth</span>
                    </div>
                    <span className="text-[13px] font-semibold text-white">{fmtCAD(safe(results.investmentGrowth))}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px] text-slate-300">Total Contributions</span>
                    <span className="text-[13px] font-bold text-white">{fmtCAD(safe(results.totalContributions))}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px] text-slate-300">First-Year Contribution Plan</span>
                    <span className="text-[13px] font-semibold text-white">{fmtCAD(safe(results.plannedFirstYear))}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px] text-slate-300">Room After First-Year Plan</span>
                    <span
                      className="text-[13px] font-semibold"
                      style={{
                        color: results.overRoom ? '#f59e0b'
                          : results.roomRemaining === 0 && results.availableRoom > 0 ? '#f59e0b'
                          : results.availableRoom === 0 ? 'rgba(255,255,255,0.4)'
                          : '#1DB584',
                      }}
                    >
                      {results.availableRoom === 0 ? '—'
                        : results.overRoom ? `-${fmtOverage(results.overRoomBy)}`
                        : fmtCAD(safe(results.roomRemaining))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Estimated Tax Reduction</span>
                    <span className="text-[13px] font-semibold" style={{ color: '#1DB584' }}>
                      {results.marginalTaxRate > 0 && results.availableRoom > 0 ? fmtCAD(safe(results.estimatedTaxRefund)) : '—'}
                    </span>
                  </div>
                </div>

                {/* Room pill */}
                {(() => {
                  const { roomPillState } = results;
                  const pillStyle: React.CSSProperties =
                    roomPillState === 'over'
                      ? { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.30)', color: '#ef4444' }
                      : roomPillState === 'full'
                        ? { background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.30)', color: '#f59e0b' }
                        : roomPillState === 'remaining'
                          ? { background: 'rgba(29,181,132,0.12)', border: '1px solid rgba(29,181,132,0.25)', color: '#1DB584' }
                          : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.45)' };
                  const pillText =
                    roomPillState === 'over'
                      ? `⚠ Exceeds entered room by ${fmtOverage(results.overRoomBy)}`
                      : roomPillState === 'full'
                        ? 'Deduction room fully used after first-year plan'
                        : roomPillState === 'remaining'
                          ? `Room remaining: ${fmtCAD(safe(results.roomRemaining))}`
                          : 'Enter deduction room above to check';
                  return (
                    <div className="flex items-center justify-center rounded-xl py-2 px-3" style={pillStyle}>
                      <span style={{ fontSize: '12px', fontWeight: 700 }}>{pillText}</span>
                    </div>
                  );
                })()}

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)' }} />

                <div className="pt-1">
                  <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.52)', marginBottom: 8, fontStyle: 'italic' }}>
                    See your RRSP growth potential, room analysis, and tax refund estimate.
                  </p>
                  <button
                    className="btn-ai-cta-rrsp w-full font-bold overflow-hidden"
                    onClick={scrollToAI}
                    onMouseEnter={() => setAiCtaHovered(true)}
                    onMouseLeave={() => setAiCtaHovered(false)}
                    style={{
                      position: 'relative',
                      background: '#060F1A',
                      color: '#ffffff',
                      borderRadius: 8,
                      height: 40,
                      fontSize: '13px',
                      border: '1px solid rgba(29,181,132,0.4)',
                    }}
                  >
                    <span style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      whiteSpace: 'nowrap',
                      opacity: aiCtaHovered ? 0 : 1,
                      transition: 'opacity 200ms ease',
                      pointerEvents: 'none',
                    }}>
                      Review RRSP Insights ↓
                    </span>
                    <span style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      whiteSpace: 'nowrap',
                      opacity: aiCtaHovered ? 1 : 0,
                      transition: 'opacity 200ms ease',
                      pointerEvents: 'none',
                    }}>
                      <Sparkles size={13} style={{ marginRight: 6, color: '#1DB584' }} aria-hidden />
                      See AI RRSP Analysis ↓
                    </span>
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>

      {/* ══ Block C: RRSP Growth Breakdown + Room & Tax Refund ══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">

        {/* ── Left: RRSP Growth Composition (stacked bar) ───────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4 md:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Growth composition
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>RRSP Growth Composition</h3>
            </div>

            {!results && (
              <div className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}>
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter details to see the growth composition.
                </p>
              </div>
            )}

            {results && (() => {
              const total      = safe(results.projectedValue);
              const contrib    = safe(results.totalContributions);
              const growth     = safe(results.investmentGrowth);
              const contribPct = total > 0 ? Math.max(2, Math.round((contrib / total) * 100)) : 50;
              const growthPct  = total > 0 ? 100 - contribPct : 50;

              const segments = [
                { label: 'Total Contributions', value: contrib, pct: contribPct, color: '#1a3a52', textColor: '#ffffff' },
                { label: 'Investment Growth',   value: growth,  pct: growthPct,  color: '#1DB584', textColor: '#ffffff' },
              ];

              return (
                <div className="flex flex-col flex-1 gap-5">

                  {/* Centered value block */}
                  <div className="flex flex-col items-center text-center">
                    <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4 }}>
                      Projected RRSP Value
                    </p>
                    <p style={{ color: '#0D1B2A', fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1 }}>
                      {fmtCAD(total)}
                    </p>
                    <p style={{ color: '#94a3b8', fontSize: '11px', marginTop: 5, fontWeight: 500 }}>
                      after {results.yearsInvested} yr · {results.annualRate}% annual return assumed
                    </p>
                  </div>

                  {/* Pill composition bar */}
                  <div>
                    <div style={{ padding: 3, borderRadius: 999, background: 'rgba(15,41,66,0.10)' }}>
                      <div className="flex w-full overflow-hidden" style={{ height: 48, borderRadius: 999 }}>
                        {segments.map((s, i) => (
                          <div
                            key={s.label}
                            style={{
                              width: `${s.pct}%`,
                              background: s.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: i === 0 ? '999px 0 0 999px' : '0 999px 999px 0',
                              overflow: 'hidden',
                              transition: 'width 0.8s ease',
                            }}
                          >
                            {s.pct >= 18 && (
                              <span style={{ fontSize: '15px', fontWeight: 700, color: s.textColor, whiteSpace: 'nowrap', padding: '0 12px' }}>
                                {s.pct}%
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Legend */}
                    <div className="flex justify-center flex-wrap gap-x-5 gap-y-1 mt-2.5">
                      {segments.map((s) => (
                        <div key={s.label} className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
                          <span style={{ fontSize: '11px', color: '#6B7A8D' }}>{s.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stat rows */}
                  <div className="divide-y" style={{ borderColor: 'rgba(15,41,66,0.07)' }}>
                    {segments.map((s) => (
                      <div key={s.label} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
                          <span style={{ color: '#4B5563', fontSize: '12.5px' }}>{s.label}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-slate-400">{s.pct}%</span>
                          <span className="font-semibold" style={{ color: s.color, fontSize: '12.5px' }}>{fmtCAD(safe(s.value))}</span>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between py-1.5">
                      <span className="font-semibold text-slate-700" style={{ fontSize: '12.5px' }}>Projected RRSP Value</span>
                      <span className="font-bold" style={{ color: '#0D1B2A', fontSize: '12.5px' }}>{fmtCAD(total)}</span>
                    </div>
                    <div className="pt-1.5 pb-0.5">
                      <p className="text-[10.5px] leading-relaxed" style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                        Tax-deferred growth illustration at {results.annualRate}% annual return. Actual returns vary.
                        Growth is not taxed within the RRSP — withdrawals are taxed as income.
                      </p>
                    </div>
                  </div>

                </div>
              );
            })()}
          </div>
        </div>

        {/* ── Right: Contribution Room + Tax Refund Impact ───────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4 md:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                First-year room check · tax estimate
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Contribution Room + Tax Refund Impact</h3>
            </div>

            {!results && (
              <div className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}>
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter details to see room usage and tax refund estimate.
                </p>
              </div>
            )}

            {results && (() => {
              const { availableRoom, plannedFirstYear, roomRemaining, overRoom, overRoomBy, roomUsedPct, roomGaugeColor, roomBadge, roomGaugeBg } = results;
              // Semi-circle gauge — same dimensions as Retirement Goal Progress
              const SEMI_R = 88, CX = 104, CY = 100;
              const SEMI_C = Math.PI * SEMI_R;
              const ratio   = availableRoom > 0 ? Math.min(1, roomUsedPct / 100) : 0;
              const fillAmt = ratio * SEMI_C;
              const trackPath = `M ${CX - SEMI_R} ${CY} A ${SEMI_R} ${SEMI_R} 0 0 1 ${CX + SEMI_R} ${CY}`;
              return (
                <div className="flex flex-col flex-1 gap-2">

                  {/* Semi-circle room gauge */}
                  <div className="flex flex-col items-center">
                    {availableRoom === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6 gap-2 rounded-xl w-full"
                        style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}>
                        <p className="text-sm font-semibold text-center" style={{ color: '#0D1B2A' }}>Enter deduction room above</p>
                        <p className="text-xs text-center px-4" style={{ color: '#94a3b8' }}>Check CRA My Account or your Notice of Assessment for your available RRSP deduction room.</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-1 w-full">
                          <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>First-Year Room Used</p>
                          <span className="ml-auto px-2 py-0.5 rounded-full shrink-0"
                            style={{ fontSize: '10px', fontWeight: 700, background: roomGaugeBg, color: roomGaugeColor }}>
                            {roomBadge}
                          </span>
                        </div>
                        <div style={{ position: 'relative', width: CX * 2, maxWidth: '100%' }}>
                          <svg viewBox={`0 0 ${CX * 2} ${CY + 10}`} width="100%" style={{ display: 'block' }} aria-hidden>
                            <path d={trackPath} fill="none"
                              stroke="rgba(15,41,66,0.09)" strokeWidth="22" strokeLinecap="round" />
                            <path d={trackPath} fill="none"
                              stroke={roomGaugeColor} strokeWidth="22" strokeLinecap="round"
                              strokeDasharray={`${fillAmt.toFixed(1)} 1000`}
                              style={{ transition: 'stroke-dasharray 0.9s ease' }} />
                          </svg>
                          <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            paddingBottom: 0,
                          }}>
                            <span style={{ fontSize: '2rem', fontWeight: 800, color: overRoom ? roomGaugeColor : '#0D1B2A', lineHeight: 1 }}>
                              {overRoom ? '100%+' : `${Math.min(100, Math.round(roomUsedPct))}%`}
                            </span>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500, marginTop: 2 }}>
                              {overRoom ? 'over limit' : 'of room used'}
                            </span>
                          </div>
                        </div>
                        {/* Status badge */}
                        <span className="mt-2 px-3 py-1 rounded-full text-xs font-bold"
                          style={{ background: roomGaugeBg, color: roomGaugeColor }}>
                          {roomBadge}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Room + refund rows — condensed */}
                  <div className="divide-y" style={{ borderColor: 'rgba(15,41,66,0.07)' }}>
                    <div className="flex items-center justify-between py-1">
                      <span style={{ color: '#4B5563', fontSize: '12.5px' }}>Deduction Room (entered)</span>
                      <span className="font-semibold" style={{ color: '#0D1B2A', fontSize: '12.5px' }}>
                        {availableRoom === 0 ? '—' : fmtCAD(safe(availableRoom))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span style={{ color: '#4B5563', fontSize: '12.5px' }}>First-Year Plan</span>
                      <span className="font-semibold" style={{ color: overRoom ? '#ef4444' : '#0D1B2A', fontSize: '12.5px' }}>
                        {fmtCAD(safe(plannedFirstYear))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span style={{ color: '#4B5563', fontSize: '12.5px' }}>Room Remaining</span>
                      <span className="font-semibold" style={{
                        color: overRoom ? '#ef4444' : roomRemaining === 0 && availableRoom > 0 ? '#f59e0b' : '#1DB584',
                        fontSize: '12.5px',
                      }}>
                        {availableRoom === 0 ? '—' : overRoom ? `-${fmtOverage(overRoomBy)}` : fmtCAD(safe(roomRemaining))}
                      </span>
                    </div>
                    <div className="flex items-start justify-between py-1 gap-2">
                      <div className="min-w-0">
                        <span style={{ color: '#4B5563', fontSize: '12.5px', display: 'block' }}>Estimated Tax Reduction</span>
                        <span style={{ color: '#94a3b8', fontSize: '10px', fontStyle: 'italic' }}>
                          {results.availableRoom === 0
                            ? 'Enter deduction room above'
                            : results.marginalTaxRate > 0
                              ? `${results.marginalTaxRate}% rate · simplified estimate only`
                              : 'Enter marginal rate above'}
                        </span>
                      </div>
                      <span className="font-semibold shrink-0" style={{ color: '#1DB584', fontSize: '12.5px' }}>
                        {results.marginalTaxRate > 0 && results.availableRoom > 0 ? fmtCAD(safe(results.estimatedTaxRefund)) : '—'}
                      </span>
                    </div>
                    <div className="pt-1 pb-0.5">
                      <p className="text-[10.5px] leading-relaxed" style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                        First-year room estimate only. Monthly contributions beyond year one may use future annual RRSP room, which is not modeled.
                        Verify your exact room with CRA My Account before contributing. Tax reduction is a simplified estimate and is not tax advice.
                      </p>
                    </div>
                  </div>

                </div>
              );
            })()}
          </div>
        </div>

      </div>

      {/* ══ Block D: AI Analysis ═════════════════════════════════════════════ */}
      <div
        id="ai-analysis"
        className="overflow-hidden"
        style={{ ...cardStyle, padding: 0, scrollMarginTop: '80px' }}
      >

        <div
          className="px-4 md:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
          style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #0f2744 100%)' }}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center shrink-0"
              style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(29,181,132,0.18)' }}>
              <Sparkles className="w-4 h-4" style={{ color: '#1DB584' }} aria-hidden />
            </span>
            <p className="text-white text-lg md:text-xl font-bold tracking-tight">
              FinCalc <span style={{ color: '#1DB584' }}>Smart</span> AI RRSP Analysis
            </p>
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

        <div className="p-4 md:p-5" style={{ background: '#f4f6f9' }}>

          {!results && (
            <div className="flex flex-col items-center justify-center py-10 rounded-2xl gap-3"
              style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.08)' }}>
              <Sparkles className="w-5 h-5" style={{ color: '#1DB584' }} aria-hidden />
              <p className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>
                Enter your RRSP details above to see the analysis.
              </p>
              <p className="text-xs text-center px-4" style={{ color: '#94a3b8', maxWidth: 360 }}>
                The analysis will show your RRSP growth score, deduction room usage, estimated tax reduction, and three insight cards.
              </p>
            </div>
          )}

          {results && (
            <>
              {/* ── Row 1: Two gauges + Smart lever ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                {/* Left — RRSP Analysis gauges */}
                <div className="rounded-2xl p-4 flex flex-col"
                  style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.09)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                    <span className="text-sm font-bold text-slate-800">RRSP Analysis</span>
                  </div>

                  <div className="flex-1 flex flex-col sm:flex-row">

                    {/* Gauge 1: RRSP Growth Score */}
                    <div className="flex-1 flex flex-col items-center text-center min-w-0 pb-3 sm:pb-0 sm:pr-3">
                      <div className="flex items-center w-full mb-2">
                        <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>RRSP Growth</p>
                        <span className="ml-auto px-2 py-0.5 rounded-full shrink-0"
                          style={{ fontSize: '10px', fontWeight: 700, background: results.growthBg, color: results.growthColor }}>
                          {results.growthStatus}
                        </span>
                      </div>
                      {(() => {
                        const GR = 48; const GC = 2 * Math.PI * GR;
                        const GARC = (240 / 360) * GC;
                        const GFIL = GARC * (results.growthScore / 100);
                        return (
                          <div style={{ position: 'relative', width: 132, height: 132, flexShrink: 0 }}>
                            <svg viewBox="0 0 132 132" width="132" height="132" aria-hidden>
                              <circle cx="66" cy="66" r={GR} fill="none" stroke="rgba(15,41,66,0.09)" strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GARC.toFixed(1)} ${(GC - GARC).toFixed(1)}`} transform="rotate(150, 66, 66)" />
                              <circle cx="66" cy="66" r={GR} fill="none" stroke={results.growthColor} strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GFIL.toFixed(1)} ${(GC - GFIL).toFixed(1)}`} transform="rotate(150, 66, 66)"
                                style={{ transition: 'stroke-dasharray 0.9s ease' }} />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 14 }}>
                              <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0D1B2A', lineHeight: 1 }}>{results.growthScore}</span>
                              <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 500 }}>/ 100</span>
                            </div>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: results.growthColor }}>{results.growthLabel}</span>
                            </div>
                          </div>
                        );
                      })()}
                      <p className="text-slate-500 mt-2" style={{ fontSize: '11px', lineHeight: 1.5 }}>
                        {results.growthPct.toFixed(1)}% of your projected RRSP value comes from investment growth.
                        {results.growthStatus === 'Healthy' ? ' Compounding is working strongly over your chosen horizon.' : results.growthStatus === 'Watch' ? ' A longer horizon or higher return assumption increases this share.' : ' Consider a longer investment horizon to let compounding build more growth.'}
                      </p>
                    </div>

                    <div className="hidden sm:block self-stretch w-px mx-1" style={{ background: 'rgba(15,41,66,0.08)' }} />
                    <div className="block sm:hidden h-px w-full mb-3" style={{ background: 'rgba(15,41,66,0.08)' }} />

                    {/* Gauge 2: Room Usage */}
                    {(() => {
                      const { availableRoom, roomUsedPct, overRoom, roomGaugeColor, roomGaugeBg, roomBadge } = results;
                      const hasRoom = availableRoom > 0;
                      const displayPct = Math.min(100, roomUsedPct);
                      const GR = 48; const GC = 2 * Math.PI * GR;
                      const GARC = (240 / 360) * GC;
                      const GFIL = GARC * (displayPct / 100);
                      return (
                        <div className="flex-1 flex flex-col items-center text-center min-w-0 sm:pl-3">
                          <div className="flex items-center w-full mb-2">
                            <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>Room Usage</p>
                            <span className="ml-auto px-2 py-0.5 rounded-full shrink-0"
                              style={{ fontSize: '10px', fontWeight: 700, background: roomGaugeBg, color: roomGaugeColor }}>
                              {roomBadge}
                            </span>
                          </div>
                          <div style={{ position: 'relative', width: 132, height: 132, flexShrink: 0 }}>
                            <svg viewBox="0 0 132 132" width="132" height="132" aria-hidden>
                              <circle cx="66" cy="66" r={GR} fill="none" stroke="rgba(15,41,66,0.09)" strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GARC.toFixed(1)} ${(GC - GARC).toFixed(1)}`} transform="rotate(150, 66, 66)" />
                              <circle cx="66" cy="66" r={GR} fill="none" stroke={roomGaugeColor} strokeWidth="10" strokeLinecap="round"
                                strokeDasharray={`${GFIL.toFixed(1)} ${(GC - GFIL).toFixed(1)}`} transform="rotate(150, 66, 66)"
                                style={{ transition: 'stroke-dasharray 0.9s ease' }} />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 14 }}>
                              {hasRoom ? (
                                <>
                                  <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0D1B2A', lineHeight: 1 }}>
                                    {Math.min(100, Math.round(roomUsedPct))}<span style={{ fontSize: '1rem' }}>%</span>
                                  </span>
                                  <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 500 }}>of room used</span>
                                </>
                              ) : (
                                <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#94a3b8', lineHeight: 1 }}>—</span>
                              )}
                            </div>
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: roomGaugeColor }}>
                                {!hasRoom ? 'Not Entered' : overRoom ? 'Over Limit' : `${Math.round(roomUsedPct)}%`}
                              </span>
                            </div>
                          </div>
                          <p className="text-slate-500 mt-2" style={{ fontSize: '11px', lineHeight: 1.5 }}>
                            {!hasRoom
                              ? 'Enter your available RRSP deduction room above to see your first-year room usage.'
                              : overRoom
                                ? `Your first-year plan of ${fmtCAD(safe(results.plannedFirstYear))} exceeds your entered room of ${fmtCAD(safe(availableRoom))} by ${fmtOverage(results.overRoomBy)}. Verify with CRA before contributing.`
                                : `Your first-year plan uses ${Math.round(roomUsedPct)}% of your entered deduction room of ${fmtCAD(safe(availableRoom))}.`
                            }
                          </p>
                        </div>
                      );
                    })()}

                  </div>
                </div>

                {/* Right — Smart Lever */}
                <div className="rounded-2xl p-3 flex flex-col"
                  style={{ background: 'linear-gradient(145deg, #0D1B2A 0%, #0c1e3a 100%)', border: '1px solid rgba(29,181,132,0.14)', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 shrink-0" style={{ color: results.leverState === 'over-room' ? '#f59e0b' : '#1DB584' }} aria-hidden />
                    <span className="text-sm font-bold" style={{ color: results.leverState === 'over-room' ? '#f59e0b' : '#1DB584' }}>
                      {results.leverState === 'over-room'        ? 'Room Limit Exceeded' :
                       results.leverState === 'room-opportunity' ? 'Room Opportunity' :
                       results.leverState === 'room-nearly-used' ? 'Room Well Utilised' :
                       'Enter Deduction Room'}
                    </span>
                  </div>

                  {/* State A: over-room */}
                  {results.leverState === 'over-room' && (() => (
                    <>
                      <div className="flex flex-col gap-3 mt-1 lg:hidden">
                        <div className="rounded-xl flex items-center justify-center px-4 py-4"
                          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                          <span className="font-extrabold tabular-nums"
                            style={{ fontSize: 'clamp(1.9rem, 9vw, 2.4rem)', color: '#ef4444', letterSpacing: '-1.5px', lineHeight: 1 }}>
                            {fmtOverage(safe(results.overRoomBy))}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">exceeds your entered available deduction room</p>
                          <p className="text-slate-400 text-xs mt-0.5">Verify your exact room with CRA My Account or your Notice of Assessment before contributing. This estimate is based on your entered room only.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2, color: '#f59e0b' }}>{fmtCAD(safe(results.plannedFirstYear))}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#f59e0b' }} aria-hidden />
                              <span className="text-slate-400 text-xs">First-year plan</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmtCAD(safe(results.availableRoom))}</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Entered room</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                          This is not tax or legal advice. CRA is the authoritative source for your exact deduction room.
                        </p>
                      </div>
                      <div className="hidden lg:flex flex-col gap-3 mt-1 flex-1 justify-center">
                        <div className="flex items-stretch gap-3">
                          <div className="flex-1 min-w-0 rounded-xl flex flex-col items-center justify-center px-4 py-7"
                            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                            <span className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(2.0rem, 4vw, 2.7rem)', color: '#ef4444', letterSpacing: '-2px', lineHeight: 1 }}>
                              {fmtOverage(safe(results.overRoomBy))}
                            </span>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2, color: '#f59e0b' }}>{fmtCAD(safe(results.plannedFirstYear))}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#f59e0b' }} aria-hidden />
                              <span className="text-slate-400 text-xs">First-year plan</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmtCAD(safe(results.availableRoom))}</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Entered room</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">exceeds your entered available deduction room</p>
                          <p className="text-slate-400 text-xs mt-0.5">Verify with CRA My Account or your Notice of Assessment before contributing.</p>
                        </div>
                        <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                          This is not tax or legal advice. CRA is the authoritative source for your exact deduction room.
                        </p>
                      </div>
                    </>
                  ))()}

                  {/* State B: room-opportunity */}
                  {results.leverState === 'room-opportunity' && (() => (
                    <>
                      <div className="flex flex-col gap-3 mt-1 lg:hidden">
                        <div className="rounded-xl flex items-center justify-center px-4 py-4"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <span className="font-extrabold tabular-nums"
                            style={{ fontSize: 'clamp(1.9rem, 9vw, 2.4rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                            {fmtCAD(safe(results.roomRemaining))}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">of entered room remains after your first-year plan</p>
                          <p className="text-slate-400 text-xs mt-0.5">You may have additional deduction room to use this year. Verify your exact room with CRA before contributing further.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmtCAD(safe(results.availableRoom))}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Entered room</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmtCAD(safe(results.plannedFirstYear))}</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">First-year plan</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                          Based on entered available room only. Verify exact room with CRA before contributing.
                        </p>
                      </div>
                      <div className="hidden lg:flex flex-col gap-3 mt-1 flex-1 justify-center">
                        <div className="flex items-stretch gap-3">
                          <div className="flex-1 min-w-0 rounded-xl flex items-center justify-center px-4 py-7"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <span className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(2.0rem, 4vw, 2.7rem)', color: '#1DB584', letterSpacing: '-2px', lineHeight: 1 }}>
                              {fmtCAD(safe(results.roomRemaining))}
                            </span>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmtCAD(safe(results.availableRoom))}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Entered room</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmtCAD(safe(results.plannedFirstYear))}</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">First-year plan</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">of entered room remains after your first-year plan</p>
                          <p className="text-slate-400 text-xs mt-0.5">You may have additional capacity to contribute this year. Verify exact room with CRA before contributing further.</p>
                        </div>
                        <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                          Based on entered available room only — not verified CRA data.
                        </p>
                      </div>
                    </>
                  ))()}

                  {/* State C: room-nearly-used */}
                  {results.leverState === 'room-nearly-used' && (() => (
                    <>
                      <div className="flex flex-col gap-3 mt-1 lg:hidden">
                        <div className="rounded-xl flex items-center justify-center px-4 py-4"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <span className="font-extrabold tabular-nums"
                            style={{ fontSize: 'clamp(1.9rem, 9vw, 2.4rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                            {fmtCAD(safe(results.projectedValue))}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">projected RRSP value after {results.yearsInvested} years</p>
                          <p className="text-slate-400 text-xs mt-0.5">your first-year plan uses most of your entered available deduction room</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmtCAD(safe(results.totalContributions))}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Total contributions</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>{fmtCAD(safe(results.investmentGrowth))}</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Investment growth</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="hidden lg:flex flex-col gap-3 mt-1 flex-1 justify-center">
                        <div className="flex items-stretch gap-3">
                          <div className="flex-1 min-w-0 rounded-xl flex items-center justify-center px-4 py-7"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <span className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(2.0rem, 4vw, 2.7rem)', color: '#1DB584', letterSpacing: '-2px', lineHeight: 1 }}>
                              {fmtCAD(safe(results.projectedValue))}
                            </span>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmtCAD(safe(results.totalContributions))}</div>
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Total contributions</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>{fmtCAD(safe(results.investmentGrowth))}</div>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Investment growth</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">projected RRSP value — first-year plan uses most of entered room</p>
                          <p className="text-slate-400 text-xs mt-0.5">Room remaining: {fmtCAD(safe(results.roomRemaining))} · Verify exact room with CRA before contributing.</p>
                        </div>
                      </div>
                    </>
                  ))()}

                  {/* State D: no-room */}
                  {results.leverState === 'no-room' && (() => (
                    <div className="flex flex-col gap-3 mt-1 flex-1 justify-center items-center text-center px-2">
                      <div className="rounded-xl px-4 py-4 w-full"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                        <p className="text-white font-semibold text-sm mb-1">Enter your available deduction room</p>
                        <p className="text-slate-400 text-xs">Check CRA My Account or your Notice of Assessment to find your current RRSP deduction room, then enter it above to see the room analysis and tax refund estimate.</p>
                      </div>
                      <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                        For 2026, the annual RRSP dollar maximum is $33,810 — but your actual deduction limit depends on your earned income, unused room carried forward, and pension adjustments, and may be higher or lower.
                      </p>
                    </div>
                  ))()}

                </div>

              </div>

              {/* ── Row 2: Three insight cards ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Card 1 — Contribution Plan */}
                <div className="rounded-2xl p-4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: '#e0f2fe' }}>
                      <TrendingUp className="w-3.5 h-3.5 text-sky-600" aria-hidden />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-sky-600">Contribution Plan</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Your plan combines a one-time contribution of{' '}
                    <strong className="text-sky-700">{fmtCAD(safe(results.plannedOneTime))}</strong>{' '}
                    plus <strong className="text-sky-700">{fmtCADx(safe(results.monthlyContribution))}/month</strong> ongoing.
                    Over {results.yearsInvested} years, total contributions reach{' '}
                    <strong className="text-sky-700">{fmtCAD(safe(results.totalContributions))}</strong> before investment growth.
                    Future annual room beyond year one is not modeled — verify with CRA as each year passes.
                  </p>
                </div>

                {/* Card 2 — Estimated Tax Reduction */}
                <div className="rounded-2xl p-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: '#dcfce7' }}>
                      <Landmark className="w-3.5 h-3.5 text-emerald-600" aria-hidden />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Estimated Tax Reduction</p>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {results.availableRoom === 0 ? (
                      'Enter your available RRSP deduction room above to see an estimated tax reduction. This is illustrative only and not tax advice.'
                    ) : results.marginalTaxRate > 0 ? (
                      <>
                        At a {results.marginalTaxRate}% combined marginal rate, your first-year deductible contribution of{' '}
                        <strong className="text-emerald-700">{fmtCAD(safe(results.taxRefundBase))}</strong>{' '}
                        may reduce your tax payable by an estimated{' '}
                        <strong className="text-emerald-700">{fmtCAD(safe(results.estimatedTaxRefund))}</strong>.{' '}
                        This is a simplified estimate only. It does not reflect your actual CRA tax return,
                        other income, deduction phasing, provincial surtaxes, or any other tax factors.
                        {results.overRoom && ' Estimate based on in-room portion only.'}
                      </>
                    ) : (
                      'Enter your combined federal + provincial marginal tax rate above to see an estimated tax reduction. This is illustrative only and not tax advice.'
                    )}
                  </p>
                </div>

                {/* Card 3 — Retirement Growth Impact */}
                {(() => {
                  const isOver = results.overRoom;
                  const noRoom = results.availableRoom === 0;
                  const bg    = isOver ? '#fff7ed' : '#fdf4ff';
                  const bdr   = isOver ? '#fed7aa' : '#e9d5ff';
                  const iconBg = isOver ? '#ffedd5' : '#f3e8ff';
                  const label  = isOver ? 'text-orange-600' : 'text-purple-600';
                  const iconColor = isOver ? 'text-orange-500' : 'text-purple-500';
                  return (
                    <div className="rounded-2xl p-4" style={{ background: bg, border: `1px solid ${bdr}` }}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="flex items-center justify-center shrink-0"
                          style={{ width: 28, height: 28, borderRadius: 8, background: iconBg }}>
                          <AlertTriangle className={`w-3.5 h-3.5 ${iconColor}`} aria-hidden />
                        </span>
                        <p className={`text-xs font-bold uppercase tracking-widest ${label}`}>
                          {isOver ? 'Over-Contribution Risk' : 'Retirement Growth Impact'}
                        </p>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {isOver
                          ? <>Your first-year plan of <strong className="text-orange-700">{fmtCAD(safe(results.plannedFirstYear))}</strong> exceeds your entered deduction room of <strong className="text-orange-700">{fmtCAD(safe(results.availableRoom))}</strong>. If this reflects your actual CRA room, contributing this amount may trigger a penalty. Verify your exact room with CRA My Account before contributing. This calculator does not provide tax advice.</>
                          : noRoom
                            ? 'Enter your available RRSP deduction room above to see whether your plan is on track and assess over-contribution risk. For 2026, the annual RRSP dollar maximum is $33,810 — your actual limit may differ.'
                            : <>At an assumed {results.annualRate}% annual return, your RRSP could grow to{' '}
                                <strong className="text-purple-700">{fmtCAD(safe(results.projectedValue))}</strong> after {results.yearsInvested} years.
                                Investment growth of <strong className="text-purple-700">{fmtCAD(safe(results.investmentGrowth))}</strong> represents {results.growthPct.toFixed(1)}% of your projected value.
                                At year 10: <strong className="text-purple-700">{fmtCAD(safe(results.valAt10))}</strong> ·
                                year 20: <strong className="text-purple-700">{fmtCAD(safe(results.valAt20))}</strong>.</>
                        }
                      </p>
                    </div>
                  );
                })()}

              </div>
            </>
          )}

        </div>

        {/* Inner disclaimer */}
        <div className="flex items-start gap-2.5 px-5 md:px-6 py-4"
          style={{ borderTop: '1px solid rgba(15,41,66,0.07)', background: '#f8fafb' }}>
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" aria-hidden />
          <p className="text-slate-400 text-xs leading-relaxed">
            <strong className="text-slate-500 font-semibold">Disclaimer:</strong>{' '}
            This analysis is for illustrative and informational purposes only and applies to Canadian RRSP accounts.
            This tool does not calculate or verify your exact CRA RRSP deduction room. Your actual available deduction room
            is available in CRA My Account, on your Notice of Assessment, or via Form T1028 — verify before contributing.
            The estimated tax reduction is a simplified calculation (first-year in-room contribution × entered marginal rate)
            and does not constitute tax advice, reflect your actual CRA tax return, or account for other income, provincial
            surtaxes, pension adjustments, or any other tax factor. RRSP withdrawals are taxed as income. Consult a qualified
            tax or financial advisor for personalized guidance.
          </p>
        </div>

      </div>

      {/* ══ Block F: How It Works ════════════════════════════════════════════ */}
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

      {/* ══ Block G: FAQ ═════════════════════════════════════════════════════ */}
      {faqItems.length > 0 && (
        <div style={cardStyle} className="p-6 md:p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2.5">
            <HelpCircle className="w-5 h-5 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
            Frequently Asked Questions
          </h2>
          <CalculatorFaqAccordion faqs={faqItems} />
        </div>
      )}

      <p className="text-xs text-slate-400 text-center mt-4 pb-12 px-4 leading-relaxed max-w-4xl mx-auto">
        This calculator is for illustrative and informational purposes only and applies to Canadian RRSP accounts.
        It does not calculate or verify exact CRA RRSP deduction room, does not account for pension adjustments,
        past service pension adjustments, unused room carry-forward history, or CRA records. The estimated tax reduction
        is a simplified estimate based on the marginal rate you enter and is not tax advice. RRSP withdrawals are taxed as income
        at your marginal rate in the year of withdrawal. Users should verify their exact available deduction room with CRA My Account,
        their Notice of Assessment, or Form T1028 before making contributions.
        This does not constitute financial, investment, tax, or legal advice.
      </p>

    </div>
  );
}
