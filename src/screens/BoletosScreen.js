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
    const escapeHtml = (valor) => String(valor ?? '-')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const formatarValorBoleto = (valor) => {
      if (valor === undefined || valor === null || valor === '') return '0,00';
      const numero = parseFloat(String(valor).replace(/\./g, '').replace(',', '.'));
      if (Number.isNaN(numero)) return '0,00';
      return numero.toFixed(2).replace('.', ',');
    };

    const quebrarLinhas = (texto) => escapeHtml(texto).replace(/\r\n|\r|\n/g, '<br/>');

    const contrato = detalhes.sNumeroCNT || boleto.contrato || '-';
    const valorBoleto = formatarValorBoleto(detalhes.cTotalAPagar || boleto.mensalidade);
    const vencimento = formatarData(detalhes.dVencimento || boleto.vencimento);
    const dataDocumento = formatarData(detalhes.dDocumento || detalhes.dEmissao || new Date().toLocaleDateString('pt-BR'));
    const parcela = detalhes.sParcela || boleto.parcela || '-';
    const nossoNumero = detalhes.sNossoNumero || detalhes.sNossoNumero_Boleto || '-';
    const documento = detalhes.sNumDoc || detalhes.sDocumento || detalhes.sCodigoREC || parcela;
    const agencia = detalhes.sAgencia || '-';
    const contaCorrente = detalhes.sContaCorrente || '-';
    const conta = contaCorrente.length > 1 ? contaCorrente.slice(0, -1) : contaCorrente;
    const contaDv = contaCorrente.length > 1 ? contaCorrente.slice(-1) : '-';
    const carteira = detalhes.sCarteira || '-';
    const razaoSocial = detalhes.sRazaoSocial || 'MH VIDA OPERADORA DE PLANOS DE SAUDE LTDA';
    const cedente = detalhes.sCedente || 'AMACOR Planos de Saude';
    const sacado = detalhes.sAssociado || detalhes.sNomeTIT || boleto.nomeResponsavel || '-';
    const cpfCgc = detalhes.sCgcCpf || detalhes.sCpfCgc || '-';
    const enderecoLinha1 = [detalhes.sSacadoEnd1, detalhes.sSacadoEnd2, detalhes.sSacadoEnd3]
      .filter(Boolean)
      .join(' - ') || '-';
    const enderecoLinha2 = [detalhes.sCidade, detalhes.sEstado, detalhes.sCep]
      .filter(Boolean)
      .join(' - ') || '-';
    const instrucoes = detalhes.mInstrucoes || '-';
    const ipte = detalhes.sIPTE || boleto.codigoBarras || '-';
    const codigoBarras = detalhes.sCodigoBarras || boleto.codigoBarras || ipte;
    const localPagamento = detalhes.sAvisoLocalPagamento1 || 'Pagavel preferencialmente na rede bancaria ate o vencimento';
    const codigoBanco = detalhes.sCodigoBancoCompleto || detalhes.sCodigoBanco || '341-7';

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
      const barcodeText = codigoBarras && codigoBarras !== '-' ? codigoBarras : ipte;
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
            body { font-family: Arial, sans-serif; color: #000; margin: 18px; }
            .boleto { border: 1px solid #000; }
            .topo { display: grid; grid-template-columns: 52px 78px 1fr; align-items: center; border-bottom: 2px solid #000; }
            .logo-box { border-right: 1px solid #000; text-align: center; padding: 4px; }
            .logo { width: 38px; height: 38px; object-fit: contain; }
            .codigo-banco { border-right: 1px solid #000; text-align: center; font-size: 22px; font-weight: 700; }
            .linha-digitavel { font-size: 14px; font-weight: 700; text-align: right; padding-right: 8px; letter-spacing: 0.4px; }
            .bloco { border-top: 1px solid #000; }
            .linha-3 { display: grid; grid-template-columns: 2fr 1fr 1fr; }
            .linha-2 { display: grid; grid-template-columns: 2fr 1fr; }
            .linha-1 { display: grid; grid-template-columns: 1fr; }
            .celula { border-right: 1px solid #000; padding: 4px 6px; min-height: 38px; }
            .celula:last-child { border-right: none; }
            .rotulo { font-size: 9px; text-transform: uppercase; }
            .valor { font-size: 12px; font-weight: 700; margin-top: 3px; word-break: break-word; }
            .menor { font-size: 11px; font-weight: 600; }
            .assinatura { margin-top: 12px; font-size: 11px; }
            .codigo-barras-area { border-top: 2px solid #000; text-align: center; padding: 8px 6px; }
            .codigo-barras-texto { font-size: 13px; font-weight: 700; letter-spacing: 1.2px; }
            .barcode-img { width: 390px; height: 70px; object-fit: contain; display: block; margin: 4px auto 0; }
          </style>
        </head>
        <body>
          <div class="boleto">
            <div class="topo">
              <div class="logo-box">${logoBase64 ? `<img class="logo" src="data:image/png;base64,${logoBase64}" />` : ''}</div>
              <div class="codigo-banco">${escapeHtml(codigoBanco)}</div>
              <div class="linha-digitavel">${escapeHtml(ipte)}</div>
            </div>

            <div class="bloco linha-3">
              <div class="celula">
                <div class="rotulo">Cedente</div>
                <div class="valor">${escapeHtml(cedente)}</div>
              </div>
              <div class="celula">
                <div class="rotulo">Agencia / Codigo Cedente</div>
                <div class="valor">${escapeHtml(agencia)} / ${escapeHtml(conta)}-${escapeHtml(contaDv)}</div>
              </div>
              <div class="celula">
                <div class="rotulo">Vencimento</div>
                <div class="valor">${escapeHtml(vencimento)}</div>
              </div>
            </div>

            <div class="bloco linha-3">
              <div class="celula">
                <div class="rotulo">Sacado</div>
                <div class="valor">${escapeHtml(sacado)}</div>
                <div class="menor">CPF/CNPJ: ${escapeHtml(cpfCgc)}</div>
              </div>
              <div class="celula">
                <div class="rotulo">Nosso Numero</div>
                <div class="valor">${escapeHtml(nossoNumero)}</div>
              </div>
              <div class="celula">
                <div class="rotulo">Numero do Documento</div>
                <div class="valor">${escapeHtml(documento)}</div>
              </div>
            </div>

            <div class="bloco linha-2">
              <div class="celula">
                <div class="rotulo">Endereco do Sacado</div>
                <div class="valor">${escapeHtml(enderecoLinha1)}</div>
                <div class="menor">${escapeHtml(enderecoLinha2)}</div>
              </div>
              <div class="celula">
                <div class="rotulo">Data do Documento</div>
                <div class="valor">${escapeHtml(dataDocumento)}</div>
              </div>
            </div>

            <div class="bloco linha-3">
              <div class="celula">
                <div class="rotulo">Local de Pagamento</div>
                <div class="valor">${escapeHtml(localPagamento)}</div>
              </div>
              <div class="celula">
                <div class="rotulo">Carteira</div>
                <div class="valor">${escapeHtml(carteira)}</div>
              </div>
              <div class="celula">
                <div class="rotulo">Valor do Documento</div>
                <div class="valor">R$ ${escapeHtml(valorBoleto)}</div>
              </div>
            </div>

            <div class="bloco linha-1">
              <div class="celula">
                <div class="rotulo">Instrucoes</div>
                <div class="valor">${quebrarLinhas(instrucoes)}</div>
              </div>
            </div>

            <div class="bloco linha-3">
              <div class="celula">
                <div class="rotulo">Razao Social</div>
                <div class="valor">${escapeHtml(razaoSocial)}</div>
              </div>
              <div class="celula">
                <div class="rotulo">Contrato</div>
                <div class="valor">${escapeHtml(contrato)}</div>
              </div>
              <div class="celula">
                <div class="rotulo">Parcela</div>
                <div class="valor">${escapeHtml(parcela)}</div>
              </div>
            </div>

            <div class="codigo-barras-area">
              ${barcodeBase64 ? `<img class="barcode-img" src="data:image/png;base64,${barcodeBase64}" />` : ''}
              <div class="codigo-barras-texto">${escapeHtml(codigoBarras)}</div>
            </div>
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