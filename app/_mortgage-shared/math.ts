export type Frequency = 'monthly' | 'biweekly' | 'accelerated-biweekly';

export interface ScheduleRow {
  year: number;
  beginBalance: number;
  principalPaid: number;
  interestPaid: number;
  endBalance: number;
}

export interface ScenarioData {
  years: number;
  monthlyPayment: number;
  totalInterest: number;
}

// Canada: semi-annual compounding mandated by the Interest Act
export function monthlyRateCA(annualPct: number): number {
  return Math.pow(1 + annualPct / 200, 1 / 6) - 1;
}

// USA: standard monthly compounding
export function monthlyRateUS(annualPct: number): number {
  return annualPct / 1200;
}

export function calcPayment(principal: number, rate: number, n: number): number {
  if (principal <= 0 || n <= 0) return 0;
  if (rate === 0) return principal / n;
  const f = Math.pow(1 + rate, n);
  return (principal * rate * f) / (f - 1);
}

export function getCmhcRate(downPct: number): number {
  if (downPct >= 20) return 0;
  if (downPct >= 15) return 0.028;
  if (downPct >= 10) return 0.031;
  return 0.04;
}

export function buildSchedule(
  principal: number,
  rate: number,
  months: number,
  extra: number,
): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  let balance = principal;
  const payment = calcPayment(principal, rate, months);
  let year = 1, yearBegin = balance, yPrincipal = 0, yInterest = 0;

  for (let m = 1; m <= months && balance > 0.005; m++) {
    const ip = balance * rate;
    const pp = Math.min(payment - ip + extra, balance);
    balance = Math.max(0, balance - pp);
    yPrincipal += pp;
    yInterest += ip;
    if (m % 12 === 0 || balance <= 0.005) {
      rows.push({ year, beginBalance: yearBegin, principalPaid: yPrincipal, interestPaid: yInterest, endBalance: balance });
      year++; yearBegin = balance; yPrincipal = 0; yInterest = 0;
    }
  }
  return rows;
}

export function parseN(s: string): number {
  return parseFloat(String(s).replace(/[^0-9.]/g, '')) || 0;
}

export function fmtCAD(n: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export function fmtCADx(n: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function fmtUSD(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export function fmtUSDx(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function freqPayment(monthly: number, freq: Frequency): number {
  if (freq === 'biweekly') return (monthly * 12) / 26;
  if (freq === 'accelerated-biweekly') return monthly / 2;
  return monthly;
}

export function freqLabel(freq: Frequency): string {
  if (freq === 'biweekly') return 'bi-weekly';
  if (freq === 'accelerated-biweekly') return 'accel. bi-weekly';
  return 'monthly';
}
