/* Inserção de Setores Iniciais */
INSERT INTO setor (nome, sigla) VALUES ('Protocolo Geral', 'PROT');
INSERT INTO setor (nome, sigla) VALUES ('Departamento Jurídico', 'JUR');
INSERT INTO setor (nome, sigla) VALUES ('Recursos Humanos', 'RH');
INSERT INTO setor (nome, sigla) VALUES ('Tecnologia da Informação', 'TI');

/* Inserção de Usuário Admin Inicial 
  Senha 'admin123' deve ser gerada via hash (bcrypt) na aplicação real, 
  aqui é um placeholder simbólico.
*/
INSERT INTO usuario (nome, email, senha_hash, perfil, setor_id) 
VALUES ('Administrador', 'admin@instituicao.com', '$2b$10$ExemploHashParaAdmin123', 'Admin', 1);

/* Tags Iniciais para IA sugerir [cite: 77] */
INSERT INTO tag (nome) VALUES ('Financeiro'), ('Solicitação'), ('Contrato'), ('Ofício'), ('Férias');