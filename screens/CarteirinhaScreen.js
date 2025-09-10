import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { gerarTokenAutorizacao } from '../mantis/crypto'; // Importe a função
import CryptoJS from 'crypto-js'; // Certifique-se de ter esta importação
import { buscarCard } from '../mantis/everflowConex';
import { gerarChave } from '../mantis/crypto'; // Importe a função para gerar chave


export default function CarteirinhaScreen() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentToken, setCurrentToken] = useState(null); // Estado para o token

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        const storedUserData = await AsyncStorage.getItem('userData');
        if (storedUserData) {
          console.log('Carteirinha - Dados encontrados no AsyncStorage');
          const data = JSON.parse(storedUserData);
          setUserData(data);
        } else {
          setError('Dados não encontrados. Faça login novamente.');
        }
      } catch (err) {
        console.error('Carteirinha - Erro ao buscar dados:', err);
        setError('Erro ao carregar dados da carteirinha');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // 🔥 FUNÇÃO PARA GERAR TOKEN
  const handleGenerateToken = async () => {
  try {
    const timestamp = Date.now().toString();
    const cpf = userData.sCpfUSR;
    const dataNascimento = userData.dNascimento; // Formato esperado: dd/mm/aaaa
    const token = gerarChave(cpf, dataNascimento);
    const freshData = await buscarCard('/get_card_ext', cpf, token);
    
    if (!freshData) {
      throw new Error('Não foi possível obter dados atualizados da carteirinha, verifique sua conexão com a internet.');
    }
    
    const tokenGerado = gerarTokenAutorizacao(key, timestamp);
    setCurrentToken(tokenGerado);
    
    Alert.alert(
      'Token Gerado',
      `Token: ${tokenGerado}\n\nUse este token para autorizar consultas.`,
      [
        {
          text: 'Copiar',
          onPress: () => {
            // Implementar cópia para clipboard
            console.log('Token copiado:', tokenGerado);
          }
        },
        { text: 'OK', onPress: () => {} }
      ]
    );
    
  } catch (error) {
    console.error('Erro ao gerar token:', error);
    Alert.alert('Erro', 'Não foi possível gerar o token. Verifique sua conexão e tente novamente.');
  }
};

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Carteirinha Digital</Text>
      
      {userData ? (
        <View>
          <View style={styles.card}>
            <Text style={styles.name}>{userData.sNomeUSR}</Text>
            <Text style={styles.plan}>{userData.sNomePRD}</Text>
            <Text style={styles.number}>Nº da matricula: {userData.sCodigoUSRTIT}</Text>
            <Text style={styles.validity}>Ativo desde: {userData.dSituacao}</Text>
            <Text style={styles.validity}>Válido até: {userData.validThru}</Text>
          </View>

          {/* 🔥 BOTÃO PARA GERAR TOKEN */}
          <TouchableOpacity 
            style={styles.tokenButton}
            onPress={handleGenerateToken}
          >
            <Text style={styles.tokenButtonText}>Gerar Token de Autorização</Text>
          </TouchableOpacity>

          {/* 🔥 EXIBIR TOKEN ATUAL (opcional) */}
          {currentToken && (
            <View style={styles.tokenContainer}>
              <Text style={styles.tokenLabel}>Token atual:</Text>
              <Text style={styles.tokenValue}>{currentToken}</Text>
              <Text style={styles.tokenHint}>Use este token para consultas autorizadas</Text>
            </View>
          )}
        </View>
      ) : (
        <Text>Dados não disponíveis</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 22,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  plan: {
    fontSize: 16,
    marginBottom: 8,
    color: '#2E76B8',
  },
  number: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
  },
  validity: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
  },
  // 🔥 ESTILOS DO BOTÃO DE TOKEN
  tokenButton: {
    backgroundColor: '#2E76B8',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  tokenButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // 🔥 ESTILOS DA EXIBIÇÃO DO TOKEN
  tokenContainer: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#2E76B8',
  },
  tokenLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  tokenValue: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#2E76B8',
    marginBottom: 5,
  },
  tokenHint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
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
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
  },
});