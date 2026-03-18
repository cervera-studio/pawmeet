export type MoodTag =
  | 'socialization_ok'
  | 'socialization_ko'
  | 'pulled_on_leash'
  | 'calm'
  | 'anxious'
  | 'playful'
  | 'reactive'
  | 'tired'
  | 'energetic';

export interface MoodLog {
  id: string;
  dogId: string;
  trackId: string;
  userId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  tags: MoodTag[];
  notes: string | null;
  createdAt: Date;
}
