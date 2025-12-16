/* Arquivo: db/schema.sql
  Baseado no Documento de Planejamento v1.0 [cite: 3]
*/

-- Tabela SETOR [cite: 130-134]
CREATE TABLE IF NOT EXISTS setor (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    sigla TEXT NOT NULL UNIQUE
);

-- Tabela USUARIO [cite: 122-129]
CREATE TABLE IF NOT EXISTS usuario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL, -- RNF-002 
    perfil TEXT NOT NULL CHECK(perfil IN ('Operador', 'Consulta', 'Admin')), -- RF-006 [cite: 69]
    setor_id INTEGER,
    FOREIGN KEY (setor_id) REFERENCES setor(id)
);

-- Tabela DOCUMENTO [cite: 135-145]
CREATE TABLE IF NOT EXISTS documento (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_protocolo TEXT NOT NULL UNIQUE, -- RF-002 [cite: 56]
    categoria TEXT NOT NULL CHECK(categoria IN ('Servidor', 'Academico')), 
    requerente_nome TEXT NOT NULL,
    requerente_cpf TEXT NOT NULL,
    requerente_matricula TEXT,
    requerente_email TEXT,
    requerente_telefone TEXT,
    assunto TEXT NOT NULL, 
    dados_extras TEXT, 
    data_recebimento DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'Recebido',
    caminho_anexo TEXT, -- Arquivo original (mantido por compatibilidade)
    setor_atual_id INTEGER,
    FOREIGN KEY (setor_atual_id) REFERENCES setor(id)
);

-- NOVA TABELA: ANEXOS EXTRAS
CREATE TABLE IF NOT EXISTS anexo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    documento_id INTEGER NOT NULL,
    nome_arquivo TEXT NOT NULL, -- Nome original para exibição
    caminho TEXT NOT NULL,
    data_upload DATETIME DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER, -- Quem anexou
    FOREIGN KEY (documento_id) REFERENCES documento(id),
    FOREIGN KEY (usuario_id) REFERENCES usuario(id)
);

-- Tabela TRAMITACAO [cite: 146-154]
-- Garante RF-005 (Histórico) [cite: 66]
CREATE TABLE IF NOT EXISTS tramitacao (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    documento_id INTEGER NOT NULL,
    setor_origem_id INTEGER,
    setor_destino_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    despacho TEXT,
    FOREIGN KEY (documento_id) REFERENCES documento(id),
    FOREIGN KEY (setor_origem_id) REFERENCES setor(id),
    FOREIGN KEY (setor_destino_id) REFERENCES setor(id),
    FOREIGN KEY (usuario_id) REFERENCES usuario(id)
);

-- Tabelas Auxiliares --
-- Tabela TAG [cite: 155-158]
CREATE TABLE IF NOT EXISTS tag (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE
);
-- Tabela DOCUMENTO_TAG [cite: 159-162]
CREATE TABLE IF NOT EXISTS documento_tag (
    documento_id INTEGER,
    tag_id INTEGER, 
    PRIMARY KEY (documento_id, tag_id) 
);
-- Tabela NOTIFICACAO [cite: 163-170]

CREATE TABLE IF NOT EXISTS notificacao ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT,
     usuario_id INTEGER,
      documento_id INTEGER,
       mensagem TEXT,
        lida BOOLEAN DEFAULT 0, 
        data_hora DATETIME DEFAULT CURRENT_TIMESTAMP
);