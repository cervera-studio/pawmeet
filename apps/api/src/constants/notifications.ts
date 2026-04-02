/**
 * Centralized Italian push notification titles and body templates.
 * Grouped by feature domain.
 */

// ── Matching ──────────────────────────────────────────────────────────────────

export const NOTIF_NEW_MATCH = {
  title: 'Hai un nuovo match! \u{1F415}',
  body: (dogName: string) => `Il tuo cane ${dogName} ha un nuovo compagno di passeggiata!`,
} as const;

// ── Walks ─────────────────────────────────────────────────────────────────────

export const NOTIF_WALK_PROPOSAL = {
  title: '\u{1F43E} Nuova proposta di passeggiata',
  body: (displayName: string, walkTitle?: string | null) =>
    `${displayName} ti ha proposto una passeggiata${walkTitle ? `: ${walkTitle}` : ''}`,
} as const;

export const NOTIF_WALK_RESPONSE = {
  title: (accepted: boolean) =>
    `${accepted ? '\u2705' : '\u274C'} Passeggiata ${accepted ? 'accettata' : 'rifiutata'}`,
  body: (displayName: string, accepted: boolean) =>
    `${displayName} ha ${accepted ? 'accettato' : 'rifiutato'} la tua proposta di passeggiata`,
} as const;

export const NOTIF_WALK_CANCELLED = {
  title: '\u274C Passeggiata annullata',
  body: (displayName: string) => `${displayName} ha annullato la passeggiata`,
} as const;

export const NOTIF_WALK_SOS = {
  title: '\u{1F6A8} SOS \u2014 Richiesta di aiuto',
  body: (displayName: string, locationText: string) =>
    `${displayName} ha inviato un SOS durante la passeggiata${locationText}`,
} as const;

// ── Social / Follows ──────────────────────────────────────────────────────────

export const NOTIF_NEW_FOLLOWER = {
  title: 'Nuovo follower!',
  body: (displayName: string) => `${displayName} ha iniziato a seguirti`,
} as const;

// ── Feed ──────────────────────────────────────────────────────────────────────

export const NOTIF_POST_LIKED = {
  title: (likerName: string) => `${likerName} ha messo mi piace`,
  body: (caption: string | null) =>
    caption
      ? `Al tuo post: ${caption.length > 50 ? `${caption.slice(0, 47)}...` : caption}`
      : 'Al tuo post',
} as const;

export const NOTIF_POST_COMMENTED = {
  title: (commenterName: string) => `${commenterName} ha commentato`,
} as const;

export const NOTIF_COMMENT_REPLIED = {
  title: (commenterName: string) => `${commenterName} ha risposto al tuo commento`,
} as const;

// ── Group Events ──────────────────────────────────────────────────────────────

export const NOTIF_EVENT_INVITE = {
  title: 'Invito a un evento',
  body: (eventTitle: string) => `Sei stato invitato a "${eventTitle}"`,
} as const;

export const NOTIF_EVENT_REQUEST_APPROVED = {
  title: 'Richiesta approvata',
  body: (eventTitle: string) =>
    `La tua richiesta per l'evento "${eventTitle}" \u00E8 stata approvata!`,
} as const;

export const NOTIF_EVENT_REQUEST_DECLINED = {
  title: 'Richiesta rifiutata',
  body: (eventTitle: string) =>
    `La tua richiesta per l'evento "${eventTitle}" \u00E8 stata rifiutata`,
} as const;

export const NOTIF_EVENT_COMPLETED = {
  title: 'Evento completato',
  body: (eventTitle: string) => `"${eventTitle}" \u00E8 terminato. Com'\u00E8 andata?`,
} as const;

export const NOTIF_PROMOTED_FROM_WAITLIST = {
  title: 'Posto disponibile!',
  body: (eventTitle: string) => `Sei stato promosso dalla lista d'attesa per "${eventTitle}"`,
} as const;

// ── Moderation ────────────────────────────────────────────────────────────────

export const NOTIF_PHOTO_REJECTED = {
  title: 'Foto rifiutata',
  body: 'Una delle foto del tuo cane non rispetta le linee guida.',
} as const;

export const NOTIF_CONTENT_REJECTED = {
  title: 'Contenuto rifiutato',
  body: 'Uno dei tuoi contenuti non rispetta le linee guida.',
} as const;

export const NOTIF_TOXICITY_WARNING = {
  title: 'Avviso',
  commentBody:
    'Il tuo commento potrebbe contenere linguaggio inappropriato. Ti chiediamo di mantenere un tono rispettoso.',
  messageBody:
    'Il tuo messaggio potrebbe contenere linguaggio inappropriato. Ti chiediamo di mantenere un tono rispettoso.',
} as const;

// ── Nearby / Discovery ────────────────────────────────────────────────────────

export const NOTIF_NEARBY_SUGGESTION = {
  title: '\u{1F4CD} Cani nelle vicinanze!',
  body: (count: number) =>
    count === 1
      ? "C'\u00E8 1 cane compatibile nella tua zona \u2014 scoprilo!"
      : `Ci sono ${count} cani compatibili nella tua zona \u2014 scoprili!`,
} as const;

export const NOTIF_RISING_COMPATIBILITY = {
  title: 'Nuove compatibilit\u00E0 in crescita!',
  body: (risingCount: number) =>
    `Hai ${risingCount} nuovi match con compatibilit\u00E0 in aumento. Dai un'occhiata!`,
} as const;

// ── Fallback display name ─────────────────────────────────────────────────────

export const FALLBACK_DISPLAY_NAME = 'Qualcuno';
