import { API } from '../api.js';
import { UI } from '../ui.js';

export async function setupTramitacao(documentoId) {
    // 1. Carregar Setores para o Select
    try {
        const setores = await API.get('/setores');
        const select = document.getElementById('selectSetorDestino');
        select.innerHTML = '<option value="">Selecione o destino...</option>';
        setores.forEach(s => {
            select.innerHTML += `<option value="${s.id}">${s.nome}</option>`;
        });

        // 2. Preparar Modal
        document.getElementById('tramitarDocId').value = documentoId;
        
        // Buscar info rápida do doc para exibir no modal
        const doc = await API.get(`/documentos/${documentoId}`);
        document.getElementById('tramitarProtocoloDisplay').textContent = doc.numero_protocolo;

        UI.openModal('modalTramitar');

    } catch (error) {
        UI.showToast('Erro ao carregar setores', 'error');
    }
}

export function initTramitacaoListener() {
    const form = document.getElementById('formTramitar');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const dados = {
            documento_id: document.getElementById('tramitarDocId').value,
            setor_destino_id: document.getElementById('selectSetorDestino').value,
            despacho: form.despacho.value,
            setor_origem_id: 1, // Mock: No sistema real viria da sessão do usuário
            usuario_id: 1       // Mock: ID do usuário logado
        };

        try {
            await API.post('/tramitar', dados);
            UI.closeModal('modalTramitar');
            UI.showToast('Documento tramitado com sucesso!');
            form.reset();
            
            // Atualizar lista se estiver visível
            // (Disparar um evento customizado seria o ideal, mas vamos recarregar a página ou view)
            document.querySelector('.nav-item[data-view="documentos"]').click(); 

        } catch (error) {
            UI.showToast('Erro ao tramitar documento', 'error');
        }
    });
}