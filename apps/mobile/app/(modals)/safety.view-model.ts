import { logger } from '@pawmeet/utils';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import i18n from '@/lib/i18n';
import { api } from '@/lib/trpc';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}

interface FormState {
  name: string;
  phone: string;
  nameError?: string;
  phoneError?: string;
}

const MAX_CONTACTS = 3;

const INITIAL_FORM: FormState = {
  name: '',
  phone: '',
  nameError: undefined,
  phoneError: undefined,
};

export function useSafetyViewModel() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const loadContacts = useCallback(() => {
    api.safety.listEmergencyContacts
      .query()
      .then((data) => {
        setContacts(data);
      })
      .catch((e) => {
        logger.warn('Safety', 'Failed to load emergency contacts', e);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const setName = useCallback((name: string) => {
    setForm((prev) => ({ ...prev, name, nameError: undefined }));
  }, []);

  const setPhone = useCallback((phone: string) => {
    setForm((prev) => ({ ...prev, phone, phoneError: undefined }));
  }, []);

  const validate = useCallback((): boolean => {
    let valid = true;
    const updates: Partial<FormState> = {};

    if (!form.name.trim()) {
      updates.nameError = i18n.t('safety.nameRequired');
      valid = false;
    }

    const phoneDigits = form.phone.replace(/\D/g, '');
    if (!phoneDigits || phoneDigits.length < 6) {
      updates.phoneError = i18n.t('safety.phoneRequired');
      valid = false;
    }

    if (!valid) {
      setForm((prev) => ({ ...prev, ...updates }));
    }

    return valid;
  }, [form.name, form.phone]);

  const addContact = useCallback(() => {
    if (contacts.length >= MAX_CONTACTS) {
      Alert.alert(i18n.t('safety.maxContacts'), i18n.t('safety.maxContacts'));
      return;
    }

    if (!validate()) return;

    setAdding(true);
    api.safety.addEmergencyContact
      .mutate({ name: form.name.trim(), phone: form.phone.trim() })
      .then(() => {
        setForm(INITIAL_FORM);
        loadContacts();
      })
      .catch((e) => {
        logger.warn('Safety', 'Failed to add emergency contact', e);
        Alert.alert(i18n.t('common.error'), i18n.t('common.actionFailed'));
      })
      .finally(() => setAdding(false));
  }, [contacts.length, form.name, form.phone, validate, loadContacts]);

  const removeContact = useCallback(
    (contactId: string, contactName: string) => {
      Alert.alert(
        i18n.t('safety.deleteConfirmTitle'),
        i18n.t('safety.deleteConfirmMessage', { name: contactName }),
        [
          { text: i18n.t('common.cancel'), style: 'cancel' },
          {
            text: i18n.t('safety.deleteButton'),
            style: 'destructive',
            onPress: () => {
              api.safety.deleteEmergencyContact
                .mutate({ contactId })
                .then(() => {
                  loadContacts();
                })
                .catch((e) => {
                  logger.warn('Safety', 'Failed to remove emergency contact', e);
                  Alert.alert(i18n.t('common.error'), i18n.t('common.actionFailed'));
                });
            },
          },
        ],
      );
    },
    [loadContacts],
  );

  const canAddMore = contacts.length < MAX_CONTACTS;

  return {
    contacts,
    loading,
    adding,
    form,
    setName,
    setPhone,
    addContact,
    removeContact,
    canAddMore,
  };
}
