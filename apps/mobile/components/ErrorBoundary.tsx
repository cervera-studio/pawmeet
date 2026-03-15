import { logger } from '@pawmeet/utils';
import type { ErrorBoundaryProps } from 'expo-router';
import { Component, type ComponentType, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TAG = 'ErrorBoundary';

// -- Fallback UI shown when an error is caught ----------------------------------

interface ErrorFallbackProps {
  error: Error;
  retry: () => void;
}

/** Standalone fallback screen – used both by the class boundary and Expo Router. */
function ErrorFallback({ error, retry }: ErrorFallbackProps) {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-[#1C1C1E] px-8">
      <Text className="text-5xl">🐾</Text>
      <Text className="mt-6 text-center text-xl font-bold text-gray-900 dark:text-[#F5F5F7]">
        Qualcosa è andato storto
      </Text>
      <Text className="mt-2 text-center text-sm text-gray-500 dark:text-neutral-500">
        Si è verificato un errore imprevisto. Prova a ricaricare la schermata.
      </Text>

      {__DEV__ && (
        <View className="mt-4 w-full rounded-xl bg-red-50 p-3">
          <Text className="text-xs text-red-700">{error.message}</Text>
        </View>
      )}

      <Pressable onPress={retry} className="mt-8 rounded-2xl bg-primary px-10 py-4">
        <Text className="text-base font-semibold text-white">Riprova</Text>
      </Pressable>
    </SafeAreaView>
  );
}

// -- Expo Router ErrorBoundary export -------------------------------------------

/**
 * Drop-in error boundary for Expo Router route files.
 *
 * Usage in any route file:
 * ```ts
 * export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';
 * ```
 */
export function ScreenErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  logger.error(TAG, 'Uncaught error in screen', error);
  return <ErrorFallback error={error} retry={retry} />;
}

// -- Classic class-based ErrorBoundary ------------------------------------------

interface Props {
  children: ReactNode;
  fallback?: ComponentType<ErrorFallbackProps>;
}

interface State {
  error: Error | null;
}

/**
 * Classic React class error boundary.
 * Useful for wrapping arbitrary component trees outside of Expo Router screens.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error(TAG, 'Uncaught error in component tree', {
      message: error.message,
      componentStack: info.componentStack,
    });
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (error) {
      const Fallback = this.props.fallback ?? ErrorFallback;
      return <Fallback error={error} retry={this.reset} />;
    }
    return this.props.children;
  }
}

// -- HOC wrapper ----------------------------------------------------------------

/**
 * Higher-order component that wraps any component with the class ErrorBoundary.
 *
 * ```ts
 * export default withErrorBoundary(MyScreen);
 * ```
 */
export function withErrorBoundary<P extends object>(WrappedComponent: ComponentType<P>) {
  function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  }

  WithErrorBoundary.displayName = `withErrorBoundary(${
    WrappedComponent.displayName ?? WrappedComponent.name ?? 'Component'
  })`;

  return WithErrorBoundary;
}
