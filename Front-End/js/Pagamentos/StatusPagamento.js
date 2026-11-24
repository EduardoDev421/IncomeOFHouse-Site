// =========================================================
// POP-UP DE STATUS DO PAGAMENTO (pendente e recusado)
//
// Uso (no Checkout):
//
//   StatusPagamento.mostrar("recusado", { numero: "INH-...", valor: "R$ 89,90" });
//   StatusPagamento.mostrar("pendente", {
//       numero: "INH-...",
//       valor: "R$ 89,90",
//       pix: { copiaCola: "000201...", qrBase64: "iVBOR..." },   // opcional (Pix)
//       destinoAprovado: "./PagAprovado.html?numero=...",        // opcional
//       aoTentarNovamente: function () { ... },                  // opcional (recusado)
//       consultar: function () { return Promise.resolve("pendente"); } // "aprovado" | "recusado" | "pendente"
//   });
//   StatusPagamento.retomar({ consultar: ... });   // reabre o pendente após recarregar a página
//   StatusPagamento.fechar();
//
// Aprovado continua sendo uma página (PagAprovado.html).
// =========================================================

(function () {
    "use strict";

    var CHAVE_PENDENTE = "statusPagamentoPendente";
    var INTERVALO_CONSULTA = 8000; // consulta automática do pendente (ms)

    var TEXTOS = {
        pendente: {
            destaque: "Pendente",
            mensagem: "Seu pagamento ainda está sendo processado.<br>Isso pode levar alguns minutos.",
            aviso: "Não feche esta página até que o pagamento seja confirmado.",
            botao: "Verificar Status do Pagamento"
        },
        recusado: {
            destaque: "Recusado",
            mensagem: "Não foi possível processar seu pagamento.<br>Tente novamente ou escolha outra forma de pagamento.",
            aviso: "Confira os dados informados. Se o valor foi debitado, fale com o nosso suporte.",
            botao: "Tentar Novamente"
        }
    };

    var ICONES = {
        pendente: '<path d="M12 6.5V12l3.8 2.6"></path>',
        recusado: '<path d="M7 7l10 10M17 7 7 17"></path>'
    };

    var ICONE_ATUALIZAR =
        '<path d="M20 11a8 8 0 0 0-14.3-4.5L4 8.5"></path><path d="M4 4v4.5h4.5"></path>' +
        '<path d="M4 13a8 8 0 0 0 14.3 4.5L20 15.5"></path><path d="M20 20v-4.5h-4.5"></path>';

    // Estilo do bloco do Pix (injetado uma vez; usa as cores do tema quando existirem)
    var ESTILO_PIX =
        '.sm-pix{margin:14px 0;padding:14px;border:1px solid var(--cor-destaque,#d4a63a);border-radius:10px;text-align:center}' +
        '.sm-pix[hidden]{display:none}' +
        '.sm-pix-titulo{margin:0 0 10px;font-size:.9rem;font-weight:600}' +
        '.sm-pix-qr{display:block;width:180px;height:180px;margin:0 auto 10px;background:#fff;padding:6px;border-radius:8px}' +
        '.sm-pix-qr[hidden]{display:none}' +
        '.sm-pix-linha{display:flex;gap:8px}' +
        '.sm-pix-codigo{flex:1;min-width:0;padding:8px;border-radius:6px;border:1px solid rgba(128,128,128,.5);background:transparent;color:inherit;font-size:.75rem}' +
        '.sm-pix-copiar{padding:8px 12px;border-radius:6px;border:1px solid var(--cor-destaque,#d4a63a);background:transparent;color:inherit;cursor:pointer;font-weight:600}';

    var overlay = null;
    var card = null;
    var estado = { status: null, dados: {} };
    var temporizador = null;
    var consultando = false;
    var focoAnterior = null;

    // ---------------------------------------------------------
    // Construção (uma vez só)
    // ---------------------------------------------------------

    function construir() {
        if (!document.getElementById("sm-pix-estilo")) {
            var estilo = document.createElement("style");
            estilo.id = "sm-pix-estilo";
            estilo.textContent = ESTILO_PIX;
            document.head.appendChild(estilo);
        }

        overlay = document.createElement("div");
        overlay.className = "sm-overlay";
        overlay.hidden = true;

        overlay.innerHTML =
            '<div class="sm-card" role="dialog" aria-modal="true" aria-labelledby="sm-titulo" aria-describedby="sm-mensagem" tabindex="-1">' +
                '<button type="button" class="sm-fechar" aria-label="Fechar">' +
                    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>' +
                '</button>' +
                '<div class="sm-selo">' +
                    '<span class="sm-linha"></span>' +
                    '<div class="sm-circulo"><svg viewBox="0 0 24 24" aria-hidden="true"></svg></div>' +
                    '<span class="sm-linha"></span>' +
                '</div>' +
                '<h2 class="sm-titulo" id="sm-titulo">Pagamento <span></span></h2>' +
                '<p class="sm-mensagem" id="sm-mensagem"></p>' +
                '<div class="sm-aviso" role="status" aria-live="polite">' +
                    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5"></circle><path d="M12 11v6M12 7.5v.5"></path></svg>' +
                    '<p></p>' +
                '</div>' +
                '<div class="sm-pix" hidden>' +
                    '<p class="sm-pix-titulo">Pague com Pix: escaneie o QR Code ou copie o código</p>' +
                    '<img class="sm-pix-qr" alt="QR Code do Pix" hidden>' +
                    '<div class="sm-pix-linha">' +
                        '<input type="text" class="sm-pix-codigo" readonly aria-label="Código Pix copia e cola">' +
                        '<button type="button" class="sm-pix-copiar">Copiar</button>' +
                    '</div>' +
                '</div>' +
                '<div class="sm-detalhes">' +
                    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"></path><path d="M14.5 3v4.5H19"></path><path d="M9 11.5h7M9 15h7M9 18.5h4"></path></svg>' +
                    '<div class="sm-detalhes-corpo">' +
                        '<h3>Detalhes do Pedido</h3>' +
                        '<div class="sm-detalhe-linha"><span class="sm-numero"></span><strong class="sm-valor"></strong></div>' +
                    '</div>' +
                '</div>' +
                '<button type="button" class="sm-principal">' +
                    '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONE_ATUALIZAR + '</svg>' +
                    '<span></span>' +
                '</button>' +
                '<a class="sm-voltar" href="../../index.html">' +
                    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H4M10 6l-6 6 6 6"></path></svg>' +
                    'Voltar para o Início' +
                '</a>' +
            '</div>';

        card = overlay.querySelector(".sm-card");

        overlay.querySelector(".sm-fechar").addEventListener("click", fechar);
        overlay.querySelector(".sm-principal").addEventListener("click", aoClicarPrincipal);
        overlay.querySelector(".sm-pix-copiar").addEventListener("click", copiarPix);
        overlay.querySelector(".sm-voltar").addEventListener("click", function () {
            // quem sai da página pelo link não precisa mais ser avisado
            pararConsulta();
        });

        // clicar no fundo escuro fecha (só no recusado)
        overlay.addEventListener("mousedown", function (evento) {
            if (evento.target === overlay && estado.status === "recusado") {
                fechar();
            }
        });

        document.addEventListener("keydown", aoTeclar);
        document.body.appendChild(overlay);
    }

    // ---------------------------------------------------------
    // Pix: copiar o código
    // ---------------------------------------------------------

    function copiarPix() {
        var campo = card.querySelector(".sm-pix-codigo");
        var botao = card.querySelector(".sm-pix-copiar");
        var texto = campo.value;

        function feito() {
            botao.textContent = "Copiado!";
            setTimeout(function () { botao.textContent = "Copiar"; }, 2000);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(texto).then(feito).catch(function () {
                campo.select();
                document.execCommand("copy");
                feito();
            });
        } else {
            campo.select();
            document.execCommand("copy");
            feito();
        }
    }

    // ---------------------------------------------------------
    // Atualiza o conteúdo conforme o status
    // ---------------------------------------------------------

    function preencher(status, dados) {
        var t = TEXTOS[status];

        card.classList.remove("sm-pendente", "sm-recusado");
        card.classList.add("sm-" + status);

        card.querySelector(".sm-circulo svg").innerHTML = ICONES[status];
        card.querySelector(".sm-titulo span").textContent = t.destaque;
        card.querySelector(".sm-mensagem").innerHTML = t.mensagem;
        card.querySelector(".sm-aviso p").textContent = t.aviso;
        card.querySelector(".sm-numero").textContent = dados.numero ? "Pedido #" + dados.numero : "";
        card.querySelector(".sm-valor").textContent = dados.valor || "";
        card.querySelector(".sm-voltar").setAttribute("href", dados.voltarHref || "../../index.html");

        // Bloco do Pix: só no pendente e só quando há código
        var blocoPix = card.querySelector(".sm-pix");
        var temPix = status === "pendente" && dados.pix && dados.pix.copiaCola;
        blocoPix.hidden = !temPix;
        if (temPix) {
            var imagem = blocoPix.querySelector(".sm-pix-qr");
            if (dados.pix.qrBase64) {
                imagem.src = "data:image/png;base64," + dados.pix.qrBase64;
                imagem.hidden = false;
            } else {
                imagem.removeAttribute("src");
                imagem.hidden = true;
            }
            blocoPix.querySelector(".sm-pix-codigo").value = dados.pix.copiaCola;
        }

        var botao = card.querySelector(".sm-principal");
        botao.disabled = false;
        botao.classList.remove("sm-verificando");
        botao.querySelector("span").textContent = t.botao;

        // O pendente só sai pelos botões (o pagamento ainda está em andamento)
        card.querySelector(".sm-fechar").hidden = (status === "pendente");
    }

    // ---------------------------------------------------------
    // Abrir / fechar
    // ---------------------------------------------------------

    function mostrar(status, dados) {
        if (!TEXTOS[status]) {
            return;
        }
        dados = dados || {};

        if (!overlay) {
            construir();
        }

        estado.status = status;
        estado.dados = dados;
        preencher(status, dados);

        if (overlay.hidden) {
            focoAnterior = document.activeElement;
            overlay.hidden = false;
            document.body.classList.add("sm-aberto");
        }

        if (status === "pendente") {
            guardarPendente(dados);
            iniciarConsulta();
        } else {
            pararConsulta();
            limparPendente();
        }

        // leva o foco para o botão principal (leitores de tela leem o diálogo)
        card.querySelector(".sm-principal").focus();
    }

    function fechar() {
        if (!overlay || overlay.hidden) {
            return;
        }
        pararConsulta();
        overlay.hidden = true;
        document.body.classList.remove("sm-aberto");

        if (focoAnterior && typeof focoAnterior.focus === "function") {
            focoAnterior.focus();
        }
        focoAnterior = null;
    }

    // ---------------------------------------------------------
    // Botão principal: verificar (pendente) ou tentar de novo (recusado)
    // ---------------------------------------------------------

    function aoClicarPrincipal() {
        if (estado.status === "pendente") {
            verificar(true);
            return;
        }

        var aoTentar = estado.dados.aoTentarNovamente;
        fechar();
        if (typeof aoTentar === "function") {
            aoTentar();
        }
    }

    // ---------------------------------------------------------
    // Consulta do status (pendente)
    // ---------------------------------------------------------

    function consultarPadrao() {
        // Sem função "consultar" informada: considera pendente.
        return Promise.resolve("pendente");
    }

    function iniciarConsulta() {
        pararConsulta();
        temporizador = setInterval(function () {
            verificar(false);
        }, INTERVALO_CONSULTA);
    }

    function pararConsulta() {
        if (temporizador) {
            clearInterval(temporizador);
            temporizador = null;
        }
    }

    function verificar(manual) {
        if (consultando || estado.status !== "pendente") {
            return;
        }

        var botao = card.querySelector(".sm-principal");
        var texto = botao.querySelector("span");
        var original = TEXTOS.pendente.botao;
        var consultar = estado.dados.consultar || consultarPadrao;

        consultando = true;
        if (manual) {
            botao.disabled = true;
            botao.classList.add("sm-verificando");
            texto.textContent = "Verificando...";
        }

        function restaurar(mensagem) {
            if (estado.status !== "pendente") {
                return;
            }
            botao.disabled = false;
            botao.classList.remove("sm-verificando");
            if (manual && mensagem) {
                texto.textContent = mensagem;
                setTimeout(function () {
                    if (estado.status === "pendente") {
                        texto.textContent = original;
                    }
                }, 2500);
            } else {
                texto.textContent = original;
            }
        }

        Promise.resolve()
            .then(consultar)
            .then(function (resultado) {
                consultando = false;

                if (resultado === "aprovado") {
                    pararConsulta();
                    limparPendente();
                    window.location.href = estado.dados.destinoAprovado || "./PagAprovado.html";
                    return;
                }

                if (resultado === "recusado") {
                    mostrar("recusado", estado.dados);
                    return;
                }

                restaurar("Ainda pendente. Tente de novo");
            })
            .catch(function () {
                consultando = false;
                restaurar("Erro ao verificar. Tente de novo");
            });
    }

    // ---------------------------------------------------------
    // Guarda o pendente para reabrir se a página for recarregada
    // ---------------------------------------------------------

    function guardarPendente(dados) {
        try {
            sessionStorage.setItem(CHAVE_PENDENTE, JSON.stringify({
                numero: dados.numero || "",
                valor: dados.valor || "",
                pix: dados.pix || null
            }));
        } catch (erro) {
            // sessionStorage indisponível: segue sem guardar
        }
    }

    function limparPendente() {
        try {
            sessionStorage.removeItem(CHAVE_PENDENTE);
        } catch (erro) {
            // ignora
        }
    }

    function retomar(opcoes) {
        var salvo = null;
        try {
            salvo = JSON.parse(sessionStorage.getItem(CHAVE_PENDENTE));
        } catch (erro) {
            salvo = null;
        }

        if (!salvo) {
            return false;
        }

        var dados = {};
        var chave;
        for (chave in salvo) {
            dados[chave] = salvo[chave];
        }
        for (chave in (opcoes || {})) {
            dados[chave] = opcoes[chave];
        }

        mostrar("pendente", dados);
        return true;
    }

    // ---------------------------------------------------------
    // Teclado: Esc fecha (só recusado) e Tab fica preso dentro do pop-up
    // ---------------------------------------------------------

    function aoTeclar(evento) {
        if (!overlay || overlay.hidden) {
            return;
        }

        if (evento.key === "Escape" && estado.status === "recusado") {
            fechar();
            return;
        }

        if (evento.key !== "Tab") {
            return;
        }

        var focaveis = card.querySelectorAll("button:not([disabled]):not([hidden]), a[href], input:not([hidden])");
        var visiveis = [];
        for (var i = 0; i < focaveis.length; i++) {
            if (!focaveis[i].closest("[hidden]")) {
                visiveis.push(focaveis[i]);
            }
        }

        if (!visiveis.length) {
            evento.preventDefault();
            return;
        }

        var primeiro = visiveis[0];
        var ultimo = visiveis[visiveis.length - 1];

        if (evento.shiftKey && document.activeElement === primeiro) {
            evento.preventDefault();
            ultimo.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
            evento.preventDefault();
            primeiro.focus();
        }
    }

    window.StatusPagamento = {
        mostrar: mostrar,
        fechar: fechar,
        retomar: retomar
    };
})();