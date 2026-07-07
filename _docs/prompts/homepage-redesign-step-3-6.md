We are redesigning the FinCalc Smart homepage into a premium fintech SaaS-style landing page.

Please implement ONLY the homepage redesign.

Important project context:

* Tech stack: Next.js, React, TypeScript, TailwindCSS.
* Current homepage is a placeholder and needs a full redesign.
* Do not restart the project.
* Do not rebuild the file structure.
* Do not modify mortgage calculator logic.
* Do not modify math.ts.
* Do not rewrite CalculatorLayout, SiteHeader, SiteFooter, RegionContext, or existing calculator pages unless absolutely necessary.
* Reuse existing brand tokens where possible.
* Create reusable homepage-specific components if needed.

Homepage goal:
Create a premium fintech SaaS homepage that presents FinCalc Smart as a modern financial calculator platform with smart AI-assisted financial insights, calculator discovery, visual analytics, and strong trust signals.

Important AI positioning:
Use this wording direction:
“Smart AI-assisted financial insights.”

Do NOT make it sound like a live AI financial advisor or real-time AI API.

Hero subheadline:
“FinCalc Smart helps you estimate payments, compare scenarios, and understand your numbers with smart insights.”

Homepage structure:

1. Hero Section
2. Trust Bar
3. Calculator Categories
4. AI-Assisted Insights Showcase
5. Financial Visual Analytics Section
6. Why FinCalc Smart
7. Educational Content Section
8. Final CTA
9. Footer

Hero section requirements:

* Left side: headline, subheadline, CTA buttons, short trust line.
* Right side: layered product preview that feels like a real fintech SaaS dashboard.
* Include a calculator preview card, result card, smart insight card, and mini chart/dashboard preview.
* Avoid generic stock images or decorative illustrations.
* The product preview should feel like a real FinCalc Smart experience.

Hero CTA buttons:
Primary: “Explore Calculators”
Secondary: “See Smart Insights”

Trust bar:
Include 4–5 compact trust items such as:

* Canada & USA tools
* Smart AI-assisted insights
* Fast financial calculations
* Mobile-friendly experience
* Informational guidance only

Calculator categories:
Create clean SaaS-style category cards.
Recommended categories:

* Mortgage
* Investing
* Retirement
* Debt Payoff
* Loans
* Taxes

Each card should include:

* icon
* title
* short description
* subtle hover state
* clean visual hierarchy

Do not list every calculator on the homepage. Keep discovery simple and category-based.

AI-Assisted Insights Showcase:
This is a key differentiation section.

Use realistic pre-programmed insight examples such as:

* “You could reduce total interest by increasing your monthly payment by $150.”
* “Your down payment may affect insurance costs and total borrowing cost.”
* “Accelerated biweekly payments may shorten your mortgage timeline.”

Add weekly rotating insight content using predefined local data only.
No AI API.
No backend.
No external data.
The homepage can rotate between predefined insight groups by week number.

Example groups:

* Week 1: Mortgage savings insights
* Week 2: Debt payoff insights
* Week 3: Investment growth insights
* Week 4: Retirement planning insights

Important:
The rotating insights must feel realistic, educational, and based on financial logic.
Do not make them sound like personalized financial advice.

Add a subtle disclaimer under the AI insights section:
“AI-assisted insights are generated from calculator inputs and financial logic for informational purposes only. They are not financial advice.”

Financial Visual Analytics Section:
Create a new premium SaaS-style visual analytics preview.

Important:
Do NOT reuse or copy the current mortgage calculator chart, donut, or graph style.
I do not like the current chart/donut/graph visual style.

Create a fresher homepage-specific chart/dashboard style:

* modern SaaS dashboard look
* cleaner spacing
* softer colors
* subtle animation
* better visual hierarchy
* realistic calculator-based sample data

Dynamic chart animation is allowed and encouraged, but keep it subtle.
Good animations:

* smooth line reveal
* count-up numbers
* soft bar growth
* subtle hover states

Avoid:

* flashy movement
* crypto/neon effects
* rainbow charts
* random decorative charts
* overly busy graph labels

If Framer Motion is not currently installed, do not install it without asking first. Use lightweight CSS/Tailwind/SVG animation if possible, or propose Framer Motion as an optional enhancement.

Why FinCalc Smart section:
Use feature blocks such as:

* Smart insights
* Canada and USA calculator support
* Scenario comparison tools
* Downloadable PDF reports
* Email report sharing
* Visual financial breakdowns
* Educational guidance
* Mobile-first experience

Educational Content Section:
Create 3 featured article/guide cards.
Example topics:

* How mortgage payments are calculated
* How to compare mortgage scenarios
* How extra payments reduce interest

This section should feel premium and editorial, not like an SEO content dump.

Final CTA:
Headline:
“Start planning with smarter financial tools.”

Subheadline:
“Explore calculators designed to help you estimate, compare, and understand your financial decisions.”

Buttons:

* Explore Calculators
* Start with Mortgage Calculator

Footer:
Use existing footer if already implemented.
Do not redesign the global footer unless needed.
But the footer should eventually include:

* company logo
* short brand statement
* calculator links
* resource links
* legal links
* email/contact
* social icons
* country switch
* disclaimer
* copyright

Design rules:

* Premium fintech SaaS feel.
* Inspired by Stripe, Mercury, Wealthsimple, Ramp, and Vercel.
* Clean, modern, trustworthy, mobile-first.
* Use compact but readable layouts.
* Use generous section spacing.
* Use reusable components.
* Avoid huge text walls.
* Avoid generic SaaS filler text.
* Avoid stock image style.
* Avoid neon/crypto visuals.
* Avoid copying old calculator chart styles.

Responsive rules:

* Mobile-first.
* Desktop max-width around 1280px.
* Mobile order should prioritize:

  1. Headline
  2. CTA
  3. Product preview
  4. Calculator categories
  5. AI insights
  6. Visual analytics
  7. Education
  8. CTA/footer

Implementation request:

1. First inspect the existing homepage, layout, header, footer, and brand tokens.
2. Then implement the homepage redesign.
3. Create homepage-specific reusable components only where useful.
4. Keep the code clean, typed, and maintainable.
5. After implementation, provide a summary of:

   * files changed
   * components created
   * responsive behavior
   * any assumptions made
   * any follow-up improvements recommended

Do not modify unrelated pages or calculator logic.
