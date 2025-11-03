import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl
} from "react-native";
import { buscarPagamentos } from "../mantis/everflowConex";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { gerarChave } from "../mantis/crypto";
import { Ionicons } from "@expo/vector-icons";

export default function BoletosScreen() {
  const [boletos, setBoletos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const carregarBoletos = async () => {
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      
      if (!userDataString) {
        throw new Error('Dados do usuário não encontrados');
      }

      const userData = JSON.parse(userDataString);
      const cpf = userData.sCpfUSR;
      const dataNascimento = userData.dNascimento;
      const contrato = userData.sNumeroCNT;

      if (!cpf || !dataNascimento || !contrato) {
        throw new Error('Dados incompletos no AsyncStorage');
      }

      const contrato2 = '?contrato=' + contrato + '&token=';
      const token = gerarChave(cpf, dataNascimento);
      const boletosData = await buscarPagamentos('/gerar_boleto_ext', contrato2, token);
      
      console.log('Dados recebidos da API:', boletosData);
      
      // Garantir que seja um array
      if (Array.isArray(boletosData)) {
        setBoletos(boletosData);
      } else if (boletosData && typeof boletosData === 'object') {
        // Se for um único objeto, transforma em array
        setBoletos([boletosData]);
      } else {
        setBoletos([]);
      }
      
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Erro ao carregar boletos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    carregarBoletos();
  };

  useEffect(() => {
    carregarBoletos();
  }, []);

  const formatarData = (dataString) => {
    if (!dataString) return '-';
    const [dia, mes, ano] = dataString.split('/');
    return `${dia}/${mes}/${ano}`;
  };

  const formatarMoeda = (valor) => {
    if (!valor) return 'R$ 0,00';
    return `R$ ${parseFloat(valor).toFixed(2).replace('.', ',')}`;
  };

  const calcularDiasRestantes = (dataVencimento) => {
    if (!dataVencimento) return null;
    
    try {
      const [dia, mes, ano] = dataVencimento.split('/');
      const dataVenc = new Date(ano, mes - 1, dia);
      const hoje = new Date();
      
      // Resetar horas para comparar apenas as datas
      hoje.setHours(0, 0, 0, 0);
      dataVenc.setHours(0, 0, 0, 0);
      
      const diffTime = dataVenc - hoje;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays;
    } catch (error) {
      console.error('Erro ao calcular dias restantes:', error);
      return null;
    }
  };

  const getStatusBoleto = (diasRestantes) => {
    if (diasRestantes === null) return { texto: 'Indisponível', cor: '#8E8E93', bg: '#F2F2F7' };
    if (diasRestantes < 0) return { texto: 'Vencido', cor: '#FF3B30', bg: '#FFECEC' };
    if (diasRestantes === 0) return { texto: 'Vence hoje', cor: '#FF9500', bg: '#FFF4E6' };
    if (diasRestantes <= 5) return { texto: `Vence em ${diasRestantes} dias`, cor: '#FF9500', bg: '#FFF4E6' };
    return { texto: 'Em aberto', cor: '#34C759', bg: '#E6F7EC' };
  };

  const copiarParaAreaTransferencia = (texto) => {
    // Implementar lógica de copiar para área de transferência
    Alert.alert('Copiado!', 'Informação copiada para a área de transferência');
  };

  const handlePagarAgora = (boleto) => {
    Alert.alert(
      "Pagar Boleto",
      `Deseja realizar o pagamento do boleto de ${formatarMoeda(boleto.mensalidade)}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Pagar", style: "default" }
      ]
    );
  };

  const ordenarBoletos = (boletosArray) => {
    return boletosArray.sort((a, b) => {
      const diasA = calcularDiasRestantes(a.vencimento) || 999;
      const diasB = calcularDiasRestantes(b.vencimento) || 999;
      return diasA - diasB;
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Carregando boletos...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorTitle}>Ops! Algo deu errado</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={carregarBoletos}>
          <Text style={styles.retryButtonText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const boletosOrdenados = ordenarBoletos([...boletos]);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Meus Boletos</Text>
        <Text style={styles.subtitle}>
          {boletosOrdenados.length} boleto{boletosOrdenados.length !== 1 ? 's' : ''} encontrado{boletosOrdenados.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {boletosOrdenados.length > 0 ? (
        <View style={styles.boletosList}>
          {boletosOrdenados.map((boleto, index) => {
            const diasRestantes = calcularDiasRestantes(boleto.vencimento);
            const status = getStatusBoleto(diasRestantes);
            
            return (
              <View key={index} style={styles.boletoCard}>
                {/* Cabeçalho do Boleto */}
                <View style={styles.cardHeader}>
                  <Ionicons name="document-text-outline" size={24} color="#007AFF" />
                  <Text style={styles.cardTitle}>Boleto {index + 1}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: status.cor }]}>
                      {status.texto}
                    </Text>
                  </View>
                </View>

                {/* Informações do Contrato */}
                <View style={styles.infoSection}>
                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Contrato</Text>
                      <View style={styles.infoValueContainer}>
                        <Text style={styles.infoValue}>{boleto.contrato || '-'}</Text>
                        <TouchableOpacity onPress={() => copiarParaAreaTransferencia(boleto.contrato)}>
                          <Ionicons name="copy-outline" size={16} color="#8E8E93" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Responsável</Text>
                      <Text style={styles.infoValue} numberOfLines={2}>
                        {boleto.nome_responsavel || '-'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Detalhes Financeiros */}
                <View style={styles.infoSection}>
                  <View style={styles.valorContainer}>
                    <Text style={styles.valorLabel}>Valor da Mensalidade</Text>
                    <Text style={styles.valor}>
                      {formatarMoeda(boleto.mensalidade)}
                    </Text>
                  </View>

                  <View style={styles.vencimentoContainer}>
                    <View style={styles.vencimentoInfo}>
                      <Ionicons 
                        name="calendar-outline" 
                        size={20} 
                        color={diasRestantes <= 5 ? "#FF3B30" : "#007AFF"} 
                      />
                      <View style={styles.vencimentoTexts}>
                        <Text style={styles.vencimentoLabel}>Vencimento</Text>
                        <Text style={styles.vencimentoData}>
                          {formatarData(boleto.vencimento)}
                        </Text>
                      </View>
                    </View>
                    
                    {diasRestantes !== null && (
                      <View style={styles.diasContainer}>
                        <Text style={styles.diasLabel}>
                          {diasRestantes < 0 ? 'Dias em atraso' : 'Dias restantes'}
                        </Text>
                        <Text style={[
                          styles.diasValue,
                          { color: diasRestantes <= 5 ? '#FF3B30' : '#34C759' }
                        ]}>
                          {Math.abs(diasRestantes)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Ações */}
                <View style={styles.actionsSection}>
                  <TouchableOpacity 
                    style={[
                      styles.pagarButton,
                      diasRestantes < 0 && styles.pagarButtonVencido
                    ]} 
                    onPress={() => handlePagarAgora(boleto)}
                  >
                    <Ionicons name="card-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.pagarButtonText}>
                      {diasRestantes < 0 ? 'Pagar com Multa' : 'Pagar Agora'}
                    </Text>
                  </TouchableOpacity>
                  
                  <View style={styles.secondaryActions}>
                    <TouchableOpacity style={styles.secondaryButton}>
                      <Ionicons name="share-outline" size={18} color="#007AFF" />
                      <Text style={styles.secondaryButtonText}>Compartilhar</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.secondaryButton}>
                      <Ionicons name="download-outline" size={18} color="#007AFF" />
                      <Text style={styles.secondaryButtonText}>Salvar PDF</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Informações Adicionais */}
                {diasRestantes !== null && diasRestantes <= 5 && (
                  <View style={styles.additionalInfo}>
                    <Text style={styles.additionalInfoText}>
                      {diasRestantes < 0 
                        ? '⚠️ Boleto vencido! Pague o quanto antes para evitar juros adicionais.'
                        : diasRestantes === 0
                        ? '⚠️ Boleto vence hoje! Realize o pagamento para evitar multas.'
                        : '💡 Boleto próximo do vencimento! Pague agora para evitar multas.'
                      }
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="document-outline" size={64} color="#C7C7CC" />
          <Text style={styles.emptyStateTitle}>Nenhum boleto encontrado</Text>
          <Text style={styles.emptyStateText}>
            Não há boletos disponíveis para este contrato no momento.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
  },
  boletosList: {
    padding: 16,
  },
  boletoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1C1E",
    marginLeft: 8,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 4,
  },
  infoValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1C1C1E",
    flex: 1,
  },
  valorContainer: {
    backgroundColor: "#F2F2F7",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  valorLabel: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 4,
  },
  valor: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1C1C1E",
  },
  vencimentoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF4E6",
    padding: 16,
    borderRadius: 12,
  },
  vencimentoInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  vencimentoTexts: {
    marginLeft: 8,
  },
  vencimentoLabel: {
    fontSize: 14,
    color: "#8E8E93",
  },
  vencimentoData: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  diasContainer: {
    alignItems: "center",
  },
  diasLabel: {
    fontSize: 12,
    color: "#8E8E93",
  },
  diasValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  actionsSection: {
    marginTop: 8,
  },
  pagarButton: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  pagarButtonVencido: {
    backgroundColor: "#FF3B30",
  },
  pagarButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  secondaryActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C7C7CC",
    flex: 0.48,
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
  additionalInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#FFECEC",
    borderRadius: 8,
  },
  additionalInfoText: {
    fontSize: 12,
    color: "#FF3B30",
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#8E8E93",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#C7C7CC",
    textAlign: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#8E8E93",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1C1E",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});