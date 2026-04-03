import enBreeds from './en.json';
import itBreeds from './it.json';
import breedSizes from './sizes.json';

const enMap: Record<string, string> = enBreeds;
const itMap: Record<string, string> = itBreeds;

const BREED_NAMES: Record<string, Record<string, string>> = {
  en: enMap,
  it: itMap,
};

/** All known breed codes. */
export const BREED_CODES = Object.keys(enMap);

/** Resolve a breed display name for a given code and locale. Falls back to EN, then to the code itself. */
export function getBreedName(code: string, locale: string): string {
  return BREED_NAMES[locale]?.[code] ?? enMap[code] ?? code;
}

type BreedSize = 'toy' | 'small' | 'medium' | 'large' | 'giant';

const sizeMap = breedSizes as Record<string, BreedSize>;

/** Returns the typical size for a breed, or null for mixed breeds. */
export function getBreedSize(code: string): BreedSize | null {
  return sizeMap[code] ?? null;
}
