import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Base de dados de carências
const CARENCIAS_DATA = [
  {
    id: 1,
    dias: 0,
    titulo: 'Atendimento de Urgência e Emergência',
    descricao: 'Decorrente de acidente pessoal. Telemedicina',
    periodo: '24 Horas',
    exames: [],
    ativo: true,
  },
  {
    id: 2,
    dias: 7,
    titulo: 'Consultas Médicas Eletivas',
    periodo: '7 Dias',
    exames: [],
    ativo: false,
  },
  {
    id: 3,
    dias: 30,
    titulo: 'Procedimentos Auxiliares Ambulatoriais',
    descricao: 'Imobilizações, Engessamentos, Drenagem, Suturas',
    periodo: '30 Dias',
    exames: [
      {
        nome: 'Exames de Laboratório Simples',
        descricao: 'Exceto os classificados como Alta Complexidade (Cargas Virais para Hepatite, Marcadores Tumorais, HIV, Genotipagem Virais, Exames de Genética)',
      },
      {
        nome: 'Tonometria',
        descricao: 'Medição da pressão intraocular',
      },
      {
        nome: 'Eletrocardiografia Convencional (ECG)',
        descricao: 'Teste de função cardíaca',
      },
      {
        nome: 'Orientação e/ou remoção por ambulância',
        descricao: 'Somente para produtos com essa cobertura',
      },
    ],
    ativo: false,
  },
  {
    id: 4,
    dias: 60,
    titulo: 'Exames Complementares Ambulatoriais',
    periodo: '60 Dias',
    exames: [
      {
        nome: 'Eletroencefalografia Convencional (EEG)',
        descricao: 'Medição da atividade elétrica cerebral',
      },
      {
        nome: 'Raio X Simples',
        descricao: 'Radiografia convencional',
      },
      {
        nome: 'Colposcopia',
        descricao: 'Exame da região cervical',
      },
      {
        nome: 'Colpocitopatologia e Preventivo de Câncer Ginecológico',
        descricao: 'Exame preventivo',
      },
      {
        nome: 'Cerume remoção',
        descricao: 'Remoção de cerume do ouvido',
      },
    ],
    ativo: false,
  },
  {
    id: 5,
    dias: 120,
    titulo: 'Procedimentos Complementares Ambulatoriais',
    periodo: '120 Dias',
    exames: [
      {
        nome: 'Fisioterapia',
        descricao: 'Tratamento de reabilitação',
      },
      {
        nome: 'Pequenos Procedimentos Cirúrgicos Ambulatoriais',
        descricao: 'Realizados em consultório conforme ROL ANS',
      },
      {
        nome: 'Testes Alérgicos e Provas Imunoalérgicas',
        descricao: 'Identificação de alergias',
      },
      {
        nome: 'Ultrassonografia Convencional',
        descricao: 'Exame por ultrassom simples',
      },
      {
        nome: 'Audiometria',
        descricao: 'Teste de audição',
      },
      {
        nome: 'Raio X Contrastado',
        descricao: 'Radiografia com contraste',
      },
      {
        nome: 'Holter',
        descricao: 'Monitoramento de ritmo cardíaco 24h',
      },
      {
        nome: 'MAPA',
        descricao: 'Monitoramento de pressão arterial 24h',
      },
      {
        nome: 'Teste Ergométrico',
        descricao: 'Teste de esforço cardíaco',
      },
      {
        nome: 'Neurofisiologia',
        descricao: 'Eletroneuromiografia e Potenciais Evocados',
      },
      {
        nome: 'Prova de Função Respiratória',
        descricao: 'Espirometria',
      },
    ],
    ativo: false,
  },
  {
    id: 6,
    dias: 180,
    titulo: 'Exames/Tratamentos Especiais de Alta Complexidade Ambulatoriais',
    periodo: '180 Dias',
    exames: [
      {
        nome: 'Cirurgia Oftalmológica Ambulatorial',
        descricao: 'Procedimentos oftalmológicos',
      },
      {
        nome: 'Exames Oftalmológicos',
        descricao: 'Avaliação oftalmológica completa',
      },
      {
        nome: 'Video Endoscopia Digestiva',
        descricao: 'Com ou sem biópsia',
      },
      {
        nome: 'Exames de Anatomopatologia',
        descricao: 'Análise patológica',
      },
      {
        nome: 'Ressonância Magnética',
        descricao: 'Exame de imagem avançado',
      },
      {
        nome: 'Tomografia Computadorizada',
        descricao: 'Exame de imagem avançado',
      },
      {
        nome: 'Densitometria Óssea',
        descricao: 'Avaliação da densidade óssea',
      },
      {
        nome: 'Mamografia Digital ou Convencional',
        descricao: 'Exame de mama',
      },
      {
        nome: 'Ultrassonografia Color com Doppler',
        descricao: 'Ultrassom avançado',
      },
      {
        nome: 'Elastografia Hepática',
        descricao: 'Avaliação do fígado',
      },
      {
        nome: 'Cintilografia',
        descricao: 'Exame com radioisótopo',
      },
      {
        nome: 'Eletroencefalograma com Mapeamento Cerebral',
        descricao: 'EEG avançado',
      },
      {
        nome: 'Psicoterapia',
        descricao: 'Sessões de terapia (quantidade por ano)',
      },
      {
        nome: 'Colonoscopia',
        descricao: 'Exame do cólon',
      },
      {
        nome: 'Urodinâmica Completa',
        descricao: 'Avaliação do trato urinário',
      },
      {
        nome: 'Angiofluoresceinografia',
        descricao: 'Exame oftalmológico avançado',
      },
      {
        nome: 'Retossigmoidoscopia',
        descricao: 'Exame do reto e sigmóide',
      },
      {
        nome: 'Broncoscopia',
        descricao: 'Exame das vias respiratórias',
      },
      {
        nome: 'Nasofaringoscopia',
        descricao: 'Exame da nasofaringe',
      },
      {
        nome: 'Ecocolordoppler',
        descricao: 'Ultrassom com Doppler',
      },
      {
        nome: 'Ecocardiograma de Stress',
        descricao: 'Ecocardiografia com esforço',
      },
      {
        nome: 'Videoendoscopia Diagnóstica em Otorrinolaringologia',
        descricao: 'Exame de garganta e nariz com vídeo',
      },
    ],
    ativo: false,
  },
];

function calcularDiasDecorridos(dataCadastro) {
  if (!dataCadastro) return 0;

  // Assume formato dd/mm/aaaa ou timestamp
  let dataEntrada;
  if (typeof dataCadastro === 'string' && dataCadastro.includes('/')) {
    const [dia, mes, ano] = dataCadastro.split('/');
    dataEntrada = new Date(ano, mes - 1, dia);
  } else {
    dataEntrada = new Date(dataCadastro);
  }

  const hoje = new Date();
  const diferenca = hoje.getTime() - dataEntrada.getTime();
  return Math.floor(diferenca / (1000 * 60 * 60 * 24));
}

function determinarCarenciasAtentas(diasDecorridos) {
  return CARENCIAS_DATA.map((carencia) => ({
    ...carencia,
    ativo: diasDecorridos >= carencia.dias,
  }));
}

function CarenciaItem({ carencia, onPress, diasDecorridos }) {
  const diasAteCarencia = carencia.dias - diasDecorridos;
  const carenciaAtiva = carencia.ativo;

  return (
    <TouchableOpacity
      style={[
        styles.carenciaCard,
        carenciaAtiva && styles.carenciaCardAtiva,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.carenciaHeader}>
        <View style={styles.carenciaTitleContainer}>
          <MaterialCommunityIcons
            name={
              carenciaAtiva ? 'check-circle' : 'clock-outline'
            }
            size={24}
            color={carenciaAtiva ? '#4CAF50' : '#FFA500'}
          />
          <View style={styles.carenciaTextContainer}>
            <Text style={styles.carenciaTitle}>{carencia.titulo}</Text>
            <Text style={styles.carenciaPeriodo}>{carencia.periodo}</Text>
          </View>
        </View>
        {!carenciaAtiva && (
          <View style={styles.diasRestantesContainer}>
            <Text style={styles.diasRestantes}>
              {diasAteCarencia > 0 ? `${diasAteCarencia}d` : 'Hoje'}
            </Text>
          </View>
        )}
      </View>

      {carencia.descricao && (
        <Text style={styles.carenciaDescricao}>
          {carencia.descricao}
        </Text>
      )}

      {carencia.exames.length > 0 && (
        <View style={styles.examesPreviewContainer}>
          <Text style={styles.examesLabel}>
            {carencia.exames.length} exame(s) e procedimento(s)
          </Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color="#999"
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

function DetalhesCarenciaModal({ carencia, onClose, diasDecorridos }) {
  if (!carencia) return null;

  return (
    <View style={styles.modalBackground}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{carencia.titulo}</Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialCommunityIcons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody}>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusBadge,
                carencia.ativo && styles.statusBadgeAtiva,
              ]}
            >
              <MaterialCommunityIcons
                name={carencia.ativo ? 'check-circle' : 'clock-outline'}
                size={16}
                color="white"
              />
              <Text style={styles.statusText}>
                {carencia.ativo ? 'Liberado' : 'Pendente'}
              </Text>
            </View>
            <Text style={styles.periodoBig}>{carencia.periodo}</Text>
          </View>

          {carencia.descricao && (
            <View style={styles.descricaoContainer}>
              <Text style={styles.descricaoLabel}>Descrição:</Text>
              <Text style={styles.descricaoText}>
                {carencia.descricao}
              </Text>
            </View>
          )}

          {carencia.exames.length > 0 && (
            <View style={styles.examesContainer}>
              <Text style={styles.examesTitle}>
                Exames e Procedimentos:
              </Text>
              {carencia.exames.map((exame, index) => (
                <View key={index} style={styles.exameItem}>
                  <View style={styles.exameNumberBadge}>
                    <Text style={styles.exameNumber}>{index + 1}</Text>
                  </View>
                  <View style={styles.exameTextContainer}>
                    <Text style={styles.exameName}>{exame.nome}</Text>
                    <Text style={styles.exameDescricao}>
                      {exame.descricao}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.observacaoText}>
            * Exceto para os casos de lesões e doenças preexistentes.
            Demais exames - Consultar o ROL ANS
          </Text>
        </ScrollView>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
        >
          <Text style={styles.closeButtonText}>Fechar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CarenciasScreen() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [carencias, setCarencias] = useState([]);
  const [selectedCarencia, setSelectedCarencia] = useState(null);
  const [diasDecorridos, setDiasDecorridos] = useState(0);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        const storedUserData = await AsyncStorage.getItem('userData');

        if (storedUserData) {
          const data = JSON.parse(storedUserData);
          setUserData(data);

          // Calcular dias decorridos desde a entrada (dMatriculaUSR formato dd/mm/aaaa)
          const dias = calcularDiasDecorridos(data.dMatriculaUSR);
          setDiasDecorridos(dias);

          // Determinar quais carências estão ativas
          const carenciasAtentas =
            determinarCarenciasAtentas(dias);
          setCarencias(carenciasAtentas);
        } else {
          Alert.alert('Erro', 'Dados do usuário não encontrados');
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        Alert.alert('Erro', 'Erro ao carregar informações de carência');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E90FF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="hospital-box"
            size={32}
            color="#1E90FF"
          />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Carências do Plano</Text>
            <Text style={styles.headerSubtitle}>
              {diasDecorridos} dia(s) após entrada no plano
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <MaterialCommunityIcons
            name="information"
            size={20}
            color="#1E90FF"
          />
          <Text style={styles.infoText}>
            Toque em cada carência para ver os exames e procedimentos detalhados
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Carências Ativas</Text>
        {carencias
          .filter((c) => c.ativo)
          .map((carencia) => (
            <CarenciaItem
              key={carencia.id}
              carencia={carencia}
              onPress={() => setSelectedCarencia(carencia)}
              diasDecorridos={diasDecorridos}
            />
          ))}

        {carencias.filter((c) => c.ativo).length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="calendar-check"
              size={48}
              color="#4CAF50"
            />
            <Text style={styles.emptyStateText}>
              Nenhuma carência ativa no momento
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Próximas Carências</Text>
        {carencias
          .filter((c) => !c.ativo)
          .map((carencia) => (
            <CarenciaItem
              key={carencia.id}
              carencia={carencia}
              onPress={() => setSelectedCarencia(carencia)}
              diasDecorridos={diasDecorridos}
            />
          ))}

        <View style={styles.footer}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={20}
            color="#FF6B6B"
          />
          <Text style={styles.footerText}>
            As informações de carência podem variar conforme o plano. Consulte a ANS para detalhes completos.
          </Text>
        </View>
      </ScrollView>

      {selectedCarencia && (
        <DetalhesCarenciaModal
          carencia={selectedCarencia}
          onClose={() => setSelectedCarencia(null)}
          diasDecorridos={diasDecorridos}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  headerText: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 8,
    flex: 1,
    fontSize: 12,
    color: '#1565C0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  carenciaCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  carenciaCardAtiva: {
    borderLeftColor: '#4CAF50',
    backgroundColor: '#F1F8F4',
  },
  carenciaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  carenciaTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  carenciaTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  carenciaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  carenciaPeriodo: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  diasRestantesContainer: {
    backgroundColor: '#FFF0E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  diasRestantes: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF8C00',
  },
  carenciaDescricao: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginLeft: 36,
  },
  examesPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginLeft: 36,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
  },
  examesLabel: {
    fontSize: 12,
    color: '#1E90FF',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F5',
    marginHorizontal: 16,
    marginTop: 20,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'flex-start',
  },
  footerText: {
    marginLeft: 8,
    flex: 1,
    fontSize: 12,
    color: '#C62828',
  },

  // Estilos do Modal
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    backgroundColor: '#FFE0B2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    marginRight: 12,
  },
  statusBadgeAtiva: {
    backgroundColor: '#C8E6C9',
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  periodoBig: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  descricaoContainer: {
    marginBottom: 16,
  },
  descricaoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
  },
  descricaoText: {
    fontSize: 14,
    color: '#555',
    marginTop: 6,
  },
  examesContainer: {
    marginBottom: 20,
  },
  examesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  exameItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  exameNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E90FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exameNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  exameTextContainer: {
    flex: 1,
  },
  exameName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  exameDescricao: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  observacaoText: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 20,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
  },
  closeButton: {
    backgroundColor: '#1E90FF',
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
