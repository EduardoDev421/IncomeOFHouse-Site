document.addEventListener("DOMContentLoaded", () => {
    // ============================================================
    // CONFIGURAÇÕES DO USUÁRIO
    // ============================================================

    const STORAGE_KEY = "configuracoesUsuario";

    // ============================================================
    // ELEMENTOS
    // ============================================================

    const tema = document.querySelector("#tema");
    const idioma = document.querySelector("#idioma");
    const moeda = document.querySelector("#moeda");

    const toggles = document.querySelectorAll(
        '.notificações input[type="checkbox"]'
    );

    const secoesSeguranca = document.querySelectorAll(".seguranças");
    const secoesPrivacidade = document.querySelectorAll(".privacidades");
    const secoesAjuda = document.querySelectorAll(".CentralAjudas");

    // ============================================================
    // CONFIGURAÇÕES PADRÃO
    // ============================================================

    const configuracoesPadrao = {
        notificacoesEmail: true,
        notificacoesPush: true,
        novidades: true,
        tema: "escuro",
        idioma: "pt-br",
        moeda: "BRL"
    };

    // ============================================================
    // CARREGAR CONFIGURAÇÕES SALVAS
    // ============================================================

    function carregarConfiguracoes() {
        const configuracoesSalvas = localStorage.getItem(STORAGE_KEY);

        if (!configuracoesSalvas) {
            return {
                ...configuracoesPadrao
            };
        }

        try {
            const configuracoes = JSON.parse(configuracoesSalvas);

            return {
                ...configuracoesPadrao,
                ...configuracoes
            };
        } catch (erro) {
            console.error(
                "Erro ao carregar configurações do usuário:",
                erro
            );

            return {
                ...configuracoesPadrao
            };
        }
    }

    let configuracoes = carregarConfiguracoes();

    // ============================================================
    // SALVAR CONFIGURAÇÕES
    // ============================================================

    function salvarConfiguracoes() {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(configuracoes)
        );
    }

    // ============================================================
    // APLICAR CONFIGURAÇÕES
    // ============================================================

    function aplicarConfiguracoes() {
        // --------------------------------------------------------
        // NOTIFICAÇÕES
        // --------------------------------------------------------

        if (toggles.length >= 1) {
            toggles[0].checked = configuracoes.notificacoesEmail;
        }

        if (toggles.length >= 2) {
            toggles[1].checked = configuracoes.notificacoesPush;
        }

        if (toggles.length >= 3) {
            toggles[2].checked = configuracoes.novidades;
        }

        // --------------------------------------------------------
        // TEMA
        // --------------------------------------------------------

        if (tema) {
            /*
             * O HTML possui:
             *
             * value=""            -> Escuro
             * value="Casa Térrea"  -> Claro
             *
             * Corrigimos isso no JS para que a configuração
             * funcione de maneira consistente.
             */

            if (configuracoes.tema === "claro") {
                tema.value = "claro";
            } else {
                tema.value = "";
            }
        }

        aplicarTema();

        // --------------------------------------------------------
        // IDIOMA
        // --------------------------------------------------------

        if (idioma) {
            const idiomaExiste = Array.from(idioma.options).some(
                (option) => option.value === configuracoes.idioma
            );

            if (idiomaExiste) {
                idioma.value = configuracoes.idioma;
            }
        }

        // --------------------------------------------------------
        // MOEDA
        // --------------------------------------------------------

        if (moeda) {
            const moedaExiste = Array.from(moeda.options).some(
                (option) => option.value === configuracoes.moeda
            );

            if (moedaExiste) {
                moeda.value = configuracoes.moeda;
            }
        }
    }

    // ============================================================
    // TEMA
    // ============================================================

    function aplicarTema() {
        const temaAtual = configuracoes.tema;

        document.body.classList.remove(
            "tema-claro",
            "tema-escuro"
        );

        if (temaAtual === "claro") {
            document.body.classList.add("tema-claro");
        } else {
            document.body.classList.add("tema-escuro");
        }
    }

    // ============================================================
    // EVENTOS DOS TOGGLES
    // ============================================================

    if (toggles.length >= 1) {
        toggles[0].addEventListener("change", () => {
            configuracoes.notificacoesEmail = toggles[0].checked;

            salvarConfiguracoes();

            mostrarMensagem(
                toggles[0].checked
                    ? "Notificações por e-mail ativadas."
                    : "Notificações por e-mail desativadas."
            );
        });
    }

    if (toggles.length >= 2) {
        toggles[1].addEventListener("change", () => {
            configuracoes.notificacoesPush = toggles[1].checked;

            salvarConfiguracoes();

            mostrarMensagem(
                toggles[1].checked
                    ? "Notificações Push ativadas."
                    : "Notificações Push desativadas."
            );
        });
    }

    if (toggles.length >= 3) {
        toggles[2].addEventListener("change", () => {
            configuracoes.novidades = toggles[2].checked;

            salvarConfiguracoes();

            mostrarMensagem(
                toggles[2].checked
                    ? "Novidades e atualizações ativadas."
                    : "Novidades e atualizações desativadas."
            );
        });
    }

    // ============================================================
    // EVENTO DO TEMA
    // ============================================================

    if (tema) {
        tema.addEventListener("change", () => {
            /*
             * O HTML atual possui valores incorretos para o
             * select do tema. Por isso aceitamos os dois formatos.
             */

            const valor = tema.value.toLowerCase();

            if (
                valor === "claro" ||
                valor === "casa térrea"
            ) {
                configuracoes.tema = "claro";
            } else {
                configuracoes.tema = "escuro";
            }

            salvarConfiguracoes();

            aplicarTema();

            mostrarMensagem(
                `Tema ${configuracoes.tema} selecionado.`
            );
        });
    }

    // ============================================================
    // EVENTO DO IDIOMA
    // ============================================================

    if (idioma) {
        idioma.addEventListener("change", () => {
            configuracoes.idioma = idioma.value;

            salvarConfiguracoes();

            mostrarMensagem(
                `Idioma selecionado: ${idioma.options[idioma.selectedIndex].text}.`
            );

            /*
             * A tradução completa da plataforma ainda não foi
             * implementada.
             *
             * Por enquanto salvamos a preferência para que ela
             * possa ser utilizada posteriormente.
             */
        });
    }

    // ============================================================
    // EVENTO DA MOEDA
    // ============================================================

    if (moeda) {
        moeda.addEventListener("change", () => {
            configuracoes.moeda = moeda.value;

            salvarConfiguracoes();

            const moedaSelecionada =
                moeda.options[moeda.selectedIndex].text;

            mostrarMensagem(
                `Moeda selecionada: ${moedaSelecionada}.`
            );
        });
    }

    // ============================================================
    // LINKS DE SEGURANÇA
    // ============================================================

    secoesSeguranca.forEach((secao) => {
        const titulo = secao.querySelector("h3");

        if (!titulo) {
            return;
        }

        const texto = titulo.textContent.trim().toLowerCase();

        // --------------------------------------------------------
        // ALTERAR SENHA
        // --------------------------------------------------------

        if (texto === "alterar senha") {
            secao.style.cursor = "pointer";

            secao.addEventListener("click", () => {
                window.location.href =
                    "../pages/PagesImplement/AlterarSenha.html";
            });
        }

        // --------------------------------------------------------
        // AUTENTICAÇÃO EM DUAS ETAPAS
        // --------------------------------------------------------

        if (texto === "autenticação em duas etapas") {
            secao.style.cursor = "pointer";

            secao.addEventListener("click", () => {
                mostrarMensagem(
                    "A autenticação em duas etapas ainda não está disponível."
                );
            });
        }

        // --------------------------------------------------------
        // DISPOSITIVOS CONECTADOS
        // --------------------------------------------------------

        if (texto === "dispositivos conectados") {
            secao.style.cursor = "pointer";

            secao.addEventListener("click", () => {
                mostrarMensagem(
                    "O gerenciamento de dispositivos será implementado posteriormente."
                );
            });
        }
    });

    // ============================================================
    // LINKS DE PRIVACIDADE
    // ============================================================

    secoesPrivacidade.forEach((secao) => {
        const titulo = secao.querySelector("h3");

        if (!titulo) {
            return;
        }

        const texto = titulo.textContent.trim().toLowerCase();

        // --------------------------------------------------------
        // VISIBILIDADE DO PERFIL
        // --------------------------------------------------------

        if (texto === "quem pode ver seu perfil") {
            secao.style.cursor = "pointer";

            secao.addEventListener("click", () => {
                mostrarMensagem(
                    "As opções de visibilidade do perfil ainda estão em desenvolvimento."
                );
            });
        }

        // --------------------------------------------------------
        // DADOS E PERMISSÕES
        // --------------------------------------------------------

        if (texto === "dados e permissões") {
            secao.style.cursor = "pointer";

            secao.addEventListener("click", () => {
                mostrarMensagem(
                    "A área de dados e permissões ainda está em desenvolvimento."
                );
            });
        }

        // --------------------------------------------------------
        // EXCLUIR CONTA
        // --------------------------------------------------------

        if (texto === "excluir conta") {
            secao.style.cursor = "pointer";

            secao.addEventListener("click", confirmarExclusaoConta);
        }
    });

    // ============================================================
    // EXCLUSÃO DA CONTA
    // ============================================================

    function confirmarExclusaoConta() {
        const primeiraConfirmacao = confirm(
            "Tem certeza que deseja excluir sua conta?"
        );

        if (!primeiraConfirmacao) {
            return;
        }

        const segundaConfirmacao = confirm(
            "Essa ação é permanente. Deseja realmente continuar?"
        );

        if (!segundaConfirmacao) {
            return;
        }

        /*
         * Ainda não existe uma rota no Back-End para excluir
         * usuários. Portanto não vamos fingir que a conta foi
         * excluída do MySQL.
         */

        mostrarMensagem(
            "A exclusão definitiva da conta ainda precisa ser implementada no servidor."
        );
    }

    // ============================================================
    // CENTRAL DE AJUDA
    // ============================================================

    secoesAjuda.forEach((secao) => {
        const titulo = secao.querySelector("h3");

        if (!titulo) {
            return;
        }

        const texto = titulo.textContent.trim().toLowerCase();

        // --------------------------------------------------------
        // PERGUNTAS FREQUENTES
        // --------------------------------------------------------

        if (texto === "perguntas frequentes") {
            secao.style.cursor = "pointer";

            secao.addEventListener("click", () => {
                mostrarMensagem(
                    "A área de perguntas frequentes ainda está em desenvolvimento."
                );
            });
        }

        // --------------------------------------------------------
        // FALE CONOSCO
        // --------------------------------------------------------

        if (texto === "fale conosco") {
            secao.style.cursor = "pointer";

            secao.addEventListener("click", () => {
                window.location.href =
                    "../pages/PagesImplement/FaleConosco.html";
            });
        }

        // --------------------------------------------------------
        // TUTORIAIS
        // --------------------------------------------------------

        if (texto === "tutoriais para profissionais") {
            secao.style.cursor = "pointer";

            secao.addEventListener("click", () => {
                mostrarMensagem(
                    "Os tutoriais ainda estão em desenvolvimento."
                );
            });
        }
    });

    // ============================================================
    // SAIR DA CONTA
    // ============================================================

    const linksMenu = document.querySelectorAll(".menu-lateral a");

    linksMenu.forEach((link) => {
        const texto = link.textContent.trim().toLowerCase();

        if (texto === "sair") {
            link.addEventListener("click", (event) => {
                event.preventDefault();

                const confirmar = confirm(
                    "Deseja realmente sair da sua conta?"
                );

                if (!confirmar) {
                    return;
                }

                localStorage.removeItem("usuarioLogado");
                localStorage.removeItem("usuario");
                localStorage.removeItem("user");
                localStorage.removeItem("usuarioAtual");

                window.location.href = "../index.html";
            });
        }
    });

    // ============================================================
    // MENSAGEM TEMPORÁRIA
    // ============================================================

    function mostrarMensagem(texto) {
        let mensagem = document.querySelector(
            ".mensagem-configuracao"
        );

        if (mensagem) {
            mensagem.remove();
        }

        mensagem = document.createElement("div");

        mensagem.className = "mensagem-configuracao";
        mensagem.textContent = texto;

        document.body.appendChild(mensagem);

        setTimeout(() => {
            mensagem.classList.add("saindo");

            setTimeout(() => {
                if (mensagem) {
                    mensagem.remove();
                }
            }, 300);
        }, 3000);
    }

    // ============================================================
    // INICIALIZAÇÃO
    // ============================================================

    aplicarConfiguracoes();

    console.log(
        "configuracoesUsuario.js carregado com sucesso."
    );
});