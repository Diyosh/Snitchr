import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../assets/zustand/store';
import Colors from '../assets/constants/Colors';

const screenWidth = Dimensions.get('window').width;

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { resetStore, darkMode, toggleDarkMode } = useAppStore();

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
  const [verdict, setVerdict] = useState('');
  const [realBoxColor, setRealBoxColor] = useState(Colors.boxNeutral);
  const [fakeBoxColor, setFakeBoxColor] = useState(Colors.boxNeutral);

  const initialized = useRef(false);

  useEffect(() => {
    if (!params?.real || !params?.fake || !params?.analytics || !params?.extractedText || !params?.final_prediction) {
      return;
    }
  
    const realParsed = parseFloat(params.real as string);
    const fakeParsed = parseFloat(params.fake as string);
    const extracted = params.extractedText as string;
    const adjustment = params.adjustment_reason as string || '';
    const prediction = params.final_prediction as string;
    const analyticsStr = params.analytics as string;
  
    setReal(isNaN(realParsed) ? 0 : realParsed);
    setFake(isNaN(fakeParsed) ? 0 : fakeParsed);
    setExtractedText(extracted);
    setAdjustmentReason(adjustment);
    setVerdict(prediction);
  
    try {
      const parsedAnalytics = JSON.parse(analyticsStr);
      setAnalytics(parsedAnalytics);
    } catch (error) {
      console.error('Analytics JSON parse error:', error);
    }
  
    if (prediction.toLowerCase() === 'real') {
      setRealBoxColor(Colors.successGreen);
      setFakeBoxColor(Colors.boxNeutral);
    } else if (prediction.toLowerCase() === 'fake') {
      setRealBoxColor(Colors.boxNeutral);
      setFakeBoxColor(Colors.danger);
    }
  
    if (params?.suggested_links) {
      try {
        const links = JSON.parse(params.suggested_links as string);
        if (Array.isArray(links) && links.length > 0) {
          setSuggestedLink(links[0].link);
        }
      } catch (e) {
        console.error("Suggested links parse error:", e);
      }
    }
  }, [params.real, params.fake, params.analytics, params.extractedText, params.final_prediction, params.suggested_links]);  

  const handleScanAnother = () => {
    Alert.alert('Scan Another', 'Clear current results?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes', onPress: () => {
          resetStore();
          router.push({ pathname: '/', params: { clear: Date.now() } });
        }
      }
    ]);
  };

  const handleOpenLink = () => {
    if (suggestedLink) Linking.openURL(suggestedLink);
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 16 },
    topBar: { width: '100%', paddingVertical: 10, flexDirection: 'row', justifyContent: 'flex-end' },
    title: { fontSize: 24, fontWeight: 'bold', color: Colors.primary, marginBottom: 10 },
    statBox: {
      width: '48%',
      padding: 16,
      borderRadius: 8,
      backgroundColor: Colors.lightGray,
      alignItems: 'center',
      marginVertical: 10,
      borderWidth: 1,
      borderColor: Colors.primary
    },
    statLabel: { fontSize: 16, fontWeight: '600', color: Colors.primary },
    statValue: { fontSize: 24, fontWeight: 'bold', color: Colors.primary },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 10, color: Colors.primary },
    textBlock: { backgroundColor: Colors.lightBackground, padding: 12, borderRadius: 8 },
    scanBtn: { marginTop: 24, textAlign: 'center', color: Colors.buttonYellow, fontWeight: 'bold', fontSize: 16, marginBottom: 40 },
    adjustmentBox: { marginTop: 12, backgroundColor: '#FFFACD', padding: 10, borderRadius: 8 }
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={toggleDarkMode}>
          <Ionicons name={darkMode ? 'sunny' : 'moon'} size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Detection Result</Text>

      <Text style={{
        color: verdict.toLowerCase() === 'fake' ? Colors.danger : Colors.successGreen,
        fontWeight: 'bold', fontSize: 16, marginBottom: 10
      }}>
        {verdict.toLowerCase() === 'fake' ? '❗ More Likely Fake' : '✅ It Seems to Be Real'}
      </Text>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={[styles.statBox, { backgroundColor: realBoxColor }]}>
          <Text style={styles.statLabel}>Real</Text>
          <Text style={styles.statValue}>{real}%</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: fakeBoxColor }]}>
          <Text style={styles.statLabel}>Fake</Text>
          <Text style={styles.statValue}>{fake}%</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Extracted Text</Text>
      <View style={styles.textBlock}>
        <Text style={{ color: Colors.primary }}>{extractedText}</Text>
      </View>

      <Text style={styles.sectionTitle}>Text-Based Analysis</Text>
      <View style={styles.textBlock}>
        <Text style={{ color: Colors.primary }}>Suspicious Words: {analytics.detected_suspicious_words?.join(', ') || 'None'}</Text>
        <Text style={{ color: Colors.primary }}>Informal Words: {analytics.detected_informal_words?.join(', ') || 'None'}</Text>
        <Text style={{ color: Colors.primary }}>Malicious Words: {analytics.detected_malicious_words?.join(', ') || 'None'}</Text>
        <Text style={{ color: Colors.primary }}>Inconsistency Score: {analytics.inconsistency_score}</Text>
      </View>

      {adjustmentReason ? (
        <View style={styles.adjustmentBox}>
          <Text style={{ color: Colors.primary }}>⚖️ Detected: {adjustmentReason}</Text>
        </View>
      ) : null}

      {suggestedLink ? (
        <TouchableOpacity onPress={handleOpenLink}>
          <Text style={{ color: Colors.linkBlue, marginTop: 10, textDecorationLine: 'underline' }}>
            📌 Official Source: {suggestedLink}
          </Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity onPress={handleScanAnother}>
        <Text style={styles.scanBtn}>Scan Another News ↩️</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
