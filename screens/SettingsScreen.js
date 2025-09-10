import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen({ onLogout }) {
  const handleLogout = async () => {
    Alert.alert(
      "Encerrar Sessão",
      "Tem certeza que deseja sair?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Sair",
          onPress: () => {
            onLogout(); // ✅ Chama a função do App.js
          },
          style: "destructive"
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ajustes</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sessão</Text>
        
        <TouchableOpacity 
          style={[styles.menuItem, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out" size={24} color="#e74c3c" />
          <Text style={[styles.menuText, styles.logoutText]}>Encerrar Sessão</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>
        
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="notifications" size={24} color="#2E76B8" />
          <Text style={styles.menuText}>Notificações</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="shield" size={24} color="#2E76B8" />
          <Text style={styles.menuText}>Privacidade e Segurança</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="help-circle" size={24} color="#2E76B8" />
          <Text style={styles.menuText}>Ajuda e Suporte</Text>
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