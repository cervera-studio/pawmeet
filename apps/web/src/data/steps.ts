export interface Step {
  id: string;
  number: number;
  iconName: string;
}

/** "How it works" steps displayed on the landing page */
export const steps: readonly Step[] = [
  { id: 'createProfile', number: 1, iconName: 'PawPrint' },
  { id: 'findCompanions', number: 2, iconName: 'Heart' },
  { id: 'walkTogether', number: 3, iconName: 'TreePine' },
];
