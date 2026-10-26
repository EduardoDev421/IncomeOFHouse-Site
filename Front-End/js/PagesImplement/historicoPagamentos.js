document.addEventListener("DOMContentLoaded", () => {

    const CHAVE_PAGAMENTOS = "historicoPagamentos";

    // ============================================================
    // DADOS INICIAIS
    // ============================================================

    const pagamentosPadrao = [
        {
            id: 1,
            data: "15/09/2026",
            descricao: "Projeto Desenvolvimento Web",
            tipo: "Recebimento",
            valor: 2500.00,
            status: "Concluído"
        },
        {
            id: 2,
            data: "02/09/2026",
            descricao: "Projeto Sistema de Gestão",
            tipo: "Recebimento",
            valor: 1800.00,
            status: "Concluído"
        },
        {
            id: 3,
            data: "25/08/2026",
            descricao: "Taxa de serviço",
            tipo: "Pagamento",
            valor: 150.00,
            status: "Concluído"
        },
        {
            id: 4,
            data: "10/08/2026",
            descricao: "Projeto Landing Page",
            tipo: "Recebimento",
            valor: 950.00,
            status: "Concluído"
        }
    ];

    let pagamentos = [];

    // ============================================================
    // ELEMENTOS
    // ============================================================

    const tabela =
        document.querySelector("tbody");

    const filtro =
        document.querySelector(
            "#filtro, .filtro, select"
        );

    const busca =
        document.querySelector(
            "#busca, .busca, input[type='search']"
        );

    const logout =
        document.querySelector(
            ".logout"
        );

    // ============================================================
    // CARREGAR PAGAMENTOS
    // ============================================================

    function carregarPagamentos() {

        const dados =
            localStorage.getItem(
                CHAVE_PAGAMENTOS
            );

        if (!dados) {

            pagamentos =
                JSON.parse(
                    JSON.stringify(
                        pagamentosPadrao
                    )
                );

            salvarPagamentos();

            return;
        }

        try {

            pagamentos =
                JSON.parse(dados);

            if (!Array.isArray(pagamentos)) {

                pagamentos =
                    JSON.parse(
                        JSON.stringify(
                            pagamentosPadrao
                        )
                    );
            }

        } catch (erro) {

            console.error(
                "Erro ao carregar histórico:",
                erro
            );

            pagamentos =
                JSON.parse(
                    JSON.stringify(
                        pagamentosPadrao
                    )
                );
        }
    }

    // ============================================================
    // SALVAR
    // ============================================================

    function salvarPagamentos() {

        localStorage.setItem(
            CHAVE_PAGAMENTOS,
            JSON.stringify(pagamentos)
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
    // RENDERIZAR HISTÓRICO
    // ============================================================

    function renderizarPagamentos(lista = pagamentos) {

        if (!tabela) {
            console.warn(
                "Tabela de pagamentos não encontrada."
            );
            return;
        }

        tabela.innerHTML = "";

        if (lista.length === 0) {

            const linha =
                document.createElement("tr");

            const coluna =
                document.createElement("td");

            coluna.colSpan = 6;

            coluna.textContent =
                "Nenhum pagamento encontrado.";

            coluna.style.textAlign =
                "center";

            linha.appendChild(
                coluna
            );

            tabela.appendChild(
                linha
            );

            return;
        }

        lista.forEach(pagamento => {

            const linha =
                document.createElement("tr");

            // ----------------------------------------------------
            // DATA
            // ----------------------------------------------------

            const data =
                document.createElement("td");

            data.textContent =
                pagamento.data;

            // ----------------------------------------------------
            // DESCRIÇÃO
            // ----------------------------------------------------

            const descricao =
                document.createElement("td");

            descricao.textContent =
                pagamento.descricao;

            // ----------------------------------------------------
            // TIPO
            // ----------------------------------------------------

            const tipo =
                document.createElement("td");

            tipo.textContent =
                pagamento.tipo;

            tipo.className =
                pagamento.tipo === "Recebimento"
                    ? "recebimento"
                    : "pagamento";

            // ----------------------------------------------------
            // VALOR
            // ----------------------------------------------------

            const valor =
                document.createElement("td");

            valor.textContent =
                formatarValor(
                    pagamento.valor
                );

            valor.className =
                pagamento.tipo === "Recebimento"
                    ? "valor-positivo"
                    : "valor-negativo";

            // ----------------------------------------------------
            // STATUS
            // ----------------------------------------------------

            const status =
                document.createElement("td");

            status.textContent =
                pagamento.status;

            status.className =
                `status-${pagamento.status
                    .toLowerCase()
                    .replace("í", "i")
                    .replace("ã", "a")
                    .replace(" ", "-")}`;

            // ----------------------------------------------------
            // AÇÕES
            // ----------------------------------------------------

            const acoes =
                document.createElement("td");

            const botao =
                document.createElement("button");

            botao.type = "button";

            botao.textContent =
                "Detalhes";

            botao.className =
                "btn-detalhes";

            botao.addEventListener(
                "click",
                () => {

                    mostrarDetalhes(
                        pagamento
                    );
                }
            );

            acoes.appendChild(
                botao
            );

            // ----------------------------------------------------
            // MONTAR LINHA
            // ----------------------------------------------------

            linha.appendChild(data);
            linha.appendChild(descricao);
            linha.appendChild(tipo);
            linha.appendChild(valor);
            linha.appendChild(status);
            linha.appendChild(acoes);

            tabela.appendChild(
                linha
            );
        });
    }

    // ============================================================
    // DETALHES
    // ============================================================

    function mostrarDetalhes(pagamento) {

        const mensagem =
            `
Pagamento

Data: ${pagamento.data}
Descrição: ${pagamento.descricao}
Tipo: ${pagamento.tipo}
Valor: ${formatarValor(pagamento.valor)}
Status: ${pagamento.status}
            `.trim();

        alert(mensagem);
    }

    // ============================================================
    // FILTRO
    // ============================================================

    function aplicarFiltros() {

        let resultado =
            [...pagamentos];

        // --------------------------------------------------------
        // FILTRO POR TIPO
        // --------------------------------------------------------

        if (filtro && filtro.value) {

            const valorFiltro =
                filtro.value.toLowerCase();

            resultado =
                resultado.filter(
                    pagamento =>
                        pagamento.tipo
                            .toLowerCase()
                            .includes(
                                valorFiltro
                            )
                );
        }

        // --------------------------------------------------------
        // BUSCA
        // --------------------------------------------------------

        if (
            busca &&
            busca.value.trim() !== ""
        ) {

            const termo =
                busca.value
                    .trim()
                    .toLowerCase();

            resultado =
                resultado.filter(
                    pagamento =>

                        pagamento.descricao
                            .toLowerCase()
                            .includes(termo)

                        ||

                        pagamento.tipo
                            .toLowerCase()
                            .includes(termo)

                        ||

                        pagamento.status
                            .toLowerCase()
                            .includes(termo)

                        ||

                        pagamento.data
                            .includes(termo)
                );
        }

        renderizarPagamentos(
            resultado
        );
    }

    // ============================================================
    // EVENTOS DE FILTRO
    // ============================================================

    if (filtro) {

        filtro.addEventListener(
            "change",
            aplicarFiltros
        );
    }

    if (busca) {

        busca.addEventListener(
            "input",
            aplicarFiltros
        );
    }

    // ============================================================
    // TOTAL RECEBIDO
    // ============================================================

    function atualizarTotalRecebido() {

        const elemento =
            document.querySelector(
                ".total-recebido"
            );

        if (!elemento) {
            return;
        }

        const total =
            pagamentos
                .filter(
                    pagamento =>
                        pagamento.tipo ===
                        "Recebimento"
                )
                .reduce(
                    (
                        soma,
                        pagamento
                    ) =>
                        soma +
                        Number(
                            pagamento.valor
                        ),
                    0
                );

        elemento.textContent =
            formatarValor(total);
    }

    // ============================================================
    // TOTAL PAGO
    // ============================================================

    function atualizarTotalPago() {

        const elemento =
            document.querySelector(
                ".total-pago"
            );

        if (!elemento) {
            return;
        }

        const total =
            pagamentos
                .filter(
                    pagamento =>
                        pagamento.tipo ===
                        "Pagamento"
                )
                .reduce(
                    (
                        soma,
                        pagamento
                    ) =>
                        soma +
                        Number(
                            pagamento.valor
                        ),
                    0
                );

        elemento.textContent =
            formatarValor(total);
    }

    // ============================================================
    // SALDO
    // ============================================================

    function atualizarSaldo() {

        const elemento =
            document.querySelector(
                ".saldo"
            );

        if (!elemento) {
            return;
        }

        const recebimentos =
            pagamentos
                .filter(
                    pagamento =>
                        pagamento.tipo ===
                        "Recebimento"
                )
                .reduce(
                    (
                        soma,
                        pagamento
                    ) =>
                        soma +
                        Number(
                            pagamento.valor
                        ),
                    0
                );

        const pagamentosRealizados =
            pagamentos
                .filter(
                    pagamento =>
                        pagamento.tipo ===
                        "Pagamento"
                )
                .reduce(
                    (
                        soma,
                        pagamento
                    ) =>
                        soma +
                        Number(
                            pagamento.valor
                        ),
                    0
                );

        const saldo =
            recebimentos -
            pagamentosRealizados;

        elemento.textContent =
            formatarValor(saldo);
    }

    // ============================================================
    // LOGOUT
    // ============================================================

    if (logout) {

        logout.addEventListener(
            "click",
            event => {

                event.preventDefault();

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

    // ============================================================
    // INICIALIZAÇÃO
    // ============================================================

    carregarPagamentos();

    renderizarPagamentos();

    atualizarTotalRecebido();

    atualizarTotalPago();

    atualizarSaldo();

    console.log(
        "historicoPagamentos.js carregado com sucesso."
    );
});