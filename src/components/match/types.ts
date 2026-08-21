import type { MatchListingType } from '@/lib/matchScoring';

export interface MatchDraft {
  listingType: MatchListingType | null;
  lat: number | null;
  lng: number | null;
  locationLabel: string;
  schoolName?: string;
  age: number | null;
  budget: number | null;
  budgetPicked: boolean;
  budgetRequired: boolean;
  scheduleTime: string | null;
  scheduleRequired: boolean;
  desiredActivities: string[];
  requiredActivities: string[];
}

export const EMPTY_DRAFT: MatchDraft = {
  listingType: null, lat: null, lng: null, locationLabel: '', schoolName: undefined,
  age: null, budget: null, budgetPicked: false, budgetRequired: false,
  scheduleTime: null, scheduleRequired: false, desiredActivities: [], requiredActivities: [],
};

export interface StepProps {
  draft: MatchDraft;
  update: (patch: Partial<MatchDraft>) => void;
}
