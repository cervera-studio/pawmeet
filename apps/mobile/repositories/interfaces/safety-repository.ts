export interface SosInput {
  walkId: string;
  latitude?: number;
  longitude?: number;
}

export interface CheckinInput {
  walkId: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}

export interface SafetyRepository {
  sos(input: SosInput): Promise<void>;
  checkin(input: CheckinInput): Promise<void>;
  addEmergencyContact(name: string, phone: string): Promise<{ contactId: string }>;
  listEmergencyContacts(): Promise<{ contacts: EmergencyContact[] }>;
  deleteEmergencyContact(contactId: string): Promise<void>;
}
