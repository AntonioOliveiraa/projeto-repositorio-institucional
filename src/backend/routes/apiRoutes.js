const express = require('express');
const router = express.Router();
const upload = require('../utils/uploadConfig');

const documentoController = require('../controllers/documentoController');
const tramitacaoController = require('../controllers/tramitacaoController');
const auxiliarController = require('../controllers/auxiliarController');
const notificacaoController = require('../controllers/notificacaoController');
const usuarioController = require('../controllers/usuarioController');

// --- Documentos ---
router.post('/documentos', upload.single('arquivo_pdf'), documentoController.criarDocumento);
router.get('/documentos', documentoController.listarDocumentos);
router.get('/documentos/:id', documentoController.obterDocumento);
router.put('/documentos/:id', documentoController.editarDocumento);
router.delete('/documentos/:id', documentoController.arquivarDocumento);

// NOVAS ROTAS (Continuidade do fluxo)
router.post('/documentos/:id/anexo', upload.single('arquivo_extra'), documentoController.anexarArquivo);
router.put('/documentos/:id/finalizar', documentoController.finalizarDocumento);

// --- Tramitação ---
router.post('/tramitar', tramitacaoController.tramitarDocumento);

// --- Notificações ---
router.get('/notificacoes', notificacaoController.listarNotificacoes);
router.put('/notificacoes/:id/ler', notificacaoController.marcarComoLida);

// --- Usuários (CRUD) ---
router.get('/usuarios-crud', usuarioController.listarUsuarios);
router.get('/usuarios-crud/:id', usuarioController.obterUsuario);
router.post('/usuarios-crud', usuarioController.criarUsuario);
router.put('/usuarios-crud/:id', usuarioController.editarUsuario);
router.delete('/usuarios-crud/:id', usuarioController.excluirUsuario);

// --- Auxiliares ---
router.get('/setores', auxiliarController.listarSetores);
router.get('/usuarios', auxiliarController.listarUsuarios);

module.exports = router;