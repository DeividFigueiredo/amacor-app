import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native'; // ✅ ADICIONE ESTE IMPORT
import { buscarCard } from '../mantis/everflowConex';
import { gerarChave } from '../mantis/crypto';

export default function HomeScreen({ onLogout, navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [beneficiarioCancelado, setBeneficiarioCancelado] = useState(false);
  
  // ✅ HOOK PARA SABER SE A TELA ESTÁ EM FOCO
  const isFocused = useIsFocused();

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      
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
      
      // Precisa do CPF e data de nascimento para gerar o token
      const storedUser = await AsyncStorage.getItem('userData');
      if (storedUser) {
        const tempData = JSON.parse(storedUser);
        const cpf = tempData.sCpfUSR;
        const dataNascimento = tempData.dNascimento;
        
        if (cpf && dataNascimento) {
          const token = gerarChave(cpf, dataNascimento);
          const freshData = await buscarCard('/get_card_ext', cpf, token);
          
          if (freshData) {
            setUserData(freshData);
            await AsyncStorage.setItem('userData', JSON.stringify(freshData));
          } else {
            setError('Não foi possível carregar os dados');
          }
        } else {
          setError('Dados incompletos para buscar informações');
        }
      } else {
        setError('Dados de usuário não encontrados');
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
      
      // 🎯 TRATAR ERRO DE BENEFICIÁRIO CANCELADO
      if (err.message.includes('Beneficiário cancelado')) {
        const motivo = err.message.replace('Beneficiário cancelado: ', '');
        setBeneficiarioCancelado(true);
        
        Alert.alert(
          'Conta Cancelada', 
          `Sua conta foi cancelada. Motivo: ${motivo}\n\nEntre em contato com o suporte para mais informações.`,
          [
            { 
              text: 'Entendi', 
              onPress: () => {
                // Opcional: navegar para tela de suporte ou login
              }
            }
          ]
        );
      } else {
        setError('Erro ao carregar dados: ' + 'O erro pode sugerir que o seu plano está inativo, por favor, entre em contato com a Amacor.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 🔥 BUSCA OS DADOS NA PRIMEIRA VEZ
    fetchUserData();
  }, []);

  // ✅ ESCUTA QUANDO A TELA GANHA FOCO
  useEffect(() => {
    if (isFocused) {
      console.log('HomeScreen recebeu foco - verificando dados...');
      fetchUserData();
    }
  }, [isFocused]);
  // 🎯 TELA DE BENEFICIÁRIO CANCELADO
  if (beneficiarioCancelado) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.canceladoContainer}>
          <Ionicons name="close-circle" size={80} color="#e74c3c" />
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
          <TouchableOpacity 
            style={styles.botaoSecundario}
            onPress={() => {
              onLogout(); // ✅ Chama a função do App.js
            }}
          >
            <Text style={styles.botaoSecundarioText}>Fazer Login Novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
          onPress={() => {
              onLogout(); // ✅ Chama a função do App.js
            }}
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
          <Text style={styles.welcomeSubtext}>
            {userData && userData.sMotivoCancelamentoUSR 
              ? 'Seu plano está cancelado' 
              : 'Seu plano está ativo'
            }
          </Text>
          
          {/* 🎯 INDICADOR DE STATUS */}
          {userData && userData.sMotivoCancelamentoUSR && (
            <View style={styles.statusBadge}>
              <Ionicons name="warning" size={16} color="white" />
              <Text style={styles.statusBadgeText}>CONTA CANCELADA</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sobre seu Plano:</Text>
          <View style={styles.planInfo}>
            <Ionicons 
              name="medical" 
              size={24} 
              color={userData && userData.sMotivoCancelamentoUSR ? "#e74c3c" : "#2E76B8"} 
            />
            <View style={styles.planDetails}>
              <Text style={[
                styles.planName,
                userData && userData.sMotivoCancelamentoUSR && styles.planCancelado
              ]}>
                {userData ? userData.sNomePRD : 'Carregando...'}
              </Text>
              <Text style={styles.planNumber}>
                Matricula: {userData ? userData.sCodigoUSR : 'Carregando...'}
              </Text>
              <Text style={styles.planInfoLine}>
                Responsável do plano: {userData ? (userData.sNomeResp || userData.sAssociado || userData.sNomeUSR) : 'Carregando...'}
              </Text>
              <Text style={styles.planInfoLine}>
                Beneficiário: {userData ? userData.sNomeUSR : 'Carregando...'}
              </Text>
              {userData && userData.sMotivoCancelamentoUSR && (
                <Text style={styles.motivoCancelamento}>
                  Motivo: {userData.sMotivoCancelamentoUSR}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Menu Rápido:</Text>
          
          {/* 🎯 OCULTA ALGUMAS OPÇÕES SE ESTIVER CANCELADO */}
          {!userData?.sMotivoCancelamentoUSR ? (
            <>
              <TouchableOpacity style={styles.menuItem}
                    onPress= {() => navigation.navigate("SolicitarAut")}>
                <Ionicons name="calendar" size={24} color="#2E76B8" />
                <Text style={styles.menuText}>Solicitar Autorização</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem}
                         onPress= {() => navigation.navigate("BuscarEspecialidades")}>
                          <Ionicons name="git-compare" size={24} color="#2E76B8" />
                          <Text style={styles.menuText}>Buscar por especialidade</Text>
                        </TouchableOpacity>
            </>
          ) : (
            <View style={styles.avisoContainer}>
              <Ionicons name="information-circle" size={20} color="#e74c3c" />
              <Text style={styles.avisoText}>
                Algumas funcionalidades estão indisponíveis para contas canceladas
              </Text>
            </View>
          )}
          
          <TouchableOpacity style={styles.menuItem}
           onPress={() => navigation.navigate("Boletos")}>
            <Ionicons name="cash" size={24} color="#42741aff" />
            <Text style={styles.menuText}>Pagamento de mensalidade</Text>
          </TouchableOpacity>
        </View>

        {/* 🎯 CARD DE SUPORTE SE ESTIVER CANCELADO */}
        {userData && userData.sMotivoCancelamentoUSR && (
          <View style={[styles.card, styles.suporteCard]}>
            <Text style={styles.cardTitle}>Precisa de Ajuda?</Text>
            <TouchableOpacity style={styles.suporteButton}>
              <Ionicons name="call" size={20} color="white" />
              <Text style={styles.suporteButtonText}>Falar com Suporte</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 16,
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
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
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  planCancelado: {
    color: '#e74c3c',
    textDecorationLine: 'line-through',
  },
  planNumber: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  planInfoLine: {
    fontSize: 13,
    color: '#7f8c8d',
    marginTop: 4,
  },
  motivoCancelamento: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 4,
    fontStyle: 'italic',
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
  // 🎯 ESTILOS PARA BENEFICIÁRIO CANCELADO
  canceladoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tituloCancelado: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginTop: 20,
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
    borderRadius: 8,
    marginBottom: 10,
  },
  botaoSuporteText: {
    color: 'white',
    fontWeight: 'bold',
  },
  botaoSecundario: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2E76B8',
  },
  botaoSecundarioText: {
    color: '#2E76B8',
    fontWeight: 'bold',
  },
  // 🎯 ESTILOS PARA AVISOS
  avisoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  avisoText: {
    fontSize: 14,
    color: '#e65100',
    marginLeft: 8,
    flex: 1,
  },
  // 🎯 ESTILOS PARA CARD DE SUPORTE
  suporteCard: {
    backgroundColor: '#fff3e0',
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  suporteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e74c3c',
    padding: 12,
    borderRadius: 8,
  },
  suporteButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});