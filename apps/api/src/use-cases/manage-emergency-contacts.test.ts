import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import type { EmergencyContactRepository } from '../ports/emergency-contact-repository.js';
import {
  createAddEmergencyContact,
  createDeleteEmergencyContact,
  createListEmergencyContacts,
} from './manage-emergency-contacts.js';

function buildEmergencyContactRepo(
  overrides: Partial<EmergencyContactRepository> = {},
): EmergencyContactRepository {
  return {
    create: vi.fn().mockResolvedValue({
      id: 'ec-1',
      userId: 'user-1',
      name: 'Mamma',
      phone: '+39123456789',
      relationship: 'mother',
    }),
    findByUserId: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
    createCheckin: vi.fn(),
    findCheckinsByWalk: vi.fn(),
    ...overrides,
  };
}

describe('createAddEmergencyContact', () => {
  it('adds a contact', async () => {
    const deps = { emergencyContactRepo: buildEmergencyContactRepo() };
    const addContact = createAddEmergencyContact(deps);

    const result = await addContact('user-1', { name: 'Mamma', phone: '+39123456789' });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.name).toBe('Mamma');
  });

  it('fails with 400 when max contacts (3) reached', async () => {
    const deps = {
      emergencyContactRepo: buildEmergencyContactRepo({
        findByUserId: vi.fn().mockResolvedValue([{}, {}, {}]),
      }),
    };
    const addContact = createAddEmergencyContact(deps);

    const result = await addContact('user-1', { name: 'New', phone: '+39000' });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('MAX_CONTACTS_REACHED');
    expect(result.error.status).toBe(400);
  });
});

describe('createListEmergencyContacts', () => {
  it('returns contacts', async () => {
    const deps = { emergencyContactRepo: buildEmergencyContactRepo() };
    const listContacts = createListEmergencyContacts(deps);

    const result = await listContacts('user-1');

    expect(isSuccess(result)).toBe(true);
  });
});

describe('createDeleteEmergencyContact', () => {
  it('deletes a contact', async () => {
    const deps = { emergencyContactRepo: buildEmergencyContactRepo() };
    const deleteContact = createDeleteEmergencyContact(deps);

    const result = await deleteContact('user-1', 'ec-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message).toBe('Emergency contact removed');
    expect(deps.emergencyContactRepo.delete).toHaveBeenCalledWith('ec-1', 'user-1');
  });
});
