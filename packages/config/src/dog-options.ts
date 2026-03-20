/** Dog form option arrays with Italian labels, shared across apps. */

export const SIZE_OPTIONS = [
  { value: 'toy', label: 'Toy' },
  { value: 'small', label: 'Piccola' },
  { value: 'medium', label: 'Media' },
  { value: 'large', label: 'Grande' },
  { value: 'giant', label: 'Gigante' },
] as const;

export const ENERGY_OPTIONS = [
  { value: 'low', label: 'Bassa' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'very_high', label: 'Molto alta' },
] as const;

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Maschio' },
  { value: 'female', label: 'Femmina' },
] as const;

export const BEHAVIOR_DOGS_OPTIONS = [
  { value: 'very_friendly', label: 'Molto socievole' },
  { value: 'friendly', label: 'Socievole' },
  { value: 'selective', label: 'Selettivo' },
  { value: 'reactive', label: 'Reattivo' },
] as const;

export const BEHAVIOR_PEOPLE_OPTIONS = [
  { value: 'very_friendly', label: 'Molto socievole' },
  { value: 'friendly', label: 'Socievole' },
  { value: 'shy', label: 'Timido' },
  { value: 'wary', label: 'Diffidente' },
] as const;

export const LEASH_OPTIONS = [
  { value: 'excellent', label: 'Eccellente' },
  { value: 'good', label: 'Buono' },
  { value: 'in_training', label: 'In addestramento' },
  { value: 'difficult', label: 'Difficile' },
] as const;

export const RECALL_OPTIONS = [
  { value: 'reliable', label: 'Affidabile' },
  { value: 'partial', label: 'Parziale' },
  { value: 'unreliable', label: 'Non affidabile' },
] as const;

export const WALK_TIME_OPTIONS = [
  { value: 'early_morning', label: 'Mattina presto' },
  { value: 'morning', label: 'Mattina' },
  { value: 'afternoon', label: 'Pomeriggio' },
  { value: 'evening', label: 'Sera' },
  { value: 'late_evening', label: 'Sera tardi' },
] as const;

export const TERRAIN_OPTIONS = [
  { value: 'urban', label: 'Urbano' },
  { value: 'park', label: 'Parco' },
  { value: 'countryside', label: 'Campagna' },
  { value: 'beach', label: 'Spiaggia' },
  { value: 'mountain', label: 'Montagna' },
] as const;
