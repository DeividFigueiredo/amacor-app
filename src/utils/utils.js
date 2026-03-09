import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Text, 
  SafeAreaView, 
  StatusBar, 
  Alert,
  ActivityIndicator,
  FlatList,
  Image 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

export function getTimestampPayload() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  return {
    timestamp: now.getTime().toString(),
    timestampLocal: local,
    timezoneOffsetMinutes: now.getTimezoneOffset(),
  };
}

export async function getLocationAsync(setLocation, setErrorMsg, setLoading) {
  // Permite chamadas sem passar setters (tornando-os opcionais)
  const safeSetLocation = typeof setLocation === 'function' ? setLocation : () => {};
  const safeSetErrorMsg = typeof setErrorMsg === 'function' ? setErrorMsg : () => {};
  const safeSetLoading = typeof setLoading === 'function' ? setLoading : () => {};

  let { status } = await Location.requestForegroundPermissionsAsync();
  try {
    if (status !== 'granted') {
      safeSetErrorMsg('Permissão para acessar localização negada');
      Alert.alert('Permissão necessária', 'Por favor, permita o acesso à localização para encontrar clínicas próximas.');
      safeSetLoading(false);
      return;
    }

    // Obter localização
    let locationData = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeout: 15000,
    });

    const { latitude, longitude } = locationData.coords;
    const newLocation = { latitude, longitude };
    safeSetLocation(newLocation);
    return newLocation;
  } catch (error) {
    console.error('🚨 Erro ao obter localização:', error);
    safeSetErrorMsg('Erro ao obter localização');
    Alert.alert('Erro', 'Não foi possível obter sua localização. Verifique se o GPS está ativado.');
    throw error; // Propaga o erro para ser tratado acima
  } finally {
    safeSetLoading(false);
  }
}
