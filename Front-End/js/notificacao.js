import { supabase } from "./lib/supabaseClient.js";

// Sino de notificações: injeta no cabeçalho (.topo) das páginas em que o script for incluído.
// Colocar em Front-End/js/notificacao.js

const esc = (t) =>
    String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const CSS = `
.notif{position:relative;margin-left:auto;z-index:30}
.notif + .iconelogin{margin-left:12px}
.notif-sino{position:relative;width:38px;height:38px;display:grid;place-items:center;background:transparent;border:1px solid #343940;border-radius:50%;color:#d4a63a;cursor:pointer;transition:.2s}
.notif-sino:hover{background:#302718;border-color:#59431f}
.notif-sino svg{width:18px;height:18px}
.notif-badge{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 4px;display:grid;place-items:center;background:#d4a63a;color:#111;border-radius:9px;font:700 11px Arial,sans-serif}
.notif-badge[hidden],.notif-painel[hidden]{display:none}
.notif-painel{position:absolute;top:46px;right:0;width:340px;max-width:calc(100vw - 24px);background:#171717;border:1px solid #292929;border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.5);overflow:hidden}
.notif-topo{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #292929;color:#fff;font:14px Arial,sans-serif}
.notif-ler{background:none;border:none;color:#d4a63a;font-size:12px;cursor:pointer}
.notif-lista{max-height:380px;overflow-y:auto}
.notif-item{display:flex;flex-direction:column;gap:3px;width:100%;padding:12px 14px;text-align:left;background:transparent;border:none;border-bottom:1px solid #222;color:#d3d4d8;font-family:Arial,sans-serif;cursor:pointer}
.notif-item:hover{background:#1f1f21}
.notif-item.nova{border-left:3px solid #d4a63a;background:#1c1912}
.notif-item strong{color:#fff;font-size:13px;font-weight:500}
.notif-item span{font-size:12px;color:#bbb;overflow-wrap:anywhere}
.notif-item small{font-size:11px;color:#888}
.notif-vazio{padding:20px 14px;color:#999;font:13px Arial,sans-serif;text-align:center}
`;

const SINO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>`;

let usuarioId = null;
let pushAtivo = false;
let itens = [];
let ui = null;

function montarUI() {
    const topo = document.querySelector(".topo");
    if (!topo || document.querySelector(".notif")) return null;

    const estilo = document.createElement("style");
    estilo.textContent = CSS;
    document.head.appendChild(estilo);

    const caixa = document.createElement("div");
    caixa.className = "notif";
    caixa.innerHTML = `
        <button type="button" class="notif-sino" aria-label="Notificações" aria-expanded="false">
            ${SINO}<span class="notif-badge" hidden>0</span>
        </button>
        <div class="notif-painel" hidden>
            <div class="notif-topo"><strong>Notificações</strong>
                <button type="button" class="notif-ler">Marcar todas como lidas</button></div>
            <div class="notif-lista"></div>
        </div>`;

    // sino antes do ícone de login (os dois ficam à direita)
    const login = topo.querySelector(".iconelogin");
    if (login) topo.insertBefore(caixa, login);
    else topo.appendChild(caixa);

    return {
        caixa,
        sino: caixa.querySelector(".notif-sino"),
        badge: caixa.querySelector(".notif-badge"),
        painel: caixa.querySelector(".notif-painel"),
        lista: caixa.querySelector(".notif-lista"),
        ler: caixa.querySelector(".notif-ler")
    };
}

function render() {
    const naoLidas = itens.filter((i) => !i.lida).length;
    ui.badge.textContent = naoLidas > 99 ? "99+" : naoLidas;
    ui.badge.hidden = naoLidas === 0;

    ui.lista.innerHTML = itens.length
        ? itens.map((i) => `
            <button type="button" class="notif-item${i.lida ? "" : " nova"}" data-id="${esc(i.id)}" data-link="${esc(i.link)}">
                <strong>${esc(i.titulo)}</strong>
                ${i.texto ? `<span>${esc(i.texto)}</span>` : ""}
                <small>${new Date(i.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</small>
            </button>`).join("")
        : `<p class="notif-vazio">Nenhuma notificação.</p>`;
}

async function carregar() {
    const { data, error } = await supabase
        .from("notificacoes")
        .select("id, tipo, titulo, texto, link, lida, criado_em")
        .order("criado_em", { ascending: false })
        .limit(20);

    if (error) {
        console.error("Erro ao carregar notificações:", error.message);
        return;
    }
    itens = data || [];
    render();
}

async function carregarPreferenciaPush() {
    const { data } = await supabase
        .from("configuracoes_usuario")
        .select("notificacoes_push")
        .eq("usuario_id", usuarioId)
        .maybeSingle();
    pushAtivo = data ? data.notificacoes_push : true; // sem linha salva = padrão (ligado)
}

function avisoDoNavegador(n) {
    if (!pushAtivo || !("Notification" in window) || Notification.permission !== "granted") return;
    new Notification(n.titulo, { body: n.texto || "" });
}

async function marcarLidas(filtroId) {
    let consulta = supabase.from("notificacoes").update({ lida: true }).eq("usuario_id", usuarioId).eq("lida", false);
    if (filtroId) consulta = consulta.eq("id", filtroId);

    const { error } = await consulta;
    if (error) {
        console.error("Erro ao marcar como lida:", error.message);
        return false;
    }
    itens = itens.map((i) => (!filtroId || i.id === filtroId ? { ...i, lida: true } : i));
    render();
    return true;
}

function ligarEventos() {
    ui.sino.addEventListener("click", () => {
        ui.painel.hidden = !ui.painel.hidden;
        ui.sino.setAttribute("aria-expanded", String(!ui.painel.hidden));
    });

    document.addEventListener("click", (e) => {
        if (!ui.caixa.contains(e.target)) {
            ui.painel.hidden = true;
            ui.sino.setAttribute("aria-expanded", "false");
        }
    });

    ui.ler.addEventListener("click", () => marcarLidas());

    ui.lista.addEventListener("click", async (e) => {
        const item = e.target.closest(".notif-item");
        if (!item) return;
        await marcarLidas(item.dataset.id);
        if (item.dataset.link) {
            // o link é relativo à pasta pages/, a partir do local deste arquivo
            window.location.href = new URL(`../pages/${item.dataset.link}`, import.meta.url).href;
        }
    });
}

function ouvirTempoReal() {
    supabase
        .channel(`notificacoes-${usuarioId}`)
        .on("postgres_changes",
            { event: "INSERT", schema: "public", table: "notificacoes", filter: `usuario_id=eq.${usuarioId}` },
            (payload) => {
                itens = [payload.new, ...itens].slice(0, 20);
                render();
                avisoDoNavegador(payload.new);
            })
        .subscribe();
}

async function iniciar() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return; // visitante: sem sino

    usuarioId = session.user.id;
    ui = montarUI();
    if (!ui) return;

    ligarEventos();
    await Promise.all([carregar(), carregarPreferenciaPush()]);
    ouvirTempoReal();
}

iniciar();