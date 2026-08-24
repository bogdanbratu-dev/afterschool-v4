'use client';

import { motion } from 'framer-motion';
import { ENERGY_OPTIONS } from '@/lib/clubMatchConstants';
import type { ClubStepProps } from '../../clubTypes';

export default function ClubEnergyStep({ draft, update }: ClubStepProps) {
  return (
    <div>
      <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--color-text-main)] mb-1">Cât de energic e copilul?</h2>
      <p className="text-sm text-[var(--color-text-light)] mb-6">Ne ajută să potrivim ritmul activității.</p>
      <div className="flex flex-col gap-2.5">
        {ENERGY_OPTIONS.map((o) => (
          <motion.button
            key={o.value}
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => update({ energy: o.value })}
            className={`text-left px-5 py-3.5 rounded-xl border-2 font-medium transition-colors ${
              draft.energy === o.value
                ? 'border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)]'
                : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-main)] hover:border-[var(--color-primary)]'
            }`}
          >
            {o.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
