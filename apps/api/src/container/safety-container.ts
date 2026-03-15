// Safety domain: emergency contacts, walk SOS, check-in

import {
  createAddEmergencyContact,
  createDeleteEmergencyContact,
  createListEmergencyContacts,
} from '../use-cases/manage-emergency-contacts.js';
import { createWalkCheckin, createWalkSos } from '../use-cases/walk-sos.js';
import { emergencyContactRepo, notificationService, userRepo, walkRepo } from './services.js';

export const emergencyContactDeps = {
  addEmergencyContact: createAddEmergencyContact({ emergencyContactRepo }),
  listEmergencyContacts: createListEmergencyContacts({ emergencyContactRepo }),
  deleteEmergencyContact: createDeleteEmergencyContact({ emergencyContactRepo }),
  walkSos: createWalkSos({ walkRepo, userRepo, emergencyContactRepo, notificationService }),
  walkCheckin: createWalkCheckin({ emergencyContactRepo, walkRepo }),
};
