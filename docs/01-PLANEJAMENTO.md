# Projeto Prático – Desenvolvimento de Repositório Institucional

## Módulo I: Sistema de Protocolo Geral – Documento de Planejamento e Estruturação (Etapa 1)

- **Versão do Documento:** 1.0  
- **Data:** 20 de outubro de 2025  
- **Autor:** Antônio Augusto de Araújo Oliveira  

---

## Resumo Executivo

Este documento detalha a primeira fase do projeto de desenvolvimento de um Repositório Institucional, focando na criação do módulo de Protocolo Geral. O objetivo é definir os fundamentos do sistema, incluindo a justificativa, análise de viabilidade, levantamento de requisitos funcionais e não funcionais, a modelagem conceitual dos dados e a estrutura inicial do repositório de código.

A finalidade deste módulo é otimizar a tramitação de processos e ofícios, garantindo rastreabilidade, segurança e eficiência operacional.

---

## 1. Solicitação do Sistema

### 1.1. Problema a Ser Resolvido

Atualmente, o gerenciamento de processos e ofícios no setor de Protocolo Geral é realizado de forma manual ou com ferramentas descentralizadas (ex: planilhas eletrônicas, controle em papel). Essa abordagem resulta em diversas ineficiências, como:

- **Lentidão na localização de documentos:** a busca por um processo específico é demorada e suscetível a falhas.  
- **Falta de transparência:** é difícil para os interessados acompanharem o andamento (status) de suas solicitações.  
- **Risco de extravio:** documentos físicos podem ser perdidos ou danificados durante a tramitação entre setores.  
- **Ausência de histórico centralizado:** não há um registro unificado e de fácil acesso sobre todo o fluxo de um documento, desde sua criação até o arquivamento.

### 1.2. Objetivo Geral

Desenvolver um sistema web centralizado para o Protocolo Geral que automatize o registro, o controle de status e a tramitação de processos e ofícios, servindo como a base para o futuro Repositório Institucional.

### 1.3. Objetivos Específicos

- Centralizar 100% dos registros de entrada de novos documentos.  
- Automatizar a geração de um número de protocolo único e sequencial para cada documento.  
- Permitir o acompanhamento em tempo real do status e da localização de cada processo.  
- Registrar de forma imutável todo o histórico de movimentações entre setores.  
- Reduzir o tempo médio de localização de um documento em pelo menos 80%.

### 1.4. Valor Agregado e Justificativa

A implementação deste sistema trará benefícios tangíveis para a instituição:

- **Eficiência operacional:** redução do tempo gasto em tarefas manuais de registro e busca.  
- **Transparência e accountability:** criação de uma trilha de auditoria clara, permitindo identificar gargalos e responsabilidades.  
- **Segurança da informação:** digitalização e armazenamento seguro de documentos, mitigando riscos de perda.  
- **Tomada de decisão:** geração de relatórios sobre fluxo de processos, tempo médio por setor, etc.

---

## 2. Análise de Viabilidade

### 2.1. Viabilidade Técnica

O projeto é tecnicamente viável. Para a implementação inicial, a tecnologia escolhida será HTML, CSS e JavaScript puro (Vanilla JS), eliminando a necessidade de frameworks complexos e acelerando o desenvolvimento do protótipo.

A arquitetura seguirá o **Module Pattern**, organizando o código JavaScript de forma coesa e manutenível, com separação de responsabilidades em módulos (ex: `documento.js`, `ui.js`, `api.js`). Funcionalidades-chave como operações de CRUD e gestão de usuários são padrões em desenvolvimento web e perfeitamente executáveis com esta stack.

### 2.2. Viabilidade Econômica

O projeto é economicamente viável, com custos concentrados na alocação de recursos humanos e na infraestrutura de hospedagem. Será utilizada exclusivamente software de código aberto (FOSS), eliminando custos de licenciamento.

#### Estimativa de Custos (3 meses)

| Categoria           | Descrição                                                     | Custo Mensal | Custo Total (3 meses) |
|---------------------|---------------------------------------------------------------|--------------|------------------------|
| Recursos Humanos    | Desenvolvedor Pleno (Salário + Encargos)                     | R$ 8.000,00  | R$ 24.000,00           |
|                     | UX/UI Designer Pleno (Salário + Encargos)                    | R$ 7.000,00  | R$ 21.000,00           |
| Infraestrutura      | Servidor em Nuvem (VPS Básico ou PaaS)                        | R$ 75,00     | R$ 225,00              |
| Software            | Licenças (SO, BD, Frameworks) – FOSS                         | R$ 0,00      | R$ 0,00                |
| Serviços            | Registro de Domínio (custo anual diluído)                    | R$ 5,00      | R$ 15,00               |
| **TOTAL**           |                                                               | **R$ 15.080,00** | **R$ 45.240,00** |

O principal investimento está concentrado nos recursos humanos, com custos operacionais marginais.

### 2.3. Viabilidade Organizacional e Operacional

O sistema atende a uma necessidade clara do setor de Protocolo Geral, favorecendo sua adoção. A interface será intuitiva, exigindo treinamento mínimo, e o projeto está alinhado às metas institucionais de modernização e digitalização de processos.

---

## 3. Levantamento de Requisitos

### 3.1. Requisitos Funcionais

#### RF-001: Gestão de Documentos (CRUD)

- Cadastro de novos documentos (processos, ofícios etc.).  
- Campos: Tipo de Documento, Assunto, Interessado/Remetente, Setor de Origem e upload do arquivo (PDF).  
- Listagem paginada com filtros.  
- Visualização de detalhes e histórico de tramitação.  
- Edição dos dados (exceto número de protocolo).  
- Arquivamento lógico do documento.

#### RF-002: Geração de Protocolo Único

- Geração automática de número de protocolo único e sequencial (ex: `2025-00001`).

#### RF-003: Controle de Status do Documento

- Status iniciais: Recebido, Em Análise, Aguardando Retorno, Encaminhado, Finalizado.  
- Alteração de status por usuários autorizados.

#### RF-004: Tramitação de Documentos

- Encaminhamento para setor de destino com despacho.  
- Registro da movimentação e atualização da localização.

#### RF-005: Histórico de Movimentações

- Linha do tempo contendo data/hora, setores, usuário responsável e despacho.

#### RF-006: Gestão de Usuários e Perfis

- Cadastro de usuários.  
- Perfis:
  - **Operador de Protocolo:** CRUD e tramitação.
  - **Consulta:** apenas visualização.

#### RF-007: Busca e Filtragem

- Busca por número de protocolo, assunto ou interessado.  
- Filtros por status e setor atual.

#### RF-008: Classificação Inteligente de Documentos (IA)

- Envio opcional do conteúdo do PDF para IA.  
- Sugestão automática de 3 a 5 tags.  
- Revisão das tags pelo usuário.

#### RF-009: Sistema de Notificações

- Notificação para setores quando documentos forem encaminhados.  
- Área dedicada na interface e controle de leitura.

#### RF-010: Geração de Relatórios Básicos

- Relatórios por status dentro de um período selecionado, em PDF ou visualização em tela.

### 3.2. Requisitos Não Funcionais

- **RNF-001 – Usabilidade:** interface limpa, intuitiva e responsiva (desktop).  
- **RNF-002 – Segurança:** autenticação com senha armazenada em hash.  
- **RNF-003 – Desempenho:** consultas em menos de 2 segundos.  
- **RNF-004 – Confiabilidade:** disponibilidade de 99% no horário de expediente.

### 3.3. Escopo Negativo

Não incluído nesta versão:

- Assinatura digital.  
- Acesso público externo.  
- Aplicativo móvel nativo.  
- Controle de versão de documentos anexos.

---

## 4. Modelagem Conceitual

### 4.1. Entidades Principais

- **Usuário:** id, nome, email, senha, perfil, setor_id.  
- **Setor:** id, nome, sigla.  
- **Documento:** id, numero_protocolo, assunto, tipo_documento, remetente, data_recebimento, status, caminho_anexo, setor_atual_id.  
- **Tramitação:** id, documento_id, setor_origem_id, setor_destino_id, usuario_id, data_hora, despacho.  
- **Tag:** id, nome.  
- **Documento_Tag:** documento_id, tag_id.  
- **Notificação:** id, usuario_id, documento_id, mensagem, lida, data_hora.

### 4.2. Diagrama ER (Mermaid)

```mermaid
erDiagram
    USUARIO ||--|{ TRAMITACAO : "realiza"
    USUARIO }|--|| SETOR : "pertence a"
    DOCUMENTO ||--|{ TRAMITACAO : "possui"
    DOCUMENTO }|--|| SETOR : "está em"
    DOCUMENTO }o--o{ TAG : "é classificado por"
    USUARIO ||--|{ NOTIFICACAO : "recebe"
    DOCUMENTO }o--|{ NOTIFICACAO : "refere-se a"

    USUARIO {
        int id PK
        string nome
        string email
        string senha_hash
        string perfil
        int setor_id FK
    }

    SETOR {
        int id PK
        string nome
        string sigla
    }

    DOCUMENTO {
        int id PK
        string numero_protocolo UK
        string assunto
        string tipo_documento
        string remetente
        datetime data_recebimento
        string status
        string caminho_anexo
        int setor_atual_id FK
    }

    TRAMITACAO {
        int id PK
        int documento_id FK
        int setor_origem_id FK
        int setor_destino_id FK
        int usuario_id FK
        datetime data_hora
        text despacho
    }
    
    TAG {
        int id PK
        string nome UK
    }

    DOCUMENTO_TAG {
        int documento_id PK, FK
        int tag_id PK, FK
    }

    NOTIFICACAO {
        int id PK
        int usuario_id FK
        int documento_id FK
        string mensagem
        bool lida
        datetime data_hora
    }
````

---

## 5. Estrutura Inicial do Repositório

```text
/projeto-repositorio-institucional
|
├── .github/              # Arquivos de automação (ex: CI/CD workflows)
|
├── docs/                 # Documentação do projeto
|   ├── 01-PLANEJAMENTO.md    # Este documento
|   └── 02-MODELAGEM.md       # Detalhes do diagrama ER e modelo de dados
|
├── db/                   # Scripts e artefatos de banco de dados
|   └── scripts/
|       ├── schema.sql      # Script para criação de todas as tabelas
|       └── seeds.sql       # Script para popular tabelas essenciais (ex: Setores, Usuário Admin)
|
├── src/                  # Código-fonte da aplicação
|   ├── backend/          # Código da API/servidor (se necessário para IA)
|   └── frontend/         # Código da interface do usuário (HTML, CSS, JS)
|
├── tests/                # Casos de teste automatizados
|
├── .gitignore            # Arquivos e pastas a serem ignorados pelo Git
|
└── README.md             # Apresentação do projeto, tecnologias e instruções de instalação
```

---

## 6. Gerenciamento do Projeto

* **Duração total:** 55 dias
* **Fases:** Planejamento, Design e Modelagem, Desenvolvimento, Testes e Implantação, Encerramento.

---

## 7. Próximos Passos e Conclusão

Este documento estabelece as fundações para o desenvolvimento do módulo de Protocolo Geral, definindo escopo, requisitos, viabilidade e cronograma.

Com sua aprovação, os próximos passos são iniciar a **Fase 2: Design e Modelagem**, incluindo a prototipação da interface (UI/UX) e a criação do esquema físico do banco de dados, preparando o terreno para a fase de desenvolvimento.