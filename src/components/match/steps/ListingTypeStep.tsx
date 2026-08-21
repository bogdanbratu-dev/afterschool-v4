'use client';

import { motion } from 'framer-motion';
import type { StepProps } from '../types';

const OPTIONS: { value: 'afterschool' | 'kindergarten'; icon: string; title: string; subtitle: string }[] = [
  { value: 'afterschool', icon: '🏫', title: 'Afterschool', subtitle: 'Program după școală, teme, activități' },
  { value: 'kindergarten', icon: '👶', title: 'Grădiniță', subtitle: 'Grădiniță sau creșă privată' },
];

export default function ListingTypeStep({ draft, update }: StepProps) {
  return (
    <div>
      <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--color-text-main)] mb-1">Cauți pentru:</h2>
      <p className="text-sm text-[var(--color-text-light)] mb-6">Alege ce tip de program cauți pentru copilul tău.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {OPTIONS.map((opt) => (
          <motion.button
            key={opt.value}
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => update({ listingType: opt.value })}
            className={`text-left p-5 rounded-2xl border-2 transition-colors ${
              draft.listingType === opt.value
                ? 'border-[var(--color-primary)] bg-blue-50'
                : 'border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]'
            }`}
          >
            <div className="text-4xl mb-3">{opt.icon}</div>
            <div className="font-display font-bold text-lg text-[var(--color-text-main)]">{opt.title}</div>
            <div className="text-sm text-[var(--color-text-light)] mt-1">{opt.subtitle}</div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
