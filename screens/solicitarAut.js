import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native'; // ✅ ADICIONE ESTE IMPORT
import { buscarCard } from '../mantis/everflowConex';
import { gerarChave } from '../mantis/crypto';

export default function SoliciarAut({ navigation}){
    
}