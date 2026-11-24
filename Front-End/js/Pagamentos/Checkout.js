// =========================================================
// CHECKOUT (pagamento real: Supabase + Mercado Pago)
//
// Uso: Checkout.html?pedido=<id do pedido>   (o botão "Pagar" do DetalhesPedidos leva para cá)
//
// - Carrega o pedido do usuário logado e mostra o valor (pedidos.total)
// - "Finalizar Compra" chama a Edge Function "criar-pagamento"
//     Pix            -> pop-up Pendente com QR Code + copia e cola
//     Cartão/Boleto  -> redireciona para o checkout do Mercado Pago
// - O status é lido da tabela `pagamentos` (quem atualiza é o webhook)
// =========================================================
import { supabase } from "../lib/supabaseClient.js";

const PAGINA_LOGIN = "../Login.html";
const PAGINA_APROVADO = "./PagAprovado.html";
const PAGINA_DETALHES = "../DetalhesPedidos.html";
const CHAVE_SALVO = "checkoutPagamentoAtual";

const parametros = new URLSearchParams(window.location.search);

const pedido = {
    id: parametros.get("pedido"),
    valorPlanta: 0,
    desconto: 0
};

// ---------------------------------------------------------
// Utilitários
// ---------------------------------------------------------

function formatarMoeda(valor) {
    return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcularTotal() {
    return Math.max(pedido.valorPlanta - pedido.desconto, 0);
}

function normalizar(t) {
    return String(t == null ? "" : t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function formaSelecionada() {
    const marcada = document.querySelector('input[name="pagamento"]:checked');
    return marcada ? marcada.value : null;
}

function atualizarValores() {
    document.getElementById("valorPlanta").textContent = formatarMoeda(pedido.valorPlanta);
    document.getElementById("valorDesconto").textContent = "- " + formatarMoeda(pedido.desconto);
    document.getElementById("valorTotal").textContent = formatarMoeda(calcularTotal());
}

function destinoAprovado(id) {
    return PAGINA_APROVADO + "?pedido=" + encodeURIComponent(id);
}

function guardar(dados) {
    try { sessionStorage.setItem(CHAVE_SALVO, JSON.stringify(dados)); } catch (e) { /* segue sem guardar */ }
}

function lerSalvo() {
    try { return JSON.parse(sessionStorage.getItem(CHAVE_SALVO)); } catch (e) { return null; }
}

function limparSalvo() {
    try { sessionStorage.removeItem(CHAVE_SALVO); } catch (e) { /* ignora */ }
}

function reabilitarBotao() {
    limparSalvo();
    const botao = document.getElementById("btnFinalizar");
    if (botao) { botao.disabled = false; }
}

function avisoPagina(texto) {
    const subtitulo = document.querySelector(".conteudo h4");
    if (subtitulo) { subtitulo.textContent = texto; }
    const botao = document.getElementById("btnFinalizar");
    if (botao) { botao.disabled = true; }
}

async function lerErro(erro) {
    try {
        if (erro && erro.context && typeof erro.context.json === "function") {
            const corpo = await erro.context.json();
            if (corpo && corpo.erro) { return corpo.erro; }
        }
    } catch (e) { /* usa a mensagem padrão */ }
    return "Não foi possível iniciar o pagamento. Tente novamente.";
}

// ---------------------------------------------------------
// Pedido (somente exibição; o servidor revalida tudo)
// ---------------------------------------------------------

async function carregarPedido(usuarioId) {
    if (!pedido.id) { return "nenhum"; }

    const { data, error } = await supabase
        .from("pedidos").select("*").eq("id", pedido.id).eq("usuario_id", usuarioId).maybeSingle();

    if (error || !data) { return "nenhum"; }

    const st = normalizar(data.status);
    if (/pago|conclu|finaliz|entreg|andamento/.test(st)) { return "pago"; }
    if (/cancel/.test(st)) { return "cancelado"; }

    pedido.valorPlanta = Number(data.total) || 0;

    // planta do primeiro item (só para mostrar nome, descrição e imagem)
    const { data: itens } = await supabase
        .from("itens_pedido").select("*").eq("pedido_id", pedido.id).limit(1);
    const plantaId = itens && itens[0] ? itens[0].planta_id : null;

    if (plantaId) {
        const { data: planta } = await supabase.from("plantas").select("*").eq("id", plantaId).maybeSingle();
        if (planta) {
            const titulo = planta.titulo || planta.nome;
            const imagem = planta.imagem_url || planta.imagem || planta.foto_url;
            const nomeEl = document.querySelector(".ItemPedidoText h3");
            const descEl = document.querySelector(".ItemPedidoText p");
            const imgEl = document.querySelector(".ItemPedido img");
            if (nomeEl && titulo) { nomeEl.textContent = titulo; }
            if (descEl && planta.descricao) { descEl.textContent = planta.descricao; }
            if (imgEl && imagem) { imgEl.src = imagem; imgEl.alt = titulo || ""; }
        }
    } else {
        const nomeEl = document.querySelector(".ItemPedidoText h3");
        if (nomeEl) { nomeEl.textContent = "Pedido #" + String(pedido.id).slice(0, 8); }
    }

    return "ok";
}

// ---------------------------------------------------------
// Status (lido da tabela pagamentos; o webhook é quem atualiza)
// ---------------------------------------------------------

async function consultarPagamento(pagamentoId) {
    const { data, error } = await supabase
        .from("pagamentos").select("status, valor").eq("id", pagamentoId).single();

    if (error) { throw error; }

    let status = "pendente";
    if (data.status === "aprovado") { status = "aprovado"; }
    if (data.status === "recusado" || data.status === "cancelado") { status = "recusado"; }

    return { status: status, valor: data.valor };
}

async function consultarStatus(pagamentoId) {
    const r = await consultarPagamento(pagamentoId);
    return r.status;
}

// ---------------------------------------------------------
// Pop-up
// ---------------------------------------------------------

function mostrarPendente(d) {
    StatusPagamento.mostrar("pendente", {
        numero: d.numero,
        valor: d.valor,
        pix: d.pix || null,
        destinoAprovado: destinoAprovado(pedido.id),
        consultar: function () { return consultarStatus(d.pagamentoId); },
        aoTentarNovamente: reabilitarBotao
    });
}

// ---------------------------------------------------------
// Finalização da compra
// ---------------------------------------------------------

async function finalizarCompra() {
    const forma = formaSelecionada();
    const botao = document.getElementById("btnFinalizar");

    if (!forma) {
        alert("Escolha uma forma de pagamento para continuar.");
        return;
    }
    if (!botao || botao.disabled) { return; }

    botao.disabled = true;

    try {
        const { data, error } = await supabase.functions.invoke("criar-pagamento", {
            body: { pedido_id: pedido.id, forma: forma }
        });

        if (error) { throw error; }

        const dados = {
            pagamentoId: data.pagamento_id,
            numero: data.numero,
            valor: formatarMoeda(data.valor),
            pix: data.pix || null
        };
        guardar(dados);

        if (forma === "pix") {
            mostrarPendente(dados);
        } else {
            window.location.href = data.checkout_url; // página do Mercado Pago
        }
    } catch (erro) {
        console.error("Erro ao criar pagamento:", erro);
        alert(await lerErro(erro));
        botao.disabled = false;
    }
}

// ---------------------------------------------------------
// Retomada: recarregou a página ou voltou do Mercado Pago
// ---------------------------------------------------------

async function retomarSePreciso() {
    const salvo = lerSalvo();
    const id = parametros.get("pagamento") || (salvo && salvo.pagamentoId);
    if (!id) { return; }

    let resultado;
    try {
        resultado = await consultarPagamento(id);
    } catch (e) {
        return;
    }

    const dados = (salvo && salvo.pagamentoId === id)
        ? salvo
        : {
            pagamentoId: id,
            numero: String(pedido.id || "").slice(0, 8),
            valor: formatarMoeda(resultado.valor)
        };

    if (resultado.status === "aprovado") {
        limparSalvo();
        window.location.href = destinoAprovado(pedido.id);
        return;
    }

    if (resultado.status === "recusado") {
        limparSalvo();
        if (parametros.get("retorno")) {
            StatusPagamento.mostrar("recusado", {
                numero: dados.numero,
                valor: dados.valor,
                aoTentarNovamente: reabilitarBotao
            });
        }
        return;
    }

    const botao = document.getElementById("btnFinalizar");
    if (botao) { botao.disabled = true; }
    mostrarPendente(dados);
}

// ---------------------------------------------------------
// Inicialização (módulos já rodam com o HTML carregado)
// ---------------------------------------------------------

async function iniciar() {
    const { data: sessao } = await supabase.auth.getSession();
    if (!sessao.session) {
        window.location.replace(PAGINA_LOGIN);
        return;
    }

    const botao = document.getElementById("btnFinalizar");
    if (botao) { botao.addEventListener("click", finalizarCompra); }

    const situacao = await carregarPedido(sessao.session.user.id);
    atualizarValores();

    if (situacao === "pago") {
        window.location.replace(PAGINA_DETALHES + "?id=" + encodeURIComponent(pedido.id));
        return;
    }
    if (situacao === "cancelado") {
        avisoPagina("Este pedido foi cancelado e não pode ser pago.");
        return;
    }
    if (situacao === "nenhum") {
        avisoPagina("Pedido não encontrado. Volte para Meus Pedidos e escolha o pedido a pagar.");
        await retomarSePreciso();
        return;
    }

    await retomarSePreciso();
}

iniciar();