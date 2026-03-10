export interface Breed {
  id: string;
  name: string;
  nameIt: string | null;
  group: string | null;
  sizeCategory: string | null;
  avgWeightKg: number | null;
}

export interface BreedRepository {
  search(query?: string): Promise<Breed[]>;
}
