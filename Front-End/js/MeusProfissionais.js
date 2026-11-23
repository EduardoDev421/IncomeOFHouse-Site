// Front-End/js/MeusProfissionais.js
// Carregado como módulo: <script type="module" src="../js/MeusProfissionais.js"></script>
// Requer a coluna favoritos.profissional_id (criada pelo favoritos_profissional.sql).
import { supabase } from "./lib/supabaseClient.js";

/* ---------- Configuração ---------- */
// Colunas candidatas na tabela profissionais (usa a primeira que existir na linha)
const CAND = {
    nome: ["nome", "nome_completo", "nome_fantasia", "razao_social"],
    especialidade: ["especialidade", "profissao", "area_atuacao", "area", "categoria", "cargo"],
    descricao: ["descricao", "bio", "sobre", "resumo", "apresentacao"],
    foto: ["foto_url", "foto", "avatar_url", "imagem_url", "imagem"]
};

const ICONE_USUARIO =
    '<svg viewBox="0 0 24 24" aria-hidden="true" style="width:55%;height:55%;fill:none;stroke:currentColor;stroke-width:1.6;opacity:.7">' +
    '<circle cx="12" cy="8" r="4"></circle><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"></path></svg>';

/* ---------- Estado ---------- */
let usuarioId = null;
let favoritos = [];
let termoBusca = "";

const $ = (id) => document.getElementById(id);
const lista = $("listaProfissionais");
const semProfissionais = $("semProfissionais");

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

// Traduz os erros do Supabase/Postgres. O texto original (em inglês) fica só no console.
function textoErro(erro) {
    const m = String(erro?.message || "").toLowerCase();
    if (m.includes("profissional_id"))
        return "Os favoritos de profissionais ainda não foram configurados no Supabase. Rode o favoritos_profissional.sql.";
    if (erro?.code === "PGRST205" || m.includes("could not find the table"))
        return "A tabela de favoritos ainda não existe no Supabase.";
    if (m.includes("row-level security") || m.includes("permission denied") || m.includes("not authorized"))
        return "Sem permissão para essa operação.";
    if (m.includes("jwt") || m.includes("not authenticated"))
        return "Sua sessão expirou. Entre na sua conta novamente.";
    if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("load failed"))
        return "Sem conexão com o servidor. Tente novamente.";
    return "Não foi possível concluir a operação. Tente novamente.";
}

function avisoLista(texto, comLinkLogin = false) {
    semProfissionais.hidden = true;
    lista.innerHTML =
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
        console.warn(`[Favoritos] ${tabela}:`, erro?.message || erro);
        return [];
    }
}

async function carregar() {
    const { data: favs, error } = await supabase
        .from("favoritos")
        .select("id, profissional_id, criado_em")
        .eq("usuario_id", usuarioId)
        .not("profissional_id", "is", null)
        .order("criado_em", { ascending: false });
    if (error) throw error;

    const ids = unicos((favs || []).map((f) => f.profissional_id));
    const profs = ids.length ? await consultaSegura("profissionais", (q) => q.in("id", ids)) : [];
    const profPorId = new Map(profs.map((p) => [String(p.id), p]));

    favoritos = (favs || []).map((f) => {
        const prof = profPorId.get(String(f.profissional_id));
        const nome = primeiro(prof, CAND.nome) || "Profissional";
        const especialidade = primeiro(prof, CAND.especialidade);
        return {
            favId: f.id,
            profId: f.profissional_id,
            nome,
            especialidade,
            descricao: primeiro(prof, CAND.descricao),
            foto: primeiro(prof, CAND.foto),
            busca: normalizar(`${nome} ${especialidade}`)
        };
    });

    render();
}

/* ---------- Renderização ---------- */
function renderCard(f) {
    const avatar = f.foto
        ? `<img src="${esc(f.foto)}" alt="Foto de ${esc(f.nome)}">`
        : ICONE_USUARIO;

    return `
        <article class="card" data-fav-id="${esc(f.favId)}">
            <button type="button" class="btn-remover" data-acao="remover" aria-label="Remover dos favoritos">
                <img src="../img/icones/IconeCoracao.svg" alt="">
            </button>
            <div class="avatar">${avatar}</div>
            <h3>${esc(f.nome)}</h3>
            ${f.especialidade ? `<span class="especialidade">${esc(f.especialidade)}</span>` : ""}
            ${f.descricao ? `<p>${esc(f.descricao)}</p>` : ""}
            <a href="../pages/DetalhesProfissional.html?id=${encodeURIComponent(f.profId)}" class="btn-ver">Ver Profissional</a>
        </article>`;
}

function render() {
    const termo = normalizar(termoBusca.trim());
    const visiveis = favoritos.filter((f) => !termo || f.busca.includes(termo));

    lista.innerHTML = visiveis.map(renderCard).join("");

    const vazio = visiveis.length === 0;
    semProfissionais.hidden = !vazio;
    if (vazio) {
        semProfissionais.querySelector("h2").textContent = favoritos.length
            ? "Nenhum profissional encontrado"
            : "Você ainda não favoritou nenhum profissional";
    }
}

// Se a foto não carregar, mostra o ícone de usuário (sem depender de imagem padrão)
lista.addEventListener(
    "error",
    (ev) => {
        const img = ev.target;
        if (img?.tagName !== "IMG" || !img.closest(".avatar")) return;
        img.closest(".avatar").innerHTML = ICONE_USUARIO;
    },
    true
);

/* ---------- Busca ---------- */
$("busca").addEventListener("input", (ev) => {
    termoBusca = ev.target.value;
    render();
});

/* ---------- Remover dos favoritos ---------- */
lista.addEventListener("click", async (ev) => {
    const botao = ev.target.closest('[data-acao="remover"]');
    if (!botao) return;

    const favId = botao.closest(".card").dataset.favId;
    const item = favoritos.find((f) => String(f.favId) === favId);
    if (!item) return;

    if (!confirm(`Remover ${item.nome} dos seus favoritos?`)) return;

    botao.disabled = true;
    try {
        const { error } = await supabase
            .from("favoritos")
            .delete()
            .eq("id", item.favId)
            .eq("usuario_id", usuarioId);
        if (error) throw error;

        favoritos = favoritos.filter((f) => f.favId !== item.favId);
        render();
    } catch (erro) {
        console.error("[Favoritos]", erro);
        botao.disabled = false;
        alert(textoErro(erro));
    }
});

/* ---------- Iniciar ---------- */
async function iniciar() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!session) {
            avisoLista("Você precisa entrar na sua conta para ver seus profissionais favoritos.", true);
            return;
        }

        usuarioId = session.user.id;
        await carregar();
    } catch (erro) {
        console.error("[Favoritos]", erro);
        avisoLista(textoErro(erro));
    }
}

iniciar();