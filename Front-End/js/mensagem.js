const $ = (id) => document.getElementById(id);

const esc = (t) =>
    String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- Quem está usando a página? ---------- */
const TIPO = typeof Conta !== "undefined" ? Conta.tipo() : "usuario"; // "usuario" ou "profissional"
const OUTRO = TIPO === "usuario" ? "profissional" : "usuario";
if (typeof Conta !== "undefined") Conta.renderMenu("mensagem");

/* TROCAR pelos dados reais do login quando existir */
const PESSOAS = {
    usuario: { id: "u1", nome: "Cliente" },
    profissional: { id: "p1", nome: "João Silva" }
};

const TEXTOS = {
    usuario: {
        subtitulo: "Converse com os profissionais dos seus projetos.",
        busca: "Buscar profissional ou mensagem...",
        papel: "Profissional"
    },
    profissional: {
        subtitulo: "Converse com os clientes dos seus projetos.",
        busca: "Buscar cliente ou mensagem...",
        papel: "Cliente"
    }
};

$("subtitulo").textContent = TEXTOS[TIPO].subtitulo;
$("busca").placeholder = TEXTOS[TIPO].busca;

/* =========================================================
   ARMAZENAMENTO COMPARTILHADO (localStorage)
   Funciona entre abas/janelas do mesmo navegador.
   Para conversar entre computadores diferentes, troque
   ler() e salvar() por chamadas a um servidor.

   Conversa: { id, usuario:{id,nome}, profissional:{id,nome},
               mensagens:[{ de, texto, ts }], lido:{ usuario, profissional } }
========================================================= */
const CHAVE = "ioh_conversas";

function ler() {
    try { return JSON.parse(localStorage.getItem(CHAVE)) || []; }
    catch (_) { return []; }
}

function salvar(lista) {
    try { localStorage.setItem(CHAVE, JSON.stringify(lista)); }
    catch (_) { alert("Não foi possível salvar a mensagem (armazenamento bloqueado)."); }
}

/* Presença: cada lado avisa que está com a página aberta */
const PRESENCA = (tipo) => "ioh_presenca_" + tipo;
function batida() { try { localStorage.setItem(PRESENCA(TIPO), Date.now()); } catch (_) { } }
function outroOnline() {
    try { return Date.now() - Number(localStorage.getItem(PRESENCA(OUTRO))) < 10000; }
    catch (_) { return false; }
}

/* ---------- Estado ---------- */
let conversas = ler();
let ativaId = null;
let filtro = "todas";
let termo = "";

const mobile = () => window.matchMedia("(max-width: 850px)").matches;
const DIA = 24 * 60 * 60 * 1000;

/* ---------- Helpers ---------- */
const ultima = (c) => c.mensagens[c.mensagens.length - 1];
const ultimoTs = (c) => (c.mensagens.length ? ultima(c).ts : 0);
const contato = (c) => c[OUTRO];
const conversaAtiva = () => conversas.find((c) => c.id === ativaId);
const naoLidasDe = (c) =>
    c.mensagens.filter((m) => m.de !== TIPO && m.ts > ((c.lido && c.lido[TIPO]) || 0)).length;

function marcarLida(id) {
    const todas = ler();
    const c = todas.find((x) => x.id === id);
    if (!c || !naoLidasDe(c)) return;      // só grava se houver algo novo (evita loop entre abas)
    c.lido = c.lido || {};
    c.lido[TIPO] = Date.now();
    salvar(todas);
    conversas = todas;
}

/* ---------- Formatação ---------- */
const iniciais = (nome) => nome.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
const hhmm = (ts) => new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const diaChave = (ts) => new Date(ts).toDateString();

function rotuloDia(ts) {
    const d = new Date(ts);
    if (d.toDateString() === new Date().toDateString()) return "Hoje";
    if (d.toDateString() === new Date(Date.now() - DIA).toDateString()) return "Ontem";
    return d.toLocaleDateString("pt-BR");
}

function tempoLista(ts) {
    const rotulo = rotuloDia(ts);
    if (rotulo === "Hoje") return hhmm(ts);
    if (rotulo === "Ontem") return "Ontem";
    return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/* ---------- Lista de conversas ---------- */
function renderLista() {
    const total = conversas.reduce((s, c) => s + naoLidasDe(c), 0);
    $("contadorNaoLidas").textContent = total;
    $("contadorNaoLidas").hidden = !total;
    document.title = `${total ? `(${total}) ` : ""}Mensagens - Income of Houses`;

    const lista = conversas
        .filter((c) => (filtro === "todas" || naoLidasDe(c) > 0) &&
            (`${contato(c).nome} ${c.mensagens.map((m) => m.texto).join(" ")}`).toLowerCase().includes(termo))
        .sort((a, b) => ultimoTs(b) - ultimoTs(a));

    if (!lista.length) {
        $("lista").innerHTML = '<p class="sem-resultado">Nenhuma conversa encontrada.</p>';
        return;
    }

    $("lista").innerHTML = lista.map((c) => {
        const u = ultima(c);
        const n = naoLidasDe(c);
        const previa = u ? (u.de === TIPO ? "Você: " : "") + u.texto : "Envie a primeira mensagem";
        return `
            <button type="button" class="conversa${c.id === ativaId ? " selecionada" : ""}${n ? " nao-lida" : ""}" data-id="${esc(c.id)}">
                <span class="avatar${outroOnline() ? " online" : ""}">${esc(iniciais(contato(c).nome))}</span>
                <span class="dados-conversa">
                    <h3>${esc(contato(c).nome)}</h3>
                    <p>${esc(previa)}</p>
                </span>
                <span class="lado">
                    <span class="hora">${u ? tempoLista(u.ts) : ""}</span>
                    ${n ? `<span class="badge">${n}</span>` : ""}
                </span>
            </button>`;
    }).join("");
}

/* ---------- Chat ---------- */
function renderMensagens() {
    const c = conversaAtiva();
    if (!c) return;

    let html = "";
    let diaAnterior = "";

    c.mensagens.forEach((m) => {
        const chave = diaChave(m.ts);
        if (chave !== diaAnterior) {
            html += `<div class="separador"><span>${rotuloDia(m.ts)}</span></div>`;
            diaAnterior = chave;
        }
        html += `
            <div class="mensagem ${m.de === TIPO ? "enviada" : "recebida"}">
                <p>${esc(m.texto)}</p>
                <span class="hora-msg">${hhmm(m.ts)}${m.de === TIPO ? " ✓" : ""}</span>
            </div>`;
    });

    const area = $("mensagens");
    area.innerHTML = html;
    area.scrollTop = area.scrollHeight;
}

function renderCabecalhoChat() {
    const c = conversaAtiva();
    if (!c) return;
    const on = outroOnline();
    $("chatAvatar").textContent = iniciais(contato(c).nome);
    $("chatAvatar").classList.toggle("online", on);
    $("chatNome").textContent = contato(c).nome;
    $("chatStatus").textContent = `${TEXTOS[TIPO].papel} · ${on ? "Online" : "Offline"}`;
    $("chatStatus").classList.toggle("on", on);
}

function abrirConversa(id) {
    ativaId = id;
    marcarLida(id);

    $("chatVazio").hidden = true;
    $("chatPainel").hidden = false;
    $("area").classList.add("chat-aberto");

    renderCabecalhoChat();
    renderMensagens();
    renderLista();

    if (!mobile()) $("texto").focus();
}

/* ---------- Envio ---------- */
function ajustarCampo() {
    const t = $("texto");
    t.style.height = "auto";
    t.style.height = Math.min(t.scrollHeight, 96) + "px";
    $("btnEnviar").disabled = !t.value.trim();
}

function enviar() {
    const texto = $("texto").value.trim();
    if (!ativaId || !texto) return;

    // relê antes de gravar, para não apagar mensagem que acabou de chegar
    const todas = ler();
    const c = todas.find((x) => x.id === ativaId);
    if (!c) return;

    const agora = Date.now();
    c.mensagens.push({ de: TIPO, texto, ts: agora });
    c.lido = c.lido || {};
    c.lido[TIPO] = agora;
    salvar(todas);
    conversas = todas;

    $("texto").value = "";
    ajustarCampo();
    renderMensagens();
    renderLista();
}

/* ---------- Cria a conversa usuário <-> profissional ----------
   Qualquer um dos dois lados cria, então ela aparece para os dois
   sem precisar de link especial. Opcional: Mensagem.html?com=ID&nome=Nome
   abre a conversa com um profissional específico (só no lado do usuário). */
function garantirConversa() {
    const params = new URLSearchParams(location.search);
    const com = params.get("com");
    const nomeCom = params.get("nome");

    const prof = TIPO === "usuario" && com && nomeCom
        ? { id: String(com), nome: nomeCom }
        : PESSOAS.profissional;
    const user = PESSOAS.usuario;

    const id = `${user.id}_${prof.id}`;
    const todas = ler();
    if (!todas.find((c) => c.id === id)) {
        todas.push({ id, usuario: user, profissional: prof, mensagens: [], lido: {} });
        salvar(todas);
    }
    conversas = todas;
    return id;
}

/* ---------- Tempo real ---------- */
function atualizar() {
    conversas = ler();
    if (ativaId && conversaAtiva()) {
        marcarLida(ativaId);
        renderMensagens();
        renderCabecalhoChat();
    }
    renderLista();
}

// dispara quando OUTRA aba/janela grava no localStorage
window.addEventListener("storage", (e) => {
    if (e.key === CHAVE || (e.key && e.key.startsWith("ioh_presenca_"))) atualizar();
});

batida();
setInterval(batida, 4000);
setInterval(() => { renderCabecalhoChat(); renderLista(); }, 5000);
window.addEventListener("beforeunload", () => {
    try { localStorage.removeItem(PRESENCA(TIPO)); } catch (_) { }
});

/* ---------- Eventos ---------- */
$("lista").addEventListener("click", (e) => {
    const b = e.target.closest(".conversa");
    if (b) abrirConversa(b.dataset.id);
});

$("busca").addEventListener("input", (e) => { termo = e.target.value.trim().toLowerCase(); renderLista(); });

$("filtros").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    document.querySelectorAll(".chip").forEach((x) => x.classList.remove("ativo"));
    b.classList.add("ativo");
    filtro = b.dataset.filtro;
    renderLista();
});

$("btnVoltar").onclick = () => $("area").classList.remove("chat-aberto");

$("formMsg").addEventListener("submit", (e) => { e.preventDefault(); enviar(); });
$("texto").addEventListener("input", ajustarCampo);

// Enter envia, Shift+Enter quebra a linha
$("texto").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        enviar();
    }
});

/* ---------- Início ---------- */
const idInicial = garantirConversa();
renderLista();
$("area").classList.remove("chat-aberto");
if (!mobile()) abrirConversa(idInicial);
if (location.search.includes("com=")) history.replaceState(null, "", location.pathname);