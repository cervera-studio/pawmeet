/** Dog form option arrays with Italian labels, shared across apps. */

export const SIZE_OPTIONS = [
  { value: 'toy', label: 'Toy' },
  { value: 'piccola', label: 'Piccola' },
  { value: 'media', label: 'Media' },
  { value: 'grande', label: 'Grande' },
  { value: 'gigante', label: 'Gigante' },
] as const;

export const ENERGY_OPTIONS = [
  { value: 'bassa', label: 'Bassa' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'molto_alta', label: 'Molto alta' },
] as const;

export const GENDER_OPTIONS = [
  { value: 'maschio', label: 'Maschio' },
  { value: 'femmina', label: 'Femmina' },
] as const;

export const BEHAVIOR_DOGS_OPTIONS = [
  { value: 'molto_socievole', label: 'Molto socievole' },
  { value: 'socievole', label: 'Socievole' },
  { value: 'selettivo', label: 'Selettivo' },
  { value: 'reattivo', label: 'Reattivo' },
] as const;

export const BEHAVIOR_PEOPLE_OPTIONS = [
  { value: 'molto_socievole', label: 'Molto socievole' },
  { value: 'socievole', label: 'Socievole' },
  { value: 'timido', label: 'Timido' },
  { value: 'diffidente', label: 'Diffidente' },
] as const;

export const LEASH_OPTIONS = [
  { value: 'eccellente', label: 'Eccellente' },
  { value: 'buono', label: 'Buono' },
  { value: 'in_addestramento', label: 'In addestramento' },
  { value: 'difficile', label: 'Difficile' },
] as const;

export const RECALL_OPTIONS = [
  { value: 'affidabile', label: 'Affidabile' },
  { value: 'parziale', label: 'Parziale' },
  { value: 'non_affidabile', label: 'Non affidabile' },
] as const;

export const WALK_TIME_OPTIONS = [
  { value: 'mattina_presto', label: 'Mattina presto' },
  { value: 'mattina', label: 'Mattina' },
  { value: 'pomeriggio', label: 'Pomeriggio' },
  { value: 'sera', label: 'Sera' },
  { value: 'sera_tardi', label: 'Sera tardi' },
] as const;

export const TERRAIN_OPTIONS = [
  { value: 'urbano', label: 'Urbano' },
  { value: 'parco', label: 'Parco' },
  { value: 'campagna', label: 'Campagna' },
  { value: 'spiaggia', label: 'Spiaggia' },
  { value: 'montagna', label: 'Montagna' },
] as const;
