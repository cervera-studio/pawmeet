import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const slides = [
  {
    title: 'Trova compagni di passeggiata',
    description: 'Scopri cani compatibili nella tua zona per passeggiate insieme.',
  },
  {
    title: 'Fai match',
    description: 'Swipa per trovare il compagno perfetto per il tuo cane.',
  },
  {
    title: 'Inizia a camminare',
    description: 'Chatta, organizza e parti per la vostra prima passeggiata!',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      router.push('/(auth)/login');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-8">
        {/* Placeholder per illustrazione */}
        <View className="mb-8 h-64 w-64 items-center justify-center rounded-full bg-primary-50">
          <Text className="text-6xl">🐕</Text>
        </View>

        <Text className="mb-4 text-center text-3xl font-bold text-gray-900">
          {slides[currentSlide]?.title}
        </Text>
        <Text className="mb-8 text-center text-lg text-gray-600">
          {slides[currentSlide]?.description}
        </Text>

        {/* Indicatori */}
        <View className="mb-8 flex-row gap-2">
          {slides.map((slide, index) => (
            <View
              key={slide.title}
              className={`h-2 w-2 rounded-full ${
                index === currentSlide ? 'w-8 bg-primary' : 'bg-gray-300'
              }`}
            />
          ))}
        </View>
      </View>

      <View className="px-8 pb-8">
        <Pressable onPress={handleNext} className="items-center rounded-2xl bg-primary py-4">
          <Text className="text-lg font-semibold text-white">
            {currentSlide < slides.length - 1 ? 'Avanti' : 'Inizia'}
          </Text>
        </Pressable>

        {currentSlide < slides.length - 1 && (
          <Pressable
            onPress={() => router.push('/(auth)/login')}
            className="mt-4 items-center py-2"
          >
            <Text className="text-base text-gray-500">Salta</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}
