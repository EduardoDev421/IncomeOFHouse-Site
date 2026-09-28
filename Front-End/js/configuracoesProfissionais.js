document.addEventListener("DOMContentLoaded", () => {

    // ============================================================
    // CONFIGURAÇÕES PROFISSIONAIS
    // ============================================================

    const STORAGE_KEY = "configuracoesProfissionais";

    // ============================================================
    // CONFIGURAÇÕES PADRÃO
    // ============================================================

    const configuracoesPadrao = {
        novosProjetos: true,
        mensagens: true,
        atualizacoesPedidos: true,
        emailsPromocionais: true,

        areaAtuacao: "",
        servicosOferecidos: "",
        regiaoAtendimento: "",
        disponibilidade: "",
        valorMinimoProjeto: "",

        dadosEmpresa: {},
        registroProfissional: {},
        portfolio: [],
        descricaoProfissional: "",

        dadosRecebimento: {},
        configuracoesCobranca: {},

        visibilidadePerfil: "publico"
    };

    // ============================================================
    // CARREGAR CONFIGURAÇÕES
    // ============================================================

    function carregarConfiguracoes() {
        const dados = localStorage.getItem(STORAGE_KEY);

        if (!dados) {
            return {
                ...configuracoesPadrao
            };
        }

        try {
            const configuracoes = JSON.parse(dados);

            return {
                ...configuracoesPadrao,
                ...configuracoes
            };

        } catch (erro) {
            console.error(
                "Erro ao carregar configurações profissionais:",
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
    // NOTIFICAÇÕES
    // ============================================================

    const notificacoes = document.querySelectorAll(
        ".notificações input[type='checkbox']"
    );

    if (notificacoes.length >= 1) {
        notificacoes[0].checked =
            configuracoes.novosProjetos;

        notificacoes[0].addEventListener("change", () => {
            configuracoes.novosProjetos =
                notificacoes[0].checked;

            salvarConfiguracoes();

            mostrarMensagem(
                notificacoes[0].checked
                    ? "Notificações de novos projetos ativadas."
                    : "Notificações de novos projetos desativadas."
            );
        });
    }

    if (notificacoes.length >= 2) {
        notificacoes[1].checked =
            configuracoes.mensagens;

        notificacoes[1].addEventListener("change", () => {
            configuracoes.mensagens =
                notificacoes[1].checked;

            salvarConfiguracoes();

            mostrarMensagem(
                notificacoes[1].checked
                    ? "Notificações de mensagens ativadas."
                    : "Notificações de mensagens desativadas."
            );
        });
    }

    if (notificacoes.length >= 3) {
        notificacoes[2].checked =
            configuracoes.atualizacoesPedidos;

        notificacoes[2].addEventListener("change", () => {
            configuracoes.atualizacoesPedidos =
                notificacoes[2].checked;

            salvarConfiguracoes();

            mostrarMensagem(
                notificacoes[2].checked
                    ? "Atualizações de pedidos ativadas."
                    : "Atualizações de pedidos desativadas."
            );
        });
    }

    if (notificacoes.length >= 4) {
        notificacoes[3].checked =
            configuracoes.emailsPromocionais;

        notificacoes[3].addEventListener("change", () => {
            configuracoes.emailsPromocionais =
                notificacoes[3].checked;

            salvarConfiguracoes();

            mostrarMensagem(
                notificacoes[3].checked
                    ? "E-mails promocionais ativados."
                    : "E-mails promocionais desativados."
            );
        });
    }

    // ============================================================
    // MENU DE SEGURANÇA
    // ============================================================

    const segurancas = document.querySelectorAll(
        ".seguranças"
    );

    segurancas.forEach((item) => {

        const titulo = item.querySelector("h3");

        if (!titulo) {
            return;
        }

        const texto = titulo.textContent
            .trim()
            .toLowerCase();

        item.style.cursor = "pointer";

        // --------------------------------------------------------
        // ALTERAR SENHA
        // --------------------------------------------------------

        if (texto === "alterar senha") {
            item.addEventListener("click", () => {

                window.location.href =
                    "AlterarSenha.html";

            });
        }

        // --------------------------------------------------------
        // AUTENTICAÇÃO EM DUAS ETAPAS
        // --------------------------------------------------------

        else if (
            texto ===
            "autenticação em duas etapas"
        ) {
            item.addEventListener("click", () => {

                mostrarMensagem(
                    "A autenticação em duas etapas ainda não está disponível."
                );

            });
        }

        // --------------------------------------------------------
        // DISPOSITIVOS CONECTADOS
        // --------------------------------------------------------

        else if (
            texto ===
            "dispositivos conectados"
        ) {
            item.addEventListener("click", () => {

                window.location.href =
                    "DispositivosConectados.html";

            });
        }

    });

    // ============================================================
    // CONFIGURAÇÕES PROFISSIONAIS
    // ============================================================

    const configuracoesProfissionais =
        document.querySelectorAll(
            ".ConfigProfissionais"
        );

    configuracoesProfissionais.forEach((item) => {

        const titulo = item.querySelector("h3");

        if (!titulo) {
            return;
        }

        const texto = titulo.textContent
            .trim()
            .toLowerCase();

        item.style.cursor = "pointer";

        // --------------------------------------------------------
        // ÁREA DE ATUAÇÃO
        // --------------------------------------------------------

        if (texto === "áreas de atuação") {

            item.addEventListener("click", () => {

                const valor = prompt(
                    "Digite suas principais áreas de atuação:",
                    configuracoes.areaAtuacao
                );

                if (valor === null) {
                    return;
                }

                configuracoes.areaAtuacao =
                    valor.trim();

                salvarConfiguracoes();

                mostrarMensagem(
                    "Áreas de atuação atualizadas."
                );

            });

        }

        // --------------------------------------------------------
        // SERVIÇOS OFERECIDOS
        // --------------------------------------------------------

        else if (
            texto === "serviços oferecidos"
        ) {

            item.addEventListener("click", () => {

                const valor = prompt(
                    "Digite os serviços que você oferece:",
                    configuracoes.servicosOferecidos
                );

                if (valor === null) {
                    return;
                }

                configuracoes.servicosOferecidos =
                    valor.trim();

                salvarConfiguracoes();

                mostrarMensagem(
                    "Serviços oferecidos atualizados."
                );

            });

        }

        // --------------------------------------------------------
        // REGIÃO DE ATENDIMENTO
        // --------------------------------------------------------

        else if (
            texto === "região de atendimento"
        ) {

            item.addEventListener("click", () => {

                const valor = prompt(
                    "Informe sua região de atendimento:",
                    configuracoes.regiaoAtendimento
                );

                if (valor === null) {
                    return;
                }

                configuracoes.regiaoAtendimento =
                    valor.trim();

                salvarConfiguracoes();

                mostrarMensagem(
                    "Região de atendimento atualizada."
                );

            });

        }

        // --------------------------------------------------------
        // DISPONIBILIDADE
        // --------------------------------------------------------

        else if (
            texto === "disponibidade" ||
            texto === "disponibilidade"
        ) {

            item.addEventListener("click", () => {

                const valor = prompt(
                    "Informe seus horários de atendimento:",
                    configuracoes.disponibilidade
                );

                if (valor === null) {
                    return;
                }

                configuracoes.disponibilidade =
                    valor.trim();

                salvarConfiguracoes();

                mostrarMensagem(
                    "Disponibilidade atualizada."
                );

            });

        }

        // --------------------------------------------------------
        // VALOR MÍNIMO
        // --------------------------------------------------------

        else if (
            texto === "valor mínimo de projeto"
        ) {

            item.addEventListener("click", () => {

                const valor = prompt(
                    "Informe o valor mínimo do projeto:",
                    configuracoes.valorMinimoProjeto
                );

                if (valor === null) {
                    return;
                }

                const valorNumerico =
                    Number(
                        valor
                            .replace("R$", "")
                            .replace(/\./g, "")
                            .replace(",", ".")
                            .trim()
                    );

                if (
                    Number.isNaN(valorNumerico) ||
                    valorNumerico < 0
                ) {
                    mostrarMensagem(
                        "Informe um valor válido."
                    );

                    return;
                }

                configuracoes.valorMinimoProjeto =
                    valorNumerico;

                salvarConfiguracoes();

                mostrarMensagem(
                    "Valor mínimo de projeto atualizado."
                );

            });

        }

    });

    // ============================================================
    // PERFIL PROFISSIONAL
    // ============================================================

    const perfilProfissional =
        document.querySelectorAll(
            ".PerfilProfissionais"
        );

    perfilProfissional.forEach((item) => {

        const titulo = item.querySelector("h3");

        if (!titulo) {
            return;
        }

        const texto = titulo.textContent
            .trim()
            .toLowerCase();

        item.style.cursor = "pointer";

        // --------------------------------------------------------
        // DADOS DA EMPRESA
        // --------------------------------------------------------

        if (texto === "dados da empresa") {

            item.addEventListener("click", () => {

                window.location.href =
                    "DadosEmpresa.html";

            });

        }

        // --------------------------------------------------------
        // REGISTRO PROFISSIONAL
        // --------------------------------------------------------

        else if (
            texto === "registro profissional"
        ) {

            item.addEventListener("click", () => {

                window.location.href =
                    "RegistroProfissional.html";

            });

        }

        // --------------------------------------------------------
        // PORTFÓLIO
        // --------------------------------------------------------

        else if (texto === "portfólio") {

            item.addEventListener("click", () => {

                window.location.href =
                    "Projetos.html";

            });

        }

        // --------------------------------------------------------
        // DESCRIÇÃO PROFISSIONAL
        // --------------------------------------------------------

        else if (
            texto === "descrição profissional"
        ) {

            item.addEventListener("click", () => {

                const valor = prompt(
                    "Digite sua descrição profissional:",
                    configuracoes.descricaoProfissional
                );

                if (valor === null) {
                    return;
                }

                configuracoes.descricaoProfissional =
                    valor.trim();

                salvarConfiguracoes();

                mostrarMensagem(
                    "Descrição profissional atualizada."
                );

            });

        }

    });

    // ============================================================
    // FINANCEIRO
    // ============================================================

    const financeiros =
        document.querySelectorAll(
            ".Financeiros"
        );

    financeiros.forEach((item) => {

        const titulo = item.querySelector("h3");

        if (!titulo) {
            return;
        }

        const texto = titulo.textContent
            .trim()
            .toLowerCase();

        item.style.cursor = "pointer";

        // --------------------------------------------------------
        // DADOS PARA RECEBIMENTO
        // --------------------------------------------------------

        if (
            texto === "dados para recebimento"
        ) {

            item.addEventListener("click", () => {

                window.location.href =
                    "DadosRecebimento.html";

            });

        }

        // --------------------------------------------------------
        // HISTÓRICO DE PAGAMENTOS
        // --------------------------------------------------------

        else if (
            texto === "histórico de pagamentos"
        ) {

            item.addEventListener("click", () => {

                window.location.href =
                    "HistoricoPagamentos.html";

            });

        }

        // --------------------------------------------------------
        // CONFIGURAÇÕES DE COBRANÇA
        // --------------------------------------------------------

        else if (
            texto ===
            "configurações de cobrança"
        ) {

            item.addEventListener("click", () => {

                mostrarMensagem(
                    "As configurações de cobrança ainda estão em desenvolvimento."
                );

            });

        }

        // --------------------------------------------------------
        // NOTAS FISCAIS
        // --------------------------------------------------------

        else if (
            texto === "notas fiscais"
        ) {

            item.addEventListener("click", () => {

                window.location.href =
                    "NotasFiscais.html";

            });

        }

    });

    // ============================================================
    // PRIVACIDADE
    // ============================================================

    const privacidades =
        document.querySelectorAll(
            ".Privacidades, .PrivacidadesU"
        );

    privacidades.forEach((item) => {

        const titulo = item.querySelector("h3");

        if (!titulo) {
            return;
        }

        const texto = titulo.textContent
            .trim()
            .toLowerCase();

        item.style.cursor = "pointer";

        // --------------------------------------------------------
        // VISIBILIDADE DO PERFIL
        // --------------------------------------------------------

        if (
            texto === "visibilidade do perfil"
        ) {

            item.addEventListener("click", () => {

                const opcoes = [
                    "publico",
                    "privado"
                ];

                const atual =
                    configuracoes.visibilidadePerfil;

                const escolha = prompt(
                    "Digite PUBLICO ou PRIVADO:",
                    atual.toUpperCase()
                );

                if (escolha === null) {
                    return;
                }

                const valor =
                    escolha.trim().toLowerCase();

                if (!opcoes.includes(valor)) {

                    mostrarMensagem(
                        "Escolha PUBLICO ou PRIVADO."
                    );

                    return;
                }

                configuracoes.visibilidadePerfil =
                    valor;

                salvarConfiguracoes();

                mostrarMensagem(
                    `Perfil definido como ${valor}.`
                );

            });

        }

        // --------------------------------------------------------
        // DADOS PESSOAIS
        // --------------------------------------------------------

        else if (
            texto === "dados pessoais"
        ) {

            item.addEventListener("click", () => {

                mostrarMensagem(
                    "A área de dados pessoais será implementada posteriormente."
                );

            });

        }

        // --------------------------------------------------------
        // EXCLUIR CONTA
        // --------------------------------------------------------

        else if (
            texto === "excluir conta"
        ) {

            item.addEventListener("click", () => {

                const primeiraConfirmacao =
                    confirm(
                        "Tem certeza que deseja excluir sua conta?"
                    );

                if (!primeiraConfirmacao) {
                    return;
                }

                const segundaConfirmacao =
                    confirm(
                        "Essa ação é permanente. Deseja realmente continuar?"
                    );

                if (!segundaConfirmacao) {
                    return;
                }

                /*
                 * Ainda não existe uma rota no Back-End
                 * para excluir profissionais.
                 *
                 * Não vamos fingir que a conta foi apagada
                 * do MySQL.
                 */

                mostrarMensagem(
                    "A exclusão definitiva da conta ainda precisa ser implementada no servidor."
                );

            });

        }

    });

    // ============================================================
    // CENTRAL DE AJUDA
    // ============================================================

    const centralAjuda =
        document.querySelectorAll(
            ".CentralAjudas, .CentralAjudaU"
        );

    centralAjuda.forEach((item) => {

        const titulo = item.querySelector("h3");

        if (!titulo) {
            return;
        }

        const texto = titulo.textContent
            .trim()
            .toLowerCase();

        item.style.cursor = "pointer";

        // --------------------------------------------------------
        // PERGUNTAS FREQUENTES
        // --------------------------------------------------------

        if (
            texto === "perguntas frequentes"
        ) {

            item.addEventListener("click", () => {

                mostrarMensagem(
                    "A área de perguntas frequentes ainda está em desenvolvimento."
                );

            });

        }

        // --------------------------------------------------------
        // FALE CONOSCO
        // --------------------------------------------------------

        else if (
            texto === "fale conosco"
        ) {

            item.addEventListener("click", () => {

                window.location.href =
                    "FaleConosco.html";

            });

        }

        // --------------------------------------------------------
        // TUTORIAIS
        // --------------------------------------------------------

        else if (
            texto ===
            "tutoriais para profissionais"
        ) {

            item.addEventListener("click", () => {

                mostrarMensagem(
                    "Os tutoriais para profissionais ainda estão em desenvolvimento."
                );

            });

        }

    });

    // ============================================================
    // BOTÃO SAIR
    // ============================================================

    const linksMenu =
        document.querySelectorAll(
            ".menu-lateral a"
        );

    linksMenu.forEach((link) => {

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

                    localStorage.removeItem(
                        STORAGE_KEY
                    );

                    window.location.href =
                        "../index.html";

                }
            );

        }

    });

    // ============================================================
    // MENSAGEM TEMPORÁRIA
    // ============================================================

    function mostrarMensagem(texto) {

        let mensagem =
            document.querySelector(
                ".mensagem-configuracao-profissional"
            );

        if (mensagem) {
            mensagem.remove();
        }

        mensagem =
            document.createElement("div");

        mensagem.className =
            "mensagem-configuracao-profissional";

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

    salvarConfiguracoes();

    console.log(
        "configuracoesProfissionais.js carregado com sucesso."
    );

});