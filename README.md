# Sistema de Protocolo Geral - Repositório Institucional

Este projeto consiste no **Módulo de Protocolo Geral**, parte de um sistema de Repositório Institucional para a terceira nota da disciplina de Análise e Projeto de Sistemas. É uma aplicação web completa (Fullstack) desenvolvida para digitalizar, gerenciar e dar transparência ao fluxo de processos e documentos administrativos e acadêmicos dentro da instituição.

## 🚀 Funcionalidades Principais

### 📄 Gestão de Protocolos
* **Abertura de Processos:** Criação de protocolos para Servidores (com dados de cargo/lotação) e Acadêmicos (curso/centro).
* **Geração Automática de Protocolo:** Numeração única e rastreável gerada automaticamente.
* **Anexo de Arquivos:** Suporte para upload de documentos (PDF) vinculados ao protocolo.
* **Classificação Inteligente (IA):** Integração com **Google Gemini** para sugerir tags de classificação automaticamente com base no assunto digitado.

### 🔄 Fluxo e Tramitação
* **Tramitação entre Setores:** Encaminhamento de processos de um departamento para outro com despacho.
* **Histórico Completo:** Linha do tempo detalhada de cada movimentação (quem enviou, para onde, data e despacho).
* **Status Dinâmicos:** Controle de estados (Recebido, Em Análise, Finalizado, Arquivado).
* **Parecer Final:** Funcionalidade para deferir ou indeferir processos com justificativa formal.

### 📊 Gestão e Visualização
* **Dashboard Gerencial:** Visão geral com estatísticas, gráficos e atividades recentes.
* **Relatórios PDF:** Geração de relatórios gerenciais filtrados por data e status, prontos para impressão.
* **Busca Avançada e Filtros:** Pesquisa global e filtros por Categoria, Setor Atual e Status.
* **Paginação:** Listagem otimizada para grandes volumes de dados.

### 🛡️ Segurança e Acesso
* **Autenticação JWT:** Login seguro com JsonWebToken.
* **Controle de Acesso (RBAC):** Perfis de usuário diferenciados (Admin, Operador, Consulta).

---

## 🛠️ Tecnologias Utilizadas

### Backend
* **Node.js**: Ambiente de execução.
* **Express**: Framework web.
* **SQLite**: Banco de dados relacional (leve e sem configuração complexa).
* **Google Generative AI (Gemini)**: Inteligência Artificial para análise de textos.
* **Multer**: Gerenciamento de upload de arquivos.
* **Bcrypt & JWT**: Criptografia de senhas e autenticação.

### Frontend
* **HTML5 / CSS3**: Estrutura e estilização moderna e responsiva.
* **JavaScript (Vanilla ES6+)**: Lógica do cliente modularizada (Modules).
* **Phosphor Icons**: Biblioteca de ícones.

---

## 📦 Pré-requisitos

Antes de começar, você precisa ter instalado em sua máquina:
* [Node.js](https://nodejs.org/) (Versão 18 ou superior recomendada)
* [NPM](https://www.npmjs.com/) (Gerenciador de pacotes)

---

## ⚙️ Instalação e Configuração

1.  **Clone o repositório**
    ```bash
    git clone [https://github.com/AntonioOliveiraa/projeto-repositorio-institucional.git](https://github.com/AntonioOliveiraa/projeto-repositorio-institucional.git)
    cd projeto-repositorio-institucional
    ```

2.  **Instale as dependências**
    ```bash
    npm install
    ```

3.  **Configuração de Variáveis de Ambiente (.env)**
    Crie um arquivo `.env` na raiz do projeto e configure sua chave da API do Google Gemini e o segredo do JWT:

    ```env
    # Chave para assinatura de tokens JWT (pode ser qualquer string segura)
    JWT_SECRET=sua_chave_secreta_super_segura

    # Chave da API do Google AI Studio (para funcionalidade de tags automáticas)
    GEMINI_API_KEY=AIzaSy...SuaChaveAqui
    ```

4.  **Banco de Dados**
    O sistema utiliza SQLite. O arquivo do banco (`database.sqlite`) será criado automaticamente na pasta `db/` na primeira execução, utilizando o script `db/schema.sql`.
    
    *Opcional: Para popular o banco com dados iniciais (usuários e setores), você pode rodar o conteúdo de `db/seeds.sql` manualmente ou adaptar o script de inicialização.*

---

## ▶️ Executando o Projeto

1.  **Inicie o servidor**
    ```bash
    npm start
    ```
    *O comando acima executa `node src/backend/server.js`.*

2.  **Acesse a aplicação**
    Abra o navegador e acesse:
    `http://localhost:3000`

---

## 📂 Estrutura do Projeto

```

projeto-repositorio-institucional/
├── db/                     # Arquivos do banco de dados (schema, seeds, arquivo .sqlite)
├── uploads/                # Pasta onde os PDFs anexados são salvos
├── src/
│   ├── backend/
│   │   ├── controllers/    # Lógica de negócios (Auth, Documentos, IA, etc.)
│   │   ├── routes/         # Definição das rotas da API
│   │   ├── utils/          # Utilitários (AuthMiddleware, UploadConfig, ProtocoloGen)
│   │   └── server.js       # Ponto de entrada do servidor
│   │

│   └── frontend/
│       ├── css/            # Estilos globais
│       ├── js/
│       │   ├── modules/    # Módulos JS (Dashboard, Documentos, Tramitação)
│       │   ├── api.js      # Cliente HTTP centralizado
│       │   ├── app.js      # Lógica principal e roteamento do front
│       │   └── ui.js       # Manipulação de interface e modais
│       ├── index.html      # Página principal (Dashboard/SPA)
│       └── login.html      # Página de login
├── .env                    # Variáveis de ambiente (NÃO COMITAR)
├── package.json            # Dependências do projeto
└── README.md               # Documentação

```

---

## 🤖 Sobre a Integração com IA

O sistema utiliza a biblioteca `@google/generative-ai` (ou `@google/genai`) para conectar-se aos modelos **Gemini** (ex: `gemini-2.0-flash` ou `gemini-pro`).

**Como funciona:**
1. O usuário digita o assunto do protocolo.
2. O sistema aguarda uma pausa na digitação (debounce).
3. O texto é enviado ao backend, que consulta a API do Google.
4. A IA analisa o contexto e retorna sugestões de tags (ex: "Administrativo", "Urgente", "Financeiro").
5. O usuário pode aceitar, remover ou adicionar novas tags antes de salvar.

---

## 📝 Licença

Este projeto foi desenvolvido para fins acadêmicos/institucionais. Consulte o autor para detalhes sobre licenciamento.

**Desenvolvido por:** Antônio Augusto de Araújo Oliveira