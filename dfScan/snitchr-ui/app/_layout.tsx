import { Tabs } from 'expo-router/tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../assets/zustand/store';
import { Pressable } from 'react-native';
import React from 'react';
import { getColors } from '../assets/constants/Colors';

export default function Layout() {
  const { hasDetectionResult, darkMode } = useAppStore();
  const Colors = getColors(darkMode);

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: Colors.linkBlue, // Blue background
          borderTopWidth: 1,
          borderTopColor: Colors.lightGray,
        },
        tabBarActiveTintColor: '#ffffff', // White active icon
        tabBarInactiveTintColor: '#cccccc', // Light gray inactive icon
      }}
    >
      {/* 👇 Hide index route */}
      <Tabs.Screen name="index" options={{ href: null }} />

      <Tabs.Screen
        name="Home"
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
