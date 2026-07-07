import type { MetadataRoute } from 'next';
import { CALC_INDEX } from '@/lib/calculators';

const BASE_URL = 'https://www.fincalcsmart.com';

const STATIC_ROUTES = [
  '',
  '/calculators',
  '/ai-insights',
  '/guides',
  '/about',
  '/privacy',
  '/terms',
  '/sitemap',
];

const GUIDE_ROUTES = [
  '/guides/mortgage-affordability',
  '/guides/emergency-fund',
  '/guides/compound-interest',
  '/guides/how-much-to-retire',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const calculatorRoutes = CALC_INDEX.filter((entry) => entry.available).map((entry) => entry.href);
  const routes = Array.from(new Set([...STATIC_ROUTES, ...GUIDE_ROUTES, ...calculatorRoutes]));

  return routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
  }));
}
