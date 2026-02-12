import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Alert, Image, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { buscarCard, postPedidoAutorizacao } from '../mantis/everflowConex';
import { gerarChave, gerarTokenAutorizacao, converterParaBase64 } from '../mantis/crypto';

export default function SolicitarAut({ navigation }) {
    const [loading, setLoading] = useState(false);
    const [documento, setDocumento] = useState(null);
    const [userData, setUserData] = useState(null);
    const [nomeExame, setNomeExame] = useState('');
    const [especialidade, setEspecialidade] = useState('');

    useEffect(() => {
        carregarDadosUsuario();
    }, []);

    const carregarDadosUsuario = async () => {
        try {
            const storedUserData = await AsyncStorage.getItem('userData');
            if (storedUserData) {
                setUserData(JSON.parse(storedUserData));
            }
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
        }
    };

    const selecionarDocumento = async () => {
        try {
            // Solicitar permissão de galeria
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            
            if (status !== 'granted') {
                Alert.alert(
                    'Permissão Necessária',
                    'Você precisa conceder permissão de acesso à galeria.',
                    [{ text: 'OK' }]
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled) {
                setDocumento({
                    uri: result.assets[0].uri,
                    name: `documento_${Date.now()}.jpg`,
                });
            }
        } catch (error) {
            Alert.alert('Erro', 'Falha ao selecionar imagem: ' + error.message);
        }
    };

    const tirarFoto = async () => {
        try {
            // Solicitar permissão de câmera
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            
            if (status !== 'granted') {
                Alert.alert(
                    'Permissão Necessária',
                    'Você precisa conceder permissão de câmera para tirar fotos.',
                    [{ text: 'OK' }]
                );
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled) {
                setDocumento({
                    uri: result.assets[0].uri,
                    name: `documento_${Date.now()}.jpg`,
                });
            }
        } catch (error) {
            Alert.alert('Erro', 'Falha ao tirar foto: ' + error.message);
        }
    };

    const enviarAutorizacaoComDocumento = async () => {
        if (!documento) {
            Alert.alert('Validação', 'Por favor, anexe um documento/foto');
            return;
        }

        if (!nomeExame.trim()) {
            Alert.alert('Validação', 'Por favor, informe o nome do exame');
            return;
        }

        if (!userData) {
            Alert.alert('Erro', 'Dados do usuário não encontrados');
            return;
        }

        setLoading(true);
        try {
            // Converter documento para base64
            const documentoBase64 = await converterParaBase64(documento.uri);
            console.log('✅ Documento convertido para Base64');
            console.log('📏 Tamanho do documento Base64:', documentoBase64.length, 'caracteres');
            
            const token = gerarChave(userData.sCpfUSR, userData.dNascimento);

            // Preparar dados para envio
            const timestamp = Date.now().toString();
            const payload = {
                sNomeUSR: userData.sNomeUSR,
                sCodigoUSR: userData.sCodigoUSR || '',
                nomeExame: nomeExame.trim(),
                documentoBase64: documentoBase64,
                timestamp: timestamp,
            };
            
            console.log('📦 Payload preparado (sem documento):', {
                sNomeUSR: payload.sNomeUSR,
                sCodigoUSR: payload.sCodigoUSR,
                nomeExame: payload.nomeExame,
                timestamp: payload.timestamp,
                documentoLength: documentoBase64.length
            });

            // Enviar para API (agora envia documento em Base64, nome do exame e especialidade)
            const resultado = await postPedidoAutorizacao(
                '/solicitar_autorizacao', // endpoint - ajuste conforme sua API
                token,
                payload,
            );

            if (resultado && resultado.success) {
                Alert.alert(
                    'Sucesso',
                    'Autorização solicitada com sucesso!',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
                setDocumento(null);
                setNomeExame('');
                setEspecialidade('');
            } else {
                Alert.alert('Erro', 'Falha ao enviar solicitação de autorização');
            }
        } catch (error) {
            console.error('Erro ao enviar autorização:', error);
            Alert.alert('Erro', 'Erro ao processar solicitação: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <ScrollView
                    style={styles.scrollContainer}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                >
                    {/* Seção de Documento */}
                    <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📄 Anexar Documento</Text>
                    
                    {documento ? (
                        <View style={styles.documentoContainer}>
                            <Image
                                source={{ uri: documento.uri }}
                                style={styles.imagemPreview}
                            />
                            <Text style={styles.nomeDocumento}>{documento.name}</Text>
                            <TouchableOpacity
                                style={styles.btnRemover}
                                onPress={() => setDocumento(null)}
                            >
                                <Ionicons name="close-circle" size={24} color="#FF4444" />
                                <Text style={styles.btnRemoverText}>Remover</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.botoesAnexo}>
                            <TouchableOpacity
                                style={styles.btnAnexo}
                                onPress={tirarFoto}
                            >
                                <Ionicons name="camera" size={28} color="#2E76B8" />
                                <Text style={styles.btnAnexoText}>Tirar Foto</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.btnAnexo}
                                onPress={selecionarDocumento}
                            >
                                <Ionicons name="images" size={28} color="#2E76B8" />
                                <Text style={styles.btnAnexoText}>Galeria</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Informações da Solicitação */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📋 Informações da Solicitação</Text>
                    
                    <View style={styles.infoBox}>
                        <Text style={styles.label}>Usuário:</Text>
                        <Text style={styles.value}>{userData?.sNomeUSR || 'Carregando...'}</Text>
                    </View>

                    <View style={styles.infoBox}>
                        <Text style={styles.label}>Carteira:</Text>
                        <Text style={styles.value}>{userData?.sCodigoUSR || 'N/A'}</Text>
                    </View>

                    <View style={styles.infoBox}>
                        <Text style={styles.label}>Nome do Exame:</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="text" size={18} color="#2E76B8" />
                            <TextInput
                                style={[styles.textInput, { marginLeft: 10 }]}
                                placeholder="Digite o nome do exame..."
                                placeholderTextColor="#CCC"
                                value={nomeExame}
                                onChangeText={setNomeExame}
                            />
                        </View>
                    </View>

                </View>

                {/* Instrução */}
                <View style={styles.instructionBox}>
                    <Ionicons name="information-circle" size={24} color="#2E76B8" />
                    <Text style={styles.instructionText}>
                        Anexe uma foto clara do documento ou prescrição que solicita o exame.
                        Os dados serão criptografados e enviados com segurança.
                    </Text>
                </View>
            </ScrollView>
            </KeyboardAvoidingView>

            {/* Botão de Envio */}
            <View style={styles.footerContainer}>
                <TouchableOpacity
                    style={[styles.btnEnviar, loading && styles.btnEnviarDisabled]}
                    onPress={enviarAutorizacaoComDocumento}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <>
                            <Ionicons name="send" size={20} color="#FFF" />
                            <Text style={styles.btnEnviarText}>Solicitar Autorização</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    scrollContainer: {
        padding: 16,
    },
    section: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2E76B8',
        marginBottom: 12,
    },
    botoesAnexo: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        gap: 12,
    },
    btnAnexo: {
        flex: 1,
        backgroundColor: '#EBF3FF',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#2E76B8',
        borderStyle: 'dashed',
    },
    btnAnexoText: {
        marginTop: 8,
        fontSize: 14,
        fontWeight: '600',
        color: '#2E76B8',
    },
    documentoContainer: {
        alignItems: 'center',
    },
    imagemPreview: {
        width: '100%',
        height: 200,
        borderRadius: 10,
        marginBottom: 12,
    },
    nomeDocumento: {
        fontSize: 12,
        color: '#666',
        marginBottom: 12,
    },
    btnRemover: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
    },
    btnRemoverText: {
        color: '#FF4444',
        fontWeight: '600',
        fontSize: 14,
    },
    infoBox: {
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        paddingBottom: 12,
    },
    label: {
        fontSize: 12,
        color: '#999',
        marginBottom: 4,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    value: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
      
    textInput: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },  backgroundColor: '#F9F9F9',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    instructionBox: {
        backgroundColor: '#E8F4FF',
        borderRadius: 10,
        padding: 12,
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    instructionText: {
        flex: 1,
        fontSize: 12,
        color: '#2E76B8',
        lineHeight: 18,
    },
    footerContainer: {
        padding: 16,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
    btnEnviar: {
        backgroundColor: '#2E76B8',
        borderRadius: 10,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    btnEnviarDisabled: {
        opacity: 0.6,
    },
    btnEnviarText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});