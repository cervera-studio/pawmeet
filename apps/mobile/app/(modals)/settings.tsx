import { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';

export default function SettingsModal() {
  const [notifications, setNotifications] = useState(true);
  const [locationSharing, setLocationSharing] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="px-6 py-4">
      <Text className="mb-6 text-2xl font-bold text-gray-900">Impostazioni</Text>

      <View className="gap-1">
        <View className="flex-row items-center justify-between py-4">
          <Text className="text-base text-gray-700">Notifiche</Text>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ true: '#FF6B35' }}
          />
        </View>

        <View className="flex-row items-center justify-between py-4">
          <Text className="text-base text-gray-700">Condividi posizione</Text>
          <Switch
            value={locationSharing}
            onValueChange={setLocationSharing}
            trackColor={{ true: '#FF6B35' }}
          />
        </View>

        <View className="flex-row items-center justify-between py-4">
          <Text className="text-base text-gray-700">Tema scuro</Text>
          <Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ true: '#FF6B35' }} />
        </View>

        <View className="mt-4 border-t border-gray-100 pt-4">
          <Pressable className="py-4">
            <Text className="text-base text-gray-700">Raggio di ricerca</Text>
            <Text className="text-sm text-gray-400">5 km</Text>
          </Pressable>

          <Pressable className="py-4">
            <Text className="text-base text-gray-700">Lingua</Text>
            <Text className="text-sm text-gray-400">Italiano</Text>
          </Pressable>
        </View>

        <View className="mt-4 border-t border-gray-100 pt-4">
          <Pressable className="py-4">
            <Text className="text-base text-gray-700">Termini di servizio</Text>
          </Pressable>

          <Pressable className="py-4">
            <Text className="text-base text-gray-700">Privacy Policy</Text>
          </Pressable>

          <Pressable className="py-4">
            <Text className="text-base text-gray-700">Versione app</Text>
            <Text className="text-sm text-gray-400">0.0.1</Text>
          </Pressable>
        </View>

        <Pressable className="mt-8 items-center py-4">
          <Text className="text-base font-medium text-red-500">Elimina account</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
