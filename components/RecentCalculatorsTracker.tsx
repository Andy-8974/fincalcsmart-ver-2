'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { recordCalculatorVisit } from '@/lib/recent-calculators';

/** Invisible — records the current route as a recently-viewed calculator on navigation. */
export default function RecentCalculatorsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) recordCalculatorVisit(pathname);
  }, [pathname]);

  return null;
}
