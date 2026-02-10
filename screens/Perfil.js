import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { gerarChave } from '../mantis/crypto'; // Importe a função para gerar chave



export default function PerfilScreen({ navigation }) {
 return (
       <View style={styles.container}>
         <Text style={styles.title}>Perfil</Text>
         
   
         <View style={styles.section}>
           <Text style={styles.sectionTitle}>Seu dados</Text>
           
           <TouchableOpacity style={styles.menuItem}
            onPress= {() => navigation.navigate("Carencias")}>
             <Ionicons name="calendar" size={24} color="#2E76B8" />
             <Text style={styles.menuText}>Carências</Text>
            
           </TouchableOpacity>
   
           <TouchableOpacity style={styles.menuItem}
            onPress= {() => navigation.navigate("Boletos")}>
             <Ionicons name="cash" size={24} color="#42741aff" />
             <Text style={styles.menuText}>Pagamentos</Text>
           </TouchableOpacity>
   
           
         </View>
       </View>
     );
   }

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



