const db = require('../server');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'chave_super_secreta_mudeme_em_producao';

exports.login = (req, res) => {
    const { email, senha } = req.body;

    const sql = `SELECT * FROM usuario WHERE email = ?`;
    
    db.get(sql, [email], async (err, usuario) => {
        if (err) return res.status(500).json({ erro: 'Erro no servidor.' });
        if (!usuario) return res.status(401).json({ erro: 'Usuário não encontrado.' });

        // Comparar senha com hash (RNF-002)
        const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
        
        if (!senhaValida) {
            return res.status(401).json({ erro: 'Senha incorreta.' });
        }

        // Gerar Token (validade de 24h)
        const token = jwt.sign(
            { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil, setor_id: usuario.setor_id },
            SECRET_KEY,
            { expiresIn: '24h' }
        );

        res.json({ 
            mensagem: 'Login realizado com sucesso', 
            token: token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                perfil: usuario.perfil,
                setor_id: usuario.setor_id
            }
        });
    });
};