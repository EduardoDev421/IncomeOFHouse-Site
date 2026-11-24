// Front-End/js/MeusPedidos.js
// Carregado como módulo: <script type="module" src="../js/MeusPedidos.js"></script>
import { supabase } from "./lib/supabaseClient.js";

/* ---------- Configuração ---------- */
const POR_PAGINA = 5;
const PAGINA_DETALHES = "./DetalhesPedidos.html";
const PAGINA_CHECKOUT = "./Pagamentos/Checkout.html";

// Nomes de colunas ligando as tabelas. Se alguma for diferente no seu banco, troque só aqui.
const COL = {
    pedidoUsuario: "usuario_id",       // pedidos
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
    pagStatus: ["status"]
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

const unicos = (itens) => [...new Set(itens.filter((x) => x !== null && x !== undefined && x !== ""))];

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
    if (!lote.length) return;

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
                especialidade: primeiro(prof, CAND.profEspecialidade)
            };
        });

        const principal = pedido.itens[0];
        pedido.titulo = principal?.titulo
            ? principal.titulo + (pedido.itens.length > 1 ? ` e mais ${pedido.itens.length - 1}` : "")
            : `Pedido #${String(pedido.id).slice(0, 8)}`;
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
    const urlDetalhes = `${PAGINA_DETALHES}?id=${encodeURIComponent(p.id)}`;
    const urlCheckout = `${PAGINA_CHECKOUT}?pedido=${encodeURIComponent(p.id)}`;

    // Pedido aguardando: o botão principal é "Pagar agora"; o título continua levando aos detalhes.
    const botao = p.grupo === "aguardando"
        ? `<a href="${urlCheckout}" class="btn-detalhes">Pagar agora</a>`
        : `<a href="${urlDetalhes}" class="btn-detalhes">Ver detalhes</a>`;

    return `
        <article class="pedido" data-status="${p.grupo}" data-id="${esc(p.id)}">
            <div class="icone-pedido">
                <svg viewBox="0 0 24 24"><path d="M5 20V8l7-5 7 5v12"></path><path d="M9 20v-6h6v6"></path></svg>
            </div>
            <div class="info-principal">
                <h3><a href="${urlDetalhes}" style="color:inherit;text-decoration:none">${esc(p.titulo)}</a></h3>
                <p class="profissional">Profissional: ${esc(p.profissional)}${p.especialidade ? ` <small>${esc(p.especialidade)}</small>` : ""}</p>
            </div>
            <div class="info-detalhe"><small>Pedido em</small><span>${dataBR(p.criado_em)}</span></div>
            <div class="info-detalhe"><small>Valor</small><span>${moeda(p.total)}</span></div>
            <span class="status ${CLASSE_STATUS[p.grupo]}">${ROTULOS[p.grupo]}</span>
            ${botao}
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