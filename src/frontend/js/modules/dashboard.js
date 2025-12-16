import { API } from '../api.js';

export async function initDashboard() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = '<div class="loading-spinner">Carregando indicadores...</div>';

    try {
        const docs = await API.get('/documentos');

        // Renderização do HTML do Dashboard com FILTROS DE DATA (RF-010)
        contentArea.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2rem; flex-wrap:wrap; gap:10px;">
                <h2>Painel de Controle</h2>
                
                <div style="display:flex; gap:10px; align-items:center; background:#fff; padding:10px; border-radius:8px; border:1px solid #ddd;">
                    <div style="display:flex; flex-direction:column;">
                        <label style="font-size:0.7rem; color:#666;">Data Início</label>
                        <input type="date" id="relDataInicio" style="padding:4px; border:1px solid #ccc; border-radius:4px;">
                    </div>
                    <div style="display:flex; flex-direction:column;">
                        <label style="font-size:0.7rem; color:#666;">Data Fim</label>
                        <input type="date" id="relDataFim" style="padding:4px; border:1px solid #ccc; border-radius:4px;">
                    </div>
                    <button id="btnRelatorioGerencial" class="btn-primary" style="display:flex; align-items:center; gap:8px; padding: 10px 15px; margin-left:5px;">
                        <i class="ph ph-file-pdf"></i> Gerar Relatório
                    </button>
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon" style="background:#eff6ff; color:#2563eb"><i class="ph ph-files"></i></div>
                    <div class="stat-info"><h3>${docs.length}</h3><p>Total Ativos</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:#fff7ed; color:#ea580c"><i class="ph ph-hourglass"></i></div>
                    <div class="stat-info"><h3>${docs.filter(d=>d.status==='Em Análise').length}</h3><p>Em Análise</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:#f0fdf4; color:#16a34a"><i class="ph ph-check-circle"></i></div>
                    <div class="stat-info"><h3>${docs.filter(d=>d.status==='Finalizado').length}</h3><p>Finalizados</p></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:#f8fafc; color:#64748b"><i class="ph ph-tray"></i></div>
                    <div class="stat-info"><h3>${docs.filter(d=>d.status==='Recebido').length}</h3><p>Novos</p></div>
                </div>
            </div>

            <h3>Atividades Recentes</h3>
            <div id="dashboardRecentTable"></div>
        `;
        
        // Tabela Recentes (Top 5)
        const tabelaHtml = `
            <table class="card-table">
                <thead><tr><th>Protocolo</th><th>Assunto</th><th>Requerente</th><th>Status</th></tr></thead>
                <tbody>
                    ${docs.slice(0, 5).map(d => `
                        <tr>
                            <td style="font-weight:bold;">${d.numero_protocolo}</td>
                            <td>${d.assunto}</td>
                            <td>${d.requerente_nome}</td>
                            <td><span class="badge ${getStatusClass(d.status)}">${d.status}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        document.getElementById('dashboardRecentTable').innerHTML = tabelaHtml;

        // Lógica do Botão de Relatório com Filtro
        document.getElementById('btnRelatorioGerencial').addEventListener('click', () => {
            const inicio = document.getElementById('relDataInicio').value;
            const fim = document.getElementById('relDataFim').value;
            
            // Filtra os documentos se as datas forem fornecidas
            let docsFiltrados = docs;
            let periodoTexto = "Período: Completo";

            if (inicio || fim) {
                const dataInicio = inicio ? new Date(inicio) : new Date('1900-01-01');
                const dataFim = fim ? new Date(fim) : new Date();
                if(fim) dataFim.setHours(23,59,59); // Incluir o dia final inteiro

                docsFiltrados = docs.filter(d => {
                    const dataDoc = new Date(d.data_recebimento);
                    return dataDoc >= dataInicio && dataDoc <= dataFim;
                });
                
                periodoTexto = `Período: ${inicio ? new Date(inicio).toLocaleDateString() : 'Início'} até ${fim ? new Date(fim).toLocaleDateString() : 'Hoje'}`;
            }

            // Recalcula estatísticas baseadas no filtro
            const stats = {
                total: docsFiltrados.length,
                recebidos: docsFiltrados.filter(d => d.status === 'Recebido').length,
                analise: docsFiltrados.filter(d => d.status === 'Em Análise').length,
                finalizados: docsFiltrados.filter(d => d.status === 'Finalizado').length,
                docs: docsFiltrados,
                periodo: periodoTexto
            };

            if (stats.total === 0) {
                alert("Nenhum documento encontrado neste período.");
                return;
            }

            gerarRelatorioPDF(stats);
        });

    } catch (error) {
        console.error(error);
        contentArea.innerHTML = '<p class="error">Erro ao carregar dashboard.</p>';
    }
}

function getStatusClass(status) {
    if(status === 'Recebido') return 'recebido';
    if(status === 'Em Análise') return 'analise';
    if(status === 'Finalizado') return 'finalizado';
    return '';
}

function gerarRelatorioPDF(dados) {
    const { total, recebidos, analise, finalizados, docs, periodo } = dados;
    const dataHora = new Date().toLocaleString();

    const listaRecentes = docs.slice(0, 50).map(d => `
        <tr>
            <td>${d.numero_protocolo}</td>
            <td>${new Date(d.data_recebimento).toLocaleDateString()}</td>
            <td>${d.categoria}</td>
            <td>${d.assunto}</td>
            <td>${d.requerente_nome}</td>
            <td>${d.nome_setor_atual || '-'}</td>
            <td>${d.status}</td>
        </tr>
    `).join('');

    const html = `
    <html>
    <head>
        <title>Relatório Gerencial</title>
        <style>
            body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 24px; color: #2563eb; text-transform: uppercase; }
            .summary-box { display: flex; justify-content: space-between; gap: 15px; margin-bottom: 40px; }
            .card { flex: 1; border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; background: #f8fafc; }
            .card-num { font-size: 32px; font-weight: bold; color: #2563eb; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { background: #e2e8f0; text-align: left; padding: 10px 8px; border-bottom: 2px solid #94a3b8; }
            td { border-bottom: 1px solid #e2e8f0; padding: 8px; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .footer { margin-top: 50px; text-align: center; font-size: 10px; border-top: 1px solid #ccc; padding-top: 20px; color: #999; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Relatório Gerencial de Protocolo</h1>
            <p>${periodo}</p>
            <p><strong>Gerado em:</strong> ${dataHora}</p>
        </div>

        <div style="font-weight:bold; margin-bottom:10px;">Resumo Quantitativo do Período</div>
        <div class="summary-box">
            <div class="card"><div style="font-size:12px;">Total</div><div class="card-num">${total}</div></div>
            <div class="card"><div style="font-size:12px;">Novos</div><div class="card-num">${recebidos}</div></div>
            <div class="card"><div style="font-size:12px;">Em Análise</div><div class="card-num">${analise}</div></div>
            <div class="card"><div style="font-size:12px;">Finalizados</div><div class="card-num">${finalizados}</div></div>
        </div>

        <div style="font-weight:bold; margin-bottom:10px;">Detalhamento (Até 50 registros)</div>
        <table>
            <thead><tr><th>Protocolo</th><th>Data</th><th>Categoria</th><th>Assunto</th><th>Requerente</th><th>Setor</th><th>Status</th></tr></thead>
            <tbody>${listaRecentes}</tbody>
        </table>

        <div class="footer"><p>Sistema de Protocolo Geral - Documento Oficial</p></div>
        <script>window.print();</script>
    </body>
    </html>
    `;

    const janela = window.open('', '', 'width=950,height=900');
    janela.document.write(html);
    janela.document.close();
}