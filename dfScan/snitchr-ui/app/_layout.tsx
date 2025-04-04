import { Tabs } from 'expo-router/tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../assets/zustand/store';
import { Pressable, View } from 'react-native';
import React from 'react';

export default function Layout() {
  const { hasDetectionResult } = useAppStore();

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#ccc',
        },
        tabBarActiveTintColor: '#213555',
        tabBarInactiveTintColor: '#999',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="Result"
        options={{
          tabBarLabel: 'Results',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="analytics-outline"
              size={size}
              color={hasDetectionResult ? color : '#ccc'}
            />
          ),
          tabBarButton: (props) => (
            <Pressable
              {...props}
              onPress={(e) => {
                if (!hasDetectionResult) {
                  e.preventDefault(); // prevent navigation if no results
                } else {
                  props.onPress?.(e);
                }
              }}
              style={({ pressed }) => ({
                opacity: hasDetectionResult ? (pressed ? 0.6 : 1) : 0.4,
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
              })}
            />
          ),
        }}
      />
    </Tabs>
  );
}
