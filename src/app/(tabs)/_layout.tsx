import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0D9488',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="keluar"
        options={{
          title: 'Surat Keluar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="paper-plane-outline" color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="masuk"
        options={{
          title: 'Surat Masuk',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mail-unread-outline" color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="arsip"
        options={{
          title: 'Arsip',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="archive-outline" color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="akun"
        options={{
          title: 'Akun',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color as string} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

