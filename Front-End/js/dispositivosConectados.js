document.addEventListener("DOMContentLoaded", () => {

    // ============================================================
    // CONFIGURAÇÃO
    // ============================================================

    const CHAVE_DISPOSITIVOS = "dispositivosConectados";

    // ============================================================
    // ELEMENTOS
    // ============================================================

    const listaDispositivos =
        document.querySelector(".device-list");

    const contadorDispositivos =
        document.querySelector(".list-title");

    const botaoRemover =
        document.querySelector(".btn-danger");

    const bannerUltimaAtividade =
        document.querySelector(".banner-right");

    const linkSair =
        document.querySelector(".sidebar .logout");

    if (!listaDispositivos) {
        console.error(
            "Lista de dispositivos não encontrada."
        );
        return;
    }

    // ============================================================
    // DISPOSITIVOS INICIAIS
    // ============================================================

    const dispositivosPadrao = [
        {
            id: 1,
            icone: "🖥",
            navegador: "Windows · Chrome",
            modelo: "Desktop",
            localizacao: "São Paulo, SP - Brasil",
            ultimoAcesso: "Hoje, 15:42",
            ip: "177.52.34.21",
            status: "Ativo",
            atual: true
        },

        {
            id: 2,
            icone: "📱",
            navegador: "iPhone · Safari",
            modelo: "iPhone 15",
            localizacao: "São Paulo, SP - Brasil",
            ultimoAcesso: "Ontem, 21:18",
            ip: "177.52.34.87",
            status: "Ativo",
            atual: false
        },

        {
            id: 3,
            icone: "📱",
            navegador: "iPad · Safari",
            modelo: "iPad Pro",
            localizacao: "Rio de Janeiro, RJ - Brasil",
            ultimoAcesso: "05/04/2025, 14:32",
            ip: "177.52.102.14",
            status: "Ativo",
            atual: false
        },

        {
            id: 4,
            icone: "📱",
            navegador: "Android · Chrome",
            modelo: "Samsung Galaxy S23",
            localizacao: "Curitiba, PR - Brasil",
            ultimoAcesso: "28/03/2025, 09:17",
            ip: "177.52.76.33",
            status: "Inativo",
            atual: false
        }
    ];

    let dispositivos = [];

    let dispositivoSelecionado = null;

    // ============================================================
    // CARREGAR DISPOSITIVOS
    // ============================================================

    function carregarDispositivos() {

        const dados =
            localStorage.getItem(
                CHAVE_DISPOSITIVOS
            );

        if (!dados) {

            dispositivos =
                copiarDados(
                    dispositivosPadrao
                );

            salvarDispositivos();

            return;
        }

        try {

            dispositivos =
                JSON.parse(dados);

            if (!Array.isArray(dispositivos)) {

                dispositivos =
                    copiarDados(
                        dispositivosPadrao
                    );
            }

        } catch (erro) {

            console.error(
                "Erro ao carregar dispositivos:",
                erro
            );

            dispositivos =
                copiarDados(
                    dispositivosPadrao
                );
        }
    }

    // ============================================================
    // COPIAR DADOS
    // ============================================================

    function copiarDados(dados) {

        return JSON.parse(
            JSON.stringify(dados)
        );
    }

    // ============================================================
    // SALVAR DISPOSITIVOS
    // ============================================================

    function salvarDispositivos() {

        try {

            localStorage.setItem(
                CHAVE_DISPOSITIVOS,
                JSON.stringify(dispositivos)
            );

        } catch (erro) {

            console.error(
                "Erro ao salvar dispositivos:",
                erro
            );
        }
    }

    // ============================================================
    // MOSTRAR MENSAGEM
    // ============================================================

    function mostrarMensagem(
        texto,
        tipo = "sucesso"
    ) {

        let mensagem =
            document.querySelector(
                ".mensagem-dispositivo"
            );

        if (!mensagem) {

            mensagem =
                document.createElement("div");

            mensagem.className =
                "mensagem-dispositivo";

            const main =
                document.querySelector(".main");

            if (main) {

                main.insertBefore(
                    mensagem,
                    main.querySelector(
                        ".device-list"
                    )
                );
            }
        }

        mensagem.textContent =
            texto;

        mensagem.className =
            `mensagem-dispositivo ${tipo}`;

        clearTimeout(
            mensagem.timer
        );

        mensagem.timer =
            setTimeout(() => {

                mensagem.textContent = "";

                mensagem.className =
                    "mensagem-dispositivo";

            }, 3500);
    }

    // ============================================================
    // ATUALIZAR CONTADOR
    // ============================================================

    function atualizarContador() {

        if (!contadorDispositivos) {
            return;
        }

        contadorDispositivos.textContent =
            `Dispositivos Conectados (${dispositivos.length})`;
    }

    // ============================================================
    // CRIAR LINHA DO DISPOSITIVO
    // ============================================================

    function criarDispositivoHTML(
        dispositivo
    ) {

        const linha =
            document.createElement("div");

        linha.className =
            "device-row";

        linha.dataset.id =
            dispositivo.id;

        // --------------------------------------------------------
        // ÍCONE
        // --------------------------------------------------------

        const icone =
            document.createElement("div");

        icone.className =
            "device-icon";

        icone.textContent =
            dispositivo.icone;

        // --------------------------------------------------------
        // INFORMAÇÕES
        // --------------------------------------------------------

        const info =
            document.createElement("div");

        info.className =
            "device-info";

        const navegador =
            document.createElement("h4");

        navegador.textContent =
            dispositivo.navegador;

        const modelo =
            document.createElement("p");

        modelo.className =
            "model";

        modelo.textContent =
            dispositivo.modelo;

        const localizacao =
            document.createElement("p");

        localizacao.className =
            "loc";

        localizacao.textContent =
            `📍 ${dispositivo.localizacao}`;

        info.appendChild(
            navegador
        );

        info.appendChild(
            modelo
        );

        info.appendChild(
            localizacao
        );

        // --------------------------------------------------------
        // ÚLTIMO ACESSO
        // --------------------------------------------------------

        const metaAcesso =
            document.createElement("div");

        metaAcesso.className =
            "meta-col";

        const labelAcesso =
            document.createElement("div");

        labelAcesso.className =
            "label";

        labelAcesso.textContent =
            "📅 Último acesso";

        const valorAcesso =
            document.createElement("div");

        valorAcesso.className =
            "value";

        valorAcesso.textContent =
            dispositivo.ultimoAcesso;

        metaAcesso.appendChild(
            labelAcesso
        );

        metaAcesso.appendChild(
            valorAcesso
        );

        // --------------------------------------------------------
        // IP
        // --------------------------------------------------------

        const metaIP =
            document.createElement("div");

        metaIP.className =
            "meta-col";

        const labelIP =
            document.createElement("div");

        labelIP.className =
            "label";

        labelIP.textContent =
            "📶 Endereço IP";

        const valorIP =
            document.createElement("div");

        valorIP.className =
            "value";

        valorIP.textContent =
            dispositivo.ip;

        metaIP.appendChild(
            labelIP
        );

        metaIP.appendChild(
            valorIP
        );

        // --------------------------------------------------------
        // STATUS
        // --------------------------------------------------------

        const status =
            document.createElement("div");

        status.className =
            dispositivo.status === "Ativo"
                ? "status-pill status-ativo"
                : "status-pill status-inativo";

        status.textContent =
            dispositivo.status;

        // --------------------------------------------------------
        // MENU
        // --------------------------------------------------------

        const menu =
            document.createElement("div");

        menu.className =
            "row-menu";

        menu.textContent =
            "⋯";

        menu.title =
            "Gerenciar dispositivo";

        menu.addEventListener(
            "click",
            (event) => {

                event.stopPropagation();

                abrirMenuDispositivo(
                    dispositivo,
                    menu
                );
            }
        );

        // --------------------------------------------------------
        // DISPOSITIVO ATUAL
        // --------------------------------------------------------

        if (dispositivo.atual) {

            linha.classList.add(
                "dispositivo-atual"
            );

            const atual =
                document.createElement("span");

            atual.className =
                "dispositivo-atual-label";

            atual.textContent =
                "Este dispositivo";

            info.appendChild(
                atual
            );
        }

        // --------------------------------------------------------
        // MONTAGEM
        // --------------------------------------------------------

        linha.appendChild(
            icone
        );

        linha.appendChild(
            info
        );

        linha.appendChild(
            metaAcesso
        );

        linha.appendChild(
            metaIP
        );

        linha.appendChild(
            status
        );

        linha.appendChild(
            menu
        );

        // --------------------------------------------------------
        // SELECIONAR
        // --------------------------------------------------------

        linha.addEventListener(
            "click",
            () => {

                selecionarDispositivo(
                    dispositivo.id
                );
            }
        );

        return linha;
    }

    // ============================================================
    // RENDERIZAR LISTA
    // ============================================================

    function renderizarDispositivos() {

        listaDispositivos.innerHTML = "";

        dispositivos.forEach(
            dispositivo => {

                const linha =
                    criarDispositivoHTML(
                        dispositivo
                    );

                listaDispositivos.appendChild(
                    linha
                );
            }
        );

        atualizarContador();

        atualizarUltimaAtividade();
    }

    // ============================================================
    // SELECIONAR DISPOSITIVO
    // ============================================================

    function selecionarDispositivo(id) {

        dispositivoSelecionado =
            dispositivos.find(
                dispositivo =>
                    dispositivo.id === id
            ) || null;

        document
            .querySelectorAll(
                ".device-row"
            )
            .forEach(linha => {

                linha.classList.remove(
                    "selecionado"
                );
            });

        const linhaSelecionada =
            document.querySelector(
                `.device-row[data-id="${id}"]`
            );

        if (linhaSelecionada) {

            linhaSelecionada.classList.add(
                "selecionado"
            );
        }
    }

    // ============================================================
    // MENU DO DISPOSITIVO
    // ============================================================

    function abrirMenuDispositivo(
        dispositivo,
        elemento
    ) {

        fecharMenus();

        const menu =
            document.createElement("div");

        menu.className =
            "device-action-menu";

        // --------------------------------------------------------
        // MARCAR COMO ATUAL
        // --------------------------------------------------------

        if (!dispositivo.atual) {

            const tornarAtual =
                document.createElement("button");

            tornarAtual.textContent =
                "Usar como dispositivo atual";

            tornarAtual.addEventListener(
                "click",
                () => {

                    marcarComoAtual(
                        dispositivo.id
                    );

                    menu.remove();
                }
            );

            menu.appendChild(
                tornarAtual
            );
        }

        // --------------------------------------------------------
        // REMOVER
        // --------------------------------------------------------

        const remover =
            document.createElement("button");

        remover.textContent =
            "Remover dispositivo";

        remover.className =
            "acao-remover";

        remover.addEventListener(
            "click",
            () => {

                menu.remove();

                removerDispositivo(
                    dispositivo.id
                );
            }
        );

        menu.appendChild(
            remover
        );

        // --------------------------------------------------------
        // POSICIONAMENTO
        // --------------------------------------------------------

        elemento.parentElement.appendChild(
            menu
        );
    }

    // ============================================================
    // FECHAR MENUS
    // ============================================================

    function fecharMenus() {

        document
            .querySelectorAll(
                ".device-action-menu"
            )
            .forEach(menu => {

                menu.remove();
            });
    }

    // ============================================================
    // MARCAR DISPOSITIVO COMO ATUAL
    // ============================================================

    function marcarComoAtual(id) {

        dispositivos.forEach(
            dispositivo => {

                dispositivo.atual =
                    dispositivo.id === id;
            }
        );

        salvarDispositivos();

        renderizarDispositivos();

        mostrarMensagem(
            "Dispositivo atual atualizado."
        );
    }

    // ============================================================
    // REMOVER DISPOSITIVO
    // ============================================================

    function removerDispositivo(id) {

        const dispositivo =
            dispositivos.find(
                item =>
                    item.id === id
            );

        if (!dispositivo) {
            return;
        }

        // --------------------------------------------------------
        // NÃO PERMITIR REMOVER O ATUAL
        // --------------------------------------------------------

        if (dispositivo.atual) {

            mostrarMensagem(
                "O dispositivo atual não pode ser removido desta tela.",
                "erro"
            );

            return;
        }

        const confirmar =
            confirm(
                `Deseja realmente remover o dispositivo "${dispositivo.navegador}"?`
            );

        if (!confirmar) {
            return;
        }

        dispositivos =
            dispositivos.filter(
                item =>
                    item.id !== id
            );

        salvarDispositivos();

        dispositivoSelecionado =
            null;

        renderizarDispositivos();

        mostrarMensagem(
            "Dispositivo removido com sucesso."
        );
    }

    // ============================================================
    // BOTÃO REMOVER DA PARTE INFERIOR
    // ============================================================

    if (botaoRemover) {

        botaoRemover.addEventListener(
            "click",
            () => {

                if (!dispositivoSelecionado) {

                    alert(
                        "Selecione um dispositivo para removê-lo."
                    );

                    return;
                }

                removerDispositivo(
                    dispositivoSelecionado.id
                );
            }
        );
    }

    // ============================================================
    // ÚLTIMA ATIVIDADE
    // ============================================================

    function atualizarUltimaAtividade() {

        if (!bannerUltimaAtividade) {
            return;
        }

        const dispositivoAtual =
            dispositivos.find(
                dispositivo =>
                    dispositivo.atual
            );

        if (!dispositivoAtual) {
            return;
        }

        const titulo =
            bannerUltimaAtividade.querySelector(
                "h4"
            );

        const texto =
            bannerUltimaAtividade.querySelector(
                "p"
            );

        if (titulo) {

            titulo.textContent =
                "Última atividade";
        }

        if (texto) {

            texto.innerHTML =
                `${dispositivoAtual.ultimoAcesso}<br>(${dispositivoAtual.navegador})`;
        }
    }

    // ============================================================
    // FECHAR MENU AO CLICAR FORA
    // ============================================================

    document.addEventListener(
        "click",
        event => {

            if (
                !event.target.closest(
                    ".row-menu"
                ) &&
                !event.target.closest(
                    ".device-action-menu"
                )
            ) {

                fecharMenus();
            }
        }
    );

    // ============================================================
    // LOGOUT
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

    carregarDispositivos();

    renderizarDispositivos();

    console.log(
        "dispositivosConectados.js carregado com sucesso."
    );
});