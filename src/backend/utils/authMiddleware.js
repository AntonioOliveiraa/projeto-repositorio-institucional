const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'chave_super_secreta_mudeme_em_producao';

exports.verificarToken = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({ erro: 'Nenhum token fornecido.' });
    }

    // Remove o prefixo "Bearer " se existir
    const tokenLimpo = token.replace('Bearer ', '');

    jwt.verify(tokenLimpo, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).json({ erro: 'Falha na autenticação do token.' });
        }
        
        // Salva os dados do usuário na requisição para uso nos controllers
        req.usuario = decoded; 
        next();
    });
};

// Middleware para verificar permissão (RF-006)
exports.verificarPermissao = (perfisPermitidos) => {
    return (req, res, next) => {
        if (!perfisPermitidos.includes(req.usuario.perfil)) {
            return res.status(403).json({ erro: 'Acesso negado para este perfil.' });
        }
        next();
    };
};