export const UI = {
    // Renderiza uma tabela dinamicamente
    renderTable(containerId, headers, rows, renderRowCallback) {
        const container = document.getElementById(containerId);
        if (!rows.length) {
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
        document.getElementById(modalId).classList.remove('hidden');
    },

    closeModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    },

    // Notificação Toast
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast visible ${type}`;
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
};

// Event Listeners globais para fechar modais
document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-overlay');
        modal.classList.add('hidden');
    });
});