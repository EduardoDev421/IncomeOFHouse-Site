import { supabase } from "./lib/supabaseClient.js";

const TABELA = "plantas";
const COLUNA_DONO = "profissional_id";
const PAGINA_LOGIN = "./Login.html";
// Página do profissional (avaliações + projeto publicado). A página pública é DetalhePlanta.html.
const PAGINA_DETALHE = "./DetalheProjeto.html";

const $ = (id) => document.getElementById(id);

const esc = (t) =>
    String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const STATUS = {
    publicada: { rotulo: "Publicada", classe: "concluido" },
    rascunho: { rotulo: "Rascunho", classe: "andamento" },
    inativa: { rotulo: "Inativa", classe: "cancelado" }
};

const ICONE = '<svg viewBox="0 0 24 24"><path d="M5 20V8l7-5 7 5v12"></path><path d="M9 20v-6h6v6"></path><path d="M8 9h1M15 9h1M8 12h1M15 12h1"></path></svg>';

let plantas = [];
let filtroStatus = "todos";
let filtroTipo = "todos";
let ordem = "recentes";
let termo = "";

const dataBR = (s) => (s ? s.split("-").reverse().join("/") : "");
const moeda = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function normalizarStatus(valor) {
    const s = String(valor || "publicada").toLowerCase();
    if (["rascunho", "draft", "pendente", "em_analise", "analise"].includes(s)) return "rascunho";
    if (["inativa", "inativo", "arquivada", "cancelada", "removida"].includes(s)) return "inativa";
    return "publicada";
}

function doBanco(p) {
    return {
        id: p.id,
        nome: p.titulo ?? p.nome ?? "Sem título",
        tipo: p.tipo ?? p.categoria ?? "Sem tipo",
        status: p.ativa === false ? "inativa" : normalizarStatus(p.status),
        data: String(p.criado_em ?? p.created_at ?? "").slice(0, 10),
        valor: Number(p.preco ?? p.valor ?? 0) || 0,
        area: Number(p.area ?? p.area_total ?? 0) || 0,
        quartos: Number(p.quartos ?? 0) || 0,
        banheiros: Number(p.banheiros ?? 0) || 0,
        foto: p.foto_url ?? p.imagem_url ?? p.capa_url ?? p.foto ?? ""
    };
}

function mostrarMensagem(html, classe = "aviso-js") {
    $("grade").innerHTML = `<p class="${classe}">${html}</p>`;
}

function filtrados() {
    const l = plantas.filter((p) =>
        (filtroStatus === "todos" || p.status === filtroStatus) &&
        (filtroTipo === "todos" || p.tipo === filtroTipo) &&
        p.nome.toLowerCase().includes(termo));

    const cmp = {
        recentes: (a, b) => b.data.localeCompare(a.data),
        antigos: (a, b) => a.data.localeCompare(b.data),
        valor: (a, b) => b.valor - a.valor,
        nome: (a, b) => a.nome.localeCompare(b.nome, "pt-BR")
    }[ordem];

    return l.sort(cmp);
}

function renderResumo() {
    const publicadas = plantas.filter((p) => p.status === "publicada");
    $("resTotal").textContent = plantas.length;
    $("resConc").textContent = publicadas.length;
    $("resAnd").textContent = plantas.filter((p) => p.status === "rascunho").length;
    $("resValor").textContent = moeda(publicadas.reduce((s, p) => s + p.valor, 0));
}

function renderTipos() {
    const tipos = [...new Set(plantas.map((p) => p.tipo))].sort();
    $("selTipo").innerHTML = '<option value="todos">Todos os tipos</option>' +
        tipos.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("");
}

function renderCard(p) {
    const st = STATUS[p.status];
    return `
        <article class="projeto">
            <div class="thumb">
                ${p.foto ? `<img src="${esc(p.foto)}" alt="${esc(p.nome)}" onerror="this.remove()">` : ""}
                ${ICONE}
                <span class="status ${st.classe}">${st.rotulo}</span>
            </div>
            <div class="corpo">
                <h3>${esc(p.nome)}</h3>
                <span class="cliente">${p.data ? `Publicada em ${dataBR(p.data)}` : "Data não informada"}</span>
                <span class="tag">${esc(p.tipo)}</span>
                <div class="meta">
                    <div><small>Área</small><span>${p.area ? p.area + " m²" : "—"}</span></div>
                    <div><small>Quartos</small><span>${p.quartos || "—"}</span></div>
                    <div><small>Banheiros</small><span>${p.banheiros || "—"}</span></div>
                    <div><small>Valor</small><span>${p.valor ? moeda(p.valor) : "—"}</span></div>
                </div>
                <div class="rodape-card">
                    <span class="nota sem">${st.rotulo}</span>
                    <a href="${PAGINA_DETALHE}?id=${encodeURIComponent(p.id)}" class="btn-detalhes">Ver detalhes</a>
                </div>
            </div>
        </article>`;
}

function renderLista() {
    if (!plantas.length) {
        $("contagem").textContent = "";
        mostrarMensagem('Você ainda não publicou nenhuma planta. <a href="./publicarPlanta.html">Publicar planta</a>', "vazio");
        return;
    }

    const l = filtrados();
    $("contagem").textContent = `Mostrando ${l.length} de ${plantas.length} plantas`;
    $("grade").innerHTML = l.length
        ? l.map(renderCard).join("")
        : '<div class="vazio">Nenhuma planta encontrada com esses filtros.</div>';
}

function render() {
    renderResumo();
    renderTipos();
    renderLista();
}

function textoErro(erro) {
    const m = String(erro?.message || "").toLowerCase();
    if (m.includes("does not exist") && m.includes(COLUNA_DONO)) return `A coluna ${COLUNA_DONO} não existe na tabela ${TABELA}. Ajuste COLUNA_DONO no topo do Projetos.js.`;
    if (m.includes("does not exist") || m.includes("schema cache")) return `A tabela ${TABELA} não foi encontrada no Supabase.`;
    if (m.includes("row-level security") || m.includes("permission denied")) return "Sem permissão para ler as plantas.";
    if (m.includes("failed to fetch")) return "Sem conexão com o servidor. Tente novamente.";
    return erro?.message || "Erro ao carregar as plantas.";
}

function ligarEventos() {
    $("chips").addEventListener("click", (e) => {
        const b = e.target.closest(".chip");
        if (!b) return;
        document.querySelectorAll(".chip").forEach((c) => c.classList.remove("ativo"));
        b.classList.add("ativo");
        filtroStatus = b.dataset.status;
        renderLista();
    });

    $("selTipo").onchange = (e) => { filtroTipo = e.target.value; renderLista(); };
    $("selOrdem").onchange = (e) => { ordem = e.target.value; renderLista(); };
    $("busca").addEventListener("input", (e) => { termo = e.target.value.trim().toLowerCase(); renderLista(); });
}

async function iniciar() {
    ligarEventos();
    mostrarMensagem("Carregando plantas...", "vazio");

    try {
        const { data: { session }, error: erroSessao } = await supabase.auth.getSession();
        if (erroSessao) throw erroSessao;

        if (!session) {
            mostrarMensagem(`Você precisa entrar na sua conta para ver suas plantas. <a href="${PAGINA_LOGIN}">Ir para o login</a>`);
            return;
        }

        const { data, error } = await supabase
            .from(TABELA)
            .select("*")
            .eq(COLUNA_DONO, session.user.id);

        if (error) throw error;

        plantas = (data || []).map(doBanco);
        render();
    } catch (erro) {
        console.error("[Projetos]", erro);
        mostrarMensagem(esc(textoErro(erro)));
    }
}

iniciar();