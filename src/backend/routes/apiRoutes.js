const express = require('express');
const router = express.Router();
const upload = require('../utils/uploadConfig');

// Importação dos Controllers
const documentoController = require('../controllers/documentoController');
const tramitacaoController = require('../controllers/tramitacaoController');
const auxiliarController = require('../controllers/auxiliarController');
const notificacaoController = require('../controllers/notificacaoController');
const usuarioController = require('../controllers/usuarioController');

// --- Rotas de Documentos ---
// POST /api/documentos - Cria documento com upload de PDF (RF-001)
router.post('/documentos', upload.single('arquivo_pdf'), documentoController.criarDocumento);

// GET /api/documentos - Lista com filtros (RF-001, RF-007)
router.get('/documentos', documentoController.listarDocumentos);

// GET /api/documentos/:id - Detalhes e Histórico (RF-001, RF-005)
router.get('/documentos/:id', documentoController.obterDocumento);

// PUT /api/documentos/:id - Edição (RF-001)
router.put('/documentos/:id', documentoController.editarDocumento);

// DELETE /api/documentos/:id - Arquivamento (RF-006)
router.delete('/documentos/:id', documentoController.arquivarDocumento);

// --- Rotas de Tramitação ---
// POST /api/tramitar - Movimentação entre setores (RF-004)
router.post('/tramitar', tramitacaoController.tramitarDocumento);

// --- Rotas de Notificações (RF-009) ---
router.get('/notificacoes', notificacaoController.listarNotificacoes);
router.put('/notificacoes/:id/ler', notificacaoController.marcarComoLida);

// --- Rotas de Gestão de Usuários (CRUD) ---
router.get('/usuarios-crud', usuarioController.listarUsuarios); // Nome diferente para não conflitar com o auxiliar 'usuarios'
router.get('/usuarios-crud/:id', usuarioController.obterUsuario);
router.post('/usuarios-crud', usuarioController.criarUsuario);
router.put('/usuarios-crud/:id', usuarioController.editarUsuario);
router.delete('/usuarios-crud/:id', usuarioController.excluirUsuario);

// --- Rotas Auxiliares ---
router.get('/setores', auxiliarController.listarSetores);
router.get('/usuarios', auxiliarController.listarUsuarios);

module.exports = router;