export interface Step {
  number: string;
  title: string;
  description: string;
}

/** "How it works" steps displayed on the landing page */
export const steps: readonly Step[] = [
  {
    number: '01',
    title: 'Crea il profilo del tuo cane',
    description:
      'Registrati e aggiungi il tuo amico a quattro zampe con foto, razza, taglia e le sue preferenze di socializzazione.',
  },
  {
    number: '02',
    title: 'Trova passeggiate vicino a te',
    description:
      'Esplora la mappa e scopri passeggiate organizzate nella tua zona o crea la tua e invita altri proprietari.',
  },
  {
    number: '03',
    title: 'Passeggia insieme',
    description:
      'Incontra nuovi amici (a due e quattro zampe), condividi percorsi e rendi ogni uscita un momento speciale.',
  },
];
