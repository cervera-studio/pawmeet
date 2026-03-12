export interface Step {
  number: number;
  title: string;
  description: string;
  iconName: string;
}

/** "How it works" steps displayed on the landing page */
export const steps: readonly Step[] = [
  {
    number: 1,
    title: 'Crea il profilo del tuo cane',
    description:
      'Registrati e aggiungi il tuo amico a quattro zampe con foto, razza, taglia e le sue preferenze di socializzazione.',
    iconName: 'PawPrint',
  },
  {
    number: 2,
    title: 'Trova il match perfetto',
    description:
      'Esplora i cani compatibili nella tua zona. Il nostro algoritmo analizza taglia, energia e comportamento.',
    iconName: 'Heart',
  },
  {
    number: 3,
    title: 'Passeggia insieme',
    description:
      'Incontra nuovi amici a due e quattro zampe, condividi percorsi e rendi ogni uscita un momento speciale.',
    iconName: 'TreePine',
  },
];
