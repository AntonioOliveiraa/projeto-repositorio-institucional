import { API } from '../api.js';

export async function initDashboard() {
    const contentArea = document.getElementById('contentArea');
    contentArea.innerHTML = '<div class="loading-spinner">Carregando indicadores...</div>';

    try {
        // Busca todos os documentos (limite alto para estatísticas)
        const response = await API.get('/documentos?limit=10000');
        const docs = response.data || []; // Garante que seja um array

        // Cálculos estatísticos no frontend
        const total = docs.length;
        const recebidos = docs.filter(d => d.status === 'Recebido').length;
        const analise = docs.filter(d => d.status === 'Em Análise').length;
        const finalizados = docs.filter(d => d.status === 'Finalizado').length;

        // Renderização do HTML do Dashboard
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
                    <div class="stat-info">
                        <h3>${total}</h3>
                        <p>Total Ativos</p>
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
                <div class="stat-card">
                    <div class="stat-icon" style="background:#f8fafc; color:#64748b"><i class="ph ph-tray"></i></div>
                    <div class="stat-info">
                        <h3>${recebidos}</h3>
                        <p>Novos (Recebido)</p>
                    </div>
                </div>
            </div>

            <h3>Atividades Recentes</h3>
            <div id="dashboardRecentTable"></div>
        `;
        
        // Renderiza tabela simplificada (Top 5)
        const recentes = docs.slice(0, 5); 
        const tabelaHtml = `
            <table class="card-table">
                <thead><tr><th>Protocolo</th><th>Assunto</th><th>Requerente</th><th>Status</th></tr></thead>
                <tbody>
                    ${recentes.map(d => `
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

        // Adiciona evento ao botão de relatório com filtro de data
        document.getElementById('btnRelatorioGerencial').addEventListener('click', () => {
            const inicio = document.getElementById('relDataInicio').value;
            const fim = document.getElementById('relDataFim').value;
            
            // Filtra os documentos se as datas forem fornecidas
            let docsFiltrados = docs;
            let periodoTexto = "Período: Completo";

            if (inicio || fim) {
                const dataInicio = inicio ? new Date(inicio) : new Date('1900-01-01');
                const dataFim = fim ? new Date(fim) : new Date();
                if(fim) dataFim.setHours(23,59,59); // Fim do dia

                docsFiltrados = docs.filter(d => {
                    const dataDoc = new Date(d.data_recebimento);
                    return dataDoc >= dataInicio && dataDoc <= dataFim;
                });
                
                periodoTexto = `Período: ${inicio ? new Date(inicio).toLocaleDateString() : 'Início'} até ${fim ? new Date(fim).toLocaleDateString() : 'Hoje'}`;
            }

            // Recalcula estatísticas para o PDF
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

// --- Função que gera o Relatório PDF ---
function gerarRelatorioPDF(dados) {
    const { total, recebidos, analise, finalizados, docs, periodo } = dados;
    const dataHora = new Date().toLocaleString();

    // Lista para o PDF (limite de 50 para não quebrar muitas páginas)
    const listaRecentes = docs.slice(0, 50).map(d => `
        <tr>
            <td>${d.numero_protocolo}</td>
            <td>${d.data_recebimento ? new Date(d.data_recebimento).toLocaleDateString() : '-'}</td>
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
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; max-width: 100%; }
            
            .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 24px; color: #2563eb; text-transform: uppercase; letter-spacing: 1px; }
            .header p { margin: 5px 0 0; font-size: 14px; color: #666; }
            
            .summary-box { display: flex; justify-content: space-between; gap: 15px; margin-bottom: 40px; }
            .card { flex: 1; border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; background: #f8fafc; }
            .card-num { font-size: 32px; font-weight: bold; color: #2563eb; margin: 10px 0; }
            .card-label { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 600; }

            .table-container { margin-bottom: 30px; }
            .section-title { font-size: 16px; font-weight: bold; margin-bottom: 15px; border-left: 5px solid #2563eb; padding-left: 10px; color: #1e293b; }
            
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { background: #e2e8f0; text-align: left; padding: 10px 8px; border-bottom: 2px solid #94a3b8; font-weight: bold; text-transform: uppercase; }
            td { border-bottom: 1px solid #e2e8f0; padding: 8px; }
            tr:nth-child(even) { background-color: #f8fafc; }

            .footer { margin-top: 50px; text-align: center; font-size: 10px; border-top: 1px solid #ccc; padding-top: 20px; color: #999; }
            
            .signature-area { margin-top: 80px; display: flex; justify-content: space-around; page-break-inside: avoid; }
            .signature-line { width: 40%; border-top: 1px solid #000; text-align: center; padding-top: 10px; font-weight: bold; font-size: 12px; }
            
            @media print {
                body { padding: 0; }
                .card { border: 1px solid #000; }
                th { background: #ccc !important; -webkit-print-color-adjust: exact; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Relatório Gerencial de Protocolo</h1>
            <p>Repositório Institucional - Módulo de Gestão</p>
            <p><strong>${periodo}</strong></p>
            <p><strong>Gerado em:</strong> ${dataHora}</p>
        </div>

        <div class="section-title">Resumo Quantitativo</div>
        <div class="summary-box">
            <div class="card">
                <div class="card-label">Total</div>
                <div class="card-num">${total}</div>
            </div>
            <div class="card">
                <div class="card-label">Novos</div>
                <div class="card-num">${recebidos}</div>
            </div>
            <div class="card">
                <div class="card-label">Em Análise</div>
                <div class="card-num">${analise}</div>
            </div>
            <div class="card">
                <div class="card-label">Finalizados</div>
                <div class="card-num">${finalizados}</div>
            </div>
        </div>

        <div class="table-container">
            <div class="section-title">Listagem de Protocolos (Amostra)</div>
            <table>
                <thead>
                    <tr>
                        <th>Protocolo</th>
                        <th>Data</th>
                        <th>Categoria</th>
                        <th>Assunto</th>
                        <th>Requerente</th>
                        <th>Setor Atual</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${listaRecentes}
                </tbody>
            </table>
        </div>

        <div class="signature-area">
            <div class="signature-line">
                Responsável pelo Setor
                <br><span style="font-weight:normal; font-size:10px;">Assinatura / Carimbo</span>
            </div>
            <div class="signature-line">
                Gestão Administrativa
                <br><span style="font-weight:normal; font-size:10px;">Visto de Conferência</span>
            </div>
        </div>

        <div class="footer">
            <p>Relatório gerado automaticamente pelo Sistema de Protocolo Geral.</p>
        </div>

        <script>
            window.print();
        </script>
    </body>
    </html>
    `;

    const janela = window.open('', '', 'width=950,height=900');
    janela.document.write(html);
    janela.document.close();
}