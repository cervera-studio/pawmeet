export const MOOD_NOTES_MAX_LENGTH = 300;
export const MOOD_MAX_TAGS = 5;

export const MOOD_TAGS = [
  'socialization_ok',
  'socialization_ko',
  'pulled_on_leash',
  'calm',
  'anxious',
  'playful',
  'reactive',
  'tired',
  'energetic',
] as const;

export const MOOD_TAG_OPTIONS = [
  { value: 'socialization_ok', label: 'Socializzazione OK' },
  { value: 'socialization_ko', label: 'Socializzazione KO' },
  { value: 'pulled_on_leash', label: 'Tirato al guinzaglio' },
  { value: 'calm', label: 'Calmo' },
  { value: 'anxious', label: 'Ansioso' },
  { value: 'playful', label: 'Giocoso' },
  { value: 'reactive', label: 'Reattivo' },
  { value: 'tired', label: 'Stanco' },
  { value: 'energetic', label: 'Energico' },
] as const;
