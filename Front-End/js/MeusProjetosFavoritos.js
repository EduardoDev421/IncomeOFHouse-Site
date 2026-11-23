// Front-End/js/MeusProjetosFavoritos.js
// Carregado como módulo: <script type="module" src="../js/MeusProjetosFavoritos.js"></script>
// Favoritos reais: tabela favoritos (usuario_id, planta_id) + dados da tabela plantas. Sem localStorage.
import { supabase } from "./lib/supabaseClient.js";

const CAND = {
    titulo: ["nome", "titulo", "nome_planta", "name"],
    tipo: ["categoria", "tipo", "tipo_projeto", "finalidade"],
    area: ["area", "area_total", "area_m2", "metragem"],
    valor: ["preco", "valor", "preço"],
    nota: ["nota", "media_avaliacao", "avaliacao", "estrelas"],
    imagem: ["imagem_url", "imagem", "foto_url", "capa_url", "url_imagem"],
    profissional: ["profissional_id"],
    profNome: ["nome", "nome_completo", "nome_fantasia", "razao_social", "profissao"],
    avaliacaoNota: ["nota", "estrelas", "avaliacao", "valor"]
};

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

const esc = (valor) => String(valor ?? "").replace(/[&<>"']/g, (caractere) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
}[caractere]));

const normalizar = (valor) => String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const primeiro = (objeto, candidatos) => {
    if (!objeto) return "";
    const chave = candidatos.find((nome) =>
        Object.prototype.hasOwnProperty.call(objeto, nome) &&
        objeto[nome] !== undefined &&
        objeto[nome] !== null &&
        String(objeto[nome]).trim() !== ""
    );
    return chave ? objeto[chave] : "";
};

const unicos = (itens) => [...new Set((itens || []).filter((item) =>
    item !== null && item !== undefined && String(item).trim() !== ""
))];

const numero = (valor) => {
    if (typeof valor === "string") {
        let texto = valor.replace(/[^0-9,.-]/g, "").trim();
        if (texto.includes(",") && texto.includes(".")) {
            texto = texto.lastIndexOf(",") > texto.lastIndexOf(".")
                ? texto.replace(/\./g, "").replace(",", ".")
                : texto.replace(/,/g, "");
        } else if (texto.includes(",")) {
            texto = texto.replace(/,/g, ".");
        }
        valor = texto;
    }
    const resultado = Number(valor);
    return Number.isFinite(resultado) ? resultado : 0;
};

const moeda = (valor) => numero(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0
});

function grupoTipo(tipo) {
    const texto = normalizar(tipo);
    if (texto.includes("resid") || texto.includes("casa") || texto.includes("sobrado") ||
        texto.includes("apartamento") || texto.includes("condominio") || texto.includes("chacara") ||
        texto.includes("sitio") || texto.includes("fazenda") || texto.includes("kitnet")) {
        return "residencial";
    }
    if (texto.includes("comerc") || texto.includes("loja") || texto.includes("escritorio") ||
        texto.includes("galpao") || texto.includes("industrial") || texto.includes("fabrica") ||
        texto.includes("prédio") || texto.includes("predio") || texto.includes("sala")) {
        return "comercial";
    }
    if (texto.includes("reform") || texto.includes("renova") || texto.includes("interior")) {
        return "reforma";
    }
    return "outro";
}

function textoErro(erro) {
    const mensagem = String(erro?.message || "").toLowerCase();
    if (erro?.code === "PGRST205" || mensagem.includes("could not find the table") || mensagem.includes("does not exist")) {
        return "A tabela necessária ainda não existe ou não está configurada no Supabase.";
    }
    if (mensagem.includes("column") && (mensagem.includes("does not exist") || mensagem.includes("schema cache"))) {
        return "Alguma coluna usada pela página não existe no banco de dados.";
    }
    if (mensagem.includes("row-level security") || mensagem.includes("permission denied") || mensagem.includes("not authorized")) {
        return "Sem permissão para acessar ou alterar esta informação.";
    }
    if (mensagem.includes("jwt") || mensagem.includes("not authenticated") || mensagem.includes("invalid claim")) {
        return "Sua sessão expirou. Entre na sua conta novamente.";
    }
    if (mensagem.includes("failed to fetch") || mensagem.includes("networkerror") || mensagem.includes("load failed")) {
        return "Sem conexão com o servidor. Verifique sua internet e tente novamente.";
    }
    return "Não foi possível concluir a operação. Tente novamente.";
}

function mostrarCarregando() {
    vazio.hidden = true;
    grade.hidden = false;
    contagem.textContent = "";
    grade.innerHTML = '<p style="padding:24px 4px;opacity:.9">Carregando projetos favoritos...</p>';
}

function mostrarAviso(texto, comLinkLogin = false) {
    vazio.hidden = true;
    grade.hidden = false;
    contagem.textContent = "";
    grade.innerHTML =
        `<p style="padding:24px 4px;opacity:.9">${esc(texto)}` +
        (comLinkLogin ? ' <a href="./login.html" style="color:inherit;text-decoration:underline">Ir para o login</a>' : "") +
        "</p>";
}

async function consultaSegura(tabela, filtro) {
    try {
        const consulta = supabase.from(tabela).select("*");
        const finalizada = typeof filtro === "function" ? filtro(consulta) : consulta;
        const { data, error } = await finalizada;
        if (error) throw error;
        return data || [];
    } catch (erro) {
        console.warn(`[Projetos favoritos] Não foi possível consultar ${tabela}:`, erro);
        return [];
    }
}

function resolverImagem(valor) {
    const url = String(valor || "").trim();
    if (!url) return "";
    if (/^https?:\/\//i.test(url) || /^data:image\//i.test(url)) return url;
    if (url.startsWith("/uploads/")) {
        const apiBase = (
            window.PLANTAS_API_URL ||
            (window.location.protocol === "file:" ||
                ["localhost", "127.0.0.1"].includes(window.location.hostname)
                ? "http://localhost:3000"
                : window.location.origin)
        ).replace(/\/+$/, "");
        return `${apiBase}${url}`;
    }
    return url;
}

async function carregar() {
    mostrarCarregando();

    const { data: favoritos, error } = await supabase
        .from("favoritos")
        .select("id, planta_id, criado_em")
        .eq("usuario_id", usuarioId)
        .not("planta_id", "is", null)
        .order("criado_em", { ascending: false });

    if (error) throw error;

    const plantaIds = unicos((favoritos || []).map((favorito) => favorito.planta_id));
    const plantas = plantaIds.length
        ? await consultaSegura("plantas", (consulta) => consulta.in("id", plantaIds))
        : [];

    const plantasPorId = new Map(plantas.map((planta) => [String(planta.id), planta]));

    const profissionalIds = unicos(plantas.map((planta) => primeiro(planta, CAND.profissional)));
    const profissionais = profissionalIds.length
        ? await consultaSegura("profissionais", (consulta) => consulta.in("id", profissionalIds))
        : [];

    const profissionaisPorId = new Map(profissionais.map((profissional) => [
        String(profissional.id),
        profissional
    ]));

    const avaliacoes = plantaIds.length
        ? await consultaSegura("avaliacoes", (consulta) => consulta.in("planta_id", plantaIds))
        : [];

    const notasPorPlanta = new Map();
    for (const avaliacao of avaliacoes) {
        if (avaliacao?.planta_id === null || avaliacao?.planta_id === undefined) continue;
        const nota = numero(primeiro(avaliacao, CAND.avaliacaoNota));
        if (nota <= 0) continue;

        const chave = String(avaliacao.planta_id);
        notasPorPlanta.set(chave, [...(notasPorPlanta.get(chave) || []), nota]);
    }

    projetos = (favoritos || []).map((favorito, indice) => {
        const planta = plantasPorId.get(String(favorito.planta_id));
        const profissionalId = primeiro(planta, CAND.profissional);
        const profissional = profissionaisPorId.get(String(profissionalId));

        const notas = notasPorPlanta.get(String(favorito.planta_id)) || [];
        const mediaAvaliacoes = notas.length
            ? notas.reduce((total, nota) => total + nota, 0) / notas.length
            : 0;

        const tipo = primeiro(planta, CAND.tipo);
        const nome = primeiro(planta, CAND.titulo) || "Projeto favorito";

        return {
            favId: favorito.id,
            plantaId: favorito.planta_id,
            nome,
            profissional: primeiro(profissional, CAND.profNome),
            tipo,
            grupo: grupoTipo(tipo),
            area: numero(primeiro(planta, CAND.area)),
            valor: numero(primeiro(planta, CAND.valor)),
            nota: numero(primeiro(planta, CAND.nota)) || mediaAvaliacoes,
            imagem: resolverImagem(primeiro(planta, CAND.imagem)),
            ordem: indice,
            busca: normalizar(`${nome} ${primeiro(profissional, CAND.profNome)}`)
        };
    });

    render();
}

function atualizarResumo() {
    const valores = projetos.map((projeto) => projeto.valor).filter((valor) => valor > 0);
    const soma = valores.reduce((total, valor) => total + valor, 0);

    $("resTotal").textContent = String(projetos.length);
    $("resRes").textContent = String(projetos.filter((projeto) => projeto.grupo === "residencial").length);
    $("resCom").textContent = String(projetos.filter((projeto) => projeto.grupo === "comercial").length);
    $("resValor").textContent = valores.length ? moeda(Math.round(soma / valores.length)) : "R$ 0";
}

function filtrar() {
    const termo = normalizar(busca?.value || "");
    const filtrados = projetos.filter((projeto) => {
        if (tipoAtual !== "todos" && projeto.grupo !== tipoAtual) return false;
        if (termo && !projeto.busca.includes(termo)) return false;
        return true;
    });

    const ordem = selOrdem?.value || "recentes";
    filtrados.sort((a, b) => {
        if (ordem === "valor") return b.valor - a.valor;
        if (ordem === "nota") return b.nota - a.nota;
        if (ordem === "nome") return a.nome.localeCompare(b.nome, "pt-BR");
        return a.ordem - b.ordem;
    });

    return filtrados;
}

function renderCard(projeto) {
    const nota = projeto.nota > 0
        ? `<span class="nota">★ ${projeto.nota.toFixed(1)}</span>`
        : '<span class="nota sem">Sem avaliação</span>';

    const imagem = projeto.imagem
        ? `<img class="foto-projeto" src="${esc(projeto.imagem)}" alt="Foto de ${esc(projeto.nome)}" loading="lazy">`
        : "";

    return `
        <article class="projeto" data-fav-id="${esc(projeto.favId)}">
            <div class="thumb"${projeto.imagem ? ' style="position:relative;overflow:hidden"' : ""}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-8 9 8"></path><path d="M5 10v10h14V10"></path><path d="M10 20v-6h4v6"></path></svg>
                ${imagem}
                <button type="button" class="btn-remover" data-acao="remover" aria-label="Remover ${esc(projeto.nome)} dos favoritos" title="Remover dos favoritos">
                    <img src="../img/icones/IconeCoracao.svg" alt="">
                </button>
            </div>
            <div class="corpo">
                <h3>${esc(projeto.nome)}</h3>
                ${projeto.profissional ? `<span class="cliente">Por ${esc(projeto.profissional)}</span>` : ""}
                ${projeto.tipo ? `<span class="tag">${esc(projeto.tipo)}</span>` : ""}
                <div class="meta">
                    <div><small>Área</small><span>${projeto.area ? `${projeto.area} m²` : "—"}</span></div>
                    <div><small>Valor</small><span>${projeto.valor ? moeda(projeto.valor) : "—"}</span></div>
                </div>
                <div class="rodape-card">
                    ${nota}
                    <a href="./DetalhesPlanta.html?id=${encodeURIComponent(projeto.plantaId)}" class="btn-detalhes">Ver Projeto</a>
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
        const titulo = vazio.querySelector("h2");
        if (titulo) {
            titulo.textContent = projetos.length
                ? "Nenhum projeto encontrado"
                : "Você ainda não favoritou nenhum projeto";
        }
    }

    contagem.textContent = semResultado
        ? ""
        : lista.length === 1
            ? "1 projeto favorito"
            : `${lista.length} projetos favoritos`;

    atualizarResumo();
}

grade?.addEventListener("error", (evento) => {
    const imagem = evento.target;
    if (imagem?.tagName === "IMG" && imagem.classList.contains("foto-projeto")) {
        imagem.remove();
    }
}, true);

grade?.addEventListener("click", async (evento) => {
    const botao = evento.target.closest('[data-acao="remover"]');
    if (!botao) return;

    const artigo = botao.closest(".projeto");
    const projeto = projetos.find((item) => String(item.favId) === String(artigo?.dataset.favId));
    if (!projeto) return;

    if (!window.confirm(`Remover "${projeto.nome}" dos seus favoritos?`)) return;

    botao.disabled = true;

    try {
        const { error } = await supabase
            .from("favoritos")
            .delete()
            .eq("id", projeto.favId)
            .eq("usuario_id", usuarioId);

        if (error) throw error;

        projetos = projetos.filter((item) => String(item.favId) !== String(projeto.favId));
        window.dispatchEvent(new CustomEvent("favoritos:alterado", {
            detail: { plantaId: projeto.plantaId, favorito: false }
        }));
        render();
    } catch (erro) {
        console.error("[Projetos favoritos] Erro ao remover:", erro);
        botao.disabled = false;
        window.alert(textoErro(erro));
    }
});

chips?.addEventListener("click", (evento) => {
    const chip = evento.target.closest(".chip");
    if (!chip) return;

    chips.querySelectorAll(".chip").forEach((item) => item.classList.remove("ativo"));
    chip.classList.add("ativo");
    tipoAtual = chip.dataset.tipo === "todos"
        ? "todos"
        : grupoTipo(chip.dataset.tipo);
    render();
});

busca?.addEventListener("input", render);
selOrdem?.addEventListener("change", render);

supabase.auth.onAuthStateChange((_evento, sessao) => {
    if (sessao?.user?.id === usuarioId) return;
    usuarioId = sessao?.user?.id || null;

    if (!usuarioId) {
        projetos = [];
        mostrarAviso("Você precisa entrar na sua conta para ver seus projetos favoritos.", true);
        return;
    }

    carregar().catch((erro) => {
        console.error("[Projetos favoritos]", erro);
        mostrarAviso(textoErro(erro));
    });
});

async function iniciar() {
    if (!grade || !vazio || !contagem) {
        console.error("[Projetos favoritos] Estrutura da página incompleta.");
        return;
    }

    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!session) {
            mostrarAviso("Você precisa entrar na sua conta para ver seus projetos favoritos.", true);
            return;
        }

        usuarioId = session.user.id;
        await carregar();
    } catch (erro) {
        console.error("[Projetos favoritos]", erro);
        mostrarAviso(textoErro(erro));
    }
}

iniciar();