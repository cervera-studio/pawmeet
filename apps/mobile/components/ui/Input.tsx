import { TextInput, type TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  className?: string;
}

export function Input({ className = '', ...props }: InputProps) {
  return (
    <TextInput
      className={`rounded-2xl border border-gray-200 dark:border-[#38383A] bg-gray-50 dark:bg-[#2C2C2E] px-4 py-4 text-base text-gray-900 dark:text-[#F5F5F7] ${className}`}
      placeholderTextColor="#9CA3AF"
      {...props}
    />
  );
}
