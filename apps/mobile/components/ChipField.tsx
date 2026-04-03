import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import type { ComponentProps } from 'react';
import { ChipSelect } from './ChipSelect';

type ChipSelectProps = ComponentProps<typeof ChipSelect>;

interface ChipFieldProps {
  label: string;
  hint?: string;
  optional?: boolean;
  error?: string;
  chipProps: ChipSelectProps;
}

/**
 * Wraps a label + optional hint + ChipSelect + error message.
 * Eliminates the repeated pattern across Step2/Step3 form fields.
 */
export function ChipField({ label, hint, optional, error, chipProps }: ChipFieldProps) {
  const { t } = useTranslation();
  return (
    <View>
      <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
        {label}
        {optional ? (
          <Text className="text-xs font-normal text-gray-400 dark:text-neutral-500">
            {' '}
            ({t('common.optional')})
          </Text>
        ) : null}
      </Text>
      {hint ? (
        <Text className="mb-2 text-xs text-gray-400 dark:text-neutral-500">{hint}</Text>
      ) : null}
      <ChipSelect {...chipProps} />
      {error ? <Text className="mt-1 px-1 text-sm text-red-500">{error}</Text> : null}
    </View>
  );
}
