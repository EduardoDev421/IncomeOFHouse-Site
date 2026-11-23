import { supabase } from "./lib/supabaseClient.js";

const TABELA = "avaliacoes";
const PAGINA_LOGIN = "./Login.html";

const $ = (id) => document.getElementById(id);

const esc = (t) =>
    String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let usuarioId = null;
let avaliacoes = [];
let filtroTipo = "todos";
let filtroItem = "todos";
let filtroNota = 0;
let ordem = "recentes";
let respondendoId = null;
let salvando = false;
let erroResposta = "";

const estrelas = (n) =>
    `<span class="estrelas" aria-label="${n} de 5 estrelas">${[1, 2, 3, 4, 5]
        .map((i) => `<span class="${i <= n ? "cheia" : ""}">★</span>`).join("")}</span>`;

const virgula = (n) => n.toFixed(1).replace(".", ",");
const dataBR = (s) => (s ? s.split("-").reverse().join("/") : "");
const iniciais = (nome) => (nome || "?").trim().charAt(0).toUpperCase();

function doBanco(l) {
    return {
        id: l.id,
        item: l.item_nome || "Sem título",
        tipo: l.item_tipo === "projeto" ? "projeto" : "planta",
        autor: l.autor_nome || "Cliente",
        nota: Number(l.nota) || 0,
        data: String(l.criado_em || "").slice(0, 10),
        texto: l.texto || "",
        resposta: l.resposta || ""
    };
}

function mostrarMensagem(html, classe = "aviso-js") {
    $("lista").innerHTML = `<p class="${classe}">${html}</p>`;
}

const base = () => avaliacoes.filter((a) =>
    (filtroTipo === "todos" || a.tipo === filtroTipo) && (filtroItem === "todos" || a.item === filtroItem));

function listaFinal() {
    const l = base().filter((a) => !filtroNota || a.nota === filtroNota);
    const cmp = {
        recentes: (a, b) => b.data.localeCompare(a.data),
        melhores: (a, b) => b.nota - a.nota || b.data.localeCompare(a.data),
        piores: (a, b) => a.nota - b.nota || b.data.localeCompare(a.data)
    }[ordem];
    return l.sort(cmp);
}

function renderItens() {
    const itens = [...new Set(avaliacoes
        .filter((a) => filtroTipo === "todos" || a.tipo === filtroTipo)
        .map((a) => a.item))].sort();

    if (filtroItem !== "todos" && !itens.includes(filtroItem)) filtroItem = "todos";

    $("selItem").innerHTML = '<option value="todos">Todas as plantas e projetos</option>' +
        itens.map((i) => `<option value="${esc(i)}"${i === filtroItem ? " selected" : ""}>${esc(i)}</option>`).join("");
}

function renderResumo() {
    const l = base();
    const media = l.length ? l.reduce((s, a) => s + a.nota, 0) / l.length : 0;

    $("mediaNota").textContent = l.length ? virgula(media) : "—";
    $("mediaEstrelas").innerHTML = estrelas(Math.round(media));
    $("mediaTotal").textContent = l.length
        ? `${l.length} avaliaç${l.length === 1 ? "ão" : "ões"}`
        : "Ainda sem avaliações";

    $("distribuicao").innerHTML = [5, 4, 3, 2, 1].map((n) => {
        const qtd = l.filter((a) => a.nota === n).length;
        const pct = l.length ? (qtd / l.length) * 100 : 0;
        return `<div class="dist-linha"><span>${n} ★</span><div class="barra"><i style="width:${pct}%"></i></div><small>${qtd}</small></div>`;
    }).join("");
}

function renderLista() {
    if (!avaliacoes.length) {
        $("contagem").textContent = "";
        mostrarMensagem("Você ainda não recebeu avaliações.", "vazio");
        return;
    }

    const l = listaFinal();
    $("contagem").textContent = `Mostrando ${l.length} de ${avaliacoes.length} avaliações`;

    $("lista").innerHTML = l.length ? l.map((a) => `
        <article class="avaliacao" data-id="${a.id}">
            <div class="avatar">${esc(iniciais(a.autor))}</div>
            <div class="av-corpo">
                <div class="av-item">
                    <strong>${esc(a.item)}</strong>
                    <span class="tag ${a.tipo}">${a.tipo === "planta" ? "Planta" : "Projeto"}</span>
                </div>
                <span class="av-autor">por ${esc(a.autor)}</span>
                <p class="av-texto">${esc(a.texto)}</p>
                ${a.resposta ? `<div class="resposta"><small>Sua resposta</small><p>${esc(a.resposta)}</p></div>` : ""}
                ${respondendoId === a.id
                    ? `<div class="form-resposta">
                           <textarea id="txtResposta" maxlength="400" placeholder="Escreva sua resposta ao cliente"${salvando ? " disabled" : ""}></textarea>
                           ${erroResposta ? `<p class="aviso-js">${esc(erroResposta)}</p>` : ""}
                           <div>
                               <button data-acao="enviar"${salvando ? " disabled" : ""}>${salvando ? "Salvando..." : "Enviar resposta"}</button>
                               <button class="cancelar" data-acao="cancelar"${salvando ? " disabled" : ""}>Cancelar</button>
                           </div>
                       </div>`
                    : a.resposta ? "" : '<button class="btn-responder" data-acao="responder">Responder</button>'}
            </div>
            <div class="av-lado">
                ${estrelas(a.nota)}
                <small>${dataBR(a.data)}</small>
            </div>
        </article>`).join("")
        : '<div class="vazio">Nenhuma avaliação encontrada com esses filtros.</div>';

    if (respondendoId) {
        const t = $("txtResposta");
        if (t) t.focus();
    }
}

function render() {
    renderItens();
    renderResumo();
    renderLista();
}

async function salvarResposta(id, texto) {
    const { data, error } = await supabase
        .from(TABELA)
        .update({ resposta: texto, respondido_em: new Date().toISOString() })
        .eq("id", id)
        .eq("profissional_id", usuarioId)
        .select()
        .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Não foi possível salvar a resposta.");
    return doBanco(data);
}

function textoErro(erro) {
    const m = String(erro?.message || "").toLowerCase();
    if (m.includes("does not exist") || m.includes("schema cache")) return "A tabela avaliacoes ainda não existe no Supabase.";
    if (m.includes("row-level security") || m.includes("permission denied")) return "Sem permissão para acessar as avaliações.";
    if (m.includes("failed to fetch")) return "Sem conexão com o servidor. Tente novamente.";
    return erro?.message || "Erro ao acessar as avaliações.";
}

function ligarEventos() {
    $("chipsTipo").addEventListener("click", (e) => {
        const b = e.target.closest(".chip");
        if (!b) return;
        document.querySelectorAll(".chip").forEach((c) => c.classList.remove("ativo"));
        b.classList.add("ativo");
        filtroTipo = b.dataset.tipo;
        render();
    });

    $("selItem").onchange = (e) => { filtroItem = e.target.value; render(); };
    $("selNota").onchange = (e) => { filtroNota = Number(e.target.value); renderLista(); };
    $("selOrdem").onchange = (e) => { ordem = e.target.value; renderLista(); };

    $("lista").addEventListener("click", async (e) => {
        const b = e.target.closest("[data-acao]");
        if (!b || salvando) return;
        const id = b.closest(".avaliacao").dataset.id;

        if (b.dataset.acao === "responder") {
            respondendoId = id;
            erroResposta = "";
            renderLista();
            return;
        }

        if (b.dataset.acao === "cancelar") {
            respondendoId = null;
            erroResposta = "";
            renderLista();
            return;
        }

        if (b.dataset.acao === "enviar") {
            const texto = $("txtResposta").value.trim();
            if (!texto) return;

            salvando = true;
            erroResposta = "";
            renderLista();

            try {
                const atualizada = await salvarResposta(id, texto);
                avaliacoes = avaliacoes.map((a) => (a.id === id ? atualizada : a));
                respondendoId = null;
            } catch (erro) {
                console.error("[Avaliacoes]", erro);
                erroResposta = textoErro(erro);
            } finally {
                salvando = false;
                renderLista();
            }
        }
    });
}

async function iniciar() {
    ligarEventos();
    mostrarMensagem("Carregando avaliações...", "vazio");

    try {
        const { data: { session }, error: erroSessao } = await supabase.auth.getSession();
        if (erroSessao) throw erroSessao;

        if (!session) {
            mostrarMensagem(`Você precisa entrar na sua conta para ver as avaliações. <a href="${PAGINA_LOGIN}">Ir para o login</a>`);
            return;
        }

        usuarioId = session.user.id;

        const { data, error } = await supabase
            .from(TABELA)
            .select("*")
            .eq("profissional_id", usuarioId)
            .order("criado_em", { ascending: false });

        if (error) throw error;

        avaliacoes = (data || []).map(doBanco);
        render();
    } catch (erro) {
        console.error("[Avaliacoes]", erro);
        mostrarMensagem(esc(textoErro(erro)));
    }
}

iniciar();