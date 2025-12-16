const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/apiRoutes');
// Importar middleware de auth (não aplica no login, mas aplicará na API)
const { verificarToken } = require('./utils/authMiddleware');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Para parsear form-data sem arquivo

// Rotas Públicas (Login)
app.use('/auth', authRoutes);

// Rotas Protegidas (API do Sistema)
// Todas as rotas /api agora exigem token!
app.use('/api', verificarToken, apiRoutes);

// Servir PDFs da pasta de uploads
app.use('/uploads', express.static(path.join(__dirname, '../../frontend/uploads'))); 

// Servir arquivos estáticos do Frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// --- Conexão Banco de Dados (Mantida da Parte 1) ---
const dbPath = path.resolve(__dirname, '../../db/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Erro DB:', err.message);
    else {
        console.log('Conectado ao SQLite.');
        initDb(); // Função definida na Parte 1 (schema.sql)
    }
});

// Exporta DB para ser usado nos controllers
module.exports = db; 

// --- IMPORTANTE: Importar Rotas DEPOIS do module.exports do db ---
// (Isso evita dependência circular se o require for feito no topo sem o db estar pronto, 
// mas no node.js o cache de require resolve isso. Por segurança, importamos aqui).
const apiRoutes = require('./routes/apiRoutes');
app.use('/api', apiRoutes);

// Função initDb (Mantida da Parte 1 - certifique-se de que ela está aqui)
function initDb() {
    const schemaPath = path.resolve(__dirname, '../../db/schema.sql');
    if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema, (err) => {
            if (!err) {
                 // Verifica seeds
                 db.get("SELECT count(*) as count FROM usuario", (err, row) => {
                    if (row && row.count === 0) {
                        const seedsPath = path.resolve(__dirname, '../../db/seeds.sql');
                        if (fs.existsSync(seedsPath)) {
                            const seeds = fs.readFileSync(seedsPath, 'utf8');
                            db.exec(seeds);
                        }
                    }
                });
            } else {
                console.error("Erro ao inicializar DB:", err);
            }
        });
    } else {
        console.error("Schema.sql não encontrado em:", schemaPath);
    }
}

// Iniciar servidor apenas se este arquivo for executado diretamente
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
}