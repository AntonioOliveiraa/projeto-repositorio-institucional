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
                ${termoBusca ? `<span class="badge" style="background:#fef3c7; color:#d97706; display:flex; align-items:center; padding: 0 10px;">Filtrando por: "${termoBusca}" <i class="ph ph-x" style="cursor:pointer; margin-left:5px;" id="btnLimparBadge"></i></span>` : ''}
                
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
            document.getElementById('globalSearch').value = '';
            initDocumentos(); // Recarrega limpo
        });
    }
}

async function carregarDocumentos(filtros = {}) {
    try {
        let queryString = '?';
        if(filtros.status) queryString += `status=${filtros.status}&`;
        if(filtros.categoria) queryString += `categoria=${filtros.categoria}&`;
        if(filtros.busca) queryString += `busca=${encodeURIComponent(filtros.busca)}&`;

        const docs = await API.get(`/documentos${queryString}`);

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
                    <td class="acoes-col">
                        <button class="btn-icon btn-ver" data-id="${doc.id}" title="Ver Detalhes"><i class="ph ph-eye"></i></button>
                        <button class="btn-icon btn-editar" data-id="${doc.id}" title="Editar"><i class="ph ph-pencil-simple"></i></button>
                        <button class="btn-icon btn-tramitar" data-id="${doc.id}" title="Tramitar"><i class="ph ph-paper-plane-right"></i></button>
                        <button class="btn-icon btn-arquivar" data-id="${doc.id}" title="Arquivar" style="color:var(--danger)"><i class="ph ph-archive"></i></button>
                    </td>
                </tr>
            `
        );

        document.querySelectorAll('.btn-ver').forEach(btn => btn.addEventListener('click', () => verDetalhes(btn.dataset.id)));
        document.querySelectorAll('.btn-tramitar').forEach(btn => btn.addEventListener('click', () => setupTramitacao(btn.dataset.id)));
        document.querySelectorAll('.btn-editar').forEach(btn => btn.addEventListener('click', () => abrirModalEdicao(btn.dataset.id)));
        document.querySelectorAll('.btn-arquivar').forEach(btn => btn.addEventListener('click', () => arquivarDocumento(btn.dataset.id)));

    } catch (error) {
        UI.showToast('Erro ao carregar lista.', 'error');
    }
}

// --- Funções de Detalhes, Edição, Arquivamento e Cadastro (Mantidas e Reexportadas) ---

export async function verDetalhes(id) {
    try {
        const doc = await API.get(`/documentos/${id}`);
        let extrasHtml = '';
        if (doc.dados_extras) {
            extrasHtml = '<div style="background:#f8fafc; padding:10px; border-radius:6px; margin:10px 0; font-size:0.9rem;">';
            for (const [key, value] of Object.entries(doc.dados_extras)) {
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
                <div style="display:flex; gap: 10px; margin: 15px 0;">
                    ${doc.caminho_anexo ? `<a href="${doc.caminho_anexo}" target="_blank" class="btn-primary" style="display:inline-flex; align-items:center; gap:5px; text-decoration:none; font-size:0.85rem; padding:8px 16px;"><i class="ph ph-file-pdf"></i> Ver Anexo</a>` : ''}
                    <button id="btnImprimirComprovante" class="btn-secondary" style="display:inline-flex; align-items:center; gap:5px; font-size:0.85rem; padding:8px 16px;"><i class="ph ph-printer"></i> Imprimir Comprovante</button>
                </div>
                <hr style="margin: 15px 0; border:0; border-top:1px solid #eee;">
                <h4>Histórico de Tramitação</h4>
                <div style="margin-top: 10px;">${historicoHtml}</div>
            </div>
        `;
        mostrarModalDetalhes(content);
        setTimeout(() => { const btn = document.getElementById('btnImprimirComprovante'); if(btn) btn.onclick = () => imprimirComprovante(doc); }, 100);
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


// --- Funções Auxiliares (Modal, Scroll, etc) ---
function mostrarModalDetalhes(content) {
    const div = document.createElement('div');
    div.className = 'modal-overlay';
    div.innerHTML = `<div class="modal-card" style="max-width: 600px; position:relative;"><div class="modal-header"><h2>Detalhes</h2><button class="close-custom"><i class="ph ph-x"></i></button></div>${content}</div>`;
    document.body.appendChild(div);
    div.querySelector('.close-custom').onclick = () => div.remove();
    div.addEventListener('click', (e) => { if(e.target===div) div.remove(); });
}

// --- Edição e Arquivamento (Mantidos) ---
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
    // Remove listeners antigos clonando (hack rápido) ou apenas garante um único addEventListener na init
    // Como setupEditarDocumento é chamado na init, garanta que não duplique
    form.replaceWith(form.cloneNode(true)); 
    const newForm = document.getElementById('formEditarDocumento');
    
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
            // Reaplica busca se houver
            const searchInput = document.getElementById('globalSearch');
            initDocumentos(searchInput ? searchInput.value : ''); 
        } catch (error) { UI.showToast('Erro ao salvar', 'error'); }
    });
    // Reatacha fechar modal pois cloneNode mata eventos
    newForm.closest('.modal-card').querySelector('.close-modal').addEventListener('click', () => UI.closeModal('modalEditarDocumento'));
    newForm.querySelector('.btn-secondary').addEventListener('click', () => UI.closeModal('modalEditarDocumento'));
}

async function arquivarDocumento(id) {
    if(!confirm('Deseja arquivar?')) return;
    try { await API.delete(`/documentos/${id}`); UI.showToast('Arquivado.'); initDocumentos(); } catch (error) { UI.showToast('Erro.', 'error'); }
}

// --- Lógica de Cadastro ---
export function setupNovoDocumento() {
    const form = document.getElementById('formNovoDocumento');
    const selectCat = document.getElementById('selectCategoria');
    const fieldsServidor = document.getElementById('fieldsServidor');
    const fieldsAcademico = document.getElementById('fieldsAcademico');
    if(!form) return;
    selectCat.addEventListener('change', (e) => {
        const val = e.target.value;
        if(val==='Servidor') { fieldsServidor.classList.remove('hidden-field'); fieldsAcademico.classList.add('hidden-field'); document.getElementById('assuntoServidor').required=true; document.getElementById('assuntoAcademico').required=false;}
        else if(val==='Academico') { fieldsAcademico.classList.remove('hidden-field'); fieldsServidor.classList.add('hidden-field'); document.getElementById('assuntoAcademico').required=true; document.getElementById('assuntoServidor').required=false;}
        else { fieldsServidor.classList.add('hidden-field'); fieldsAcademico.classList.add('hidden-field'); }
    });
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const cat = formData.get('categoria');
        formData.append('assunto', cat==='Servidor' ? formData.get('assunto_servidor') : formData.get('assunto_academico'));
        try {
            const res = await API.upload('/documentos', formData);
            UI.closeModal('modalNovoDocumento');
            UI.showToast(`Protocolo ${res.protocolo} gerado!`);
            form.reset();
            fieldsServidor.classList.add('hidden-field');
            fieldsAcademico.classList.add('hidden-field');
            if(document.getElementById('tabelaDocumentos')) initDocumentos();
            if(confirm('Imprimir comprovante?')) { const d = await API.get(`/documentos/${res.id}`); imprimirComprovante(d); }
        } catch (error) { UI.showToast('Erro.', 'error'); }
    });
}

function getStatusClass(s) { return s==='Recebido'?'recebido':s==='Em Análise'?'analise':'finalizado'; }