import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { buscarCard } from '../mantis/everflowConex';
import { gerarChave } from '../mantis/crypto';

export default function LoginScreen({ navigation, onLogin }) {
  const [cpf, setCpf] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!cpf || !dataNascimento) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      // ✅ AGORA MANTER A FORMATAÇÃO para enviar à API
      const cpfFormatado = cpf; // Mantém pontos e traço
      const dataFormatada = dataNascimento; // Mantém as barras

      // Validação básica
      if (cpfFormatado.length !== 14) { // 11 números + 3 caracteres especiais
        Alert.alert('Erro', 'CPF deve estar no formato 000.000.000-00');
        return;
      }

      if (dataFormatada.length !== 10) { // 8 números + 2 barras
        Alert.alert('Erro', 'Data deve estar no formato DD/MM/AAAA');
        return;
      }

      const token = gerarChave(cpfFormatado, dataFormatada);
      console.log('Buscando dados para CPF:', cpfFormatado);
      
      // ✅ Envia com a formatação completa
      const data = await buscarCard('/get_card_ext', cpfFormatado, token);
      
      if (data) {
        console.log('Dados recebidos:', data);
        onLogin(data);
      } else {
        Alert.alert('Erro', 'Não foi possível fazer login. Verifique seus dados.');
      }
    } catch (err) {
      console.error('Erro ao fazer login:', err);
      Alert.alert('Erro', 'Falha na conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Funções opcionais para formatar enquanto digita (melhor UX)
  const formatCpf = (text) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 11) {
      if (cleaned.length > 9) {
        return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
      } else if (cleaned.length > 6) {
        return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
      } else if (cleaned.length > 3) {
        return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
      }
      return cleaned;
    }
    return text;
  };

  const formatDate = (text) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 8) {
      if (cleaned.length > 4) {
        return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
      } else if (cleaned.length > 2) {
        return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
      }
      return cleaned;
    }
    return text;
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.logoContainer}>
        <View style={styles.logoPlaceholder}>
          <Ionicons name="medkit" size={60} color="#2E76B8" />
        </View>
        <Text style={styles.title}>Amacor Saúde</Text>
        <Text style={styles.subtitle}>Acesse sua conta</Text>
        
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Ionicons name="person" size={20} color="#95a5a6" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="CPF (000.000.000-00)"
            placeholderTextColor="#95a5a6"
            value={cpf}
            onChangeText={(text) => setCpf(formatCpf(text))}
            keyboardType="numeric"
            maxLength={14}
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="calendar" size={20} color="#95a5a6" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Data de Nascimento (DD/MM/AAAA)"
            placeholderTextColor="#95a5a6"
            value={dataNascimento}
            onChangeText={(text) => setDataNascimento(formatDate(text))}
            keyboardType="numeric"
            maxLength={10}
          />
        </View>

        <TouchableOpacity 
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <Text style={styles.loginButtonText}>Carregando...</Text>
          ) : (
            <Text style={styles.loginButtonText}>Entrar</Text>
          )}
        </TouchableOpacity>

        
      </View>
      <View>
        <Text  style={styles.EverFlow}>Powered By EverFlow</Text>
      </View>
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E76B8',
    marginBottom: 5,
  },
  EverFlow:{
    fontSize: 12,
    color: '#95a5a6',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#95a5a6',
  },
  formContainer: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
  },
  loginButton: {
    backgroundColor: '#2E76B8',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  loginButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerLink: {
    alignItems: 'center',
    marginTop: 20,
  },
  registerText: {
    color: '#95a5a6',
    fontSize: 14,
  },
  registerTextBold: {
    color: '#2E76B8',
    fontWeight: 'bold',
  },
});