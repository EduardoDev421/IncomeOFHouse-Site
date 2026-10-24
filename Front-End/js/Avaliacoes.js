const $ = (id) => document.getElementById(id);

const esc = (t) =>
    String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Dados de exemplo (trocar por dados reais da API/banco depois)
// tipo: "planta" ou "projeto" | nota: 1 a 5 | data: AAAA-MM-DD
let avaliacoes = [
    { id: 1, item: "Planta Casa Térrea 3 Quartos", tipo: "planta", autor: "Mariana Souza", nota: 5, data: "2026-10-09", texto: "Planta muito bem pensada, os cômodos têm ótima circulação e coube certinho no meu terreno.", resposta: "Obrigado, Mariana! Fico feliz que tenha servido bem para o seu terreno." },
    { id: 2, item: "Projeto Residencial Jardim", tipo: "projeto", autor: "Ricardo Alves", nota: 5, data: "2026-10-05", texto: "Entrega no prazo e comunicação excelente durante todo o projeto.", resposta: "" },
    { id: 3, item: "Planta Sobrado Moderno", tipo: "planta", autor: "Camila Ferreira", nota: 4, data: "2026-09-28", texto: "Layout moderno e bonito. Só senti falta de mais detalhes na parte elétrica.", resposta: "" },
    { id: 4, item: "Reforma Apartamento Centro", tipo: "projeto", autor: "Paulo Mendes", nota: 3, data: "2026-09-20", texto: "O resultado ficou bom, mas houve atraso na entrega da primeira etapa.", resposta: "Paulo, obrigado pelo retorno. Vamos ajustar o cronograma nos próximos projetos." },
    { id: 5, item: "Planta Kitnet Compacta", tipo: "planta", autor: "Letícia Gomes", nota: 5, data: "2026-09-14", texto: "Perfeita para investimento em aluguel. Aproveitou muito bem cada metro quadrado.", resposta: "" },
    { id: 6, item: "Projeto de Interiores Sala", tipo: "projeto", autor: "Fernando Lima", nota: 4, data: "2026-09-02", texto: "Ficou elegante e funcional. Recomendo.", resposta: "" },
    { id: 7, item: "Planta Casa Térrea 3 Quartos", tipo: "planta", autor: "Juliana Prado", nota: 4, data: "2026-08-25", texto: "Gostei bastante da planta, poderia ter uma opção com garagem dupla.", resposta: "" },
    { id: 8, item: "Projeto Residencial Jardim", tipo: "projeto", autor: "André Barros", nota: 2, data: "2026-08-11", texto: "Tive dificuldade para receber os arquivos finais e precisei pedir mais de uma vez.", resposta: "" },
    { id: 9, item: "Planta Sobrado Moderno", tipo: "planta", autor: "Beatriz Nunes", nota: 5, data: "2026-07-30", texto: "Linda! Os ambientes integrados deixaram a casa muito iluminada.", resposta: "Muito obrigado, Beatriz!" },
    { id: 10, item: "Reforma Apartamento Centro", tipo: "projeto", autor: "Thiago Rocha", nota: 5, data: "2026-07-18", texto: "Transformou o apartamento. Profissional atencioso e muito criativo.", resposta: "" }
];

let filtroTipo = "todos";
let filtroItem = "todos";
let filtroNota = 0;
let ordem = "recentes";
let respondendoId = null;

const estrelas = (n) =>
    `<span class="estrelas" aria-label="${n} de 5 estrelas">${[1, 2, 3, 4, 5]
        .map((i) => `<span class="${i <= n ? "cheia" : ""}">★</span>`).join("")}</span>`;

const virgula = (n) => n.toFixed(1).replace(".", ",");
const dataBR = (s) => s.split("-").reverse().join("/");
const iniciais = (nome) => nome.trim().charAt(0).toUpperCase();

/* ---------- Dados filtrados ---------- */
// Base do resumo: respeita tipo e item, mas não a nota (para a distribuição fazer sentido)
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

/* ---------- Renderização ---------- */
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

    $("mediaNota").textContent = virgula(media);
    $("mediaEstrelas").innerHTML = estrelas(Math.round(media));
    $("mediaTotal").textContent = `${l.length} avaliaç${l.length === 1 ? "ão" : "ões"}`;

    $("distribuicao").innerHTML = [5, 4, 3, 2, 1].map((n) => {
        const qtd = l.filter((a) => a.nota === n).length;
        const pct = l.length ? (qtd / l.length) * 100 : 0;
        return `<div class="dist-linha"><span>${n} ★</span><div class="barra"><i style="width:${pct}%"></i></div><small>${qtd}</small></div>`;
    }).join("");
}

function renderLista() {
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
                           <textarea id="txtResposta" maxlength="400" placeholder="Escreva sua resposta ao cliente"></textarea>
                           <div><button data-acao="enviar">Enviar resposta</button><button class="cancelar" data-acao="cancelar">Cancelar</button></div>
                       </div>`
                    : a.resposta ? "" : '<button class="btn-responder" data-acao="responder">Responder</button>'}
            </div>
            <div class="av-lado">
                ${estrelas(a.nota)}
                <small>${dataBR(a.data)}</small>
            </div>
        </article>`).join("")
        : '<div class="vazio">Nenhuma avaliação encontrada com esses filtros.</div>';

    if (respondendoId) { const t = $("txtResposta"); if (t) t.focus(); }
}

function render() {
    renderItens();
    renderResumo();
    renderLista();
}

/* ---------- Eventos ---------- */
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

$("lista").addEventListener("click", (e) => {
    const b = e.target.closest("[data-acao]");
    if (!b) return;
    const id = Number(b.closest(".avaliacao").dataset.id);

    if (b.dataset.acao === "responder") respondendoId = id;
    if (b.dataset.acao === "cancelar") respondendoId = null;

    if (b.dataset.acao === "enviar") {
        const texto = $("txtResposta").value.trim();
        if (!texto) return;
        avaliacoes.find((a) => a.id === id).resposta = texto;
        respondendoId = null;
    }
    renderLista();
});

render();