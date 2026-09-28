document.addEventListener("DOMContentLoaded", () => {

    // ============================================================
    // CONFIGURAÇÕES
    // ============================================================

    const CHAVE_PERMISSOES = "dadosPermissoes";

    // ============================================================
    // ELEMENTOS
    // ============================================================

    const toggles = document.querySelectorAll(".toggle");

    const botoesEditar =
        document.querySelectorAll(".edit-account");

    const informacoesConta =
        document.querySelectorAll(".account-information");

    const linkSair =
        Array.from(
            document.querySelectorAll(".sidebar-link")
        ).find(link =>
            link.textContent
                .trim()
                .toLowerCase()
                .includes("sair")
        );

    // ============================================================
    // VERIFICAÇÃO
    // ============================================================

    if (!toggles.length) {

        console.error(
            "Nenhum botão de permissão foi encontrado."
        );

        return;
    }

    // ============================================================
    // RECUPERAR USUÁRIO LOGADO
    // ============================================================

    function obterUsuarioLogado() {

        const chaves = [
            "usuarioLogado",
            "usuario",
            "user",
            "usuarioAtual"
        ];

        for (const chave of chaves) {

            const dados =
                localStorage.getItem(chave);

            if (!dados) {
                continue;
            }

            try {

                const usuario =
                    JSON.parse(dados);

                if (
                    usuario &&
                    typeof usuario === "object"
                ) {
                    return usuario;
                }

            } catch (erro) {

                console.warn(
                    `Não foi possível interpretar ${chave}.`
                );
            }
        }

        return null;
    }

    // ============================================================
    // MOSTRAR DADOS DA CONTA
    // ============================================================

    function atualizarDadosConta() {

        const usuario =
            obterUsuarioLogado();

        if (!usuario || !informacoesConta.length) {
            return;
        }

        const valores = [
            usuario.nome || "Não informado",
            usuario.email || "Não informado",
            usuario.telefone || "Não informado",
            usuario.tipoConta ||
            usuario.tipo ||
            "Cliente"
        ];

        informacoesConta.forEach(
            (informacao, indice) => {

                const elemento =
                    informacao.querySelector(
                        ".information-value"
                    );

                if (!elemento) {
                    return;
                }

                if (valores[indice]) {
                    elemento.textContent =
                        valores[indice];
                }
            }
        );
    }

    // ============================================================
    // DEFINIÇÃO DOS MÓDULOS
    // ============================================================

    function obterNomeModulo(toggle) {

        const linha =
            toggle.closest(".permission-row");

        if (!linha) {
            return null;
        }

        const titulo =
            linha.querySelector(
                ".module-information h3"
            );

        if (!titulo) {
            return null;
        }

        return titulo.textContent.trim();
    }

    // ============================================================
    // DEFINIÇÃO DAS PERMISSÕES
    // ============================================================

    function obterNomePermissao(indice) {

        const cabecalho =
            document.querySelector(
                ".permissions-header"
            );

        if (!cabecalho) {
            return `permissao_${indice + 1}`;
        }

        const colunas =
            cabecalho.children;

        /*
            A primeira coluna é o nome do módulo.
            As próximas representam as permissões.
        */

        const coluna =
            colunas[indice + 1];

        if (!coluna) {
            return `permissao_${indice + 1}`;
        }

        return coluna.textContent
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "_");
    }

    // ============================================================
    // RECUPERAR PERMISSÕES
    // ============================================================

    function carregarPermissoes() {

        const dadosSalvos =
            localStorage.getItem(
                CHAVE_PERMISSOES
            );

        if (!dadosSalvos) {
            return;
        }

        try {

            const permissoes =
                JSON.parse(dadosSalvos);

            toggles.forEach(
                (toggle) => {

                    const linha =
                        toggle.closest(
                            ".permission-row"
                        );

                    if (!linha) {
                        return;
                    }

                    const modulo =
                        obterNomeModulo(toggle);

                    if (!modulo) {
                        return;
                    }

                    const botoesDaLinha =
                        linha.querySelectorAll(
                            ".toggle"
                        );

                    const indice =
                        Array.from(
                            botoesDaLinha
                        ).indexOf(toggle);

                    const permissao =
                        obterNomePermissao(
                            indice
                        );

                    if (
                        permissoes[modulo] &&
                        typeof permissoes[modulo][permissao] !==
                        "undefined"
                    ) {

                        const ativo =
                            permissoes[modulo][permissao];

                        toggle.classList.toggle(
                            "toggle-on",
                            ativo
                        );
                    }
                }
            );

        } catch (erro) {

            console.error(
                "Erro ao carregar permissões:",
                erro
            );
        }
    }

    // ============================================================
    // CAPTURAR PERMISSÕES ATUAIS
    // ============================================================

    function capturarPermissoes() {

        const permissoes = {};

        document
            .querySelectorAll(
                ".permission-row"
            )
            .forEach(linha => {

                const titulo =
                    linha.querySelector(
                        ".module-information h3"
                    );

                if (!titulo) {
                    return;
                }

                const modulo =
                    titulo.textContent.trim();

                permissoes[modulo] = {};

                const botoes =
                    linha.querySelectorAll(
                        ".toggle"
                    );

                botoes.forEach(
                    (toggle, indice) => {

                        const permissao =
                            obterNomePermissao(
                                indice
                            );

                        permissoes[modulo][permissao] =
                            toggle.classList.contains(
                                "toggle-on"
                            );
                    }
                );
            });

        return permissoes;
    }

    // ============================================================
    // SALVAR PERMISSÕES
    // ============================================================

    function salvarPermissoes() {

        const permissoes =
            capturarPermissoes();

        try {

            localStorage.setItem(
                CHAVE_PERMISSOES,
                JSON.stringify(permissoes)
            );

            console.log(
                "Permissões salvas:",
                permissoes
            );

        } catch (erro) {

            console.error(
                "Erro ao salvar permissões:",
                erro
            );
        }
    }

    // ============================================================
    // EVENTO DOS TOGGLES
    // ============================================================

    toggles.forEach(toggle => {

        toggle.addEventListener(
            "click",
            () => {

                toggle.classList.toggle(
                    "toggle-on"
                );

                salvarPermissoes();
            }
        );

    });

    // ============================================================
    // EDITAR DADOS DA CONTA
    // ============================================================

    botoesEditar.forEach(botao => {

        botao.addEventListener(
            "click",
            () => {

                /*
                    A página de edição de dados do usuário
                    é responsável por alterar os dados.
                */

                const usuario =
                    obterUsuarioLogado();

                if (!usuario) {

                    alert(
                        "Nenhum usuário conectado."
                    );

                    return;
                }

                /*
                    Se existir uma página de perfil,
                    encaminha para ela.
                */

                const caminhos = [
                    "PerfilUsuario.html",
                    "../PerfilUsuario.html",
                    "Perfil.html"
                ];

                /*
                    Usamos a primeira opção como destino
                    padrão do projeto.
                */

                window.location.href =
                    "PerfilUsuario.html";
            }
        );

    });

    // ============================================================
    // BOTÃO DO USUÁRIO NO TOPO
    // ============================================================

    const botaoUsuario =
        document.querySelector(".top-user");

    if (botaoUsuario) {

        botaoUsuario.addEventListener(
            "click",
            () => {

                const usuario =
                    obterUsuarioLogado();

                if (!usuario) {

                    alert(
                        "Nenhum usuário conectado."
                    );

                    return;
                }

                window.location.href =
                    "PerfilUsuario.html";
            }
        );
    }

    // ============================================================
    // SAIR
    // ============================================================

    if (linkSair) {

        linkSair.addEventListener(
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

                // ----------------------------------------------
                // REMOVER DADOS DA SESSÃO
                // ----------------------------------------------

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

                // ----------------------------------------------
                // REDIRECIONAR
                // ----------------------------------------------

                window.location.href =
                    "../../index.html";
            }
        );
    }

    // ============================================================
    // INICIALIZAÇÃO
    // ============================================================

    atualizarDadosConta();

    carregarPermissoes();

    // ============================================================
    // LUCIDE ICONS
    // ============================================================

    if (
        typeof lucide !== "undefined"
    ) {

        lucide.createIcons();
    }

    console.log(
        "dadosPermissoes.js carregado com sucesso."
    );
});