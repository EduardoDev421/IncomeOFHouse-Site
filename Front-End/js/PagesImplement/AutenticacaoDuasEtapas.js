/* =========================================================
   AUTENTICAÇÃO EM DUAS ETAPAS
   Fluxo de tela. A parte de segurança de verdade (chave,
   QR Code, validação do código e códigos de backup) precisa
   vir do servidor. Os trechos marcados com "BACK-END" são
   os pontos para trocar pela chamada à sua API.
========================================================= */

(function () {
    "use strict";

    /* BACK-END: estado real vindo da API (ex.: GET /api/2fa) */
    var estado = { ativo: true, metodo: "app" };

    /* BACK-END: apenas para testar a tela. Remover quando validar pela API. */
    var CODIGO_TESTE = "123456";
    var CHAVE_TESTE = "JBSWY3DPEHPK3PXP";

    var $ = function (s) { return document.querySelector(s); };
    var painel = $("#painel-config");
    var assistente = $("#assistente");
    var chave2fa = $("#chave-2fa");
    var metodos = $("#metodos");
    var toast = $("#toast");
    var otp = $("#otp");
    var campos = Array.prototype.slice.call(otp.querySelectorAll("input"));
    var btnVerificar = $("#btn-verificar");
    var metodoEscolhido = "app";
    var codigosBackup = [];
    var temporizadorToast;

    /* ---------- Utilidades ---------- */

    function avisar(texto) {
        toast.textContent = texto;
        toast.hidden = false;
        clearTimeout(temporizadorToast);
        temporizadorToast = setTimeout(function () { toast.hidden = true; }, 3500);
    }

    function copiar(texto, botao, rotulo) {
        var fim = function (msg) {
            botao.textContent = msg;
            setTimeout(function () { botao.textContent = rotulo; }, 1800);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(texto).then(
                function () { fim("Copiado"); },
                function () { fim("Copie manualmente"); }
            );
        } else {
            fim("Copie manualmente");
        }
    }

    function valorOtp() {
        return campos.map(function (c) { return c.value; }).join("");
    }

    function metodoSelecionado() {
        return document.querySelector("input[name='metodo']:checked").value;
    }

    /* ---------- QR Code (ilustrativo) ---------- */
    /* BACK-END: trocar por uma imagem/SVG gerada no servidor com a
       chave única do usuário (ex.: biblioteca "qrcode" no Node.js). */

    function desenharQr() {
        var n = 25, semente = 7, partes = "";
        function aleatorio() {
            semente = (semente * 9301 + 49297) % 233280;
            return semente / 233280;
        }
        function localizador(r, c) {
            var cantos = [[0, 0], [0, n - 7], [n - 7, 0]];
            for (var i = 0; i < cantos.length; i++) {
                var a = r - cantos[i][0], b = c - cantos[i][1];
                if (a >= 0 && a < 7 && b >= 0 && b < 7) {
                    return (a === 0 || a === 6 || b === 0 || b === 6 || (a >= 2 && a <= 4 && b >= 2 && b <= 4)) ? 1 : 0;
                }
            }
            return -1;
        }
        for (var r = 0; r < n; r++) {
            for (var c = 0; c < n; c++) {
                var loc = localizador(r, c);
                var ligado = loc === -1 ? aleatorio() > 0.52 : loc === 1;
                if (ligado) partes += '<rect x="' + c + '" y="' + r + '" width="1" height="1"/>';
            }
        }
        $("#qr").innerHTML = '<svg viewBox="0 0 ' + n + " " + n + '" role="img" aria-label="QR Code de exemplo" fill="#111">' + partes + "</svg>";
    }

    /* ---------- Códigos de backup ---------- */
    /* BACK-END: gerar no servidor, guardar com hash e marcar como usado. */

    function gerarCodigos() {
        var letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        function bloco() {
            var s = "";
            for (var i = 0; i < 5; i++) s += letras.charAt(Math.floor(Math.random() * letras.length));
            return s;
        }
        var lista = [];
        for (var i = 0; i < 8; i++) lista.push(bloco() + "-" + bloco());
        return lista;
    }

    /* ---------- Assistente ---------- */

    function irParaEtapa(n) {
        Array.prototype.forEach.call(assistente.querySelectorAll(".etapa"), function (e) {
            e.hidden = Number(e.getAttribute("data-etapa")) !== n;
        });
        Array.prototype.forEach.call($("#progresso").children, function (li, i) {
            li.className = i + 1 < n ? "feito" : i + 1 === n ? "atual" : "";
        });
    }

    function abrirAssistente(metodo) {
        metodoEscolhido = metodo;
        painel.hidden = true;
        assistente.hidden = false;
        Array.prototype.forEach.call(assistente.querySelectorAll("[data-metodo]"), function (bloco) {
            bloco.hidden = bloco.getAttribute("data-metodo") !== metodo;
        });
        if (metodo === "app") {
            desenharQr();
            $("#chave-texto").textContent = CHAVE_TESTE.replace(/(.{4})/g, "$1 ").trim();
        }
        irParaEtapa(1);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function fecharAssistente() {
        assistente.hidden = true;
        painel.hidden = false;
        limparOtp();
        $("#confirma-backup").checked = false;
        $("#btn-ativar").disabled = true;
        /* volta o painel para o que está salvo */
        chave2fa.checked = estado.ativo;
        metodos.disabled = !estado.ativo;
        document.querySelector("input[name='metodo'][value='" + estado.metodo + "']").checked = true;
    }

    function limparOtp() {
        campos.forEach(function (c) { c.value = ""; });
        otp.classList.remove("erro");
        $("#msg-erro").textContent = "";
        btnVerificar.disabled = true;
    }

    /* ---------- Painel principal ---------- */

    chave2fa.addEventListener("change", function () {
        metodos.disabled = !chave2fa.checked;
    });

    $("#btn-salvar").addEventListener("click", function () {
        var ativo = chave2fa.checked;
        var metodo = metodoSelecionado();

        if (!ativo) {
            /* BACK-END: DELETE /api/2fa (pedir a senha antes, de preferência) */
            estado.ativo = false;
            avisar("Autenticação em duas etapas desativada.");
            return;
        }
        if (estado.ativo && estado.metodo === metodo) {
            avisar("Alterações salvas.");
            return;
        }
        /* BACK-END: POST /api/2fa/iniciar { metodo } -> devolve chave/QR ou envia o e-mail */
        abrirAssistente(metodo);
    });

    /* ---------- Etapa 1 ---------- */

    $("#btn-copiar-chave").addEventListener("click", function (e) {
        copiar(CHAVE_TESTE, e.currentTarget, "Copiar");
    });

    $("#btn-etapa1").addEventListener("click", function () {
        var email = metodoEscolhido === "email";
        $("#texto-verificar").textContent = email
            ? "Digite o código que enviamos para o seu e-mail."
            : "Veja o código atual no seu aplicativo autenticador.";
        $("#btn-reenviar").hidden = !email;
        limparOtp();
        irParaEtapa(2);
        campos[0].focus();
    });

    /* ---------- Etapa 2 ---------- */

    campos.forEach(function (campo, i) {
        campo.addEventListener("input", function () {
            campo.value = campo.value.replace(/\D/g, "");
            if (campo.value && campos[i + 1]) campos[i + 1].focus();
            otp.classList.remove("erro");
            $("#msg-erro").textContent = "";
            btnVerificar.disabled = valorOtp().length < 6;
        });
        campo.addEventListener("keydown", function (e) {
            if (e.key === "Backspace" && !campo.value && campos[i - 1]) campos[i - 1].focus();
            if (e.key === "Enter" && valorOtp().length === 6) verificar();
        });
        campo.addEventListener("paste", function (e) {
            e.preventDefault();
            var texto = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
            texto.split("").forEach(function (d, k) { campos[k].value = d; });
            campos[Math.min(texto.length, 5)].focus();
            btnVerificar.disabled = valorOtp().length < 6;
        });
    });

    function verificar() {
        /* BACK-END: POST /api/2fa/verificar { codigo } -> { ok: true/false } */
        if (valorOtp() === CODIGO_TESTE) {
            codigosBackup = gerarCodigos();
            $("#codigos").innerHTML = codigosBackup.map(function (c) { return "<code>" + c + "</code>"; }).join("");
            irParaEtapa(3);
        } else {
            otp.classList.add("erro");
            $("#msg-erro").textContent = "Código incorreto ou expirado. Confira e tente de novo.";
            campos.forEach(function (c) { c.value = ""; });
            campos[0].focus();
            btnVerificar.disabled = true;
        }
    }

    btnVerificar.addEventListener("click", verificar);

    $("#btn-reenviar").addEventListener("click", function () {
        /* BACK-END: POST /api/2fa/reenviar */
        avisar("Enviamos um novo código para o seu e-mail.");
    });

    /* ---------- Etapa 3 ---------- */

    $("#btn-copiar-codigos").addEventListener("click", function (e) {
        copiar(codigosBackup.join("\n"), e.currentTarget, "Copiar códigos");
    });

    $("#confirma-backup").addEventListener("change", function (e) {
        $("#btn-ativar").disabled = !e.target.checked;
    });

    $("#btn-ativar").addEventListener("click", function () {
        /* BACK-END: POST /api/2fa/ativar */
        estado.ativo = true;
        estado.metodo = metodoEscolhido;
        fecharAssistente();
        avisar("Autenticação em duas etapas ativada.");
    });

    /* ---------- Navegação do assistente ---------- */

    assistente.addEventListener("click", function (e) {
        var acao = e.target.getAttribute && e.target.getAttribute("data-acao");
        if (acao === "cancelar") fecharAssistente();
        if (acao === "voltar-1") irParaEtapa(1);
    });

    metodos.disabled = !chave2fa.checked;
})();