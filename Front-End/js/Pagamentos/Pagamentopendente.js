// =========================================================
// PAGAMENTO PENDENTE
// - Botão "Verificar Status do Pagamento"
// - Avisa antes de fechar a página enquanto o pagamento não é confirmado
// =========================================================

(function () {
    "use strict";

    // Quando o pagamento for confirmado ou recusado, a página muda de destino
    var DESTINOS = {
        aprovado: "./PagAprovado.html",
        recusado: "./PagRecusado.html"
    };

    var aguardando = true;

    function consultarStatus() {
        // TODO: trocar pela chamada real ao back-end, ex.:
        // return fetch("/api/pedidos/" + idPedido + "/status").then(r => r.json()).then(d => d.status);
        // Por enquanto devolve "pendente" depois de 1,2 s.
        return new Promise(function (resolve) {
            setTimeout(function () {
                resolve("pendente");
            }, 1200);
        });
    }

    function verificarStatus() {
        var botao = document.getElementById("btnVerificar");
        var texto = botao.querySelector("span");
        var textoOriginal = texto.textContent;

        botao.disabled = true;
        botao.classList.add("verificando");
        texto.textContent = "Verificando...";

        consultarStatus()
            .then(function (status) {
                if (DESTINOS[status]) {
                    aguardando = false;
                    window.location.href = DESTINOS[status];
                    return;
                }
                texto.textContent = "Ainda pendente. Tente de novo";
                setTimeout(function () {
                    texto.textContent = textoOriginal;
                }, 2500);
            })
            .catch(function () {
                texto.textContent = "Erro ao verificar. Tente de novo";
                setTimeout(function () {
                    texto.textContent = textoOriginal;
                }, 2500);
            })
            .then(function () {
                botao.disabled = false;
                botao.classList.remove("verificando");
            });
    }

    window.addEventListener("beforeunload", function (evento) {
        if (!aguardando) {
            return;
        }
        evento.preventDefault();
        evento.returnValue = "";
    });

    document.addEventListener("DOMContentLoaded", function () {
        var botao = document.getElementById("btnVerificar");
        if (botao) {
            botao.addEventListener("click", verificarStatus);
        }

        // Links da página (como "Voltar para o Início") não devem pedir confirmação duas vezes
        document.querySelectorAll("a").forEach(function (link) {
            link.addEventListener("click", function () {
                aguardando = false;
            });
        });
    });
})();