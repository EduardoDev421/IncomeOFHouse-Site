import { supabase } from "./lib/supabaseClient.js";

const TABELA = "plantas";
const COLUNA_DONO = "profissional_id";
const PAGINA_LOGIN = "./Login.html";
// Página do profissional (avaliações + projeto publicado). A página pública é DetalhePlanta.html.
const PAGINA_DETALHE = "./DetalheProjeto.html";


/* =========================================================
   APAGAR PLANTA (confirmação + exclusão no Supabase)
========================================================= */

const TABELA_APAGAR = "plantas";
const DONO_APAGAR = "profissional_id";

function injetarEstilosApagar() {
    if (document.getElementById("apagar-estilos")) return;

    const estilo = document.createElement("style");
    estilo.id = "apagar-estilos";
    estilo.textContent = `
.apagar-fundo{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.7);backdrop-filter:blur(2px);animation:apagar-fade .18s ease}
.apagar-caixa{width:100%;max-width:420px;background:#161616;color:#f2f2f2;border:1px solid #6b3a3a;border-radius:16px;padding:28px 24px 22px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.6);animation:apagar-subir .2s ease;font-family:inherit}
.apagar-icone{width:56px;height:56px;margin:0 auto 14px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;background:rgba(248,113,113,.15);color:#f87171;border:2px solid #f87171}
.apagar-caixa h3{margin:0 0 8px;font-size:20px;color:#fff}
.apagar-caixa p{margin:0 0 22px;font-size:15px;line-height:1.5;color:#cfcfcf;overflow-wrap:anywhere}
.apagar-caixa p.apagar-erro{color:#f87171;font-size:14px}
.apagar-acoes{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.apagar-botao{flex:1 1 140px;padding:11px 18px;border-radius:10px;border:1px solid #d4af6a;background:transparent;color:#d4af6a;font-weight:600;font-size:15px;cursor:pointer;font-family:inherit}
.apagar-botao.perigo{background:#c0392b;border-color:#c0392b;color:#fff}
.apagar-botao.perigo:hover:not(:disabled){background:#d9453a}
.apagar-botao:disabled{opacity:.6;cursor:not-allowed}
.apagar-botao:focus-visible{outline:2px solid #fff;outline-offset:2px}
@keyframes apagar-fade{from{opacity:0}to{opacity:1}}
@keyframes apagar-subir{from{transform:translateY(12px);opacity:0}to{transform:none;opacity:1}}
`;
    document.head.appendChild(estilo);
}

function textoErroApagar(erro) {
    const m = String(erro?.message || "");
    const baixo = m.toLowerCase();

    if (erro?.code === "23503" || baixo.includes("foreign key")) {
        return "Esta planta tem avaliações, comentários ou outros registros ligados a ela e o banco não permite apagar. Veja o SQL no fim deste arquivo.";
    }
    if (baixo.includes("row-level security") || baixo.includes("permission denied")) {
        return "Sem permissão para apagar. Falta a regra de DELETE no Supabase (veja o SQL no fim do arquivo).";
    }
    if (baixo.includes("failed to fetch")) return "Sem conexão com o servidor.";
    return m || "Erro desconhecido.";
}

async function excluirPlanta(id) {
    const { data: { session }, error: erroSessao } = await supabase.auth.getSession();
    if (erroSessao) throw erroSessao;
    if (!session) throw new Error("Você precisa entrar na sua conta para apagar a planta.");

    const { data, error } = await supabase.from(TABELA_APAGAR)
        .delete()
        .eq("id", id)
        .eq(DONO_APAGAR, session.user.id)
        .select("id");

    if (error) throw error;

    if (!data || !data.length) {
        throw new Error("Nada foi apagado. A planta não é sua ou falta a regra de DELETE no Supabase (veja o SQL no fim do arquivo).");
    }
}

function apagarPlanta({ id, titulo, aoApagar }) {
    injetarEstilosApagar();
    document.querySelector(".apagar-fundo")?.remove();

    const anterior = document.activeElement;

    const fundo = document.createElement("div");
    fundo.className = "apagar-fundo";

    const caixa = document.createElement("div");
    caixa.className = "apagar-caixa";
    caixa.setAttribute("role", "alertdialog");
    caixa.setAttribute("aria-modal", "true");
    caixa.setAttribute("aria-labelledby", "apagar-titulo");

    const icone = document.createElement("div");
    icone.className = "apagar-icone";
    icone.setAttribute("aria-hidden", "true");
    icone.textContent = "!";

    const h3 = document.createElement("h3");
    h3.id = "apagar-titulo";
    h3.textContent = "Apagar planta?";

    const texto = document.createElement("p");
    texto.textContent = `"${titulo || "Esta planta"}" será apagada de forma permanente, junto com o que estiver ligado a ela. Essa ação não pode ser desfeita.`;

    const acoes = document.createElement("div");
    acoes.className = "apagar-acoes";

    const cancelar = document.createElement("button");
    cancelar.type = "button";
    cancelar.className = "apagar-botao";
    cancelar.textContent = "Cancelar";

    const confirmar = document.createElement("button");
    confirmar.type = "button";
    confirmar.className = "apagar-botao perigo";
    confirmar.textContent = "Apagar";

    acoes.append(cancelar, confirmar);
    caixa.append(icone, h3, texto, acoes);
    fundo.appendChild(caixa);
    document.body.appendChild(fundo);

    let ocupado = false;

    function fechar() {
        document.removeEventListener("keydown", aoTeclar);
        fundo.remove();
        if (anterior && anterior.focus) anterior.focus();
    }

    function aoTeclar(evento) {
        if (evento.key === "Escape" && !ocupado) fechar();
    }

    cancelar.addEventListener("click", fechar);
    fundo.addEventListener("click", (e) => { if (e.target === fundo && !ocupado) fechar(); });
    document.addEventListener("keydown", aoTeclar);

    confirmar.addEventListener("click", async () => {
        ocupado = true;
        confirmar.disabled = true;
        cancelar.disabled = true;
        confirmar.textContent = "Apagando...";
        texto.className = "";

        try {
            await excluirPlanta(id);
            fechar();
            if (aoApagar) aoApagar();
        } catch (erro) {
            console.error("[Apagar planta]", erro);
            ocupado = false;
            confirmar.disabled = false;
            cancelar.disabled = false;
            confirmar.textContent = "Tentar de novo";
            texto.className = "apagar-erro";
            texto.textContent = textoErroApagar(erro);
        }
    });

    cancelar.focus();
}

const $ = (id) => document.getElementById(id);

const esc = (t) =>
    String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const STATUS = {
    publicada: { rotulo: "Publicada", classe: "concluido" },
    rascunho: { rotulo: "Rascunho", classe: "andamento" },
    inativa: { rotulo: "Inativa", classe: "cancelado" }
};

const ICONE = '<svg viewBox="0 0 24 24"><path d="M5 20V8l7-5 7 5v12"></path><path d="M9 20v-6h6v6"></path><path d="M8 9h1M15 9h1M8 12h1M15 12h1"></path></svg>';

const ICONE_LIXEIRA = '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"></path></svg>';

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
                    <button type="button" class="btn-apagar" data-apagar="${esc(p.id)}" data-nome="${esc(p.nome)}">
                        ${ICONE_LIXEIRA}<span>Apagar</span>
                    </button>
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

    // Apagar planta (confirmação + exclusão no Supabase)
    $("grade").addEventListener("click", (e) => {
        const botao = e.target.closest(".btn-apagar");
        if (!botao) return;

        const id = botao.dataset.apagar;

        apagarPlanta({
            id,
            titulo: botao.dataset.nome,
            aoApagar: () => {
                plantas = plantas.filter((p) => String(p.id) !== String(id));
                render();
            }
        });
    });
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