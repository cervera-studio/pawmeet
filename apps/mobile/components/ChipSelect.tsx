import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

interface ChipOption {
  readonly value: string;
  readonly label?: string;
  readonly labelKey?: string;
}

type ChipSelectProps<T extends string> = (
  | {
      options: readonly ChipOption[];
      selected: T;
      onSelect: (value: T) => void;
      multiple?: false;
    }
  | {
      options: readonly ChipOption[];
      selected: T[];
      onSelect: (value: T[]) => void;
      multiple: true;
    }
) & {
  /** 'scale' renders equal-width segmented chips in a single row (for ordinal fields). */
  variant?: 'default' | 'scale';
};

/**
 * A chip-based selector that supports both single-select and multi-select modes.
 *
 * Options can provide either `label` (raw string) or `labelKey` (i18n translation key).
 *
 * - Single-select (default): `selected` is a single value, `onSelect` receives the selected value.
 * - Multi-select (`multiple`): `selected` is an array, `onSelect` receives the updated array.
 * - Scale variant: renders a segmented control for ordinal values.
 */
export function ChipSelect<T extends string>(props: ChipSelectProps<T>) {
  const { options, multiple, variant = 'default' } = props;
  const { t } = useTranslation();

  const isSelected = (value: T): boolean => {
    if (multiple) {
      return (props.selected as T[]).includes(value);
    }
    return props.selected === value;
  };

  const handlePress = (value: T) => {
    if (multiple) {
      const current = props.selected as T[];
      const onSelect = props.onSelect as (value: T[]) => void;
      if (current.includes(value)) {
        onSelect(current.filter((v) => v !== value));
      } else {
        onSelect([...current, value]);
      }
    } else {
      (props.onSelect as (value: T) => void)(value);
    }
  };

  const getLabel = (opt: ChipOption): string => {
    if (opt.labelKey) return t(opt.labelKey);
    return opt.label ?? opt.value;
  };

  if (variant === 'scale') {
    return (
      <View
        className="flex-row overflow-hidden rounded-xl border border-gray-200 dark:border-[#48484A]"
        role={multiple ? 'group' : 'radiogroup'}
      >
        {options.map((opt, i) => {
          const active = isSelected(opt.value as T);
          return (
            <Pressable
              key={opt.value}
              onPress={() => handlePress(opt.value as T)}
              role={multiple ? 'checkbox' : 'radio'}
              aria-checked={active}
              aria-label={getLabel(opt)}
              className={`flex-1 items-center py-2.5 ${active ? 'bg-primary' : 'bg-white dark:bg-[#38383A]'} ${i < options.length - 1 ? 'border-r border-gray-200 dark:border-[#48484A]' : ''}`}
            >
              <Text
                className={`text-xs font-medium ${active ? 'text-white' : 'text-gray-700 dark:text-[#D1D1D6]'}`}
              >
                {getLabel(opt)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View className="flex-row flex-wrap gap-2" role={multiple ? 'group' : 'radiogroup'}>
      {options.map((opt) => {
        const active = isSelected(opt.value as T);
        return (
          <Pressable
            key={opt.value}
            onPress={() => handlePress(opt.value as T)}
            role={multiple ? 'checkbox' : 'radio'}
            aria-checked={active}
            aria-label={getLabel(opt)}
            className={`rounded-full border px-4 py-2 ${active ? 'bg-primary border-primary' : 'bg-white border-gray-200 dark:bg-[#2C2C2E] dark:border-[#48484A]'}`}
          >
            <Text
              className={`text-sm font-medium ${active ? 'text-white' : 'text-gray-700 dark:text-[#D1D1D6]'}`}
            >
              {getLabel(opt)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
