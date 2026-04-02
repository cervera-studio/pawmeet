import { CHALLENGE_TYPE } from '@pawmeet/config';

/** Weekly challenge templates with Italian copy */
export const WEEKLY_CHALLENGE_TEMPLATES = [
  {
    type: CHALLENGE_TYPE.WALK_COUNT,
    title: 'Completa 5 passeggiate',
    description: 'Porta il tuo cane a fare 5 passeggiate questa settimana',
    targetValue: 5,
    xpReward: 100,
  },
  {
    type: CHALLENGE_TYPE.WALK_DISTANCE_KM,
    title: 'Cammina 10 km',
    description: 'Percorri un totale di 10 km con il tuo cane questa settimana',
    targetValue: 10,
    xpReward: 100,
  },
  {
    type: CHALLENGE_TYPE.NEW_MATCHES,
    title: 'Fai 3 nuovi match',
    description: 'Trova 3 nuovi compagni di passeggiata questa settimana',
    targetValue: 3,
    xpReward: 100,
  },
  {
    type: CHALLENGE_TYPE.GROUP_EVENTS_JOINED,
    title: 'Partecipa a 2 eventi',
    description: 'Unisciti a 2 eventi di gruppo questa settimana',
    targetValue: 2,
    xpReward: 100,
  },
] as const;
