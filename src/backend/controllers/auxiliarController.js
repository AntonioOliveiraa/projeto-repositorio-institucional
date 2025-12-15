const db = require('../server');

exports.listarSetores = (req, res) => {
    db.all("SELECT * FROM setor", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

exports.listarUsuarios = (req, res) => {
    // Retorna lista simplificada para selects
    db.all("SELECT id, nome, setor_id FROM usuario", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};