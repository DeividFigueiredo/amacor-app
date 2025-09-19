import { decryptData } from "./crypto";
import { getEverflowUrl } from "./config"
import { criarChaveCripto } from "./crypto";
// Função para buscar dados do backend

export async function buscarCard(endpoint, cpf, token) {
    cpf = '?cpf=' + cpf + '&token=';
    const url = getEverflowUrl();
     
    try {
        const response = await fetch(url + endpoint + cpf + token);

        if (!response.ok) {
            throw new Error('Erro na requisição: ' + response.status);
        }

        const data = await response.json();
        console.log('Dados recebidos da API:', data);

        let decryptedData;
        
        // Verificar se é dado criptografado [encrypted, iv] ou JSON direto
        if (Array.isArray(data) && data.length === 2) {
            // Modo criptografado
            const encryptedData = data[0];
            const iv = data[1];

            console.log('Modo criptografado detectado');
            console.log('Dados criptografados:', encryptedData.substring(0, 50) + '...');
            console.log('IV:', iv);
            const key = criarChaveCripto(token);

            decryptedData = decryptData(key, encryptedData, iv);
        } else if (typeof data === 'object') {
            // Modo não criptografado (JSON direto)
            console.log('Modo não criptografado detectado');
            decryptedData = data;
        } else {
            throw new Error('Formato de resposta não reconhecido');
        }

        // 🔥 ADICIONAR VALIDADE DE 7 DIAS (apenas data)
        if (decryptedData) {
            const hoje = new Date();
            const validThru = new Date();
            validThru.setDate(hoje.getDate() +7); // 7 dias a partir de hoje
            
            // Formata para dd/mm/aaaa
            const formatarData = (date) => {
                const dia = date.getDate().toString().padStart(2, '0');
                const mes = (date.getMonth() + 1).toString().padStart(2, '0');
                const ano = date.getFullYear();
                return `${dia}/${mes}/${ano}`;
            };
            
            decryptedData.validThru = formatarData(validThru);
            decryptedData.dataAtualizacao = formatarData(hoje);
            
            console.log('Dados com validade:', decryptedData);
        }

        return decryptedData;
        
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        return null;
    }
}
