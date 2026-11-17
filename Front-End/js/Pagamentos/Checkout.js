
 // =========================================================
 // CHECKOUT
 // - Calcula o total do pedido
 // - Processa o pagamento
 // - Redireciona para uma página de status independente
 //
 // TESTES SEM BACK-END:
 // Checkout.html?simular=aprovado
 // Checkout.html?simular=pendente
 // Checkout.html?simular=pendente&consulta=aprovado
 // Checkout.html?simular=recusado
 // =========================================================

(function () {
    "use strict";

    var PAGINAS_STATUS = {
        aprovado: "./PagAprovado.html",
        pendente: "./PagPendente.html",
        recusado: "./PagRecusado.html"
    };

    var parametros = new URLSearchParams(window.location.search);

    // ---------------------------------------------------------
    // Dados do pedido
    // ---------------------------------------------------------

    var pedido = {
        valorPlanta: 89.90,
        desconto: 0,
        numero: obterNumeroPedido()
    };

    // ---------------------------------------------------------
    // Utilitários
    // ---------------------------------------------------------

    function formatarMoeda(valor) {
        return valor.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function calcularTotal() {
        return Math.max(pedido.valorPlanta - pedido.desconto, 0);
    }

    function obterNumeroPedido() {
        var chave = "checkoutNumeroPedido";

        try {
            var salvo = sessionStorage.getItem(chave);

            if (salvo) {
                return salvo;
            }
        } catch (erro) {
            // Continua sem armazenamento.
        }

        var hoje = new Date();

        var data = hoje.getFullYear() +
            String(hoje.getMonth() + 1).padStart(2, "0") +
            String(hoje.getDate()).padStart(2, "0");

        var numero = "INH-" + data + "-" +
            String(Math.floor(Math.random() * 10000)).padStart(4, "0");

        try {
            sessionStorage.setItem(chave, numero);
        } catch (erro) {
            // Continua sem armazenamento.
        }

        return numero;
    }

    function atualizarValores() {
        document.getElementById("valorPlanta").textContent =
            formatarMoeda(pedido.valorPlanta);

        document.getElementById("valorDesconto").textContent =
            "- " + formatarMoeda(pedido.desconto);

        document.getElementById("valorTotal").textContent =
            formatarMoeda(calcularTotal());
    }

    function formaSelecionada() {
        var marcada = document.querySelector(
            'input[name="pagamento"]:checked'
        );

        return marcada ? marcada.value : null;
    }

    // ---------------------------------------------------------
    // Processamento do pagamento (simulado)
    // ---------------------------------------------------------

    function processarPagamento(forma) {
        // TODO: Substituir pela integração com o back-end.

        return new Promise(function (resolve) {
            setTimeout(function () {
                resolve(parametros.get("simular") || "aprovado");
            }, 900);
        });
    }

    // ---------------------------------------------------------
    // Redirecionamento para as páginas de status
    // ---------------------------------------------------------

    function tratarStatus(status) {
        var destino = PAGINAS_STATUS[status] ||
            PAGINAS_STATUS.recusado;

        var dados = new URLSearchParams();

        dados.set("numero", pedido.numero);
        dados.set("valor", formatarMoeda(calcularTotal()));

        // Mantém o resultado da consulta para a simulação
        // da página de pagamento pendente.
        if (status === "pendente") {
            dados.set(
                "consulta",
                parametros.get("consulta") || "pendente"
            );
        }

        window.location.href = destino + "?" + dados.toString();
    }

    // ---------------------------------------------------------
    // Finalização da compra
    // ---------------------------------------------------------

    function finalizarCompra() {
        var forma = formaSelecionada();
        var botao = document.getElementById("btnFinalizar");

        if (!forma) {
            alert("Escolha uma forma de pagamento para continuar.");
            return;
        }

        if (!botao || botao.disabled) {
            return;
        }

        botao.disabled = true;

        try {
            sessionStorage.setItem("checkoutPagamento", forma);
        } catch (erro) {
            // Continua sem armazenamento.
        }

        processarPagamento(forma)
            .then(function (status) {
                tratarStatus(status);
            })
            .catch(function (erro) {
                console.error("Erro ao processar pagamento:", erro);

                tratarStatus("recusado");
            });
    }

    // ---------------------------------------------------------
    // Inicialização
    // ---------------------------------------------------------

    document.addEventListener("DOMContentLoaded", function () {
        atualizarValores();

        var botao = document.getElementById("btnFinalizar");

        if (botao) {
            botao.addEventListener("click", finalizarCompra);
        }
    });

})();
