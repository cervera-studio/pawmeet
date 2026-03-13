import { AppError, fail, type Result, succeed, type EmergencyContact } from '@pawmeet/types';
import type { EmergencyContactRepository } from '../ports/index.js';

type Deps = {
  emergencyContactRepo: EmergencyContactRepository;
};

export function createAddEmergencyContact({ emergencyContactRepo }: Deps) {
  return async (
    userId: string,
    input: { name: string; phone: string; relationship?: string | null },
  ): Promise<Result<EmergencyContact>> => {
    const existing = await emergencyContactRepo.findByUserId(userId);
    if (existing.length >= 3) {
      return fail(
        new AppError('MAX_CONTACTS_REACHED', 'Puoi avere al massimo 3 contatti di emergenza', 400),
      );
    }
    const contact = await emergencyContactRepo.create(userId, input);
    return succeed(contact);
  };
}

export function createListEmergencyContacts({ emergencyContactRepo }: Deps) {
  return async (userId: string): Promise<Result<EmergencyContact[]>> => {
    const contacts = await emergencyContactRepo.findByUserId(userId);
    return succeed(contacts);
  };
}

export function createDeleteEmergencyContact({ emergencyContactRepo }: Deps) {
  return async (userId: string, contactId: string): Promise<Result<{ message: string }>> => {
    await emergencyContactRepo.delete(contactId, userId);
    return succeed({ message: 'Contatto di emergenza rimosso' });
  };
}
