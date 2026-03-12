export interface Feature {
  title: string;
  description: string;
  iconName: string;
  highlighted?: boolean;
  comingSoon?: boolean;
}

/** App features displayed on the landing page */
export const features: readonly Feature[] = [
  {
    title: 'Match intelligente',
    description:
      'Il nostro algoritmo trova cani compatibili per taglia, energia e temperamento. Passeggiate senza stress.',
    iconName: 'Sparkles',
    highlighted: true,
  },
  {
    title: 'Mappa interattiva',
    description:
      'Visualizza i percorsi e i punti di ritrovo nella tua zona. Trova i parchi dog-friendly e i sentieri migliori.',
    iconName: 'MapPin',
  },
  {
    title: 'Chat sicura',
    description:
      'Comunica con gli altri proprietari, condividi consigli e organizza passeggiate spontanee nel quartiere.',
    iconName: 'MessageCircle',
  },
  {
    title: 'Profili dettagliati',
    description:
      'Ogni cane ha il suo profilo con foto, preferenze e storia. Conosci i compagni di passeggiata prima di incontrarli.',
    iconName: 'Dog',
  },
  {
    title: 'Calendario condiviso',
    description:
      'Pianifica le passeggiate in anticipo e ricevi notifiche. Non perdere mai un appuntamento con i tuoi amici.',
    iconName: 'CalendarDays',
  },
  {
    title: 'Tracciamento percorsi',
    description:
      'Registra i tuoi percorsi preferiti, la distanza e il tempo. Tieni traccia delle avventure del tuo cane.',
    iconName: 'Route',
    comingSoon: true,
  },
];
