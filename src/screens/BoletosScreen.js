import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  SafeAreaView
} from "react-native";
import { buscarPagamentos } from "../mantis/everflowConex";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { gerarChave } from "../mantis/crypto";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as FileSystem from "expo-file-system/legacy";
import { Asset } from "expo-asset";
import * as Sharing from "expo-sharing";

export default function BoletosScreen() {
  const [boletos, setBoletos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isContratoEmpresarial, setIsContratoEmpresarial] = useState(false);

  const carregarBoletos = async () => {
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      
      if (!userDataString) {
        throw new Error('Dados do usuário não encontrados');
      }

      const userData = JSON.parse(userDataString);
      console.log('Dados do usuário carregados do AsyncStorage:', userData);
      const cpf = userData.sCpfUSR;
      const codigoUsuario= userData.sCodigoUSR;
      const codigoResponsavel= userData.sCodigoUSRTIT;
      console.log('CPF do usuário:', cpf);
      console.log('Código do usuário:', codigoUsuario);
      const dataNascimento = userData.dNascimento;
      console.log('Data de Nascimento do usuário:', dataNascimento);
      const contrato = userData.sNumeroCNT;
      const cpfCgcResponsavel = userData.sCpfCgcResp;

      if (!cpf || !dataNascimento || !contrato || !codigoResponsavel) {
        throw new Error('Dados incompletos no AsyncStorage');
      }

      const normalizarDocumento = (valor) => String(valor || '').replace(/\D/g, '');
      const isCnpj = (valor) => {
        const doc = normalizarDocumento(valor);
        return doc.length === 14;
      };

      setIsContratoEmpresarial(isCnpj(cpfCgcResponsavel));

      const contrato2 = '?contrato=' + contrato + '&token=';
      const token = gerarChave(cpf, dataNascimento);
      const boletosData = await buscarPagamentos('/gerar_boleto_ext', codigoUsuario, codigoResponsavel, token);
      
      console.log('Dados recebidos da API:', boletosData);

      const normalizarBoleto = (boleto) => ({
        contrato: boleto.sNumeroCNT || boleto.sCodigoDebitoAutomatico || boleto.sMatricula || '-',
        nomeResponsavel: boleto.sAssociado || boleto.sNomeTIT || '-',
        mensalidade: boleto.cValorMensalidade || boleto.cTotalAPagar || boleto.Saldo || '0.00',
        vencimento: boleto.dVencimento || boleto.Vencimento || '-',
        codigoBarras: boleto.sIPTE || boleto.sCodigoBarras || '-',
        parcela: boleto.sParcela || boleto.Parcela || '-',
        detalhes: boleto || {},
      });

      let boletosArray = [];
      if (boletosData && Array.isArray(boletosData.boletos_2via)) {
        boletosArray = boletosData.boletos_2via.map(normalizarBoleto);
      } else if (Array.isArray(boletosData)) {
        boletosArray = boletosData.map(normalizarBoleto);
      } else if (boletosData && typeof boletosData === 'object') {
        boletosArray = [normalizarBoleto(boletosData)];
      }

      setBoletos(boletosArray);
      
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
    if (dataString.includes('-')) {
      const [ano, mes, dia] = dataString.split('-');
      return `${dia}/${mes}/${ano}`;
    }
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
      let dia; let mes; let ano;
      if (dataVencimento.includes('-')) {
        [ano, mes, dia] = dataVencimento.split('-');
      } else {
        [dia, mes, ano] = dataVencimento.split('/');
      }
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
    if (!texto || texto === '-') {
      Alert.alert('Nada para copiar', 'Informação indisponível');
      return;
    }

    Alert.alert(
      'Copiar manualmente',
      'Toque e segure no texto para selecionar e copiar.'
    );
  };

  const gerarHtmlBoleto = async (boleto) => {
    const detalhes = boleto.detalhes || {};
    const contrato = detalhes.sNumeroCNT || boleto.contrato || '-';
    const responsavel = detalhes.sNomeTIT || boleto.nomeResponsavel || '-';
    const valor = formatarMoeda(detalhes.cTotalAPagar || boleto.mensalidade);
    const vencimento = formatarData(detalhes.dVencimento || boleto.vencimento);
    const emissao = formatarData(detalhes.dEmissao || detalhes.dDocumento);
    const parcela = detalhes.sParcela || boleto.parcela || '-';
    const nossoNumero = detalhes.sNossoNumero || detalhes.sNossoNumero_Boleto || '-';
    const documento = detalhes.sNumDoc || detalhes.sDocumento || '-';
    const agencia = detalhes.sAgencia || '-';
    const conta = detalhes.sContaCorrente || '-';
    const carteira = detalhes.sCarteira || '-';
    const banco = detalhes.sNomeBanco || '-';
    const razaoSocial = detalhes.sRazaoSocial || '-';
    const sacado = detalhes.sNomeTIT || detalhes.sAssociado || '-';
    const cpfCgc = detalhes.sCgcCpf || '-';
    const endereco1 = detalhes.sSacadoEnd1 || '-';
    const endereco2 = detalhes.sSacadoEnd2 || '-';
    const endereco3 = detalhes.sSacadoEnd3 || '-';
    const instrucoes = detalhes.mInstrucoes || '-';
    const ipte = detalhes.sIPTE || '-';
    const codigoBarras = detalhes.sCodigoBarras || boleto.codigoBarras || '-';
    const localPagamento = detalhes.sAvisoLocalPagamento1 || '-';

    let logoBase64 = '';
    try {
      const logoAsset = Asset.fromModule(require('../../assets/icon.png'));
      await logoAsset.downloadAsync();
      logoBase64 = await FileSystem.readAsStringAsync(logoAsset.localUri || logoAsset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (error) {
      console.warn('Erro ao carregar logo para PDF:', error);
    }

    let barcodeBase64 = '';
    try {
      const barcodeText = ipte && ipte !== '-' ? ipte : codigoBarras;
      if (barcodeText && barcodeText !== '-') {
        const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(
          barcodeText
        )}&scale=3&height=12&includetext=false`;
        const barcodeFile = `${FileSystem.cacheDirectory}barcode-${Date.now()}.png`;
        await FileSystem.downloadAsync(barcodeUrl, barcodeFile);
        barcodeBase64 = await FileSystem.readAsStringAsync(barcodeFile, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
    } catch (error) {
      console.warn('Erro ao gerar barcode para PDF:', error);
    }

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #1C1C1E; }
            .title { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #1C1C1E; padding-bottom: 8px; margin-bottom: 12px; }
            .bank-code { font-size: 20px; font-weight: 700; padding: 0 8px; border-left: 2px solid #1C1C1E; }
            .linha { font-size: 12px; font-weight: 600; letter-spacing: 0.2px; }
            .logo { width: 44px; height: 44px; object-fit: contain; }
            .section { margin-top: 10px; border: 1px solid #1C1C1E; }
            .row { display: grid; grid-template-columns: 1.2fr 1fr 1fr; border-top: 1px solid #1C1C1E; }
            .row:first-child { border-top: none; }
            .cell { padding: 6px 8px; border-right: 1px solid #1C1C1E; min-height: 48px; }
            .cell:last-child { border-right: none; }
            .label { font-size: 10px; color: #4B4B4B; text-transform: uppercase; }
            .value { font-size: 12px; font-weight: 600; margin-top: 4px; }
            .row-2 { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid #1C1C1E; }
            .row-1 { display: grid; grid-template-columns: 1fr; border-top: 1px solid #1C1C1E; }
            .barcode-box { margin-top: 12px; padding: 8px; border: 1px solid #1C1C1E; text-align: center; }
            .barcode-box .label { text-align: left; display: block; }
            .barcode { font-size: 12px; word-break: break-all; }
            .barcode-img { width: 384px; height: 72px; object-fit: contain; display: block; margin: 6px auto 0; }
            .small { font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="title">
            ${logoBase64 ? `<img class="logo" src="data:image/png;base64,${logoBase64}" />` : ''}
            <div class="bank-code">${detalhes.sCodigoBancoCompleto || detalhes.sCodigoBanco || '—'}</div>
            <div class="linha">${razaoSocial}</div>
          </div>

          <div class="section">
            <div class="row">
              <div class="cell">
                <div class="label">Beneficiário</div>
                <div class="value">${razaoSocial}</div>
              </div>
              <div class="cell">
                <div class="label">Agência / Conta</div>
                <div class="value">${agencia} / ${conta}</div>
              </div>
              <div class="cell">
                <div class="label">Vencimento</div>
                <div class="value">${vencimento}</div>
              </div>
            </div>
            <div class="row">
              <div class="cell">
                <div class="label">Sacado</div>
                <div class="value">${sacado}</div>
              </div>
              <div class="cell">
                <div class="label">CPF/CNPJ</div>
                <div class="value">${cpfCgc}</div>
              </div>
              <div class="cell">
                <div class="label">Valor do documento</div>
                <div class="value">${valor}</div>
              </div>
            </div>
            <div class="row-2">
              <div class="cell">
                <div class="label">Endereço</div>
                <div class="value">${endereco1}</div>
                <div class="value small">${endereco2}</div>
              </div>
              <div class="cell">
                <div class="label">CEP</div>
                <div class="value">${endereco3}</div>
              </div>
            </div>
            <div class="row">
              <div class="cell">
                <div class="label">Nosso número</div>
                <div class="value">${nossoNumero}</div>
              </div>
              <div class="cell">
                <div class="label">Número do documento</div>
                <div class="value">${documento}</div>
              </div>
              <div class="cell">
                <div class="label">Emissão</div>
                <div class="value">${emissao}</div>
              </div>
            </div>
            <div class="row">
              <div class="cell">
                <div class="label">Carteira</div>
                <div class="value">${carteira}</div>
              </div>
              <div class="cell">
                <div class="label">Contrato</div>
                <div class="value">${contrato}</div>
              </div>
              <div class="cell">
                <div class="label">Parcela</div>
                <div class="value">${parcela}</div>
              </div>
            </div>
            <div class="row-1">
              <div class="cell">
                <div class="label">Local de pagamento</div>
                <div class="value">${localPagamento}</div>
              </div>
            </div>
            <div class="row-1">
              <div class="cell">
                <div class="label">Instruções</div>
                <div class="value">${instrucoes}</div>
              </div>
            </div>
          </div>

          <div class="barcode-box">
            <div class="label">Código de barras</div>
            ${barcodeBase64 ? `<img class="barcode-img" src="data:image/png;base64,${barcodeBase64}" />` : ''}
            <div class="value barcode">${ipte}</div>
          </div>
        </body>
      </html>
    `;
  };

  const handleSalvarPdf = async (boleto) => {
    try {
      const html = await gerarHtmlBoleto(boleto);
      const { uri } = await Print.printToFileAsync({ html });

      const fileName = `boleto-${boleto.parcela || 'sem-parcela'}-${Date.now()}.pdf`;
      const destino = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.copyAsync({ from: uri, to: destino });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(destino, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
        });
      }

      Alert.alert('PDF salvo', 'O arquivo foi salvo com sucesso.');
    } catch (error) {
      console.error('Erro ao salvar PDF:', error);
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    }
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
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Carregando boletos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.container}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorTitle}>Ops! Algo deu errado</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={carregarBoletos}>
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const boletosOrdenados = ordenarBoletos([...boletos]);

  return (
    <SafeAreaView style={styles.safeContainer}>
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

      {isContratoEmpresarial && (
        <View style={styles.empresarialInfo}>
          <Ionicons name="information-circle-outline" size={20} color="#0A7AFF" />
          <Text style={styles.empresarialInfoText}>
            Para contratos empresariais é necessário entrar em contato com o responsável financeiro do plano. Caso seja o responsável, busque o boleto pelo número de atendimento da operadora ou pelo site amacorplanosdesaude.com.br.
          </Text>
        </View>
      )}

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
                        <Text style={styles.infoValue} selectable>{boleto.contrato || '-'}</Text>
                        <TouchableOpacity onPress={() => copiarParaAreaTransferencia(boleto.contrato)}>
                          <Ionicons name="copy-outline" size={16} color="#8E8E93" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Responsável</Text>
                      <Text style={styles.infoValue} numberOfLines={2}>
                        {boleto.nomeResponsavel || '-'}
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
                  <View style={styles.codigoBarrasContainer}>
                    <Text style={styles.codigoBarrasLabel}>Código de barras</Text>
                    <View style={styles.codigoBarrasRow}>
                      <Text style={styles.codigoBarrasValue} selectable>
                        {boleto.codigoBarras || '-'}
                      </Text>
                      <TouchableOpacity onPress={() => copiarParaAreaTransferencia(boleto.codigoBarras)}>
                        <Ionicons name="copy-outline" size={16} color="#8E8E93" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.secondaryActions}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => handleSalvarPdf(boleto)}>
                      <Ionicons name="share-outline" size={18} color="#007AFF" />
                      <Text style={styles.secondaryButtonText}>Compartilhar</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => handleSalvarPdf(boleto)}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
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
  empresarialInfo: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#E8F1FF",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  empresarialInfoText: {
    flex: 1,
    fontSize: 12,
    color: "#0A3D91",
    lineHeight: 16,
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
  codigoBarrasContainer: {
    backgroundColor: "#F2F2F7",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  codigoBarrasLabel: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 6,
  },
  codigoBarrasRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  codigoBarrasValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1C1C1E",
    flex: 1,
    marginRight: 8,
    flexWrap: "wrap",
    flexShrink: 1,
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