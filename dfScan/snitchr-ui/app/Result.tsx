import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useAppStore } from '../assets/zustand/store';

const screenWidth = Dimensions.get('window').width;

const credibleLinks: { [key: string]: string } = {
  'ched': 'https://ched.gov.ph/',
  'deped': 'https://www.deped.gov.ph/',
  'naga college foundation': 'https://www.facebook.com/ncfph',
  'unc': 'https://www.unc.edu.ph/',
  'usi': 'https://www.facebook.com/USI.Naga.Official',
  'up': 'https://up.edu.ph/',
  'ateneo': 'https://www.ateneo.edu/',
  'ust': 'https://www.ust.edu.ph/',
  'pup': 'https://www.pup.edu.ph/',
  'dlsu': 'https://www.dlsu.edu.ph/',
  'ue': 'https://www.ue.edu.ph/',
  'feu': 'https://www.feu.edu.ph/',
};

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { resetStore } = useAppStore();

  const [real, setReal] = useState(0);
  const [fake, setFake] = useState(0);
  const [extractedText, setExtractedText] = useState('');
  const [analytics, setAnalytics] = useState<any>({
    suspicious_words: 0,
    informal_words: 0,
    malicious_words: 0,
    inconsistency_score: 0,
    detected_suspicious_words: [],
    detected_informal_words: [],
    detected_malicious_words: []
  });
  const [suggestedLink, setSuggestedLink] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [noEngagementWarning, setNoEngagementWarning] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [verdict, setVerdict] = useState('');

  useEffect(() => {
    const realParsed = parseFloat(params.real as string);
    const fakeParsed = parseFloat(params.fake as string);
    const extracted = params.extractedText as string || '';
    const adjustment = params.adjustment_reason as string || '';
    const warning = params.no_engagement_warning as string || '';
    const prediction = params.final_prediction as string || '';
    const analyticsStr = params.analytics as string;

    setReal(isNaN(realParsed) ? 0 : realParsed);
    setFake(isNaN(fakeParsed) ? 0 : fakeParsed);
    setExtractedText(extracted);
    setAdjustmentReason(adjustment);
    setNoEngagementWarning(warning);
    setVerdict(prediction === 'Fake' ? '❗ It\'s More Likely Fake' : '✅ It Seems to Be Real');

    try {
      const parsedAnalytics = typeof analyticsStr === 'string' ? JSON.parse(analyticsStr) : {};
      setAnalytics(parsedAnalytics);

      const lowered = extracted.toLowerCase();
      const foundKey = Object.keys(credibleLinks).find(key => lowered.includes(key));
      if (foundKey) {
        setSuggestedLink(credibleLinks[foundKey]);
      } else {
        setSuggestedLink('');
      }
    } catch (err) {
      console.warn('Analytics JSON parse error:', err);
    }
  }, [
    params.real,
    params.fake,
    params.analytics,
    params.extractedText,
    params.final_prediction,
    params.adjustment_reason,
    params.no_engagement_warning
  ]);

  const handleScanAnother = () => {
    Alert.alert('Scan Another', 'Clear current results?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes', onPress: () => {
          resetStore();
          router.replace('/');
        }
      }
    ]);
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: darkMode ? '#000' : '#fff', paddingHorizontal: 16 },
    topBar: {
      width: '100%',
      paddingVertical: 10,
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    title: { fontSize: 24, fontWeight: 'bold', color: darkMode ? '#fff' : '#213555', marginBottom: 10 },
    statBox: {
      width: '48%', padding: 16, borderRadius: 8, backgroundColor: darkMode ? '#333' : '#f0f0f0',
      alignItems: 'center', borderColor: '#213555', borderWidth: 1, marginVertical: 10
    },
    statLabel: { fontSize: 16, fontWeight: '600', color: darkMode ? '#fff' : '#213555' },
    statValue: { fontSize: 24, fontWeight: 'bold', color: darkMode ? '#fff' : '#213555' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 10, color: darkMode ? '#fff' : '#213555' },
    textBlock: { backgroundColor: darkMode ? '#222' : '#f9f9f9', padding: 12, borderRadius: 8 },
    scanBtn: { marginTop: 24, textAlign: 'center', color: '#007bff', fontWeight: 'bold', fontSize: 16, marginBottom: 40 }
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => setDarkMode(!darkMode)}>
          <Ionicons name={darkMode ? 'sunny' : 'moon'} size={24} color={darkMode ? '#fff' : '#213555'} />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Detection Result</Text>

      <Text style={{
        color: verdict.includes('Fake') ? 'red' : 'green',
        fontWeight: 'bold', fontSize: 16, marginBottom: 10
      }}>
        {verdict}
      </Text>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
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
      <View style={styles.textBlock}>
        <Text style={{ color: darkMode ? '#fff' : '#000' }}>{extractedText}</Text>
      </View>

      <Text style={styles.sectionTitle}>Text-Based Analysis</Text>
      <View style={styles.textBlock}>
        <Text style={{ color: darkMode ? '#fff' : '#000' }}>Suspicious Words: {analytics.detected_suspicious_words?.join(', ') || 'None'}</Text>
        <Text style={{ color: darkMode ? '#fff' : '#000' }}>Informal Words: {analytics.detected_informal_words?.join(', ') || 'None'}</Text>
        <Text style={{ color: darkMode ? '#fff' : '#000' }}>Malicious Words: {analytics.detected_malicious_words?.join(', ') || 'None'}</Text>
        <Text style={{ color: darkMode ? '#fff' : '#000' }}>Inconsistency Score: {analytics.inconsistency_score}</Text>
      </View>

      <LineChart
        data={{
          labels: ['Suspicious', 'Informal', 'Malicious'],
          datasets: [{
            data: [
              analytics.suspicious_words,
              analytics.informal_words,
              analytics.malicious_words
            ]
          }]
        }}
        width={screenWidth - 32}
        height={220}
        yAxisLabel=""
        yAxisInterval={1}
        chartConfig={{
          backgroundColor: '#fff',
          backgroundGradientFrom: darkMode ? '#000' : '#fff',
          backgroundGradientTo: darkMode ? '#000' : '#fff',
          color: (opacity = 1) => darkMode ? `rgba(255,255,255,${opacity})` : `rgba(0,0,0,${opacity})`,
          labelColor: () => darkMode ? '#fff' : '#000',
        }}
        bezier
        fromZero
        yLabelsOffset={10}
        segments={5}
        style={{ marginVertical: 8 }}
      />

      {adjustmentReason ? <Text style={{ color: 'orange', marginTop: 10 }}>⚖️ {adjustmentReason}</Text> : null}
      {noEngagementWarning ? <Text style={{ color: 'red' }}>⚠️ {noEngagementWarning}</Text> : null}
      {suggestedLink ? <Text style={{ color: '#007bff', marginTop: 10 }}>📌 Official Source: {suggestedLink}</Text> : null}

      <TouchableOpacity onPress={handleScanAnother}>
        <Text style={styles.scanBtn}>Scan Another News ↩️</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
