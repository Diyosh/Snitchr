// _layout.tsx
import { Tabs } from 'expo-router/tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../assets/zustand/store';
import { Pressable } from 'react-native';
import React from 'react';
import  Colors  from '../assets/constants/Colors';

export default function Layout() {
  const { hasDetectionResult } = useAppStore();

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopWidth: 1,
          borderTopColor: '#ccc',
        },
        tabBarActiveTintColor: Colors.primary,
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
                  e.preventDefault();
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

      <Tabs.Screen
        name="Analytics"
        options={{
          tabBarLabel: 'Analytics',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}