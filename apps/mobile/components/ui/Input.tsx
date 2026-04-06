import { TextInput, type TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  className?: string;
}

export function Input({ className = '', ...props }: InputProps) {
  return (
    <TextInput
      className={`rounded-2xl border border-gray-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] text-base leading-tight text-gray-900 dark:text-[#F5F5F7] ${className}`}
      style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14 }}
      placeholderTextColor="#9CA3AF"
      {...props}
    />
  );
}
