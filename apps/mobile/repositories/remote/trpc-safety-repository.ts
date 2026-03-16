import type { ApiClient } from '@pawmeet/api-client';
import type { SafetyRepository } from '../interfaces';

export function createTrpcSafetyRepository(api: ApiClient): SafetyRepository {
  return {
    async sos(input) {
      await api.safety.sos.mutate(input);
    },
    async checkin(input) {
      await api.safety.checkin.mutate(input);
    },
    async addEmergencyContact(name, phone) {
      const result = await api.safety.addEmergencyContact.mutate({ name, phone });
      return { contactId: result.id };
    },
    async listEmergencyContacts() {
      const result = await api.safety.listEmergencyContacts.query();
      return {
        contacts: result.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
        })),
      };
    },
    async deleteEmergencyContact(contactId) {
      await api.safety.deleteEmergencyContact.mutate({ contactId });
    },
  };
}
