import { API } from '../api.js';
import { UI } from '../ui.js';
import { setupTramitacao } from './tramitacao.js';

let documentosCache = [];

export async function initDocumentos() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <div class="toolbar" style="display:flex; justify-content:space-between; margin-bottom: 1rem;">
            <h2>Gestão de Documentos</h2>
            <div style="display:flex; gap: 10px;">
                <select id="filtroCategoria" style="padding: 8px; border-radius: 6px; border: 1px solid #ccc;">
                    <option value="">Todas as Categorias</option>
                    <option value="Servidor">Servidores</option>
                    <option value="Academico">Acadêmicos</option>
                </select>
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

    await carregarDocumentos();

    // Filtros
    document.getElementById('filtroStatus').addEventListener('change', (e) => carregarDocumentos({ status: e.target.value }));
    document.getElementById('filtroCategoria').addEventListener('change', (e) => carregarDocumentos({ categoria: e.target.value }));
}

async function carregarDocumentos(filtros = {}) {
    try {
        let qs = new URLSearchParams(filtros).toString();
        const docs = await API.get(`/documentos?${qs}`);
        documentosCache = docs;

        UI.renderTable('tabelaDocumentos', 
            ['Protocolo', 'Categoria', 'Requerente', 'Assunto', 'Status', 'Ações'], 
            docs, 
            (doc) => `
                <tr>
                    <td style="font-weight:600; color:var(--primary-color)">${doc.numero_protocolo}</td>
                    <td><span class="badge" style="background:${doc.categoria === 'Servidor' ? '#e0e7ff' : '#fce7f3'}; color:${doc.categoria === 'Servidor' ? '#3730a3' : '#9d174d'}">${doc.categoria}</span></td>
                    <td>
                        <div style="font-weight:500">${doc.requerente_nome}</div>
                        <div style="font-size:0.75rem; color:#64748b">Mat: ${doc.requerente_matricula || 'N/A'}</div>
                    </td>
                    <td>${doc.assunto}</td>
                    <td><span class="badge ${getStatusClass(doc.status)}">${doc.status}</span></td>
                    <td>
                        <button class="btn-icon btn-ver" data-id="${doc.id}" title="Ver Detalhes"><i class="ph ph-eye"></i></button>
                        <button class="btn-icon btn-tramitar" data-id="${doc.id}" title="Tramitar"><i class="ph ph-paper-plane-right"></i></button>
                    </td>
                </tr>
            `
        );

        document.querySelectorAll('.btn-ver').forEach(btn => btn.addEventListener('click', () => verDetalhes(btn.dataset.id)));
        document.querySelectorAll('.btn-tramitar').forEach(btn => btn.addEventListener('click', () => setupTramitacao(btn.dataset.id)));

    } catch (error) {
        UI.showToast('Erro ao carregar lista.', 'error');
    }
}

// Lógica do Modal de Cadastro Dinâmico
export function setupNovoDocumento() {
    const form = document.getElementById('formNovoDocumento');
    const selectCat = document.getElementById('selectCategoria');
    const fieldsServidor = document.getElementById('fieldsServidor');
    const fieldsAcademico = document.getElementById('fieldsAcademico');
    const assuntoServidor = document.getElementById('assuntoServidor');
    const assuntoAcademico = document.getElementById('assuntoAcademico');

    // Alternar campos baseado na categoria
    selectCat.addEventListener('change', (e) => {
        const val = e.target.value;
        if(val === 'Servidor') {
            fieldsServidor.classList.remove('hidden-field');
            fieldsAcademico.classList.add('hidden-field');
            assuntoServidor.setAttribute('required', 'true');
            assuntoAcademico.removeAttribute('required');
        } else if (val === 'Academico') {
            fieldsAcademico.classList.remove('hidden-field');
            fieldsServidor.classList.add('hidden-field');
            assuntoAcademico.setAttribute('required', 'true');
            assuntoServidor.removeAttribute('required');
        } else {
            fieldsServidor.classList.add('hidden-field');
            fieldsAcademico.classList.add('hidden-field');
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        
        // Determina qual é o campo "assunto" real baseado na categoria
        const categoria = formData.get('categoria');
        if (categoria === 'Servidor') {
            formData.append('assunto', formData.get('assunto_servidor'));
        } else {
            formData.append('assunto', formData.get('assunto_academico'));
        }

        try {
            const res = await API.upload('/documentos', formData);
            UI.closeModal('modalNovoDocumento');
            UI.showToast(`Protocolo ${res.protocolo} gerado com sucesso!`);
            form.reset();
            fieldsServidor.classList.add('hidden-field');
            fieldsAcademico.classList.add('hidden-field');
            
            const contentArea = document.getElementById('contentArea');
            if(contentArea.querySelector('#tabelaDocumentos')) carregarDocumentos();

        } catch (error) {
            UI.showToast('Erro ao registrar protocolo.', 'error');
        }
    });
}

// Visualização de Detalhes
async function verDetalhes(id) {
    try {
        const doc = await API.get(`/documentos/${id}`);
        
        // Renderizar dados extras
        let extrasHtml = '';
        if (doc.dados_extras) {
            const extras = doc.dados_extras; // Já vem como objeto do controller
            extrasHtml = '<div style="background:#f8fafc; padding:10px; border-radius:6px; margin:10px 0; font-size:0.9rem;">';
            for (const [key, value] of Object.entries(extras)) {
                // Formata a chave (ex: curso -> Curso)
                const label = key.charAt(0).toUpperCase() + key.slice(1);
                if(value) extrasHtml += `<p><strong>${label}:</strong> ${value}</p>`;
            }
            extrasHtml += '</div>';
        }

        const historicoHtml = doc.historico.map(h => `
            <div class="timeline-item" style="border-left: 2px solid #e2e8f0; padding-left: 15px; margin-bottom: 15px;">
                <div style="font-size: 0.8rem; color: #64748b;">${new Date(h.data_hora).toLocaleString()}</div>
                <div style="font-weight: 600;">${h.setor_origem} <i class="ph ph-arrow-right"></i> ${h.setor_destino}</div>
                <div style="font-size: 0.9rem;">${h.despacho}</div>
                <div style="font-size: 0.75rem; color: #94a3b8;">Por: ${h.usuario_nome}</div>
            </div>
        `).join('');

        const content = `
            <div style="padding: 1rem;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3>${doc.numero_protocolo}</h3>
                    <span class="badge">${doc.categoria}</span>
                </div>
                <p><strong>Requerente:</strong> ${doc.requerente_nome} (CPF: ${doc.requerente_cpf})</p>
                <p><strong>Assunto:</strong> ${doc.assunto}</p>
                ${extrasHtml}
                <p><strong>Status Atual:</strong> ${doc.status} em ${doc.setor_nome}</p>
                ${doc.caminho_anexo ? `<a href="${doc.caminho_anexo}" target="_blank" class="btn-primary" style="display:inline-block; margin: 10px 0; font-size:0.8rem; text-decoration:none; padding:5px 10px;">Ver PDF Anexo</a>` : ''}
                <hr style="margin: 15px 0; border:0; border-top:1px solid #eee;">
                <h4>Histórico de Tramitação</h4>
                <div style="margin-top: 10px;">${historicoHtml}</div>
            </div>
        `;
        
        mostrarModalDetalhes(content);
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
            <div style="display:flex; justify-content:flex-end;"><button class="close-custom" style="background:none; border:none; cursor:pointer; font-size:1.2rem;"><i class="ph ph-x"></i></button></div>
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