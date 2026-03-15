import { Pressable, Text, View } from 'react-native';

interface ChipOption {
  readonly value: string;
  readonly label: string;
}

type ChipSelectProps<T extends string> =
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
    };

/**
 * A chip-based selector that supports both single-select and multi-select modes.
 *
 * - Single-select (default): `selected` is a single value, `onSelect` receives the selected value.
 * - Multi-select (`multiple`): `selected` is an array, `onSelect` receives the updated array.
 */
export function ChipSelect<T extends string>(props: ChipSelectProps<T>) {
  const { options, multiple } = props;

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

  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((opt) => {
        const active = isSelected(opt.value as T);
        return (
          <Pressable
            key={opt.value}
            onPress={() => handlePress(opt.value as T)}
            className={`rounded-full px-4 py-2 ${active ? 'bg-primary' : 'bg-gray-100 dark:bg-[#38383A]'}`}
          >
            <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-gray-700 dark:text-[#D1D1D6]'}`}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
