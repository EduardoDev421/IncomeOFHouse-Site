document.addEventListener("DOMContentLoaded", () => {

    const CHAVE_CONFIG = "areaConfigProfissionais";

    // ============================================================
    // ELEMENTOS
    // ============================================================

    const botoesSeletor = document.querySelectorAll(".opcao .seletor");

    const switches = document.querySelectorAll(
        ".opcao .switch input[type='checkbox']"
    );

    // modal
    const modal = document.getElementById("modalConfig");
    const modalCaixa = modal.querySelector(".modal");
    const modalTitulo = document.getElementById("modalTitulo");
    const modalLista = document.getElementById("modalLista");
    const modalErro = document.getElementById("modalErro");
    const btnCancelar = modal.querySelector(".btn-cancelar");
    const btnConfirmar = modal.querySelector(".btn-confirmar");

    // ============================================================
    // FORMATAÇÃO
    // ============================================================

    function formatarReais(valor) {
        return "R$ " + Number(valor).toLocaleString("pt-BR");
    }

    function juntarNomes(lista, singularPlural) {

        if (lista.length === 1) return lista[0];
        if (lista.length === 2) return lista[0] + " e " + lista[1];

        return singularPlural(lista.length);
    }

    // ============================================================
    // SELETORES (ordem igual à dos botões na página)
    //
    // tipo "lista": várias opções com checkbox
    //   minimo    -> quantas opções precisam ficar marcadas
    //   exclusiva -> opção que desmarca as outras (ex.: "Todas as regiões")
    // tipo "faixa": campos de valor mínimo e máximo
    // ============================================================

    const SELETORES = [

        {
            chave: "tiposProfissionais",
            titulo: "Tipos de profissionais",
            tipo: "lista",
            minimo: 0,
            opcoes: [
                "Arquitetos",
                "Engenheiros",
                "Designers de Interiores",
                "Paisagistas",
                "Empreiteiros",
                "Eletricistas",
                "Encanadores",
                "Pintores",
                "Marceneiros"
            ],
            rotulo(sel) {
                if (sel.length === 0) return "Nenhum selecionado";
                if (sel.length === this.opcoes.length) return "Todos os profissionais";
                return sel.length + (sel.length === 1 ? " selecionado" : " selecionados");
            }
        },

        {
            chave: "faixaPreco",
            titulo: "Faixa de preço",
            tipo: "faixa",
            rotulo(valor) {
                return formatarReais(valor.minimo) + " — " + formatarReais(valor.maximo);
            }
        },

        {
            chave: "regiaoAtuacao",
            titulo: "Região de atuação",
            tipo: "lista",
            minimo: 1,
            exclusiva: "Todas as regiões",
            opcoes: [
                "Todas as regiões",
                "Norte",
                "Nordeste",
                "Centro-Oeste",
                "Sudeste",
                "Sul"
            ],
            rotulo(sel) {
                return juntarNomes(sel, n => n + " regiões");
            }
        },

        {
            chave: "formaContato",
            titulo: "Forma de contato preferida",
            tipo: "lista",
            minimo: 1,
            opcoes: ["E-mail", "WhatsApp", "Telefone", "SMS"],
            rotulo(sel) {
                if (sel.length === this.opcoes.length) return "Todas as formas";
                return juntarNomes(sel, n => n + " formas de contato");
            }
        }
    ];

    // ============================================================
    // CONFIGURAÇÃO PADRÃO
    // ============================================================

    const configuracaoPadrao = {

        preferencias: {
            tiposProfissionais: [
                "Arquitetos",
                "Engenheiros",
                "Designers de Interiores",
                "Paisagistas"
            ],
            faixaPreco: { minimo: 5000, maximo: 50000 },
            regiaoAtuacao: ["Todas as regiões"],
            formaContato: ["E-mail", "WhatsApp"]
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

    function copiarPadrao() {
        return JSON.parse(JSON.stringify(configuracaoPadrao));
    }

    // ============================================================
    // CARREGAR CONFIGURAÇÃO
    // ============================================================

    function carregarConfiguracao() {

        const dados = localStorage.getItem(CHAVE_CONFIG);

        if (!dados) {
            salvarConfiguracao(configuracaoPadrao);
            return copiarPadrao();
        }

        try {

            const salva = JSON.parse(dados);

            const resultado = {
                ...configuracaoPadrao,
                ...salva,

                preferencias: {
                    ...configuracaoPadrao.preferencias,
                    ...(salva.preferencias || {})
                },

                notificacoes: {
                    ...configuracaoPadrao.notificacoes,
                    ...(salva.notificacoes || {})
                },

                avaliacao: {
                    ...configuracaoPadrao.avaliacao,
                    ...(salva.avaliacao || {})
                },

                documentos: {
                    ...configuracaoPadrao.documentos,
                    ...(salva.documentos || {})
                }
            };

            // versões antigas salvavam texto ("4 selecionados", "R$ 5.000 — ...");
            // se o formato não for o atual, volta para o padrão
            SELETORES.forEach(seletor => {

                const valor = resultado.preferencias[seletor.chave];

                const valido = seletor.tipo === "lista"
                    ? Array.isArray(valor)
                    : valor &&
                      typeof valor === "object" &&
                      Number.isFinite(valor.minimo) &&
                      Number.isFinite(valor.maximo);

                if (!valido) {
                    resultado.preferencias[seletor.chave] =
                        JSON.parse(JSON.stringify(
                            configuracaoPadrao.preferencias[seletor.chave]
                        ));
                }
            });

            return resultado;

        } catch (erro) {

            console.error("Erro ao carregar configurações:", erro);

            return copiarPadrao();
        }
    }

    // ============================================================
    // SALVAR CONFIGURAÇÃO
    // ============================================================

    function salvarConfiguracao(dados) {
        localStorage.setItem(CHAVE_CONFIG, JSON.stringify(dados));
    }

    let configuracao = carregarConfiguracao();

    // ============================================================
    // MENSAGEM (aviso rápido no canto da tela)
    // ============================================================

    function mostrarMensagem(texto, tipo = "sucesso") {

        let mensagem = document.querySelector(".mensagem-config-profissionais");

        if (!mensagem) {
            mensagem = document.createElement("div");
            mensagem.className = "mensagem-config-profissionais";
            document.body.appendChild(mensagem);
        }

        mensagem.textContent = texto;
        mensagem.dataset.tipo = tipo;

        clearTimeout(mensagem.timer);

        mensagem.timer = setTimeout(() => {
            mensagem.textContent = "";
            mensagem.removeAttribute("data-tipo");
        }, 3000);
    }

    // ============================================================
    // TEXTO DOS BOTÕES
    // ============================================================

    function atualizarPreferencias() {

        SELETORES.forEach((seletor, indice) => {

            const botao = botoesSeletor[indice];

            if (!botao) return;

            const valor = configuracao.preferencias[seletor.chave];

            // mantém a ordem original da lista no texto
            const ordenado = seletor.tipo === "lista"
                ? seletor.opcoes.filter(o => valor.includes(o))
                : valor;

            botao.querySelector(".seletor-texto").textContent =
                seletor.rotulo(ordenado);
        });
    }

    // ============================================================
    // MODAL
    // ============================================================

    let seletorAberto = null;
    let botaoOrigem = null;
    let campoMinimo = null;
    let campoMaximo = null;

    function mostrarErro(texto) {
        modalErro.textContent = texto;
        modalErro.hidden = false;
    }

    function limparErro() {
        modalErro.textContent = "";
        modalErro.hidden = true;
    }

    // ---------- conteúdo: lista com checkbox ----------

    function montarLista(seletor) {

        const marcados = configuracao.preferencias[seletor.chave];

        modalLista.classList.remove("modal-lista-faixa");

        seletor.opcoes.forEach(nome => {

            const label = document.createElement("label");
            label.className = "modal-item";

            const input = document.createElement("input");
            input.type = "checkbox";
            input.value = nome;
            input.checked = marcados.includes(nome);

            label.append(input, document.createTextNode(nome));
            modalLista.appendChild(label);
        });
    }

    // ---------- conteúdo: faixa de preço ----------

    function criarCampoValor(rotulo, valor) {

        const campo = document.createElement("label");
        campo.className = "campo-faixa";

        const texto = document.createElement("span");
        texto.textContent = rotulo;

        const caixa = document.createElement("div");
        caixa.className = "campo-valor";

        const moeda = document.createElement("b");
        moeda.textContent = "R$";

        const input = document.createElement("input");
        input.type = "text";
        input.inputMode = "numeric";
        input.autocomplete = "off";
        input.maxLength = 12;
        input.value = String(valor);

        // só números
        input.addEventListener("input", () => {
            input.value = input.value.replace(/\D/g, "");
            limparErro();
        });

        caixa.append(moeda, input);
        campo.append(texto, caixa);

        return { campo, input };
    }

    function montarFaixa(seletor) {

        const valor = configuracao.preferencias[seletor.chave];

        modalLista.classList.add("modal-lista-faixa");

        const grade = document.createElement("div");
        grade.className = "modal-faixa";

        const minimo = criarCampoValor("Valor mínimo", valor.minimo);
        const maximo = criarCampoValor("Valor máximo", valor.maximo);

        campoMinimo = minimo.input;
        campoMaximo = maximo.input;

        grade.append(minimo.campo, maximo.campo);
        modalLista.appendChild(grade);
    }

    // ---------- abrir / fechar ----------

    function abrirSelecao(seletor, botao) {

        seletorAberto = seletor;
        botaoOrigem = botao;

        modalTitulo.textContent = seletor.titulo;
        modalLista.innerHTML = "";
        limparErro();

        if (seletor.tipo === "faixa") {
            montarFaixa(seletor);
        } else {
            montarLista(seletor);
        }

        modal.hidden = false;
        document.body.style.overflow = "hidden";
        modalLista.scrollTop = 0;
        modalCaixa.focus();
    }

    function fecharSelecao() {

        modal.hidden = true;
        document.body.style.overflow = "";

        if (botaoOrigem) botaoOrigem.focus();

        seletorAberto = null;
        campoMinimo = null;
        campoMaximo = null;
    }

    // ---------- confirmar ----------

    function confirmarLista() {

        const escolhidos = [
            ...modalLista.querySelectorAll("input:checked")
        ].map(input => input.value);

        if (escolhidos.length < seletorAberto.minimo) {
            mostrarErro("Selecione pelo menos uma opção.");
            return false;
        }

        configuracao.preferencias[seletorAberto.chave] = escolhidos;

        return true;
    }

    function confirmarFaixa() {

        if (campoMinimo.value === "" || campoMaximo.value === "") {
            mostrarErro("Preencha o valor mínimo e o valor máximo.");
            return false;
        }

        const minimo = Number(campoMinimo.value);
        const maximo = Number(campoMaximo.value);

        if (minimo > maximo) {
            mostrarErro("O valor mínimo não pode ser maior que o máximo.");
            return false;
        }

        configuracao.preferencias[seletorAberto.chave] = { minimo, maximo };

        return true;
    }

    function confirmarSelecao() {

        if (!seletorAberto) return;

        const valido = seletorAberto.tipo === "faixa"
            ? confirmarFaixa()
            : confirmarLista();

        if (!valido) return;

        salvarConfiguracao(configuracao);

        atualizarPreferencias();

        mostrarMensagem(`${seletorAberto.titulo} atualizado com sucesso.`);

        fecharSelecao();
    }

    // ---------- "Todas as regiões" desmarca as outras (e vice-versa) ----------

    function tratarExclusiva(evento) {

        if (!seletorAberto || !seletorAberto.exclusiva) return;

        const alvo = evento.target;

        if (alvo.type !== "checkbox") return;

        const inputs = [...modalLista.querySelectorAll("input")];
        const exclusiva = inputs.find(i => i.value === seletorAberto.exclusiva);

        if (alvo.checked) {

            inputs.forEach(i => {
                if (alvo === exclusiva) {
                    if (i !== exclusiva) i.checked = false;
                } else if (i === exclusiva) {
                    i.checked = false;
                }
            });

        } else if (!inputs.some(i => i.checked)) {

            // não deixa ficar sem nada marcado
            exclusiva.checked = true;
        }
    }

    // ---------- eventos ----------

    function configurarPreferencias() {

        SELETORES.forEach((seletor, indice) => {

            const botao = botoesSeletor[indice];

            if (!botao) return;

            botao.addEventListener("click", evento => {
                evento.preventDefault();
                abrirSelecao(seletor, botao);
            });
        });

        modalLista.addEventListener("change", evento => {
            limparErro();
            tratarExclusiva(evento);
        });

        btnCancelar.addEventListener("click", fecharSelecao);
        btnConfirmar.addEventListener("click", confirmarSelecao);

        // clicar fora do modal fecha
        modal.addEventListener("click", evento => {
            if (evento.target === modal) fecharSelecao();
        });

        document.addEventListener("keydown", evento => {

            if (modal.hidden) return;

            if (evento.key === "Escape") fecharSelecao();

            // Enter confirma dentro dos campos de valor
            if (
                evento.key === "Enter" &&
                evento.target.matches(".campo-valor input")
            ) {
                confirmarSelecao();
            }
        });
    }

    // ============================================================
    // SWITCHES
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

        const nomesGrupos = ["notificacoes", "avaliacao", "documentos"];

        let indiceGlobal = 0;

        grupos.forEach((grupo, indiceGrupo) => {

            grupo.forEach(chave => {

                const input = switches[indiceGlobal];

                indiceGlobal++;

                if (!input) return;

                const nomeGrupo = nomesGrupos[indiceGrupo];

                input.checked = Boolean(configuracao[nomeGrupo][chave]);

                input.addEventListener("change", () => {

                    configuracao[nomeGrupo][chave] = input.checked;

                    salvarConfiguracao(configuracao);

                    mostrarMensagem("Configuração atualizada.");
                });
            });
        });
    }

    // ============================================================
    // SAIR
    // ============================================================

    function configurarLogout() {

        const links = document.querySelectorAll(
            ".menu-lateral li:last-child a"
        );

        links.forEach(link => {

            link.addEventListener("click", evento => {

                evento.preventDefault();

                const confirmar = confirm(
                    "Deseja realmente sair da sua conta?"
                );

                if (!confirmar) return;

                localStorage.removeItem("usuarioLogado");
                localStorage.removeItem("usuario");
                localStorage.removeItem("user");
                localStorage.removeItem("usuarioAtual");

                window.location.href = "../../index.html";
            });
        });
    }

    // ============================================================
    // INICIALIZAÇÃO
    // ============================================================

    atualizarPreferencias();

    configurarPreferencias();

    configurarSwitches();

    configurarLogout();
});