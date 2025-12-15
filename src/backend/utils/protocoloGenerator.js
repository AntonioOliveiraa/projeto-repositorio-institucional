const db = require('../server'); // Importa conexão do db exportada no server.js

const gerarProtocolo = () => {
    return new Promise((resolve, reject) => {
        const anoAtual = new Date().getFullYear();
        
        // Busca o último protocolo gerado no ano atual
        const query = `
            SELECT numero_protocolo 
            FROM documento 
            WHERE numero_protocolo LIKE '${anoAtual}-%' 
            ORDER BY id DESC 
            LIMIT 1
        `;

        db.get(query, (err, row) => {
            if (err) return reject(err);

            let sequencial = 1;
            if (row) {
                // Extrai o número sequencial do último protocolo (ex: 2025-00042 -> 42)
                const partes = row.numero_protocolo.split('-');
                const ultimoSeq = parseInt(partes[1], 10);
                sequencial = ultimoSeq + 1;
            }

            // Formata com zeros à esquerda (pad 5 dígitos)
            const seqFormatado = String(sequencial).padStart(5, '0');
            const protocoloFinal = `${anoAtual}-${seqFormatado}`;
            
            resolve(protocoloFinal);
        });
    });
};

module.exports = gerarProtocolo;