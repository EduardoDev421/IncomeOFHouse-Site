// =========================================================
// PAGAMENTO APROVADO   (PagAprovado.html?pedido=<id>)
// - Só mostra a página se houver pagamento APROVADO no banco para o pedido
//   (não basta abrir a URL)
// - Preenche o número do pedido
// - "Baixar Comprovante" gera um arquivo HTML com os dados reais
// =========================================================
import { supabase } from "../lib/supabaseClient.js";

const PAGINA_LOGIN = "../Login.html";
const PAGINA_DETALHES = "../DetalhesPedidos.html";
const PAGINA_INICIO = "../../index.html";

const idPedido = new URLSearchParams(window.location.search).get("pedido");

function esperar(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function escapar(texto) {
    return String(texto).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
}

function moeda(valor) {
    return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// O webhook pode levar alguns segundos: tenta algumas vezes antes de desistir.
async function buscarPagamentoAprovado() {
    for (let tentativa = 0; tentativa < 4; tentativa++) {
        const { data: pagamento } = await supabase
            .from("pagamentos")
            .select("metodo, forma_pagamento, valor, atualizado_em")
            .eq("pedido_id", idPedido)
            .eq("status", "aprovado")
            .order("atualizado_em", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (pagamento) { return pagamento; }
        await esperar(1500);
    }
    return null;
}

function baixarComprovante(pagamento) {
    const numero = String(idPedido).slice(0, 8);
    const data = new Date(pagamento.atualizado_em).toLocaleString("pt-BR");
    const forma = pagamento.metodo || pagamento.forma_pagamento || "";

    const html =
        '<!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8">' +
        "<title>Comprovante " + escapar(numero) + "</title>" +
        "<style>body{font-family:Arial,sans-serif;max-width:480px;margin:40px auto;color:#222}" +
        "h1{font-size:20px;border-bottom:2px solid #d4a63a;padding-bottom:8px}" +
        "td{padding:6px 0}td:last-child{text-align:right;font-weight:bold}</style></head><body>" +
        "<h1>Income of Houses - Comprovante de Pagamento</h1><table>" +
        "<tr><td>Pedido</td><td>#" + escapar(numero) + "</td></tr>" +
        "<tr><td>Forma de pagamento</td><td>" + escapar(forma) + "</td></tr>" +
        "<tr><td>Data</td><td>" + escapar(data) + "</td></tr>" +
        "<tr><td>Valor pago</td><td>" + escapar(moeda(pagamento.valor)) + "</td></tr>" +
        "<tr><td>Status</td><td>Aprovado</td></tr></table></body></html>";

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "comprovante-" + numero + ".html";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
}

async function iniciar() {
    if (!idPedido) { window.location.replace(PAGINA_INICIO); return; }

    const { data: sessao } = await supabase.auth.getSession();
    if (!sessao.session) { window.location.replace(PAGINA_LOGIN); return; }

    const pagamento = await buscarPagamentoAprovado();

    if (!pagamento) {
        // não há pagamento aprovado para este pedido
        window.location.replace(PAGINA_DETALHES + "?id=" + encodeURIComponent(idPedido));
        return;
    }

    document.getElementById("numeroPedido").textContent =
        "Pedido #" + String(idPedido).slice(0, 8) + " · " + moeda(pagamento.valor);

    const linkPedido = document.getElementById("linkPedido");
    if (linkPedido) {
        linkPedido.href = PAGINA_DETALHES + "?id=" + encodeURIComponent(idPedido);
    }

    const botao = document.getElementById("btnBaixar");
    if (botao) {
        botao.disabled = false;
        botao.addEventListener("click", function () { baixarComprovante(pagamento); });
    }
}

iniciar();