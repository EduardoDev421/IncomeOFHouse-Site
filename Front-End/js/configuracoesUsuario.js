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
    const secoesAjuda = document.querySelectorAll(".CentralAjudas, .CentralAjudaU");

    // ============================================================
    // CONFIGURAÇÕES PADRÃO
    // ============================================================

    const configuracoesPadrao = {
        notificacoesEmail: true,
        notificacoesPush: true,
        novidades: true,
        tema: "escuro",
        idioma: "pt-br",
        moeda: "BRL",
        visibilidadePerfil: "publico" // "publico" | "privado"
    };

    // ============================================================
    // CARREGAR / SALVAR
    // ============================================================

    function carregarConfiguracoes() {
        const salvas = localStorage.getItem(STORAGE_KEY);

        if (!salvas) {
            return { ...configuracoesPadrao };
        }

        try {
            return { ...configuracoesPadrao, ...JSON.parse(salvas) };
        } catch (erro) {
            console.error("Erro ao carregar configurações do usuário:", erro);
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
        const antiga = document.querySelector(".mensagem-configuracao");

        if (antiga) antiga.remove();

        const mensagem = document.createElement("div");
        mensagem.className = "mensagem-configuracao";
        mensagem.textContent = texto;

        document.body.appendChild(mensagem);

        setTimeout(() => {
            mensagem.classList.add("saindo");
            setTimeout(() => mensagem.remove(), 300);
        }, 3000);
    }

    // ============================================================
    // TEMA
    // ============================================================

    function aplicarTema() {
        document.body.classList.remove("tema-claro", "tema-escuro");
        document.body.classList.add(
            configuracoes.tema === "claro" ? "tema-claro" : "tema-escuro"
        );
    }

    // ============================================================
    // VISIBILIDADE DO PERFIL (modal de escolha)
    // ============================================================

    const OPCOES_VISIBILIDADE = {
        publico: {
            titulo: "Público",
            descricao: "Profissionais e outros usuários podem ver seu perfil.",
            resumo: "Seu perfil é público"
        },
        privado: {
            titulo: "Privado",
            descricao: "Ninguém pode ver seu perfil. Só você tem acesso.",
            resumo: "Seu perfil é privado"
        }
    };

    // Mostra a escolha atual no texto pequeno do item
    function atualizarResumoVisibilidade() {
        const item = Array.from(secoesPrivacidade).find((secao) => {
            const h3 = secao.querySelector("h3");
            return h3 && h3.textContent.trim().toLowerCase() === "quem pode ver seu perfil";
        });

        if (!item) return;

        const p = item.querySelector("p");
        const opcao = OPCOES_VISIBILIDADE[configuracoes.visibilidadePerfil];

        if (p && opcao) p.textContent = opcao.resumo;
    }

    function abrirModalVisibilidade() {
        // evita abrir duas vezes
        if (document.querySelector(".modal-visibilidade")) return;

        const overlay = document.createElement("div");
        overlay.className = "modal-visibilidade";

        const opcoesHTML = Object.entries(OPCOES_VISIBILIDADE)
            .map(([valor, opcao]) => `
                <label class="opcao-visibilidade">
                    <input type="radio" name="visibilidade" value="${valor}"
                        ${configuracoes.visibilidadePerfil === valor ? "checked" : ""}>
                    <span class="opcao-visibilidade-texto">
                        <strong>${opcao.titulo}</strong>
                        <small>${opcao.descricao}</small>
                    </span>
                </label>
            `)
            .join("");

        overlay.innerHTML = `
            <div class="modal-visibilidade-caixa" role="dialog" aria-modal="true"
                 aria-labelledby="tituloVisibilidade">
                <h3 id="tituloVisibilidade">Quem pode ver seu perfil</h3>
                <p>Escolha se outras pessoas podem ou não ver o seu perfil.</p>
                <div class="opcoes-visibilidade">${opcoesHTML}</div>
                <div class="modal-visibilidade-botoes">
                    <button type="button" class="btn-cancelar">Cancelar</button>
                    <button type="button" class="btn-salvar">Salvar</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        function fechar() {
            document.removeEventListener("keydown", aoPressionarTecla);
            overlay.remove();
        }

        function aoPressionarTecla(evento) {
            if (evento.key === "Escape") fechar();
        }

        document.addEventListener("keydown", aoPressionarTecla);

        // clicar fora da caixa fecha
        overlay.addEventListener("click", (evento) => {
            if (evento.target === overlay) fechar();
        });

        overlay.querySelector(".btn-cancelar").addEventListener("click", fechar);

        overlay.querySelector(".btn-salvar").addEventListener("click", () => {
            const escolhida = overlay.querySelector('input[name="visibilidade"]:checked');

            if (escolhida) {
                configuracoes.visibilidadePerfil = escolhida.value;
                salvarConfiguracoes();
                atualizarResumoVisibilidade();

                mostrarMensagem(
                    escolhida.value === "publico"
                        ? "Seu perfil agora é público."
                        : "Seu perfil agora é privado."
                );
            }

            fechar();
        });
    }

    // ============================================================
    // EXCLUSÃO DA CONTA
    // ============================================================

    function confirmarExclusaoConta() {
        if (!confirm("Tem certeza que deseja excluir sua conta?")) return;

        if (!confirm("Essa ação é permanente. Deseja realmente continuar?")) return;

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
    // APLICAR CONFIGURAÇÕES NA TELA
    // ============================================================

    function aplicarConfiguracoes() {
        // Notificações
        if (toggles[0]) toggles[0].checked = configuracoes.notificacoesEmail;
        if (toggles[1]) toggles[1].checked = configuracoes.notificacoesPush;
        if (toggles[2]) toggles[2].checked = configuracoes.novidades;

        // Tema
        if (tema) tema.value = configuracoes.tema === "claro" ? "claro" : "escuro";
        aplicarTema();

        // Idioma
        if (idioma && Array.from(idioma.options).some((o) => o.value === configuracoes.idioma)) {
            idioma.value = configuracoes.idioma;
        }

        // Moeda
        if (moeda && Array.from(moeda.options).some((o) => o.value === configuracoes.moeda)) {
            moeda.value = configuracoes.moeda;
        }

        // Visibilidade
        atualizarResumoVisibilidade();
    }

    // ============================================================
    // EVENTOS DOS TOGGLES
    // ============================================================

    const NOTIFICACOES = [
        { chave: "notificacoesEmail", on: "Notificações por e-mail ativadas.", off: "Notificações por e-mail desativadas." },
        { chave: "notificacoesPush", on: "Notificações Push ativadas.", off: "Notificações Push desativadas." },
        { chave: "novidades", on: "Novidades e atualizações ativadas.", off: "Novidades e atualizações desativadas." }
    ];

    NOTIFICACOES.forEach((notificacao, indice) => {
        const input = toggles[indice];

        if (!input) return;

        input.addEventListener("change", () => {
            configuracoes[notificacao.chave] = input.checked;
            salvarConfiguracoes();
            mostrarMensagem(input.checked ? notificacao.on : notificacao.off);
        });
    });

    // ============================================================
    // EVENTOS DE TEMA, IDIOMA E MOEDA
    // ============================================================

    if (tema) {
        tema.addEventListener("change", () => {
            configuracoes.tema = tema.value === "claro" ? "claro" : "escuro";
            salvarConfiguracoes();
            aplicarTema();
            mostrarMensagem(`Tema ${configuracoes.tema} selecionado.`);
        });
    }

    if (idioma) {
        idioma.addEventListener("change", () => {
            configuracoes.idioma = idioma.value;
            salvarConfiguracoes();
            mostrarMensagem(
                `Idioma selecionado: ${idioma.options[idioma.selectedIndex].text}.`
            );
        });
    }

    if (moeda) {
        moeda.addEventListener("change", () => {
            configuracoes.moeda = moeda.value;
            salvarConfiguracoes();
            mostrarMensagem(
                `Moeda selecionada: ${moeda.options[moeda.selectedIndex].text}.`
            );
        });
    }

    // ============================================================
    // ITENS SEM LINK
    // (itens com <a href> navegam sozinhos, o JS não mexe neles)
    // ============================================================

    const ACOES = {
        "quem pode ver seu perfil": abrirModalVisibilidade,
        "excluir conta": confirmarExclusaoConta,
        "perguntas frequentes": () =>
            mostrarMensagem("A área de perguntas frequentes ainda está em desenvolvimento."),
        "tutoriais": () =>
            mostrarMensagem("Os tutoriais ainda estão em desenvolvimento.")
    };

    [...secoesSeguranca, ...secoesPrivacidade, ...secoesAjuda].forEach((item) => {
        if (item.querySelector("a[href]")) return;

        const titulo = item.querySelector("h3");

        if (!titulo) return;

        const acao = ACOES[titulo.textContent.trim().toLowerCase()];

        if (!acao) return;

        item.style.cursor = "pointer";
        item.addEventListener("click", acao);
    });

    // ============================================================
    // SAIR DA CONTA
    // ============================================================

    document.querySelectorAll(".menu-lateral a").forEach((link) => {
        if (link.textContent.trim().toLowerCase() !== "sair") return;

        link.addEventListener("click", (evento) => {
            evento.preventDefault();

            if (!confirm("Deseja realmente sair da sua conta?")) return;

            localStorage.removeItem("usuarioLogado");
            localStorage.removeItem("usuario");
            localStorage.removeItem("user");
            localStorage.removeItem("usuarioAtual");

            window.location.href = "../index.html";
        });
    });

    // ============================================================
    // INICIALIZAÇÃO
    // ============================================================

    aplicarConfiguracoes();

    console.log("configuracoesUsuario.js carregado com sucesso.");
});