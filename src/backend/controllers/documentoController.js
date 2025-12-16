const db = require('../server');
const gerarProtocolo = require('../utils/protocoloGenerator');

// Simulação da IA para RF-008 [cite: 75-77]
// Em produção, isso chamaria uma API real (ex: OpenAI/Gemini)
const simularClassificacaoIA = (texto) => {
    const tags = ['Urgente', 'Administrativo', 'Análise Técnica', 'Deferimento', 'Indeferimento'];
    return tags.sort(() => 0.5 - Math.random()).slice(0, 3);
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
            requerente_telefone
        } = req.body;

        const caminho_anexo = req.file ? `/uploads/${req.file.filename}` : null;
        
        // Filtro de Dados Extras por Categoria
        // Em vez de pegar tudo, pegamos apenas o que pertence à categoria
        const dadosExtrasObj = {};

        if (categoria === 'Servidor') {
            // Campos específicos de Servidor
            if (req.body.cargo) dadosExtrasObj.cargo = req.body.cargo;
            if (req.body.lotacao) dadosExtrasObj.lotacao = req.body.lotacao;
        } else if (categoria === 'Academico') {
            // Campos específicos de Acadêmico
            if (req.body.curso) dadosExtrasObj.curso = req.body.curso;
            if (req.body.centro) dadosExtrasObj.centro = req.body.centro;
            if (req.body.programa) dadosExtrasObj.programa = req.body.programa;
        }
        
        const dados_extras = JSON.stringify(dadosExtrasObj);
        // -----------------------------------------------------

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
        const usuario_id = req.usuario.id;

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
            
            db.run(sqlTramite, [documentoId, setor_origem_id, setor_origem_id, usuario_id, categoria], (err) => { if(err) console.error("Erro histórico inicial:", err); });

            // 4. Classificação Automática (IA) (RF-008)
            const tagsSugeridas = simularClassificacaoIA(assunto);

            res.status(201).json({ 
                mensagem: "Documento registrado com sucesso", 
                protocolo: protocolo, 
                id: documentoId, 
                tags_ia: tagsSugeridas 
            });
        });
    } catch (error) { res.status(500).json({ erro: "Erro interno." }); }
};

exports.listarDocumentos = (req, res) => {
    // Adicionado setor_id aos parâmetros de consulta
    const { status, categoria, busca, setor_id } = req.query;
    
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
    // Filtro SQL por Setor
    if (setor_id) {
        sql += " AND d.setor_atual_id = ?";
        params.push(setor_id);
    }

    if (busca) {
        sql += " AND (d.numero_protocolo LIKE ? OR d.requerente_nome LIKE ? OR d.requerente_cpf LIKE ? OR d.assunto LIKE ? OR d.dados_extras LIKE ?)";
        const termo = `%${busca}%`;
        params.push(termo, termo, termo, termo, termo);
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
    
    // Busca anexos relacionados
    const sqlAnexos = `SELECT * FROM anexo WHERE documento_id = ? ORDER BY data_upload DESC`;
    
    // Busca histórico de tramitações
    const sqlHist = `SELECT t.*, so.nome as setor_origem, sd.nome as setor_destino, u.nome as usuario_nome FROM tramitacao t JOIN setor so ON t.setor_origem_id = so.id JOIN setor sd ON t.setor_destino_id = sd.id JOIN usuario u ON t.usuario_id = u.id WHERE t.documento_id = ? ORDER BY t.data_hora DESC`;

    db.get(sqlDoc, [id], (err, doc) => {
        if (err || !doc) return res.status(404).json({ erro: "Documento não encontrado" });
        if(doc.dados_extras) { try { doc.dados_extras = JSON.parse(doc.dados_extras); } catch(e) {} }
        
        db.all(sqlAnexos, [id], (errAnx, anexos) => {
            db.all(sqlHist, [id], (errHist, historico) => {
                res.json({ ...doc, anexos: anexos || [], historico: historico || [] });
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
        
        // Opcional: Registrar no histórico que houve um anexo
        const sqlHist = `INSERT INTO tramitacao (documento_id, setor_origem_id, setor_destino_id, usuario_id, despacho) SELECT setor_atual_id, setor_atual_id, setor_atual_id, ?, 'Novo anexo adicionado: ' || ? FROM documento WHERE id = ?`;
        db.run(sqlHist, [usuario_id, nome_original, id]);

        res.json({ mensagem: "Arquivo anexado com sucesso." });
    });
};

exports.finalizarDocumento = (req, res) => {
    const { id } = req.params;
    const { decisao, texto_conclusao } = req.body; // decisao: 'Deferido' ou 'Indeferido'
    const usuario_id = req.usuario.id;

    if (!['Deferido', 'Indeferido'].includes(decisao)) {
        return res.status(400).json({ erro: "Decisão inválida." });
    }

    const statusFinal = 'Finalizado'; // Status geral do sistema
    
    // Atualiza status do documento
    const sqlUpdate = `UPDATE documento SET status = ? WHERE id = ?`;
    
    // Insere tramitação final com a decisão
    const sqlTramite = `
        INSERT INTO tramitacao (documento_id, setor_origem_id, setor_destino_id, usuario_id, despacho)
        SELECT setor_atual_id, setor_atual_id, setor_atual_id, ?, 'PROCESSO CONCLUÍDO. Decisão: ' || ? || '. Parecer: ' || ?
        FROM documento WHERE id = ?
    `;

    db.serialize(() => {
        db.run(sqlUpdate, [id]);
        db.run(sqlTramite, [usuario_id, decisao, texto_conclusao, id], (err) => {
            if (err) return res.status(500).json({ erro: "Erro ao finalizar." });
            res.json({ mensagem: `Finalizado como ${decisao}.` });
        });
    });
};

// Funções de Edição e Arquivamento
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