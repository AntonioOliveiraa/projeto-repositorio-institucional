const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend'))); // Serve arquivos estáticos

// Conexão com Banco de Dados (SQLite File)
const dbPath = path.resolve(__dirname, '../../db/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        initDb();
    }
});

// Função para inicializar tabelas se não existirem
function initDb() {
    const schemaPath = path.resolve(__dirname, '../../db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    db.exec(schema, (err) => {
        if (err) console.error("Erro ao executar schema:", err);
        else console.log("Tabelas verificadas/criadas com sucesso.");
    });
    
    // Opcional: Rodar seeds se a tabela de usuários estiver vazia
    db.get("SELECT count(*) as count FROM usuario", (err, row) => {
        if (row && row.count === 0) {
            const seedsPath = path.resolve(__dirname, '../../db/seeds.sql');
            const seeds = fs.readFileSync(seedsPath, 'utf8');
            db.exec(seeds, (err) => {
                if (err) console.error("Erro nos seeds:", err);
                else console.log("Dados iniciais inseridos.");
            });
        }
    });
}

// Rota de Teste (Health Check)
app.get('/api/status', (req, res) => {
    res.json({ status: 'Online', timestamp: new Date() });
});

// Iniciar Servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`Documentação do projeto em: ${path.resolve(__dirname, '../../docs')}`);
});

// Exportar db para uso em outros arquivos (controllers)
module.exports = db;