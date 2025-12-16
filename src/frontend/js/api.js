const API_BASE = 'http://localhost:3000/api';

// Função auxiliar para pegar cabeçalhos com Auth
function getHeaders(contentType = 'application/json') {
    const token = localStorage.getItem('token');
    const headers = {};
    if (contentType) headers['Content-Type'] = contentType;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

// Função para tratar erros de Auth (401/403)
function handleAuthError(response) {
    if (response.status === 401 || response.status === 403) {
        localStorage.clear();
        window.location.href = 'login.html';
        throw new Error('Sessão expirada ou acesso negado.');
    }
}

export const API = {
    async get(endpoint) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: getHeaders()
        });
        handleAuthError(response);
        return await response.json();
    },

    // Envio de dados (JSON)
    async post(endpoint, data) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        handleAuthError(response);
        return await response.json();
    },

    // Envio de Arquivos (FormData)
    async upload(endpoint, formData) {
        // Para upload não setamos Content-Type manualmente (o browser faz isso com boundary)
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: headers,
            body: formData
        });
        handleAuthError(response);
        return await response.json();
    }
};