const db = require('../server');

exports.tramitarDocumento = (req, res) => {
    const { documento_id, setor_origem_id, setor_destino_id, usuario_id, despacho } = req.body;

    if (!documento_id || !setor_destino_id || !usuario_id) {
        return res.status(400).json({ erro: "Dados incompletos para tramitação." });
    }

    // Transação manual (SQLite serializa operações, mas é bom garantir a ordem)
    db.serialize(() => {
        // 1. Inserir registro na tabela Tramitacao (Histórico imutável - RF-005)
        const sqlInsert = `
            INSERT INTO tramitacao (documento_id, setor_origem_id, setor_destino_id, usuario_id, despacho, data_hora)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        
        db.run(sqlInsert, [documento_id, setor_origem_id, setor_destino_id, usuario_id, despacho], function(err) {
            if (err) return res.status(500).json({ erro: "Erro ao registrar tramitação: " + err.message });

            // 2. Atualizar o Documento (Novo Setor Atual e Status) - RF-004
            // Ao tramitar, assumimos que o status muda (ex: 'Encaminhado' ou volta para 'Recebido' no novo setor)
            const sqlUpdate = `
                UPDATE documento 
                SET setor_atual_id = ?, status = 'Em Análise' 
                WHERE id = ?
            `;

            db.run(sqlUpdate, [setor_destino_id, documento_id], function(errUpdate) {
                if (errUpdate) return res.status(500).json({ erro: "Erro ao atualizar documento." });

                // 3. (Opcional) Criar Notificação para usuários do setor de destino (RF-009)
                // Implementação simplificada:
                const sqlNotif = `
                    INSERT INTO notificacao (usuario_id, documento_id, mensagem)
                    SELECT id, ?, 'Novo documento recebido no seu setor.' 
                    FROM usuario WHERE setor_id = ?
                `;
                db.run(sqlNotif, [documento_id, setor_destino_id]);

                res.json({ mensagem: "Documento tramitado com sucesso." });
            });
        });
    });
};