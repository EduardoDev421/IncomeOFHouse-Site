# IncomeofHouse-Site

# Contexto Profissional:
    A IncomeOfHouse é uma plataforma fictícia especializada na divulgação de plantas de casas e projetos de construção. O objetivo da plataforma é conectar clientes a profissionais da área, como arquitetos e engenheiros, oferecendo um ambiente onde seja possível visualizar, publicar e adquirir projetos arquitetônicos de forma simples e segura. Atualmente, a IncomeOfHouse não possui um site institucional completo. Por isso, surgiu a necessidade de desenvolver uma plataforma autoral que fortaleça a identidade da marca, apresente os projetos disponíveis, divulgue os profissionais cadastrados e facilite o contato entre clientes e especialistas da construção civil. Essa solução permitirá ampliar a presença digital da empresa, melhorar a experiência dos usuários e incentivar a comercialização de projetos arquitetônicos.

## Objetivo: 
    Desenvolver um site institucional simples, organizado e responsivo, aplicando conceitos de HTML semântico, organização de arquivos e planejamento de software.


## Etapa 1 - Escopo
    Público-alvo: Público em geral.
    Páginas do site:
        - Home
        - Plantas
        - Profissionais
        - Sobre Mós
        - Login
        - Esqueceu Senha
        - Cadastro Usuario
        - Cadastro Profissional
        - Detalhe Plantas
        - Detalhe Profissional
        - Comentarios
        - Publicar Planta
        - Perfil Usuario
        - Meus Endereços
        - Meus Pedidos
        - Meus Profissionais Favoritos
        - Projetos Salvos
        - Mensagem
        - Perfil Profissional
        - Meus Portfolio
        - Projetos
        - Avaliações
        - Agendamentos
        - Configurações
        - Termos de Uso
        - Politica e Privacidade

## Etapa 2 - Requisitos
    Requisitos Funcionais:
        - Exibir plantas de casas disponíveis.
        - Exibir detalhes das plantas.
        - Permitir cadastro de usuários.
        - Permitir cadastro de profissionais.
        - Realizar login.
        - Recuperar senha.
        - Publicar novas plantas.
        - Favoritar profissionais.
        - Salvar projetos.
        - Visualizar perfil dos profissionais.
        - Enviar mensagens entre usuário e profissional.
        - Agendar reuniões.
        - Avaliar profissionais.
        - Gerenciar portfólio.
        - Gerenciar pedidos.
        - Gerenciar endereços.
        - Exibir termos de uso.
        - Exibir política de privacidade.

    Requisitos Não Funcionais:
        - Layout moderno e intuitivo.
        - Interface responsiva.
        - Compatível com Chrome, Edge e Firefox.
        - Código organizado.
        - HTML semântico.
        - CSS separado do HTML.
        - JavaScript modular.
        - Banco de dados MySQL.
        - Boa performance.
        - Fácil manutenção.

    Requisitos Estruturais:
        - Organização do projeto em duas camadas: Front-End e Back-End.
        - Separação entre arquivos HTML, CSS e JavaScript.
        - Utilização de uma estrutura de pastas padronizada para facilitar a manutenção.
        - Páginas HTML organizadas dentro da pasta pages.
        - Arquivos CSS centralizados na pasta css.
        - Scripts JavaScript organizados na pasta js.
        - Dados de exemplo armazenados em arquivos JSON na pasta data durante o desenvolvimento.
        - Imagens organizadas na pasta img.
        - Back-end responsável pelo gerenciamento das requisições e conexão com o banco de dados.
        - Banco de dados MySQL utilizado para armazenar informações de usuários, profissionais, projetos, mensagens e avaliações.
        - Código-fonte versionado utilizando Git.
        - Nomenclatura padronizada para arquivos e pastas.

## Etapa 3 - Estrutura Técnica


# Estrutura da Pastas
        IncomeOfHouse-site/
    │
    ├───── Back-End/
    │   ├── db.js
    │   ├── package-lock.json
    │   ├── package.json
    │   └── server.js
    │
    ├───── Front-End/
    │   ├── css/
    │   │    ├── auth.css
    │   │    └── style.css
    │   │
    │   ├── data/
    │   │    ├── plantas.json
    │   │    └── profissionais.json
    │   │ 
    │   ├── img/
    │   │ 
    │   ├── js/
    │   │    ├── auth.js
    │   │    ├── plantas.js
    │   │    └── profissionais.js
    │   │ 
    │   ├── pages/
    │   │    ├── Agendamentos.html
    │   │    ├── Avaliações.html
    │   │    ├── CadastrarProfissionais.html
    │   │    ├── cadastro.html
    │   │    ├── Comentarios.html
    │   │    ├── Configurações.html
    │   │    ├── DetalhePlanta.html
    │   │    ├── DetalheProfissional.html
    │   │    ├── DetalhesPlanta.html
    │   │    ├── EsqueceuSenha.html
    │   │    ├── login.html
    │   │    ├── Mensagem.html
    │   │    ├── MeuPortfolio.html
    │   │    ├── MeusEndereços.html
    │   │    ├── MeusPedidos.html
    │   │    ├── MeusProfissionais.html
    │   │    ├── PerfilProfissional.html
    │   │    ├── PerfilUsuario.html
    │   │    ├── plantas.html
    │   │    ├── PoliticaPrivacidade.html
    │   │    ├── Profissionais.html
    │   │    ├── Projetos.html
    │   │    ├── ProjetosSalvos.html
    │   │    ├── PublicarPlanta.html
    │   │    ├── sobre.html
    │   │    └── TermosUso.html
    │   └── index.html
    │
    ├── .gitignore 
    └── README.md


# Tecnologias:
    Front-end:
        - HTML5
        - CSS3
        - JavaScript

    Back-end:
        - Node.js
        - Express

    Banco de Dados:
        - MySQL

    Ferramentas:
        - VS Code
        - Git
        - GitHub
        - MySQL Workbench

## Etapa 4 -Registro das Decisões

        - Foi adotada uma arquitetura com separação entre Front-End e Back-End para facilitar a organização e manutenção do sistema.
        - O HTML5 semântico foi escolhido para melhorar a estrutura do código e a acessibilidade da aplicação.
        - O CSS foi mantido em arquivos separados para permitir a reutilização dos estilos e facilitar futuras modificações.
        - O JavaScript foi utilizado para implementar funcionalidades dinâmicas e melhorar a experiência do usuário.
        - O Node.js foi escolhido para o desenvolvimento do servidor por sua integração com JavaScript e pela simplicidade no desenvolvimento de aplicações web.
        - O MySQL foi definido como banco de dados por oferecer uma estrutura relacional adequada para o armazenamento das informações do sistema.
        - Durante o desenvolvimento inicial, arquivos JSON serão utilizados para simular dados antes da integração definitiva com o banco de dados.
        - A interface será desenvolvida de forma responsiva para garantir compatibilidade com diferentes dispositivos.

# Objetivo Final

    Desenvolver uma plataforma web institucional responsiva e funcional para a IncomeOfHouse, permitindo a divulgação de plantas arquitetônicas, cadastro de profissionais, gerenciamento de usuários e comunicação entre clientes e especialistas da construção civil. O sistema deverá apresentar uma interface intuitiva, organizada e de fácil manutenção, utilizando HTML5, CSS3, JavaScript, Node.js e MySQL.

## Publicação de plantas no MySQL

O servidor em `Back-End` publica as plantas pela API `POST /plantas` e consulta os registros pelo banco MySQL. Configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` no arquivo `.env` de `Back-End`. Ao iniciar, o servidor verifica a conexão e cria a tabela `plantas` caso ainda não exista; se o banco estiver indisponível ou não permitir a criação da tabela, a API não inicia.

Inicie o servidor com `npm start` dentro de `Back-End`. Em desenvolvimento, o front-end usa `http://localhost:3000` quando aberto localmente. Em produção, sirva a API no mesmo domínio do site (com `/plantas` encaminhado ao servidor) ou defina `window.PLANTAS_API_URL` antes de carregar `PlantasStorage.js` nas páginas de publicação, listagem e detalhes:

```html
<script>window.PLANTAS_API_URL = "https://api.seudominio.com";</script>
<script src="../js/PlantasStorage.js"></script>
```

Quando a API estiver em outro domínio, configure também `CORS_ORIGIN` no servidor com a origem do front-end e `BASE_URL` com a URL pública da API, para que as imagens salvas em `Back-End/uploads` sejam exibidas corretamente.