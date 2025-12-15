const API_BASE = 'http://localhost:3000/api';

export const API = {
    // Busca genérica
    async get(endpoint) {
        try {
            const response = await fetch(`${API_BASE}${endpoint}`);
            if (!response.ok) throw new Error('Erro na requisição');
            return await response.json();
        } catch (error) {
            console.error(error);
            throw error;
        }
    },

    // Envio de dados (JSON)
    async post(endpoint, data) {
        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            console.error(error);
            throw error;
        }
    },

    // Envio de Arquivos (FormData)
    async upload(endpoint, formData) {
        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                body: formData // Não setar Content-Type, o browser faz isso para multipart
            });
            return await response.json();
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
};