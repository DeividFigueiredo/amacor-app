import { decryptData } from "./crypto";
import { getEverflowUrl } from "./config"
import { criarChaveCripto } from "./crypto";
import { encryptData } from "./crypto";
import AsyncStorage from '@react-native-async-storage/async-storage';


export async function buscarCard(endpoint, cpf, token) {
    
    const url = getEverflowUrl();
    const key= criarChaveCripto (token);
    const hashedCpf= encryptData (key, cpf); 
        
    try {
        console.log('🔍 Iniciando busca de dados...');
        console.log('token:', token)
                const response = await fetch(url + endpoint, {
                method: 'POST', // muda para POST
                headers: {
                        'Content-Type': 'application/json',
                        'Authorization': ` ${token}` // opcional, mais seguro que enviar no corpo
                },
            body: JSON.stringify({ hashedCpf }) // envia cpf, timestamp e geoloc em JSON
        });
    console.log('URL de requisição:', url + endpoint);
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
        const response = await fetch(url + endpoint, {
        method: 'POST', // muda para POST
        headers: {
            'Content-Type': 'application/json',
            'Authorization': ` ${token}` // opcional, mais seguro que enviar no corpo
        },
      body: JSON.stringify({ contrato }) // envia o cpf em JSON
    });
        

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

export async function buscarClinicas(endpoint, especialidade, token){
    const url= getEverflowUrl();

    try{
        const response = await fetch (url + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': ` ${token}`
            },
            body: JSON.stringify({especialidade})
        });

        if (!response.ok){
            throw new Error ('Erro na requisição:' + response.status);
        }
        const data= await response.json();
        console.log('Dados recebidos da API:', data);

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
            return decryptedData;
        }

    } catch (error) {
        console.error('🚨 Erro ao buscar dados:', error);
        
        if (error.message.includes('Beneficiário cancelado')) {
            throw error;
        }
        
        return null;
    }

}

export async function retornarSuspenso(endpoint, contrato, token){
    const url = getEverflowUrl();
    try {
        const response = await fetch(url + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${token}` // removi o espaço extra
            },
            body: JSON.stringify({ contrato })
        })
        
        if (!response.ok) {
            throw new Error('Erro na requisição: ' + response.status);
        }
        
        const data = await response.json(); // Se o endpoint retornar algo
        console.log('Resposta do endpoint:', data);
        return data;
        
    } catch (error) {
        console.error('🚨 Erro ao buscar dados:', error);
        throw error; // Propaga o erro para ser tratado acima
    }
}

// Envia token gerado + timestamp + geoloc para um endpoint de auditoria/registro
export async function enviarAutorizacao(endpoint, token, tokenGerado, timestamp, geoloc, nomeUsuario, cardUsuario, documentoBase64 = null, nomeExame = null, especialidade = null) {
    const url = getEverflowUrl();
    // Suporta chamada simplificada: enviarAutorizacao(endpoint, token, payload)
    if (arguments.length === 3 && typeof tokenGerado === 'object' && tokenGerado !== null) {
        const payload = tokenGerado;
        try {
            const response = await fetch(url + endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Erro na requisição: ' + response.status);
            }

            const data = await response.json();
            console.log('Resposta enviarAutorizacao:', data);
            return data;
        } catch (error) {
            console.error('Erro em enviarAutorizacao:', error);
            return null;
        }
    }

    const key = criarChaveCripto(token);
    const encryptedGeoloc = encryptData(key, geoloc);
    const hashedNome = encryptData(key, nomeUsuario);
    const hashedCard = encryptData(key, cardUsuario);
    const encryptedDocumento = documentoBase64 ? encryptData(key, documentoBase64) : null;

    try {
        const bodyPayload = { tokenGerado, timestamp, encryptedGeoloc, hashedNome, hashedCard };

        if (encryptedDocumento) bodyPayload.encryptedDocumento = encryptedDocumento;
        if (nomeExame) bodyPayload.nomeExame = nomeExame;
        if (especialidade) bodyPayload.especialidade = especialidade;

        const response = await fetch(url + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${token}`
            },
            body: JSON.stringify(bodyPayload)
        });

        if (!response.ok) {
            throw new Error('Erro na requisição: ' + response.status);
        }

        const data = await response.json();
        console.log('Resposta enviarAutorizacao:', data);
        return data;
    } catch (error) {
        console.error('Erro em enviarAutorizacao:', error);
        return null;
    }
}

export async function EncontrarClinicasClose(latitude, longitude, endpoint, token){
    try {
    const fetchClinicasProximas = async 
    const url= getEverflowUrl()
      setLoadingClinicas(true);
      setClinicas([]);
      
      // Enviar localização para sua API
      const response = await fetch(url + endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `${token}`,
        },
        body: JSON.stringify({
          latitude: latitude,
          longitude: longitude,
          raio: 10, // raio em km (ajuste conforme necessário)
          limite: 20 // número máximo de resultados
        })
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      // Verificar se a resposta tem o formato esperado
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
      Alert.alert(
        'Erro de Conexão',
        'Não foi possível conectar ao servidor. Verifique sua conexão.'
      );
    } finally {
      setLoadingClinicas(false);
    }
  };

export async function postPedidoAutorizacao(endpoint, token, pedidoData){
    const url = getEverFlowUrl();
    try{
        console.log('token: ', token)
        const response = await fetch(url + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${token}`
            },
            body: JSON.stringify(pedidoData)
        })
       if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      // Verificar se a resposta tem o formato esperado
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
      Alert.alert(
        'Erro de Conexão',
        'Não foi possível conectar ao servidor. Verifique sua conexão.'
      );
    } finally {
      setLoadingClinicas(false);
    }
  };