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
const EU = PESSOAS[TIPO];

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
   SERVIDOR (Back-End/server/mensagens.js, montado no server.js)
   As conversas e os contatos salvos ficam no servidor, então a
   conversa funciona entre computadores diferentes.
   Se o site e o servidor estiverem em endereços diferentes
   (ex.: Live Server na porta 5500), defina antes deste script
   (no config.js):  window.IOH_API = "http://localhost:3000";

   Conversa: { id, usuario:{id,nome}, profissional:{id,nome},
               mensagens:[{ id, de, texto, ts }],
               lido:{ usuario, profissional }, salvo:{ usuario, profissional },
               outroOnline }
========================================================= */
const API = (window.IOH_API || "") + "/api/mensagens";

async function api(caminho, metodo = "GET", corpo = {}) {
    const ident = { tipo: TIPO, pessoa: EU.id };
    let url = API + caminho;
    const opcoes = { method: metodo };

    if (metodo === "GET") {
        url += (url.includes("?") ? "&" : "?") + new URLSearchParams(ident);
    } else {
        opcoes.headers = { "Content-Type": "application/json" };
        opcoes.body = JSON.stringify({ ...ident, ...corpo });
    }

    const r = await fetch(url, opcoes);
    if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        const erro = new Error(e.erro || "Erro " + r.status);
        erro.status = r.status;
        throw erro;
    }
    return r.json();
}

/* ---------- Estado ---------- */
let conversas = [];
let ativaId = null;
let filtro = "todas";          // todas | naolidas | salvos
let termo = "";
let desenhada = { id: null, n: -1 };
let ouvindo = false;           // evita abrir o canal de avisos mais de uma vez

const mobile = () => window.matchMedia("(max-width: 850px)").matches;
const DIA = 24 * 60 * 60 * 1000;

/* ---------- Helpers ---------- */
const ultima = (c) => c.mensagens[c.mensagens.length - 1];
const ultimoTs = (c) => (c.mensagens.length ? ultima(c).ts : 0);
const contato = (c) => c[OUTRO];
const conversaAtiva = () => conversas.find((c) => c.id === ativaId);
const salvoPorMim = (c) => !!(c.salvo && c.salvo[TIPO]);
const naoLidasDe = (c) =>
    c.mensagens.filter((m) => m.de !== TIPO && m.ts > ((c.lido && c.lido[TIPO]) || 0)).length;

function substituir(nova) {
    const i = conversas.findIndex((c) => c.id === nova.id);
    if (i >= 0) conversas[i] = nova; else conversas.push(nova);
}

function marcarLida(id) {
    const c = conversas.find((x) => x.id === id);
    if (!c || !naoLidasDe(c)) return;            // só avisa o servidor se houver algo novo
    c.lido = c.lido || {};
    c.lido[TIPO] = ultimoTs(c);                  // some o contador na hora
    api(`/conversas/${encodeURIComponent(id)}/lido`, "POST").catch(() => { });
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

/* ---------- Conexão ---------- */
function conexao(ok, msg) {
    const aviso = $("avisoConexao");
    aviso.hidden = ok;
    if (!ok) aviso.textContent = msg || "Sem conexão com o servidor de mensagens. Tentando reconectar... (confira se o servidor está rodando: node server.js, dentro da pasta Back-End)";
}

/* ---------- Lista de conversas ---------- */
function visivel(c) {
    // conversa sem mensagens só aparece se o contato estiver salvo (ou se for a aberta agora)
    return c.mensagens.length > 0 || salvoPorMim(c) || c.id === ativaId;
}

function renderLista() {
    const total = conversas.reduce((s, c) => s + naoLidasDe(c), 0);
    $("contadorNaoLidas").textContent = total;
    $("contadorNaoLidas").hidden = !total;
    document.title = `${total ? `(${total}) ` : ""}Mensagens - Income of Houses`;

    const lista = conversas
        .filter((c) => visivel(c) &&
            (filtro === "todas" || (filtro === "naolidas" && naoLidasDe(c) > 0) || (filtro === "salvos" && salvoPorMim(c))) &&
            (`${contato(c).nome} ${c.mensagens.map((m) => m.texto).join(" ")}`).toLowerCase().includes(termo))
        .sort((a, b) => (ultimoTs(b) || b.criadoEm || 0) - (ultimoTs(a) || a.criadoEm || 0));

    if (!lista.length) {
        const vazio = filtro === "salvos" ? "Você ainda não salvou nenhum contato."
            : filtro === "naolidas" ? "Nenhuma mensagem não lida."
            : termo ? "Nenhuma conversa encontrada."
            : "Você ainda não tem conversas.";
        atualizarLista(`<p class="sem-resultado">${vazio}</p>`);
        return;
    }

    atualizarLista(lista.map((c) => {
        const u = ultima(c);
        const n = naoLidasDe(c);
        const previa = u ? (u.de === TIPO ? "Você: " : "") + u.texto : "Envie a primeira mensagem";
        return `
            <button type="button" class="conversa${c.id === ativaId ? " selecionada" : ""}${n ? " nao-lida" : ""}" data-id="${esc(c.id)}">
                <span class="avatar${c.outroOnline ? " online" : ""}">${esc(iniciais(contato(c).nome))}</span>
                <span class="dados-conversa">
                    <h3>${esc(contato(c).nome)}${salvoPorMim(c) ? ' <span class="estrela" title="Contato salvo">★</span>' : ""}</h3>
                    <p>${esc(previa)}</p>
                </span>
                <span class="lado">
                    <span class="hora">${u ? tempoLista(u.ts) : ""}</span>
                    ${n ? `<span class="badge">${n}</span>` : ""}
                </span>
            </button>`;
    }).join(""));
}

// só mexe no DOM quando o conteúdo mudou de verdade (evita piscar)
let listaHtml = "";
function atualizarLista(html) {
    if (html === listaHtml) return;
    const el = $("lista");
    const rolagem = el.scrollTop;
    el.innerHTML = html;
    el.scrollTop = rolagem;
    listaHtml = html;
}

/* ---------- Chat ---------- */
function htmlMensagem(m) {
    return `
            <div class="mensagem ${m.de === TIPO ? "enviada" : "recebida"}">
                <p>${esc(m.texto)}</p>
                <span class="hora-msg">${hhmm(m.ts)}${m.de === TIPO ? " ✓" : ""}</span>
            </div>`;
}

function htmlMensagens(lista, diaAnterior) {
    let html = "";
    lista.forEach((m) => {
        const chave = diaChave(m.ts);
        if (chave !== diaAnterior) {
            html += `<div class="separador"><span>${rotuloDia(m.ts)}</span></div>`;
            diaAnterior = chave;
        }
        html += htmlMensagem(m);
    });
    return html;
}

function renderMensagens(forcar) {
    const c = conversaAtiva();
    if (!c) return;
    const area = $("mensagens");
    const mesma = desenhada.id === c.id;
    const total = c.mensagens.length;

    // nada mudou: não mexe em nada (nem rola a tela)
    if (!forcar && mesma && desenhada.n === total) return;

    // chegaram mensagens novas na mesma conversa: só acrescenta no final
    if (!forcar && mesma && desenhada.n > 0 && total > desenhada.n) {
        const perto = area.scrollHeight - area.scrollTop - area.clientHeight < 120;
        const diaAnterior = diaChave(c.mensagens[desenhada.n - 1].ts);
        area.insertAdjacentHTML("beforeend", htmlMensagens(c.mensagens.slice(desenhada.n), diaAnterior));
        desenhada.n = total;
        if (perto || ultima(c).de === TIPO) area.scrollTo({ top: area.scrollHeight, behavior: "smooth" });
        return;
    }

    // abertura da conversa (ou caso raro): desenha tudo uma vez
    desenhada = { id: c.id, n: total };
    area.innerHTML = total
        ? htmlMensagens(c.mensagens, "")
        : `<p class="chat-sem-mensagens">Nenhuma mensagem ainda. Diga olá para ${esc(contato(c).nome)}.</p>`;
    area.scrollTop = area.scrollHeight;
}

function renderBotaoSalvar() {
    const c = conversaAtiva();
    if (!c) return;
    const salvo = salvoPorMim(c);
    const b = $("btnSalvar");
    b.setAttribute("aria-pressed", salvo);
    b.textContent = salvo ? "★ Contato salvo" : "☆ Salvar contato";
}

function renderCabecalhoChat() {
    const c = conversaAtiva();
    if (!c) return;
    const on = !!c.outroOnline;
    $("chatAvatar").textContent = iniciais(contato(c).nome);
    $("chatAvatar").classList.toggle("online", on);
    $("chatNome").textContent = contato(c).nome;
    $("chatStatus").textContent = `${TEXTOS[TIPO].papel} · ${on ? "Online" : "Offline"}`;
    $("chatStatus").classList.toggle("on", on);
    renderBotaoSalvar();
}

function abrirConversa(id) {
    ativaId = id;
    marcarLida(id);

    $("chatVazio").hidden = true;
    $("chatPainel").hidden = false;
    $("area").classList.add("chat-aberto");

    renderCabecalhoChat();
    renderMensagens(true);
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

async function enviar() {
    const texto = $("texto").value.trim();
    if (!ativaId || !texto) return;

    const id = ativaId;
    $("texto").value = "";
    ajustarCampo();

    try {
        substituir(await api(`/conversas/${encodeURIComponent(id)}/mensagens`, "POST", { texto }));
        conexao(true);
        renderMensagens();
        renderLista();
    } catch (e) {
        // devolve o texto para o campo, para a pessoa não perder o que escreveu
        if ($("texto").value === "") { $("texto").value = texto; ajustarCampo(); }
        conexao(false, e.status ? e.message : undefined);
    }
}

/* ---------- Salvar / remover contato ---------- */
async function alternarContato() {
    const c = conversaAtiva();
    if (!c) return;
    const novo = !salvoPorMim(c);

    c.salvo = c.salvo || {};
    c.salvo[TIPO] = novo;                         // muda na tela na hora
    renderBotaoSalvar();
    renderLista();

    try {
        substituir(await api(`/conversas/${encodeURIComponent(c.id)}/salvo`, "POST", { salvo: novo }));
    } catch (e) {
        c.salvo[TIPO] = !novo;                    // não deu certo: volta ao que era
        conexao(false, e.status ? e.message : undefined);
    }
    renderBotaoSalvar();
    renderLista();
}

/* ---------- Cria a conversa usuário <-> profissional ----------
   Mensagem.html?com=ID&nome=Nome abre a conversa com um profissional
   específico e já salva o contato (só no lado do usuário).
   Sem esses dados NÃO cria nada: a lista começa vazia. */
async function garantirConversa() {
    const params = new URLSearchParams(location.search);
    const com = params.get("com");
    const nomeCom = params.get("nome");

    if (TIPO !== "usuario" || !com || !nomeCom) return null;

    const c = await api("/conversas", "POST", {
        usuario: PESSOAS.usuario,
        profissional: { id: String(com), nome: nomeCom }
    });
    return c.id;
}

/* ---------- Tempo real ---------- */
async function carregar() {
    try {
        conversas = await api("/conversas");
        conexao(true);
    } catch (e) {
        conexao(false);
        return;
    }
    if (ativaId && conversaAtiva()) {
        marcarLida(ativaId);
        renderMensagens();
        renderCabecalhoChat();
    }
    renderLista();
}

function ouvirServidor() {
    if (ouvindo) return;                          // já está ouvindo
    ouvindo = true;
    const es = new EventSource(API + "/eventos?" + new URLSearchParams({ tipo: TIPO, pessoa: EU.id }));
    es.addEventListener("atualizar", carregar);
    es.onopen = carregar;                         // também roda quando reconecta
    es.onerror = () => conexao(false);            // o navegador tenta reconectar sozinho
}

setInterval(carregar, 20000);                     // garantia, caso algum aviso se perca

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
$("btnSalvar").addEventListener("click", alternarContato);

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
async function iniciar() {
    try {
        const idInicial = await garantirConversa();
        await carregar();
        ouvirServidor();

        $("area").classList.remove("chat-aberto");
        if (idInicial && conversas.find((c) => c.id === idInicial)) abrirConversa(idInicial);
        if (location.search.includes("com=")) history.replaceState(null, "", location.pathname);
    } catch (e) {
        conexao(false, e.status ? e.message : undefined);
        atualizarLista('<p class="sem-resultado">Não foi possível carregar as conversas.</p>');
        setTimeout(iniciar, 4000);                // tenta de novo até o servidor responder
    }
}

iniciar();