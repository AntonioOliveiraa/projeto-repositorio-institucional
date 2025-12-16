const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Middleware de Autenticação (Importação apenas da função, não das rotas ainda)
const { verificarToken } = require('./utils/authMiddleware');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir PDFs da pasta de uploads
app.use('/uploads', express.static(path.join(__dirname, '../../frontend/uploads'))); 

// Servir arquivos estáticos do Frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// --- Conexão Banco de Dados ---
const dbPath = path.resolve(__dirname, '../../db/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Erro DB:', err.message);
    else {
        console.log('Conectado ao SQLite.');
        initDb();
    }
});

// 1. Exporta DB (CRÍTICO: Deve vir antes da importação das rotas)
module.exports = db; 

// --- Importação de Rotas (APÓS exportar o db) ---
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/apiRoutes');

// 2. Definição das Rotas
// Rotas Públicas (Login)
app.use('/auth', authRoutes);

// Rotas Protegidas (API do Sistema) - Exige Token
app.use('/api', verificarToken, apiRoutes);


// Função de Inicialização do Banco
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

// Iniciar servidor
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
}