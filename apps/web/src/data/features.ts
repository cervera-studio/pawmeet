export interface Feature {
  title: string;
  description: string;
  icon: string;
}

/** App features displayed on the landing page */
export const features: readonly Feature[] = [
  {
    title: 'Mappa interattiva',
    description:
      'Visualizza i percorsi e i punti di ritrovo nella tua zona. Trova i parchi dog-friendly e i sentieri migliori.',
    icon: '\u{1F5FA}\uFE0F',
  },
  {
    title: 'Match intelligente',
    description:
      'Il nostro algoritmo trova cani compatibili per taglia, energia e temperamento. Passeggiate senza stress.',
    icon: '\u{1F91D}',
  },
  {
    title: 'Calendario condiviso',
    description:
      'Pianifica le passeggiate in anticipo e ricevi notifiche. Non perdere mai un appuntamento con i tuoi amici.',
    icon: '\u{1F4C5}',
  },
  {
    title: 'Profili dettagliati',
    description:
      'Ogni cane ha il suo profilo con foto, preferenze e storia. Conosci i compagni di passeggiata prima di incontrarli.',
    icon: '\u{1F415}',
  },
  {
    title: 'Chat di gruppo',
    description:
      'Comunica con gli altri proprietari, condividi consigli e organizza passeggiate spontanee nel quartiere.',
    icon: '\u{1F4AC}',
  },
  {
    title: 'Tracciamento percorsi',
    description:
      'Registra i tuoi percorsi preferiti, la distanza e il tempo. Tieni traccia delle avventure del tuo cane.',
    icon: '\u{1F4CD}',
  },
];
