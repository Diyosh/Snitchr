import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function ResultsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const real = parseFloat(params.real as string) || 0;
    const fake = parseFloat(params.fake as string) || 0;
    const extractedText = (params.extractedText as string) || 'No text extracted.';
    const message = (params.message as string) || '';

    const handleScanAnother = () => {
        Alert.alert(
            "Scan Another News",
            "Are you sure you want to scan a new news article? This will clear the current results.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Yes", onPress: clearAndNavigateBack }
            ]
        );
    };

    const clearAndNavigateBack = () => {
        router.replace({ 
            pathname: '/', 
            params: { clearData: 'true' }
        });
    };

    return (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
            <Text style={styles.title}>CatchEd</Text>

            <Text style={styles.sectionTitle}>Detection Statistics</Text>
            <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Real</Text>
                    <Text style={styles.statValue}>{real}%</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Fake</Text>
                    <Text style={styles.statValue}>{fake}%</Text>
                </View>
            </View>

            <Text style={styles.sectionTitle}>Extracted Text</Text>
            <View style={styles.textBox}>
                <Text style={styles.extractedText}>{extractedText}</Text>
            </View>

            {message ? (
                <>
                    <Text style={[styles.sectionTitle, { color: 'red' }]}>Note</Text>
                    <View style={styles.textBox}>
                        <Text style={styles.extractedText}>{message}</Text>
                    </View>
                </>
            ) : null}

            <TouchableOpacity onPress={handleScanAnother}>
                <Text style={styles.scanAnotherText}>Scan Another News ↩️</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 40, 
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    statBox: {
        width: '45%',
        padding: 16,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 8,
    },
    textBox: {
        backgroundColor: '#f0f0f0',
        padding: 16,
        borderRadius: 8,
        maxHeight: 300, 
    },
    extractedText: {
        fontSize: 14,
        color: '#333',
    },
    scanAnotherText: {
        marginTop: 20,
        fontSize: 16,
        color: '#007bff',
        textAlign: 'center',
        fontWeight: 'bold',
    },
});
