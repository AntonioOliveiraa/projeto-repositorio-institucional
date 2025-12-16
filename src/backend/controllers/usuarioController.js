const db = require('../server');
const bcrypt = require('bcrypt');

exports.listarUsuarios = (req, res) => {
    // Traz usuários com o nome do setor, sem expor a senha hash
    const sql = `
        SELECT u.id, u.nome, u.email, u.perfil, u.setor_id, s.nome as setor_nome 
        FROM usuario u
        LEFT JOIN setor s ON u.setor_id = s.id
        ORDER BY u.nome ASC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(rows);
    });
};

exports.obterUsuario = (req, res) => {
    const { id } = req.params;
    const sql = `SELECT id, nome, email, perfil, setor_id FROM usuario WHERE id = ?`;
    
    db.get(sql, [id], (err, row) => {
        if (err) return res.status(500).json({ erro: err.message });
        if (!row) return res.status(404).json({ erro: "Usuário não encontrado." });
        res.json(row);
    });
};

exports.criarUsuario = async (req, res) => {
    const { nome, email, senha, perfil, setor_id } = req.body;
    
    // Validação básica
    if (!nome || !email || !senha || !perfil || !setor_id) {
        return res.status(400).json({ erro: "Todos os campos são obrigatórios." });
    }

    try {
        // Gera hash da senha
        const saltRounds = 10;
        const senha_hash = await bcrypt.hash(senha, saltRounds);

        const sql = `
            INSERT INTO usuario (nome, email, senha_hash, perfil, setor_id)
            VALUES (?, ?, ?, ?, ?)
        `;

        db.run(sql, [nome, email, senha_hash, perfil, setor_id], function(err) {
            if (err) {
                // Erro comum: Email duplicado
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ erro: "E-mail já cadastrado." });
                }
                return res.status(500).json({ erro: err.message });
            }
            res.status(201).json({ message: "Usuário criado com sucesso.", id: this.lastID });
        });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao processar senha." });
    }
};

exports.editarUsuario = async (req, res) => {
    const { id } = req.params;
    const { nome, email, senha, perfil, setor_id } = req.body;

    try {
        // Se enviou senha, atualiza tudo. Se não, mantém a senha antiga.
        if (senha && senha.trim() !== "") {
            const senha_hash = await bcrypt.hash(senha, 10);
            const sql = `UPDATE usuario SET nome=?, email=?, senha_hash=?, perfil=?, setor_id=? WHERE id=?`;
            
            db.run(sql, [nome, email, senha_hash, perfil, setor_id, id], function(err) {
                if (err) return res.status(500).json({ erro: err.message });
                res.json({ message: "Usuário atualizado com sucesso." });
            });
        } else {
            const sql = `UPDATE usuario SET nome=?, email=?, perfil=?, setor_id=? WHERE id=?`;
            
            db.run(sql, [nome, email, perfil, setor_id, id], function(err) {
                if (err) return res.status(500).json({ erro: err.message });
                res.json({ message: "Usuário atualizado com sucesso." });
            });
        }
    } catch (error) {
        res.status(500).json({ erro: "Erro interno." });
    }
};

exports.excluirUsuario = (req, res) => {
    const { id } = req.params;
    
    // Evitar auto-exclusão (opcional, mas recomendado)
    if (parseInt(id) === req.usuario.id) {
        return res.status(400).json({ erro: "Você não pode excluir seu próprio usuário." });
    }

    const sql = `DELETE FROM usuario WHERE id = ?`;

    db.run(sql, [id], function(err) {
        if (err) return res.status(500).json({ erro: "Erro ao excluir (verifique se há vínculos)." });
        res.json({ message: "Usuário excluído com sucesso." });
    });
};