/**
 * Standard educational disclaimer for all /guides/[slug] article pages.
 * Amber-tinted, non-alarming. Always render at the bottom of the article body.
 */
export default function ArticleDisclaimer() {
  return (
    <div
      className="rounded-brand-lg px-6 py-5"
      style={{
        background: 'rgba(201,168,76,0.07)',
        border: '1px solid rgba(201,168,76,0.22)',
      }}
    >
      <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(13,27,42,0.64)' }}>
        <strong className="font-semibold" style={{ color: 'rgba(13,27,42,0.78)' }}>
          Educational purposes only.
        </strong>{' '}
        All scenarios, ratios, and payment figures on this page are illustrative estimates and do
        not constitute a mortgage approval, lending commitment, or any form of financial, tax,
        legal, or mortgage advice. Lending rules, qualifying rates, GDS/TDS thresholds, and
        debt-ratio guidelines vary by lender, mortgage product, applicant profile, and
        province or state, and change over time. Always consult a licensed mortgage professional
        before making any borrowing or real-estate decision.
      </p>
    </div>
  );
}
