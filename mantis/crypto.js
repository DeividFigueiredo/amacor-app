import CryptoJS from 'crypto-js';

// Gera um WordArray seguro para IVs/counters com fallback
function wordArrayFromUint8Array(u8arr) {
    const words = [];
    for (let i = 0; i < u8arr.length; i += 4) {
        words.push(
            ((u8arr[i] || 0) << 24) |
            ((u8arr[i + 1] || 0) << 16) |
            ((u8arr[i + 2] || 0) << 8) |
            (u8arr[i + 3] || 0)
        );
    }
    return CryptoJS.lib.WordArray.create(words, u8arr.length);
}

function secureRandomWordArray(nBytes) {
    try {
        // Tenta usar o gerador nativo do CryptoJS (pode falhar em alguns ambientes RN)
        return CryptoJS.lib.WordArray.random(nBytes);
    } catch (e) {
        console.warn('Aviso: CryptoJS.lib.WordArray.random falhou, aplicando fallback não-criptográfico.\nInstale `expo-random` e adicione um gerador seguro para produção.');
        // Fallback síncrono usando Math.random (não é criptograficamente seguro)
        const u8 = new Uint8Array(nBytes);
        for (let i = 0; i < nBytes; i++) {
            u8[i] = Math.floor(Math.random() * 256);
        }
        return wordArrayFromUint8Array(u8);
    }
}

export function gerarChave(cpf, dataNascimento) {
    console.log('gerarChave - cpf:', cpf);
    console.log('gerarChave - dataNascimento:', dataNascimento);
  const input = `${cpf}:${dataNascimento}`;
  
  // Gera o hash SHA-256
  const hash = CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex);

  // Corta os primeiros 16 caracteres do hash
  const chave = hash.substring(0, 64);

  console.log('chave gerada:', chave);
  return chave;
}

export function decryptData(key, encryptedData, iv) {
    try {
        console.log('Chave recebida:', key);
        console.log('IV recebido:', iv);

        // Converter a chave de hexadecimal para WordArray
        const keyBytes = CryptoJS.enc.Hex.parse(key);

        // Converter IV de hexadecimal para WordArray
        const ivBytes = CryptoJS.enc.Hex.parse(iv);

        // Converter dados criptografados de hexadecimal para WordArray
        const encryptedDataBytes = CryptoJS.enc.Hex.parse(encryptedData);

        // Descriptografar
        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: encryptedDataBytes },
            keyBytes,
            { 
                iv: ivBytes,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            }
        );

        // Converter para string UTF-8 (já sabemos que é JSON/texto)
        const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);

        if (!decryptedText) {
            throw new Error('Descriptografia resultou em string vazia');
        }

        console.log('Dados descriptografados:', decryptedText.substring(0, 100));

        // Parse como JSON
        try {
            const jsonData = JSON.parse(decryptedText);
            console.log('JSON parseado com sucesso');
            return jsonData;
        } catch (jsonError) {
            console.error('Erro ao parsear JSON:', jsonError);
            // Se não for JSON válido, retorna o texto cru
            return decryptedText;
        }

    } catch (e) {
        console.error(`Erro na descriptografia: ${e.message}`);
        throw e;
    }
}

export function criarChaveCripto(key){
    const input = key;
  
  // Gera o hash SHA-256
  const hash = CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex);

  // Corta os primeiros 16 caracteres do hash
  const chave = hash.substring(0, 64);

  console.log('chave gerada:', chave);
  return chave;
}

export function gerarTokenAutorizacao(key, timestamp){
    const input = `${key}:${timestamp}`;
    const hash = CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex);
    const token = hash.substring(0, 8);
    console.log('token gerado:', token);
    return token;
}

export function encryptData (key, data){
    try {
        console.log('Chave recebida:' + key);

        // Converte a chave hex para WordArray (espera-se chave em hexadecimal)
        const keyBytes = CryptoJS.enc.Hex.parse(key);

        // Gera IV de 16 bytes (128 bits) usando gerador seguro com fallback
        const iv = secureRandomWordArray(16);
        const ivHex = iv.toString(CryptoJS.enc.Hex);
        console.log('IV gerado:' + ivHex);

        // Se for string, usa diretamente; se for objeto, serializa para JSON
        const dataString = typeof data === 'string' ? data : JSON.stringify(data);
        console.log('Dados a serem criptografados (início):' + dataString.substring(0, 100));

        const encrypted = CryptoJS.AES.encrypt(dataString, keyBytes, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });

        const encryptedHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);

        console.log('Dados criptografados (início):' + encryptedHex.substring(0, 100));

        // Retorna no mesmo formato que o Python: [encryptedHex, ivHex]
        return [encryptedHex, ivHex];
    } catch (e) {
        console.error('Erro na criptografia:', e);
        throw e;
    }
}