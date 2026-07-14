'use client';

import { useCallback, useEffect, useState } from 'react';
import { CALC_INDEX, type CalcEntry } from '@/lib/calculators';

const STORAGE_KEY = 'fcs-recent-calculators';
const SCHEMA_VERSION = 1;
const MAX_ITEMS = 5;
const UPDATE_EVENT = 'fcs-recent-updated';

interface RecentItem {
  href: string;
  ts: number;
}

interface StoredShape {
  v: number;
  items: RecentItem[];
}

function isRecentItem(x: unknown): x is RecentItem {
  return (
    typeof x === 'object' &&
    x !== null &&
    typeof (x as RecentItem).href === 'string' &&
    typeof (x as RecentItem).ts === 'number'
  );
}

function readItems(): RecentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredShape;
    if (parsed?.v !== SCHEMA_VERSION || !Array.isArray(parsed.items)) return [];
    return parsed.items.filter(isRecentItem);
  } catch {
    return [];
  }
}

function writeItems(items: RecentItem[]) {
  try {
    const payload: StoredShape = { v: SCHEMA_VERSION, items };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage unavailable (private mode / quota exceeded) — fail silently
  }
}

/** Call on calculator page mount to record a visit. No-ops for non-calculator or unavailable routes. */
export function recordCalculatorVisit(href: string) {
  if (typeof window === 'undefined') return;
  const isKnownCalculator = CALC_INDEX.some((e) => e.href === href && e.available);
  if (!isKnownCalculator) return;

  const items = readItems().filter((i) => i.href !== href);
  items.unshift({ href, ts: Date.now() });
  writeItems(items.slice(0, MAX_ITEMS));
  window.dispatchEvent(new Event(UPDATE_EVENT));
}

/** Returns recently visited calculators, most recent first. Empty on server/first paint. */
export function useRecentCalculators(): CalcEntry[] {
  const [entries, setEntries] = useState<CalcEntry[]>([]);

  const refresh = useCallback(() => {
    const resolved = readItems()
      .map((i) => CALC_INDEX.find((e) => e.href === i.href && e.available))
      .filter((e): e is CalcEntry => e !== undefined);
    setEntries(resolved);
  }, []);

  useEffect(() => {
    refresh();
    // 'storage' fires on cross-tab changes; the custom event covers same-tab updates
    window.addEventListener(UPDATE_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(UPDATE_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  return entries;
}
