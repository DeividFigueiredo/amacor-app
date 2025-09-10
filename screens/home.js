import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onLogout } from '../screens/SettingsScreen';

export default function HomeScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const data = JSON.parse(storedUserData);
        
        // ✅ VERIFICA SE AINDA É VÁLIDO (formato dd/mm/aaaa)
        if (data.validThru) {
          const [dia, mes, ano] = data.validThru.split('/');
          const validThru = new Date(ano, mes - 1, dia);
          const hoje = new Date();
          
          // Zera as horas para comparar apenas a data
          hoje.setHours(0, 0, 0, 0);
          validThru.setHours(0, 0, 0, 0);
          
          if (hoje <= validThru) {
            console.log('Dados VÁLIDOS até', data.validThru);
            setUserData(data);
            setLoading(false);
            return;
          } else {
            console.log('Dados EXPIRADOS em', data.validThru);
            await AsyncStorage.removeItem('userData');
          }
        }
      }
      
      // 📡 BUSCA NOVOS DADOS SE EXPIRADO OU NÃO ENCONTRADO
      console.log('Buscando dados na API...');
      const token = gerarChave(cpf, dataNascimento);
      const freshData = await buscarCard('/get_card_ext', cpf, token);
      
      if (freshData) {
        setUserData(freshData);
        await AsyncStorage.setItem('userData', JSON.stringify(freshData));
      } else {
        setError('Não foi possível carregar os dados');
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
      setError('Erro ao carregar dados: ' + 'O erro pode sugerir que o seu plano está inativo, por favor, entre em contato com a Amacor.');
    } finally {
      setLoading(false);
    }
  };

  fetchUserData();
}, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E76B8" />
        <Text style={styles.loadingText}>Carregando seus dados...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning" size={50} color="#e74c3c" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => navigation.navigate('Login')} // ⬅️ Leva para o login
        >
          <Text style={styles.retryText}>Fazer Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeText}>
            Olá, {userData ? userData.sNomeUSR.split(' ')[0] : 'Usuário'}!
          </Text>
          <Text style={styles.welcomeSubtext}>Seu plano está ativo</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sobre seu Plano:</Text>
          <View style={styles.planInfo}>
            <Ionicons name="medical" size={24} color="#2E76B8" />
            <View style={styles.planDetails}>
              <Text style={styles.planName}>
                {userData ? userData.sNomePRD : 'Carregando...'}
              </Text>
              <Text style={styles.planNumber}>
                Matricula: {userData ? userData.sCodigoUSRTIT : 'Carregando...'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Próximos Passos</Text>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="calendar" size={24} color="#2E76B8" />
            <Text style={styles.menuText}>Agendar Consulta</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="location" size={24} color="#2E76B8" />
            <Text style={styles.menuText}>Encontrar Clínicas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="document-text" size={24} color="#2E76B8" />
            <Text style={styles.menuText}>Extrato de Utilização</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Ajuste os estilos - REMOVA o paddingBottom
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 16,
    // REMOVA: paddingBottom: 80,
  },
  welcomeCard: {
    backgroundColor: '#2E76B8',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  welcomeSubtext: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
  },
  card: {
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
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#2c3e50',
  },
  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planDetails: {
    marginLeft: 12,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  planNumber: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  menuText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#2c3e50',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#2c3e50',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 20,
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#2E76B8',
    padding: 12,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
  },
  
  // REMOVA todos os estilos relacionados à tabBar:
  // tabBar, tabItem, tabText, centralButton, buttonCircle, centralButtonText
});