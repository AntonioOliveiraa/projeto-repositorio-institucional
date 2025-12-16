import { UI } from './ui.js';
import { initDashboard } from './modules/dashboard.js';
import { initDocumentos, setupNovoDocumento } from './modules/documentos.js';
import { initTramitacaoListener } from './modules/tramitacao.js';
import { initNotificacoes } from './modules/notificacoes.js';
import { initUsuarios } from './modules/usuarios.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Verificação de Segurança (RNF-002)
    const token = localStorage.getItem('token');
    const usuarioStr = localStorage.getItem('usuario');
    
    if (!token || !usuarioStr) {
        // Redireciona para login se não houver sessão ativa
        // Em um ambiente real, garanta que login.html existe
        window.location.href = 'login.html';
        return;
    }

    const usuario = JSON.parse(usuarioStr);

    // --- Lógica para mostrar menu de Usuários (APENAS ADMIN) ---
    if (usuario.perfil === 'Admin') {
        const menuUsuarios = document.getElementById('menuUsuarios');
        if (menuUsuarios) menuUsuarios.classList.remove('hidden');
    }

    // 2. Atualizar UI com dados do Usuário
    const userProfileEl = document.querySelector('.user-profile .info');
    if(userProfileEl) {
        userProfileEl.innerHTML = `
            <span class="name">${usuario.nome}</span>
            <span class="role">${usuario.perfil}</span>
            <a href="#" id="btnLogout" style="font-size:0.75rem; color:var(--danger); text-decoration:none; margin-top:4px; display:block;">Sair</a>
        `;
    }

    // 3. Controle de Perfil (RF-006)
    if (usuario.perfil === 'Consulta') {
        // Remove botões de ação para quem é só consulta
        const btnNovo = document.getElementById('btnNovoDocumento');
        if (btnNovo) btnNovo.remove();
        
        // CSS global para esconder ações nas tabelas
        const style = document.createElement('style');
        style.innerHTML = `.btn-tramitar, .acoes-col { display: none !important; }`;
        document.head.appendChild(style);
    }

    // 4. Logout
    document.getElementById('btnLogout')?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = 'login.html';
    });

    // 5. Navegação (SPA simples)
    const links = document.querySelectorAll('.nav-item[data-view]');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Atualiza estado visual dos links
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Carrega a view correspondente
            const viewName = link.getAttribute('data-view');
            carregarView(viewName);
        });
    });

    // 6. Setup Botão Novo Documento (só se existir)
    const btnNovo = document.getElementById('btnNovoDocumento');
    if(btnNovo) {
        btnNovo.addEventListener('click', (e) => {
            e.preventDefault();
            // Assume que UI possui um método openModal conforme uso comum
            if (UI && UI.openModal) {
                UI.openModal('modalNovoDocumento');
            } else {
                console.warn('UI.openModal não está definido.');
            }
        });
    }

    // 7. Inicialização dos Módulos
    initNotificacoes();
    setupNovoDocumento();
    initTramitacaoListener();
    
    // Carregamento inicial da view padrão
    carregarView('dashboard');
});

/**
 * Função para alternar entre as visualizações (Views) da SPA
 * @param {string} viewName - Nome da view a ser carregada (ex: 'dashboard', 'documentos')
 */
function carregarView(viewName) {
    const title = document.getElementById('pageTitle');

    if (viewName === 'dashboard') {
        title.textContent = 'Visão Geral';
        initDashboard();
    } else if (viewName === 'documentos') {
        title.textContent = 'Gestão de Documentos';
        initDocumentos();
    } else if (viewName === 'usuarios') { // <--- NOVA ROTA
        title.textContent = 'Administração de Usuários';
        initUsuarios();
    }
}