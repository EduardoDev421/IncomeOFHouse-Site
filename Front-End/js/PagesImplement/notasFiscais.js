document.addEventListener("DOMContentLoaded", () => {

    // ============================================================
    // CONFIGURAÇÃO
    // ============================================================

    const CHAVE_NOTAS = "notasFiscais";

    // ============================================================
    // DADOS INICIAIS
    // ============================================================

    const notasPadrao = [
        {
            numero: "NF-0087",
            data: "28/03/2025",
            descricao: "Projeto Arquitetônico - Residencial",
            fornecedor: "Income Of Houses Ltda",
            valor: 3750.00,
            status: "Pago"
        },
        {
            numero: "NF-0086",
            data: "20/03/2025",
            descricao: "Planta Baixa - Sobrado",
            fornecedor: "Arquiteto Associados",
            valor: 1280.00,
            status: "Pago"
        },
        {
            numero: "NF-0085",
            data: "12/03/2025",
            descricao: "Projeto Comercial",
            fornecedor: "Studio Design Arquitetura",
            valor: 3750.00,
            status: "Pago"
        },
        {
            numero: "NF-0084",
            data: "05/03/2025",
            descricao: "Planta Baixa - Residencial",
            fornecedor: "Arquiteto Associados",
            valor: 980.00,
            status: "Pago"
        },
        {
            numero: "NF-0083",
            data: "20/02/2025",
            descricao: "Projeto Executivo",
            fornecedor: "Engenharia & Construção",
            valor: 4200.00,
            status: "Pago"
        },
        {
            numero: "NF-0082",
            data: "10/02/2025",
            descricao: "Consultoria Técnica",
            fornecedor: "Consultoria Especializada",
            valor: 850.00,
            status: "Pendente"
        },
        {
            numero: "NF-0081",
            data: "28/01/2025",
            descricao: "Projeto Paisagismo",
            fornecedor: "Verde & Espaço",
            valor: 1560.00,
            status: "Pendente"
        },
        {
            numero: "NF-0080",
            data: "15/01/2025",
            descricao: "Planta Baixa - Térreo",
            fornecedor: "Arquiteto Associados",
            valor: 1200.00,
            status: "Pago"
        }
    ];

    let notas = [];

    // ============================================================
    // ELEMENTOS DO HTML
    // ============================================================

    const tabela =
        document.querySelector(".tabela");

    const linhas =
        document.querySelectorAll(
            ".linha-tabela:not(.cabecalho)"
        );

    const campoPesquisa =
        document.querySelector(
            ".pesquisa input"
        );

    const botaoExportar =
        document.querySelector(
            ".acoes button"
        );

    const resumoCards =
        document.querySelectorAll(
            ".resumo-card"
        );

    const botoesSair =
        document.querySelectorAll(
            "a"
        );

    // ============================================================
    // CARREGAR NOTAS
    // ============================================================

    function carregarNotas() {

        const dados =
            localStorage.getItem(
                CHAVE_NOTAS
            );

        if (!dados) {

            notas =
                JSON.parse(
                    JSON.stringify(
                        notasPadrao
                    )
                );

            salvarNotas();

            return;
        }

        try {

            notas =
                JSON.parse(dados);

            if (!Array.isArray(notas)) {

                notas =
                    JSON.parse(
                        JSON.stringify(
                            notasPadrao
                        )
                    );
            }

        } catch (erro) {

            console.error(
                "Erro ao carregar notas fiscais:",
                erro
            );

            notas =
                JSON.parse(
                    JSON.stringify(
                        notasPadrao
                    )
                );
        }
    }

    // ============================================================
    // SALVAR NOTAS
    // ============================================================

    function salvarNotas() {

        localStorage.setItem(
            CHAVE_NOTAS,
            JSON.stringify(notas)
        );
    }

    // ============================================================
    // FORMATAR VALOR
    // ============================================================

    function formatarValor(valor) {

        return Number(valor).toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );
    }

    // ============================================================
    // ATUALIZAR RESUMO
    // ============================================================

    function atualizarResumo(lista = notas) {

        if (resumoCards.length < 4) {
            return;
        }

        // --------------------------------------------------------
        // TOTAL DE NOTAS
        // --------------------------------------------------------

        const totalNotas =
            lista.length;

        const totalNotasElemento =
            resumoCards[0].querySelector(
                "strong"
            );

        if (totalNotasElemento) {

            totalNotasElemento.textContent =
                totalNotas;
        }

        // --------------------------------------------------------
        // VALOR TOTAL
        // --------------------------------------------------------

        const valorTotal =
            lista.reduce(
                (total, nota) =>
                    total +
                    Number(nota.valor),
                0
            );

        const valorTotalElemento =
            resumoCards[1].querySelector(
                "strong"
            );

        if (valorTotalElemento) {

            valorTotalElemento.textContent =
                formatarValor(valorTotal);
        }

        // --------------------------------------------------------
        // PAGAS
        // --------------------------------------------------------

        const pagas =
            lista.filter(
                nota =>
                    nota.status === "Pago"
            ).length;

        const pagasElemento =
            resumoCards[2].querySelector(
                "strong"
            );

        if (pagasElemento) {

            pagasElemento.textContent =
                pagas;
        }

        // --------------------------------------------------------
        // PENDENTES
        // --------------------------------------------------------

        const pendentes =
            lista.filter(
                nota =>
                    nota.status === "Pendente"
            ).length;

        const pendentesElemento =
            resumoCards[3].querySelector(
                "strong"
            );

        if (pendentesElemento) {

            pendentesElemento.textContent =
                pendentes;
        }

        // --------------------------------------------------------
        // PORCENTAGEM
        // --------------------------------------------------------

        const total =
            lista.length;

        const percentualPagas =
            total > 0
                ? Math.round(
                    (pagas / total) * 100
                )
                : 0;

        const percentualPendentes =
            total > 0
                ? Math.round(
                    (pendentes / total) * 100
                )
                : 0;

        const textos =
            resumoCards[2].querySelector(
                "span"
            );

        if (textos) {

            textos.textContent =
                `${percentualPagas}% do total`;
        }

        const textoPendentes =
            resumoCards[3].querySelector(
                "span"
            );

        if (textoPendentes) {

            textoPendentes.textContent =
                `${percentualPendentes}% do total`;
        }
    }

    // ============================================================
    // RENDERIZAR TABELA
    // ============================================================

    function renderizarNotas(lista = notas) {

        if (!tabela) {
            return;
        }

        // Remove somente as linhas dos dados.
        tabela
            .querySelectorAll(
                ".linha-tabela:not(.cabecalho)"
            )
            .forEach(linha => {

                linha.remove();
            });

        if (lista.length === 0) {

            const mensagem =
                document.createElement("div");

            mensagem.className =
                "nenhuma-nota";

            mensagem.textContent =
                "Nenhuma nota fiscal encontrada.";

            tabela.appendChild(
                mensagem
            );

            atualizarRodape(0);

            return;
        }

        lista.forEach(nota => {

            const linha =
                document.createElement(
                    "div"
                );

            linha.className =
                "linha-tabela";

            // ----------------------------------------------------
            // NÚMERO
            // ----------------------------------------------------

            const numero =
                document.createElement("span");

            numero.textContent =
                `▧  ${nota.numero}`;

            // ----------------------------------------------------
            // DATA
            // ----------------------------------------------------

            const data =
                document.createElement("span");

            data.textContent =
                nota.data;

            // ----------------------------------------------------
            // DESCRIÇÃO
            // ----------------------------------------------------

            const descricao =
                document.createElement("span");

            descricao.textContent =
                nota.descricao;

            // ----------------------------------------------------
            // FORNECEDOR
            // ----------------------------------------------------

            const fornecedor =
                document.createElement("span");

            fornecedor.textContent =
                nota.fornecedor;

            // ----------------------------------------------------
            // VALOR
            // ----------------------------------------------------

            const valor =
                document.createElement("span");

            valor.textContent =
                formatarValor(
                    nota.valor
                );

            // ----------------------------------------------------
            // STATUS
            // ----------------------------------------------------

            const statusContainer =
                document.createElement("span");

            const status =
                document.createElement("b");

            status.textContent =
                nota.status;

            status.className =
                nota.status === "Pago"
                    ? "pago"
                    : "pendente";

            statusContainer.appendChild(
                status
            );

            // ----------------------------------------------------
            // AÇÕES
            // ----------------------------------------------------

            const acoes =
                document.createElement("span");

            const visualizar =
                document.createElement(
                    "button"
                );

            visualizar.className =
                "visualizar";

            visualizar.type =
                "button";

            visualizar.textContent =
                "◉  Visualizar";

            visualizar.addEventListener(
                "click",
                () => {

                    visualizarNota(
                        nota
                    );
                }
            );

            const mais =
                document.createElement(
                    "button"
                );

            mais.className =
                "mais";

            mais.type =
                "button";

            mais.textContent =
                "⌄";

            mais.addEventListener(
                "click",
                () => {

                    mostrarOpcoes(
                        nota,
                        mais
                    );
                }
            );

            acoes.appendChild(
                visualizar
            );

            acoes.appendChild(
                mais
            );

            // ----------------------------------------------------
            // MONTAGEM
            // ----------------------------------------------------

            linha.appendChild(numero);
            linha.appendChild(data);
            linha.appendChild(descricao);
            linha.appendChild(fornecedor);
            linha.appendChild(valor);
            linha.appendChild(statusContainer);
            linha.appendChild(acoes);

            tabela.appendChild(
                linha
            );
        });

        atualizarRodape(
            lista.length
        );
    }

    // ============================================================
    // VISUALIZAR NOTA
    // ============================================================

    function visualizarNota(nota) {

        const janela =
            document.createElement(
                "div"
            );

        janela.className =
            "modal-nota";

        janela.innerHTML = `
            <div class="modal-conteudo">
                <button
                    type="button"
                    class="fechar-modal"
                    aria-label="Fechar"
                >
                    ×
                </button>

                <h2>Nota Fiscal</h2>

                <div class="detalhes-nota">
                    <p>
                        <strong>Número:</strong>
                        ${nota.numero}
                    </p>

                    <p>
                        <strong>Data de emissão:</strong>
                        ${nota.data}
                    </p>

                    <p>
                        <strong>Descrição:</strong>
                        ${nota.descricao}
                    </p>

                    <p>
                        <strong>Fornecedor:</strong>
                        ${nota.fornecedor}
                    </p>

                    <p>
                        <strong>Valor:</strong>
                        ${formatarValor(nota.valor)}
                    </p>

                    <p>
                        <strong>Status:</strong>
                        ${nota.status}
                    </p>
                </div>

                <button
                    type="button"
                    class="imprimir-nota"
                >
                    Imprimir
                </button>
            </div>
        `;

        document.body.appendChild(
            janela
        );

        const fechar =
            janela.querySelector(
                ".fechar-modal"
            );

        const imprimir =
            janela.querySelector(
                ".imprimir-nota"
            );

        fechar.addEventListener(
            "click",
            () => {

                janela.remove();
            }
        );

        imprimir.addEventListener(
            "click",
            () => {

                window.print();
            }
        );

        janela.addEventListener(
            "click",
            evento => {

                if (
                    evento.target === janela
                ) {

                    janela.remove();
                }
            }
        );
    }

    // ============================================================
    // MENU DE OPÇÕES
    // ============================================================

    function mostrarOpcoes(
        nota,
        botao
    ) {

        fecharMenus();

        const menu =
            document.createElement(
                "div"
            );

        menu.className =
            "menu-nota";

        const visualizar =
            document.createElement(
                "button"
            );

        visualizar.textContent =
            "Visualizar nota";

        visualizar.addEventListener(
            "click",
            () => {

                menu.remove();

                visualizarNota(
                    nota
                );
            }
        );

        const imprimir =
            document.createElement(
                "button"
            );

        imprimir.textContent =
            "Imprimir";

        imprimir.addEventListener(
            "click",
            () => {

                menu.remove();

                visualizarNota(
                    nota
                );

                setTimeout(
                    () => {
                        window.print();
                    },
                    300
                );
            }
        );

        menu.appendChild(
            visualizar
        );

        menu.appendChild(
            imprimir
        );

        botao.parentElement.appendChild(
            menu
        );
    }

    // ============================================================
    // FECHAR MENUS
    // ============================================================

    function fecharMenus() {

        document
            .querySelectorAll(
                ".menu-nota"
            )
            .forEach(menu => {

                menu.remove();
            });
    }

    // ============================================================
    // PESQUISA
    // ============================================================

    function pesquisarNotas() {

        if (!campoPesquisa) {
            return;
        }

        const termo =
            campoPesquisa.value
                .trim()
                .toLowerCase();

        if (!termo) {

            renderizarNotas(
                notas
            );

            atualizarResumo(
                notas
            );

            return;
        }

        const resultado =
            notas.filter(nota => {

                return (
                    nota.numero
                        .toLowerCase()
                        .includes(termo)

                    ||

                    nota.descricao
                        .toLowerCase()
                        .includes(termo)

                    ||

                    nota.fornecedor
                        .toLowerCase()
                        .includes(termo)

                    ||

                    nota.data
                        .toLowerCase()
                        .includes(termo)

                    ||

                    nota.status
                        .toLowerCase()
                        .includes(termo)
                );
            });

        renderizarNotas(
            resultado
        );

        atualizarResumo(
            resultado
        );
    }

    // ============================================================
    // EXPORTAR
    // ============================================================

    function exportarNotas() {

        if (notas.length === 0) {

            alert(
                "Não existem notas fiscais para exportar."
            );

            return;
        }

        const cabecalho =
            [
                "Número",
                "Data de Emissão",
                "Descrição",
                "Fornecedor",
                "Valor",
                "Status"
            ];

        const linhasCSV =
            notas.map(nota => {

                return [
                    nota.numero,
                    nota.data,
                    `"${nota.descricao}"`,
                    `"${nota.fornecedor}"`,
                    nota.valor
                        .toFixed(2)
                        .replace(".", ","),
                    nota.status
                ].join(";");
            });

        const csv =
            [
                cabecalho.join(";"),
                ...linhasCSV
            ].join("\n");

        const arquivo =
            new Blob(
                ["\ufeff" + csv],
                {
                    type:
                        "text/csv;charset=utf-8;"
                }
            );

        const url =
            URL.createObjectURL(
                arquivo
            );

        const link =
            document.createElement(
                "a"
            );

        link.href =
            url;

        link.download =
            "notas-fiscais.csv";

        document.body.appendChild(
            link
        );

        link.click();

        link.remove();

        URL.revokeObjectURL(
            url
        );
    }

    // ============================================================
    // PAGINAÇÃO
    // ============================================================

    function atualizarRodape(
        quantidade
    ) {

        const footer =
            document.querySelector(
                ".tabela-footer > span"
            );

        if (!footer) {
            return;
        }

        if (quantidade === 0) {

            footer.textContent =
                "Nenhum resultado encontrado.";

            return;
        }

        footer.textContent =
            `Mostrando 1 a ${quantidade} de ${quantidade} resultados`;
    }

    // ============================================================
    // BOTÃO EXPORTAR
    // ============================================================

    if (botaoExportar) {

        botaoExportar.addEventListener(
            "click",
            exportarNotas
        );
    }

    // ============================================================
    // CAMPO DE PESQUISA
    // ============================================================

    if (campoPesquisa) {

        campoPesquisa.addEventListener(
            "input",
            pesquisarNotas
        );
    }

    // ============================================================
    // FECHAR MENUS AO CLICAR FORA
    // ============================================================

    document.addEventListener(
        "click",
        evento => {

            if (
                !evento.target.closest(
                    ".mais"
                ) &&
                !evento.target.closest(
                    ".menu-nota"
                )
            ) {

                fecharMenus();
            }
        }
    );

    // ============================================================
    // LOGOUT
    // ============================================================

    botoesSair.forEach(link => {

        const texto =
            link.textContent
                .trim()
                .toLowerCase();

        if (texto.includes("sair")) {

            link.addEventListener(
                "click",
                evento => {

                    evento.preventDefault();

                    const confirmar =
                        confirm(
                            "Deseja realmente sair da sua conta?"
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
                        "../../index.html";
                }
            );
        }
    });

    // ============================================================
    // INICIALIZAÇÃO
    // ============================================================

    carregarNotas();

    renderizarNotas();

    atualizarResumo();

    console.log(
        "notasFiscais.js carregado com sucesso."
    );
});