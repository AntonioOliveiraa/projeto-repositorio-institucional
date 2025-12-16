const db = require('../server');
const gerarProtocolo = require('../utils/protocoloGenerator');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- CONFIGURAÇÃO DA IA (GEMINI) ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Função que chama o Gemini de verdade
exports.analisarAssuntoIA = async (req, res) => {
    const { texto } = req.body;
    
    // Validação simples
    if (!texto || texto.length < 5) {
        return res.json({ tags: [] });
    }

    try {
        // Prompt engenhado para garantir o formato correto
        const prompt = `
            Você é um assistente de protocolo institucional. 
            Analise o seguinte assunto de um documento oficial: "${texto}".
            Gere de 3 a 5 tags curtas (máximo 2 palavras por tag) que classifiquem este documento.
            Responda APENAS as tags separadas por vírgula, sem numeração e sem texto extra.
            Exemplo de saída: Administrativo, Urgente, Solicitação de Verba
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textResponse = response.text();

        // Processa a resposta (remove quebras de linha e separa por vírgula)
        const tags = textResponse
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);

        res.json({ tags: tags });

    } catch (error) {
        console.error("Erro na IA:", error);
        // Fallback: se a IA falhar (ex: quota ou internet), retorna tags genéricas
        res.json({ tags: ['Processo Administrativo', 'Análise Manual'] });
    }
};

exports.criarDocumento = async (req, res) => {
    try {
        const { 
            categoria, assunto, requerente_nome, requerente_cpf, 
            requerente_matricula, requerente_email, requerente_telefone,
            tags_finais // <--- Recebe as tags aprovadas pelo usuário (string separada por vírgula)
        } = req.body;

        const caminho_anexo = req.file ? `/uploads/${req.file.filename}` : null;
        
        // Prepara Dados Extras
        const dadosExtrasObj = {};
        if (categoria === 'Servidor') {
            if (req.body.cargo) dadosExtrasObj.cargo = req.body.cargo;
            if (req.body.lotacao) dadosExtrasObj.lotacao = req.body.lotacao;
        } else if (categoria === 'Academico') {
            if (req.body.curso) dadosExtrasObj.curso = req.body.curso;
            if (req.body.centro) dadosExtrasObj.centro = req.body.centro;
            if (req.body.programa) dadosExtrasObj.programa = req.body.programa;
        }
        
        // --- SALVA AS TAGS NO JSON ---
        if (tags_finais) {
            // Se vier como string "Tag1,Tag2", converte para array
            dadosExtrasObj.tags = tags_finais.split(',').filter(t => t.trim() !== ''); 
        }

        const dados_extras = JSON.stringify(dadosExtrasObj);
        const protocolo = await gerarProtocolo();

        const sqlDoc = `INSERT INTO documento (numero_protocolo, categoria, assunto, requerente_nome, requerente_cpf, requerente_matricula, requerente_email, requerente_telefone, dados_extras, caminho_anexo, setor_atual_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Recebido')`;
        
        // Assume que req.usuario é populado pelo middleware de auth
        const setor_origem_id = req.usuario.setor_id; 
        const usuario_id = req.usuario.id;

        db.run(sqlDoc, [protocolo, categoria, assunto, requerente_nome, requerente_cpf, requerente_matricula, requerente_email, requerente_telefone, dados_extras, caminho_anexo, setor_origem_id], function(err) {
            if (err) return res.status(500).json({ erro: err.message });
            
            const documentoId = this.lastID;
            
            // Cria o primeiro registro no histórico de tramitação
            const sqlTramite = `INSERT INTO tramitacao (documento_id, setor_origem_id, setor_destino_id, usuario_id, despacho) VALUES (?, ?, ?, ?, 'Abertura de Protocolo - ' || ?)`;
            
            db.run(sqlTramite, [documentoId, setor_origem_id, setor_origem_id, usuario_id, categoria], (errTramite) => {
                if (errTramite) console.error("Erro ao criar trâmite inicial:", errTramite);
                res.status(201).json({ mensagem: "Criado com sucesso", protocolo: protocolo, id: documentoId });
            });
        });
    } catch (error) { 
        res.status(500).json({ erro: "Erro interno ao criar documento." }); 
    }
};

exports.listarDocumentos = (req, res) => {
    // Paginação
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;

    const { status, categoria, busca, setor_id } = req.query;
    
    let whereClause = "WHERE d.status != 'Arquivado'";
    const params = [];

    // Filtros dinâmicos
    if (status) { whereClause += " AND d.status = ?"; params.push(status); }
    if (categoria) { whereClause += " AND d.categoria = ?"; params.push(categoria); }
    if (setor_id) { whereClause += " AND d.setor_atual_id = ?"; params.push(setor_id); }
    
    if (busca) {
        whereClause += " AND (d.numero_protocolo LIKE ? OR d.requerente_nome LIKE ? OR d.requerente_cpf LIKE ? OR d.assunto LIKE ? OR d.dados_extras LIKE ?)";
        const termo = `%${busca}%`;
        params.push(termo, termo, termo, termo, termo);
    }

    const sqlCount = `SELECT COUNT(*) as total FROM documento d LEFT JOIN setor s ON d.setor_atual_id = s.id ${whereClause}`;
    const sqlData = `SELECT d.*, s.nome as nome_setor_atual FROM documento d LEFT JOIN setor s ON d.setor_atual_id = s.id ${whereClause} ORDER BY d.id DESC LIMIT ? OFFSET ?`;

    // 1. Conta o total de registros para a paginação
    db.get(sqlCount, params, (err, row) => {
        if (err) return res.status(500).json({ erro: err.message });
        
        const totalItems = row ? row.total : 0;
        const totalPages = Math.ceil(totalItems / limit);

        // 2. Busca os dados da página atual
        db.all(sqlData, [...params, limit, offset], (errData, rows) => {
            if (errData) return res.status(500).json({ erro: errData.message });
            
            // Retorna formato { data, pagination }
            res.json({ 
                data: rows, 
                pagination: { 
                    totalItems, 
                    totalPages, 
                    currentPage: page,
                    itemsPerPage: limit
                } 
            });
        });
    });
};

exports.obterDocumento = (req, res) => {
    const { id } = req.params;
    
    const sqlDoc = `SELECT d.*, s.nome as setor_nome FROM documento d JOIN setor s ON d.setor_atual_id = s.id WHERE d.id = ?`;
    const sqlAnexos = `SELECT * FROM anexo WHERE documento_id = ? ORDER BY data_upload DESC`;
    const sqlHist = `SELECT t.*, so.nome as setor_origem, sd.nome as setor_destino, u.nome as usuario_nome FROM tramitacao t JOIN setor so ON t.setor_origem_id = so.id JOIN setor sd ON t.setor_destino_id = sd.id JOIN usuario u ON t.usuario_id = u.id WHERE t.documento_id = ? ORDER BY t.data_hora DESC`;

    db.get(sqlDoc, [id], (err, doc) => {
        if (err || !doc) return res.status(404).json({ erro: "Não encontrado" });
        
        // Parse do JSON de dados extras
        if(doc.dados_extras) { 
            try { doc.dados_extras = JSON.parse(doc.dados_extras); } catch(e) {} 
        }
        
        db.all(sqlAnexos, [id], (errAnx, anexos) => {
            db.all(sqlHist, [id], (errHist, historico) => {
                res.json({ 
                    ...doc, 
                    anexos: anexos || [], 
                    historico: historico || [] 
                });
            });
        });
    });
};

exports.anexarArquivo = (req, res) => {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ erro: "Nenhum arquivo enviado." });
    
    const caminho = `/uploads/${req.file.filename}`;
    const nome_original = req.file.originalname;
    const usuario_id = req.usuario.id;
    
    const sql = `INSERT INTO anexo (documento_id, nome_arquivo, caminho, usuario_id) VALUES (?, ?, ?, ?)`;
    
    db.run(sql, [id, nome_original, caminho, usuario_id], function(err) {
        if (err) return res.status(500).json({ erro: err.message });
        
        const sqlHist = `INSERT INTO tramitacao (documento_id, setor_origem_id, setor_destino_id, usuario_id, despacho) SELECT setor_atual_id, setor_atual_id, setor_atual_id, ?, 'Novo anexo adicionado: ' || ? FROM documento WHERE id = ?`;
        
        db.run(sqlHist, [usuario_id, nome_original, id]);
        res.json({ mensagem: "Anexado com sucesso." });
    });
};

exports.finalizarDocumento = (req, res) => {
    const { id } = req.params;
    const { decisao, texto_conclusao } = req.body;
    const usuario_id = req.usuario.id;
    
    if (!['Deferido', 'Indeferido'].includes(decisao)) {
        return res.status(400).json({ erro: "Decisão inválida." });
    }

    const sqlUpdate = `UPDATE documento SET status = 'Finalizado' WHERE id = ?`;
    const sqlTramite = `INSERT INTO tramitacao (documento_id, setor_origem_id, setor_destino_id, usuario_id, despacho) SELECT setor_atual_id, setor_atual_id, setor_atual_id, ?, 'PROCESSO CONCLUÍDO. Decisão: ' || ? || '. Parecer: ' || ? FROM documento WHERE id = ?`;
    
    db.serialize(() => {
        db.run(sqlUpdate, [id]);
        db.run(sqlTramite, [usuario_id, decisao, texto_conclusao, id], (err) => {
            if (err) return res.status(500).json({ erro: "Erro ao finalizar." });
            res.json({ mensagem: `Finalizado como ${decisao}.` });
        });
    });
};

exports.editarDocumento = (req, res) => {
    const { id } = req.params;
    const { requerente_nome, requerente_cpf, requerente_matricula, requerente_email, requerente_telefone, assunto, dados_extras } = req.body;
    
    const sql = `UPDATE documento SET requerente_nome = ?, requerente_cpf = ?, requerente_matricula = ?, requerente_email = ?, requerente_telefone = ?, assunto = ?, dados_extras = ? WHERE id = ?`;
    
    const dadosExtrasStr = typeof dados_extras === 'object' ? JSON.stringify(dados_extras) : dados_extras;
    
    db.run(sql, [requerente_nome, requerente_cpf, requerente_matricula, requerente_email, requerente_telefone, assunto, dadosExtrasStr, id], function(err) {
        if (err) return res.status(500).json({ erro: err.message });
        res.json({ mensagem: "Atualizado com sucesso." });
    });
};

exports.arquivarDocumento = (req, res) => {
    const { id } = req.params;
    const usuario_id = req.usuario.id;
    
    const sqlUpdate = `UPDATE documento SET status = 'Arquivado' WHERE id = ?`;
    const sqlTramite = `INSERT INTO tramitacao (documento_id, setor_origem_id, setor_destino_id, usuario_id, despacho) SELECT setor_atual_id, setor_atual_id, setor_atual_id, ?, 'Documento Arquivado' FROM documento WHERE id = ?`;
    
    db.serialize(() => {
        db.run(sqlUpdate, [id]);
        db.run(sqlTramite, [usuario_id, id]);
        res.json({ mensagem: "Arquivado." });
    });
};