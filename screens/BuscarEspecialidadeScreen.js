import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Keyboard, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { buscarClinicas } from '../mantis/everflowConex';
import { gerarChave } from '../mantis/crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function BuscarEspecialidades({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSpecialties, setFilteredSpecialties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(true);
  
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setUserLoading(true);
        
        const storedUserData = await AsyncStorage.getItem('userData');
        if (storedUserData) {
          console.log('Carteirinha - Dados encontrados no AsyncStorage');
          const data = JSON.parse(storedUserData);
          setUserData(data);
        } else {
          Alert.alert('Erro', 'Dados não encontrados. Faça login novamente.');
        }
      } catch (err) {
        console.error('Carteirinha - Erro ao buscar dados:', err);
        Alert.alert('Erro', 'Erro ao carregar dados da carteirinha');
      } finally {
        setUserLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Lista de especialidades médicas de exemplo
  const specialties = [
    'Cardiologia',
    'Dermatologia',
    'Ortopedia',
    'Pediatria',
    'Ginecologia',
    'Oftalmologia',
    'Neurologia',
    'Psiquiatria',
    'Endocrinologia',
    'Gastroenterologia',
    'Urologia',
    'Oncologia',
    'Otorrinolaringologia',
    'Reumatologia',
    'Nefrologia',
    'Pneumologia',
    'Hematologia',
    'Alergologia',
    'Infectologia',
    'Mastologia',
    'Psicologia',
    'Nutrição',
  ];

  const handleSearch = (text) => {
    setSearchQuery(text);
    
    if (text === '') {
      setFilteredSpecialties([]);
    } else {
      const filtered = specialties.filter(specialty =>
        specialty.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredSpecialties(filtered);
    }
  };

  const handleSpecialtySelect = async (specialty) => {
    // Verificar se os dados do usuário já foram carregados
    if (!userData) {
      Alert.alert('Aguarde', 'Carregando dados do usuário...');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    try {
      const cpf = userData.sCpfUSR;
      const dataNascimento = userData.dNascimento;
      
      const token = gerarChave(cpf, dataNascimento);
      const endpoint = '/buscar_clinicas_ext';

      console.log(`🔍 Buscando clínicas para especialidade: ${specialty}`);
      console.log(`👤 Usuário: ${cpf}`);
      
      const clinicas = await buscarClinicas(endpoint, specialty, token);
      
      if (clinicas && clinicas.length > 0) {
        console.log(`🏥 ${clinicas.length} clínica(s) encontrada(s)`);
        
        // Navegar para a tela de resultados ou mostrar as clínicas
        navigation.navigate('ResultadosClinicas', { 
          especialidade: specialty,
          clinicas: clinicas 
        });
        
      } else {
        Alert.alert(
          'Nenhuma clínica encontrada',
          `Não encontramos clínicas com a especialidade: ${specialty}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('🚨 Erro ao buscar clínicas:', error);
      
      Alert.alert(
        'Erro na busca',
        `Não foi possível buscar clínicas para ${specialty}. Tente novamente.`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilteredSpecialties([]);
    Keyboard.dismiss();
  };

  const renderSpecialtyItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.specialtyItem,
        (loading || userLoading) && styles.disabledItem
      ]}
      onPress={() => handleSpecialtySelect(item)}
      disabled={loading || userLoading}
    >
      <Ionicons name="medical" size={20} color="#2E76B8" />
      <Text style={styles.specialtyText}>{item}</Text>
      <Ionicons name="chevron-forward" size={20} color="#95a5a6" />
    </TouchableOpacity>
  );

  // Se ainda estiver carregando os dados do usuário
  if (userLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E76B8" />
        <Text style={styles.loadingText}>Carregando dados...</Text>
      </View>
    );
  }

  // Se não encontrar dados do usuário
  if (!userData) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#e74c3c" />
        <Text style={styles.errorText}>Dados do usuário não encontrados</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.retryButtonText}>Fazer Login Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    
    
    <View style={styles.container}>
      <Text style={styles.title}>Buscar Especialidades</Text>
      
      {/* Barra de Pesquisa */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#95a5a6" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Digite o nome da especialidade..."
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#95a5a6" />
          </TouchableOpacity>
        )}
      </View>

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E76B8" />
          <Text style={styles.loadingText}>Buscando clínicas...</Text>
        </View>
      )}

      {/* Resultados da Busca */}
      <View style={styles.resultsContainer}>
        {searchQuery.length > 0 && !loading && (
          <Text style={styles.resultsTitle}>
            {filteredSpecialties.length > 0 
              ? `${filteredSpecialties.length} especialidade(s) encontrada(s)` 
              : 'Nenhuma especialidade encontrada'
            }
          </Text>
        )}

        {!loading && (
          <FlatList
            data={filteredSpecialties}
            renderItem={renderSpecialtyItem}
            keyExtractor={(item, index) => index.toString()}
            showsVerticalScrollIndicator={false}
            style={styles.list}
          />
        )}

        {/* Sugestões quando não há busca */}
        {searchQuery.length === 0 && !loading && (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>Especialidades populares</Text>
            <View style={styles.suggestionsGrid}>
              {specialties.slice(0, 6).map((specialty, index) => (
                <TouchableOpacity 
                  key={index}
                  style={styles.suggestionChip}
                  onPress={() => {
                    setSearchQuery(specialty);
                    handleSearch(specialty);
                  }}
                  disabled={userLoading}
                >
                  <Text style={styles.suggestionText}>{specialty}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 24,
    marginTop: 24,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
  },
  clearButton: {
    padding: 4,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsTitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  list: {
    flex: 1,
  },
  specialtyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  disabledItem: {
    opacity: 0.5,
  },
  specialtyText: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 12,
  },
  suggestionsContainer: {
    marginTop: 20,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  suggestionChip: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ecf0f1',
    minWidth: '48%',
  },
  suggestionText: {
    fontSize: 14,
    color: '#2E76B8',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#2E76B8',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#2E76B8',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

