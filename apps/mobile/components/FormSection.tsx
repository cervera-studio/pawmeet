import { Text, View } from 'react-native';

interface FormSectionProps {
  icon: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}

/**
 * Card wrapper that groups related form fields under a titled section.
 * Used in multi-step forms to create visual hierarchy and reduce cognitive load.
 */
export function FormSection({ icon, title, description, children }: FormSectionProps) {
  return (
    <View className="rounded-2xl bg-gray-50 p-4 dark:bg-[#2C2C2E]">
      <Text className="mb-1 text-base font-semibold text-gray-900 dark:text-[#F5F5F7]">
        {icon} {title}
      </Text>
      {description ? (
        <Text className="mb-4 text-xs text-gray-400 dark:text-neutral-500">{description}</Text>
      ) : null}
      <View className="gap-5">{children}</View>
    </View>
  );
}
