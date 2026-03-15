export interface Breed {
  id: string;
  name: string;
  nameIt: string | null;
  group: string | null;
  sizeCategory: string | null;
  avgWeightKg: number | null;
  energy: number | null;
  playfulness: number | null;
  trainability: number | null;
  barking: number | null;
  goodWithOtherDogs: number | null;
  goodWithChildren: number | null;
  goodWithStrangers: number | null;
  protectiveness: number | null;
  shedding: number | null;
  grooming: number | null;
}

export interface BreedRepository {
  search(query?: string): Promise<Breed[]>;
}
