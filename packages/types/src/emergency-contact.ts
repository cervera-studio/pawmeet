export interface EmergencyContact {
  id: string;
  userId: string;
  name: string;
  phone: string;
  relationship: string | null;
  createdAt: Date;
}

export const SAFETY_CHECKIN_TYPE = {
  CHECKIN: 'checkin',
  SOS: 'sos',
  AUTO_ALERT: 'auto_alert',
} as const;

export type SafetyCheckinType = (typeof SAFETY_CHECKIN_TYPE)[keyof typeof SAFETY_CHECKIN_TYPE];

export interface WalkSafetyCheckin {
  id: string;
  walkId: string;
  userId: string;
  type: SafetyCheckinType;
  latitude: string | null;
  longitude: string | null;
  createdAt: Date;
}
