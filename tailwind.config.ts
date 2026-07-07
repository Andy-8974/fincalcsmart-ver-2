import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Plus Jakarta Sans — self-hosted via next/font, set in app/layout.tsx
        sans: ['var(--font-jakarta)', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        brand: {
          navy: {
            deep:    '#060F1A', // footer, deepest backgrounds
            mid:     '#0A1628', // nav bar, modals
            DEFAULT: '#0D1B2A', // primary navy, hero bands
            light:   '#0D2137', // results panels, ad backgrounds
          },
          teal: {
            DEFAULT: '#1DB584', // CTAs, focus rings, active states, logo dot
            dark:    '#18a073', // hover state for teal elements
            pale:    '#E6F7F1', // teal callout backgrounds
          },
          amber: {
            DEFAULT: '#C9A84C', // calculator icons, data highlights
            pale:    '#FEF9EC', // amber callout backgrounds
          },
          gray: {
            50:  '#F8FAFB', // page body background
            100: '#F1F4F7', // subtle dividers
            200: '#E4E9EF', // card borders, input borders
            400: '#9BA8B5', // placeholder text, meta labels
            600: '#6B7A8D', // body secondary text, form labels
          },
        },
      },
      borderRadius: {
        // Brand radius scale (8px base grid)
        'brand-xs': '4px',  // badges, table chips
        'brand-sm': '8px',  // inputs, buttons
        'brand-md': '10px', // toggle buttons, calc controls
        'brand-lg': '12px', // result items, sidebar cards
        'brand-xl': '16px', // calculator cards, content panels
      },
      boxShadow: {
        'brand-card': '0 1px 3px rgba(13,27,42,0.06), 0 1px 2px rgba(13,27,42,0.04)',
        'brand-dropdown': '0 24px 56px rgba(0,0,0,0.50)',
      },
    },
  },
  plugins: [],
};

export default config;
