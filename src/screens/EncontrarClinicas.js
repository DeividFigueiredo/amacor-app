import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Text, 
  SafeAreaView, 
  StatusBar, 
  Alert,
  ActivityIndicator,
  FlatList,
  Image 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { getLocationAsync } from '../utils/utils';
import { getEverflowUrl } from '../mantis/config';

export default function EncontrarClinicas({ navigation, route }) {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [clinicas, setClinicas] = useState([]);
  const [loadingClinicas, setLoadingClinicas] = useState(false);

  // Função para obter localização
  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // Delega a lógica de permissão e leitura ao utilitário compartilhado
      const newLocation = await getLocationAsync(setLocation, setErrorMsg, setLoading);

      if (newLocation && newLocation.latitude && newLocation.longitude) {
        // Se quiser garantir que o estado esteja atualizado
        setLocation(newLocation);
        // Enviar para API e buscar clínicas
        await fetchClinicasProximas(newLocation.latitude, newLocation.longitude);
      }
    } catch (error) {
      console.error('Erro na localização:', error);
      setErrorMsg('Erro ao obter localização');
      Alert.alert('Erro', 'Não foi possível obter a localização.');
    } finally {
      setLoading(false);
    }
  };

  // Função para buscar clínicas na API
  
  // Iniciar busca ao abrir a tela
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Função para renderizar cada clínica
  const renderClinica = ({ item }) => (
    <TouchableOpacity 
      style={styles.clinicaCard}
      onPress={() => {
        // Navegar para detalhes da clínica se necessário
        // navigation.navigate('DetalhesClinica', { clinica: item });
      }}
    >
      <View style={styles.clinicaInfo}>
        <Text style={styles.clinicaNome}>{item.nome}</Text>
        <Text style={styles.clinicaEndereco}>
          {item.endereco}, {item.numero} - {item.bairro}
        </Text>
        
        {item.distancia && (
          <View style={styles.distanciaContainer}>
            <Ionicons name="locate" size={14} color="#666" />
            <Text style={styles.distanciaText}>
              {item.distancia < 1 
                ? `${(item.distancia * 1000).toFixed(0)} m` 
                : `${item.distancia.toFixed(1)} km`}
            </Text>
          </View>
        )}
        
        {item.telefone && (
          <View style={styles.contatoContainer}>
            <Ionicons name="call" size={14} color="#666" />
            <Text style={styles.contatoText}>{item.telefone}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.clinicaActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="navigate" size={20} color="#4A90E2" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="call" size={20} color="#4CAF50" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // Função para buscar clínicas próximas usando o endpoint padrão do servidor
  const fetchClinicasProximas = async (latitude, longitude) => {
    try {
      setLoadingClinicas(true);
      setClinicas([]);

      const url = getEverflowUrl();
      // endpoint: ajuste se necessário no servidor
      const endpoint = '/clinicas_proximas';

      const response = await fetch(url + endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude,
          longitude,
          raio: 10,
          limite: 20,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data && Array.isArray(data.clinicas)) {
        setClinicas(data.clinicas);
      } else if (Array.isArray(data)) {
        setClinicas(data);
      } else {
        console.warn('Formato de resposta inesperado:', data);
        Alert.alert('Atenção', 'Nenhuma clínica encontrada na sua região.');
      }
    } catch (error) {
      console.error('Erro ao buscar clínicas:', error);
      Alert.alert('Erro', 'Nao foi possivel concluir a solicitacao. Tente novamente.');
    } finally {
      setLoadingClinicas(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* Cabeçalho */}
      

      {/* Status da Localização */}
      <View style={styles.locationStatus}>
        {loading ? (
          <View style={styles.statusContent}>
            <ActivityIndicator size="small" color="#4A90E2" />
            <Text style={styles.statusText}>Obtendo sua localização...</Text>
          </View>
        ) : errorMsg ? (
          <View style={styles.statusContent}>
            <Ionicons name="warning" size={20} color="#FF6B6B" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : location ? (
          <View style={styles.statusContent}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.successText}>
              Localização encontrada • 
              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Lista de Clínicas ou Estado Vazio */}
      <View style={styles.content}>
        {loadingClinicas ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Buscando clínicas próximas...</Text>
          </View>
        ) : clinicas.length > 0 ? (
          <>
            <View style={styles.resultHeader}>
              <Text style={styles.resultCount}>
                {clinicas.length} clínica{clinicas.length !== 1 ? 's' : ''} encontrada{clinicas.length !== 1 ? 's' : ''}
              </Text>
              <Text style={styles.resultSubtitle}>Ordenado por proximidade</Text>
            </View>
            
            <FlatList
              data={clinicas}
              renderItem={renderClinica}
              keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="medical" size={80} color="#E0E0E0" />
            <Text style={styles.emptyTitle}>Nenhuma clínica encontrada</Text>
            <Text style={styles.emptyText}>
              Não encontramos clínicas próximas à sua localização atual.
            </Text>
            <TouchableOpacity 
              style={styles.tryAgainButton}
              onPress={getCurrentLocation}
            >
              <Text style={styles.tryAgainText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Botão flutuante para atualizar */}
      {clinicas.length > 0 && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={getCurrentLocation}
          disabled={loading}
        >
          <Ionicons 
            name="locate" 
            size={24} 
            color="#FFF" 
          />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  refreshButton: {
    padding: 4,
  },
  locationStatus: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#FF6B6B',
    marginLeft: 8,
  },
  successText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  resultHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  resultCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  resultSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  listContent: {
    padding: 16,
  },
  clinicaCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  clinicaInfo: {
    flex: 1,
  },
  clinicaNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  clinicaEndereco: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  distanciaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  distanciaText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  contatoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contatoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  clinicaActions: {
    flexDirection: 'row',
    marginLeft: 12,
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  tryAgainButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4A90E2',
    borderRadius: 20,
  },
  tryAgainText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#4A90E2',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});