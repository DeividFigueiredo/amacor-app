import React from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Linking, 
  StyleSheet,
  Platform,
  SafeAreaView,
  Alert
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';

export default function ResultadosClinicas() {
  const route = useRoute();
  const navigation = useNavigation();
  const { especialidade, clinicas } = route.params || { especialidade: '', clinicas: [] };

  const clinicasOrdenadas = React.useMemo(() => {
    if (!Array.isArray(clinicas) || clinicas.length === 0) {
      return [];
    }

    const indiceAmacor = clinicas.findIndex((clinica) => {
      const nome = String(clinica?.nome || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

      return nome.includes('amacor');
    });

    if (indiceAmacor <= 0) {
      return clinicas;
    }

    const lista = [...clinicas];
    const [amacor] = lista.splice(indiceAmacor, 1);
    lista.unshift(amacor);
    return lista;
  }, [clinicas]);

  const abrirNoMapa = (endereco) => {
    const query = encodeURIComponent(endereco);
    const url = Platform.select({
      ios: `maps://app?daddr=${query}`,
      android: `geo:0,0?q=${query}`,
    });
    Linking.openURL(url);
  };
  const normalizarTelefoneWhatsapp = (telefone) => {
    const numeros = String(telefone || '').replace(/\D/g, '');

    if (numeros.length === 10 || numeros.length === 11) {
      return `55${numeros}`;
    }

    if (numeros.length === 12 || numeros.length === 13) {
      return numeros;
    }

    return null;
  };

  const abrirNoWpp = async (telefone) => {
    const numeroWhatsapp = normalizarTelefoneWhatsapp(telefone);

    if (!numeroWhatsapp) {
      Alert.alert(
        'WhatsApp indisponível',
        'Esta clínica não possui número no padrão do WhatsApp. Use o telefone exibido para contato manual.'
      );
      return;
    }

    const url = `https://wa.me/${numeroWhatsapp}`;
    Linking.openURL(url);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.nome}>{item.nome}</Text>
        <View style={styles.telefoneWrapper}>
          <View style={styles.telefoneRow}>
            <Text style={styles.telefone} selectable>
              {item.telefone}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.endereco}>{item.endereco}</Text>

      <TouchableOpacity
        style={styles.botaoMapa}
        onPress={() => abrirNoWpp(item.telefone)}
      >
        <Text style={styles.textoBotao}>📞 Agendar Consulta</Text>
      </TouchableOpacity>

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

      {clinicasOrdenadas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Nenhuma clínica encontrada.</Text>
        </View>
      ) : (
        <FlatList
          data={clinicasOrdenadas}
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
    fontSize: 17,
    color: '#2c3e50',
    marginTop: 0,
    fontWeight: '600',
  },
  telefoneWrapper: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#d9e2ec',
    borderRadius: 10,
    backgroundColor: '#f5f9ff',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  telefoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
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
