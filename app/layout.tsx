import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import { RegionProvider } from '@/lib/region/context';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
  weight: ['300', '400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: {
    default: 'FinCalc Smart — Free Financial Calculators for the USA & Canada',
    template: '%s | FinCalc Smart',
  },
  description:
    'Free, accurate financial calculators for mortgages, retirement, FIRE, RRSP, taxes, and more — built for the USA and Canada.',
  metadataBase: new URL('https://www.fincalcsmart.com'),
  openGraph: {
    siteName: 'FinCalc Smart',
    locale: 'en_US',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="bg-brand-gray-50 font-sans text-brand-navy antialiased">
        {/* Font Awesome 5 Free — for calculator icon accents */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css"
          crossOrigin="anonymous"
        />
        <RegionProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
        </RegionProvider>
        <GoogleAnalytics gaId="G-PM9V6TB5QX" />
      </body>
    </html>
  );
}
