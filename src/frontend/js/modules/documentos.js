import { API } from '../api.js';
import { UI } from '../ui.js';
import { setupTramitacao } from './tramitacao.js';

let currentPage = 1;
const itemsPerPage = 100;
let tagsAtuais = []; // Armazena as tags do modal

export async function initDocumentos(termoBusca = '') {
    currentPage = 1;
    const contentArea = document.getElementById('contentArea');
    
    let setoresHtml = '<option value="">Todos os Setores</option>';
    try { 
        const setores = await API.get('/setores'); 
        setoresHtml += setores.map(s => `<option value="${s.id}">${s.nome}</option>`).join(''); 
    } catch(e) {}

    contentArea.innerHTML = `
        <div class="toolbar" style="display:flex; justify-content:space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 10px;">
            <h2>Gestão de Documentos</h2>
            <div style="display:flex; gap: 10px; flex-wrap: wrap;">
                ${termoBusca ? `<span class="badge" style="background:#fef3c7; color:#d97706; display:flex; align-items:center; padding:0 10px;">Filtrando: "${termoBusca}" <i class="ph ph-x" style="cursor:pointer; margin-left:5px;" id="btnLimparBadge"></i></span>` : ''}
                <select id="filtroCategoria" style="padding: 8px; border-radius: 6px; border: 1px solid #ccc;"><option value="">Todas as Categorias</option><option value="Servidor">Servidores</option><option value="Academico">Acadêmicos</option></select>
                <select id="filtroSetor" style="padding: 8px; border-radius: 6px; border: 1px solid #ccc;">${setoresHtml}</select>
                <select id="filtroStatus" style="padding: 8px; border-radius: 6px; border: 1px solid #ccc;"><option value="">Todos os Status</option><option value="Recebido">Recebido</option><option value="Em Análise">Em Análise</option><option value="Finalizado">Finalizado</option></select>
            </div>
        </div>
        <div id="tabelaDocumentos"></div>
        <div id="paginationControls" style="display:flex; justify-content:center; align-items:center; gap:15px; margin-top:20px; padding-bottom:20px;"></div>
    `;

    await carregarDocumentos({ busca: termoBusca });
    setupEditarDocumento();
    setupAnexarEConcluir();
    setupNovoDocumento(); 

    const onChangeFilter = () => { currentPage = 1; carregarDocumentos({ status: document.getElementById('filtroStatus').value, categoria: document.getElementById('filtroCategoria').value, setor_id: document.getElementById('filtroSetor').value, busca: termoBusca }); };
    document.getElementById('filtroStatus').addEventListener('change', onChangeFilter);
    document.getElementById('filtroCategoria').addEventListener('change', onChangeFilter);
    document.getElementById('filtroSetor').addEventListener('change', onChangeFilter);
    const btnLimpar = document.getElementById('btnLimparBadge');
    if(btnLimpar) btnLimpar.addEventListener('click', () => { document.getElementById('globalSearch').value = ''; initDocumentos(); });
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
                return `<tr><td style="font-weight:600; color:var(--primary-color)">${doc.numero_protocolo}</td><td><span class="badge" style="background:${doc.categoria === 'Servidor' ? '#e0e7ff' : '#fce7f3'}; color:${doc.categoria === 'Servidor' ? '#3730a3' : '#9d174d'}">${doc.categoria}</span></td><td><div style="font-weight:500">${doc.requerente_nome}</div></td><td>${doc.assunto}</td><td style="font-size:0.85rem; color:#475569;">${doc.nome_setor_atual || '-'}</td><td><span class="badge ${getStatusClass(doc.status)}">${doc.status}</span></td><td class="acoes-col"><button class="btn-icon btn-ver" data-id="${doc.id}" title="Ver"><i class="ph ph-eye"></i></button><button class="btn-icon btn-anexar" data-id="${doc.id}" data-proto="${doc.numero_protocolo}" title="Anexar" style="${styleBtn}"><i class="ph ph-paperclip"></i></button><button class="btn-icon btn-concluir" data-id="${doc.id}" title="Concluir" style="${styleBtn} color:#059669;"><i class="ph ph-check-square"></i></button><button class="btn-icon btn-tramitar" data-id="${doc.id}" title="Tramitar" style="${styleBtn}"><i class="ph ph-paper-plane-right"></i></button><button class="btn-icon btn-editar" data-id="${doc.id}" title="Editar" style="${styleBtn}"><i class="ph ph-pencil-simple"></i></button><button class="btn-icon btn-arquivar" data-id="${doc.id}" title="Arquivar" style="color:var(--danger); ${styleBtn}"><i class="ph ph-archive"></i></button></td></tr>`;
            }
        );
        renderPagination(pagination, filtros);
        document.querySelectorAll('.btn-ver').forEach(btn => btn.addEventListener('click', () => verDetalhes(btn.dataset.id)));
        document.querySelectorAll('.btn-tramitar').forEach(btn => btn.addEventListener('click', () => setupTramitacao(btn.dataset.id)));
        document.querySelectorAll('.btn-editar').forEach(btn => btn.addEventListener('click', () => abrirModalEdicao(btn.dataset.id)));
        document.querySelectorAll('.btn-arquivar').forEach(btn => btn.addEventListener('click', () => arquivarDocumento(btn.dataset.id)));
        document.querySelectorAll('.btn-anexar').forEach(btn => btn.addEventListener('click', () => abrirModalAnexar(btn.dataset.id, btn.dataset.proto)));
        document.querySelectorAll('.btn-concluir').forEach(btn => btn.addEventListener('click', () => abrirModalConcluir(btn.dataset.id)));
    } catch (error) { UI.showToast('Erro ao carregar lista.', 'error'); }
}

function renderPagination(pagination, currentFilters) {
    const container = document.getElementById('paginationControls');
    if (!container) return;
    if (pagination.totalPages <= 1) { container.innerHTML = ''; return; }
    container.innerHTML = `<button id="btnPagePrev" class="btn-secondary" ${pagination.currentPage === 1 ? 'disabled' : ''} style="padding:5px 15px;">Anterior</button><span style="font-size:0.9rem; color:#666;">Página <strong>${pagination.currentPage}</strong> de ${pagination.totalPages}</span><button id="btnPageNext" class="btn-secondary" ${pagination.currentPage >= pagination.totalPages ? 'disabled' : ''} style="padding:5px 15px;">Próximo</button>`;
    document.getElementById('btnPagePrev').onclick = () => { if (currentPage > 1) { currentPage--; carregarDocumentos(currentFilters); } };
    document.getElementById('btnPageNext').onclick = () => { if (currentPage < pagination.totalPages) { currentPage++; carregarDocumentos(currentFilters); } };
}

function abrirModalAnexar(id, p) { document.getElementById('anexarDocId').value=id; document.getElementById('anexarProtocoloDisplay').textContent=p; UI.openModal('modalAnexar'); }
function abrirModalConcluir(id) { document.getElementById('concluirDocId').value=id; UI.openModal('modalConcluir'); }
function setupAnexarEConcluir() {
    const fA=document.getElementById('formAnexar'); if(fA){const nA=fA.cloneNode(true); fA.parentNode.replaceChild(nA,fA); nA.onsubmit=async(e)=>{e.preventDefault(); const fd=new FormData(nA); try{await API.upload(`/documentos/${fd.get('documento_id')}/anexo`,fd); UI.closeModal('modalAnexar'); UI.showToast('Anexado!'); carregarDocumentos();}catch(e){UI.showToast('Erro','error');}}; nA.closest('.modal-card').querySelectorAll('.close-custom').forEach(b=>b.onclick=()=>UI.closeModal('modalAnexar'));}
    const fC=document.getElementById('formConcluir'); if(fC){const nC=fC.cloneNode(true); fC.parentNode.replaceChild(nC,fC); nC.onsubmit=async(e)=>{e.preventDefault(); const id=nC.querySelector('[name=documento_id]').value; const d={decisao:nC.querySelector('[name=decisao]').value, texto_conclusao:nC.querySelector('[name=texto_conclusao]').value}; try{await API.put(`/documentos/${id}/finalizar`,d); UI.closeModal('modalConcluir'); UI.showToast('Finalizado!'); carregarDocumentos();}catch(e){UI.showToast('Erro','error');}}; nC.closest('.modal-card').querySelectorAll('.close-custom').forEach(b=>b.onclick=()=>UI.closeModal('modalConcluir'));}
}

export async function verDetalhes(id) {
    try {
        const doc = await API.get(`/documentos/${id}`);
        let extrasHtml = '';
        if (doc.dados_extras) {
            for (const [key, value] of Object.entries(doc.dados_extras)) {
                if(!key.startsWith('assunto_') && key !== 'tags' && value) 
                    extrasHtml += `<p><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${value}</p>`;
            }
        }
        
        let tagsHtml = '';
        if (doc.dados_extras && doc.dados_extras.tags && Array.isArray(doc.dados_extras.tags)) {
            tagsHtml = '<div style="margin:10px 0;"><strong>Classificação:</strong><div style="display:flex; gap:5px; flex-wrap:wrap; margin-top:5px;">' + 
                doc.dados_extras.tags.map(t => `<span class="badge" style="background:#e0e7ff; color:#3730a3; border:none;">${t}</span>`).join('') + 
                '</div></div>';
        }

        let anexosHtml = '';
        if (doc.anexos && doc.anexos.length > 0) {
            anexosHtml = '<div style="margin-top:10px;"><strong>Anexos Adicionais:</strong><ul style="list-style:none; padding:0;">';
            doc.anexos.forEach(a => { anexosHtml += `<li style="padding:5px 0;"><a href="${a.caminho}" target="_blank" style="color:var(--primary-color); text-decoration:none;"><i class="ph ph-file-pdf"></i> ${a.nome_arquivo}</a> <span style="font-size:0.75rem; color:#999;">(${new Date(a.data_upload).toLocaleDateString()})</span></li>`; });
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
                <div style="background:#f8fafc; padding:10px; border-radius:6px; margin:10px 0; font-size:0.9rem;">${extrasHtml}</div>
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
        setTimeout(() => { const b = document.getElementById('btnImprimirComprovante'); if(b) b.onclick = () => imprimirComprovante(doc); }, 100);
    } catch (error) { UI.showToast('Erro ao carregar detalhes', 'error'); }
}

// --- FUNÇÃO DE IMPRESSÃO ---
function imprimirComprovante(doc) {
    let dadosExtrasPrint = '';
    if (doc.dados_extras) {
        for (const [key, value] of Object.entries(doc.dados_extras)) {
            // Ignora tags na lista de campos padrão
            if(key === 'tags' || key.startsWith('assunto_')) continue;
            
            const label = key.charAt(0).toUpperCase() + key.slice(1);
            if(value) dadosExtrasPrint += `<div class="field"><span class="label">${label}:</span> <span class="value">${value}</span></div>`;
        }
    }
    
    // Layout Oficial Restaurado
    const html = `
    <html>
    <head>
        <title>Comprovante - ${doc.numero_protocolo}</title>
        <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 40px; color: #000; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
            .header p { margin: 5px 0 0; font-size: 14px; }
            
            .protocolo-box { border: 2px solid #000; padding: 15px; text-align: center; margin-bottom: 30px; background: #f0f0f0; }
            .protocolo-num { font-size: 28px; font-weight: bold; letter-spacing: 2px; }
            .protocolo-label { font-size: 12px; text-transform: uppercase; }

            .section { margin-bottom: 25px; }
            .section-title { font-weight: bold; border-bottom: 1px solid #999; margin-bottom: 10px; text-transform: uppercase; font-size: 14px; }
            
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .field { margin-bottom: 8px; }
            .label { font-weight: bold; font-size: 12px; color: #444; }
            .value { font-size: 14px; border-bottom: 1px dotted #ccc; display: inline-block; min-width: 50px; }

            .footer { margin-top: 50px; text-align: center; font-size: 10px; border-top: 1px solid #ccc; padding-top: 10px; }
            .qrcode-placeholder { text-align: center; margin-top: 30px; border: 1px dashed #ccc; padding: 20px; width: 100px; margin-left: auto; margin-right: auto; }
            
            @media print {
                body { padding: 0; }
                .protocolo-box { background: none !important; border: 2px solid #000 !important; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Repositório Institucional</h1>
            <p>Sistema de Protocolo Geral e Tramitação</p>
        </div>

        <div class="protocolo-box">
            <div class="protocolo-label">Número do Protocolo</div>
            <div class="protocolo-num">${doc.numero_protocolo}</div>
            <div style="font-size: 12px; margin-top: 5px;">${new Date(doc.data_recebimento).toLocaleDateString()} às ${new Date(doc.data_recebimento).toLocaleTimeString()}</div>
        </div>

        <div class="section">
            <div class="section-title">Dados do Requerente</div>
            <div class="grid">
                <div class="field"><span class="label">Nome:</span> <span class="value">${doc.requerente_nome}</span></div>
                <div class="field"><span class="label">CPF:</span> <span class="value">${doc.requerente_cpf}</span></div>
                <div class="field"><span class="label">Matrícula:</span> <span class="value">${doc.requerente_matricula || '-'}</span></div>
                <div class="field"><span class="label">Categoria:</span> <span class="value">${doc.categoria}</span></div>
            </div>
            <!-- Dados Extras (Curso, Cargo, etc) -->
            <div class="grid" style="margin-top: 10px;">
                ${dadosExtrasPrint}
            </div>
        </div>

        <div class="section">
            <div class="section-title">Dados da Solicitação</div>
            <div class="field"><span class="label">Assunto:</span> <span class="value" style="font-weight:bold;">${doc.assunto}</span></div>
            <div class="field"><span class="label">Setor Atual:</span> <span class="value">${doc.nome_setor_atual || doc.setor_nome || 'Inicial'}</span></div>
            <div class="field"><span class="label">Status:</span> <span class="value">${doc.status}</span></div>
        </div>

        <div class="qrcode-placeholder">
            [Autenticação]
            <br>
            Digital
        </div>

        <div class="footer">
            <p>Este comprovante foi gerado eletronicamente em ${new Date().toLocaleString()}.</p>
            <p>Para acompanhar seu processo, acesse o sistema e informe o número do protocolo acima.</p>
        </div>

        <script>
            window.print();
        </script>
    </body>
    </html>
    `;

    const janela = window.open('', '', 'width=800,height=900');
    janela.document.write(html);
    janela.document.close();
}

function mostrarModalDetalhes(c) { const d=document.createElement('div'); d.className='modal-overlay'; d.innerHTML=`<div class="modal-card" style="max-width: 600px; position:relative;"><button class="close-custom" style="position:absolute;top:10px;right:10px">X</button>${c}</div>`; document.body.appendChild(d); d.querySelector('button').onclick=()=>d.remove(); d.onclick=(e)=>{if(e.target==d)d.remove()}; }
async function abrirModalEdicao(id){ try{const d=await API.get(`/documentos/${id}`); document.getElementById('editDocId').value=d.id; document.getElementById('editNome').value=d.requerente_nome; document.getElementById('editCpf').value=d.requerente_cpf; document.getElementById('editMatricula').value=d.requerente_matricula||''; document.getElementById('editTelefone').value=d.requerente_telefone||''; document.getElementById('editEmail').value=d.requerente_email||''; document.getElementById('editAssunto').value=d.assunto; UI.openModal('modalEditarDocumento');}catch(e){UI.showToast('Erro ao carregar dados','error');} }
function setupEditarDocumento(){ const f=document.getElementById('formEditarDocumento'); if(f){const nf=f.cloneNode(true); f.parentNode.replaceChild(nf,f); nf.onsubmit=async(e)=>{e.preventDefault(); const fd=new FormData(nf); const d={requerente_nome:fd.get('requerente_nome'), requerente_cpf:fd.get('requerente_cpf'), requerente_matricula:fd.get('requerente_matricula'), requerente_email:fd.get('requerente_email'), requerente_telefone:fd.get('requerente_telefone'), assunto:fd.get('assunto'), dados_extras:{}}; for(let[k,v] of fd.entries()) if(k.startsWith('extra_')) d.dados_extras[k.replace('extra_','')]=v; try{await API.put(`/documentos/${fd.get('id')}`,d); UI.closeModal('modalEditarDocumento'); UI.showToast('Atualizado!'); const s=document.getElementById('globalSearch'); initDocumentos(s?s.value:'');}catch(e){UI.showToast('Erro ao salvar','error');}}; nf.closest('.modal-card').querySelectorAll('.close-modal, .btn-secondary').forEach(b=>b.addEventListener('click',()=>UI.closeModal('modalEditarDocumento')));} }
async function arquivarDocumento(id){ if(confirm('Arquivar?')) try{await API.delete(`/documentos/${id}`); UI.showToast('Arquivado.'); const s=document.getElementById('globalSearch'); initDocumentos(s?s.value:'');}catch(e){UI.showToast('Erro','error');} }

function renderTags() {
    const c = document.getElementById('aiTagsContainer');
    if (!c) return;
    if (tagsAtuais.length === 0) { c.innerHTML = '<span style="color:#999; font-size:0.8rem;">Digite o assunto para gerar sugestões...</span>'; return; }
    c.innerHTML = '';
    tagsAtuais.forEach((t, i) => {
        const chip = document.createElement('div');
        chip.className = 'tag-chip';
        chip.innerHTML = `${t} <i class="ph ph-x-circle" data-index="${i}"></i>`;
        chip.querySelector('i').onclick = () => { tagsAtuais.splice(i, 1); renderTags(); };
        c.appendChild(chip);
    });
}

export function setupNovoDocumento() {
    const form = document.getElementById('formNovoDocumento');
    if(!form) return;
    tagsAtuais = [];
    renderTags();
    form.querySelectorAll('.close-modal, .btn-secondary').forEach(btn => { btn.onclick = (e) => { e.preventDefault(); UI.closeModal('modalNovoDocumento'); form.reset(); tagsAtuais=[]; renderTags(); }; });
    document.getElementById('selectCategoria').onchange = (e) => { 
        document.getElementById('fieldsServidor').classList.toggle('hidden-field', e.target.value!=='Servidor');
        document.getElementById('fieldsAcademico').classList.toggle('hidden-field', e.target.value!=='Academico');
    };
    let timeoutIA = null;
    const inputsAssunto = [document.getElementById('assuntoServidor'), document.getElementById('assuntoAcademico')];
    const loadingEl = document.getElementById('aiLoading');
    inputsAssunto.forEach(input => {
        input.addEventListener('input', (e) => {
            const texto = e.target.value;
            clearTimeout(timeoutIA);
            if(texto.length > 4) {
                loadingEl.style.display = 'inline-block';
                timeoutIA = setTimeout(async () => {
                    try {
                        const res = await API.post('/ia/analisar', { texto });
                        res.tags.forEach(t => { if(!tagsAtuais.includes(t)) tagsAtuais.push(t); });
                        renderTags();
                    } catch(err) {} 
                    finally { loadingEl.style.display = 'none'; }
                }, 1000);
            }
        });
    });
    const manualInput = document.getElementById('manualTagInput');
    if(manualInput) {
        manualInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') {
                e.preventDefault();
                const val = e.target.value.trim();
                if(val && !tagsAtuais.includes(val)) { tagsAtuais.push(val); renderTags(); e.target.value = ''; }
            }
        });
    }
    form.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const c = fd.get('categoria'); 
        fd.append('assunto', c==='Servidor'?fd.get('assunto_servidor'):fd.get('assunto_academico'));
        if(tagsAtuais.length > 0) fd.append('tags_finais', tagsAtuais.join(','));
        try {
            const res = await API.upload('/documentos', fd);
            UI.closeModal('modalNovoDocumento');
            UI.showToast(`Protocolo ${res.protocolo} gerado!`);
            form.reset(); tagsAtuais=[]; renderTags();
            if(document.getElementById('tabelaDocumentos')) { const s=document.getElementById('globalSearch'); initDocumentos(s?s.value:''); }
            if(confirm('Documento criado! Deseja imprimir o comprovante agora?')) { const d = await API.get(`/documentos/${res.id}`); imprimirComprovante(d); }
        } catch(e) { UI.showToast('Erro ao registrar', 'error'); }
    };
}
function getStatusClass(s){return s==='Recebido'?'recebido':s==='Em Análise'?'analise':'finalizado';}