import type { RouterOutput } from '@pawmeet/api-client';
import type { SupportTicketCategory } from '@pawmeet/types';
import { SUPPORT_TICKET_CATEGORY } from '@pawmeet/types';

type Ticket = RouterOutput['support']['listMyTickets'][number];

import { logger } from '@pawmeet/utils';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import i18n from '@/lib/i18n';
import { api } from '@/lib/trpc';

interface CategoryOption {
  readonly value: SupportTicketCategory;
  readonly label: string;
}

function getCategoryOptions(): CategoryOption[] {
  return [
    { value: SUPPORT_TICKET_CATEGORY.General, label: i18n.t('support.categories.general') },
    { value: SUPPORT_TICKET_CATEGORY.Bug, label: i18n.t('support.categories.bug') },
    { value: SUPPORT_TICKET_CATEGORY.Account, label: i18n.t('support.categories.account') },
    { value: SUPPORT_TICKET_CATEGORY.Safety, label: i18n.t('support.categories.safety') },
    { value: SUPPORT_TICKET_CATEGORY.Billing, label: i18n.t('support.categories.billing') },
    { value: SUPPORT_TICKET_CATEGORY.Other, label: i18n.t('support.categories.other') },
  ];
}

export function useSupportViewModel() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form fields
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportTicketCategory>(SUPPORT_TICKET_CATEGORY.General);
  const [message, setMessage] = useState('');

  const categoryOptions = getCategoryOptions();

  const fetchTickets = useCallback(async () => {
    try {
      const data = await api.support.listMyTickets.query();
      setTickets(data);
    } catch (e) {
      logger.warn('Support', 'Failed to fetch tickets', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchTickets();
  }, [fetchTickets]);

  const handleCreateTicket = useCallback(async () => {
    if (!(subject.trim() && message.trim())) return;

    setCreating(true);
    try {
      const ticket = await api.support.createTicket.mutate({
        subject: subject.trim(),
        category,
        message: message.trim(),
      });

      // Reset form
      setSubject('');
      setCategory(SUPPORT_TICKET_CATEGORY.General);
      setMessage('');
      setShowCreateForm(false);

      // Navigate to the new ticket chat
      router.push(`/(modals)/support-chat?ticketId=${ticket.id}`);
    } catch (e) {
      logger.warn('Support', 'Failed to create ticket', e);
      Alert.alert(i18n.t('common.error'), i18n.t('common.actionFailed'));
    } finally {
      setCreating(false);
    }
  }, [subject, category, message, router]);

  const handleTicketPress = useCallback(
    (ticketId: string) => {
      router.push(`/(modals)/support-chat?ticketId=${ticketId}`);
    },
    [router],
  );

  const canCreate = Boolean(subject.trim()) && Boolean(message.trim()) && !creating;

  return {
    tickets,
    loading,
    refreshing,
    creating,
    showCreateForm,
    setShowCreateForm,
    subject,
    setSubject,
    category,
    setCategory,
    message,
    setMessage,
    categoryOptions,
    canCreate,
    handleRefresh,
    handleCreateTicket,
    handleTicketPress,
  };
}
