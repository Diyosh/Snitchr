import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { useAppStore } from '../assets/zustand/store';

const screenWidth = Dimensions.get('window').width;

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { resetStore } = useAppStore();

  const [real, setReal] = useState(0);
  const [fake, setFake] = useState(0);
  const [extractedText, setExtractedText] = useState('');
  const [analytics, setAnalytics] = useState({
    suspicious_words: 0,
    informal_words: 0,
    malicious_words: 0,
    inconsistency_score: 0
  });
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [noEngagementWarning, setNoEngagementWarning] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (params) {
      const realParsed = parseFloat(params.real as string);
      const fakeParsed = parseFloat(params.fake as string);
      setReal(isNaN(realParsed) ? 0 : realParsed);
      setFake(isNaN(fakeParsed) ? 0 : fakeParsed);
      setExtractedText(typeof params.extractedText === 'string' ? params.extractedText : '');
      setAdjustmentReason(typeof params.adjustment_reason === 'string' ? params.adjustment_reason : '');
      setNoEngagementWarning(typeof params.no_engagement_warning === 'string' ? params.no_engagement_warning : '');

      try {
        const parsed = typeof params.analytics === 'string' ? JSON.parse(params.analytics) : {};
        setAnalytics({
          suspicious_words: parsed?.suspicious_words || 0,
          informal_words: parsed?.informal_words || 0,
          malicious_words: parsed?.malicious_words || 0,
          inconsistency_score: parsed?.inconsistency_score || 0,
        });
      } catch (e) {
        console.warn('Invalid analytics JSON', e);
      }
    }
  }, [params.real, params.fake, params.extractedText, params.analytics]);

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

  const pieData = [
    {
      name: 'Suspicious',
      population: analytics.suspicious_words,
      color: '#ff6384',
      legendFontColor: darkMode ? '#fff' : '#000',
      legendFontSize: 14
    },
    {
      name: 'Informal',
      population: analytics.informal_words,
      color: '#ffcd56',
      legendFontColor: darkMode ? '#fff' : '#000',
      legendFontSize: 14
    },
    {
      name: 'Malicious',
      population: analytics.malicious_words,
      color: '#36a2eb',
      legendFontColor: darkMode ? '#fff' : '#000',
      legendFontSize: 14
    }
  ].filter(item => item.population > 0);

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
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => setDarkMode(!darkMode)}>
          <Ionicons name={darkMode ? 'sunny' : 'moon'} size={24} color={darkMode ? '#fff' : '#213555'} />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Detection Result</Text>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={styles.statBox}><Text style={styles.statLabel}>Real</Text><Text style={styles.statValue}>{real}%</Text></View>
        <View style={styles.statBox}><Text style={styles.statLabel}>Fake</Text><Text style={styles.statValue}>{fake}%</Text></View>
      </View>

      <Text style={styles.sectionTitle}>Extracted Text</Text>
      <View style={styles.textBlock}><Text style={{ color: darkMode ? '#fff' : '#000' }}>{extractedText}</Text></View>

      <Text style={styles.sectionTitle}>Text-Based Analysis</Text>
      <View style={styles.textBlock}>
        <Text style={{ color: darkMode ? '#fff' : '#000' }}>Suspicious Words: {analytics.suspicious_words}</Text>
        <Text style={{ color: darkMode ? '#fff' : '#000' }}>Informal Words: {analytics.informal_words}</Text>
        <Text style={{ color: darkMode ? '#fff' : '#000' }}>Malicious Words: {analytics.malicious_words}</Text>
        <Text style={{ color: darkMode ? '#fff' : '#000' }}>Inconsistency Score: {analytics.inconsistency_score}</Text>
      </View>

      {pieData.length > 0 && (
        <PieChart
          data={pieData}
          width={screenWidth - 32}
          height={220}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
            labelColor: () => darkMode ? '#fff' : '#000',
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      )}

      {adjustmentReason ? <Text style={{ color: 'orange', marginTop: 10 }}>⚖️ {adjustmentReason}</Text> : null}
      {noEngagementWarning ? <Text style={{ color: 'red' }}>⚠️ {noEngagementWarning}</Text> : null}

      <TouchableOpacity onPress={handleScanAnother}>
        <Text style={styles.scanBtn}>Scan Another News ↩️</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
