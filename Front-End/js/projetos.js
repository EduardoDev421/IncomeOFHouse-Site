const $ = (id) => document.getElementById(id);

const esc = (t) =>
    String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Dados de exemplo (trocar por dados reais da API/banco depois)
// status: "concluido" | "andamento" | "cancelado" | datas: AAAA-MM-DD | foto: caminho da imagem (opcional)
const projetos = [
    { id: 1, nome: "Projeto Arquitetônico Residencial", cliente: "Mariana Souza", tipo: "Residencial", status: "andamento", inicio: "2026-09-12", fim: "", valor: 2800, area: 180, local: "Brasília - DF", nota: null, foto: "" },
    { id: 2, nome: "Reforma e Ampliação", cliente: "Paulo Mendes", tipo: "Reforma", status: "concluido", inicio: "2026-05-28", fim: "2026-09-20", valor: 15600, area: 95, local: "Taguatinga - DF", nota: 3, foto: "" },
    { id: 3, nome: "Planta Baixa - Sobrado", cliente: "Camila Ferreira", tipo: "Residencial", status: "concluido", inicio: "2026-05-03", fim: "2026-06-18", valor: 1750, area: 140, local: "Goiânia - GO", nota: 4, foto: "" },
    { id: 4, nome: "Projeto de Interiores - Sala", cliente: "Fernando Lima", tipo: "Interiores", status: "concluido", inicio: "2026-04-20", fim: "2026-05-30", valor: 3400, area: 38, local: "Brasília - DF", nota: 4, foto: "" },
    { id: 5, nome: "Consultoria de Viabilidade", cliente: "Rafael Costa", tipo: "Consultoria", status: "cancelado", inicio: "2026-05-15", fim: "", valor: 950, area: 0, local: "Online", nota: null, foto: "" },
    { id: 6, nome: "Loja Comercial Centro", cliente: "Letícia Gomes", tipo: "Comercial", status: "concluido", inicio: "2026-02-10", fim: "2026-04-12", valor: 8900, area: 120, local: "Águas Claras - DF", nota: 5, foto: "" },
    { id: 7, nome: "Kitnet para Locação", cliente: "Ricardo Alves", tipo: "Residencial", status: "concluido", inicio: "2026-01-15", fim: "2026-02-25", valor: 2200, area: 28, local: "Asa Norte - DF", nota: 5, foto: "" },
    { id: 8, nome: "Reforma de Cozinha", cliente: "Beatriz Nunes", tipo: "Reforma", status: "andamento", inicio: "2026-10-01", fim: "", valor: 6400, area: 22, local: "Lago Sul - DF", nota: null, foto: "" }
];

const STATUS = { concluido: "Concluído", andamento: "Em andamento", cancelado: "Cancelado" };

let filtroStatus = "todos";
let filtroTipo = "todos";
let ordem = "recentes";
let termo = "";

const dataBR = (s) => (s ? s.split("-").reverse().join("/") : "");
const moeda = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ICONE = '<svg viewBox="0 0 24 24"><path d="M5 20V8l7-5 7 5v12"></path><path d="M9 20v-6h6v6"></path><path d="M8 9h1M15 9h1M8 12h1M15 12h1"></path></svg>';

/* ---------- Filtros ---------- */
function filtrados() {
    const l = projetos.filter((p) =>
        (filtroStatus === "todos" || p.status === filtroStatus) &&
        (filtroTipo === "todos" || p.tipo === filtroTipo) &&
        `${p.nome} ${p.cliente}`.toLowerCase().includes(termo));

    const cmp = {
        recentes: (a, b) => b.inicio.localeCompare(a.inicio),
        antigos: (a, b) => a.inicio.localeCompare(b.inicio),
        valor: (a, b) => b.valor - a.valor,
        nome: (a, b) => a.nome.localeCompare(b.nome, "pt-BR")
    }[ordem];

    return l.sort(cmp);
}

/* ---------- Renderização ---------- */
function renderResumo() {
    const conc = projetos.filter((p) => p.status === "concluido");
    $("resTotal").textContent = projetos.length;
    $("resConc").textContent = conc.length;
    $("resAnd").textContent = projetos.filter((p) => p.status === "andamento").length;
    $("resValor").textContent = moeda(conc.reduce((s, p) => s + p.valor, 0));
}

function renderTipos() {
    const tipos = [...new Set(projetos.map((p) => p.tipo))].sort();
    $("selTipo").innerHTML = '<option value="todos">Todos os tipos</option>' +
        tipos.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("");
}

function renderCard(p) {
    const periodo = p.status === "concluido" ? `${dataBR(p.inicio)} a ${dataBR(p.fim)}`
                  : p.status === "andamento" ? `Desde ${dataBR(p.inicio)}`
                  : `Pedido em ${dataBR(p.inicio)}`;

    const nota = p.nota
        ? `<span class="nota" aria-label="Nota ${p.nota} de 5">${"★".repeat(p.nota)}${"☆".repeat(5 - p.nota)}</span>`
        : `<span class="nota sem">${p.status === "concluido" ? "Sem avaliação" : "—"}</span>`;

    return `
        <article class="projeto">
            <div class="thumb">
                ${p.foto ? `<img src="${esc(p.foto)}" alt="${esc(p.nome)}" onerror="this.remove()">` : ""}
                ${ICONE}
                <span class="status ${p.status}">${STATUS[p.status]}</span>
            </div>
            <div class="corpo">
                <h3>${esc(p.nome)}</h3>
                <span class="cliente">Cliente: ${esc(p.cliente)}</span>
                <span class="tag">${esc(p.tipo)}</span>
                <div class="meta">
                    <div><small>Local</small><span>${esc(p.local)}</span></div>
                    <div><small>Área</small><span>${p.area ? p.area + " m²" : "—"}</span></div>
                    <div><small>Período</small><span>${periodo}</span></div>
                    <div><small>Valor</small><span>${moeda(p.valor)}</span></div>
                </div>
                <div class="rodape-card">
                    ${nota}
                    <a href="DetalheProjeto.html?id=${p.id}" class="btn-detalhes">Ver detalhes</a>
                </div>
            </div>
        </article>`;
}

function renderLista() {
    const l = filtrados();
    $("contagem").textContent = `Mostrando ${l.length} de ${projetos.length} projetos`;
    $("grade").innerHTML = l.length
        ? l.map(renderCard).join("")
        : '<div class="vazio">Nenhum projeto encontrado com esses filtros.</div>';
}

/* ---------- Eventos ---------- */
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

renderResumo();
renderTipos();
renderLista();