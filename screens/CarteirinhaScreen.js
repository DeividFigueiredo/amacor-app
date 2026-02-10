import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { gerarTokenAutorizacao } from '../mantis/crypto';
import { buscarCard, enviarAutorizacao } from '../mantis/everflowConex';
import { gerarChave } from '../mantis/crypto';
import { Linking } from 'react-native';
import { retornarSuspenso } from '../mantis/everflowConex';
import { getLocationAsync } from '../utils/utils'
let BlurView = null;
try {
  // tenta usar expo-blur quando instalado
  // se não estiver disponível, usamos o overlay simples como fallback
  // eslint-disable-next-line global-require
  BlurView = require('expo-blur').BlurView;
} catch (e) {
  BlurView = null;
}

export default function CarteirinhaScreen() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentToken, setCurrentToken] = useState(null);
  const [beneficiarioCancelado, setBeneficiarioCancelado] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tokenExpirationTime, setTokenExpirationTime] = useState(null);
  const [tokenExpired, setTokenExpired] = useState(false);

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

  // 🔥 EFEITO PARA CONTROLAR EXPIRAÇÃO DO TOKEN (5 MINUTOS)
  useEffect(() => {
    if (!currentToken) return;

    setTokenExpirationTime(300); // 5 minutos em segundos
    setTokenExpired(false);

    const interval = setInterval(() => {
      setTokenExpirationTime((prevTime) => {
        if (prevTime <= 1) {
          setTokenExpired(true);
          setCurrentToken(null);
          clearInterval(interval);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentToken]);

  // 🔥 FUNÇÃO PARA GERAR TOKEN
const handleGenerateToken = async () => {
  setGenerating(true);
  try {
      const timestamp = Date.now().toString();
      const cpf = userData.sCpfUSR;
      const geoloc= await getLocationAsync();
      const dataNascimento = userData.dNascimento;
      const nomeUsuario = userData.sNomeUSR;
      const cardUsuario = userData.sCodigoUSR;
      console.log('Gerando token para CPF:', cpf, 'e Data de Nascimento:', dataNascimento);
      const token = gerarChave(cpf, dataNascimento);
      console.log("localização: ",geoloc);

      const freshData = await buscarCard('/get_card_ext', cpf, token);
      const key = token;

      console.log('Dados atualizados:', freshData);

      // Detectar suspensão em vários formatos/campos para garantir que o alerta seja mostrado
      const detectSuspenso = (data) => {
        if (!data) return false;
        const candidates = [
          data.suspenso,
          data.status_plano && data.status_plano.suspenso,
          data.suspensoUSR,
          data.suspensoTIT,
          data.suspenso_flag,
        ];
        let found = null;
        for (const c of candidates) {
          if (c !== undefined && c !== null && String(c).trim() !== '') {
            found = c;
            break;
          }
        }
        if (found === null) return false;
        // DEBUG: log the detected candidate to help troubleshooting
        console.log('DETECT_SUSPENSO - candidate:', found, 'type:', typeof found);
        if (typeof found === 'number') {
          const res = found === 1;
          console.log('DETECT_SUSPENSO - result:', res);
          return res;
        }
        const s = String(found).trim().toLowerCase();
        const res = s === '1' || s === 'true' || s === 'sim' || s === 's' || s === 'yes';
        console.log('DETECT_SUSPENSO - normalized:', s, 'result:', res);
        return res;
      };

      if (detectSuspenso(freshData)) {
        const motivo = freshData.motivo_suspensao || freshData.motivo || freshData.motivo_suspensaoUSR || 'Não informado';
        Alert.alert(
          'Acesso Bloqueado',
          `Seu acesso está suspenso. Motivo: ${motivo}\n\nEntre em contato com o suporte para regularizar sua situação.`,
          [{ text: 'Entendi' }]
        );
        return;
      }

      if (freshData) {
        setUserData(freshData);
        await AsyncStorage.setItem('userData', JSON.stringify(freshData));
      } else {
        setError('Não foi possível carregar os dados');
      }
      
      if (!freshData) {
        throw new Error('Não foi possível obter dados atualizados da carteirinha, verifique sua conexão com a internet.');
      }

      // VERIFICAR SE EXISTE STATUS DO PLANO
      if (freshData.status_plano) {
        const statusInfo = freshData.status_plano;
        
        // Função para abrir link e enviar contrato
        const handleOpenLink = async (url, contrato) => {
          try {
            // Primeiro envia o contrato para o endpoint
            try {
              await retornarSuspenso('/suspender_cnt', contrato, token);
              console.log('Contrato enviado com sucesso:', contrato);
            } catch (error) {
              console.error('Erro ao enviar contrato:', error);
              // Não mostra alerta para não interromper o fluxo
            }

            // Depois abre o link
            const supported = await Linking.canOpenURL(url);
            if (supported) {
              await Linking.openURL(url);
            } else {
              Alert.alert('Erro', 'Não foi possível abrir o link');
            }
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível abrir o link');
          }
        };

        // Aguarda confirmação do usuário sobre o status do plano
        await new Promise((resolve) => {
          let url = statusInfo.complemento_fase;
          if (url && !url.startsWith('http')) {
            url = 'https://' + url;
          }

          const buttons = [
            {
              text: '🔗 Abrir Link',
              onPress: async () => {
                await handleOpenLink(url, freshData.sNumeroCNT);
                // IMPORTANTE: Resolve a Promise após abrir o link
                resolve(true);
              }
            }
          ];

          Alert.alert(
            '📦 Status do Plano',
            `Status: ${statusInfo.status || 'Não informado'}\n\n${
              url 
                ? 'Há um documento do seu plano disponível para a assinatura. Clique em "Abrir Link" para visualizá-lo. Até a confirmação de assinatura, esta será a ultima consulta autorizada.'
                : ''
            }`,
            buttons,
            { cancelable: false }
          );
        });
      }

      // Gera e exibe o token após a confirmação do status
      const tokenGerado = gerarTokenAutorizacao(key, timestamp);
      setCurrentToken(tokenGerado);
      setTokenExpired(false);
      setTokenExpirationTime(300); // Inicia o cronômetro com 5 minutos
      // Envia token + timestamp + geoloc para a API (endpoint ajustável)
      try {
        console.log("enviando autorização ao siccada")
        // Ajuste o endpoint conforme sua API espera (ex: '/autorizar_token')
        await enviarAutorizacao('/autorizar_token', key, tokenGerado, timestamp, geoloc, nomeUsuario, cardUsuario);
      } catch (err) {
        console.error('Falha ao enviar autorização:', err);
      }

      Alert.alert(
        'Token Gerado',
        `Token: ${tokenGerado}\n\nUse este token para autorizar consultas.`,
        [
          {
            text: 'Copiar',
            onPress: () => {
              console.log('Token copiado:', tokenGerado);
              // Lógica para copiar para área de transferência
            }
          },
          { text: 'OK', onPress: () => {} }
        ]
      );

    } catch (error) {
      console.error('Erro ao gerar token:', error);
      
      // 🎯 TRATAR ERRO DE BENEFICIÁRIO CANCELADO
      if (error.message.includes('Beneficiário cancelado')) {
        const motivo = error.message.replace('Beneficiário cancelado: ', '');
        setBeneficiarioCancelado(true);
        
        Alert.alert(
          'Conta Cancelada',
          `Sua conta foi cancelada. Motivo: ${motivo}\n\nEntre em contato com o suporte para mais informações.`,
          [
            { 
              text: 'Entendi', 
              onPress: () => {}
            }
          ]
        );
      } else {
        Alert.alert(
          'Erro', 
          'Não foi possível gerar o token. Verifique sua conexão e tente novamente.'
        );
      }
    } finally {
      setGenerating(false);
    }
  };

  // 🎯 TELA DE BENEFICIÁRIO CANCELADO
  if (beneficiarioCancelado) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.container}>
          <View style={styles.canceladoContainer}>
            <Text style={styles.iconeCancelado}>❌</Text>
            <Text style={styles.tituloCancelado}>Conta Cancelada</Text>
            <Text style={styles.descricaoCancelado}>
              Sua conta de beneficiário foi cancelada. Entre em contato com o suporte para mais informações.
            </Text>
            <TouchableOpacity 
              style={styles.botaoSuporte}
              onPress={() => {
                Alert.alert('Suporte', 'Entre em contato com nossa central de atendimento.');
              }}
            >
              <Text style={styles.botaoSuporteText}>Falar com Suporte</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E76B8" />
          <Text style={styles.loadingText}>Carregando carteirinha...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !userData) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={{flex:1}}>
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
            
            {/* 🎯 INDICADOR DE STATUS (mantendo estilo da sua tela) */}
            {userData.sMotivoCancelamentoUSR && (
              <View style={styles.statusContainer}>
                <Text style={styles.statusTextCancelado}>CONTA CANCELADA</Text>
              </View>
            )}
          </View>

          {/* 🔥 BOTÃO PARA GERAR TOKEN (só mostra se não estiver cancelado) */}
          {!userData.sMotivoCancelamentoUSR && (
            <TouchableOpacity 
              style={styles.tokenButton}
              onPress={handleGenerateToken}
            >
              <Text style={styles.tokenButtonText}>Gerar Token de Autorização</Text>
            </TouchableOpacity>
          )}

          {/* 🔥 EXIBIR TOKEN ATUAL */}
          {currentToken && (
            <View style={styles.tokenContainer}>
              {/* 🔥 OVERLAY DE PREENCHIMENTO REGRESSIVO */}
              <View 
                style={[
                  styles.tokenDischargeOverlay,
                  {
                    right: 0,
                    width: tokenExpirationTime !== null ? Math.max(0, 100 - (tokenExpirationTime / 300) * 100) + '%' : '0%',
                  }
                ]} 
              />
               <Text style={styles.tokenLabel}>Token atual:</Text>
              <Text style={styles.tokenValue}>{currentToken}</Text>
             <Text style={styles.tokenTimeLabel}>Expira em:</Text>
              <Text style={styles.tokenTimeValue}>
                {tokenExpirationTime !== null && tokenExpirationTime > 0 
                  ? `${Math.floor(tokenExpirationTime / 60)}:${String(tokenExpirationTime % 60).padStart(2, '0')}` 
                  : '⏰'}
              </Text>
            </View>
          )}

          {/* 🎯 AVISO DE TOKEN EXPIRADO */}
          {tokenExpired && (
            <View style={styles.tokenExpiradoContainer}>
              <Text style={styles.tokenExpiradoText}>⏰ Token Expirado</Text>
              <Text style={styles.tokenExpiradoDesc}>O seu token de autorização expirou. Gere um novo token para continuar.</Text>
            </View>
          )}

          {/* 🎯 AVISO SE JÁ ESTIVER CANCELADO NOS DADOS LOCAIS */}
          {userData.sMotivoCancelamentoUSR && (
            <View style={styles.avisoContainer}>
              <Text style={styles.avisoText}>
                ⚠️ Esta conta está cancelada. Para mais informações, entre em contato com o suporte.
              </Text>
            </View>
          )}
        </View>
      ) : (
        <Text>Dados não disponíveis</Text>
      )}
        </ScrollView>

        {generating && (
          BlurView ? (
            <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
              <View style={styles.overlayContent} pointerEvents="auto">
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={styles.overlayText}>Gerando token, aguarde...</Text>
              </View>
            </BlurView>
          ) : (
            <View style={styles.overlay} pointerEvents="auto">
              <ActivityIndicator size="large" color="#ffffff" />
              <Text style={styles.overlayText}>Gerando token, aguarde...</Text>
            </View>
          )
        )}
      </View>
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
    marginTop: 16,
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
    marginBottom: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  tokenDischargeOverlay: {
    position: 'absolute',
    top: 0,
    height: '150%',
    backgroundColor: 'rgba(200, 200, 200, 0.5)',
    zIndex: 0,
  },
  tokenTimeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 0,
    zIndex: 2,
    position: 'relative',
  },
  tokenTimeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E76B8',
    fontFamily: 'monospace',
    marginBottom: 0,
    zIndex: 2,
    position: 'relative',
  },
  tokenLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 0,
    zIndex: 2,
    position: 'relative',
  },
  tokenValue: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    color: '#2E76B8',
    marginBottom: 0,
    zIndex: 2,
    position: 'relative',
  },
  tokenHint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    zIndex: 2,
    position: 'relative',
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
  // 🎯 ESTILOS PARA BENEFICIÁRIO CANCELADO
  canceladoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconeCancelado: {
    fontSize: 64,
    marginBottom: 20,
  },
  tituloCancelado: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 10,
    textAlign: 'center',
  },
  descricaoCancelado: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
    lineHeight: 22,
  },
  botaoSuporte: {
    backgroundColor: '#2E76B8',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  botaoSuporteText: {
    color: 'white',
    fontWeight: 'bold',
  },
  // 🎯 ESTILOS PARA STATUS
  statusContainer: {
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  statusTextCancelado: {
    color: '#e74c3c',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // 🎯 ESTILOS PARA AVISO
  avisoContainer: {
    backgroundColor: '#fff3e0',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  avisoText: {
    color: '#e65100',
    textAlign: 'center',
    fontSize: 14,
  },
  // 🔥 ESTILOS PARA TOKEN EXPIRADO
  tokenExpiradoContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
    marginBottom: 20,
  },
  tokenExpiradoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 8,
  },
  tokenExpiradoDesc: {
    fontSize: 14,
    color: '#c62828',
    lineHeight: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  overlayText: {
    marginTop: 12,
    color: '#fff',
    fontSize: 16,
  },
  blurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContent: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});