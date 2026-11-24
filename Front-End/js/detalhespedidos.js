// Front-End/js/DetalhesPedidos.js
// Carregado como módulo: <script type="module" src="../js/DetalhesPedidos.js"></script>
//
// Pagamento: o botão "Pagar" leva para Pagamentos/Checkout.html?pedido=<id>.
// Quem confirma o pagamento é o servidor (webhook do Mercado Pago); o navegador
// não marca mais o pedido como pago.
import { supabase } from "./lib/supabaseClient.js";

const idPedido = new URLSearchParams(location.search).get("id");
const PAGINA_CHECKOUT = "./Pagamentos/Checkout.html";
const PAGINA_COMPROVANTE = "./Pagamentos/PagAprovado.html";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const norm = (t) => String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const primeiro = (o, chaves) => {
    const c = chaves.find((k) => o && o[k] !== undefined && o[k] !== null && o[k] !== "");
    return c ? o[c] : "";
};

const moeda = (v) =>
    Number.isFinite(Number(v))
        ? Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "—";

const dataBR = (v) => {
    const d = v ? new Date(v) : null;
    return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("pt-BR") : "—";
};

const ROTULOS = { aguardando: "Aguardando pagamento", pago: "Pago", concluido: "Concluído", cancelado: "Cancelado" };
const CLASSES = { aguardando: "andamento", pago: "concluido", concluido: "concluido", cancelado: "cancelado" };

async function buscar(tabela, coluna, valor) {
    try {
        const { data, error } = await supabase.from(tabela).select("*").eq(coluna, valor);
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.warn(`[Pedido] ${tabela}:`, e.message || e);
        return [];
    }
}

const pagamentoAprovado = (pagamentos) =>
    pagamentos.find((g) => /aprovad|pago|paid|confirmad/.test(norm(g.status)));

function estado(pedido, pagamentos) {
    const st = norm(pedido.status);
    const NAO = /nao pag|pendente|aguard|pending|recus|falh/;

    if (/cancel|estorn|reembols/.test(st)) return "cancelado";
    if (/conclu|finaliz|entreg/.test(st)) return "concluido";
    if (!NAO.test(st) && /pago|paid|aprovad|andamento|execu/.test(st)) return "pago";
    if (pagamentoAprovado(pagamentos)) return "pago";

    return "aguardando";
}

function aviso(texto) {
    const c = $(".conteudo");
    if (c) c.innerHTML = `<p style="padding:24px">${texto} <a href="./MeusPedidos.html">Voltar aos pedidos</a></p>`;
}

function linhaTempo(est, pedido) {
    const etapas = [
        ["Pedido solicitado", "Seu pedido foi recebido com sucesso.", dataBR(pedido.criado_em)],
        ["Pagamento", "Confirmação do pagamento do projeto.", ""],
        ["Em desenvolvimento", "O profissional está elaborando o projeto.", ""],
        ["Entrega do projeto", "Os arquivos finais serão disponibilizados.", ""]
    ];
    const feitas = { aguardando: 1, pago: 2, concluido: 4, cancelado: 1 }[est];

    $(".linha-tempo").replaceChildren(...etapas.map(([titulo, descricao, hora], i) => {
        const li = document.createElement("li");
        li.className = "etapa" + (i < feitas ? " feita" : i === feitas && est !== "cancelado" ? " atual" : "");

        const h3 = document.createElement("h3");
        h3.textContent = titulo;
        const p = document.createElement("p");
        p.textContent = descricao;
        li.append(h3, p);

        if (hora) {
            const t = document.createElement("time");
            t.textContent = hora;
            li.append(t);
        }
        return li;
    }));
}

function cartaoPagamento(est, pedido, pagamentos) {
    const art = document.createElement("article");
    art.className = "cartao";
    art.innerHTML = '<h2 class="cartao-titulo">Pagamento</h2>';

    const corpo = document.createElement("div");
    corpo.style.cssText = "display:flex;flex-direction:column;gap:12px";

    if (est === "pago" || est === "concluido") {
        const g = pagamentoAprovado(pagamentos);
        const metodo = g ? primeiro(g, ["metodo", "forma_pagamento"]) : "";
        corpo.textContent = `Pagamento confirmado${metodo ? " via " + metodo : ""}.`;
    } else if (est === "cancelado") {
        corpo.textContent = "Este pedido foi cancelado.";
    } else {
        const dica = document.createElement("small");
        dica.textContent = "Na próxima tela você escolhe Pix, cartão de crédito ou boleto.";

        const link = document.createElement("a");
        link.className = "btn btn-principal";
        link.href = `${PAGINA_CHECKOUT}?pedido=${encodeURIComponent(pedido.id)}`;
        link.textContent = `Pagar ${moeda(pedido.total)}`;

        corpo.append(dica, link);
    }

    art.append(corpo);
    return art;
}

async function iniciar() {
    if (!idPedido) return aviso("Pedido não informado.");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        location.replace("./Login.html");
        return;
    }

    const { data: pedido } = await supabase
        .from("pedidos")
        .select("*")
        .eq("id", idPedido)
        .eq("usuario_id", session.user.id)
        .maybeSingle();
    if (!pedido) return aviso("Pedido não encontrado.");

    const itens = await buscar("itens_pedido", "pedido_id", pedido.id);
    const item = itens[0];
    const planta = item?.planta_id ? (await buscar("plantas", "id", item.planta_id))[0] : null;
    const profId = item?.profissional_id || planta?.profissional_id;
    const prof = profId ? (await buscar("profissionais", "id", profId))[0] : null;
    const pagamentos = await buscar("pagamentos", "pedido_id", pedido.id);
    const est = estado(pedido, pagamentos);

    // topo
    $(".titulo-pedido h1").textContent = `Pedido #${String(pedido.id).slice(0, 8)}`;
    $(".titulo-pedido p").textContent = `Realizado em ${dataBR(pedido.criado_em)}`;
    const status = $(".titulo-pedido .status");
    status.className = `status ${CLASSES[est]}`;
    status.textContent = ROTULOS[est];

    // projeto
    if (planta) {
        const foto = primeiro(planta, ["imagem", "imagem_url", "foto_url", "capa"]);
        if (foto) $(".projeto-imagem img").src = foto;

        $(".projeto-info h2").textContent = primeiro(planta, ["titulo", "nome"]) || "Projeto";
        $(".projeto-info .descricao").textContent = planta.descricao || "";

        const num = (v, sufixo = "") => (v === "" ? "—" : `${v}${sufixo}`);
        const dd = $$(".dados .dado dd");
        [
            num(primeiro(planta, ["area"]), " m²"),
            num(primeiro(planta, ["quartos"])),
            num(primeiro(planta, ["banheiros"])),
            num(primeiro(planta, ["garagem", "garagens", "vagas"]))
        ].forEach((v, i) => { if (dd[i]) dd[i].textContent = v; });
    }

    linhaTempo(est, pedido);

    // profissional
    if (prof) {
        const nome = primeiro(prof, ["nome", "nome_completo"]) || "Profissional";
        $(".profissional-card .avatar").textContent = nome.charAt(0).toUpperCase();
        $(".profissional-dados h3").textContent = nome;
        $(".profissional-dados span").textContent =
            [primeiro(prof, ["profissao"]), prof.registro].filter(Boolean).join(" • ");

        const link = `./Mensagem.html?com=${encodeURIComponent(profId)}&nome=${encodeURIComponent(nome)}`;
        $$('.profissional-card a, .acoes a[href="./Mensagem.html"]').forEach((a) => { a.href = link; });
    }

    // resumo financeiro
    const aprovado = pagamentoAprovado(pagamentos);
    const linhas = $$(".resumo-linha");
    linhas[0].querySelector("strong").textContent = moeda(item?.preco ?? item?.valor ?? pedido.total);
    linhas[1].style.display = "none"; // não há taxa cadastrada no banco
    linhas[2].querySelector("strong").textContent =
        (aprovado && primeiro(aprovado, ["metodo", "forma_pagamento"])) || "A definir";
    linhas[3].querySelector("strong").textContent = moeda(pedido.total);

    // pagamento (leva para o Checkout; a confirmação vem do servidor)
    const lateral = $(".coluna-lateral");
    lateral.insertBefore(cartaoPagamento(est, pedido, pagamentos), lateral.children[1]);

    // comprovante: só existe depois de pago
    const comprovante = $$(".acoes a").find((a) => /comprovante/i.test(a.textContent));
    if (comprovante) {
        if (aprovado) {
            comprovante.href = `${PAGINA_COMPROVANTE}?pedido=${encodeURIComponent(pedido.id)}`;
        } else {
            comprovante.style.display = "none";
        }
    }

    // cancelar (só enquanto aguarda pagamento)
    const cancelar = $(".btn-perigo");
    if (est !== "aguardando") cancelar.style.display = "none";
    cancelar.addEventListener("click", async () => {
        if (!confirm("Deseja cancelar este pedido?")) return;
        const { error } = await supabase.from("pedidos").update({ status: "cancelado" }).eq("id", pedido.id);
        if (error) {
            console.error("[Pedido] cancelar:", error);
            alert("Não foi possível cancelar o pedido.");
            return;
        }
        location.reload();
    });
}

iniciar();