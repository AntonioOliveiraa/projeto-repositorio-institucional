import { UI } from './ui.js';
import { initDashboard } from './modules/dashboard.js';
import { initDocumentos, setupNovoDocumento } from './modules/documentos.js';
import { initTramitacaoListener } from './modules/tramitacao.js';
import { initNotificacoes } from './modules/notificacoes.js';
import { initUsuarios } from './modules/usuarios.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Verificação de Segurança
    const token = localStorage.getItem('token');
    const usuarioStr = localStorage.getItem('usuario');
    
    if (!token || !usuarioStr) {
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

    // 3. Controle de Perfil
    if (usuario.perfil === 'Consulta') {
        const btnNovo = document.getElementById('btnNovoDocumento');
        if (btnNovo) btnNovo.remove();
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

    // 5. Navegação
    const links = document.querySelectorAll('.nav-item[data-view]');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            const viewName = link.getAttribute('data-view');
            carregarView(viewName);
        });
    });

    // 6. Botão Novo Documento
    const btnNovo = document.getElementById('btnNovoDocumento');
    if(btnNovo) {
        btnNovo.addEventListener('click', (e) => {
            e.preventDefault();
            if (UI && UI.openModal) UI.openModal('modalNovoDocumento');
        });
    }

    // Lógica da Busca Global
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const termo = e.target.value;
                
                // Força navegação para Documentos
                const links = document.querySelectorAll('.nav-item');
                links.forEach(l => l.classList.remove('active'));
                const linkDocs = document.querySelector('.nav-item[data-view="documentos"]');
                if (linkDocs) linkDocs.classList.add('active');

                const title = document.getElementById('pageTitle');
                if (title) title.textContent = 'Resultados da Busca';
                
                // Dispara a busca
                initDocumentos(termo);
            }
        });
    }

    // 7. Inicialização
    initNotificacoes();
    setupNovoDocumento();
    initTramitacaoListener();
    
    carregarView('dashboard');
});

function carregarView(viewName) {
    const title = document.getElementById('pageTitle');
    if (viewName === 'dashboard') {
        title.textContent = 'Visão Geral';
        initDashboard();
    } else if (viewName === 'documentos') {
        title.textContent = 'Gestão de Documentos';
        initDocumentos();
    } else if (viewName === 'usuarios') {
        title.textContent = 'Administração de Usuários';
        initUsuarios();
    }
}