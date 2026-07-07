'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useState, type ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  title: string;
  description: string;
  cta: string;
  href: string;
  iconBg: string;
  iconBgHover: string;
}

export default function CalcCard({
  icon, title, description, cta, href, iconBg, iconBgHover,
}: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex flex-col rounded-brand-xl bg-white p-5 transition-all duration-200 motion-reduce:transition-none motion-reduce:!transform-none"
      style={{
        border: `1px solid ${hovered ? '#1DB584' : 'rgba(13,27,42,0.10)'}`,
        boxShadow: hovered
          ? '0 8px 28px rgba(13,27,42,0.10), 0 2px 8px rgba(29,181,132,0.08)'
          : '0 1px 3px rgba(13,27,42,0.06)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      {/* Icon container */}
      <div
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-brand-md transition-colors duration-200"
        style={{ background: hovered ? iconBgHover : iconBg }}
      >
        {icon}
      </div>

      {/* Title + description */}
      <h3 className="mb-2 text-[15px] font-bold text-brand-navy">{title}</h3>
      <p className="flex-1 text-[13px] leading-relaxed text-brand-gray-600">{description}</p>

      {/* CTA — always visible, arrow slides on hover */}
      <div className="mt-4 flex items-center gap-1 text-[12.5px] font-semibold text-brand-teal">
        {cta}
        <ArrowRight
          className="h-3 w-3 transition-transform duration-150 motion-reduce:transition-none motion-reduce:!transform-none"
          style={{ transform: hovered ? 'translateX(3px)' : 'translateX(0)' }}
          aria-hidden
        />
      </div>
    </Link>
  );
}
