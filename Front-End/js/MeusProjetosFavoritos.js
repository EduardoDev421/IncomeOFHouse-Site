// Front-End/js/MeusProjetosFavoritos.js
// Carregado como módulo: <script type="module" src="../js/MeusProjetosFavoritos.js"></script>
// Favoritos reais: tabela favoritos (usuario_id, planta_id) + dados da tabela plantas. Sem localStorage.
import { supabase } from "./lib/supabaseClient.js";

/* ---------- Configuração ---------- */
// Colunas candidatas na tabela plantas (usa a primeira que existir na linha)
const CAND = {
    titulo: ["titulo", "nome", "nome_planta", "name"],
    tipo: ["tipo", "categoria", "tipo_projeto", "finalidade"],
    area: ["area", "area_total", "area_m2", "metragem"],
    valor: ["valor", "preco", "preço"],
    nota: ["nota", "media_avaliacao", "avaliacao", "estrelas"],
    imagem: ["imagem_url", "imagem", "foto_url", "capa_url", "url_imagem"],
    profissional: ["profissional_id"],
    profNome: ["nome", "nome_completo", "nome_fantasia", "razao_social"],
    avaliacaoNota: ["nota", "estrelas", "avaliacao", "valor"]
};

/* ---------- Estado ---------- */
let usuarioId = null;
let projetos = [];
let tipoAtual = "todos";

const $ = (id) => document.getElementById(id);
const grade = $("grade");
const vazio = $("semProjetos");
const contagem = $("contagem");
const busca = $("busca");
const selOrdem = $("selOrdem");
const chips = $("chips");

/* ---------- Utilidades ---------- */
const esc = (t) =>
    String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const normalizar = (t) =>
    String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const primeiro = (obj, candidatos) => {
    if (!obj) return "";
    const chave = candidatos.find((c) => obj[c] !== undefined && obj[c] !== null && obj[c] !== "");
    return chave ? obj[chave] : "";
};

const unicos = (itens) => [...new Set(itens.filter((x) => x !== null && x !== undefined && x !== ""))];

const numero = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const moeda = (v) =>
    numero(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// Grupo do projeto para os chips e o resumo
function grupoTipo(tipo) {
    const n = normalizar(tipo);
    if (n.includes("resid")) return "residencial";
    if (n.includes("comerc")) return "comercial";
    if (n.includes("reform")) return "reforma";
    return "outro";
}

// Traduz os erros do Supabase/Postgres. O texto original (em inglês) fica só no console.
function textoErro(erro) {
    const m = String(erro?.message || "").toLowerCase();
    if (erro?.code === "PGRST205" || m.includes("could not find the table"))
        return "A tabela de favoritos ainda não existe no Supabase.";
    if (m.includes("column") && (m.includes("does not exist") || m.includes("schema cache")))
        return "Alguma coluna usada nos favoritos não existe no Supabase.";
    if (m.includes("row-level security") || m.includes("permission denied") || m.includes("not authorized"))
        return "Sem permissão para essa operação.";
    if (m.includes("jwt") || m.includes("not authenticated"))
        return "Sua sessão expirou. Entre na sua conta novamente.";
    if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("load failed"))
        return "Sem conexão com o servidor. Tente novamente.";
    return "Não foi possível concluir a operação. Tente novamente.";
}

function avisoGrade(texto, comLinkLogin = false) {
    vazio.hidden = true;
    grade.hidden = false;
    contagem.textContent = "";
    grade.innerHTML =
        `<p style="padding:24px 4px;opacity:.9">${esc(texto)}` +
        (comLinkLogin ? ' <a href="./Login.html" style="color:inherit;text-decoration:underline">Ir para o login</a>' : "") +
        "</p>";
}

/* ---------- Supabase ---------- */
async function consultaSegura(tabela, filtro) {
    try {
        const { data, error } = await filtro(supabase.from(tabela).select("*"));
        if (error) throw error;
        return data || [];
    } catch (erro) {
        console.warn(`[Projetos favoritos] ${tabela}:`, erro?.message || erro);
        return [];
    }
}

async function carregar() {
    const { data: favs, error } = await supabase
        .from("favoritos")
        .select("id, planta_id, criado_em")
        .eq("usuario_id", usuarioId)
        .not("planta_id", "is", null)
        .order("criado_em", { ascending: false });
    if (error) throw error;

    const plantaIds = unicos((favs || []).map((f) => f.planta_id));
    const plantas = plantaIds.length ? await consultaSegura("plantas", (q) => q.in("id", plantaIds)) : [];
    const plantaPorId = new Map(plantas.map((p) => [String(p.id), p]));

    const profIds = unicos(plantas.map((p) => primeiro(p, CAND.profissional)));
    const profs = profIds.length ? await consultaSegura("profissionais", (q) => q.in("id", profIds)) : [];
    const profPorId = new Map(profs.map((p) => [String(p.id), p]));

    // Nota média por planta: coluna da própria planta ou tabela avaliacoes (se tiver planta_id)
    const avaliacoes = plantaIds.length ? await consultaSegura("avaliacoes", (q) => q.in("planta_id", plantaIds)) : [];
    const notasPorPlanta = new Map();
    for (const a of avaliacoes) {
        const n = numero(primeiro(a, CAND.avaliacaoNota));
        if (!n) continue;
        const chave = String(a.planta_id);
        notasPorPlanta.set(chave, [...(notasPorPlanta.get(chave) || []), n]);
    }

    projetos = (favs || []).map((f, indice) => {
        const planta = plantaPorId.get(String(f.planta_id));
        const prof = profPorId.get(String(primeiro(planta, CAND.profissional)));
        const lista = notasPorPlanta.get(String(f.planta_id)) || [];
        const media = lista.length ? lista.reduce((s, n) => s + n, 0) / lista.length : 0;
        const nome = primeiro(planta, CAND.titulo) || "Projeto";
        const profissional = primeiro(prof, CAND.profNome);
        const tipo = primeiro(planta, CAND.tipo);

        return {
            favId: f.id,
            plantaId: f.planta_id,
            nome,
            profissional,
            tipo,
            grupo: grupoTipo(tipo),
            area: numero(primeiro(planta, CAND.area)),
            valor: numero(primeiro(planta, CAND.valor)),
            nota: numero(primeiro(planta, CAND.nota)) || media,
            imagem: primeiro(planta, CAND.imagem),
            ordem: indice, // 0 = favoritado mais recentemente
            busca: normalizar(`${nome} ${profissional}`)
        };
    });

    render();
}

/* ---------- Renderização ---------- */
function atualizarResumo() {
    const total = projetos.length;
    const soma = projetos.reduce((s, p) => s + p.valor, 0);
    $("resTotal").textContent = total;
    $("resRes").textContent = projetos.filter((p) => p.grupo === "residencial").length;
    $("resCom").textContent = projetos.filter((p) => p.grupo === "comercial").length;
    $("resValor").textContent = total ? moeda(Math.round(soma / total)) : "R$ 0";
}

function filtrar() {
    const termo = normalizar(busca.value.trim());
    const lista = projetos.filter((p) => {
        if (tipoAtual !== "todos" && p.grupo !== tipoAtual) return false;
        if (termo && !p.busca.includes(termo)) return false;
        return true;
    });

    const ordem = selOrdem.value;
    lista.sort((a, b) => {
        if (ordem === "valor") return b.valor - a.valor;
        if (ordem === "nota") return b.nota - a.nota;
        if (ordem === "nome") return a.nome.localeCompare(b.nome, "pt-BR");
        return a.ordem - b.ordem; // recentes
    });
    return lista;
}

function renderCard(p) {
    const nota = p.nota > 0
        ? `<span class="nota">★ ${p.nota.toFixed(1)}</span>`
        : '<span class="nota sem">Sem avaliação</span>';

    const imagem = p.imagem
        ? `<img class="foto-projeto" src="${esc(p.imagem)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`
        : "";

    return `
        <article class="projeto" data-fav-id="${esc(p.favId)}">
            <div class="thumb"${p.imagem ? ' style="position:relative;overflow:hidden"' : ""}>
                <svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8"></path><path d="M5 10v10h14V10"></path><path d="M10 20v-6h4v6"></path></svg>
                ${imagem}
                <button type="button" class="btn-remover" data-acao="remover" aria-label="Remover dos favoritos" style="z-index:2">
                    <img src="../img/icones/IconeCoracao.svg" alt="">
                </button>
            </div>
            <div class="corpo">
                <h3>${esc(p.nome)}</h3>
                ${p.profissional ? `<span class="cliente">Por ${esc(p.profissional)}</span>` : ""}
                ${p.tipo ? `<span class="tag">${esc(p.tipo)}</span>` : ""}
                <div class="meta">
                    <div><small>Área</small><span>${p.area ? `${p.area} m²` : "—"}</span></div>
                    <div><small>Valor</small><span>${p.valor ? moeda(p.valor) : "—"}</span></div>
                </div>
                <div class="rodape-card">${nota}
                    <a href="./DetalhesPlanta.html?id=${encodeURIComponent(p.plantaId)}" class="btn-detalhes">Ver Projeto</a>
                </div>
            </div>
        </article>`;
}

function render() {
    const lista = filtrar();
    grade.innerHTML = lista.map(renderCard).join("");

    const semResultado = lista.length === 0;
    vazio.hidden = !semResultado;
    grade.hidden = semResultado;
    if (semResultado) {
        vazio.querySelector("h2").textContent = projetos.length
            ? "Nenhum projeto encontrado"
            : "Você ainda não favoritou nenhum projeto";
    }

    contagem.textContent = semResultado
        ? ""
        : lista.length === 1 ? "1 projeto favorito" : `${lista.length} projetos favoritos`;
    atualizarResumo();
}

// Se a imagem do projeto não carregar, some e fica o ícone padrão por baixo
grade.addEventListener(
    "error",
    (ev) => {
        const img = ev.target;
        if (img?.tagName === "IMG" && img.classList.contains("foto-projeto")) img.remove();
    },
    true
);

/* ---------- Remover dos favoritos ---------- */
grade.addEventListener("click", async (ev) => {
    const botao = ev.target.closest('[data-acao="remover"]');
    if (!botao) return;

    const favId = botao.closest(".projeto").dataset.favId;
    const item = projetos.find((p) => String(p.favId) === favId);
    if (!item) return;

    if (!confirm(`Remover "${item.nome}" dos seus favoritos?`)) return;

    botao.disabled = true;
    try {
        const { error } = await supabase
            .from("favoritos")
            .delete()
            .eq("id", item.favId)
            .eq("usuario_id", usuarioId);
        if (error) throw error;

        projetos = projetos.filter((p) => p.favId !== item.favId);
        render();
    } catch (erro) {
        console.error("[Projetos favoritos]", erro);
        botao.disabled = false;
        alert(textoErro(erro));
    }
});

/* ---------- Filtros ---------- */
chips.addEventListener("click", (ev) => {
    const chip = ev.target.closest(".chip");
    if (!chip) return;
    chips.querySelectorAll(".chip").forEach((c) => c.classList.remove("ativo"));
    chip.classList.add("ativo");
    // data-tipo do HTML: "todos", "Residencial", "Comercial", "Reforma"
    tipoAtual = chip.dataset.tipo === "todos" ? "todos" : grupoTipo(chip.dataset.tipo);
    render();
});

busca.addEventListener("input", render);
selOrdem.addEventListener("change", render);

/* ---------- Iniciar ---------- */
async function iniciar() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!session) {
            avisoGrade("Você precisa entrar na sua conta para ver seus projetos favoritos.", true);
            return;
        }

        usuarioId = session.user.id;
        await carregar();
    } catch (erro) {
        console.error("[Projetos favoritos]", erro);
        avisoGrade(textoErro(erro));
    }
}

iniciar();