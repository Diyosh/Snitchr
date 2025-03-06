import { Tabs } from 'expo-router/tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../assets/zustand/store'; 

export default function Layout() {
    const { hasDetectionResult } = useAppStore(); 

    return (
        <Tabs>
            <Tabs.Screen
                name="index"
                options={{
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" color={color} size={size} />
                    ),
                }}
            />
            {hasDetectionResult && (
                <Tabs.Screen
                    name="Result"
                    options={{
                        tabBarLabel: 'Results',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="search" color={hasDetectionResult ? color : 'gray'} size={size} />
                        ),
                    }}
                />
            )}
        </Tabs>
    );
}
