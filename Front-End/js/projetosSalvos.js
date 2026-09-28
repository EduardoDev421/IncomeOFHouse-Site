document.addEventListener("DOMContentLoaded", () => {

    // ============================================================
    // CONFIGURAÇÃO
    // ============================================================

    const CHAVE_PROJETOS =
        "projetosSalvos";

    const caixaProjetos =
        document.querySelector(".caixa-projetos");


    // ============================================================
    // PROJETOS PADRÃO
    // ============================================================

    const projetosPadrao = [
        {
            id: 1,
            nome: "Projeto 1",
            descricao: "Detalhes do projeto",
            link: "detalhes-profissional.html"
        },
        {
            id: 2,
            nome: "Projeto 2",
            descricao: "Detalhes do projeto",
            link: "detalhes-profissional.html"
        }
    ];


    // ============================================================
    // CARREGAR PROJETOS
    // ============================================================

    function carregarProjetos() {

        const dados =
            localStorage.getItem(
                CHAVE_PROJETOS
            );

        if (!dados) {

            salvarProjetos(
                projetosPadrao
            );

            return [...projetosPadrao];
        }

        try {

            const projetos =
                JSON.parse(dados);

            if (!Array.isArray(projetos)) {
                return [];
            }

            return projetos;

        } catch (erro) {

            console.error(
                "Erro ao carregar projetos salvos:",
                erro
            );

            return [];
        }
    }


    // ============================================================
    // SALVAR PROJETOS
    // ============================================================

    function salvarProjetos(
        projetos
    ) {

        localStorage.setItem(
            CHAVE_PROJETOS,
            JSON.stringify(projetos)
        );
    }


    // ============================================================
    // RENDERIZAR PROJETOS
    // ============================================================

    function renderizarProjetos() {

        if (!caixaProjetos) {
            return;
        }

        const projetos =
            carregarProjetos();


        // Mantém o título
        const titulo =
            caixaProjetos.querySelector("h3");

        caixaProjetos.innerHTML = "";


        if (titulo) {
            caixaProjetos.appendChild(
                titulo
            );
        } else {

            const novoTitulo =
                document.createElement("h3");

            novoTitulo.textContent =
                "Projetos salvos";

            caixaProjetos.appendChild(
                novoTitulo
            );
        }


        // ========================================================
        // NENHUM PROJETO
        // ========================================================

        if (projetos.length === 0) {

            const mensagem =
                document.createElement("p");

            mensagem.className =
                "nenhum-projeto";

            mensagem.textContent =
                "Você ainda não possui projetos salvos.";

            caixaProjetos.appendChild(
                mensagem
            );

            return;
        }


        // ========================================================
        // CRIAR PROJETOS
        // ========================================================

        projetos.forEach(
            projeto => {

                const elemento =
                    document.createElement("div");

                elemento.className =
                    "projeto";

                elemento.dataset.id =
                    projeto.id;


                // ------------------------------------------------
                // INFORMAÇÕES
                // ------------------------------------------------

                const informacoes =
                    document.createElement("div");


                const nome =
                    document.createElement("h4");

                nome.textContent =
                    projeto.nome;


                const descricao =
                    document.createElement("p");

                descricao.textContent =
                    projeto.descricao;


                informacoes.appendChild(
                    nome
                );

                informacoes.appendChild(
                    descricao
                );


                // ------------------------------------------------
                // ÁREA DOS BOTÕES
                // ------------------------------------------------

                const acoes =
                    document.createElement("div");

                acoes.className =
                    "acoes-projeto";


                // ------------------------------------------------
                // ACESSAR PROJETO
                // ------------------------------------------------

                const acessar =
                    document.createElement("a");

                acessar.href =
                    projeto.link ||
                    "detalhes-profissional.html";

                acessar.className =
                    "botao-projeto";

                acessar.textContent =
                    "Acessar projeto";


                // ------------------------------------------------
                // REMOVER
                // ------------------------------------------------

                const remover =
                    document.createElement("button");

                remover.type =
                    "button";

                remover.className =
                    "botao-remover";

                remover.textContent =
                    "Remover";


                remover.addEventListener(
                    "click",
                    () => {

                        removerProjeto(
                            projeto.id
                        );
                    }
                );


                acoes.appendChild(
                    acessar
                );

                acoes.appendChild(
                    remover
                );


                elemento.appendChild(
                    informacoes
                );

                elemento.appendChild(
                    acoes
                );


                caixaProjetos.appendChild(
                    elemento
                );
            }
        );
    }


    // ============================================================
    // REMOVER PROJETO
    // ============================================================

    function removerProjeto(
        id
    ) {

        const projetos =
            carregarProjetos();


        const projeto =
            projetos.find(
                item =>
                    Number(item.id) ===
                    Number(id)
            );


        if (!projeto) {
            return;
        }


        const confirmar =
            confirm(
                `Deseja remover "${projeto.nome}" dos projetos salvos?`
            );


        if (!confirmar) {
            return;
        }


        const novosProjetos =
            projetos.filter(
                item =>
                    Number(item.id) !==
                    Number(id)
            );


        salvarProjetos(
            novosProjetos
        );


        renderizarProjetos();


        mostrarMensagem(
            "Projeto removido dos salvos."
        );
    }


    // ============================================================
    // ADICIONAR PROJETO
    // ============================================================

    function adicionarProjeto(
        projeto
    ) {

        const projetos =
            carregarProjetos();


        const jaExiste =
            projetos.some(
                item =>
                    Number(item.id) ===
                    Number(projeto.id)
            );


        if (jaExiste) {

            mostrarMensagem(
                "Esse projeto já está salvo."
            );

            return;
        }


        projetos.push(
            projeto
        );


        salvarProjetos(
            projetos
        );


        renderizarProjetos();


        mostrarMensagem(
            "Projeto salvo com sucesso."
        );
    }


    // ============================================================
    // MENSAGEM
    // ============================================================

    function mostrarMensagem(
        texto
    ) {

        let mensagem =
            document.querySelector(
                ".mensagem-projeto"
            );


        if (!mensagem) {

            mensagem =
                document.createElement(
                    "div"
                );

            mensagem.className =
                "mensagem-projeto";

            document.body.appendChild(
                mensagem
            );
        }


        mensagem.textContent =
            texto;


        clearTimeout(
            mensagem.timer
        );


        mensagem.timer =
            setTimeout(
                () => {

                    mensagem.remove();

                },
                2500
            );
    }


    // ============================================================
    // SAIR
    // ============================================================

    function configurarLogout() {

        const links =
            document.querySelectorAll(
                ".barra-lateral a"
            );


        links.forEach(
            link => {

                if (
                    link.textContent
                        .trim()
                        .toLowerCase() !==
                    "sair"
                ) {
                    return;
                }


                link.addEventListener(
                    "click",
                    evento => {

                        evento.preventDefault();


                        const confirmar =
                            confirm(
                                "Deseja realmente sair?"
                            );


                        if (!confirmar) {
                            return;
                        }


                        localStorage.removeItem(
                            "usuarioLogado"
                        );

                        localStorage.removeItem(
                            "usuario"
                        );

                        localStorage.removeItem(
                            "user"
                        );

                        localStorage.removeItem(
                            "usuarioAtual"
                        );


                        window.location.href =
                            "Login.html";
                    }
                );
            }
        );
    }


    // ============================================================
    // EXPORTAR FUNÇÃO PARA OUTROS JS
    // ============================================================

    window.adicionarProjetoSalvo =
        adicionarProjeto;


    // ============================================================
    // INICIALIZAÇÃO
    // ============================================================

    renderizarProjetos();

    configurarLogout();


    console.log(
        "projetosSalvos.js carregado com sucesso."
    );
});