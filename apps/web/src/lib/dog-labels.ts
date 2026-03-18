import type { BehaviorWithDogs, DogSize, EnergyLevel, Gender } from '@pawmeet/types';

type LabelMap<T extends string> = Record<T, string>;

const sizeIt: LabelMap<DogSize> = {
  toy: 'Toy',
  piccola: 'Piccola',
  media: 'Media',
  grande: 'Grande',
  gigante: 'Gigante',
};

const sizeLabels: Record<string, LabelMap<DogSize>> = {
  it: sizeIt,
  en: { toy: 'Toy', piccola: 'Small', media: 'Medium', grande: 'Large', gigante: 'Giant' },
  es: { toy: 'Toy', piccola: 'Pequeño', media: 'Mediano', grande: 'Grande', gigante: 'Gigante' },
  ro: { toy: 'Toy', piccola: 'Mic', media: 'Mediu', grande: 'Mare', gigante: 'Gigant' },
};

const energyIt: LabelMap<EnergyLevel> = {
  bassa: 'Bassa',
  media: 'Media',
  alta: 'Alta',
  molto_alta: 'Molto alta',
};

const energyLabels: Record<string, LabelMap<EnergyLevel>> = {
  it: energyIt,
  en: { bassa: 'Low', media: 'Medium', alta: 'High', molto_alta: 'Very high' },
  es: { bassa: 'Baja', media: 'Media', alta: 'Alta', molto_alta: 'Muy alta' },
  ro: { bassa: 'Scăzută', media: 'Medie', alta: 'Ridicată', molto_alta: 'Foarte ridicată' },
};

const behaviorIt: LabelMap<BehaviorWithDogs> = {
  molto_socievole: 'Molto socievole',
  socievole: 'Socievole',
  selettivo: 'Selettivo',
  reattivo: 'Reattivo',
};

const behaviorLabels: Record<string, LabelMap<BehaviorWithDogs>> = {
  it: behaviorIt,
  en: {
    molto_socievole: 'Very friendly',
    socievole: 'Friendly',
    selettivo: 'Selective',
    reattivo: 'Reactive',
  },
  es: {
    molto_socievole: 'Muy sociable',
    socievole: 'Sociable',
    selettivo: 'Selectivo',
    reattivo: 'Reactivo',
  },
  ro: {
    molto_socievole: 'Foarte sociabil',
    socievole: 'Sociabil',
    selettivo: 'Selectiv',
    reattivo: 'Reactiv',
  },
};

const genderIt: LabelMap<Gender> = { maschio: 'Maschio', femmina: 'Femmina' };

const genderLabels: Record<string, LabelMap<Gender>> = {
  it: genderIt,
  en: { maschio: 'Male', femmina: 'Female' },
  es: { maschio: 'Macho', femmina: 'Hembra' },
  ro: { maschio: 'Mascul', femmina: 'Femelă' },
};

export function getSizeLabel(size: DogSize, locale: string): string {
  return (sizeLabels[locale] ?? sizeIt)[size];
}

export function getEnergyLabel(energy: EnergyLevel, locale: string): string {
  return (energyLabels[locale] ?? energyIt)[energy];
}

export function getBehaviorLabel(behavior: BehaviorWithDogs, locale: string): string {
  return (behaviorLabels[locale] ?? behaviorIt)[behavior];
}

export function getGenderLabel(gender: Gender, locale: string): string {
  return (genderLabels[locale] ?? genderIt)[gender];
}
