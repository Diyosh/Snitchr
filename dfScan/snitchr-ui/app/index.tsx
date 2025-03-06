import React, { useState } from 'react';
import { 
  View, Text, Image, TouchableOpacity, StyleSheet, Alert, Modal, TextInput, ActivityIndicator, 
  GestureResponderEvent
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useAppStore } from '../assets/zustand/store';

export default function HomeScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isTextModalVisible, setIsTextModalVisible] = useState(false);
  const [enteredText, setEnteredText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
        setSelectedImage(null);
        setEnteredText('');
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

  const handlePasteText = () => {
    setIsTextModalVisible(true);
    setIsModalVisible(false);
  };

  const { setHasDetectionResult } = useAppStore();

const navigateToResults = (real: number, fake: number, extractedText: string) => {
    setHasDetectionResult(true); // <-- Set this when detection is successful
    router.push({
        pathname: '/Result',
        params: {
            real: real.toFixed(2),
            fake: fake.toFixed(2),
            extractedText: extractedText || 'No text detected',
        },
    });
};

  const detectText = async () => {
    if (!enteredText.trim()) {
      Alert.alert('Error', 'Please enter some text.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post('http://192.168.159.244:5000/predict/text', { text: enteredText });
      const { real, fake } = response.data;
      navigateToResults(real, fake, enteredText);
    } catch (error) {
      console.error('Text detection error:', error);
      Alert.alert('Error', 'Failed to detect text.');
    } finally {
      setIsLoading(false);
    }
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
      const response = await axios.post('http://192.168.159.244:5000/predict/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { real, fake, extractedText } = response.data;
      navigateToResults(real, fake, extractedText);
    } catch (error) {
      console.error('Image detection error:', error);
      Alert.alert('Error', 'Failed to detect image.');
    } finally {
      setIsLoading(false);
    }
  };

  function clearImage(event: GestureResponderEvent): void {
    throw new Error('Function not implemented.');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SNITCHR</Text>

      <TouchableOpacity style={styles.imagePlaceholder} onPress={() => setIsModalVisible(true)}>
        {selectedImage ? (
          <>
            <Image source={{ uri: selectedImage }} style={styles.image} />
            <TouchableOpacity style={styles.closeButton} onPress={clearImage}>
              <Text style={styles.closeButtonText}>X</Text>
            </TouchableOpacity>
          </>
        ) : enteredText ? (
          <>
            <Text style={styles.pastedText} numberOfLines={5} ellipsizeMode="tail">
              {enteredText}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setEnteredText('')}>
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
          style={[styles.methodButton, !enteredText && styles.disabledButton]}
          onPress={detectText}
          disabled={!enteredText || isLoading}
        >
          <Text>Text Detection</Text>
        </TouchableOpacity>

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
            <TouchableOpacity style={styles.modalButton} onPress={handlePasteText}>
              <Text>📄 Paste/Enter Text</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={handleImageUpload}>
              <Text>📷 Upload Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={() => setIsModalVisible(false)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isTextModalVisible} transparent animationType="slide">
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Paste or Enter Text</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter text here..."
              multiline
              value={enteredText}
              onChangeText={setEnteredText}
            />
            <TouchableOpacity style={styles.saveButton} onPress={() => setIsTextModalVisible(false)}>
              <Text style={styles.saveButtonText}>Save </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: 
  { flex: 1, 
    alignItems: 'center',
     justifyContent: 'center', 
     padding: 16, 
     backgroundColor: '#fff' 
    },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 4 
  },
  imagePlaceholder: { 
    width: 350,
    height: 300, 
    backgroundColor: '#f0f0f0', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 20, 
    borderRadius: 12, 
    borderWidth: 1,
    borderColor: '#ddd' 
  },
  image: {
    width: '100%', 
    height: '100%', 
    borderRadius: 12 
  },
  closeButton: { 
    position: 'absolute', 
    top: 8, right: 8,
    backgroundColor: 'red', 
    width: 30, height: 30, 
    borderRadius: 15, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  closeButtonText: 
  { 
    color: 'white', 
    fontWeight: 'bold' 
  },
  plusText: 
  { 
    fontSize: 48, 
    fontWeight: 'bold', 
    color: '#555' 
  },
  pastedText: 
  { 
    fontSize: 14, 
    color: '#333', 
    textAlign: 'center' 
  },
  sectionTitle: 
  { 
    fontWeight: 'bold', 
    marginBottom: 10 
  },
  buttonRow: 
  { 
    flexDirection: 'row', 
    gap: 12 
  },
  methodButton: 
  { 
    padding: 12, 
    borderWidth: 1, 
    borderColor: '#000', 
    borderRadius: 8 
  },
  disabledButton: 
  { 
    opacity: 0.5 
  },
  modalBackground: 
  { 
    flex: 1, justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.5)' 
  },
  modalContainer: 
  { padding: 25,
    backgroundColor: 'white', 
    borderRadius: 10, 
    alignItems: 'center' 
  },
  modalTitle: { 
    fontSize: 15, 
    fontWeight: 'bold', 
    marginBottom: 10 
  },
  modalButton: 
  { 
    padding: 12, 
    marginBottom: 8, 
    backgroundColor: '#f0f0f0', 
    borderRadius: 8 
  },
  textInput: { 
    width: 300, 
    height: 100, 
    borderWidth: 1, 
    padding: 10 
  },
  saveButton: { 
    marginTop: 10,
    backgroundColor: '#007BFF', 
    padding: 15,
    borderRadius: 10 
  },
  saveButtonText: { 
    color: 'white',
    alignItems: 'center',
  },
  closeText: {
    color: 'red',
    fontWeight: 'bold',
  },
  
});

