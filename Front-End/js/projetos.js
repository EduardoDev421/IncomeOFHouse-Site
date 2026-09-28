document.addEventListener("DOMContentLoaded", () => {

    // ============================================================
    // ELEMENTOS DA PÁGINA
    // ============================================================

    const selectProjetos =
        document.getElementById("projetos");

    const selectQuartos =
        document.getElementById("quartos");

    const selectGaragens =
        document.getElementById("garagens");

    const selectArea =
        document.getElementById("area");

    const selectEstilo =
        document.getElementById("estilo");

    const botaoPesquisar =
        document.querySelector(".campo-botao button");

    const gridProjetos =
        document.querySelector(".grid-projetos");

    const tituloAceitos =
        document.querySelector(".titulo-aceitos");


    // ============================================================
    // DADOS DOS PROJETOS
    // ============================================================

    const projetos = [
        {
            id: 1,
            nome: "Projeto 1",
            tipo: "casa",
            quartos: 2,
            garagens: 1,
            area: 100,
            estilo: "moderno"
        },

        {
            id: 2,
            nome: "Projeto 2",
            tipo: "casa",
            quartos: 3,
            garagens: 2,
            area: 200,
            estilo: "moderno"
        },

        {
            id: 3,
            nome: "Projeto 3",
            tipo: "sobrado",
            quartos: 3,
            garagens: 2,
            area: 300,
            estilo: "classico"
        },

        {
            id: 4,
            nome: "Projeto 4",
            tipo: "apartamento",
            quartos: 2,
            garagens: 1,
            area: 100,
            estilo: "minimalista"
        },

        {
            id: 5,
            nome: "Projeto 5",
            tipo: "casa",
            quartos: 4,
            garagens: 3,
            area: 400,
            estilo: "moderno"
        },

        {
            id: 6,
            nome: "Projeto 6",
            tipo: "sobrado",
            quartos: 4,
            garagens: 2,
            area: 300,
            estilo: "classico"
        },

        {
            id: 7,
            nome: "Projeto 7",
            tipo: "apartamento",
            quartos: 1,
            garagens: 1,
            area: 100,
            estilo: "minimalista"
        },

        {
            id: 8,
            nome: "Projeto 8",
            tipo: "casa",
            quartos: 3,
            garagens: 2,
            area: 200,
            estilo: "minimalista"
        },

        {
            id: 9,
            nome: "Projeto 9",
            tipo: "sobrado",
            quartos: 4,
            garagens: 3,
            area: 400,
            estilo: "moderno"
        }
    ];


    // ============================================================
    // CONVERTER ÁREA SELECIONADA
    // ============================================================

    function verificarArea(
        projeto,
        valor
    ) {

        if (!valor) {
            return true;
        }

        const area =
            projeto.area;

        switch (valor) {

            case "100":
                return area <= 100;

            case "200":
                return area > 100 && area <= 200;

            case "300":
                return area > 200 && area <= 300;

            case "400":
                return area > 300;

            default:
                return true;
        }
    }


    // ============================================================
    // FILTRAR PROJETOS
    // ============================================================

    function filtrarProjetos() {

        const tipo =
            selectProjetos.value;

        const quartos =
            selectQuartos.value;

        const garagens =
            selectGaragens.value;

        const area =
            selectArea.value;

        const estilo =
            selectEstilo.value;


        const projetosFiltrados =
            projetos.filter(projeto => {

                // Tipo do projeto
                if (
                    tipo &&
                    projeto.tipo !== tipo
                ) {
                    return false;
                }


                // Quartos
                if (
                    quartos &&
                    projeto.quartos !==
                    Number(quartos)
                ) {
                    return false;
                }


                // Garagens
                if (
                    garagens &&
                    projeto.garagens !==
                    Number(garagens)
                ) {
                    return false;
                }


                // Área
                if (
                    !verificarArea(
                        projeto,
                        area
                    )
                ) {
                    return false;
                }


                // Estilo
                if (
                    estilo &&
                    projeto.estilo !== estilo
                ) {
                    return false;
                }


                return true;
            });


        renderizarProjetos(
            projetosFiltrados
        );
    }


    // ============================================================
    // RENDERIZAR PROJETOS
    // ============================================================

    function renderizarProjetos(
        lista
    ) {

        if (!gridProjetos) {
            return;
        }


        gridProjetos.innerHTML = "";


        // Nenhum resultado
        if (lista.length === 0) {

            const mensagem =
                document.createElement(
                    "div"
                );

            mensagem.className =
                "nenhum-projeto";

            mensagem.textContent =
                "Nenhum projeto encontrado com os filtros selecionados.";

            gridProjetos.appendChild(
                mensagem
            );

            atualizarTitulo(
                0
            );

            return;
        }


        lista.forEach(
            projeto => {

                const card =
                    document.createElement(
                        "article"
                    );

                card.className =
                    "card-projeto";


                // ==================================================
                // IMAGEM
                // ==================================================

                const imagem =
                    document.createElement(
                        "div"
                    );

                imagem.className =
                    "imagem-projeto";


                const icone =
                    document.createElement(
                        "span"
                    );

                icone.textContent =
                    "🖼";


                imagem.appendChild(
                    icone
                );


                // ==================================================
                // INFORMAÇÕES
                // ==================================================

                const informacoes =
                    document.createElement(
                        "div"
                    );

                informacoes.className =
                    "informacoes-projeto";


                const titulo =
                    document.createElement(
                        "h3"
                    );

                titulo.textContent =
                    projeto.nome;


                // ==================================================
                // BOTÃO DETALHES
                // ==================================================

                const detalhes =
                    document.createElement(
                        "a"
                    );

                detalhes.className =
                    "botao-detalhes";

                detalhes.href =
                    "detalhes-profissional.html";

                detalhes.textContent =
                    "Detalhes";


                // ==================================================
                // MONTAGEM
                // ==================================================

                informacoes.appendChild(
                    titulo
                );

                informacoes.appendChild(
                    detalhes
                );

                card.appendChild(
                    imagem
                );

                card.appendChild(
                    informacoes
                );

                gridProjetos.appendChild(
                    card
                );
            }
        );


        atualizarTitulo(
            lista.length
        );
    }


    // ============================================================
    // ATUALIZAR TÍTULO
    // ============================================================

    function atualizarTitulo(
        quantidade
    ) {

        if (!tituloAceitos) {
            return;
        }


        if (quantidade === 0) {

            tituloAceitos.textContent =
                "Nenhum projeto encontrado";

            return;
        }


        tituloAceitos.textContent =
            `Projetos aceitos (${quantidade})`;
    }


    // ============================================================
    // BOTÃO PESQUISAR
    // ============================================================

    if (botaoPesquisar) {

        botaoPesquisar.addEventListener(
            "click",
            filtrarProjetos
        );
    }


    // ============================================================
    // ENTER NOS FILTROS
    // ============================================================

    const filtros =
        document.querySelectorAll(
            ".filtros select"
        );


    filtros.forEach(
        select => {

            select.addEventListener(
                "keydown",
                evento => {

                    if (
                        evento.key ===
                        "Enter"
                    ) {

                        filtrarProjetos();
                    }
                }
            );
        }
    );


    // ============================================================
    // LIMPAR FILTROS
    // ============================================================

    function limparFiltros() {

        selectProjetos.value = "";
        selectQuartos.value = "";
        selectGaragens.value = "";
        selectArea.value = "";
        selectEstilo.value = "";

        renderizarProjetos(
            projetos
        );
    }


    // ============================================================
    // DUPLO CLIQUE NO BOTÃO = LIMPAR
    // ============================================================

    if (botaoPesquisar) {

        botaoPesquisar.addEventListener(
            "dblclick",
            limparFiltros
        );
    }


    // ============================================================
    // INICIALIZAÇÃO
    // ============================================================

    renderizarProjetos(
        projetos
    );


    console.log(
        "projetos.js carregado com sucesso."
    );

});