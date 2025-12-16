export const UI = {
    // Renderiza uma tabela dinamicamente
    renderTable(containerId, headers, rows, renderRowCallback) {
        const container = document.getElementById(containerId);
        if (!container) return; // Proteção se a view não estiver carregada

        if (!rows || rows.length === 0) {
            container.innerHTML = '<div class="empty-state">Nenhum registro encontrado.</div>';
            return;
        }

        let html = '<table class="card-table"><thead><tr>';
        headers.forEach(h => html += `<th>${h}</th>`);
        html += '</tr></thead><tbody>';
        
        rows.forEach(row => {
            html += renderRowCallback(row);
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    },

    // Controle de Modais
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('hidden');
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('hidden');
    },

    // Notificação Toast
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        
        toast.textContent = message;
        toast.className = `toast visible ${type}`;
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
};

// Função de Inicialização dos Eventos Globais de UI
export function initUI() {
    // Fecha modais ao clicar no botão com classe .close-modal
    document.querySelectorAll('.close-modal').forEach(btn => {
        // Remove listener antigo para evitar duplicidade (clone hack)
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal-overlay');
            if (modal) modal.classList.add('hidden');
        });
    });

    // Fecha ao clicar fora do modal (Overlay)
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.add('hidden');
            }
        });
    });
}