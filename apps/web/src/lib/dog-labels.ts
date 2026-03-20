import type { BehaviorWithDogs, DogSize, EnergyLevel, Gender } from '@pawmeet/types';

type LabelMap<T extends string> = Record<T, string>;

const sizeIt: LabelMap<DogSize> = {
  toy: 'Toy',
  small: 'Piccola',
  medium: 'Media',
  large: 'Grande',
  giant: 'Gigante',
};

const sizeLabels: Record<string, LabelMap<DogSize>> = {
  it: sizeIt,
  en: { toy: 'Toy', small: 'Small', medium: 'Medium', large: 'Large', giant: 'Giant' },
  es: { toy: 'Toy', small: 'Pequeño', medium: 'Mediano', large: 'Grande', giant: 'Gigante' },
  ro: { toy: 'Toy', small: 'Mic', medium: 'Mediu', large: 'Mare', giant: 'Gigant' },
};

const energyIt: LabelMap<EnergyLevel> = {
  low: 'Bassa',
  medium: 'Media',
  high: 'Alta',
  very_high: 'Molto alta',
};

const energyLabels: Record<string, LabelMap<EnergyLevel>> = {
  it: energyIt,
  en: { low: 'Low', medium: 'Medium', high: 'High', very_high: 'Very high' },
  es: { low: 'Baja', medium: 'Media', high: 'Alta', very_high: 'Muy alta' },
  ro: { low: 'Scăzută', medium: 'Medie', high: 'Ridicată', very_high: 'Foarte ridicată' },
};

const behaviorIt: LabelMap<BehaviorWithDogs> = {
  very_friendly: 'Molto socievole',
  friendly: 'Socievole',
  selective: 'Selettivo',
  reactive: 'Reattivo',
};

const behaviorLabels: Record<string, LabelMap<BehaviorWithDogs>> = {
  it: behaviorIt,
  en: {
    very_friendly: 'Very friendly',
    friendly: 'Friendly',
    selective: 'Selective',
    reactive: 'Reactive',
  },
  es: {
    very_friendly: 'Muy sociable',
    friendly: 'Sociable',
    selective: 'Selectivo',
    reactive: 'Reactivo',
  },
  ro: {
    very_friendly: 'Foarte sociabil',
    friendly: 'Sociabil',
    selective: 'Selectiv',
    reactive: 'Reactiv',
  },
};

const genderIt: LabelMap<Gender> = { male: 'Maschio', female: 'Femmina' };

const genderLabels: Record<string, LabelMap<Gender>> = {
  it: genderIt,
  en: { male: 'Male', female: 'Female' },
  es: { male: 'Macho', female: 'Hembra' },
  ro: { male: 'Mascul', female: 'Femelă' },
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
