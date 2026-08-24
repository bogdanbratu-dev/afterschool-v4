'use client';

import { motion } from 'framer-motion';
import { CLUB_CATEGORY_LABELS, type ClubCategory } from '@/lib/clubs';
import type { ClubStepProps } from '../../clubTypes';

const CATEGORY_ICONS: Record<ClubCategory, string> = {
  inot: '🏊', fotbal: '⚽', dansuri: '💃', arte_martiale: '🥋',
  gimnastica: '🤸', limbi_straine: '🌍', robotica: '🤖', muzica: '🎵', arte_creative: '🎨',
};

export default function ClubCategoryStep({ draft, update }: ClubStepProps) {
  return (
    <div>
      <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--color-text-main)] mb-1">Ce activitate cauți?</h2>
      <p className="text-sm text-[var(--color-text-light)] mb-6">Alege categoria principală de interes a copilului.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {(Object.keys(CLUB_CATEGORY_LABELS) as ClubCategory[]).map((category) => (
          <motion.button
            key={category}
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => update({ category })}
            className={`flex flex-col items-center gap-1.5 py-4 rounded-2xl border-2 font-semibold text-sm transition-colors ${
              draft.category === category
                ? 'border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)]'
                : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-main)] hover:border-[var(--color-primary)]'
            }`}
          >
            <span className="text-2xl">{CATEGORY_ICONS[category]}</span>
            {CLUB_CATEGORY_LABELS[category]}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
