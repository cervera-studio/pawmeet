import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { usePaginatedData } from '@/hooks/use-paginated-data';
import { fetchEmergencyContacts } from '../actions';

export type ContactsData = Awaited<ReturnType<typeof fetchEmergencyContacts>>;
export type EmergencyContactItem = ContactsData['data'][number];

export function useContactsViewModel(initialData: ContactsData, pageSize: number) {
  const tt = useTranslations('toast');

  const buildParams = useCallback(
    (ctx: { page: number; pageSize: number; search: string | undefined }) => ({
      page: ctx.page,
      pageSize: ctx.pageSize,
      search: ctx.search,
    }),
    [],
  );

  return usePaginatedData({
    initialData,
    pageSize,
    fetchFn: fetchEmergencyContacts,
    buildParams,
    errorMessage: tt('safety.contactsLoadError'),
  });
}
