import { API } from '../api.js';
import { UI } from '../ui.js';
import { setupTramitacao } from './tramitacao.js';

// Estado local
let documentosCache = [];

export async function initDocumentos() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <div class="toolbar" style="display:flex; justify-content:space-between; margin-bottom: 1rem;">
            <h2>Documentos</h2>
            <div style="display:flex; gap: 10px;">
                <select id="filtroStatus" style="padding: 8px; border-radius: 6px; border: 1px solid #ccc;">
                    <option value="">Todos os Status</option>
                    <option value="Recebido">Recebido</option>
                    <option value="Em Análise">Em Análise</option>
                    <option value="Finalizado">Finalizado</option>
                </select>
            </div>
        </div>
        <div id="tabelaDocumentos"></div>
    `;

    // Carregar dados
    await carregarDocumentos();

    // Event Listeners para Filtros
    document.getElementById('filtroStatus').addEventListener('change', (e) => {
        carregarDocumentos({ status: e.target.value });
    });
}

async function carregarDocumentos(filtros = {}) {
    try {
        let queryString = '?';
        if (filtros.status) queryString += `status=${filtros.status}&`;
        
        const docs = await API.get(`/documentos${queryString}`);
        documentosCache = docs; // Cache para uso local

        UI.renderTable('tabelaDocumentos', 
            ['Protocolo', 'Assunto', 'Tipo', 'Origem', 'Status', 'Ações'], 
            docs, 
            (doc) => `
                <tr>
                    <td style="font-weight:600; color:var(--primary-color)">${doc.numero_protocolo}</td>
                    <td>${doc.assunto}</td>
                    <td><span class="badge" style="background:#f1f5f9; color:#475569">${doc.tipo_documento}</span></td>
                    <td>${doc.remetente}</td>
                    <td><span class="badge ${getStatusClass(doc.status)}">${doc.status}</span></td>
                    <td>
                        <button class="btn-icon btn-ver" data-id="${doc.id}" title="Ver Detalhes">
                            <i class="ph ph-eye"></i>
                        </button>
                        <button class="btn-icon btn-tramitar" data-id="${doc.id}" title="Tramitar">
                            <i class="ph ph-paper-plane-right"></i>
                        </button>
                    </td>
                </tr>
            `
        );

        // Adicionar eventos aos botões da tabela
        document.querySelectorAll('.btn-ver').forEach(btn => 
            btn.addEventListener('click', () => verDetalhes(btn.dataset.id))
        );
        document.querySelectorAll('.btn-tramitar').forEach(btn => 
            btn.addEventListener('click', () => setupTramitacao(btn.dataset.id))
        );

    } catch (error) {
        UI.showToast('Erro ao carregar documentos', 'error');
    }
}

// Visualização de Detalhes e Histórico (RF-005)
async function verDetalhes(id) {
    try {
        const doc = await API.get(`/documentos/${id}`);
        
        // Monta HTML do histórico
        const historicoHtml = doc.historico.map(h => `
            <div class="timeline-item" style="border-left: 2px solid #e2e8f0; padding-left: 15px; margin-bottom: 15px; position:relative;">
                <div style="font-size: 0.8rem; color: #64748b;">${new Date(h.data_hora).toLocaleString()}</div>
                <div style="font-weight: 600;">${h.setor_origem} <i class="ph ph-arrow-right"></i> ${h.setor_destino}</div>
                <div style="font-size: 0.9rem;">${h.despacho}</div>
                <div style="font-size: 0.75rem; color: #94a3b8;">Por: ${h.usuario_nome}</div>
            </div>
        `).join('');

        // Exibe em um Modal Dinâmico (Simples)
        const modalContent = `
            <div style="padding: 1rem;">
                <h3>Protocolo: ${doc.numero_protocolo}</h3>
                <p><strong>Assunto:</strong> ${doc.assunto}</p>
                <p><strong>Status Atual:</strong> ${doc.status}</p>
                <p><strong>Setor Atual:</strong> ${doc.setor_nome}</p>
                ${doc.caminho_anexo ? `<a href="${doc.caminho_anexo}" target="_blank" class="btn-primary" style="display:inline-block; margin: 10px 0; font-size:0.8rem;">Ver PDF Anexo</a>` : ''}
                <hr style="margin: 15px 0; border:0; border-top:1px solid #eee;">
                <h4>Histórico de Tramitação</h4>
                <div style="margin-top: 10px;">${historicoHtml}</div>
            </div>
        `;
        
        // Reutiliza o modal generico injetando conteudo (Hack rápido para MVP)
        // O ideal seria ter um modal específico, mas vamos usar um alert customizado ou injetar no DOM
        // Para ficar limpo, vamos criar um elemento flutuante temporário
        mostrarModalDetalhes(modalContent);

    } catch (error) {
        console.error(error);
        UI.showToast('Erro ao carregar detalhes', 'error');
    }
}

function mostrarModalDetalhes(content) {
    const div = document.createElement('div');
    div.className = 'modal-overlay';
    div.innerHTML = `
        <div class="modal-card" style="max-width: 600px;">
            <div style="display:flex; justify-content:flex-end;"><button class="close-custom"><i class="ph ph-x"></i></button></div>
            ${content}
        </div>
    `;
    document.body.appendChild(div);
    div.querySelector('.close-custom').onclick = () => div.remove();
}

function getStatusClass(status) {
    if(status === 'Recebido') return 'recebido';
    if(status === 'Em Análise') return 'analise';
    if(status === 'Finalizado') return 'finalizado';
    return '';
}

// Setup do Formulário de Criação (Novo Documento)
export function setupNovoDocumento() {
    const form = document.getElementById('formNovoDocumento');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        
        // Injetar IDs fixos para o MVP (já que não temos login real)
        formData.append('setor_origem_id', 1); // Protocolo Geral
        formData.append('usuario_id', 1);      // Admin

        try {
            const res = await API.upload('/documentos', formData);
            
            UI.closeModal('modalNovoDocumento');
            UI.showToast(`Documento criado! Protocolo: ${res.protocolo}`);
            form.reset();
            
            // Se estiver na tela de documentos, recarregar
            const contentArea = document.getElementById('contentArea');
            if(contentArea.querySelector('#tabelaDocumentos')) {
                carregarDocumentos();
            }
            
            // Exibir as Tags da IA (RF-008)
            if(res.tags_ia) {
                alert(`IA Sugeriu as tags: ${res.tags_ia.join(', ')}`);
            }

        } catch (error) {
            UI.showToast('Erro ao criar documento', 'error');
        }
    });
}