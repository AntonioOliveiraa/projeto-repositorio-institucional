import { API } from '../api.js';
import { UI } from '../ui.js';
import { setupTramitacao } from './tramitacao.js';

// --- ESTADO E CONFIGURAÇÃO ---

let currentPage = 1;
const itemsPerPage = 100;
let tagsAtuais = []; // Armazena as tags do modal de criação

// --- INICIALIZAÇÃO E LISTAGEM ---

export async function initDocumentos(termoBusca = '') {
    // Reset da página ao entrar na tela ou fazer nova busca completa
    currentPage = 1;

    const contentArea = document.getElementById('contentArea');
    
    // Carrega setores para o filtro
    let setoresHtml = '<option value="">Todos os Setores</option>';
    try {
        const setores = await API.get('/setores');
        setoresHtml += setores.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
    } catch(e) { console.error('Erro ao carregar setores', e); }

    // HTML da barra de ferramentas
    contentArea.innerHTML = `
        <div class="toolbar" style="display:flex; justify-content:space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 10px;">
            <h2>Gestão de Documentos</h2>
            <div style="display:flex; gap: 10px; flex-wrap: wrap;">
                ${termoBusca ? `
                    <span class="badge" style="background:#fef3c7; color:#d97706; display:flex; align-items:center; padding:0 10px;">
                        Filtrando por: "${termoBusca}" 
                        <i class="ph ph-x" style="cursor:pointer; margin-left:5px;" id="btnLimparBadge" title="Limpar busca"></i>
                    </span>
                ` : ''}
                
                <select id="filtroCategoria" style="padding: 8px; border-radius: 6px; border: 1px solid #ccc;">
                    <option value="">Todas as Categorias</option>
                    <option value="Servidor">Servidores</option>
                    <option value="Academico">Acadêmicos</option>
                </select>

                <select id="filtroSetor" style="padding: 8px; border-radius: 6px; border: 1px solid #ccc;">
                    ${setoresHtml}
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

        <div id="paginationControls" style="display:flex; justify-content:center; align-items:center; gap:15px; margin-top:20px; padding-bottom:20px;">
        </div>
    `;

    // Carrega documentos aplicando o filtro de busca inicial
    await carregarDocumentos({ busca: termoBusca });
    
    // Inicializa listeners
    setupEditarDocumento();
    setupAnexarEConcluir();
    setupNovoDocumento(); // Inicializa lógica de IA e Tags

    // Eventos de mudança nos dropdowns
    const onChangeFilter = () => {
        currentPage = 1; 
        carregarDocumentos({ 
            status: document.getElementById('filtroStatus').value, 
            categoria: document.getElementById('filtroCategoria').value, 
            setor_id: document.getElementById('filtroSetor').value,
            busca: termoBusca 
        });
    };

    document.getElementById('filtroStatus').addEventListener('change', onChangeFilter);
    document.getElementById('filtroCategoria').addEventListener('change', onChangeFilter);
    document.getElementById('filtroSetor').addEventListener('change', onChangeFilter);
    
    const btnLimpar = document.getElementById('btnLimparBadge');
    if(btnLimpar) {
        btnLimpar.addEventListener('click', () => {
            const searchInput = document.getElementById('globalSearch');
            if(searchInput) searchInput.value = ''; 
            initDocumentos(); 
        });
    }
}

async function carregarDocumentos(filtros = {}) {
    try {
        let qs = `?page=${currentPage}&limit=${itemsPerPage}`;
        
        if(filtros.status) qs += `&status=${filtros.status}`;
        if(filtros.categoria) qs += `&categoria=${filtros.categoria}`;
        if(filtros.setor_id) qs += `&setor_id=${filtros.setor_id}`;
        if(filtros.busca) qs += `&busca=${encodeURIComponent(filtros.busca)}`;

        const response = await API.get(`/documentos${qs}`);
        const docs = response.data || [];
        const pagination = response.pagination || {};

        UI.renderTable('tabelaDocumentos', 
            ['Protocolo', 'Categoria', 'Requerente', 'Assunto', 'Setor Atual', 'Status', 'Ações'], 
            docs, 
            (doc) => {
                const isFinalizado = doc.status === 'Finalizado' || doc.status === 'Arquivado';
                const styleBtn = isFinalizado ? 'display:none;' : '';

                return `
                <tr>
                    <td style="font-weight:600; color:var(--primary-color)">${doc.numero_protocolo}</td>
                    <td><span class="badge" style="background:${doc.categoria === 'Servidor' ? '#e0e7ff' : '#fce7f3'}; color:${doc.categoria === 'Servidor' ? '#3730a3' : '#9d174d'}">${doc.categoria}</span></td>
                    <td>
                        <div style="font-weight:500">${doc.requerente_nome}</div>
                    </td>
                    <td>${doc.assunto}</td>
                    <td style="font-size:0.85rem; color:#475569;">${doc.nome_setor_atual || '-'}</td>
                    <td><span class="badge ${getStatusClass(doc.status)}">${doc.status}</span></td>
                    <td class="acoes-col">
                        <button class="btn-icon btn-ver" data-id="${doc.id}" title="Ver Detalhes"><i class="ph ph-eye"></i></button>
                        <button class="btn-icon btn-anexar" data-id="${doc.id}" data-proto="${doc.numero_protocolo}" title="Anexar Arquivo" style="${styleBtn}"><i class="ph ph-paperclip"></i></button>
                        <button class="btn-icon btn-concluir" data-id="${doc.id}" title="Concluir" style="${styleBtn} color:#059669;"><i class="ph ph-check-square"></i></button>
                        <button class="btn-icon btn-tramitar" data-id="${doc.id}" title="Tramitar" style="${styleBtn}"><i class="ph ph-paper-plane-right"></i></button>
                        <button class="btn-icon btn-editar" data-id="${doc.id}" title="Editar" style="${styleBtn}"><i class="ph ph-pencil-simple"></i></button>
                        <button class="btn-icon btn-arquivar" data-id="${doc.id}" title="Arquivar" style="color:var(--danger); ${styleBtn}"><i class="ph ph-archive"></i></button>
                    </td>
                </tr>
            `}
        );

        renderPagination(pagination, filtros);

        document.querySelectorAll('.btn-ver').forEach(btn => btn.addEventListener('click', () => verDetalhes(btn.dataset.id)));
        document.querySelectorAll('.btn-tramitar').forEach(btn => btn.addEventListener('click', () => setupTramitacao(btn.dataset.id)));
        document.querySelectorAll('.btn-editar').forEach(btn => btn.addEventListener('click', () => abrirModalEdicao(btn.dataset.id)));
        document.querySelectorAll('.btn-arquivar').forEach(btn => btn.addEventListener('click', () => arquivarDocumento(btn.dataset.id)));
        document.querySelectorAll('.btn-anexar').forEach(btn => btn.addEventListener('click', () => abrirModalAnexar(btn.dataset.id, btn.dataset.proto)));
        document.querySelectorAll('.btn-concluir').forEach(btn => btn.addEventListener('click', () => abrirModalConcluir(btn.dataset.id)));

    } catch (error) {
        UI.showToast('Erro ao carregar lista.', 'error');
        console.error(error);
    }
}

function renderPagination(pagination, currentFilters) {
    const container = document.getElementById('paginationControls');
    if (!container) return;

    if (!pagination || pagination.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <button id="btnPagePrev" class="btn-secondary" ${pagination.currentPage === 1 ? 'disabled' : ''} style="padding:5px 15px;">
            <i class="ph ph-caret-left"></i> Anterior
        </button>
        <span style="font-size:0.9rem; color:#666;">
            Página <strong>${pagination.currentPage}</strong> de ${pagination.totalPages}
        </span>
        <button id="btnPageNext" class="btn-secondary" ${pagination.currentPage >= pagination.totalPages ? 'disabled' : ''} style="padding:5px 15px;">
            Próximo <i class="ph ph-caret-right"></i>
        </button>
    `;

    document.getElementById('btnPagePrev').onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            carregarDocumentos(currentFilters);
        }
    };

    document.getElementById('btnPageNext').onclick = () => {
        if (currentPage < pagination.totalPages) {
            currentPage++;
            carregarDocumentos(currentFilters);
        }
    };
}

// --- FUNÇÕES DE ANEXO E CONCLUSÃO ---

function abrirModalAnexar(id, protocolo) {
    document.getElementById('anexarDocId').value = id;
    document.getElementById('anexarProtocoloDisplay').textContent = protocolo;
    UI.openModal('modalAnexar');
}

function abrirModalConcluir(id) {
    document.getElementById('concluirDocId').value = id;
    UI.openModal('modalConcluir');
}

function setupAnexarEConcluir() {
    const formAnexar = document.getElementById('formAnexar');
    if(formAnexar) {
        const novoAnexar = formAnexar.cloneNode(true);
        formAnexar.parentNode.replaceChild(novoAnexar, formAnexar);
        
        novoAnexar.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(novoAnexar);
            const id = formData.get('documento_id');
            try {
                await API.upload(`/documentos/${id}/anexo`, formData);
                UI.closeModal('modalAnexar');
                UI.showToast('Arquivo anexado!');
                carregarDocumentos();
            } catch (error) { UI.showToast('Erro ao anexar.', 'error'); }
        });
        novoAnexar.closest('.modal-card').querySelectorAll('.close-custom').forEach(b => b.onclick = () => UI.closeModal('modalAnexar'));
    }

    const formConcluir = document.getElementById('formConcluir');
    if(formConcluir) {
        const novoConcluir = formConcluir.cloneNode(true);
        formConcluir.parentNode.replaceChild(novoConcluir, formConcluir);

        novoConcluir.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = novoConcluir.querySelector('[name="documento_id"]').value;
            const data = {
                decisao: novoConcluir.querySelector('[name="decisao"]').value,
                texto_conclusao: novoConcluir.querySelector('[name="texto_conclusao"]').value
            };
            try {
                await API.put(`/documentos/${id}/finalizar`, data);
                UI.closeModal('modalConcluir');
                UI.showToast('Processo finalizado!');
                carregarDocumentos();
            } catch (error) { UI.showToast('Erro ao concluir.', 'error'); }
        });
        novoConcluir.closest('.modal-card').querySelectorAll('.close-custom').forEach(b => b.onclick = () => UI.closeModal('modalConcluir'));
    }
}

// --- DETALHES E IMPRESSÃO (COM SUPORTE A TAGS) ---

export async function verDetalhes(id) {
    try {
        const doc = await API.get(`/documentos/${id}`);
        
        let extrasHtml = '';
        
        // Exibe dados extras genéricos
        if (doc.dados_extras) {
            for (const [key, value] of Object.entries(doc.dados_extras)) {
                if(!key.startsWith('assunto_') && key !== 'tags' && value) 
                    extrasHtml += `<p><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${value}</p>`;
            }
        }

        // Exibe Tags no Detalhe (se houver no JSON)
        let tagsHtml = '';
        if (doc.dados_extras && doc.dados_extras.tags && Array.isArray(doc.dados_extras.tags)) {
            tagsHtml = '<div style="margin:10px 0;"><strong>Classificação (IA/Manual):</strong><div style="display:flex; gap:5px; flex-wrap:wrap; margin-top:5px;">' + 
                doc.dados_extras.tags.map(t => `<span class="badge" style="background:#e0e7ff; color:#3730a3; border:none; padding:4px 8px;">${t}</span>`).join('') + 
                '</div></div>';
        }

        let anexosHtml = '';
        if (doc.anexos && doc.anexos.length > 0) {
            anexosHtml = '<div style="margin-top:10px;"><strong>Anexos Adicionais:</strong><ul style="list-style:none; padding:0;">';
            doc.anexos.forEach(a => {
                anexosHtml += `<li style="padding:5px 0;"><a href="${a.caminho}" target="_blank" style="color:var(--primary-color); text-decoration:none;"><i class="ph ph-file-pdf"></i> ${a.nome_arquivo}</a> <span style="font-size:0.75rem; color:#999;">(${new Date(a.data_upload).toLocaleDateString()})</span></li>`;
            });
            anexosHtml += '</ul></div>';
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
                    <span class="badge ${getStatusClass(doc.status)}">${doc.status}</span>
                </div>
                <p><strong>Requerente:</strong> ${doc.requerente_nome} (${doc.requerente_cpf})</p>
                <p><strong>Assunto:</strong> ${doc.assunto}</p>
                ${extrasHtml}
                ${tagsHtml}
                
                <div style="background:#f0f9ff; padding:10px; border-radius:6px; border:1px solid #bae6fd; margin:15px 0;">
                    ${doc.caminho_anexo ? `<a href="${doc.caminho_anexo}" target="_blank" class="btn-primary" style="display:inline-flex; align-items:center; gap:5px; text-decoration:none; font-size:0.85rem; padding:5px 10px; margin-right:10px;"><i class="ph ph-file-pdf"></i> Documento Original</a>` : '<span>Sem documento original.</span>'}
                    ${anexosHtml}
                </div>

                <div style="text-align:right;">
                    <button id="btnImprimirComprovante" class="btn-secondary" style="font-size:0.8rem;"><i class="ph ph-printer"></i> Imprimir Comprovante</button>
                </div>

                <hr style="margin: 15px 0; border:0; border-top:1px solid #eee;">
                <h4>Histórico de Tramitação</h4>
                <div style="margin-top: 10px;">${historicoHtml}</div>
            </div>
        `;
        
        mostrarModalDetalhes(content);
        setTimeout(() => { 
            const b = document.getElementById('btnImprimirComprovante'); 
            if(b) b.onclick = () => imprimirComprovante(doc); 
        }, 100);

    } catch (error) { UI.showToast('Erro ao carregar detalhes', 'error'); }
}

function imprimirComprovante(doc) {
    const w = window.open('','','width=800'); 
    w.document.write(`<html><body><h1>Protocolo: ${doc.numero_protocolo}</h1><p>Assunto: ${doc.assunto}</p><script>window.print()</script></body></html>`); 
    w.document.close();
}

function mostrarModalDetalhes(content) {
    const div = document.createElement('div');
    div.className = 'modal-overlay';
    div.innerHTML = `<div class="modal-card" style="max-width: 600px; position:relative;"><button class="close-custom" style="position:absolute;top:10px;right:10px">X</button>${content}</div>`;
    document.body.appendChild(div);
    div.querySelector('.close-custom').onclick = () => div.remove();
    div.addEventListener('click', (e) => { if(e.target===div) div.remove(); });
}

// --- EDIÇÃO E ARQUIVAMENTO ---

async function abrirModalEdicao(id) {
    try {
        const doc = await API.get(`/documentos/${id}`);
        document.getElementById('editDocId').value = doc.id;
        document.getElementById('editNome').value = doc.requerente_nome;
        document.getElementById('editAssunto').value = doc.assunto;
        UI.openModal('modalEditarDocumento');
    } catch (error) { UI.showToast('Erro ao carregar dados', 'error'); }
}

function setupEditarDocumento() {
    const form = document.getElementById('formEditarDocumento');
    if(!form) return;
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(newForm);
        const d = { requerente_nome: formData.get('requerente_nome'), assunto: formData.get('assunto') };
        try {
            await API.put(`/documentos/${formData.get('id')}`, d);
            UI.closeModal('modalEditarDocumento');
            carregarDocumentos();
        } catch (error) { UI.showToast('Erro ao salvar', 'error'); }
    });
    newForm.closest('.modal-card').querySelector('.close-modal').onclick = () => UI.closeModal('modalEditarDocumento');
}

async function arquivarDocumento(id) {
    if(!confirm('Deseja arquivar?')) return;
    try { 
        await API.delete(`/documentos/${id}`); 
        carregarDocumentos();
    } catch (error) { UI.showToast('Erro.', 'error'); }
}

// --- LÓGICA NOVA: IA E TAGS ---

function renderTags() {
    const container = document.getElementById('aiTagsContainer');
    if (!container) return;
    
    if (tagsAtuais.length === 0) {
        container.innerHTML = '<span style="color:#999; font-size:0.8rem;">Digite o assunto para gerar sugestões...</span>';
        return;
    }

    container.innerHTML = '';
    tagsAtuais.forEach((tag, index) => {
        const chip = document.createElement('div');
        chip.className = 'tag-chip';
        chip.innerHTML = `${tag} <i class="ph ph-x-circle" data-index="${index}" style="cursor:pointer; margin-left:5px;"></i>`;
        
        // Remove tag ao clicar no X
        chip.querySelector('i').onclick = () => {
            tagsAtuais.splice(index, 1);
            renderTags();
        };
        container.appendChild(chip);
    });
}

export function setupNovoDocumento() {
    const form = document.getElementById('formNovoDocumento');
    if(!form) return;

    // Reset de tags e form ao abrir/fechar
    tagsAtuais = [];
    renderTags();

    form.querySelector('.btn-secondary').onclick = () => { 
        UI.closeModal('modalNovoDocumento'); 
        form.reset(); 
        tagsAtuais = []; 
        renderTags(); 
    };
    
    // Configura botões de fechar do modal
    const btnsClose = form.closest('.modal-card').querySelectorAll('.close-custom');
    if(btnsClose) btnsClose.forEach(b => b.onclick = () => UI.closeModal('modalNovoDocumento'));

    // Alterna campos dependendo da categoria
    document.getElementById('selectCategoria').onchange = (e) => { 
        document.getElementById('fieldsServidor').classList.toggle('hidden-field', e.target.value !== 'Servidor');
        document.getElementById('fieldsAcademico').classList.toggle('hidden-field', e.target.value !== 'Academico');
    };

    // --- LÓGICA DA IA (Debounce) ---
    let timeoutIA = null;
    const inputsAssunto = [document.getElementById('assuntoServidor'), document.getElementById('assuntoAcademico')];
    const loadingEl = document.getElementById('aiLoading');

    inputsAssunto.forEach(input => {
        if(!input) return;
        input.addEventListener('input', (e) => {
            const texto = e.target.value;
            clearTimeout(timeoutIA);
            
            if(texto.length > 4) {
                if(loadingEl) loadingEl.style.display = 'inline-block';
                
                timeoutIA = setTimeout(async () => {
                    try {
                        // Chama o endpoint de análise
                        const res = await API.post('/ia/analisar', { texto });
                        
                        // Mescla tags novas com as existentes (sem duplicar)
                        if(res.tags && Array.isArray(res.tags)){
                            res.tags.forEach(t => { if(!tagsAtuais.includes(t)) tagsAtuais.push(t); });
                            renderTags();
                        }
                    } catch(err) { 
                        console.error('Erro IA', err); 
                    } finally { 
                        if(loadingEl) loadingEl.style.display = 'none'; 
                    }
                }, 1000); // Espera 1s após parar de digitar
            }
        });
    });

    // Adicionar Tag Manualmente
    const manualInput = document.getElementById('manualTagInput');
    if(manualInput) {
        manualInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') {
                e.preventDefault();
                const val = e.target.value.trim();
                if(val && !tagsAtuais.includes(val)) {
                    tagsAtuais.push(val);
                    renderTags();
                    e.target.value = '';
                }
            }
        });
    }

    // Submit do Formulário
    form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const c = formData.get('categoria'); 
        
        // Define o assunto correto baseado na categoria
        if (c === 'Servidor') formData.append('assunto', formData.get('assunto_servidor'));
        else formData.append('assunto', formData.get('assunto_academico'));
        
        // Anexa as Tags Finais ao envio (string separada por vírgula)
        if(tagsAtuais.length > 0) {
            formData.append('tags_finais', tagsAtuais.join(','));
        }

        try {
            const res = await API.upload('/documentos', formData);
            UI.closeModal('modalNovoDocumento');
            UI.showToast(`Protocolo ${res.protocolo} gerado!`);
            
            form.reset();
            tagsAtuais = [];
            renderTags();
            
            if(document.getElementById('tabelaDocumentos')) {
                const searchInput = document.getElementById('globalSearch');
                initDocumentos(searchInput ? searchInput.value : '');
            }
            
            if(confirm('Documento criado! Deseja imprimir o comprovante agora?')) {
                // Busca o doc completo recém criado para imprimir
                const docRecemCriado = await API.get(`/documentos/${res.id}`);
                imprimirComprovante(docRecemCriado);
            }

        } catch(err) { 
            UI.showToast('Erro ao criar: ' + (err.erro || 'Erro desconhecido'), 'error'); 
        }
    };
}

function getStatusClass(status) {
    if(status === 'Recebido') return 'recebido';
    if(status === 'Em Análise') return 'analise';
    if(status === 'Finalizado') return 'finalizado';
    return '';
}