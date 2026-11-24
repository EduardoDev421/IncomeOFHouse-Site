const $ = (id) => document.getElementById(id);

const esc = (t) =>
    String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* =========================================================
   MENSAGENS EM TEMPO REAL (Supabase)
   - Conversas e mensagens ficam nas tabelas "conversas" e "mensagens"
     (veja mensagens.sql) e chegam na hora para o outro lado (Realtime).
   - Online / offline: Realtime Presence.
   - "digitando...": Realtime Broadcast.
   - ✓ enviada, ✓✓ azul = o outro lado já leu.
========================================================= */

/* ---------- Quem está usando a página? ---------- */
let supabase = null;
let TIPO = typeof Conta !== "undefined" ? Conta.tipo() : "usuario"; // "usuario" ou "profissional"
let OUTRO = TIPO === "usuario" ? "profissional" : "usuario";
let EU = { id: null, nome: "" };

async function carregarIdentidade() {
    ({ supabase } = await import("./lib/supabaseClient.js"));

    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!session?.user) return false;

    const user = session.user;
    const metadata = user.user_metadata || {};
    let tipo = metadata.tipo === "profissional" ? "profissional"
        : metadata.tipo === "usuario" ? "usuario" : null;

    if (!tipo) {
        const { data: profissional } = await supabase
            .from("profissionais")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();
        tipo = profissional ? "profissional" : "usuario";
    }

    const tabela = tipo === "profissional" ? "profissionais" : "usuarios";
    const { data: perfil } = await supabase
        .from(tabela)
        .select("id,nome")
        .eq("id", user.id)
        .maybeSingle();

    TIPO = tipo;
    OUTRO = tipo === "usuario" ? "profissional" : "usuario";
    EU = {
        id: user.id,
        nome: perfil?.nome || metadata.nome || metadata.full_name || user.email || (tipo === "profissional" ? "Profissional" : "Cliente")
    };

    if (typeof Conta !== "undefined") Conta.definir(tipo);
    return true;
}

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

function configurarTextos() {
    $("subtitulo").textContent = TEXTOS[TIPO].subtitulo;
    $("busca").placeholder = TEXTOS[TIPO].busca;
}

/* ---------- Estado ----------
   Conversa: { id, usuario:{id,nome}, profissional:{id,nome},
               mensagens:[{ id, de, texto, ts, pendente? }],
               lido:{ usuario, profissional }, salvo:{ usuario, profissional }, criadoEm } */
let conversas = [];
let ativaId = null;
let filtro = "todas";          // todas | naolidas | salvos
let termo = "";
let desenhada = { id: null, n: -1 };
let ouvindo = false;           // evita abrir os canais mais de uma vez
let online = new Set();        // ids de quem está online agora
const digitandoDe = {};        // id do contato -> momento do último "digitando"
let ultimoAvisoDigitando = 0;

const mobile = () => window.matchMedia("(max-width: 850px)").matches;
const DIA = 24 * 60 * 60 * 1000;

// Página do perfil público do profissional (recebe ?id=). Ajuste o nome se for diferente.
const PAGINA_PERFIL_PROFISSIONAL = "./PerfilProfissional.html";

/* ---------- Helpers ---------- */
const ts = (v) => (v ? Date.parse(v) || 0 : 0);
const ultima = (c) => c.mensagens[c.mensagens.length - 1];
const ultimoTs = (c) => (c.mensagens.length ? ultima(c).ts : 0);
const contato = (c) => c[OUTRO];
const conversaAtiva = () => conversas.find((c) => c.id === ativaId);
const salvoPorMim = (c) => !!(c.salvo && c.salvo[TIPO]);
const estaOnline = (c) => online.has(contato(c).id);
const estaDigitando = (c) => Date.now() - (digitandoDe[contato(c).id] || 0) < 3000;
const naoLidasDe = (c) =>
    c.mensagens.filter((m) => m.de !== TIPO && m.ts > ((c.lido && c.lido[TIPO]) || 0)).length;

// Só o usuário consegue abrir o perfil (do profissional da conversa)
const urlPerfil = (c) =>
    TIPO === "usuario" && c.profissional.id
        ? `${PAGINA_PERFIL_PROFISSIONAL}?id=${encodeURIComponent(c.profissional.id)}`
        : null;

function mapearMensagem(m) {
    return { id: m.id, de: m.de, texto: m.texto, ts: ts(m.criado_em) };
}

function mapearConversa(row, mensagens) {
    return {
        id: row.id,
        usuario: { id: row.usuario_id, nome: row.usuario_nome || "Cliente" },
        profissional: { id: row.profissional_id, nome: row.profissional_nome || "Profissional" },
        mensagens: mensagens.map(mapearMensagem),
        lido: { usuario: ts(row.lido_usuario), profissional: ts(row.lido_profissional) },
        salvo: { usuario: !!row.salvo_usuario, profissional: !!row.salvo_profissional },
        criadoEm: ts(row.criado_em)
    };
}

function marcarLida(id) {
    const c = conversas.find((x) => x.id === id);
    if (!c || !naoLidasDe(c)) return;             // só avisa o servidor se houver algo novo

    const deles = c.mensagens.filter((m) => m.de !== TIPO);
    const t = deles[deles.length - 1].ts;
    c.lido = c.lido || {};
    c.lido[TIPO] = t;                              // some o contador na hora

    supabase
        .from("conversas")
        .update({ [`lido_${TIPO}`]: new Date(t).toISOString() })
        .eq("id", id)
        .then(({ error }) => { if (error) console.warn("[Mensagens] marcar como lida:", error.message); });
}

/* ---------- Formatação ---------- */
const iniciais = (nome) => (nome || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
const hhmm = (t) => new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const diaChave = (t) => new Date(t).toDateString();

function rotuloDia(t) {
    const d = new Date(t);
    if (d.toDateString() === new Date().toDateString()) return "Hoje";
    if (d.toDateString() === new Date(Date.now() - DIA).toDateString()) return "Ontem";
    return d.toLocaleDateString("pt-BR");
}

function tempoLista(t) {
    const rotulo = rotuloDia(t);
    if (rotulo === "Hoje") return hhmm(t);
    if (rotulo === "Ontem") return "Ontem";
    return new Date(t).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/* ---------- Conexão ---------- */
function conexao(ok, msg) {
    const aviso = $("avisoConexao");
    aviso.hidden = ok;
    if (!ok) aviso.textContent = msg || "Sem conexão com o servidor de mensagens. Tentando reconectar...";
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
        const previa = estaDigitando(c) ? "digitando..."
            : u ? (u.de === TIPO ? "Você: " : "") + u.texto : "Envie a primeira mensagem";
        return `
            <button type="button" class="conversa${c.id === ativaId ? " selecionada" : ""}${n ? " nao-lida" : ""}" data-id="${esc(c.id)}">
                <span class="avatar${estaOnline(c) ? " online" : ""}">${esc(iniciais(contato(c).nome))}</span>
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
function tickHtml(m, c) {
    if (m.de !== TIPO) return "";
    const lido = (c.lido && c.lido[OUTRO]) || 0;
    let simbolo = "✓";
    let cor = "";
    if (m.pendente) simbolo = "🕓";
    else if (m.ts <= lido) { simbolo = "✓✓"; cor = "color:#53bdeb;"; }
    return ` <span class="tick" data-ts="${m.ts}" data-pend="${m.pendente ? 1 : 0}" style="${cor}">${simbolo}</span>`;
}

// atualiza os ✓ / ✓✓ sem redesenhar a conversa
function atualizarTicks(c) {
    const lido = (c.lido && c.lido[OUTRO]) || 0;
    $("mensagens").querySelectorAll(".tick").forEach((el) => {
        if (el.dataset.pend === "1") return;
        const lida = Number(el.dataset.ts) <= lido;
        el.textContent = lida ? "✓✓" : "✓";
        el.style.color = lida ? "#53bdeb" : "";
    });
}

function htmlMensagem(m, c) {
    return `
            <div class="mensagem ${m.de === TIPO ? "enviada" : "recebida"}">
                <p>${esc(m.texto)}</p>
                <span class="hora-msg">${hhmm(m.ts)}${tickHtml(m, c)}</span>
            </div>`;
}

function htmlMensagens(lista, diaAnterior, c) {
    let html = "";
    lista.forEach((m) => {
        const chave = diaChave(m.ts);
        if (chave !== diaAnterior) {
            html += `<div class="separador"><span>${rotuloDia(m.ts)}</span></div>`;
            diaAnterior = chave;
        }
        html += htmlMensagem(m, c);
    });
    return html;
}

function renderMensagens(forcar) {
    const c = conversaAtiva();
    if (!c) return;
    const area = $("mensagens");
    const mesma = desenhada.id === c.id;
    const total = c.mensagens.length;

    // nada mudou: só confere os ✓ (não rola a tela)
    if (!forcar && mesma && desenhada.n === total) {
        atualizarTicks(c);
        return;
    }

    // chegaram mensagens novas na mesma conversa: só acrescenta no final
    if (!forcar && mesma && desenhada.n > 0 && total > desenhada.n) {
        const perto = area.scrollHeight - area.scrollTop - area.clientHeight < 120;
        const diaAnterior = diaChave(c.mensagens[desenhada.n - 1].ts);
        area.insertAdjacentHTML("beforeend", htmlMensagens(c.mensagens.slice(desenhada.n), diaAnterior, c));
        desenhada.n = total;
        atualizarTicks(c);
        if (perto || ultima(c).de === TIPO) area.scrollTo({ top: area.scrollHeight, behavior: "smooth" });
        return;
    }

    // abertura da conversa (ou caso raro): desenha tudo uma vez
    desenhada = { id: c.id, n: total };
    area.innerHTML = total
        ? htmlMensagens(c.mensagens, "", c)
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
    const on = estaOnline(c);
    const digitando = estaDigitando(c);
    $("chatAvatar").textContent = iniciais(contato(c).nome);
    $("chatAvatar").classList.toggle("online", on);
    $("chatNome").textContent = contato(c).nome;
    $("chatStatus").textContent = `${TEXTOS[TIPO].papel} · ${digitando ? "digitando..." : on ? "Online" : "Offline"}`;
    $("chatStatus").classList.toggle("on", on || digitando);

    // avatar e nome clicáveis: abrem o perfil do profissional (só para o usuário)
    const link = urlPerfil(c);
    ["chatAvatar", "chatNome"].forEach((id) => {
        $(id).style.cursor = link ? "pointer" : "";
        $(id).title = link ? "Ver perfil" : "";
    });

    renderBotaoSalvar();
}

function abrirPerfil() {
    const c = conversaAtiva();
    const url = c && urlPerfil(c);
    if (url) window.location.href = url;
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

/* ---------- Envio (aparece na hora, como no WhatsApp) ---------- */
function ajustarCampo() {
    const t = $("texto");
    t.style.height = "auto";
    t.style.height = Math.min(t.scrollHeight, 96) + "px";
    $("btnEnviar").disabled = !t.value.trim();
}

function confirmarEnvio(conversaId, idTemporario, linha) {
    const c = conversas.find((x) => x.id === conversaId);
    if (!c) return;

    const real = mapearMensagem(linha);
    const i = c.mensagens.findIndex((m) => m.id === idTemporario);
    const jaTem = c.mensagens.some((m) => m.id === real.id);

    if (i >= 0) {
        if (jaTem) c.mensagens.splice(i, 1);
        else c.mensagens[i] = real;
    } else if (!jaTem) {
        c.mensagens.push(real);
    }

    if (c.id === ativaId) renderMensagens(true);
    renderLista();
}

async function enviar() {
    const texto = $("texto").value.trim();
    const c = conversaAtiva();
    if (!c || !texto) return;

    const id = c.id;
    $("texto").value = "";
    ajustarCampo();

    const temporaria = {
        id: "tmp-" + Date.now() + Math.random().toString(36).slice(2, 6),
        de: TIPO,
        texto,
        ts: Date.now(),
        pendente: true
    };
    c.mensagens.push(temporaria);
    renderMensagens();
    renderLista();

    const { data, error } = await supabase
        .from("mensagens")
        .insert({ conversa_id: id, de: TIPO, remetente_id: EU.id, texto })
        .select()
        .single();

    if (error) {
        const atual = conversas.find((x) => x.id === id);
        if (atual) atual.mensagens = atual.mensagens.filter((m) => m.id !== temporaria.id);
        // devolve o texto para o campo, para a pessoa não perder o que escreveu
        if ($("texto").value === "") { $("texto").value = texto; ajustarCampo(); }
        conexao(false, error.message);
        if (atual && atual.id === ativaId) renderMensagens(true);
        renderLista();
        return;
    }

    conexao(true);
    confirmarEnvio(id, temporaria.id, data);
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

    const { error } = await supabase
        .from("conversas")
        .update({ [`salvo_${TIPO}`]: novo })
        .eq("id", c.id);

    if (error) {
        c.salvo[TIPO] = !novo;                    // não deu certo: volta ao que era
        conexao(false, error.message);
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

    if (TIPO !== "usuario" || !com || com === EU.id) return null;

    let nome = params.get("nome") || "";
    try {
        const { data } = await supabase.from("profissionais").select("nome").eq("id", com).maybeSingle();
        if (data?.nome) nome = data.nome;
    } catch { /* usa o nome da URL */ }

    const { data, error } = await supabase
        .from("conversas")
        .upsert(
            {
                usuario_id: EU.id,
                profissional_id: com,
                usuario_nome: EU.nome,
                profissional_nome: nome || "Profissional",
                salvo_usuario: true
            },
            { onConflict: "usuario_id,profissional_id" }
        )
        .select("id")
        .single();

    if (error) {
        console.warn("[Mensagens] Não foi possível abrir a conversa:", error.message);
        conexao(false, "Não foi possível abrir a conversa com este profissional.");
        return null;
    }

    return data.id;
}

/* ---------- Carregar do servidor ---------- */
let carregando = false;
let recarregar = false;

async function carregar() {
    if (carregando) { recarregar = true; return; }
    carregando = true;

    try {
        const { data: linhas, error } = await supabase.from("conversas").select("*");
        if (error) throw error;

        const ids = linhas.map((l) => l.id);
        let mensagens = [];

        if (ids.length) {
            const r = await supabase
                .from("mensagens")
                .select("*")
                .in("conversa_id", ids)
                .order("criado_em", { ascending: false })
                .limit(1000);
            if (r.error) throw r.error;
            mensagens = r.data.reverse();
        }

        // mensagens que ainda estão sendo enviadas não podem sumir da tela
        const pendentes = conversas.flatMap((c) =>
            c.mensagens.filter((m) => m.pendente).map((m) => ({ ...m, conversaId: c.id })));

        conversas = linhas.map((l) =>
            mapearConversa(l, mensagens.filter((m) => m.conversa_id === l.id)));

        pendentes.forEach((p) => {
            const c = conversas.find((x) => x.id === p.conversaId);
            if (c) c.mensagens.push({ id: p.id, de: p.de, texto: p.texto, ts: p.ts, pendente: true });
        });

        conexao(true);
    } catch (e) {
        console.warn("[Mensagens] carregar:", e.message || e);
        conexao(false, e.message);
        carregando = false;
        return;
    }

    carregando = false;

    if (ativaId && conversaAtiva()) {
        if (!document.hidden) marcarLida(ativaId);
        renderMensagens();
        renderCabecalhoChat();
    }
    renderLista();

    if (recarregar) { recarregar = false; carregar(); }
}

/* ---------- Tempo real ---------- */
function receberMensagem(linha) {
    const c = conversas.find((x) => x.id === linha.conversa_id);
    if (!c) { carregar(); return; }                // conversa nova que ainda não conheço
    if (c.mensagens.some((m) => m.id === linha.id)) return;

    const nova = mapearMensagem(linha);
    let substituiu = false;

    if (linha.remetente_id === EU.id) {
        // é a minha própria mensagem voltando: troca a "pendente" pela real
        const i = c.mensagens.findIndex((m) => m.pendente && m.texto === nova.texto);
        if (i >= 0) { c.mensagens.splice(i, 1); substituiu = true; }
    } else {
        delete digitandoDe[contato(c).id];
    }

    c.mensagens.push(nova);

    if (c.id === ativaId) {
        if (nova.de !== TIPO && !document.hidden) marcarLida(c.id);
        renderMensagens(substituiu);
        renderCabecalhoChat();
    }
    renderLista();
}

function aplicarConversa(linha) {
    const c = conversas.find((x) => x.id === linha.id);
    if (!c) { carregar(); return; }

    c.lido = { usuario: ts(linha.lido_usuario), profissional: ts(linha.lido_profissional) };
    c.salvo = { usuario: !!linha.salvo_usuario, profissional: !!linha.salvo_profissional };
    if (linha.usuario_nome) c.usuario.nome = linha.usuario_nome;
    if (linha.profissional_nome) c.profissional.nome = linha.profissional_nome;

    if (c.id === ativaId) {
        renderBotaoSalvar();
        renderMensagens();                         // atualiza os ✓✓ quando o outro lado lê
    }
    renderLista();
}

function ouvirServidor() {
    if (ouvindo) return;
    ouvindo = true;

    // novas mensagens / conversas (o Supabase só envia o que a RLS deixa esta pessoa ver)
    supabase
        .channel(`mensagens-${EU.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagens" }, (p) => receberMensagem(p.new))
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversas" }, () => carregar())
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversas" }, (p) => aplicarConversa(p.new))
        .subscribe((status) => {
            if (status === "SUBSCRIBED") {
                conexao(true);
                carregar();                        // também roda quando reconecta
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
                conexao(false, "Reconectando ao chat...");
            }
        });

    // online/offline e "digitando..."
    const sala = supabase.channel("sala-chat", { config: { presence: { key: EU.id } } });

    sala
        .on("presence", { event: "sync" }, () => {
            online = new Set(Object.keys(sala.presenceState()));
            renderCabecalhoChat();
            renderLista();
        })
        .on("broadcast", { event: "digitando" }, ({ payload }) => {
            if (!payload || payload.para !== EU.id) return;
            digitandoDe[payload.de] = Date.now();
            renderCabecalhoChat();
            renderLista();
            setTimeout(() => { renderCabecalhoChat(); renderLista(); }, 3100);
        })
        .subscribe(async (status) => {
            if (status === "SUBSCRIBED") await sala.track({ tipo: TIPO, em: Date.now() });
        });

    window.avisarDigitando = (paraId) => {
        if (Date.now() - ultimoAvisoDigitando < 2000) return;
        ultimoAvisoDigitando = Date.now();
        sala.send({ type: "broadcast", event: "digitando", payload: { de: EU.id, para: paraId } });
    };
}

setInterval(() => { if (supabase && EU.id) carregar(); }, 30000);   // garantia, caso algum aviso se perca

// ao voltar para a aba, o que chegou enquanto ela estava escondida vira "lido"
document.addEventListener("visibilitychange", () => {
    if (!document.hidden && ativaId) {
        marcarLida(ativaId);
        renderLista();
    }
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
$("btnSalvar").addEventListener("click", alternarContato);

$("chatAvatar").addEventListener("click", abrirPerfil);
$("chatNome").addEventListener("click", abrirPerfil);

$("formMsg").addEventListener("submit", (e) => { e.preventDefault(); enviar(); });

$("texto").addEventListener("input", () => {
    ajustarCampo();
    const c = conversaAtiva();
    if (c && $("texto").value && window.avisarDigitando) window.avisarDigitando(contato(c).id);
});

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
        const logado = await carregarIdentidade();

        if (typeof Conta !== "undefined") Conta.renderMenu("mensagem");
        configurarTextos();

        if (!logado) {
            atualizarLista('<p class="sem-resultado">Entre na sua conta para ver as mensagens. <a href="./Login.html">Entrar</a></p>');
            return;
        }

        // ?com=ID&nome=Nome  -> usuário abrindo conversa com um profissional
        // ?conversa=ID       -> link vindo da notificação
        const params = new URLSearchParams(location.search);
        const idInicial = (await garantirConversa()) || params.get("conversa");

        await carregar();
        ouvirServidor();

        $("area").classList.remove("chat-aberto");
        if (idInicial && conversas.find((c) => c.id === idInicial)) abrirConversa(idInicial);
        if (params.has("com") || params.has("conversa")) history.replaceState(null, "", location.pathname);
    } catch (e) {
        console.warn("[Mensagens] iniciar:", e.message || e);
        conexao(false, e.message);
        atualizarLista('<p class="sem-resultado">Não foi possível carregar as conversas.</p>');
        setTimeout(iniciar, 4000);
    }
}

iniciar();