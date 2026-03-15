import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, SafeAreaView, ScrollView, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { buscarCard } from '../mantis/everflowConex';
import { gerarChave } from '../mantis/crypto';

export default function LoginScreen({ navigation, onLogin }) {
  const [cpf, setCpf] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [loading, setLoading] = useState(false);
  const logoTranslateY = useRef(new Animated.Value(Dimensions.get('window').height * 0.25)).current;
  const logoScale = useRef(new Animated.Value(1.6)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoTranslateY, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [contentOpacity, contentTranslateY, logoScale, logoTranslateY]);

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
      const errorMessage = String(err?.message || '').toLowerCase();
      const isDeviceAlreadyRegisteredError =
        errorMessage.includes('ja existe um dispositivo cadastrado para este usuario') ||
        (errorMessage.includes('dispositivo') && errorMessage.includes('cadastrado')) ||
        (errorMessage.includes('operadora') && errorMessage.includes('saude')) ||
        errorMessage.includes('device_conflict') ||
        errorMessage.includes('outro dispositivo') ||
        errorMessage.includes('already_registered_other_device');

      if (isDeviceAlreadyRegisteredError) {
        Alert.alert(
          'Dispositivo ja cadastrado',
          'Ja existe um dispositivo cadastrado para este usuario. Entre em contato com a operadora de saude.'
        );
      } else {
        Alert.alert('Erro', 'Nao foi possivel concluir a solicitacao no momento. Tente novamente.');
      }
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
    <SafeAreaView style={styles.safeContainer}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.logoContainer}>
        <Animated.Image
          source={require('../../assets/splash.png')}
          style={[
            styles.logoImage,
            {
              transform: [
                { translateY: logoTranslateY },
                { scale: logoScale },
              ],
            },
          ]}
          resizeMode="contain"
        />
        <Animated.View
          style={{
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
          }}
        >
          <Text style={styles.title}>Amacor Saúde</Text>
          <Text style={styles.subtitle}>Acesse sua conta</Text>
        </Animated.View>
      </View>

      <Animated.View
        style={{
          opacity: contentOpacity,
          transform: [{ translateY: contentTranslateY }],
        }}
      >
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
            <Text  style={styles.EverFlow}>Powered By Amacor Cloud</Text>
          </View>
      </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logoImage: {
    width: 160,
    height: 160,
    marginBottom: 10,
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