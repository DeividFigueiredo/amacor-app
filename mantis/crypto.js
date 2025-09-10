import CryptoJS from 'crypto-js';

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
