import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BuscarEspecialidades } from './BuscarEspecialidadeScreen';


export default function ServicesScreen( { navigation } ) {

    
  return (
      <View style={styles.container}>
        <Text style={styles.title}>Serviços</Text>
        
  
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Serviços</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="calendar" size={24} color="#2E76B8" />
            <Text style={styles.menuText}>Agendar consulta</Text>
           
          </TouchableOpacity>
  
          <TouchableOpacity style={styles.menuItem}
           onPress= {() => navigation.navigate("BuscarEspecialidades")}>
            <Ionicons name="git-compare" size={24} color="#2E76B8" />
            <Text style={styles.menuText}>Buscar por especialidade</Text>
          </TouchableOpacity>
  
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="location" size={24} color="#2E76B8" />
            <Text style={styles.menuText}>Encontrar clínicas</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('Telemedicina', { 
              url: 'https://telemedicina.amacorsaude.com.br/login',
              title: 'Telemedicina'
            })}
          >
            <Ionicons name="videocam" size={24} color="#2E76B8" />
            <Text style={styles.menuText}>Telemedicina</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // ✅ ADICIONE ESTES ESTILOS NO FINAL DO ARQUIVO:
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f8f9fa',
      padding: 16,
      top: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#2c3e50',
      marginBottom: 24,
      marginTop:24,
      textAlign: 'center',
    },
    section: {
      backgroundColor: 'white',
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: 12,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#ecf0f1',
    },
    menuText: {
      flex: 1,
      fontSize: 16,
      marginLeft: 12,
      color: '#2c3e50',
    },
    logoutButton: {
      borderBottomWidth: 0,
    },
    logoutText: {
      color: '#e74c3c',
      fontWeight: '600',
    },
  });



