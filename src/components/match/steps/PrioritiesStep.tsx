'use client';

import { MATCH_ACTIVITIES } from '@/lib/matchConstants';
import type { StepProps } from '../types';

function RequiredToggle({ required, onChange }: { required: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)] text-xs font-semibold flex-shrink-0">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-2.5 py-1.5 transition-colors ${!required ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-card)] text-[var(--color-text-light)]'}`}
      >
        Preferat
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-2.5 py-1.5 transition-colors ${required ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-card)] text-[var(--color-text-light)]'}`}
      >
        Obligatoriu
      </button>
    </div>
  );
}

export default function PrioritiesStep({ draft, update }: StepProps) {
  const isAfterschool = draft.listingType === 'afterschool';

  function toggleActivity(activity: string) {
    const has = draft.desiredActivities.includes(activity);
    if (has) {
      update({
        desiredActivities: draft.desiredActivities.filter((a) => a !== activity),
        requiredActivities: draft.requiredActivities.filter((a) => a !== activity),
      });
    } else if (draft.desiredActivities.length < 5) {
      update({ desiredActivities: [...draft.desiredActivities, activity] });
    }
  }

  function setActivityRequired(activity: string, required: boolean) {
    update({
      requiredActivities: required
        ? [...draft.requiredActivities, activity]
        : draft.requiredActivities.filter((a) => a !== activity),
    });
  }

  return (
    <div>
      <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--color-text-main)] mb-1">Ce e obligatoriu vs. preferat?</h2>
      <p className="text-sm text-[var(--color-text-light)] mb-6">Criteriile "obligatorii" elimină rezultatele care nu le respectă. Restul doar influențează scorul.</p>

      <div className="space-y-3 mb-6">
        {draft.budgetPicked && draft.budget != null && (
          <div className="flex items-center justify-between gap-3 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-4 py-3">
            <div>
              <div className="text-xs text-[var(--color-text-light)]">Buget</div>
              <div className="font-semibold text-sm text-[var(--color-text-main)]">până în {draft.budget} lei</div>
            </div>
            <RequiredToggle required={draft.budgetRequired} onChange={(v) => update({ budgetRequired: v })} />
          </div>
        )}
        {draft.scheduleTime && (
          <div className="flex items-center justify-between gap-3 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-4 py-3">
            <div>
              <div className="text-xs text-[var(--color-text-light)]">Program</div>
              <div className="font-semibold text-sm text-[var(--color-text-main)]">până la {draft.scheduleTime}</div>
            </div>
            <RequiredToggle required={draft.scheduleRequired} onChange={(v) => update({ scheduleRequired: v })} />
          </div>
        )}
      </div>

      {isAfterschool && (
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-main)] mb-1">
            Activități dorite <span className="text-[var(--color-text-light)] font-normal">(până la 5, opțional)</span>
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {MATCH_ACTIVITIES.map((activity) => {
              const selected = draft.desiredActivities.includes(activity);
              return (
                <button
                  key={activity}
                  type="button"
                  onClick={() => toggleActivity(activity)}
                  disabled={!selected && draft.desiredActivities.length >= 5}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    selected ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-bg)] text-[var(--color-text-main)] hover:bg-[var(--color-border)]'
                  }`}
                >
                  {activity}
                </button>
              );
            })}
          </div>

          {draft.desiredActivities.length > 0 && (
            <div className="space-y-2">
              {draft.desiredActivities.map((activity) => (
                <div key={activity} className="flex items-center justify-between gap-3 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-4 py-2.5">
                  <span className="text-sm font-medium text-[var(--color-text-main)]">{activity}</span>
                  <RequiredToggle
                    required={draft.requiredActivities.includes(activity)}
                    onChange={(v) => setActivityRequired(activity, v)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
