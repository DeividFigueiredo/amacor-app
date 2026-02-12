import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator, Alert, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buscarAutorizacoes } from '../mantis/everflowConex';
import { gerarChave } from '../mantis/crypto';

export default function AcompanharAutorizacoesScreen({ navigation }) {
    const [autorizacoes, setAutorizacoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        carregarAutorizacoes();
    }, []);

    const carregarAutorizacoes = async () => {
        try {
            setLoading(true);
            
            // Buscar dados do usuário
            const storedUserData = await AsyncStorage.getItem('userData');
            if (!storedUserData) {
                Alert.alert('Erro', 'Dados do usuário não encontrados');
                return;
            }

            const user = JSON.parse(storedUserData);
            setUserData(user);

            const token = gerarChave(user.sCpfUSR, user.dNascimento);

            // Buscar autorizações
            const resultado = await buscarAutorizacoes(
                '/buscar-autorizacoes',
                user.sCpfUSR,
                token
            );

            if (resultado && Array.isArray(resultado.autorizacoes)) {
                setAutorizacoes(resultado.autorizacoes);
            } else if (Array.isArray(resultado)) {
                setAutorizacoes(resultado);
            } else {
                setAutorizacoes([]);
            }

        } catch (error) {
            console.error('Erro ao carregar autorizações:', error);
            Alert.alert('Erro', 'Não foi possível carregar as autorizações');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await carregarAutorizacoes();
        setRefreshing(false);
    };

    const getStatusIcon = (status) => {
        switch (status?.toLowerCase()) {
            case 'aprovado':
            case 'autorizado':
                return { name: 'checkmark-circle', color: '#4CAF50' };
            case 'pendente':
            case 'em análise':
                return { name: 'time', color: '#FF9800' };
            case 'negado':
            case 'recusado':
                return { name: 'close-circle', color: '#F44336' };
            default:
                return { name: 'help-circle', color: '#9E9E9E' };
        }
    };

    const formatarData = (dataString) => {
        try {
            if (!dataString) return 'Data não disponível';
            
            // Se já estiver no formato DD/MM/YYYY
            if (dataString.includes('/')) {
                return dataString;
            }
            
            // Se for ISO ou timestamp
            const data = new Date(dataString);
            if (isNaN(data.getTime())) return dataString;
            
            const dia = data.getDate().toString().padStart(2, '0');
            const mes = (data.getMonth() + 1).toString().padStart(2, '0');
            const ano = data.getFullYear();
            const hora = data.getHours().toString().padStart(2, '0');
            const min = data.getMinutes().toString().padStart(2, '0');
            
            return `${dia}/${mes}/${ano} ${hora}:${min}`;
        } catch (error) {
            return dataString || 'Data não disponível';
        }
    };

    const renderAutorizacao = ({ item }) => {
        const statusIcon = getStatusIcon(item.status);
        
        return (
            <TouchableOpacity 
                style={styles.card}
                onPress={() => {
                    // Pode abrir um modal ou tela com mais detalhes
                    Alert.alert(
                        'Detalhes da Autorização',
                        `Exame: ${item.nomeExame}\n` +
                        `Status: ${item.status || 'Pendente'}\n` +
                        `Data: ${formatarData(item.dataSolicitacao || item.timestamp)}\n` +
                        `${item.observacao ? `Observação: ${item.observacao}` : ''}`
                    );
                }}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.statusContainer}>
                        <Ionicons name={statusIcon.name} size={24} color={statusIcon.color} />
                        <Text style={[styles.status, { color: statusIcon.color }]}>
                            {item.status || 'Pendente'}
                        </Text>
                    </View>
                    <Text style={styles.data}>
                        {formatarData(item.dataSolicitacao || item.timestamp)}
                    </Text>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <Ionicons name="medical" size={18} color="#2E76B8" />
                        <Text style={styles.nomeExame}>{item.nomeExame || 'Exame não especificado'}</Text>
                    </View>

                    {item.protocolo && (
                        <View style={styles.infoRow}>
                            <Ionicons name="document-text" size={18} color="#666" />
                            <Text style={styles.protocolo}>Protocolo: {item.protocolo}</Text>
                        </View>
                    )}

                    {item.observacao && (
                        <View style={styles.observacaoContainer}>
                            <Text style={styles.observacao}>{item.observacao}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={80} color="#CCC" />
            <Text style={styles.emptyText}>Nenhuma autorização encontrada</Text>
            <Text style={styles.emptySubtext}>
                Suas solicitações de autorização aparecerão aqui
            </Text>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2E76B8" />
                    <Text style={styles.loadingText}>Carregando autorizações...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Minhas Autorizações</Text>
                <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
                    <Ionicons 
                        name="refresh" 
                        size={24} 
                        color="#2E76B8"
                        style={refreshing && { opacity: 0.5 }}
                    />
                </TouchableOpacity>
            </View>

            <FlatList
                data={autorizacoes}
                renderItem={renderAutorizacao}
                keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={renderEmpty}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#2E76B8']}
                        tintColor="#2E76B8"
                    />
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2E76B8',
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
    listContainer: {
        padding: 16,
        paddingBottom: 24,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    status: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    data: {
        fontSize: 12,
        color: '#999',
    },
    cardBody: {
        gap: 8,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    nomeExame: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    protocolo: {
        fontSize: 14,
        color: '#666',
    },
    observacaoContainer: {
        marginTop: 8,
        padding: 10,
        backgroundColor: '#F9F9F9',
        borderRadius: 8,
    },
    observacao: {
        fontSize: 13,
        color: '#666',
        fontStyle: 'italic',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#999',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#BBB',
        marginTop: 8,
        textAlign: 'center',
    },
});
