'use client';

import { useState } from 'react';
import type { Faq } from './CalculatorLayout';

export default function CalculatorFaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <dl className="divide-y" style={{ borderColor: '#F1F4F7' }}>
      {faqs.map(({ question, answer }, i) => (
        <div key={question} className="py-4">
          <dt>
            <button
              className="group flex w-full items-center justify-between gap-4 text-left"
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              aria-expanded={openIdx === i}
            >
              <span className="font-bold text-brand-navy transition-colors duration-150 group-hover:text-[#1DB584]" style={{ fontSize: '15px' }}>
                {question}
              </span>
              <svg
                className={`w-5 h-5 shrink-0 transition-transform duration-200 ${openIdx === i ? 'rotate-180' : ''}`}
                style={{ color: '#1DB584' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </dt>
          {openIdx === i && (
            <dd
              className="mt-3 leading-relaxed"
              style={{ fontSize: '14px', color: '#6B7A8D', lineHeight: '1.7' }}
            >
              {answer}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}
