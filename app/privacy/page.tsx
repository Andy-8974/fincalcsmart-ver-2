import type { Metadata } from 'next';
import ArticleLayout from '@/app/guides/_shared/ArticleLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How FinCalc Smart handles information you enter into financial calculators, PDF reports, and your region preference.',
};

const LAST_UPDATED = 'June 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-slate-900 mb-3">{title}</h2>
      <div className="text-sm text-slate-600 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <ArticleLayout>
      <div className="mx-auto max-w-3xl px-4 py-14 space-y-10">

        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-slate-400">Last updated: {LAST_UPDATED}</p>
        </div>

        <Section title="Overview">
          <p>
            FinCalc Smart is a financial calculator tool designed to help you explore financial
            scenarios. This policy explains what information is used when you interact with the
            site and how that information is handled.
          </p>
          <p>
            FinCalc Smart does not require an account or registration to use any calculator,
            generate PDF reports, or read financial guides.
          </p>
        </Section>

        <Section title="Information you enter into calculators">
          <p>
            When you use a calculator, the values you enter — such as income, loan amounts, savings
            balances, and interest rates — are used in your browser to compute results and display
            charts. These values are not transmitted to any server in order to generate calculator
            results.
          </p>
          <p>
            Please do not enter sensitive personal information into calculators, including government
            identification numbers, bank account or credit card numbers, medical details, or
            passwords. Calculators are designed to work with general financial figures, not
            account-level personal data.
          </p>
        </Section>

        <Section title="PDF reports">
          <p>
            When you download a PDF report, the report is generated in your browser using the
            values you have entered. The PDF is downloaded directly to your device. FinCalc Smart
            does not store or receive a copy of your PDF report.
          </p>
        </Section>

        <Section title="Email reports">
          <p>
            Email report functionality is currently disabled. When enabled in a future version, this
            policy will be updated to describe how email addresses are handled.
          </p>
        </Section>

        <Section title="Analytics and cookies">
          <p>
            FinCalc Smart may use standard web analytics tools to understand how the site is used
            in aggregate — for example, which pages are visited and how often. Any analytics data
            collected is used to improve the site and is not linked to individual users.
          </p>
          <p>
            If third-party analytics services are used, they may set cookies in your browser
            according to their own policies. You can manage cookies through your browser settings.
          </p>
        </Section>

        <Section title="Local storage and region preference">
          <p>
            FinCalc Smart stores your selected region (Canada or USA) in your browser&apos;s local
            storage under the key{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">fcs-region</code>.
            This preference is used to display region-appropriate currency and calculator defaults.
            It is stored on your device only and is not transmitted to any server.
          </p>
        </Section>

        <Section title="Information we do not ask for">
          <p>
            FinCalc Smart does not ask for your name, email address, mailing address, phone number,
            date of birth, social insurance number, social security number, or any financial account
            credentials as part of normal calculator use.
          </p>
        </Section>

        <Section title="Data security">
          <p>
            Because calculator inputs are processed in your browser and PDF reports are generated
            locally, sensitive financial figures you enter are not transmitted to FinCalc Smart
            servers as part of the calculation process.
          </p>
          <p>
            As with any website, standard web security practices apply to the connection between
            your browser and our servers (HTTPS). However, no system can guarantee complete
            security, and you should use reasonable care when using any online tool.
          </p>
        </Section>

        <Section title="Third-party services">
          <p>
            FinCalc Smart may include links to external websites or services. This privacy policy
            applies only to FinCalc Smart and does not cover the practices of any third-party sites
            or services. We encourage you to review the privacy policies of any external services
            you use.
          </p>
        </Section>

        <Section title="Children and educational use">
          <p>
            FinCalc Smart calculators are educational tools intended for general use. We do not
            knowingly collect personal information from children. If you believe a child has
            submitted personal information through this site, please contact us using the
            information below.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            We may update this privacy policy from time to time. When we do, we will update the
            &ldquo;Last updated&rdquo; date at the top of this page. We encourage you to review
            this page periodically for any changes.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            If you have questions about this privacy policy, you can contact us at{' '}
            <a href="mailto:contact@fincalcsmart.com" className="text-brand-teal hover:underline">
              contact@fincalcsmart.com
            </a>.
          </p>
        </Section>

      </div>
    </ArticleLayout>
  );
}
