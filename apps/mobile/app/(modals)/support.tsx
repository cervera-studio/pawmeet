import type { RouterOutput } from '@pawmeet/api-client';
import type { SupportTicketStatus } from '@pawmeet/types';

type Ticket = RouterOutput['support']['listMyTickets'][number];

import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChipSelect } from '@/components/ChipSelect';
import { Button } from '@/components/ui/Button';
import { getDateLocale } from '@/lib/i18n';
import { useSupportViewModel } from './_vm/support.view-model';

const STATUS_COLORS: Record<SupportTicketStatus, { bg: string; text: string }> = {
  open: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  in_progress: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
  },
  resolved: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  closed: { bg: 'bg-gray-100 dark:bg-[#38383A]', text: 'text-gray-500 dark:text-neutral-400' },
};

function StatusBadge({ status }: { status: SupportTicketStatus }) {
  const { t } = useTranslation();
  const colors = STATUS_COLORS[status];

  return (
    <View className={`rounded-full px-3 py-1 ${colors.bg}`}>
      <Text className={`text-xs font-medium ${colors.text}`}>{t(`support.status.${status}`)}</Text>
    </View>
  );
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString(getDateLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

function TicketRow({ ticket, onPress }: { ticket: Ticket; onPress: (id: string) => void }) {
  return (
    <Pressable
      onPress={() => onPress(ticket.id)}
      className="border-b border-gray-100 dark:border-[#38383A] px-6 py-4"
    >
      <View className="flex-row items-center justify-between mb-1">
        <Text
          className="flex-1 text-base font-medium text-gray-900 dark:text-[#F5F5F7]"
          numberOfLines={1}
        >
          {ticket.subject}
        </Text>
        <StatusBadge status={ticket.status} />
      </View>
      <Text className="text-xs text-gray-400 dark:text-neutral-500">
        {formatDate(ticket.createdAt)}
      </Text>
    </Pressable>
  );
}

function EmptyState({ t }: { t: (key: string) => string }) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text className="text-center text-base text-gray-400 dark:text-neutral-500">
        {t('support.empty')}
      </Text>
    </View>
  );
}

export default function SupportModal() {
  const { t } = useTranslation();
  const vm = useSupportViewModel();

  if (vm.showCreateForm) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]" edges={['bottom']}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="flex-1 px-6 py-4">
            <Text className="mb-6 text-2xl font-bold text-gray-900 dark:text-[#F5F5F7]">
              {t('support.newTicket')}
            </Text>

            <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
              {t('support.subjectLabel')}
            </Text>
            <TextInput
              className="mb-4 rounded-xl border border-gray-200 dark:border-[#38383A] px-4 py-3 text-base text-gray-900 dark:text-[#F5F5F7]"
              placeholder={t('support.subjectPlaceholder')}
              placeholderTextColor="#9CA3AF"
              value={vm.subject}
              onChangeText={vm.setSubject}
              maxLength={200}
            />

            <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
              {t('support.categoryLabel')}
            </Text>
            <View className="mb-4">
              <ChipSelect
                options={vm.categoryOptions}
                selected={vm.category}
                onSelect={vm.setCategory}
              />
            </View>

            <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
              {t('support.messageLabel')}
            </Text>
            <TextInput
              className="mb-6 h-32 rounded-xl border border-gray-200 dark:border-[#38383A] p-4 text-base text-gray-900 dark:text-[#F5F5F7]"
              placeholder={t('support.messagePlaceholder')}
              placeholderTextColor="#9CA3AF"
              value={vm.message}
              onChangeText={vm.setMessage}
              multiline
              textAlignVertical="top"
              maxLength={2000}
            />

            <Button
              onPress={vm.handleCreateTicket}
              label={vm.creating ? t('support.sending') : t('support.send')}
              disabled={!vm.canCreate}
            />

            <Pressable onPress={() => vm.setShowCreateForm(false)} className="mt-4 items-center">
              <Text className="text-base text-gray-500 dark:text-neutral-500">
                {t('common.cancel')}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]" edges={['bottom']}>
      <View className="flex-1">
        <View className="flex-row items-center justify-between px-6 py-4">
          <Text className="text-2xl font-bold text-gray-900 dark:text-[#F5F5F7]">
            {t('support.title')}
          </Text>
          <Pressable
            onPress={() => vm.setShowCreateForm(true)}
            className="rounded-full bg-primary px-4 py-2"
          >
            <Text className="text-sm font-semibold text-white">{t('support.newTicket')}</Text>
          </Pressable>
        </View>

        {vm.loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#065F46" />
          </View>
        ) : (
          <FlatList
            data={vm.tickets}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <TicketRow ticket={item} onPress={vm.handleTicketPress} />}
            ListEmptyComponent={<EmptyState t={t} />}
            refreshing={vm.refreshing}
            onRefresh={vm.handleRefresh}
            contentContainerStyle={vm.tickets.length === 0 ? { flex: 1 } : undefined}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
