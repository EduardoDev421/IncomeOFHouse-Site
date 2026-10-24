if (typeof Conta !== "undefined") Conta.renderMenu("agendamentos");

const TIPOS = {
    visita: "Visita ao imóvel",
    reuniao: "Reunião",
    entrega: "Entrega de projeto",
    consultoria: "Consultoria"
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
let proximoId = 100;

// Dados de exemplo (trocar por dados reais da API/banco depois)
const seed = [
    [3, "09:00", 60, "Briefing do projeto", "reuniao", "Carlos Silva", "confirmado"],
    [7, "14:30", 90, "Visita ao terreno", "visita", "Juliana Martins", "confirmado"],
    [11, "10:00", 60, "Consultoria de viabilidade", "consultoria", "Rafael Costa", "pendente"],
    [11, "16:00", 60, "Alinhamento de plantas", "reuniao", "Fernanda Lima", "confirmado"],
    [15, "11:00", 30, "Entrega da planta baixa", "entrega", "Fernanda Lima", "confirmado"],
    [18, "15:00", 60, "Visita ao imóvel", "visita", "Carlos Silva", "pendente"],
    [22, "09:30", 60, "Projeto de interiores", "reuniao", "Lucas Pereira", "confirmado"],
    [22, "13:00", 90, "Vistoria da obra", "visita", "Juliana Martins", "pendente"],
    [22, "17:00", 60, "Consultoria de retorno", "consultoria", "Rafael Costa", "confirmado"],
    [27, "10:30", 30, "Entrega do projeto final", "entrega", "Carlos Silva", "pendente"]
];

let eventos = seed.map(([dia, hora, dur, titulo, tipo, prof, status], i) => ({
    id: i + 1,
    data: fmt(new Date(hoje.getFullYear(), hoje.getMonth(), dia)),
    hora, dur, titulo, tipo, prof, status
}));

/* ---------- Consultas ---------- */
const visiveis = () => eventos.filter((e) => filtro === "todos" || e.tipo === filtro);
const doDia = (data) => visiveis().filter((e) => e.data === data).sort((a, b) => a.hora.localeCompare(b.hora));

const ocupado = (data, ini, dur) =>
    eventos.some((e) => e.data === data &&
        minutos(e.hora) < minutos(ini) + dur && minutos(ini) < minutos(e.hora) + e.dur);

function passou(data, hora) {
    if (data < hojeStr) return true;
    return data === hojeStr && minutos(hora) <= hoje.getHours() * 60 + hoje.getMinutes();
}

/* ---------- Renderização ---------- */
function renderResumo() {
    const mes = eventos.filter((e) => {
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
                <span class="selo ${e.status}">${e.status === "confirmado" ? "Confirmado" : "Pendente"}</span>
                <button class="btn-remover" data-id="${e.id}" aria-label="Remover agendamento">×</button>
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
$("mesAnterior").onclick = () => { ref = new Date(ref.getFullYear(), ref.getMonth() - 1, 1); render(); };
$("mesSeguinte").onclick = () => { ref = new Date(ref.getFullYear(), ref.getMonth() + 1, 1); render(); };

$("btnHoje").onclick = () => {
    ref = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    selecionado = hojeStr;
    render();
};

$("grade").addEventListener("click", (e) => {
    const dia = e.target.closest(".dia");
    if (!dia) return;
    selecionado = dia.dataset.data;
    const d = parse(selecionado);
    if (d.getMonth() !== ref.getMonth()) ref = new Date(d.getFullYear(), d.getMonth(), 1);
    $("msgAgendar").textContent = "";
    render();
});

$("filtros").addEventListener("click", (e) => {
    const b = e.target.closest(".filtro");
    if (!b) return;
    document.querySelectorAll(".filtro").forEach((x) => x.classList.remove("ativo"));
    b.classList.add("ativo");
    filtro = b.dataset.tipo;
    render();
});

$("listaDia").addEventListener("click", (e) => {
    const b = e.target.closest(".btn-remover");
    if (!b) return;
    eventos = eventos.filter((ev) => ev.id !== Number(b.dataset.id));
    render();
});

$("durMenos").onclick = () => { duracao = Math.max(30, duracao - 30); $("durValor").textContent = duracao; renderSlots(); };
$("durMais").onclick = () => { duracao = Math.min(240, duracao + 30); $("durValor").textContent = duracao; renderSlots(); };

$("slots").addEventListener("click", (e) => {
    const b = e.target.closest(".slot");
    if (!b || b.disabled) return;
    horaSel = b.dataset.hora;
    renderSlots();
});

$("btnAgendar").onclick = () => {
    if (!horaSel) return;
    const tipo = $("fTipo").value;
    const titulo = $("fTitulo").value.trim() || TIPOS[tipo];

    eventos.push({
        id: proximoId++,
        data: selecionado,
        hora: horaSel,
        dur: duracao,
        titulo,
        tipo,
        prof: $("fProf").value.trim(),
        status: "pendente"
    });

    $("msgAgendar").textContent = `Agendado: ${titulo}, das ${horaSel} às ${fimDe(horaSel, duracao)}.`;
    $("fTitulo").value = "";
    horaSel = null;
    filtro = "todos";
    document.querySelectorAll(".filtro").forEach((x) => x.classList.toggle("ativo", x.dataset.tipo === "todos"));
    render();
};

render();