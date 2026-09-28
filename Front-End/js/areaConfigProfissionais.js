document.addEventListener("DOMContentLoaded", () => {

    const CHAVE_CONFIG =
        "areaConfigProfissionais";

    // ============================================================
    // ELEMENTOS
    // ============================================================

    const paineis =
        document.querySelectorAll(
            ".grid-configuracoes .painel"
        );

    const botoesSeletor =
        document.querySelectorAll(
            ".opcao .seletor"
        );

    const switches =
        document.querySelectorAll(
            ".opcao .switch input[type='checkbox']"
        );

    // ============================================================
    // CONFIGURAÇÃO PADRÃO
    // ============================================================

    const configuracaoPadrao = {

        preferencias: {
            tiposProfissionais:
                "4 selecionados",

            faixaPreco:
                "R$ 5.000 — R$ 50.000",

            regiaoAtuacao:
                "Todas as regiões",

            formaContato:
                "E-mail e WhatsApp"
        },

        notificacoes: {
            novosProfissionais: true,
            mensagensProfissionais: true,
            atualizacoesProjetos: true,
            promocoesNovidades: true
        },

        avaliacao: {
            exigirAvaliacoes: true,
            mostrarAvaliacoesPublicas: true,
            notificarNovasAvaliacoes: true
        },

        documentos: {
            verificarDocumentacao: true,
            verificarPortfolio: true,
            verificarCertificacoes: true
        }
    };

    // ============================================================
    // CARREGAR CONFIGURAÇÃO
    // ============================================================

    function carregarConfiguracao() {

        const dados =
            localStorage.getItem(
                CHAVE_CONFIG
            );

        if (!dados) {

            salvarConfiguracao(
                configuracaoPadrao
            );

            return JSON.parse(
                JSON.stringify(
                    configuracaoPadrao
                )
            );
        }

        try {

            const configuracao =
                JSON.parse(dados);

            return {
                ...configuracaoPadrao,
                ...configuracao,

                preferencias: {
                    ...configuracaoPadrao.preferencias,
                    ...(configuracao.preferencias || {})
                },

                notificacoes: {
                    ...configuracaoPadrao.notificacoes,
                    ...(configuracao.notificacoes || {})
                },

                avaliacao: {
                    ...configuracaoPadrao.avaliacao,
                    ...(configuracao.avaliacao || {})
                },

                documentos: {
                    ...configuracaoPadrao.documentos,
                    ...(configuracao.documentos || {})
                }
            };

        } catch (erro) {

            console.error(
                "Erro ao carregar configurações:",
                erro
            );

            return JSON.parse(
                JSON.stringify(
                    configuracaoPadrao
                )
            );
        }
    }

    // ============================================================
    // SALVAR CONFIGURAÇÃO
    // ============================================================

    function salvarConfiguracao(
        configuracao
    ) {

        localStorage.setItem(
            CHAVE_CONFIG,
            JSON.stringify(
                configuracao
            )
        );
    }

    // ============================================================
    // CONFIGURAÇÃO ATUAL
    // ============================================================

    let configuracao =
        carregarConfiguracao();

    // ============================================================
    // MENSAGEM
    // ============================================================

    function mostrarMensagem(
        texto,
        tipo = "sucesso"
    ) {

        let mensagem =
            document.querySelector(
                ".mensagem-config-profissionais"
            );

        if (!mensagem) {

            mensagem =
                document.createElement(
                    "div"
                );

            mensagem.className =
                "mensagem-config-profissionais";

            document
                .querySelector(".conteudo")
                ?.prepend(mensagem);
        }

        mensagem.textContent =
            texto;

        mensagem.dataset.tipo =
            tipo;

        clearTimeout(
            mensagem.timer
        );

        mensagem.timer =
            setTimeout(() => {

                mensagem.textContent =
                    "";

                mensagem.removeAttribute(
                    "data-tipo"
                );

            }, 3000);
    }

    // ============================================================
    // PREFERÊNCIAS DE CONTRATAÇÃO
    // ============================================================

    function configurarPreferencias() {

        if (botoesSeletor.length < 4) {
            return;
        }

        const botoes = [
            {
                botao:
                    botoesSeletor[0],

                chave:
                    "tiposProfissionais",

                titulo:
                    "Tipos de profissionais",

                opcoes: [
                    "4 selecionados",
                    "3 selecionados",
                    "2 selecionados",
                    "1 selecionado",
                    "Todos os profissionais"
                ]
            },

            {
                botao:
                    botoesSeletor[1],

                chave:
                    "faixaPreco",

                titulo:
                    "Faixa de preço",

                opcoes: [
                    "Até R$ 5.000",
                    "R$ 5.000 — R$ 20.000",
                    "R$ 5.000 — R$ 50.000",
                    "R$ 20.000 — R$ 100.000",
                    "Acima de R$ 100.000"
                ]
            },

            {
                botao:
                    botoesSeletor[2],

                chave:
                    "regiaoAtuacao",

                titulo:
                    "Região de atuação",

                opcoes: [
                    "Todas as regiões",
                    "Minha cidade",
                    "Meu estado",
                    "Região Sudeste",
                    "Região Sul",
                    "Região Nordeste",
                    "Região Centro-Oeste",
                    "Região Norte"
                ]
            },

            {
                botao:
                    botoesSeletor[3],

                chave:
                    "formaContato",

                titulo:
                    "Forma de contato preferida",

                opcoes: [
                    "E-mail e WhatsApp",
                    "Somente E-mail",
                    "Somente WhatsApp"
                ]
            }
        ];

        botoes.forEach(
            configuracaoBotao => {

                const botao =
                    configuracaoBotao.botao;

                botao.textContent =
                    configuracao
                        .preferencias[
                            configuracaoBotao.chave
                        ];

                const seta =
                    document.createElement(
                        "b"
                    );

                seta.textContent =
                    "›";

                botao.appendChild(
                    seta
                );

                botao.addEventListener(
                    "click",
                    evento => {

                        evento.preventDefault();

                        abrirSelecao(
                            configuracaoBotao
                        );
                    }
                );
            }
        );
    }

    // ============================================================
    // ABRIR SELEÇÃO
    // ============================================================

    function abrirSelecao(
        dados
    ) {

        const valorAtual =
            configuracao
                .preferencias[
                    dados.chave
                ];

        let mensagem =
            `${dados.titulo}\n\n`;

        dados.opcoes.forEach(
            (opcao, indice) => {

                mensagem +=
                    `${indice + 1}. ${opcao}\n`;
            }
        );

        mensagem +=
            "\nDigite o número da opção desejada:";

        const resposta =
            prompt(
                mensagem,
                ""
            );

        if (
            resposta === null ||
            resposta.trim() === ""
        ) {
            return;
        }

        const indice =
            Number(resposta) - 1;

        if (
            indice < 0 ||
            indice >= dados.opcoes.length
        ) {

            mostrarMensagem(
                "Opção inválida.",
                "erro"
            );

            return;
        }

        configuracao
            .preferencias[
                dados.chave
            ] =
            dados.opcoes[indice];

        salvarConfiguracao(
            configuracao
        );

        atualizarPreferencias();

        mostrarMensagem(
            `${dados.titulo} atualizado com sucesso.`
        );
    }

    // ============================================================
    // ATUALIZAR PREFERÊNCIAS
    // ============================================================

    function atualizarPreferencias() {

        if (botoesSeletor.length < 4) {
            return;
        }

        const valores = [
            configuracao
                .preferencias
                .tiposProfissionais,

            configuracao
                .preferencias
                .faixaPreco,

            configuracao
                .preferencias
                .regiaoAtuacao,

            configuracao
                .preferencias
                .formaContato
        ];

        valores.forEach(
            (valor, indice) => {

                const botao =
                    botoesSeletor[indice];

                if (!botao) {
                    return;
                }

                botao.innerHTML =
                    `${valor}<b>›</b>`;
            }
        );
    }

    // ============================================================
    // MAPEAR SWITCHES
    // ============================================================

    function configurarSwitches() {

        const grupos = [

            [
                "novosProfissionais",
                "mensagensProfissionais",
                "atualizacoesProjetos",
                "promocoesNovidades"
            ],

            [
                "exigirAvaliacoes",
                "mostrarAvaliacoesPublicas",
                "notificarNovasAvaliacoes"
            ],

            [
                "verificarDocumentacao",
                "verificarPortfolio",
                "verificarCertificacoes"
            ]
        ];

        let indiceGlobal = 0;

        grupos.forEach(
            (grupo, indiceGrupo) => {

                grupo.forEach(
                    chave => {

                        const input =
                            switches[
                                indiceGlobal
                            ];

                        if (!input) {
                            indiceGlobal++;
                            return;
                        }

                        const grupoConfiguracao =
                            indiceGrupo === 0
                                ? "notificacoes"
                                : indiceGrupo === 1
                                    ? "avaliacao"
                                    : "documentos";

                        input.checked =
                            Boolean(
                                configuracao[
                                    grupoConfiguracao
                                ][chave]
                            );

                        input.addEventListener(
                            "change",
                            () => {

                                configuracao[
                                    grupoConfiguracao
                                ][chave] =
                                    input.checked;

                                salvarConfiguracao(
                                    configuracao
                                );

                                mostrarMensagem(
                                    "Configuração atualizada."
                                );
                            }
                        );

                        indiceGlobal++;
                    }
                );
            }
        );
    }

    // ============================================================
    // DESTACAR ITEM ATIVO
    // ============================================================

    function configurarMenu() {

        const itens =
            document.querySelectorAll(
                ".sidebar .item-menu"
            );

        itens.forEach(
            item => {

                item.addEventListener(
                    "click",
                    () => {

                        itens.forEach(
                            outro =>
                                outro.classList.remove(
                                    "selecionado"
                                )
                        );

                        item.classList.add(
                            "selecionado"
                        );
                    }
                );
            }
        );
    }

    // ============================================================
    // SAIR
    // ============================================================

    function configurarLogout() {

        const links =
            document.querySelectorAll(
                ".sidebar .sair"
            );

        links.forEach(
            link => {

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
                            "../index.html";
                    }
                );
            }
        );
    }

    // ============================================================
    // INICIALIZAÇÃO
    // ============================================================

    atualizarPreferencias();

    configurarPreferencias();

    configurarSwitches();

    configurarMenu();

    configurarLogout();

    console.log(
        "areaConfigProfissionais.js carregado com sucesso."
    );
});