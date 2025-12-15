import { API } from '../api.js';

export async function initDashboard() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = '<div class="loading-spinner">Carregando indicadores...</div>';

    try {
        // Busca todos os documentos para calcular estatísticas no frontend (MVP)
        const docs = await API.get('/documentos');

        const total = docs.length;
        const recebidos = docs.filter(d => d.status === 'Recebido').length;
        const analise = docs.filter(d => d.status === 'Em Análise').length;
        const finalizados = docs.filter(d => d.status === 'Finalizado').length;

        contentArea.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon" style="background:#eff6ff; color:#2563eb"><i class="ph ph-files"></i></div>
                    <div class="stat-info">
                        <h3>${total}</h3>
                        <p>Total de Protocolos</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:#fff7ed; color:#ea580c"><i class="ph ph-hourglass"></i></div>
                    <div class="stat-info">
                        <h3>${analise}</h3>
                        <p>Em Análise</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:#f0fdf4; color:#16a34a"><i class="ph ph-check-circle"></i></div>
                    <div class="stat-info">
                        <h3>${finalizados}</h3>
                        <p>Finalizados</p>
                    </div>
                </div>
            </div>

            <h3>Atividades Recentes</h3>
            <div id="dashboardRecentTable"></div>
        `;
        
        // Reutilizar a tabela para mostrar os 5 últimos
        const recentes = docs.slice(0, 5); 
        // Importar dinamicamente UI para evitar ciclo ou usar global se preferir, 
        // mas aqui vamos montar HTML simples para não complicar imports
        const tabelaHtml = `
            <table class="card-table">
                <thead><tr><th>Protocolo</th><th>Assunto</th><th>Status</th></tr></thead>
                <tbody>
                    ${recentes.map(d => `
                        <tr>
                            <td>${d.numero_protocolo}</td>
                            <td>${d.assunto}</td>
                            <td><span class="badge badge-${d.status === 'Recebido' ? 'recebido' : 'analise'}">${d.status}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        document.getElementById('dashboardRecentTable').innerHTML = tabelaHtml;

    } catch (error) {
        contentArea.innerHTML = '<p class="error">Erro ao carregar dashboard.</p>';
    }
}