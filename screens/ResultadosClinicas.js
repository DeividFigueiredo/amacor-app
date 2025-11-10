import React from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Linking, 
  StyleSheet,
  Platform 
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';

export default function ResultadosClinicas() {
  const route = useRoute();
  const navigation = useNavigation();
  const { especialidade, clinicas } = route.params || { especialidade: '', clinicas: [] };

  const abrirNoMapa = (endereco) => {
    const query = encodeURIComponent(endereco);
    const url = Platform.select({
      ios: `maps://app?daddr=${query}`,
      android: `geo:0,0?q=${query}`,
    });
    Linking.openURL(url);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.nome}>{item.nome}</Text>
        <Text style={styles.telefone}>{item.telefone}</Text>
      </View>

      <Text style={styles.endereco}>{item.endereco}</Text>

      <TouchableOpacity
        style={styles.botaoMapa}
        onPress={() => abrirNoMapa(item.endereco)}
      >
        <Text style={styles.textoBotao}>📍 Ver no mapa</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Clínicas de {especialidade}
      </Text>

      {clinicas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Nenhuma clínica encontrada.</Text>
        </View>
      ) : (
        <FlatList
          data={clinicas}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E76B8',
    marginBottom: 16,
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 80,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 8,
  },
  nome: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E76B8',
  },
  telefone: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  endereco: {
    fontSize: 15,
    color: '#2c3e50',
    marginTop: 4,
    lineHeight: 20,
  },
  botaoMapa: {
    marginTop: 12,
    backgroundColor: '#2E76B8',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  textoBotao: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontStyle: 'italic',
  },
  voltarButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#2E76B8',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  voltarButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
