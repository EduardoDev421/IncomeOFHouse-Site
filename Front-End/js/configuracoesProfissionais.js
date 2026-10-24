document.addEventListener("DOMContentLoaded", () => {

    // ============================================================
    // CONFIGURAÇÕES PROFISSIONAIS
    // ============================================================

    const STORAGE_KEY = "configuracoesProfissionais";

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
    // CARREGAR / SALVAR
    // ============================================================

    function carregarConfiguracoes() {

        const dados = localStorage.getItem(STORAGE_KEY);

        if (!dados) {
            return { ...configuracoesPadrao };
        }

        try {
            return { ...configuracoesPadrao, ...JSON.parse(dados) };

        } catch (erro) {
            console.error("Erro ao carregar configurações profissionais:", erro);
            return { ...configuracoesPadrao };
        }
    }

    let configuracoes = carregarConfiguracoes();

    function salvarConfiguracoes() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(configuracoes));
    }

    // ============================================================
    // MENSAGEM TEMPORÁRIA
    // ============================================================

    function mostrarMensagem(texto) {

        const antiga = document.querySelector(".mensagem-configuracao-profissional");

        if (antiga) antiga.remove();

        const mensagem = document.createElement("div");
        mensagem.className = "mensagem-configuracao-profissional";
        mensagem.textContent = texto;

        document.body.appendChild(mensagem);

        setTimeout(() => {
            mensagem.classList.add("saindo");
            setTimeout(() => mensagem.remove(), 300);
        }, 3000);
    }

    // ============================================================
    // NOTIFICAÇÕES (switches, na ordem da página)
    // ============================================================

    const NOTIFICACOES = [
        { chave: "novosProjetos",       texto: "Notificações de novos projetos", on: "ativadas",  off: "desativadas" },
        { chave: "mensagens",           texto: "Notificações de mensagens",      on: "ativadas",  off: "desativadas" },
        { chave: "atualizacoesPedidos", texto: "Atualizações de pedidos",        on: "ativadas",  off: "desativadas" },
        { chave: "emailsPromocionais",  texto: "E-mails promocionais",           on: "ativados",  off: "desativados" }
    ];

    const switches = document.querySelectorAll(
        ".notificações input[type='checkbox']"
    );

    NOTIFICACOES.forEach((notificacao, indice) => {

        const input = switches[indice];

        if (!input) return;

        input.checked = Boolean(configuracoes[notificacao.chave]);

        input.addEventListener("change", () => {

            configuracoes[notificacao.chave] = input.checked;

            salvarConfiguracoes();

            mostrarMensagem(
                `${notificacao.texto} ${input.checked ? notificacao.on : notificacao.off}.`
            );
        });
    });

    // ============================================================
    // AÇÕES DOS ITENS QUE NÃO TÊM LINK
    // (itens com <a href> navegam sozinhos, o JS não mexe neles)
    // ============================================================

    function pedirTexto(chave, pergunta, sucesso) {

        const valor = prompt(pergunta, configuracoes[chave]);

        if (valor === null) return;

        configuracoes[chave] = valor.trim();

        salvarConfiguracoes();

        mostrarMensagem(sucesso);
    }

    function pedirValorMinimo() {

        const valor = prompt(
            "Informe o valor mínimo do projeto:",
            configuracoes.valorMinimoProjeto
        );

        if (valor === null) return;

        const valorNumerico = Number(
            valor
                .replace("R$", "")
                .replace(/\./g, "")
                .replace(",", ".")
                .trim()
        );

        if (Number.isNaN(valorNumerico) || valorNumerico < 0) {
            mostrarMensagem("Informe um valor válido.");
            return;
        }

        configuracoes.valorMinimoProjeto = valorNumerico;

        salvarConfiguracoes();

        mostrarMensagem("Valor mínimo de projeto atualizado.");
    }

    function escolherVisibilidade() {

        const escolha = prompt(
            "Digite PUBLICO ou PRIVADO:",
            configuracoes.visibilidadePerfil.toUpperCase()
        );

        if (escolha === null) return;

        const valor = escolha.trim().toLowerCase();

        if (!["publico", "privado"].includes(valor)) {
            mostrarMensagem("Escolha PUBLICO ou PRIVADO.");
            return;
        }

        configuracoes.visibilidadePerfil = valor;

        salvarConfiguracoes();

        mostrarMensagem(`Perfil definido como ${valor}.`);
    }

    function excluirConta() {

        if (!confirm("Tem certeza que deseja excluir sua conta?")) return;

        if (!confirm("Essa ação é permanente. Deseja realmente continuar?")) return;

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
    }

    const ACOES = {
        "autenticação em duas etapas": () =>
            mostrarMensagem("A autenticação em duas etapas ainda não está disponível."),

        "áreas de atuação": () =>
            pedirTexto("areaAtuacao", "Digite suas principais áreas de atuação:", "Áreas de atuação atualizadas."),

        "serviços oferecidos": () =>
            pedirTexto("servicosOferecidos", "Digite os serviços que você oferece:", "Serviços oferecidos atualizados."),

        "região de atendimento": () =>
            pedirTexto("regiaoAtendimento", "Informe sua região de atendimento:", "Região de atendimento atualizada."),

        "disponibidade": () =>
            pedirTexto("disponibilidade", "Informe seus horários de atendimento:", "Disponibilidade atualizada."),

        "disponibilidade": () =>
            pedirTexto("disponibilidade", "Informe seus horários de atendimento:", "Disponibilidade atualizada."),

        "valor mínimo de projeto": pedirValorMinimo,

        "descrição profissional": () =>
            pedirTexto("descricaoProfissional", "Digite sua descrição profissional:", "Descrição profissional atualizada."),

        "visibilidade do perfil": escolherVisibilidade,

        "dados pessoais": () =>
            mostrarMensagem("A área de dados pessoais será implementada posteriormente."),

        "excluir conta": excluirConta
    };

    const itens = document.querySelectorAll(
        ".seguranças, .ConfigProfissionais, .PerfilProfissionais, " +
        ".Financeiros, .Privacidades, .PrivacidadesU, " +
        ".CentralAjudas, .CentralAjudaU"
    );

    itens.forEach(item => {

        // item com link: o navegador abre a página, sem prompt nem redirecionamento do JS
        if (item.querySelector("a[href]")) return;

        const titulo = item.querySelector("h3");

        if (!titulo) return;

        const acao = ACOES[titulo.textContent.trim().toLowerCase()];

        if (!acao) return;

        item.style.cursor = "pointer";

        item.addEventListener("click", acao);
    });

    // ============================================================
    // BOTÃO SAIR
    // ============================================================

    document.querySelectorAll(".menu-lateral a").forEach(link => {

        if (link.textContent.trim().toLowerCase() !== "sair") return;

        link.addEventListener("click", evento => {

            evento.preventDefault();

            if (!confirm("Deseja realmente sair da sua conta?")) return;

            localStorage.removeItem("usuarioLogado");
            localStorage.removeItem("usuario");
            localStorage.removeItem("user");
            localStorage.removeItem("usuarioAtual");
            localStorage.removeItem(STORAGE_KEY);

            window.location.href = "../index.html";
        });
    });

    // ============================================================
    // INICIALIZAÇÃO
    // ============================================================

    salvarConfiguracoes();

    console.log("configuracoesProfissionais.js carregado com sucesso.");
});