document.addEventListener("DOMContentLoaded", () => {

    // ============================================================
    // CONFIGURAÇÕES
    // ============================================================

    const CHAVE_RECEBIMENTO = "dadosRecebimento";

    // ============================================================
    // ELEMENTOS
    // ============================================================

    const cards = document.querySelectorAll(".card");

    if (cards.length < 4) {
        console.error(
            "Os cards da página de recebimento não foram encontrados."
        );
        return;
    }

    // ============================================================
    // CARD - DADOS BANCÁRIOS
    // ============================================================

    const cardBanco = cards[0];

    const camposBanco =
        cardBanco.querySelectorAll(".campo");

    const botaoAtualizarBanco =
        cardBanco.querySelector(".botao-banco");

    // ============================================================
    // CARD - FORMAS DE RECEBIMENTO
    // ============================================================

    const cardFormas = cards[1];

    const opcoesRecebimento =
        cardFormas.querySelectorAll(".opcao");

    // ============================================================
    // CARD - CONFIGURAÇÕES
    // ============================================================

    const cardConfiguracoes = cards[2];

    const configuracoes =
        cardConfiguracoes.querySelectorAll(
            ".config-item"
        );

    const valorMinimo =
        cardConfiguracoes.querySelector(
            ".valor"
        );

    // ============================================================
    // CARD - HISTÓRICO
    // ============================================================

    const cardHistorico = cards[3];

    const botaoHistorico =
        cardHistorico.querySelector(
            ".historico"
        );

    // ============================================================
    // DADOS PADRÃO
    // ============================================================

    const dadosPadrao = {

        banco: "Banco do Brasil",

        agencia: "1234",

        conta: "56789-0",

        tipoConta: "Conta Corrente",

        formasRecebimento: {
            pix: true,
            tedDoc: true,
            paypal: false,
            cartaoCredito: false
        },

        configuracoes: {
            notificacoesPagamento: true,
            comprovantesAutomaticos: true,
            recebimentoAutomatico: false
        },

        valorMinimo: 100
    };

    // ============================================================
    // COPIAR OBJETO
    // ============================================================

    function copiarObjeto(objeto) {

        return JSON.parse(
            JSON.stringify(objeto)
        );
    }

    // ============================================================
    // CARREGAR DADOS
    // ============================================================

    function carregarDados() {

        const dadosSalvos =
            localStorage.getItem(
                CHAVE_RECEBIMENTO
            );

        if (!dadosSalvos) {

            salvarDados(
                copiarObjeto(dadosPadrao)
            );

            aplicarDados(
                copiarObjeto(dadosPadrao)
            );

            return;
        }

        try {

            const dados =
                JSON.parse(dadosSalvos);

            const dadosCompletos = {
                ...dadosPadrao,
                ...dados,

                formasRecebimento: {
                    ...dadosPadrao.formasRecebimento,
                    ...(dados.formasRecebimento || {})
                },

                configuracoes: {
                    ...dadosPadrao.configuracoes,
                    ...(dados.configuracoes || {})
                }
            };

            aplicarDados(
                dadosCompletos
            );

        } catch (erro) {

            console.error(
                "Erro ao carregar dados de recebimento:",
                erro
            );

            aplicarDados(
                copiarObjeto(dadosPadrao)
            );
        }
    }

    // ============================================================
    // SALVAR DADOS
    // ============================================================

    function salvarDados(dados) {

        try {

            localStorage.setItem(
                CHAVE_RECEBIMENTO,
                JSON.stringify(dados)
            );

            console.log(
                "Dados de recebimento salvos com sucesso."
            );

        } catch (erro) {

            console.error(
                "Erro ao salvar dados de recebimento:",
                erro
            );
        }
    }

    // ============================================================
    // ALTERAR TEXTO DE UM CAMPO
    // ============================================================

    function alterarCampoBanco(
        indice,
        valor
    ) {

        const campo =
            camposBanco[indice];

        if (!campo) {
            return;
        }

        const strong =
            campo.querySelector("strong");

        if (strong) {
            strong.textContent = valor;
        }
    }

    // ============================================================
    // APLICAR DADOS NA PÁGINA
    // ============================================================

    function aplicarDados(dados) {

        // --------------------------------------------------------
        // DADOS BANCÁRIOS
        // --------------------------------------------------------

        alterarCampoBanco(
            0,
            dados.banco
        );

        alterarCampoBanco(
            1,
            dados.agencia
        );

        alterarCampoBanco(
            2,
            dados.conta
        );

        alterarCampoBanco(
            3,
            dados.tipoConta
        );

        // --------------------------------------------------------
        // FORMAS DE RECEBIMENTO
        // --------------------------------------------------------

        const switchesRecebimento =
            cardFormas.querySelectorAll(
                'input[type="checkbox"]'
            );

        if (switchesRecebimento[0]) {

            switchesRecebimento[0].checked =
                dados.formasRecebimento.pix;
        }

        if (switchesRecebimento[1]) {

            switchesRecebimento[1].checked =
                dados.formasRecebimento.tedDoc;
        }

        if (switchesRecebimento[2]) {

            switchesRecebimento[2].checked =
                dados.formasRecebimento.paypal;
        }

        if (switchesRecebimento[3]) {

            switchesRecebimento[3].checked =
                dados.formasRecebimento.cartaoCredito;
        }

        // --------------------------------------------------------
        // CONFIGURAÇÕES
        // --------------------------------------------------------

        const switchesConfiguracao =
            cardConfiguracoes.querySelectorAll(
                'input[type="checkbox"]'
            );

        if (switchesConfiguracao[0]) {

            switchesConfiguracao[0].checked =
                dados.configuracoes
                    .notificacoesPagamento;
        }

        if (switchesConfiguracao[1]) {

            switchesConfiguracao[1].checked =
                dados.configuracoes
                    .comprovantesAutomaticos;
        }

        if (switchesConfiguracao[2]) {

            switchesConfiguracao[2].checked =
                dados.configuracoes
                    .recebimentoAutomatico;
        }

        // --------------------------------------------------------
        // VALOR MÍNIMO
        // --------------------------------------------------------

        atualizarValorMinimo(
            dados.valorMinimo
        );
    }

    // ============================================================
    // PEGAR DADOS ATUAIS
    // ============================================================

    function obterDadosAtuais() {

        const switchesRecebimento =
            cardFormas.querySelectorAll(
                'input[type="checkbox"]'
            );

        const switchesConfiguracao =
            cardConfiguracoes.querySelectorAll(
                'input[type="checkbox"]'
            );

        const dadosExistentes =
            localStorage.getItem(
                CHAVE_RECEBIMENTO
            );

        let dados = copiarObjeto(
            dadosPadrao
        );

        if (dadosExistentes) {

            try {

                dados = {
                    ...dados,
                    ...JSON.parse(
                        dadosExistentes
                    )
                };

            } catch (erro) {

                console.warn(
                    "Não foi possível recuperar os dados existentes."
                );
            }
        }

        // --------------------------------------------------------
        // BANCO
        // --------------------------------------------------------

        dados.banco =
            camposBanco[0]
                ?.querySelector("strong")
                ?.textContent.trim()
            || dadosPadrao.banco;

        dados.agencia =
            camposBanco[1]
                ?.querySelector("strong")
                ?.textContent.trim()
            || dadosPadrao.agencia;

        dados.conta =
            camposBanco[2]
                ?.querySelector("strong")
                ?.textContent.trim()
            || dadosPadrao.conta;

        dados.tipoConta =
            camposBanco[3]
                ?.querySelector("strong")
                ?.textContent.trim()
            || dadosPadrao.tipoConta;

        // --------------------------------------------------------
        // FORMAS
        // --------------------------------------------------------

        dados.formasRecebimento = {

            pix:
                switchesRecebimento[0]
                    ?.checked || false,

            tedDoc:
                switchesRecebimento[1]
                    ?.checked || false,

            paypal:
                switchesRecebimento[2]
                    ?.checked || false,

            cartaoCredito:
                switchesRecebimento[3]
                    ?.checked || false
        };

        // --------------------------------------------------------
        // CONFIGURAÇÕES
        // --------------------------------------------------------

        dados.configuracoes = {

            notificacoesPagamento:
                switchesConfiguracao[0]
                    ?.checked || false,

            comprovantesAutomaticos:
                switchesConfiguracao[1]
                    ?.checked || false,

            recebimentoAutomatico:
                switchesConfiguracao[2]
                    ?.checked || false
        };

        return dados;
    }

    // ============================================================
    // ATUALIZAR VALOR MÍNIMO
    // ============================================================

    function atualizarValorMinimo(valor) {

        if (!valorMinimo) {
            return;
        }

        const numero =
            Number(valor) || 0;

        valorMinimo.innerHTML =
            `R$ ${numero
                .toFixed(2)
                .replace(".", ",")
                .replace(
                    /\B(?=(\d{3})+(?!\d))/g,
                    "."
                )}
            <span>✎</span>`;
    }

    // ============================================================
    // EDITAR VALOR MÍNIMO
    // ============================================================

    function editarValorMinimo() {

        const dados =
            obterDadosAtuais();

        const valorAtual =
            Number(
                dados.valorMinimo
            ) || 100;

        const novoValor =
            prompt(
                "Informe o valor mínimo para transferência:",
                valorAtual.toFixed(2).replace(
                    ".",
                    ","
                )
            );

        if (novoValor === null) {
            return;
        }

        const valorLimpo =
            novoValor
                .replace(/\./g, "")
                .replace(",", ".")
                .replace(/[^\d.]/g, "");

        const valor =
            Number(valorLimpo);

        if (
            !Number.isFinite(valor) ||
            valor < 0
        ) {

            alert(
                "Informe um valor válido."
            );

            return;
        }

        if (valor > 999999999) {

            alert(
                "O valor informado é muito alto."
            );

            return;
        }

        dados.valorMinimo =
            valor;

        salvarDados(dados);

        atualizarValorMinimo(
            valor
        );

        mostrarMensagem(
            "Valor mínimo atualizado com sucesso.",
            "sucesso"
        );
    }

    // ============================================================
    // ATUALIZAR DADOS BANCÁRIOS
    // ============================================================

    function atualizarDadosBancarios() {

        const dados =
            obterDadosAtuais();

        const novoBanco =
            prompt(
                "Informe o banco:",
                dados.banco
            );

        if (novoBanco === null) {
            return;
        }

        if (!novoBanco.trim()) {

            alert(
                "O banco não pode ficar vazio."
            );

            return;
        }

        const novaAgencia =
            prompt(
                "Informe a agência:",
                dados.agencia
            );

        if (novaAgencia === null) {
            return;
        }

        if (!novaAgencia.trim()) {

            alert(
                "A agência não pode ficar vazia."
            );

            return;
        }

        const novaConta =
            prompt(
                "Informe a conta:",
                dados.conta
            );

        if (novaConta === null) {
            return;
        }

        if (!novaConta.trim()) {

            alert(
                "A conta não pode ficar vazia."
            );

            return;
        }

        const tiposConta = [
            "Conta Corrente",
            "Conta Poupança"
        ];

        let mensagemTipo =
            "Escolha o tipo de conta:\n\n";

        tiposConta.forEach(
            (tipo, indice) => {

                mensagemTipo +=
                    `${indice + 1} - ${tipo}\n`;
            }
        );

        const escolha =
            prompt(
                mensagemTipo,
                dados.tipoConta ===
                    "Conta Poupança"
                    ? "2"
                    : "1"
            );

        if (escolha === null) {
            return;
        }

        const tipoSelecionado =
            tiposConta[
                Number(escolha) - 1
            ];

        if (!tipoSelecionado) {

            alert(
                "Tipo de conta inválido."
            );

            return;
        }

        dados.banco =
            novoBanco.trim();

        dados.agencia =
            novaAgencia.trim();

        dados.conta =
            novaConta.trim();

        dados.tipoConta =
            tipoSelecionado;

        salvarDados(dados);

        aplicarDados(dados);

        mostrarMensagem(
            "Dados bancários atualizados com sucesso.",
            "sucesso"
        );
    }

    // ============================================================
    // EVENTOS DOS SWITCHES
    // ============================================================

    const todosSwitches =
        document.querySelectorAll(
            '.switch input[type="checkbox"]'
        );

    todosSwitches.forEach(
        (switchInput) => {

            switchInput.addEventListener(
                "change",
                () => {

                    const dados =
                        obterDadosAtuais();

                    salvarDados(dados);

                    const opcao =
                        switchInput.closest(
                            ".opcao, .config-item"
                        );

                    const titulo =
                        opcao?.querySelector(
                            "strong"
                        )?.textContent.trim();

                    if (titulo) {

                        mostrarMensagem(
                            `${titulo}: ${
                                switchInput.checked
                                    ? "ativado"
                                    : "desativado"
                            }.`,
                            "sucesso"
                        );
                    }
                }
            );
        }
    );

    // ============================================================
    // MENSAGEM DE STATUS
    // ============================================================

    function mostrarMensagem(
        mensagem,
        tipo = "sucesso"
    ) {

        let elemento =
            document.querySelector(
                ".mensagem-status-recebimento"
            );

        if (!elemento) {

            elemento =
                document.createElement("div");

            elemento.className =
                "mensagem-status-recebimento";

            const conteudo =
                document.querySelector(
                    ".conteudo"
                );

            if (conteudo) {

                conteudo.insertBefore(
                    elemento,
                    conteudo.firstChild
                );
            }
        }

        elemento.textContent =
            mensagem;

        elemento.className =
            `mensagem-status-recebimento ${tipo}`;

        clearTimeout(
            elemento.timer
        );

        elemento.timer =
            setTimeout(() => {

                elemento.textContent = "";

                elemento.className =
                    "mensagem-status-recebimento";

            }, 3500);
    }

    // ============================================================
    // BOTÃO ATUALIZAR BANCO
    // ============================================================

    if (botaoAtualizarBanco) {

        botaoAtualizarBanco.addEventListener(
            "click",
            atualizarDadosBancarios
        );
    }

    // ============================================================
    // BOTÃO DO VALOR MÍNIMO
    // ============================================================

    if (valorMinimo) {

        valorMinimo.style.cursor =
            "pointer";

        valorMinimo.addEventListener(
            "click",
            editarValorMinimo
        );
    }

    // ============================================================
    // HISTÓRICO COMPLETO
    // ============================================================

    if (botaoHistorico) {

        botaoHistorico.addEventListener(
            "click",
            () => {

                /*
                    A página de histórico será implementada
                    posteriormente.
                */

                window.location.href =
                    "HistoricoPagamentos.html";
            }
        );
    }

    // ============================================================
    // LOGOUT
    // ============================================================

    const links =
        document.querySelectorAll(
            ".sidebar a"
        );

    links.forEach(link => {

        const texto =
            link.textContent
                .trim()
                .toLowerCase();

        if (texto === "sair") {

            link.addEventListener(
                "click",
                (event) => {

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
    });

    // ============================================================
    // INICIALIZAÇÃO
    // ============================================================

    carregarDados();

    console.log(
        "dadosRecebimento.js carregado com sucesso."
    );
});