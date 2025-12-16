import { API } from '../api.js';
import { UI } from '../ui.js';

export async function initUsuarios() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = `
        <div class="toolbar" style="display:flex; justify-content:space-between; margin-bottom: 1rem;">
            <h2>Gerenciar Usuários</h2>
            <button id="btnNovoUsuario" class="btn-primary">
                <i class="ph ph-user-plus"></i> Novo Usuário
            </button>
        </div>
        <div id="tabelaUsuarios"></div>
    `;

    document.getElementById('btnNovoUsuario').addEventListener('click', () => abrirModalUsuario());
    await carregarUsuarios();
}

async function carregarUsuarios() {
    try {
        const usuarios = await API.get('/usuarios-crud'); // Rota do CRUD completo
        
        UI.renderTable('tabelaUsuarios', 
            ['Nome', 'E-mail', 'Perfil', 'Setor', 'Ações'], 
            usuarios, 
            (u) => `
                <tr>
                    <td style="font-weight:500">${u.nome}</td>
                    <td>${u.email}</td>
                    <td><span class="badge" style="background:#f1f5f9; color:#475569">${u.perfil}</span></td>
                    <td>${u.setor_nome || '-'}</td>
                    <td class="acoes-col">
                        <button class="btn-icon btn-editar-usuario" data-id="${u.id}" title="Editar"><i class="ph ph-pencil-simple"></i></button>
                        <button class="btn-icon btn-excluir-usuario" data-id="${u.id}" title="Excluir" style="color:var(--danger)"><i class="ph ph-trash"></i></button>
                    </td>
                </tr>
            `
        );

        // Listeners
        document.querySelectorAll('.btn-editar-usuario').forEach(btn => 
            btn.addEventListener('click', () => abrirModalUsuario(btn.dataset.id))
        );
        document.querySelectorAll('.btn-excluir-usuario').forEach(btn => 
            btn.addEventListener('click', () => excluirUsuario(btn.dataset.id))
        );

    } catch (error) {
        UI.showToast('Erro ao carregar usuários.', 'error');
    }
}

async function abrirModalUsuario(id = null) {
    // 1. Carregar Setores para o Select
    let setoresHtml = '<option value="">Selecione...</option>';
    try {
        const setores = await API.get('/setores');
        setoresHtml += setores.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
    } catch(e) { console.error('Erro setores', e); }

    // 2. Se for edição, buscar dados
    let dados = { nome: '', email: '', perfil: 'Operador', setor_id: '' };
    let titulo = 'Novo Usuário';
    
    if (id) {
        titulo = 'Editar Usuário';
        try {
            dados = await API.get(`/usuarios-crud/${id}`);
        } catch(e) { UI.showToast('Erro ao buscar usuário', 'error'); return; }
    }

    // 3. Montar HTML do Modal
    const modalContent = `
        <div class="modal-header">
            <h2>${titulo}</h2>
            <button class="close-custom"><i class="ph ph-x"></i></button>
        </div>
        <form id="formUsuario">
            <input type="hidden" name="id" value="${id || ''}">
            
            <div class="form-group">
                <label>Nome Completo</label>
                <input type="text" name="nome" value="${dados.nome}" required>
            </div>
            
            <div class="form-group">
                <label>E-mail (Login)</label>
                <input type="email" name="email" value="${dados.email}" required>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Perfil</label>
                    <select name="perfil" required>
                        <option value="Operador" ${dados.perfil === 'Operador' ? 'selected' : ''}>Operador</option>
                        <option value="Consulta" ${dados.perfil === 'Consulta' ? 'selected' : ''}>Consulta</option>
                        <option value="Admin" ${dados.perfil === 'Admin' ? 'selected' : ''}>Administrador</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Setor</label>
                    <select name="setor_id" required>${setoresHtml}</select>
                </div>
            </div>

            <div class="form-group">
                <label>Senha ${id ? '(Deixe em branco para não alterar)' : '*'}</label>
                <input type="password" name="senha" ${id ? '' : 'required'} placeholder="******">
            </div>

            <div class="modal-footer">
                <button type="button" class="btn-secondary close-custom">Cancelar</button>
                <button type="submit" class="btn-primary">Salvar</button>
            </div>
        </form>
    `;

    // 4. Injetar e Configurar Modal
    const div = document.createElement('div');
    div.className = 'modal-overlay';
    div.innerHTML = `<div class="modal-card">${modalContent}</div>`;
    document.body.appendChild(div);

    // Selecionar o setor correto após renderizar
    if(id && dados.setor_id) {
        const selectSetor = div.querySelector('[name="setor_id"]');
        if(selectSetor) selectSetor.value = dados.setor_id;
    }

    // Eventos de Fechar
    const fechar = () => div.remove();
    div.querySelector('.close-custom').onclick = fechar;
    div.querySelectorAll('.close-custom')[1].onclick = fechar; // botão cancelar

    // Evento de Submit
    div.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const payload = Object.fromEntries(formData.entries());
        
        try {
            if (id) {
                await API.put(`/usuarios-crud/${id}`, payload);
                UI.showToast('Usuário atualizado!');
            } else {
                await API.post('/usuarios-crud', payload);
                UI.showToast('Usuário criado!');
            }
            fechar();
            carregarUsuarios();
        } catch (error) {
            alert(error.message || 'Erro ao salvar');
        }
    });
}

async function excluirUsuario(id) {
    if(!confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
        await API.delete(`/usuarios-crud/${id}`);
        UI.showToast('Usuário excluído.');
        carregarUsuarios();
    } catch (error) {
        // Geralmente retorna erro se tentar excluir a si mesmo (tratado no back)
        alert('Erro: ' + (error.message || 'Não foi possível excluir.'));
    }
}