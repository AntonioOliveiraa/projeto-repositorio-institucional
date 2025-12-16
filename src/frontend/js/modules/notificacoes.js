import { API } from '../api.js';

export function initNotificacoes() {
    const btn = document.getElementById('btnNotificacoes');
    const dropdown = document.getElementById('dropdownNotificacoes');
    const badge = document.getElementById('badgeNotificacao');
    const lista = document.getElementById('listaNotificacoes');

    // Toggle Dropdown
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Evita fechar ao clicar
        dropdown.classList.toggle('hidden');
    });

    // Fechar ao clicar fora
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });

    // Função de carregar dados
    const carregarNotificacoes = async () => {
        try {
            const notifs = await API.get('/notificacoes');
            
            // Atualiza Badge
            if (notifs.length > 0) {
                badge.textContent = notifs.length;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }

            // Renderiza Lista
            if (notifs.length === 0) {
                lista.innerHTML = '<div style="padding:15px; text-align:center; color:#94a3b8; font-size:0.85rem;">Tudo limpo por aqui!</div>';
            } else {
                lista.innerHTML = notifs.map(n => `
                    <div class="notif-item" data-id="${n.id}" style="padding:10px; border-bottom:1px solid #f1f5f9; cursor:pointer; transition:background 0.2s;">
                        <div style="font-size:0.85rem; font-weight:600; color:var(--text-main);">${n.mensagem}</div>
                        <div style="font-size:0.75rem; color:var(--primary-color);">Ref: ${n.numero_protocolo || 'Geral'}</div>
                        <div style="font-size:0.7rem; color:#94a3b8; margin-top:4px;">${new Date(n.data_hora).toLocaleString()}</div>
                    </div>
                `).join('');

                // Adicionar evento de marcar como lida ao clicar
                document.querySelectorAll('.notif-item').forEach(item => {
                    item.addEventListener('click', async () => {
                        const id = item.dataset.id;
                        await API.put(`/notificacoes/${id}/ler`, {});
                        // Recarrega lista e remove visualmente
                        carregarNotificacoes();
                        
                        // Opcional: Redirecionar para o documento se tiver ID
                        // window.location.hash = ...
                    });
                    
                    // Efeito hover via JS inline para simplificar css
                    item.onmouseover = () => item.style.background = '#f8fafc';
                    item.onmouseout = () => item.style.background = 'transparent';
                });
            }

        } catch (error) {
            console.error("Erro ao buscar notificações", error);
        }
    };

    // Primeira carga
    carregarNotificacoes();

    // Polling: Verifica a cada 15 segundos
    setInterval(carregarNotificacoes, 15000);
}