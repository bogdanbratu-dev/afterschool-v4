import type { ClubCategory } from '@/lib/clubs';
import type { EnergyLevel, SocialLevel, GoalType, CompetitionLevel } from '@/lib/clubMatchConstants';

export interface ClubMatchDraft {
  category: ClubCategory | null;
  lat: number | null;
  lng: number | null;
  locationLabel: string;
  age: number | null;
  energy: EnergyLevel | null;
  social: SocialLevel | null;
  goal: GoalType | null;
  competition: CompetitionLevel | null;
  budget: number | null;
  budgetPicked: boolean;
}

export const EMPTY_CLUB_DRAFT: ClubMatchDraft = {
  category: null, lat: null, lng: null, locationLabel: '',
  age: null, energy: null, social: null, goal: null, competition: null,
  budget: null, budgetPicked: false,
};

export interface ClubStepProps {
  draft: ClubMatchDraft;
  update: (patch: Partial<ClubMatchDraft>) => void;
}
