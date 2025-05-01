import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, Alert, Modal, Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAppStore } from '../assets/zustand/store';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { getColors } from '../assets/constants/Colors';

const screenWidth = Dimensions.get('window').width;
const imageBoxWidth = screenWidth * 0.9;
const imageBoxHeight = imageBoxWidth * (4 / 5);

export default function HomeScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { darkMode, toggleDarkMode, setHasDetectionResult, resetStore } = useAppStore();
  const Colors = getColors(darkMode);
  const router = useRouter();
  const params = useLocalSearchParams();

  useFocusEffect(
    useCallback(() => {
      setSelectedImage(null);
    }, [router])
  );

  useEffect(() => {
    if (params?.clear) {
      setSelectedImage(null);
      resetStore();
    }
  }, [params?.clear]);

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
      const response = await axios.post('http://192.168.68.116:5000/predict/image', formData, {
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
        adjustment_reason, no_engagement_warning, textBoxes, final_prediction, suggested_links
      } = response.data;

      setHasDetectionResult(true);
      router.push({
        pathname: '/result',
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
          final_prediction: final_prediction || '',
          suggested_links: JSON.stringify(suggested_links || [])
        },
      });
    } catch (error) {
      console.error('Image detection error:', error);
      Alert.alert('Error', 'Failed to detect image.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={styles.topBar}>
        <Image
          source={require('../assets/images/logo.png')}
          style={{ width: 125, height: 70, resizeMode: 'contain' }}
        />
        <TouchableOpacity onPress={toggleDarkMode} style={[styles.themeToggle, { backgroundColor: Colors.lightGray }]}>
          <Ionicons name={darkMode ? 'sunny' : 'moon'} size={24} color={darkMode ? '#fff' : Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Back Button
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Go Back</Text>
      </TouchableOpacity> */}

      <TouchableOpacity style={[styles.imagePlaceholder, { backgroundColor: Colors.lightBackground, borderColor: Colors.lightGray }]} onPress={() => setIsModalVisible(true)}>
        {selectedImage ? (
          <>
            <Image source={{ uri: selectedImage }} style={styles.image} />
            <TouchableOpacity style={[styles.closeButton, { backgroundColor: Colors.danger }]} onPress={() => setSelectedImage(null)}>
              <Text style={styles.closeButtonText}>X</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={[styles.plusText, { color: Colors.primary }]}>+</Text>
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
          style={[styles.detectButton, { backgroundColor: Colors.buttonYellow }, !selectedImage && styles.disabledButton]}
          onPress={detectImage}
          disabled={!selectedImage}
        >
          <Text style={[styles.detectButtonText, { color: Colors.primary }]}>🔍 Analyze</Text>
        </TouchableOpacity>
      </View>

      {/* Navigation Buttons at Bottom */}
      <View style={styles.navButtonsBottom}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/result')}>
          <Text style={styles.navBtnText}>📊 Result</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/analytics')}>
          <Text style={styles.navBtnText}>📈 Analytics</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View style={[styles.modalContainer, { backgroundColor: Colors.lightBackground }]}>
            <Text style={[styles.modalTitle, { color: Colors.primary }]}>Choose Input Method</Text>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: Colors.lightGray }]} onPress={handleImageUpload}>
              <Text>📷 Upload Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: Colors.lightGray }]} onPress={() => setIsModalVisible(false)}>
              <Text style={[styles.closeText, { color: Colors.danger }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 32,
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  themeToggle: {
    padding: 8,
    borderRadius: 12,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: 1,
    width: imageBoxWidth,
    height: imageBoxHeight,
  },
  image: {
    width: '90%',
    height: '90%',
    borderRadius: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  plusText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  centeredRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  detectButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    minWidth: 120,
    alignItems: 'center',
  },
  detectButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  navButtonsBottom: {
    marginTop: 32,
    width: '59%',
    gap: 15,
  },
  navBtn: {
    backgroundColor: '#3D90D7',
    paddingVertical: 15,
    borderRadius: 20,
    alignItems: 'center',
  },
  navBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  backButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    marginLeft: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3478f6',
    fontWeight: '600',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    padding: 25,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalButton: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    width: 200,
    alignItems: 'center',
  },
  closeText: {
    fontWeight: 'bold',
  },
});
