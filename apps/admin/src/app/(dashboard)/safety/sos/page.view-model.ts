import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { usePaginatedData } from '@/hooks/use-paginated-data';
import { fetchSosAlerts } from '../actions';

export type AlertType = 'sos' | 'auto_alert' | 'checkin';

export type SosData = Awaited<ReturnType<typeof fetchSosAlerts>>;
export type SosAlertItem = SosData['data'][number];

export const ALERT_TYPES: AlertType[] = ['sos', 'auto_alert', 'checkin'];

export function isAlertType(v: string): v is AlertType {
  return (ALERT_TYPES as string[]).includes(v);
}

export function useSosViewModel(initialData: SosData, pageSize: number) {
  const tt = useTranslations('toast');
  const [typeFilter, setTypeFilter] = useState<AlertType | undefined>(undefined);

  const buildParams = useCallback(
    (ctx: { page: number; pageSize: number }) => ({
      page: ctx.page,
      pageSize: ctx.pageSize,
      type: typeFilter,
    }),
    [typeFilter],
  );

  const paginated = usePaginatedData({
    initialData,
    pageSize,
    fetchFn: fetchSosAlerts,
    buildParams,
    errorMessage: tt('safety.sosLoadError'),
    enableSearch: false,
  });

  function handleTypeFilterChange(type: AlertType | undefined) {
    setTypeFilter(type);
    paginated.resetPage();
  }

  return {
    ...paginated,
    typeFilter,
    setTypeFilter: handleTypeFilterChange,
  };
}
