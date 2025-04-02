import React, { useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, Alert, Modal, ActivityIndicator, Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useAppStore } from '../assets/zustand/store';

const screenWidth = Dimensions.get('window').width;
const imageBoxWidth = screenWidth * 0.9;
const imageBoxHeight = imageBoxWidth * (4 / 5);

export default function HomeScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      setSelectedImage(null);
    }, [])
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

  const { setHasDetectionResult } = useAppStore();

  const navigateToResults = (
    real?: number,
    fake?: number,
    extractedText: string = '',
    message?: string
  ) => {
    setHasDetectionResult(true);
    router.push({
      pathname: '/Result',
      params: {
        real: real?.toFixed(2) || '0.00',
        fake: fake?.toFixed(2) || '0.00',
        extractedText: extractedText || 'No text detected',
        message: message || ''
      },
    });
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
      const response = await axios.post('http://192.168.0.7:5000/predict/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { real, fake, extractedText, message } = response.data;
      navigateToResults(real, fake, extractedText, message);
    } catch (error) {
      console.error('Image detection error:', error);
      Alert.alert('Error', 'Failed to detect image.');
    } finally {
      setIsLoading(false);
    }
  };

  function clearImage(): void {
    setSelectedImage(null);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CatchEd</Text>

      <TouchableOpacity style={[styles.imagePlaceholder, { width: imageBoxWidth, height: imageBoxHeight }]} onPress={() => setIsModalVisible(true)}>
        {selectedImage ? (
          <>
            <Image source={{ uri: selectedImage }} style={styles.image} />
            <TouchableOpacity style={styles.closeButton} onPress={clearImage}>
              <Text style={styles.closeButtonText}>X</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.plusText}>+</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Select Detection Method</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.methodButton, !selectedImage && styles.disabledButton]}
          onPress={detectImage}
          disabled={!selectedImage || isLoading}
        >
          <Text>Image Detection</Text>
        </TouchableOpacity>
      </View>

      {isLoading && <ActivityIndicator size="large" color="#000" />}

      <Modal visible={isModalVisible} transparent animationType="slide">
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

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  imagePlaceholder: {
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  image: { width: '100%', height: '100%', borderRadius: 12 },
  closeButton: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'red', width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center'
  },
  closeButtonText: { color: 'white', fontWeight: 'bold' },
  plusText: { fontSize: 48, fontWeight: 'bold', color: '#555' },
  sectionTitle: { fontWeight: 'bold', marginBottom: 10 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  methodButton: { padding: 12, borderWidth: 1, borderColor: '#000', borderRadius: 8 },
  disabledButton: { opacity: 0.5 },
  modalBackground: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContainer: { padding: 25, backgroundColor: 'white', borderRadius: 10, alignItems: 'center' },
  modalTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 10 },
  modalButton: { padding: 12, marginBottom: 8, backgroundColor: '#f0f0f0', borderRadius: 8 },
  closeText: { color: 'red', fontWeight: 'bold' },
});
