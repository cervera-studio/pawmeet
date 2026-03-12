export const SPONSOR_TIER = {
  TITLE: 'title',
  GOLD: 'gold',
  SILVER: 'silver',
  PARTNER: 'partner',
} as const;

export type SponsorTier = (typeof SPONSOR_TIER)[keyof typeof SPONSOR_TIER];

export const LOGO_PLACEMENT = {
  HEADER: 'header',
  FOOTER: 'footer',
  BANNER: 'banner',
} as const;

export type LogoPlacement = (typeof LOGO_PLACEMENT)[keyof typeof LOGO_PLACEMENT];

export interface EventSponsor {
  id: string;
  eventId: string;
  organizationId: string;
  tier: SponsorTier;
  logoPlacement: LogoPlacement;
  createdAt: Date;
}
