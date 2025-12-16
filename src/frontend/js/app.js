import { UI, initUI } from './ui.js';
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

    if (usuario.perfil === 'Admin') {
        const menuUsuarios = document.getElementById('menuUsuarios');
        if (menuUsuarios) menuUsuarios.classList.remove('hidden');
    }

    // 2. Atualizar UI do Usuário
    const userProfileEl = document.querySelector('.user-profile .info');
    if(userProfileEl) {
        userProfileEl.innerHTML = `
            <span class="name">${usuario.nome}</span>
            <span class="role">${usuario.perfil}</span>
            <a href="#" id="btnLogout" style="font-size:0.75rem; color:var(--danger); text-decoration:none; margin-top:4px; display:block;">Sair</a>
        `;
    }

    if (usuario.perfil === 'Consulta') {
        const btnNovo = document.getElementById('btnNovoDocumento');
        if (btnNovo) btnNovo.remove();
        const style = document.createElement('style');
        style.innerHTML = `.btn-tramitar, .acoes-col { display: none !important; }`;
        document.head.appendChild(style);
    }

    // 3. Logout
    document.getElementById('btnLogout')?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = 'login.html';
    });

    // 4. Navegação
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

    // 5. Botão Novo Documento (Abertura do Modal)
    const btnNovo = document.getElementById('btnNovoDocumento');
    if(btnNovo) {
        btnNovo.addEventListener('click', (e) => {
            e.preventDefault();
            UI.openModal('modalNovoDocumento');
        });
    }

    // 6. Busca Global
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const termo = e.target.value;
                const links = document.querySelectorAll('.nav-item');
                links.forEach(l => l.classList.remove('active'));
                const linkDocs = document.querySelector('.nav-item[data-view="documentos"]');
                if (linkDocs) linkDocs.classList.add('active');
                const title = document.getElementById('pageTitle');
                if (title) title.textContent = 'Resultados da Busca';
                initDocumentos(termo);
            }
        });
    }

    // 7. Inicialização dos Módulos e UI
    initUI(); // <--- ATIVA OS BOTÕES DE FECHAR/CANCELAR GLOBALMENTE
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