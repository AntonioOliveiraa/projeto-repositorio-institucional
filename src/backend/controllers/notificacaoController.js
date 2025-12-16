const db = require('../server');

exports.listarNotificacoes = (req, res) => {
    const usuario_id = req.usuario.id;

    // Regra: Trazer não lidas OU lidas recentemente (últimos 7 dias)
    const sql = `
        SELECT n.*, d.numero_protocolo, d.assunto
        FROM notificacao n
        LEFT JOIN documento d ON n.documento_id = d.id
        WHERE n.usuario_id = ? 
        AND (n.lida = 0 OR n.data_hora >= date('now', '-7 days'))
        ORDER BY n.lida ASC, n.data_hora DESC
    `;

    db.all(sql, [usuario_id], (err, rows) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(rows);
    });
};

exports.marcarComoLida = (req, res) => {
    const { id } = req.params;
    const usuario_id = req.usuario.id;

    const sql = `UPDATE notificacao SET lida = 1 WHERE id = ? AND usuario_id = ?`;

    db.run(sql, [id, usuario_id], function(err) {
        if (err) return res.status(500).json({ erro: err.message });
        res.json({ mensagem: "Notificação marcada como lida." });
    });
};