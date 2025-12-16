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
        const { 
            categoria, // 'Servidor' ou 'Academico'
            assunto,   // O item selecionado (ex: Licença, Trancamento)
            
            // Dados Comuns
            requerente_nome,
            requerente_cpf,
            requerente_matricula,
            requerente_email,
            requerente_telefone,

            // Dados Específicos (serão agrupados)
            ...outrosDados
        } = req.body;

        const caminho_anexo = req.file ? `/uploads/${req.file.filename}` : null;
        
        // Separa os dados específicos para salvar como JSON
        // Remove campos que já foram tratados ou são de controle
        const camposIgnorar = ['setor_origem_id', 'usuario_id'];
        const dadosExtrasObj = {};
        
        Object.keys(outrosDados).forEach(key => {
            if (!camposIgnorar.includes(key)) {
                dadosExtrasObj[key] = outrosDados[key];
            }
        });

        const dados_extras = JSON.stringify(dadosExtrasObj);

        // 1. Gerar Protocolo Único (RF-002)
        const protocolo = await gerarProtocolo();

        // 2. Inserir Documento
        const sqlDoc = `
            INSERT INTO documento (
                numero_protocolo, categoria, assunto, 
                requerente_nome, requerente_cpf, requerente_matricula, requerente_email, requerente_telefone,
                dados_extras, caminho_anexo, setor_atual_id, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Recebido')
        `;

        // Assumindo setor_origem_id padrão = 1 (Protocolo Geral) se não vier
        const setor_origem_id = req.usuario.setor_id; 

        db.run(sqlDoc, [
            protocolo, categoria, assunto,
            requerente_nome, requerente_cpf, requerente_matricula, requerente_email, requerente_telefone,
            dados_extras, caminho_anexo, setor_origem_id
        ], function(err) {
            if (err) return res.status(500).json({ erro: err.message });
            
            const documentoId = this.lastID;

            // 3. Registrar Tramitação Inicial (Criação) - Histórico (RF-005)
            const sqlTramite = `
                INSERT INTO tramitacao (documento_id, setor_origem_id, setor_destino_id, usuario_id, despacho)
                VALUES (?, ?, ?, ?, 'Abertura de Protocolo - ' + ?)
            `;
            const usuario_id = req.usuario.id;
            
            db.run(sqlTramite, [documentoId, setor_origem_id, setor_origem_id, usuario_id, categoria], (err) => {
                if(err) console.error("Erro histórico inicial:", err);
            });

            // 4. Classificação Automática (IA) (RF-008)
            const tagsSugeridas = simularClassificacaoIA(assunto);

            res.status(201).json({ 
                mensagem: "Documento registrado com sucesso", 
                protocolo: protocolo,
                id: documentoId,
                tags_ia: tagsSugeridas
            });
        });

    } catch (error) {
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
};

exports.listarDocumentos = (req, res) => {
    // RF-001 e RF-007 (Filtros)
    const { status, categoria, busca } = req.query;
    
    let sql = `
        SELECT d.*, s.nome as nome_setor_atual 
        FROM documento d
        LEFT JOIN setor s ON d.setor_atual_id = s.id
        WHERE d.status != 'Arquivado'
    `;
    
    const params = [];

    if (status) {
        sql += " AND d.status = ?";
        params.push(status);
    }
    if (categoria) {
        sql += " AND d.categoria = ?";
        params.push(categoria);
    }
    if (busca) {
        sql += " AND (d.numero_protocolo LIKE ? OR d.requerente_nome LIKE ? OR d.requerente_cpf LIKE ?)";
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

        // Parse do JSON de dados extras para devolver como objeto
        if(doc.dados_extras) {
            try { doc.dados_extras = JSON.parse(doc.dados_extras); } catch(e) {}
        }

        db.all(sqlHist, [id], (errHist, historico) => {
            if (errHist) return res.status(500).json({ erro: "Erro ao buscar histórico" });
            res.json({ ...doc, historico });
        });
    });
};