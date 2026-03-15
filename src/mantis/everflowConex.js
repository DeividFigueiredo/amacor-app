import { decryptData } from "./crypto";
import { getEverflowUrl, getPubEverflowUrl } from "./config"
import { criarChaveCripto } from "./crypto";
import { encryptData } from "./crypto";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import appConfig from '../../app.json';

function getVersaoApp() {
    try {
        const version = appConfig.expo.version;
        const buildNumber = Application.nativeBuildVersion || '1';
        const platform = Platform.OS;
        return `${platform}-${version}-${buildNumber}`;
    } catch (error) {
        console.error('Erro ao obter versão do app:', error);
        return 'unknown';
    }
}

function getDeviceInfo() {
    try {
        let androidId = Platform.OS === 'android' ? (Application.androidId || 'unknown') : 'not-android';
        let uniqueId = androidId;
        let idSource = 'expo-application';

        try {
            // Carrega o módulo nativo apenas quando a build suporta isso.
            // No Expo Go essa tentativa pode falhar, então mantemos fallback seguro.
            // eslint-disable-next-line global-require
            const deviceInfoModule = require('react-native-device-info');
            const nativeDeviceInfo = deviceInfoModule.default || deviceInfoModule;

            if (Platform.OS === 'android' && typeof nativeDeviceInfo.getAndroidIdSync === 'function') {
                androidId = nativeDeviceInfo.getAndroidIdSync() || androidId;
            }

            if (typeof nativeDeviceInfo.getUniqueIdSync === 'function') {
                uniqueId = nativeDeviceInfo.getUniqueIdSync() || uniqueId;
            }

            idSource = 'react-native-device-info';
        } catch (nativeModuleError) {
            console.log('DeviceInfo nativo indisponivel, usando fallback Expo:', nativeModuleError?.message || nativeModuleError);
        }

        return {
            platform: Platform.OS,
            androidId: androidId || 'unknown',
            uniqueId: uniqueId || 'unknown',
            deviceId: uniqueId || androidId || 'unknown',
            phoneId: androidId || uniqueId || 'unknown',
            installationId: uniqueId || androidId || 'unknown',
            idSource,
            deviceModel: Device.modelName || 'unknown',
            deviceBrand: Device.brand || 'unknown',
            osVersion: Device.osVersion || 'unknown',
            appVersion: appConfig.expo.version || 'unknown',
            buildNumber: Application.nativeBuildVersion || 'unknown',
        };
    } catch (error) {
        console.error('Erro ao obter dados do dispositivo:', error);
        return {
            platform: Platform.OS,
            androidId: 'unknown',
            uniqueId: 'unknown',
            deviceId: 'unknown',
            phoneId: 'unknown',
            installationId: 'unknown',
            idSource: 'unavailable',
            deviceModel: 'unknown',
            deviceBrand: 'unknown',
            osVersion: 'unknown',
            appVersion: 'unknown',
            buildNumber: 'unknown',
        };
    }
}

function isDeviceRegistrationSuccessful(response) {
    if (response === true) return true;
    if (response === null || response === undefined) return false;
    if (typeof response === 'object') {
        if (response.success === false) return false;
        if (response.ok === false) return false;
        if (response.status && String(response.status).toLowerCase() === 'error') return false;
    }
    return true;
}

export async function buscarCard(endpoint, cpf, token) {
    
    const url = getEverflowUrl();
    const key= criarChaveCripto (token);
    const hashedCpf= encryptData (key, cpf); 
    const versaoApp = getVersaoApp();
    const storedPushToken =
        (await AsyncStorage.getItem('fcmToken')) ||
        (await AsyncStorage.getItem('pushToken'));

    // Registra dispositivo primeiro na rota de push. O login segue apenas com resposta valida.
    const deviceRegistrationResponse = await registrarPushToken('/registrar_push', token, {
        flow: 'pre_login_device_registration',
        pushToken: storedPushToken || null,
        fcmToken: storedPushToken || null,
    });

    if (!isDeviceRegistrationSuccessful(deviceRegistrationResponse)) {
        console.error('❌ Falha no registro de dispositivo antes do login:', deviceRegistrationResponse);
        throw new Error('Não foi possível registrar o dispositivo antes do login. Tente novamente.');
    }

    console.log('✅ Dispositivo registrado antes do login:', deviceRegistrationResponse);
        
    try {
        console.log('🔍 Iniciando busca de dados...');
                const response = await fetch(url + endpoint, {
                method: 'POST', // muda para POST
                headers: {
                        'Content-Type': 'application/json',
                        'Authorization': ` ${token}`,
                        'App-Version': versaoApp
                },
            body: JSON.stringify({ hashedCpf }) // dados de dispositivo seguem na rota de push
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
    const versaoApp = getVersaoApp();

    console.log("Dados encontrados:"+dados);
     try {
        const response = await fetch(url + endpoint, {
        method: 'POST', // muda para POST
        headers: {
            'Content-Type': 'application/json',
            'Authorization': ` ${token}`,
            'App-Version': versaoApp
        },
      body: JSON.stringify({ contrato }) // envia o cpf em JSON
    });
        

        if (!response.ok) {
            throw new Error('Erro na requisição: ' + response.status);
        }

        const data = await response.json();
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
        return decryptedData;
        
     } catch (error) {
        console.error('Erro ao buscar dados:', error);
        return null;
    }
    
}

export async function buscarClinicas(endpoint, especialidade, token){
    const url= getEverflowUrl();
    const versaoApp = getVersaoApp();

    try{
        const response = await fetch (url + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': ` ${token}`,
                'App-Version': versaoApp
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
    const versaoApp = getVersaoApp();
    try {
        const response = await fetch(url + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${token}`,
                'App-Version': versaoApp
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
export async function enviarAutorizacao(endpoint, token, tokenGerado, timestamp, geoloc, nomeUsuario, cardUsuario, timestampLocal, timezoneOffsetMinutes) {
    const url = getEverflowUrl();
    // Suporta chamada simplificada: enviarAutorizacao(endpoint, token, payload)
    if (arguments.length === 3 && typeof tokenGerado === 'object' && tokenGerado !== null) {
        const payload = tokenGerado;
        const versaoApp = getVersaoApp();
        try {
            const response = await fetch(url + endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `${token}`,
                    'App-Version': versaoApp
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
    const versaoApp = getVersaoApp();

    try {
        const bodyPayload = { tokenGerado, timestamp, timestampLocal, timezoneOffsetMinutes, encryptedGeoloc, hashedNome, hashedCard };

       
        
        const response = await fetch(url + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${token}`,
                'App-Version': versaoApp
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

// 🔔 Registrar token de push do dispositivo
export async function registrarPushToken(endpoint, token, payload) {
    const url = getEverflowUrl();
    const versaoApp = getVersaoApp();

    try {
        const deviceInfo = getDeviceInfo();
        const pushPayload = {
            ...(payload || {}),
            ...deviceInfo,
        };

        const key = criarChaveCripto(token);
        console.log('🔔 Push payload preparado (chaves):', Object.keys(pushPayload));
        const hashedPushData = encryptData(key, JSON.stringify(pushPayload));
        const hashedAuthToken = encryptData(key, token);

        const response = await fetch(url + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': ` ${token}`,
                'App-Version': versaoApp
            },
            body: JSON.stringify({ hashedPushData, hashedAuthToken })
        });

        if (!response.ok) {
            throw new Error('Erro na requisição: ' + response.status);
        }

        try {
            return await response.json();
        } catch (e) {
            return true;
        }
    } catch (error) {
        console.error('Erro ao registrar push token:', error);
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
    const url = getEverflowUrl();
    const versaoApp = getVersaoApp();
    try {
        console.log('📦 Payload recebido (chaves):', Object.keys(pedidoData));
        console.log('📦 Payload completo:', {
            ...pedidoData,
            documentoBase64: pedidoData.documentoBase64 ? `[BASE64 com ${pedidoData.documentoBase64.length} caracteres]` : 'não incluído'
        });
        
        const key = criarChaveCripto(token);
        const hashedPedidoData = encryptData(key, JSON.stringify(pedidoData));
        
        console.log('🔐 Dados criptografados com sucesso');
        console.log('🌐 URL completa:', url + endpoint);
        console.log('🔑 Token:', token);
        console.log('📱 Versão do App:', versaoApp);
        
        const response = await fetch(url + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${token}`,
                'App-Version': versaoApp
            },
            body: JSON.stringify({ hashedPedidoData })
        });

        console.log('📡 Status da resposta:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro da API:', errorText);
            throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ Resposta recebida:', data);
        
        return data;
        
    } catch (error) {
        console.error('🚨 Erro ao enviar autorização:', error);
        throw error;
    }
}

export async function buscarAutorizacoes(endpoint, card, token) {
    const url = getEverflowUrl();
    const versaoApp = getVersaoApp();
    try {
        const key = criarChaveCripto(token);
        const hashedCard = encryptData(key, card);
        
        console.log('📋 Buscando autorizações...');
        
        const response = await fetch(url + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${token}`,
                'App-Version': versaoApp
            },
            body: JSON.stringify({ hashedCard })
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log('📋 Autorizações recebidas');
        
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

        return decryptedData;
        
    } catch (error) {
        console.error('🚨 Erro ao buscar autorizações:', error);
        throw error;
    }
}