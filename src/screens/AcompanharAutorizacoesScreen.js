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
                '/buscar_autorizacoes',
                user.sCodigoUSR,
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
        const statusLower = status?.toLowerCase();
        switch (statusLower) {
            case 'em analise':
            case 'em ana':
                return { name: 'time', color: '#4accff' };
            case 'aprovado':
            case 'autorizado':
            case 'aprov':
                return { name: 'checkmark-circle', color: '#4CAF50' };
            case 'pendente':           
            case 'pend':
                return { name: 'time', color: '#FF9800' };
            case 'rejeitado':
            case 'recusado':
            case 'rej':
            case 'Rejeitado':
                return { name: 'close-circle', color: '#F44336' };
            default:
                return { name: 'help-circle', color: '#9E9E9E' };
        }
    };

    const getStatusLabel = (status) => {
        const statusLower = status?.toLowerCase();
        switch (statusLower) {
            case 'aprov':
                return 'Aprovado';
            case 'pend':
                return 'Pendente';
            case 'rej':
                return 'Rejeitado';
            case 'em analise':
            case 'em ana':
                return 'Em análise';
            default:
                return status || 'Pendente';
        }
    };

    const formatarData = (dataString, timestamp) => {
        try {
            // Priorizar data_hora_registro se existir
            if (dataString && typeof dataString === 'string') {
                // Se já estiver no formato DD/MM/YYYY HH:MM
                if (dataString.includes('/')) {
                    return dataString;
                }
                
                // Se for formato YYYY-MM-DD HH:MM:SS (do banco)
                if (dataString.includes('-') && dataString.includes(':')) {
                    const [datePart, timePart] = dataString.split(' ');
                    const [ano, mes, dia] = datePart.split('-');
                    const [hora, min] = timePart.split(':');
                    return `${dia}/${mes}/${ano} ${hora}:${min}`;
                }
            }
            
            // Se não tiver data_hora_registro, usar timestamp_solicitacao
            if (timestamp) {
                const data = new Date(parseInt(timestamp));
                if (!isNaN(data.getTime())) {
                    const dia = data.getDate().toString().padStart(2, '0');
                    const mes = (data.getMonth() + 1).toString().padStart(2, '0');
                    const ano = data.getFullYear();
                    const hora = data.getHours().toString().padStart(2, '0');
                    const min = data.getMinutes().toString().padStart(2, '0');
                    return `${dia}/${mes}/${ano} ${hora}:${min}`;
                }
            }
            
            return 'Data não disponível';
        } catch (error) {
            return 'Data não disponível';
        }
    };

    const renderAutorizacao = ({ item }) => {
        const statusIcon = getStatusIcon(item.status);
        const statusLabel = getStatusLabel(item.status);
        
        return (
            <TouchableOpacity 
                style={styles.card}
                onPress={() => {
                    Alert.alert(
                        'Detalhes da Autorização',
                        `Beneficiário: ${item.nome_beneficiario || 'N/A'}\n` +
                        `Carteira: ${item.card_beneficiario || 'N/A'}\n` +
                        `Exame: ${item.nome_exame || 'Não especificado'}\n` +
                        `Status: ${statusLabel}\n` +
                        `Protocolo: #${item.id || 'N/A'}\n` +
                        `Data: ${formatarData(item.data_hora_registro, item.timestamp_solicitacao)}\n` +
                        `${item.observacao ? `\nObservação: ${item.observacao}` : ''}`
                    );
                }}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.statusContainer}>
                        <Ionicons name={statusIcon.name} size={24} color={statusIcon.color} />
                        <Text style={[styles.status, { color: statusIcon.color }]}>
                            {statusLabel}
                        </Text>
                    </View>
                    <Text style={styles.data}>
                        {formatarData(item.data_hora_registro, item.timestamp_solicitacao)}
                    </Text>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <Ionicons name="person" size={18} color="#2E76B8" />
                        <Text style={styles.nomeBeneficiario}>{item.nome_beneficiario || 'Nome não disponível'}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="medical" size={18} color="#2E76B8" />
                        <Text style={styles.nomeExame}>Exame: {item.nome_exame || 'Exame não especificado'}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="card" size={18} color="#666" />
                        <Text style={styles.carteira}>Carteira: {item.card_beneficiario || 'N/A'}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="document-text" size={18} color="#666" />
                        <Text style={styles.protocolo}>Protocolo: #{item.id || 'N/A'}</Text>
                    </View>

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
    nomeBeneficiario: {
        fontSize: 15,
        fontWeight: '600',
        color: '#2E76B8',
        flex: 1,
    },
    carteira: {
        fontSize: 14,
        color: '#666',
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
