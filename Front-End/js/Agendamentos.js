import { supabase } from "./lib/supabaseClient.js";

if (typeof Conta !== "undefined") Conta.renderMenu("agendamentos");

// Ajuste aqui se a tabela de profissionais usar outros nomes
const PROF = { tabela: "profissionais", nome: "nome" };

const TIPOS = {
    visita: "Visita ao imóvel",
    reuniao: "Reunião",
    entrega: "Entrega de projeto",
    consultoria: "Consultoria"
};

const STATUS = {
    pendente: "Pendente",
    confirmado: "Confirmado",
    recusado: "Recusado",
    cancelado: "Cancelado",
    concluido: "Concluído"
};

const $ = (id) => document.getElementById(id);

const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const parse = (s) => {
    const [a, m, d] = s.split("-").map(Number);
    return new Date(a, m - 1, d);
};

const esc = (t) =>
    String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const minutos = (h) => { const [a, b] = h.split(":").map(Number); return a * 60 + b; };
const hhmm = (t) => `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
const fimDe = (hora, dur) => hhmm(minutos(hora) + dur);

/* ---------- Estado ---------- */
const hoje = new Date();
const hojeStr = fmt(hoje);
let ref = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
let selecionado = hojeStr;
let filtro = "todos";
let duracao = 30;
let horaSel = null;
let usuarioId = null;
let eventos = [];
let cargaAtual = 0;

/* ---------- Mensagens ---------- */
function aviso(texto, erro = false) {
    const el = $("msgAgendar");
    el.textContent = texto;
    el.style.color = erro ? "#c0392b" : "";
}

const textoErro = (error) => error?.message || "Ocorreu um erro inesperado.";

/* ---------- Supabase ---------- */
async function carregarProfissionais() {
    const { data, error } = await supabase
        .from(PROF.tabela)
        .select(`id, ${PROF.nome}`)
        .order(PROF.nome);

    const sel = $("fProf");
    if (error) {
        sel.innerHTML = `<option value="">Não foi possível carregar</option>`;
        aviso(textoErro(error), true);
        return;
    }
    sel.innerHTML = `<option value="">Selecione</option>` +
        (data || []).map((p) => `<option value="${p.id}">${esc(p[PROF.nome] ?? "Sem nome")}</option>`).join("");
}

async function carregarEventos() {
    const token = ++cargaAtual;
    const ano = ref.getFullYear();
    const mes = ref.getMonth();
    const primeiro = new Date(ano, mes, 1);
    const ultimo = new Date(ano, mes + 1, 0);
    const inicio = fmt(new Date(ano, mes, 1 - primeiro.getDay()));
    const fim = fmt(new Date(ano, mes + 1, 6 - ultimo.getDay()));

    const { data, error } = await supabase
        .from("agendamentos")
        .select(`id, data, hora_inicio, duracao_min, titulo, tipo, status, profissional_id, ${PROF.tabela}(${PROF.nome})`)
        .gte("data", inicio)
        .lte("data", fim)
        .order("data")
        .order("hora_inicio");

    if (token !== cargaAtual) return; // chegou uma carga mais nova
    if (error) {
        aviso(textoErro(error), true);
        return;
    }

    eventos = (data || []).map((a) => ({
        id: a.id,
        data: a.data,
        hora: String(a.hora_inicio).slice(0, 5),
        dur: a.duracao_min,
        titulo: a.titulo,
        tipo: a.tipo,
        status: a.status,
        prof: a[PROF.tabela]?.[PROF.nome] || ""
    }));
    render();
}

/* ---------- Consultas ---------- */
const ativos = () => eventos.filter((e) => e.status !== "cancelado" && e.status !== "recusado");
const visiveis = () => ativos().filter((e) => filtro === "todos" || e.tipo === filtro);
const doDia = (data) => visiveis().filter((e) => e.data === data).sort((a, b) => a.hora.localeCompare(b.hora));

const ocupado = (data, ini, dur) =>
    ativos().some((e) => e.data === data &&
        minutos(e.hora) < minutos(ini) + dur && minutos(ini) < minutos(e.hora) + e.dur);

function passou(data, hora) {
    if (data < hojeStr) return true;
    return data === hojeStr && minutos(hora) <= hoje.getHours() * 60 + hoje.getMinutes();
}

/* ---------- Renderização ---------- */
function renderResumo() {
    const mes = ativos().filter((e) => {
        const d = parse(e.data);
        return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
    });
    const conf = mes.filter((e) => e.status === "confirmado").length;
    $("resumo").innerHTML =
        `<strong>${mes.length}</strong> neste mês · <strong>${conf}</strong> confirmados · <strong>${mes.length - conf}</strong> pendentes`;
}

function renderGrade() {
    const ano = ref.getFullYear();
    const mes = ref.getMonth();
    $("tituloMes").textContent = ref.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

    const inicio = new Date(ano, mes, 1).getDay();
    const total = Math.ceil((inicio + new Date(ano, mes + 1, 0).getDate()) / 7) * 7;
    let html = "";

    for (let i = 0; i < total; i++) {
        const d = new Date(ano, mes, i - inicio + 1);
        const data = fmt(d);
        const lista = doDia(data);
        const c = ["dia"];

        if (d.getMonth() !== mes) c.push("outro");
        if (data < hojeStr) c.push("passado");
        if (data === hojeStr) c.push("hoje");
        if (data === selecionado) c.push("sel");

        const chips = lista.slice(0, 3).map((e) =>
            `<div class="evento"><i class="${e.tipo}"></i><span>${e.hora} ${esc(e.titulo)}</span></div>`).join("");
        const resto = lista.length > 3 ? `<div class="mais">+${lista.length - 3} mais</div>` : "";

        html += `<button class="${c.join(" ")}" data-data="${data}"><span class="num">${d.getDate()}</span>${chips}${resto}</button>`;
    }
    $("grade").innerHTML = html;
}

function renderLateral() {
    const d = parse(selecionado);
    const lista = doDia(selecionado);

    $("diaNum").textContent = d.getDate();
    $("diaSemana").textContent = d.toLocaleDateString("pt-BR", { weekday: "long" });
    $("diaMes").textContent = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

    $("listaDia").innerHTML = lista.length
        ? lista.map((e) => `
            <div class="item-evento ${e.tipo}">
                <span class="hora">${e.hora} – ${fimDe(e.hora, e.dur)}</span>
                <strong>${esc(e.titulo)}</strong>
                <small>${TIPOS[e.tipo]}${e.prof ? " · " + esc(e.prof) : ""}</small>
                <span class="selo ${e.status}">${STATUS[e.status] || esc(e.status)}</span>
                ${e.status === "pendente"
                    ? `<button class="btn-remover" data-id="${e.id}" aria-label="Cancelar agendamento">×</button>`
                    : ""}
            </div>`).join("")
        : `<p class="vazio">Nenhum compromisso neste dia.</p>`;
}

function renderSlots() {
    let html = "";
    let livres = 0;

    for (let t = 8 * 60; t + duracao <= 20 * 60; t += 30) {
        const h = hhmm(t);
        const indisponivel = passou(selecionado, h) || ocupado(selecionado, h, duracao);
        if (indisponivel && h === horaSel) horaSel = null;
        if (!indisponivel) livres++;
        html += `<button class="slot${h === horaSel ? " sel" : ""}" data-hora="${h}" ${indisponivel ? "disabled" : ""}>${h}</button>`;
    }
    $("slots").innerHTML = html;

    $("agendarInfo").textContent = horaSel
        ? `Das ${horaSel} às ${fimDe(horaSel, duracao)} (${duracao} min).`
        : livres ? `${livres} horários livres neste dia. Escolha um.` : "Sem horários livres neste dia.";

    $("btnAgendar").disabled = !horaSel;
}

function render() {
    renderResumo();
    renderGrade();
    renderLateral();
    renderSlots();
}

/* ---------- Eventos ---------- */
function mudarMes(delta) {
    ref = new Date(ref.getFullYear(), ref.getMonth() + delta, 1);
    render();
    carregarEventos();
}

$("mesAnterior").onclick = () => mudarMes(-1);
$("mesSeguinte").onclick = () => mudarMes(1);

$("btnHoje").onclick = () => {
    ref = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    selecionado = hojeStr;
    render();
    carregarEventos();
};

$("grade").addEventListener("click", (e) => {
    const dia = e.target.closest(".dia");
    if (!dia) return;
    selecionado = dia.dataset.data;
    const d = parse(selecionado);
    const mudouMes = d.getMonth() !== ref.getMonth();
    if (mudouMes) ref = new Date(d.getFullYear(), d.getMonth(), 1);
    aviso("");
    render();
    if (mudouMes) carregarEventos();
});

$("filtros").addEventListener("click", (e) => {
    const b = e.target.closest(".filtro");
    if (!b) return;
    document.querySelectorAll(".filtro").forEach((x) => x.classList.remove("ativo"));
    b.classList.add("ativo");
    filtro = b.dataset.tipo;
    render();
});

// "×" cancela (apaga) um agendamento pendente do próprio usuário
$("listaDia").addEventListener("click", async (e) => {
    const b = e.target.closest(".btn-remover");
    if (!b) return;
    b.disabled = true;

    const { error } = await supabase.from("agendamentos").delete().eq("id", b.dataset.id);
    if (error) {
        b.disabled = false;
        aviso(textoErro(error), true);
        return;
    }
    aviso("Agendamento cancelado.");
    await carregarEventos();
});

$("durMenos").onclick = () => { duracao = Math.max(30, duracao - 30); $("durValor").textContent = duracao; renderSlots(); };
$("durMais").onclick = () => { duracao = Math.min(240, duracao + 30); $("durValor").textContent = duracao; renderSlots(); };

$("slots").addEventListener("click", (e) => {
    const b = e.target.closest(".slot");
    if (!b || b.disabled) return;
    horaSel = b.dataset.hora;
    renderSlots();
});

$("btnAgendar").onclick = async () => {
    if (!horaSel) return;

    const profissionalId = $("fProf").value;
    if (!profissionalId) {
        aviso("Selecione um profissional.", true);
        return;
    }

    const tipo = $("fTipo").value;
    const titulo = $("fTitulo").value.trim() || TIPOS[tipo];
    const hora = horaSel;

    $("btnAgendar").disabled = true;
    const { error } = await supabase.from("agendamentos").insert({
        usuario_id: usuarioId,
        profissional_id: profissionalId,
        titulo,
        tipo,
        data: selecionado,
        hora_inicio: hora,
        duracao_min: duracao,
        status: "pendente"
    });

    if (error) {
        aviso(textoErro(error), true);
        renderSlots();
        return;
    }

    aviso(`Agendado: ${titulo}, das ${hora} às ${fimDe(hora, duracao)}. Aguardando confirmação do profissional.`);
    $("fTitulo").value = "";
    horaSel = null;
    filtro = "todos";
    document.querySelectorAll(".filtro").forEach((x) => x.classList.toggle("ativo", x.dataset.tipo === "todos"));
    await carregarEventos();
};

/* ---------- Início ---------- */
async function iniciar() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = "./login.html";
        return;
    }
    usuarioId = session.user.id;

    render(); // calendário vazio já aparece enquanto carrega
    await Promise.all([carregarProfissionais(), carregarEventos()]);
}

iniciar();