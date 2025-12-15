import { UI } from './ui.js';
import { initDashboard } from './modules/dashboard.js';
import { initDocumentos, setupNovoDocumento } from './modules/documentos.js';
import { initTramitacaoListener } from './modules/tramitacao.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // Navegação (SPA simples)
    const links = document.querySelectorAll('.nav-item[data-view]');
    
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const view = link.dataset.view;
            carregarView(view);
        });
    });

    // Setup Botão Novo Documento
    document.getElementById('btnNovoDocumento').addEventListener('click', (e) => {
        e.preventDefault();
        UI.openModal('modalNovoDocumento');
    });

    // Busca Global (Simplificada: apenas redireciona para documentos filtrando)
    document.getElementById('globalSearch').addEventListener('keypress', (e) => {
        if(e.key === 'Enter') {
            const termo = e.target.value;
            // Força ida para a view de documentos
            document.querySelector('.nav-item[data-view="documentos"]').click();
            // Pequeno delay para esperar a view carregar (ideal seria estado global)
            setTimeout(() => {
                // Aqui você implementaria a chamada de busca no módulo documentos
                alert(`Implementar busca global para: ${termo} (Disponível no filtro da tabela)`);
            }, 100);
        }
    });

    // Inicialização dos Módulos
    setupNovoDocumento();
    initTramitacaoListener();

    // Carrega view inicial
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
    }
}