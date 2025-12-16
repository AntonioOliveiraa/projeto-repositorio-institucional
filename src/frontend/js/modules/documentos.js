import { API } from '../api.js';
import { UI } from '../ui.js';
import { setupTramitacao } from './tramitacao.js';

// Função de Inicialização agora aceita um termo de busca opcional
export async function initDocumentos(termoBusca = '') {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <div class="toolbar" style="display:flex; justify-content:space-between; margin-bottom: 1rem;">
            <h2>Gestão de Documentos</h2>
            <div style="display:flex; gap: 10px;">
                ${termoBusca ? `<span class="badge" style="background:#fef3c7; color:#d97706; display:flex; align-items:center;">Filtrando por: "${termoBusca}" <i class="ph ph-x" style="cursor:pointer; margin-left:5px;" onclick="document.getElementById('btnLimparBusca').click()"></i></span>` : ''}
                
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
                <button id="btnLimparBusca" style="display:none;"></button>
            </div>
        </div>
        <div id="tabelaDocumentos"></div>
    `;

    // Carrega documentos passando o termo de busca (se houver)
    await carregarDocumentos({ busca: termoBusca });
    
    // Inicializa lógica de edição (necessário pois recriamos o DOM)
    setupEditarDocumento();

    // Event Listeners dos Filtros
    document.getElementById('filtroStatus').addEventListener('change', (e) => carregarDocumentos({ status: e.target.value, busca: termoBusca }));
    document.getElementById('filtroCategoria').addEventListener('change', (e) => carregarDocumentos({ categoria: e.target.value, busca: termoBusca }));
    
    // Listener para limpar a busca
    document.getElementById('btnLimparBusca').addEventListener('click', () => {
        document.getElementById('globalSearch').value = ''; // Limpa o input lá em cima
        initDocumentos(); // Recarrega tudo limpo
    });
}

// A função carregarDocumentos deve processar o filtro 'busca'
async function carregarDocumentos(filtros = {}) {
    try {
        // Remove chaves vazias/undefined para limpar a URL
        const params = new URLSearchParams();
        for (const key in filters) {
            if (filters[key]) params.append(key, filters[key]);
        }
        // Correção simples para garantir que funcione com o objeto direto se URLSearchParams falhar com undefined
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

        // Reatribuir eventos aos botões da tabela (IMPORTANTE)
        document.querySelectorAll('.btn-ver').forEach(btn => btn.addEventListener('click', () => verDetalhes(btn.dataset.id)));
        document.querySelectorAll('.btn-tramitar').forEach(btn => btn.addEventListener('click', () => setupTramitacao(btn.dataset.id)));
        document.querySelectorAll('.btn-editar').forEach(btn => btn.addEventListener('click', () => abrirModalEdicao(btn.dataset.id)));
        document.querySelectorAll('.btn-arquivar').forEach(btn => btn.addEventListener('click', () => arquivarDocumento(btn.dataset.id)));

    } catch (error) {
        console.error(error);
        UI.showToast('Erro ao carregar lista.', 'error');
    }
}

// --- Visualização de Detalhes e Comprovante ---
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
                    
                    <button id="btnImprimirComprovante" class="btn-secondary" style="display:inline-flex; align-items:center; gap:5px; font-size:0.85rem; padding:8px 16px;">
                        <i class="ph ph-printer"></i> Imprimir Comprovante
                    </button>
                </div>

                <hr style="margin: 15px 0; border:0; border-top:1px solid #eee;">
                <h4>Histórico de Tramitação</h4>
                <div style="margin-top: 10px;">${historicoHtml}</div>
            </div>
        `;
        
        mostrarModalDetalhes(content);

        // Adiciona evento ao botão de imprimir APÓS ele ser renderizado
        setTimeout(() => {
            const btnPrint = document.getElementById('btnImprimirComprovante');
            if(btnPrint) {
                btnPrint.onclick = () => imprimirComprovante(doc);
            }
        }, 100);

    } catch (error) {
        console.error(error);
        UI.showToast('Erro ao carregar detalhes', 'error');
    }
}

// --- Função de Geração do Comprovante (Layout de Impressão) ---
function imprimirComprovante(doc) {
    // Monta dados extras para impressão
    let dadosExtrasPrint = '';
    if (doc.dados_extras) {
        for (const [key, value] of Object.entries(doc.dados_extras)) {
            const label = key.charAt(0).toUpperCase() + key.slice(1);
            if(value) dadosExtrasPrint += `<div class="field"><span class="label">${label}:</span> <span class="value">${value}</span></div>`;
        }
    }

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
            <div class="grid" style="margin-top: 10px;">
                ${dadosExtrasPrint}
            </div>
        </div>

        <div class="section">
            <div class="section-title">Dados da Solicitação</div>
            <div class="field"><span class="label">Assunto:</span> <span class="value" style="font-weight:bold;">${doc.assunto}</span></div>
            <div class="field"><span class="label">Setor Atual:</span> <span class="value">${doc.setor_nome}</span></div>
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
            // window.close(); // Opcional: fechar automaticamente após imprimir
        </script>
    </body>
    </html>
    `;

    const janela = window.open('', '', 'width=800,height=900');
    janela.document.write(html);
    janela.document.close();
}


// --- Funções Auxiliares (Modal, Scroll, etc) ---
function mostrarModalDetalhes(content) {
    const div = document.createElement('div');
    div.className = 'modal-overlay';
    div.innerHTML = `
        <div class="modal-card" style="max-width: 600px;">
            <div class="modal-header">
                <h2>Detalhes do Documento</h2>
                <button class="close-custom"><i class="ph ph-x"></i></button>
            </div>
            ${content}
        </div>
    `;
    document.body.appendChild(div);
    
    // Fechar ao clicar no X
    div.querySelector('.close-custom').onclick = () => div.remove();
    
    // Fechar ao clicar fora
    div.addEventListener('click', (e) => {
        if(e.target === div) div.remove();
    });
}

// --- Edição e Arquivamento (Mantidos) ---
async function abrirModalEdicao(id) {
    try {
        const doc = await API.get(`/documentos/${id}`);
        
        // Preencher campos comuns
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
                container.innerHTML += `
                    <div class="form-group">
                        <label>${label}</label>
                        <input type="text" name="extra_${key}" value="${value}">
                    </div>
                `;
            }
        }
        UI.openModal('modalEditarDocumento');
    } catch (error) {
        console.error(error);
        UI.showToast('Erro ao carregar dados para edição.', 'error');
    }
}

function setupEditarDocumento() {
    const form = document.getElementById('formEditarDocumento');
    if(!form) return; // Evita erro se o modal não existir na view

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const id = formData.get('id');
        
        // Reconstrói o objeto de dados
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
                const realKey = key.replace('extra_', '');
                dados.dados_extras[realKey] = value;
            }
        }

        try {
            await API.put(`/documentos/${id}`, dados);
            UI.closeModal('modalEditarDocumento');
            UI.showToast('Documento atualizado!');
            carregarDocumentos();
        } catch (error) {
            UI.showToast('Erro ao salvar alterações.', 'error');
        }
    });
}

// --- Lógica de Arquivamento ---
async function arquivarDocumento(id) {
    if(!confirm('Tem certeza que deseja arquivar este documento? Ele sairá da lista principal.')) return;
    try {
        await API.delete(`/documentos/${id}`);
        UI.showToast('Documento arquivado.');
        carregarDocumentos();
    } catch (error) {
        UI.showToast('Erro ao arquivar.', 'error');
    }
}

// --- Lógica de Cadastro ---
export function setupNovoDocumento() {
    const form = document.getElementById('formNovoDocumento');
    const selectCat = document.getElementById('selectCategoria');
    const fieldsServidor = document.getElementById('fieldsServidor');
    const fieldsAcademico = document.getElementById('fieldsAcademico');
    const assuntoServidor = document.getElementById('assuntoServidor');
    const assuntoAcademico = document.getElementById('assuntoAcademico');

    if(!form) return;

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
            const contentArea = document.getElementById('contentArea');
            if(contentArea.querySelector('#tabelaDocumentos')) carregarDocumentos();
            
            // Perguntar se quer imprimir logo após criar
            if(confirm('Documento criado! Deseja imprimir o comprovante agora?')) {
                // Pequeno hack para buscar o objeto completo e imprimir
                const docRecemCriado = await API.get(`/documentos/${res.id}`);
                imprimirComprovante(docRecemCriado);
            }

        } catch (error) {
            UI.showToast('Erro ao registrar.', 'error');
        }
    });
}

function getStatusClass(status) {
    if(status === 'Recebido') return 'recebido';
    if(status === 'Em Análise') return 'analise';
    if(status === 'Finalizado') return 'finalizado';
    return '';
}