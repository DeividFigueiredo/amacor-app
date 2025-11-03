import { decryptData } from "./crypto";
import { getEverflowUrl } from "./config"
import { criarChaveCripto } from "./crypto";
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function buscarCard(endpoint, cpf, token) {
    cpf = '?cpf=' + cpf + '&token=';
    const url = getEverflowUrl();
     
    try {
        console.log('🔍 Iniciando busca de dados...');
        
        const response = await fetch(url + endpoint + cpf + token);

        if (!response.ok) {
            throw new Error('Erro na requisição: ' + response.status);
        }

        const data = await response.json();
        console.log('📦 Dados recebidos da API:', JSON.stringify(data, null, 2));

        let decryptedData;
        
        if (Array.isArray(data) && data.length === 2) {
            console.log('🔒 Modo criptografado detectado');
            const encryptedData = data[0];
            const iv = data[1];
            const key = criarChaveCripto(token);
            decryptedData = decryptData(key, encryptedData, iv);
        } else if (typeof data === 'object') {
            console.log('📄 Modo não criptografado detectado');
            decryptedData = data;
        } else {
            throw new Error('Formato de resposta não reconhecido');
        }

        console.log('🔓 Dados descriptografados:', JSON.stringify(decryptedData, null, 2));

        // 🔍 VERIFICAR SE O BENEFICIÁRIO FOI CANCELADO
        if (decryptedData) {
            // Verificar TODOS os campos possíveis que indicam cancelamento
            const camposParaVerificar = [
                'sMotivoCancelamentoUSR',
                'sMotivoCancelamentoTIT',
                'sDescricaoCancUsu', 
                'sDescricaoCancTit',
                'dExclusaoUSR',
                'dExclusao',
                'dExclusaoPUSR'
            ];
            
            let motivoCancelamento = '';
            let campoEncontrado = '';
            
            // Procurar em todos os campos possíveis
            for (const campo of camposParaVerificar) {
                const valor = decryptedData[campo];
                console.log(`🔎 Verificando campo ${campo}:`, valor);
                
                if (valor !== undefined && valor !== null && valor !== '' && String(valor).trim() !== '') {
                    motivoCancelamento = String(valor).trim();
                    campoEncontrado = campo;
                    break;
                }
            }
            
            console.log('✅ Campo encontrado:', campoEncontrado);
            console.log('✅ Motivo cancelamento:', motivoCancelamento);

            if (motivoCancelamento !== '') {
                console.log('❌ Beneficiário cancelado. Motivo:', motivoCancelamento);
                
                // 🗑️ DESTRUIR TODOS OS DADOS DO ASYNCSTORAGE
                await destruirTodosDados();
                
                throw new Error(`Beneficiário cancelado: ${motivoCancelamento}`);
            }
            
            console.log('✅ Beneficiário ativo - nenhum motivo de cancelamento encontrado');
            
            // 🔥 ADICIONAR VALIDADE DE 7 DIAS
            const hoje = new Date();
            const validThru = new Date();
            validThru.setDate(hoje.getDate() + 7);
            
            const formatarData = (date) => {
                const dia = date.getDate().toString().padStart(2, '0');
                const mes = (date.getMonth() + 1).toString().padStart(2, '0');
                const ano = date.getFullYear();
                return `${dia}/${mes}/${ano}`;
            };
            
            decryptedData.validThru = formatarData(validThru);
            decryptedData.dataAtualizacao = formatarData(hoje);
            
            console.log('📅 Dados com validade adicionada');
        }

        return decryptedData;
        
    } catch (error) {
        console.error('🚨 Erro ao buscar dados:', error);
        
        if (error.message.includes('Beneficiário cancelado')) {
            throw error;
        }
        
        return null;
    }
}

// 🗑️ FUNÇÃO PARA DESTRUIR TODOS OS DADOS DO ASYNCSTORAGE
async function destruirTodosDados() {
    try {
        console.log('🔄 Iniciando destruição de TODOS os dados do AsyncStorage...');
        
        // 🗑️ APAGAR TUDO - método mais simples e eficaz
        await AsyncStorage.clear();
        
        console.log('✅ TODOS os dados do AsyncStorage foram removidos com sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao destruir dados:', error);
    }
}

export async function buscarPagamentos(endpoint, contrato, token) {
    const url = getEverflowUrl();
    const dados = AsyncStorage.getItem('userData');

    console.log("Dados encontrados:"+dados);
     try {
        const response = await fetch(url + endpoint + contrato + token);
        

        if (!response.ok) {
            throw new Error('Erro na requisição: ' + response.status);
        }

        const data = await response.json();
        console.log('Dados recebidos da API:', data);
        return data;
        
     } catch (error) {
        console.error('Erro ao buscar dados:', error);
        return null;
    }
    
}