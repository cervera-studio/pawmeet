import { TextInput, type TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  className?: string;
}

export function Input({ className = '', ...props }: InputProps) {
  return (
    <TextInput
      className={`rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-base text-gray-900 ${className}`}
      placeholderTextColor="#9CA3AF"
      {...props}
    />
  );
}
