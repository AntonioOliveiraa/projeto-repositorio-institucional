import { API } from '../api.js';
import { UI } from '../ui.js';
import { setupTramitacao } from './tramitacao.js';

// Inicializa a tela de Documentos com filtros e tabela
export async function initDocumentos(termoBusca = '') {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <div class="toolbar" style="display:flex; justify-content:space-between; margin-bottom: 1rem;">
            <h2>Gestão de Documentos</h2>
            <div style="display:flex; gap: 10px;">
                ${termoBusca ? `<span class="badge" style="background:#fef3c7; color:#d97706; display:flex; align-items:center; padding:0 10px;">Filtrando: "${termoBusca}" <i class="ph ph-x" style="cursor:pointer; margin-left:5px;" id="btnLimparBadge"></i></span>` : ''}
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

    // Carrega documentos passando o termo
    await carregarDocumentos({ busca: termoBusca });
    setupEditarDocumento();

    // Eventos dos filtros
    document.getElementById('filtroStatus').addEventListener('change', (e) => carregarDocumentos({ status: e.target.value, busca: termoBusca }));
    document.getElementById('filtroCategoria').addEventListener('change', (e) => carregarDocumentos({ categoria: e.target.value, busca: termoBusca }));
    
    // Limpar busca pelo X do badge
    const btnLimpar = document.getElementById('btnLimparBadge');
    if(btnLimpar) {
        btnLimpar.addEventListener('click', () => { 
            const globalSearch = document.getElementById('globalSearch');
            if(globalSearch) globalSearch.value = ''; 
            initDocumentos(); 
        });
    }
}

async function carregarDocumentos(filtros = {}) {
    try {
        let qs = '?';
        if(filtros.status) qs += `status=${filtros.status}&`;
        if(filtros.categoria) qs += `categoria=${filtros.categoria}&`;
        if(filtros.busca) qs += `busca=${encodeURIComponent(filtros.busca)}&`;

        const docs = await API.get(`/documentos${qs}`);

        UI.renderTable('tabelaDocumentos', 
            ['Protocolo', 'Categoria', 'Requerente', 'Assunto', 'Status', 'Ações'], 
            docs, 
            (doc) => {
                // Se finalizado, esconde botões de edição/conclusão/tramitação padrão se desejado, 
                // mas mantendo visualização. Aqui seguiremos a lógica do seu snippet.
                const isFinalizado = doc.status === 'Finalizado' || doc.status === 'Arquivado';
                const styleBtn = isFinalizado ? 'display:none;' : '';

                return `
                <tr>
                    <td style="font-weight:600; color:var(--primary-color)">${doc.numero_protocolo}</td>
                    <td><span class="badge" style="background:${doc.categoria === 'Servidor' ? '#e0e7ff' : '#fce7f3'}; color:${doc.categoria === 'Servidor' ? '#3730a3' : '#9d174d'}">${doc.categoria}</span></td>
                    <td><div style="font-weight:500">${doc.requerente_nome}</div></td>
                    <td>${doc.assunto}</td>
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
            ` }
        );

        document.querySelectorAll('.btn-ver').forEach(btn => btn.addEventListener('click', () => verDetalhes(btn.dataset.id)));
        document.querySelectorAll('.btn-tramitar').forEach(btn => btn.addEventListener('click', () => setupTramitacao(btn.dataset.id)));
        document.querySelectorAll('.btn-editar').forEach(btn => btn.addEventListener('click', () => abrirModalEdicao(btn.dataset.id)));
        document.querySelectorAll('.btn-arquivar').forEach(btn => btn.addEventListener('click', () => arquivarDocumento(btn.dataset.id)));
        
        // Listeners novos
        document.querySelectorAll('.btn-anexar').forEach(btn => btn.addEventListener('click', () => abrirModalAnexar(btn.dataset.id, btn.dataset.proto)));
        document.querySelectorAll('.btn-concluir').forEach(btn => btn.addEventListener('click', () => abrirModalConcluir(btn.dataset.id)));

    } catch (error) { console.error(error); UI.showToast('Erro ao carregar lista.', 'error'); }
}

// --- Funções de Anexar e Concluir ---

function abrirModalAnexar(id, protocolo) {
    const inputId = document.getElementById('anexarDocId');
    const displayProto = document.getElementById('anexarProtocoloDisplay');
    
    if(inputId) inputId.value = id;
    if(displayProto) displayProto.textContent = protocolo;
    
    UI.openModal('modalAnexar');
}

function abrirModalConcluir(id) {
    const inputId = document.getElementById('concluirDocId');
    if(inputId) inputId.value = id;
    UI.openModal('modalConcluir');
}

function setupAnexarEConcluir() {
    const formAnexar = document.getElementById('formAnexar');
    if(formAnexar) {
        // Clone para evitar múltiplos listeners
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
                carregarDocumentos(); // Atualiza lista
            } catch (error) { UI.showToast('Erro ao anexar.', 'error'); }
        });
        // Reatacha fechar
        const modal = novoAnexar.closest('.modal-card');
        if(modal) modal.querySelectorAll('.close-custom').forEach(b => b.onclick = () => UI.closeModal('modalAnexar'));
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
        const modal = novoConcluir.closest('.modal-card');
        if(modal) modal.querySelectorAll('.close-custom').forEach(b => b.onclick = () => UI.closeModal('modalConcluir'));
    }
}

// --- Detalhes com Lista de Anexos ---
export async function verDetalhes(id) {
    try {
        const doc = await API.get(`/documentos/${id}`);
        
        // Renderiza Dados Extras
        let extrasHtml = '';
        if (doc.dados_extras) {
            extrasHtml = '<div style="background:#f8fafc; padding:10px; border-radius:6px; margin:10px 0; font-size:0.9rem;">';
            for (const [key, value] of Object.entries(doc.dados_extras)) {
                if(!key.startsWith('assunto_') && value) 
                    extrasHtml += `<p><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${value}</p>`;
            }
            extrasHtml += '</div>';
        }

        // Renderiza Anexos Extras
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
                    ${doc.caminho_anexo ? `<a href="${doc.caminho_anexo}" target="_blank" class="btn-primary" style="display:inline-flex; align-items:center; gap:5px; text-decoration:none; font-size:0.85rem; padding:5px 10px; margin-right:10px;"><i class="ph ph-file-pdf"></i> Documento Original</a>` : '<span style="color:#64748b; font-size:0.9rem;">Sem documento original.</span>'}
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
        setTimeout(() => { const b = document.getElementById('btnImprimirComprovante'); if(b) b.onclick = () => imprimirComprovante(doc); }, 100);

    } catch (error) { console.error(error); UI.showToast('Erro ao carregar detalhes', 'error'); }
}


// --- Funções Auxiliares (Modal, Edição, Cadastro, Impressão) ---

function mostrarModalDetalhes(content) {
    const div = document.createElement('div');
    div.className = 'modal-overlay';
    div.innerHTML = `<div class="modal-card" style="max-width: 600px; position:relative;"><div class="modal-header"><h2>Detalhes</h2><button class="close-custom"><i class="ph ph-x"></i></button></div>${content}</div>`;
    document.body.appendChild(div);
    div.querySelector('.close-custom').onclick = () => div.remove();
    div.addEventListener('click', (e) => { if(e.target===div) div.remove(); });
}

function imprimirComprovante(doc) {
    let dadosExtrasPrint = '';
    if (doc.dados_extras) {
        for (const [key, value] of Object.entries(doc.dados_extras)) {
            const label = key.charAt(0).toUpperCase() + key.slice(1);
            if(value && !key.startsWith('assunto_')) dadosExtrasPrint += `<div class="field"><span class="label">${label}:</span> <span class="value">${value}</span></div>`;
        }
    }
    const html = `<html><head><title>Comprovante</title><style>body{font-family:'Courier New',Courier;padding:40px}.header{text-align:center;border-bottom:2px solid #000;padding-bottom:20px;margin-bottom:30px}.protocolo-box{border:2px solid #000;padding:15px;text-align:center;margin-bottom:30px;background:#f0f0f0}.protocolo-num{font-size:28px;font-weight:bold}.section{margin-bottom:25px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:15px}.field{margin-bottom:8px}.label{font-weight:bold}.value{border-bottom:1px dotted #ccc}</style></head><body>
    <div class="header"><h1>Comprovante de Protocolo</h1></div>
    <div class="protocolo-box"><div class="protocolo-num">${doc.numero_protocolo}</div></div>
    <div class="section"><strong>Requerente:</strong> ${doc.requerente_nome} (${doc.requerente_cpf})</div>
    <div class="section"><strong>Assunto:</strong> ${doc.assunto}</div>
    <div class="grid">${dadosExtrasPrint}</div>
    <div class="section" style="margin-top:20px; font-size:12px; color:#666;">Documento gerado em ${new Date().toLocaleString()}</div>
    <script>window.print();</script></body></html>`;
    const w = window.open('','','width=800,height=900'); w.document.write(html); w.document.close();
}

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

        // Gerar campos extras dinamicamente
        const container = document.getElementById('editExtraFields');
        container.innerHTML = '';
        if (doc.dados_extras) {
            // doc.dados_extras já é objeto (parseado no controller)
            for (const [key, value] of Object.entries(doc.dados_extras)) {
                
                // --- PROTEÇÃO CONTRA CAMPOS VAZIOS OU INDESEJADOS ---
                // Se o valor for vazio, nulo ou se a chave for um campo de controle antigo
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
    
    // Substitui o formulário por um clone para remover listeners antigos
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

        // Captura os campos extras dinâmicos (prefixo "extra_")
        for (const [key, value] of formData.entries()) {
            if (key.startsWith('extra_')) {
                dados.dados_extras[key.replace('extra_', '')] = value;
            }
        }
        try {
            await API.put(`/documentos/${id}`, dados);
            UI.closeModal('modalEditarDocumento');
            UI.showToast('Atualizado!');
            initDocumentos(); 
        } catch (error) { UI.showToast('Erro ao salvar', 'error'); }
    });
    
    // Reatacha evento de fechar no botão cancelar e no X
    newForm.querySelectorAll('.close-modal, .btn-secondary').forEach(btn => {
        btn.addEventListener('click', () => UI.closeModal('modalEditarDocumento'));
    });
}

async function arquivarDocumento(id) {
    if(!confirm('Deseja realmente arquivar este documento?')) return;
    try { await API.delete(`/documentos/${id}`); UI.showToast('Documento arquivado.'); initDocumentos(); } catch (error) { UI.showToast('Erro ao arquivar.', 'error'); }
}

// --- Lógica de Cadastro ---
export function setupNovoDocumento() {
    const form = document.getElementById('formNovoDocumento');
    const selectCat = document.getElementById('selectCategoria');
    const fieldsServidor = document.getElementById('fieldsServidor');
    const fieldsAcademico = document.getElementById('fieldsAcademico');
    
    if(!form) return;
    
    // Evita múltiplos listeners se chamado mais de uma vez
    const novoForm = form.cloneNode(true);
    form.parentNode.replaceChild(novoForm, form);
    
    // Precisamos reatachar o evento do select pois o clone do form não clona eventos dos filhos automaticamente se anexados fora
    // Mas aqui vamos re-selecionar o select dentro do NOVO form
    const novoSelectCat = document.getElementById('selectCategoria'); // O ID é único, então pega o do novo form
    
    novoSelectCat.addEventListener('change', (e) => {
        const val = e.target.value;
        if(val==='Servidor') { 
            fieldsServidor.classList.remove('hidden-field'); 
            fieldsAcademico.classList.add('hidden-field'); 
            document.getElementById('assuntoServidor').required=true; 
            document.getElementById('assuntoAcademico').required=false;
        } else if(val==='Academico') { 
            fieldsAcademico.classList.remove('hidden-field'); 
            fieldsServidor.classList.add('hidden-field'); 
            document.getElementById('assuntoAcademico').required=true; 
            document.getElementById('assuntoServidor').required=false;
        } else { 
            fieldsServidor.classList.add('hidden-field'); 
            fieldsAcademico.classList.add('hidden-field'); 
        }
    });

    novoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(novoForm);
        const cat = formData.get('categoria');
        formData.append('assunto', cat==='Servidor' ? formData.get('assunto_servidor') : formData.get('assunto_academico'));
        try {
            const res = await API.upload('/documentos', formData);
            UI.closeModal('modalNovoDocumento');
            UI.showToast(`Protocolo ${res.protocolo} gerado!`);
            novoForm.reset();
            fieldsServidor.classList.add('hidden-field');
            fieldsAcademico.classList.add('hidden-field');
            
            // Se estiver na tela de listagem, atualiza
            if(document.getElementById('tabelaDocumentos')) initDocumentos();
            
            if(confirm('Deseja imprimir o comprovante agora?')) { 
                const d = await API.get(`/documentos/${res.id}`); 
                imprimirComprovante(d); 
            }
        } catch (error) { UI.showToast('Erro ao criar documento.', 'error'); }
    });
}

function getStatusClass(s) { 
    if(s === 'Recebido') return 'recebido';
    if(s === 'Em Análise') return 'analise';
    if(s === 'Finalizado') return 'finalizado';
    if(s === 'Arquivado') return 'arquivado'; // Adicionado caso precise
    return '';
}