// Front-End/js/MeusPedidos.js
// Carregado como módulo: <script type="module" src="../js/MeusPedidos.js"></script>
import { supabase } from "./lib/supabaseClient.js";

/* ---------- Configuração ---------- */
const POR_PAGINA = 5;

// Nomes de colunas ligando as tabelas. Se alguma for diferente no seu banco, troque só aqui.
const COL = {
    pedidoUsuario: "usuario_id",       // pedidos
    pedidoEndereco: "endereco_id",     // pedidos
    itemPedido: "pedido_id",           // itens_pedido
    itemPlanta: "planta_id",           // itens_pedido
    itemProfissional: "profissional_id", // itens_pedido
    plantaProfissional: "profissional_id", // plantas
    pagamentoPedido: "pedido_id"       // pagamentos
};

// Colunas candidatas (usa a primeira que existir na linha devolvida pelo banco)
const CAND = {
    plantaTitulo: ["titulo", "nome", "nome_planta", "name"],
    profNome: ["nome", "nome_completo", "nome_fantasia", "razao_social"],
    profEspecialidade: ["especialidade", "profissao", "area_atuacao", "area", "categoria", "cargo"],
    itemValor: ["preco", "valor", "valor_unitario", "preco_unitario", "subtotal"],
    itemQtd: ["quantidade", "qtd"],
    pagMetodo: ["metodo", "forma_pagamento", "tipo", "meio_pagamento"],
    pagStatus: ["status"],
    pagValor: ["valor", "valor_pago", "total"],
    pagData: ["pago_em", "criado_em"]
};

// Estado geral do pedido = junção do status do pedido com o status do pagamento
const ROTULOS = { aguardando: "Aguardando pagamento", pago: "Pago", concluido: "Concluído", cancelado: "Cancelado" };
// Classe visual de cada estado (usa as cores que já existem no MeusPedidos.css)
const CLASSE_STATUS = { aguardando: "andamento", pago: "concluido", concluido: "concluido", cancelado: "cancelado" };

/* ---------- Estado ---------- */
let usuarioId = null;
let pedidos = [];
let filtroAtual = "todos";
let termoBusca = "";
let pagina = 1;

const $ = (id) => document.getElementById(id);
const lista = document.querySelector(".lista-pedidos");
const paginacao = document.querySelector(".paginacao");
const semPedidos = $("semPedidos");

/* ---------- Utilidades ---------- */
const esc = (t) =>
    String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const normalizar = (t) =>
    String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const primeiro = (obj, candidatos) => {
    if (!obj) return "";
    const chave = candidatos.find((c) => obj[c] !== undefined && obj[c] !== null && obj[c] !== "");
    return chave ? obj[chave] : "";
};

const moeda = (v) =>
    Number.isFinite(Number(v))
        ? Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "—";

function dataBR(v) {
    const d = v ? new Date(v) : null;
    return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("pt-BR") : "—";
}

// Estado geral do pedido: olha o status do pedido e o status dos pagamentos dele
function derivarEstado(pedido, pagamentos) {
    const st = normalizar(pedido.status);
    const statusPag = pagamentos.map((p) => normalizar(primeiro(p, CAND.pagStatus)));

    const NAO_PAGO = /nao pag|unpaid|pendente|aguard|pending|recus|falh|fail|aberto/;
    const PAGO = /pago|paid|aprovad|approved|confirmad|succe|receb|conclu/;
    const EM_EXECUCAO = /andamento|producao|execu/;

    if (/cancel|estorn|reembols|refund/.test(st)) return "cancelado";
    if (/conclu|finaliz|entreg|complet/.test(st)) return "concluido";
    if (!NAO_PAGO.test(st) && (PAGO.test(st) || EM_EXECUCAO.test(st))) return "pago";
    if (statusPag.some((s) => !NAO_PAGO.test(s) && PAGO.test(s))) return "pago";
    return "aguardando";
}

const unicos = (lista) => [...new Set(lista.filter((x) => x !== null && x !== undefined && x !== ""))];

// Traduz os erros do Supabase/Postgres. O texto original (em inglês) fica só no console.
function textoErro(erro) {
    const m = String(erro?.message || "").toLowerCase();
    if (erro?.code === "PGRST205" || m.includes("could not find the table"))
        return "Uma das tabelas de pedidos ainda não existe no Supabase.";
    if (m.includes("column") && (m.includes("does not exist") || m.includes("schema cache")))
        return "Alguma coluna usada nos pedidos não existe no Supabase. Confira os nomes no topo do MeusPedidos.js.";
    if (m.includes("row-level security") || m.includes("permission denied") || m.includes("not authorized"))
        return "Sem permissão para ver os pedidos.";
    if (m.includes("jwt") || m.includes("not authenticated"))
        return "Sua sessão expirou. Entre na sua conta novamente.";
    if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("load failed"))
        return "Sem conexão com o servidor. Tente novamente.";
    return "Não foi possível carregar os pedidos. Tente novamente.";
}

function avisoLista(texto, comLinkLogin = false) {
    paginacao.hidden = true;
    semPedidos.hidden = true;
    lista.innerHTML =
        `<p style="padding:24px 4px;opacity:.9">${esc(texto)}` +
        (comLinkLogin ? ' <a href="./Login.html" style="color:inherit;text-decoration:underline">Ir para o login</a>' : "") +
        "</p>";
}

/* ---------- Supabase ---------- */
// Consulta de apoio: se a tabela/coluna não bater, devolve vazio em vez de quebrar a página
async function consultaSegura(tabela, filtro) {
    try {
        const { data, error } = await filtro(supabase.from(tabela).select("*"));
        if (error) throw error;
        return data || [];
    } catch (erro) {
        console.warn(`[Pedidos] ${tabela}:`, erro?.message || erro);
        return [];
    }
}

async function enriquecer(lote) {
    const ids = lote.map((p) => p.id);
    const itens = await consultaSegura("itens_pedido", (q) => q.in(COL.itemPedido, ids));

    const plantaIds = unicos(itens.map((i) => i[COL.itemPlanta]));
    const plantas = plantaIds.length ? await consultaSegura("plantas", (q) => q.in("id", plantaIds)) : [];
    const plantaPorId = new Map(plantas.map((p) => [String(p.id), p]));

    const profIds = unicos([
        ...itens.map((i) => i[COL.itemProfissional]),
        ...plantas.map((p) => p[COL.plantaProfissional])
    ]);
    const profs = profIds.length ? await consultaSegura("profissionais", (q) => q.in("id", profIds)) : [];
    const profPorId = new Map(profs.map((p) => [String(p.id), p]));

    const pagamentos = await consultaSegura("pagamentos", (q) => q.in(COL.pagamentoPedido, ids));

    for (const pedido of lote) {
        const meus = itens.filter((i) => String(i[COL.itemPedido]) === String(pedido.id));

        pedido.itens = meus.map((item) => {
            const planta = plantaPorId.get(String(item[COL.itemPlanta]));
            const prof = profPorId.get(String(item[COL.itemProfissional] ?? planta?.[COL.plantaProfissional]));
            return {
                titulo: primeiro(planta, CAND.plantaTitulo) || primeiro(item, CAND.plantaTitulo),
                profissional: primeiro(prof, CAND.profNome),
                especialidade: primeiro(prof, CAND.profEspecialidade),
                valor: primeiro(item, CAND.itemValor),
                qtd: primeiro(item, CAND.itemQtd) || 1
            };
        });

        const principal = pedido.itens[0];
        pedido.titulo = principal?.titulo
            ? principal.titulo + (pedido.itens.length > 1 ? ` e mais ${pedido.itens.length - 1}` : "")
            : `Pedido #${pedido.id}`;
        pedido.profissional = principal?.profissional || "Profissional";
        pedido.especialidade = principal?.especialidade || "";
        pedido.pagamentos = pagamentos.filter((pg) => String(pg[COL.pagamentoPedido]) === String(pedido.id));
        pedido.grupo = derivarEstado(pedido, pedido.pagamentos);
        pedido.busca = normalizar(`${pedido.id} pedido ${pedido.titulo} ${pedido.profissional}`);
    }
}

async function carregar() {
    const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .eq(COL.pedidoUsuario, usuarioId)
        .order("criado_em", { ascending: false });
    if (error) throw error;

    pedidos = data || [];
    await enriquecer(pedidos);
    render();
}

/* ---------- Renderização ---------- */
function filtrados() {
    const termo = normalizar(termoBusca.trim());
    return pedidos.filter(
        (p) => (filtroAtual === "todos" || p.grupo === filtroAtual) && (!termo || p.busca.includes(termo))
    );
}

function renderCard(p) {
    return `
        <article class="pedido" data-status="${p.grupo}" data-id="${esc(p.id)}">
            <div class="icone-pedido">
                <svg viewBox="0 0 24 24"><path d="M5 20V8l7-5 7 5v12"></path><path d="M9 20v-6h6v6"></path></svg>
            </div>
            <div class="info-principal">
                <h3>${esc(p.titulo)}</h3>
                <p class="profissional">Profissional: ${esc(p.profissional)}${p.especialidade ? ` <small>${esc(p.especialidade)}</small>` : ""}</p>
            </div>
            <div class="info-detalhe"><small>Pedido em</small><span>${dataBR(p.criado_em)}</span></div>
            <div class="info-detalhe"><small>Valor</small><span>${moeda(p.total)}</span></div>
            <span class="status ${CLASSE_STATUS[p.grupo]}">${ROTULOS[p.grupo]}</span>
            <a href="#" class="btn-detalhes" data-acao="detalhes">Ver detalhes</a>
        </article>`;
}

function renderPaginacao(totalItens) {
    const total = Math.ceil(totalItens / POR_PAGINA);
    paginacao.hidden = total <= 1;
    if (total <= 1) return;

    const inicio = Math.max(1, Math.min(pagina - 2, total - 4));
    const fim = Math.min(total, inicio + 4);

    let html = `<button class="pagina seta" data-pag="${pagina - 1}" aria-label="Página anterior" ${pagina === 1 ? "disabled" : ""}>‹</button>`;
    for (let n = inicio; n <= fim; n++) {
        html += `<button class="pagina${n === pagina ? " selecionada" : ""}" data-pag="${n}">${n}</button>`;
    }
    html += `<button class="pagina seta" data-pag="${pagina + 1}" aria-label="Próxima página" ${pagina === total ? "disabled" : ""}>›</button>`;
    paginacao.innerHTML = html;
}

function render() {
    const todos = filtrados();
    const totalPaginas = Math.max(1, Math.ceil(todos.length / POR_PAGINA));
    if (pagina > totalPaginas) pagina = totalPaginas;

    const fatia = todos.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
    lista.innerHTML = fatia.map(renderCard).join("");

    const vazio = todos.length === 0;
    semPedidos.hidden = !vazio;
    if (vazio) {
        semPedidos.querySelector("h2").textContent = pedidos.length
            ? "Nenhum pedido encontrado"
            : "Você ainda não fez nenhum pedido";
    }
    renderPaginacao(todos.length);
}

/* ---------- Filtros, busca e paginação ---------- */
document.querySelectorAll(".filtro").forEach((botao) => {
    botao.addEventListener("click", () => {
        document.querySelectorAll(".filtro").forEach((b) => b.classList.remove("ativo"));
        botao.classList.add("ativo");
        filtroAtual = botao.dataset.filtro;
        pagina = 1;
        render();
    });
});

$("busca").addEventListener("input", (ev) => {
    termoBusca = ev.target.value;
    pagina = 1;
    render();
});

paginacao.addEventListener("click", (ev) => {
    const botao = ev.target.closest("[data-pag]");
    if (!botao || botao.disabled) return;
    pagina = Number(botao.dataset.pag);
    render();
    lista.scrollIntoView({ behavior: "smooth", block: "start" });
});

/* ---------- Detalhes do pedido (pop-up) ---------- */
const estilo = document.createElement("style");
estilo.textContent = `
.pedido-modal{border:1px solid rgba(212,169,58,.35);border-radius:16px;background:#161616;color:#f2f2f2;padding:0;width:min(580px,92vw);max-height:88vh;overflow:auto}
.pedido-modal::backdrop{background:rgba(0,0,0,.65)}
.pm-topo{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:20px 24px;border-bottom:1px solid rgba(255,255,255,.08)}
.pm-topo h2{margin:0;font-size:20px}
.pm-fechar{background:none;border:0;color:inherit;font-size:20px;cursor:pointer;opacity:.8}
.pm-corpo{padding:8px 24px 24px}
.pm-secao{padding:16px 0;border-bottom:1px solid rgba(255,255,255,.06)}
.pm-secao:last-child{border-bottom:0}
.pm-secao h3{margin:0 0 10px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#d4a93a}
.pm-linha{display:flex;justify-content:space-between;gap:16px;padding:4px 0;font-size:14px}
.pm-linha small{display:block;opacity:.65}
.pm-vazio{opacity:.7;font-size:14px;margin:0}
.pm-rodape{display:flex;justify-content:flex-end;padding:0 24px 20px}
.pm-rodape button{background:transparent;border:1px solid #d4a93a;color:#d4a93a;border-radius:10px;padding:8px 18px;cursor:pointer}
`;
document.head.append(estilo);

const modal = document.createElement("dialog");
modal.className = "pedido-modal";
document.body.append(modal);
modal.addEventListener("click", (ev) => {
    if (ev.target === modal || ev.target.closest("[data-fechar]")) modal.close();
});

function linha(rotulo, valor) {
    return `<div class="pm-linha"><span>${esc(rotulo)}</span><strong>${valor}</strong></div>`;
}

async function abrirDetalhes(pedido) {
    modal.innerHTML = `
        <div class="pm-topo">
            <h2>Pedido #${esc(pedido.id)}</h2>
            <button type="button" class="pm-fechar" data-fechar aria-label="Fechar">✕</button>
        </div>
        <div class="pm-corpo">
            <div class="pm-secao">
                <h3>Resumo</h3>
                ${linha("Status do pedido", `<span class="status ${CLASSE_STATUS[pedido.grupo]}">${ROTULOS[pedido.grupo]}</span>`)}
                ${linha("Data do pedido", esc(dataBR(pedido.criado_em)))}
                ${linha("Total", esc(moeda(pedido.total)))}
            </div>
            <div class="pm-secao">
                <h3>Itens</h3>
                ${pedido.itens.length
                    ? pedido.itens.map((i) =>
                        `<div class="pm-linha"><span>${esc(i.titulo || "Item")}` +
                        `${i.profissional ? `<small>${esc(i.profissional)}</small>` : ""}</span>` +
                        `<strong>${i.valor !== "" ? esc(moeda(i.valor)) : ""}${Number(i.qtd) > 1 ? ` × ${esc(i.qtd)}` : ""}</strong></div>`
                      ).join("")
                    : '<p class="pm-vazio">Nenhum item encontrado neste pedido.</p>'}
            </div>
            <div class="pm-secao" id="pmEndereco"><h3>Endereço</h3><p class="pm-vazio">Carregando...</p></div>
            <div class="pm-secao" id="pmPagamento"><h3>Pagamento</h3><p class="pm-vazio">Carregando...</p></div>
        </div>
        <div class="pm-rodape"><button type="button" data-fechar>Fechar</button></div>`;
    modal.showModal();

    // endereço e pagamento são buscados ao abrir
    const idEndereco = pedido[COL.pedidoEndereco];
    const enderecos = idEndereco
        ? await consultaSegura("enderecos", (q) => q.eq("id", idEndereco))
        : [];
    const e = enderecos[0];
    const boxEndereco = modal.querySelector("#pmEndereco");
    if (boxEndereco) {
        boxEndereco.innerHTML = "<h3>Endereço</h3>" + (e
            ? `<div class="pm-linha"><span>${esc(e.apelido || "Endereço")}<small>` +
              `${esc(e.rua)}, ${esc(e.numero)}${e.complemento ? " - " + esc(e.complemento) : ""}<br>` +
              `${esc(e.bairro)} · ${esc(e.cidade)} - ${esc(e.uf)}</small></span></div>`
            : '<p class="pm-vazio">Endereço não informado.</p>');
    }

    const pagamentos = pedido.pagamentos || [];
    const boxPagamento = modal.querySelector("#pmPagamento");
    if (boxPagamento) {
        boxPagamento.innerHTML = "<h3>Pagamento</h3>" + (pagamentos.length
            ? pagamentos.map((pg) => {
                const metodo = primeiro(pg, CAND.pagMetodo);
                const status = primeiro(pg, CAND.pagStatus);
                const valor = primeiro(pg, CAND.pagValor);
                const data = primeiro(pg, CAND.pagData);
                return `<div class="pm-linha"><span>${esc(metodo || "Pagamento")}` +
                    `<small>${esc(status)}${status && data ? " · " : ""}${data ? esc(dataBR(data)) : ""}</small></span>` +
                    `<strong>${valor !== "" ? esc(moeda(valor)) : ""}</strong></div>`;
              }).join("")
            : '<p class="pm-vazio">Nenhum pagamento registrado.</p>');
    }
}

lista.addEventListener("click", (ev) => {
    const botao = ev.target.closest('[data-acao="detalhes"]');
    if (!botao) return;
    ev.preventDefault();
    const id = botao.closest(".pedido").dataset.id;
    const pedido = pedidos.find((p) => String(p.id) === id);
    if (pedido) abrirDetalhes(pedido);
});

/* ---------- Iniciar ---------- */
async function iniciar() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!session) {
            avisoLista("Você precisa entrar na sua conta para ver seus pedidos.", true);
            return;
        }

        usuarioId = session.user.id;
        await carregar();
    } catch (erro) {
        console.error("[Pedidos]", erro);
        avisoLista(textoErro(erro));
    }
}

iniciar();  