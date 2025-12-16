import { API } from '../api.js';
import { UI } from '../ui.js';
import { setupTramitacao } from './tramitacao.js';

// --- INICIALIZAÇÃO E LISTAGEM ---

// Aceita o termo de busca para filtrar ao iniciar
export async function initDocumentos(termoBusca = '') {
    const contentArea = document.getElementById('contentArea');
    
    // Carrega setores para o filtro
    let setoresHtml = '<option value="">Todos os Setores</option>';
    try {
        const setores = await API.get('/setores');
        setoresHtml += setores.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
    } catch(e) { console.error('Erro ao carregar setores', e); }

    // HTML da barra de ferramentas com aviso de filtro e novo Select de Setor
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
    `;

    // Carrega documentos aplicando o filtro de busca inicial
    await carregarDocumentos({ busca: termoBusca });
    
    // Inicializa listeners dos modais
    setupEditarDocumento();
    setupAnexarEConcluir();

    // Eventos de mudança nos dropdowns (Unificados)
    const onChangeFilter = () => {
        carregarDocumentos({ 
            status: document.getElementById('filtroStatus').value, 
            categoria: document.getElementById('filtroCategoria').value, 
            setor_id: document.getElementById('filtroSetor').value, // Envia o ID do setor
            busca: termoBusca 
        });
    };

    document.getElementById('filtroStatus').addEventListener('change', onChangeFilter);
    document.getElementById('filtroCategoria').addEventListener('change', onChangeFilter);
    document.getElementById('filtroSetor').addEventListener('change', onChangeFilter); // Listener do setor
    
    // Botão "X" para limpar a busca
    const btnLimpar = document.getElementById('btnLimparBadge');
    if(btnLimpar) {
        btnLimpar.addEventListener('click', () => {
            const searchInput = document.getElementById('globalSearch');
            if(searchInput) searchInput.value = ''; // Limpa o input no topo
            initDocumentos(); // Recarrega sem filtro
        });
    }
}

async function carregarDocumentos(filtros = {}) {
    try {
        // Monta Query String
        let qs = '?';
        if(filtros.status) qs += `status=${filtros.status}&`;
        if(filtros.categoria) qs += `categoria=${filtros.categoria}&`;
        if(filtros.setor_id) qs += `setor_id=${filtros.setor_id}&`; // Adiciona à URL
        if(filtros.busca) qs += `busca=${encodeURIComponent(filtros.busca)}&`;

        const docs = await API.get(`/documentos${qs}`);

        // Adicionado 'Setor Atual' na lista de colunas
        UI.renderTable('tabelaDocumentos', 
            ['Protocolo', 'Categoria', 'Requerente', 'Assunto', 'Setor Atual', 'Status', 'Ações'], 
            docs, 
            (doc) => {
                // Esconde ações de edição se estiver finalizado
                const isFinalizado = doc.status === 'Finalizado' || doc.status === 'Arquivado';
                const styleBtn = isFinalizado ? 'display:none;' : '';

                return `
                <tr>
                    <td style="font-weight:600; color:var(--primary-color)">${doc.numero_protocolo}</td>
                    <td><span class="badge" style="background:${doc.categoria === 'Servidor' ? '#e0e7ff' : '#fce7f3'}; color:${doc.categoria === 'Servidor' ? '#3730a3' : '#9d174d'}">${doc.categoria}</span></td>
                    <td>
                        <div style="font-weight:500">${doc.requerente_nome}</div>
                        <div style="font-size:0.75rem; color:#64748b">Mat: ${doc.requerente_matricula || 'N/A'}</div>
                    </td>
                    <td>${doc.assunto}</td>
                    <td style="font-size:0.85rem; color:#475569;">${doc.nome_setor_atual || '-'}</td>
                    <td><span class="badge ${getStatusClass(doc.status)}">${doc.status}</span></td>
                    <td class="acoes-col">
                        <button class="btn-icon btn-ver" data-id="${doc.id}" title="Ver Detalhes"><i class="ph ph-eye"></i></button>
                        
                        <button class="btn-icon btn-anexar" data-id="${doc.id}" data-proto="${doc.numero_protocolo}" title="Anexar Arquivo" style="${styleBtn}"><i class="ph ph-paperclip"></i></button>
                        <button class="btn-icon btn-concluir" data-id="${doc.id}" title="Concluir/Dar Parecer" style="${styleBtn} color:#059669;"><i class="ph ph-check-square"></i></button>
                        
                        <button class="btn-icon btn-tramitar" data-id="${doc.id}" title="Tramitar" style="${styleBtn}"><i class="ph ph-paper-plane-right"></i></button>
                        <button class="btn-icon btn-editar" data-id="${doc.id}" title="Editar" style="${styleBtn}"><i class="ph ph-pencil-simple"></i></button>
                        <button class="btn-icon btn-arquivar" data-id="${doc.id}" title="Arquivar" style="color:var(--danger); ${styleBtn}"><i class="ph ph-archive"></i></button>
                    </td>
                </tr>
            `}
        );

        // Atribui eventos aos botões
        document.querySelectorAll('.btn-ver').forEach(btn => btn.addEventListener('click', () => verDetalhes(btn.dataset.id)));
        document.querySelectorAll('.btn-tramitar').forEach(btn => btn.addEventListener('click', () => setupTramitacao(btn.dataset.id)));
        document.querySelectorAll('.btn-editar').forEach(btn => btn.addEventListener('click', () => abrirModalEdicao(btn.dataset.id)));
        document.querySelectorAll('.btn-arquivar').forEach(btn => btn.addEventListener('click', () => arquivarDocumento(btn.dataset.id)));
        document.querySelectorAll('.btn-anexar').forEach(btn => btn.addEventListener('click', () => abrirModalAnexar(btn.dataset.id, btn.dataset.proto)));
        document.querySelectorAll('.btn-concluir').forEach(btn => btn.addEventListener('click', () => abrirModalConcluir(btn.dataset.id)));

    } catch (error) {
        UI.showToast('Erro ao carregar lista.', 'error');
    }
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

// --- DETALHES E IMPRESSÃO ---

export async function verDetalhes(id) {
    try {
        const doc = await API.get(`/documentos/${id}`);
        
        let extrasHtml = '';
        if (doc.dados_extras) {
            extrasHtml = '<div style="background:#f8fafc; padding:10px; border-radius:6px; margin:10px 0; font-size:0.9rem;">';
            for (const [key, value] of Object.entries(doc.dados_extras)) {
                if(!key.startsWith('assunto_') && value) 
                    extrasHtml += `<p><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${value}</p>`;
            }
            extrasHtml += '</div>';
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
    let dadosExtrasPrint = '';
    if (doc.dados_extras) {
        for (const [key, value] of Object.entries(doc.dados_extras)) {
            const label = key.charAt(0).toUpperCase() + key.slice(1);
            if(value) dadosExtrasPrint += `<div class="field"><span class="label">${label}:</span> <span class="value">${value}</span></div>`;
        }
    }
    const html = `<html><head><title>Comprovante</title><style>body{font-family:'Courier New',Courier;padding:40px}.header{text-align:center;border-bottom:2px solid #000;padding-bottom:20px;margin-bottom:30px}.protocolo-box{border:2px solid #000;padding:15px;text-align:center;margin-bottom:30px;background:#f0f0f0}.protocolo-num{font-size:28px;font-weight:bold}.section{margin-bottom:25px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:15px}.field{margin-bottom:8px}.label{font-weight:bold}.value{border-bottom:1px dotted #ccc}</style></head><body>
    <div class="header"><h1>Comprovante de Protocolo</h1></div>
    <div class="protocolo-box"><div class="protocolo-num">${doc.numero_protocolo}</div></div>
    <div class="section"><strong>Requerente:</strong> ${doc.requerente_nome} (${doc.requerente_cpf})</div>
    <div class="section"><strong>Assunto:</strong> ${doc.assunto}</div>
    <div class="grid">${dadosExtrasPrint}</div>
    <script>window.print();</script></body></html>`;
    const w = window.open('','','width=800,height=900'); w.document.write(html); w.document.close();
}

function mostrarModalDetalhes(content) {
    const div = document.createElement('div');
    div.className = 'modal-overlay';
    div.innerHTML = `<div class="modal-card" style="max-width: 600px;"><div class="modal-header"><h2>Detalhes</h2><button class="close-custom"><i class="ph ph-x"></i></button></div>${content}</div>`;
    document.body.appendChild(div);
    div.querySelector('.close-custom').onclick = () => div.remove();
    div.addEventListener('click', (e) => { if(e.target===div) div.remove(); });
}

// --- EDIÇÃO E ARQUIVAMENTO ---

async function abrirModalEdicao(id) {
    try {
        const doc = await API.get(`/documentos/${id}`);
        document.getElementById('editDocId').value = doc.id;
        document.getElementById('editCategoriaHidden').value = doc.categoria;
        document.getElementById('editNome').value = doc.requerente_nome;
        document.getElementById('editCpf').value = doc.requerente_cpf;
        document.getElementById('editMatricula').value = doc.requerente_matricula || '';
        document.getElementById('editTelefone').value = doc.requerente_telefone || '';
        document.getElementById('editEmail').value = doc.requerente_email || '';
        document.getElementById('editAssunto').value = doc.assunto;
        const container = document.getElementById('editExtraFields');
        container.innerHTML = '';
        if (doc.dados_extras) {
            for (const [key, value] of Object.entries(doc.dados_extras)) {
                if (!value || value.trim() === '' || key.startsWith('assunto_')) continue;
                const label = key.charAt(0).toUpperCase() + key.slice(1);
                container.innerHTML += `<div class="form-group"><label>${label}</label><input type="text" name="extra_${key}" value="${value}"></div>`;
            }
        }
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
        const id = formData.get('id');
        const dados = {
            requerente_nome: formData.get('requerente_nome'),
            requerente_cpf: formData.get('requerente_cpf'),
            requerente_matricula: formData.get('requerente_matricula'),
            requerente_email: formData.get('requerente_email'),
            requerente_telefone: formData.get('requerente_telefone'),
            assunto: formData.get('assunto'),
            dados_extras: {}
        };
        for (const [key, value] of formData.entries()) {
            if (key.startsWith('extra_')) dados.dados_extras[key.replace('extra_', '')] = value;
        }
        try {
            await API.put(`/documentos/${id}`, dados);
            UI.closeModal('modalEditarDocumento');
            UI.showToast('Atualizado!');
            // Tenta recarregar lista se existir
            const searchInput = document.getElementById('globalSearch');
            if(document.getElementById('tabelaDocumentos')) initDocumentos(searchInput ? searchInput.value : '');
        } catch (error) { UI.showToast('Erro ao salvar', 'error'); }
    });
    newForm.closest('.modal-card').querySelectorAll('.close-modal, .btn-secondary').forEach(el => 
        el.addEventListener('click', () => UI.closeModal('modalEditarDocumento'))
    );
}

async function arquivarDocumento(id) {
    if(!confirm('Deseja arquivar?')) return;
    try { 
        await API.delete(`/documentos/${id}`); 
        UI.showToast('Arquivado.'); 
        const searchInput = document.getElementById('globalSearch');
        initDocumentos(searchInput ? searchInput.value : ''); 
    } catch (error) { UI.showToast('Erro.', 'error'); }
}

// --- CADASTRO DE NOVO PROTOCOLO ---

export function setupNovoDocumento() {
    const form = document.getElementById('formNovoDocumento');
    const selectCat = document.getElementById('selectCategoria');
    const fieldsServidor = document.getElementById('fieldsServidor');
    const fieldsAcademico = document.getElementById('fieldsAcademico');
    const assuntoServidor = document.getElementById('assuntoServidor');
    const assuntoAcademico = document.getElementById('assuntoAcademico');

    if(!form) return;

    // Garante que o botão Cancelar funcione
    form.querySelectorAll('.close-modal, .btn-secondary').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault(); // Previne qualquer submit acidental
            UI.closeModal('modalNovoDocumento');
            form.reset();
        };
    });

    // Lógica do Select de Categoria
    selectCat.onchange = (e) => {
        const val = e.target.value;
        if(val === 'Servidor') {
            fieldsServidor.classList.remove('hidden-field');
            fieldsAcademico.classList.add('hidden-field');
            assuntoServidor.setAttribute('required', 'true');
            assuntoAcademico.removeAttribute('required');
        } else if(val === 'Academico') {
            fieldsAcademico.classList.remove('hidden-field');
            fieldsServidor.classList.add('hidden-field');
            assuntoAcademico.setAttribute('required', 'true');
            assuntoServidor.removeAttribute('required');
        } else {
            fieldsServidor.classList.add('hidden-field');
            fieldsAcademico.classList.add('hidden-field');
        }
    };

    // Submit do Formulário
    form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const categoria = formData.get('categoria');
        
        if (categoria === 'Servidor') formData.append('assunto', formData.get('assunto_servidor'));
        else formData.append('assunto', formData.get('assunto_academico'));

        try {
            const res = await API.upload('/documentos', formData);
            UI.closeModal('modalNovoDocumento');
            UI.showToast(`Protocolo ${res.protocolo} gerado!`);
            form.reset();
            fieldsServidor.classList.add('hidden-field');
            fieldsAcademico.classList.add('hidden-field');
            
            // Recarrega a lista se estiver na tela de documentos
            if(document.getElementById('tabelaDocumentos')) {
                const searchInput = document.getElementById('globalSearch');
                initDocumentos(searchInput ? searchInput.value : '');
            }
            
            if(confirm('Documento criado! Deseja imprimir o comprovante agora?')) {
                const docRecemCriado = await API.get(`/documentos/${res.id}`);
                imprimirComprovante(docRecemCriado);
            }

        } catch (error) {
            UI.showToast('Erro ao registrar: ' + (error.erro || 'Erro desconhecido'), 'error');
        }
    };
}

function getStatusClass(status) {
    if(status === 'Recebido') return 'recebido';
    if(status === 'Em Análise') return 'analise';
    if(status === 'Finalizado') return 'finalizado';
    return '';
}