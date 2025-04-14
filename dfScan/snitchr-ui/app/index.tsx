import React, { useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, Alert, Modal, Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useAppStore } from '../assets/zustand/store';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';

const screenWidth = Dimensions.get('window').width;
const imageBoxWidth = screenWidth * 0.9;
const imageBoxHeight = imageBoxWidth * (4 / 5);

export default function HomeScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const router = useRouter();
  const { setHasDetectionResult } = useAppStore();

  useFocusEffect(
    useCallback(() => {
      setSelectedImage(null);
    }, [router])
  );

  const requestMediaPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please grant permission to access photos.');
      return false;
    }
    return true;
  };

  const handleImageUpload = async () => {
    if (!(await requestMediaPermission())) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setSelectedImage(result.assets[0].uri);
    }

    setIsModalVisible(false);
  };

  const detectImage = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image.');
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append('image', {
      uri: selectedImage,
      name: 'upload.jpg',
      type: 'image/jpeg',
    } as any);

    try {
      const response = await axios.post('http://192.168.11.184:5000/predict/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        validateStatus: () => true
      });

      if (response.status === 400) {
        const { error } = response.data;
        Alert.alert("Out of Scope", error || "This image is not related to education.");
        return;
      }

      const {
        real, fake, extractedText, message, analytics,
        adjustment_reason, no_engagement_warning, textBoxes, final_prediction
      } = response.data;

      setHasDetectionResult(true);
      router.push({
        pathname: '/Result',
        params: {
          real: real?.toFixed(2) || '0.00',
          fake: fake?.toFixed(2) || '0.00',
          extractedText: extractedText || 'No text detected',
          message: message || '',
          analytics: JSON.stringify(analytics),
          adjustment_reason: adjustment_reason || '',
          no_engagement_warning: no_engagement_warning || '',
          textBoxes: JSON.stringify(textBoxes),
          imageUri: selectedImage,
          final_prediction: final_prediction || ''
        },
      });
    } catch (error) {
      console.error('Image detection error:', error);
      Alert.alert('Error', 'Failed to detect image.');
    } finally {
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 32, alignItems: 'center', backgroundColor: darkMode ? '#000' : '#fff' },
    topBar: {
      width: '100%',
      paddingHorizontal: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    navbarText: {
      fontSize: 22,
      fontWeight: 'bold',
      color: darkMode ? '#fff' : '#213555'
    },
    themeToggle: {
      padding: 8,
      borderRadius: 12,
      backgroundColor: darkMode ? '#444' : '#eee',
    },
    imagePlaceholder: {
      backgroundColor: darkMode ? '#222' : '#f8f8f8',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 110,
      marginBottom: 20,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#ddd',
      width: imageBoxWidth,
      height: imageBoxHeight
    },
    image: { width: '100%', height: '100%', borderRadius: 12 },
    closeButton: {
      position: 'absolute', top: 8, right: 8,
      backgroundColor: 'red', width: 30, height: 30, borderRadius: 15,
      alignItems: 'center', justifyContent: 'center'
    },
    closeButtonText: { color: 'white', fontWeight: 'bold' },
    plusText: { fontSize: 48, fontWeight: 'bold', color: darkMode ? '#777' : '#555' },
    sectionTitle: { fontWeight: 'bold', marginBottom: 10, fontSize: 16, color: darkMode ? '#fff' : '#213555' },
    centeredRow: { flexDirection: 'row', justifyContent: 'center' },
    methodButton: {
      paddingVertical: 12,
      paddingHorizontal: 24, 
      borderWidth: 1,
      borderColor: '#000',
      borderRadius: 8,
      backgroundColor: darkMode ? '#444' : '#eee',
      minWidth: 120, 
      alignItems: 'center',
    },    
    disabledButton: { opacity: 0.5 },
    modalBackground: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContainer: {
      padding: 25,
      backgroundColor: darkMode ? '#333' : 'white',
      borderRadius: 12,
      alignItems: 'center',
    },
    modalTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 10, color: darkMode ? '#fff' : '#000' },
    modalButton: { padding: 12, marginBottom: 8, backgroundColor: '#f0f0f0', borderRadius: 8 },
    closeText: { color: 'red', fontWeight: 'bold' },
  });

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.navbarText}>Home</Text>
        <TouchableOpacity onPress={() => setDarkMode(!darkMode)} style={styles.themeToggle}>
          <Ionicons name={darkMode ? 'sunny' : 'moon'} size={24} color={darkMode ? '#fff' : '#213555'} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.imagePlaceholder} onPress={() => setIsModalVisible(true)}>
        {selectedImage ? (
          <>
            <Image source={{ uri: selectedImage }} style={styles.image} />
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedImage(null)}>
              <Text style={styles.closeButtonText}>X</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.plusText}>+</Text>
        )}
      </TouchableOpacity>

      {isLoading && (
        <LottieView
          source={require('../assets/animation/scannimation.json')}
          autoPlay
          loop
          style={{ width: 180, height: 180 }}
        />
      )}

      <View style={styles.centeredRow}>
        <TouchableOpacity
          style={[styles.methodButton, !selectedImage && styles.disabledButton]}
          onPress={detectImage}
          disabled={!selectedImage}
        >
          <Text style={{ color: darkMode ? '#fff' : '#000', fontWeight: '600' }}>Analyze</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Choose Input Method</Text>
            <TouchableOpacity style={styles.modalButton} onPress={handleImageUpload}>
              <Text>📷 Upload Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={() => setIsModalVisible(false)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
