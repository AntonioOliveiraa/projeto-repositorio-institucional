const db = require('../server');
const gerarProtocolo = require('../utils/protocoloGenerator');

// Simulação da IA para RF-008 [cite: 75-77]
// Em produção, isso chamaria uma API real (ex: OpenAI/Gemini)
const simularClassificacaoIA = (textoOuArquivo) => {
    const tagsPossiveis = ['Financeiro', 'Administrativo', 'Urgente', 'Jurídico', 'RH', 'Contrato'];
    // Retorna 3 tags aleatórias
    const shuffled = tagsPossiveis.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
};

exports.criarDocumento = async (req, res) => {
    try {
        const { assunto, tipo_documento, remetente, setor_origem_id, usuario_id } = req.body;
        const caminho_anexo = req.file ? `/uploads/${req.file.filename}` : null;

        // 1. Gerar Protocolo Único (RF-002)
        const protocolo = await gerarProtocolo();

        // 2. Inserir Documento
        const sqlDoc = `
            INSERT INTO documento (numero_protocolo, assunto, tipo_documento, remetente, caminho_anexo, setor_atual_id, status)
            VALUES (?, ?, ?, ?, ?, ?, 'Recebido')
        `;

        db.run(sqlDoc, [protocolo, assunto, tipo_documento, remetente, caminho_anexo, setor_origem_id], function(err) {
            if (err) return res.status(500).json({ erro: err.message });
            
            const documentoId = this.lastID;

            // 3. Registrar Tramitação Inicial (Criação) - Histórico (RF-005)
            const sqlTramite = `
                INSERT INTO tramitacao (documento_id, setor_origem_id, setor_destino_id, usuario_id, despacho)
                VALUES (?, ?, ?, ?, 'Documento cadastrado no sistema.')
            `;
            // Assumindo que na criação, origem = destino
            db.run(sqlTramite, [documentoId, setor_origem_id, setor_origem_id, usuario_id], (err) => {
                if(err) console.error("Erro ao criar histórico inicial:", err);
            });

            // 4. Classificação Automática (IA) (RF-008)
            const tagsSugeridas = simularClassificacaoIA(assunto);
            // Aqui salvaríamos na tabela documento_tag (simplificado para resposta)
            
            res.status(201).json({ 
                mensagem: "Documento criado com sucesso", 
                protocolo: protocolo,
                id: documentoId,
                tags_ia: tagsSugeridas
            });
        });

    } catch (error) {
        res.status(500).json({ erro: "Erro interno ao gerar protocolo." });
    }
};

exports.listarDocumentos = (req, res) => {
    // RF-001 e RF-007 (Filtros)
    const { status, setor_atual_id, busca } = req.query;
    let sql = `
        SELECT d.*, s.nome as nome_setor_atual 
        FROM documento d
        LEFT JOIN setor s ON d.setor_atual_id = s.id
        WHERE d.status != 'Arquivado' -- Exclusão lógica (RF-001)
    `;
    
    const params = [];

    if (status) {
        sql += " AND d.status = ?";
        params.push(status);
    }
    if (setor_atual_id) {
        sql += " AND d.setor_atual_id = ?";
        params.push(setor_atual_id);
    }
    if (busca) {
        sql += " AND (d.numero_protocolo LIKE ? OR d.assunto LIKE ? OR d.remetente LIKE ?)";
        const termo = `%${busca}%`;
        params.push(termo, termo, termo);
    }

    sql += " ORDER BY d.id DESC";

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(rows);
    });
};

exports.obterDocumento = (req, res) => {
    const { id } = req.params;
    
    // Busca dados do documento
    const sqlDoc = `SELECT d.*, s.nome as setor_nome FROM documento d JOIN setor s ON d.setor_atual_id = s.id WHERE d.id = ?`;
    
    // Busca histórico de tramitação (RF-005)
    const sqlHist = `
        SELECT t.*, so.nome as setor_origem, sd.nome as setor_destino, u.nome as usuario_nome
        FROM tramitacao t
        JOIN setor so ON t.setor_origem_id = so.id
        JOIN setor sd ON t.setor_destino_id = sd.id
        JOIN usuario u ON t.usuario_id = u.id
        WHERE t.documento_id = ?
        ORDER BY t.data_hora DESC
    `;

    db.get(sqlDoc, [id], (err, doc) => {
        if (err || !doc) return res.status(404).json({ erro: "Documento não encontrado" });

        db.all(sqlHist, [id], (errHist, historico) => {
            if (errHist) return res.status(500).json({ erro: "Erro ao buscar histórico" });
            
            res.json({ ...doc, historico });
        });
    });
};