import { API } from '../api.js';
import { verDetalhes } from './documentos.js'; 

export function initNotificacoes() {
    const btn = document.getElementById('btnNotificacoes');
    const dropdown = document.getElementById('dropdownNotificacoes');
    const badge = document.getElementById('badgeNotificacao');
    const lista = document.getElementById('listaNotificacoes');

    // Toggle Dropdown
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
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
            
            // Filtra apenas não lidas para a contagem do Badge
            const naoLidas = notifs.filter(n => !n.lida).length;

            if (naoLidas > 0) {
                badge.textContent = naoLidas;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }

            // Renderiza Lista
            if (notifs.length === 0) {
                lista.innerHTML = '<div style="padding:15px; text-align:center; color:#94a3b8; font-size:0.85rem;">Tudo limpo por aqui!</div>';
            } else {
                lista.innerHTML = notifs.map(n => {
                    // Estilo visual diferente para lidas e não lidas
                    const bgClass = n.lida ? 'notif-read' : 'notif-unread';
                    const iconStatus = n.lida ? '<i class="ph ph-check" style="color:#10b981"></i>' : '<i class="ph ph-circle-fill" style="color:var(--primary-color); font-size:0.6rem;"></i>';
                    
                    return `
                    <div class="notif-item ${bgClass}" data-id="${n.id}" data-doc-id="${n.documento_id}" data-lida="${n.lida}">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <div style="font-size:0.85rem; font-weight:${n.lida ? '400' : '600'}; color:var(--text-main); flex:1;">
                                ${n.mensagem}
                            </div>
                            <div style="margin-left:10px;">${iconStatus}</div>
                        </div>
                        <div style="font-size:0.75rem; color:var(--primary-color); margin-top:2px;">
                            Ref: ${n.numero_protocolo || 'Geral'}
                        </div>
                        <div style="font-size:0.7rem; color:#94a3b8; margin-top:4px;">
                            ${new Date(n.data_hora).toLocaleString()}
                        </div>
                    </div>
                `}).join('');

                // Adicionar eventos
                document.querySelectorAll('.notif-item').forEach(item => {
                    item.addEventListener('click', async () => {
                        const id = item.dataset.id;
                        const docId = item.dataset.docId;
                        const isLida = item.dataset.lida === '1';

                        // 1. Abre o modal de detalhes do documento (Fluxo Lógico)
                        if (docId && docId !== 'null') {
                            verDetalhes(docId);
                            // Esconde o dropdown para limpar a visão
                            dropdown.classList.add('hidden');
                        }

                        // 2. Marca como lida no backend (se ainda não for)
                        if (!isLida) {
                            try {
                                await API.put(`/notificacoes/${id}/ler`, {});
                                // Recarrega para atualizar o badge e o estilo visual
                                carregarNotificacoes();
                            } catch (error) {
                                console.error('Erro ao marcar notificação', error);
                            }
                        }
                    });
                });
            }

        } catch (error) {
            console.error("Erro ao buscar notificações", error);
        }
    };

    carregarNotificacoes();

    // Polling: Verifica a cada 15 segundos
    setInterval(carregarNotificacoes, 15000);
}