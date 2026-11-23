/* =========================================================
   DETALHE DO PROJETO (área do profissional)
   Abre com: DetalheProjeto.html?id=<id da planta>
   Só mostra a planta se ela pertencer ao profissional logado.
   A regra definitiva fica no Supabase (RLS): veja o SQL no final.
   ========================================================= */
import { supabase } from "./lib/supabaseClient.js";

// Ajuste aqui se os nomes no seu Supabase forem outros
const TABELA = "plantas";
const COLUNA_DONO = "profissional_id";
const TABELA_AVALIACOES = "avaliacoes";
const TABELA_COMENTARIOS = "comentarios";
const COLUNA_PLANTA = "planta_id";

const PAGINA_LOGIN = "./Login.html";
const PAGINA_LISTA = "./Projetos.html";
const PAGINA_EDITAR = "./publicarPlanta.html";

const $ = (id) => document.getElementById(id);
const id = new URLSearchParams(location.search).get("id");

// Tudo entra com textContent: os dados vêm do banco e nunca são tratados como HTML
function criar(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto) el.textContent = texto;
    return el;
}

const moeda = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (s) => { const x = new Date(s); return isNaN(x) ? "" : x.toLocaleDateString("pt-BR"); };
const lista = (v) => Array.isArray(v) ? v.map(String) : String(v ?? "").split(/\r?\n|,/).map((t) => t.trim()).filter(Boolean);

const STATUS = {
    publicada: { rotulo: "Publicada", classe: "st-publicada" },
    rascunho: { rotulo: "Rascunho", classe: "st-rascunho" },
    inativa: { rotulo: "Inativa", classe: "st-inativa" }
};

function normalizarStatus(valor) {
    const s = String(valor || "publicada").toLowerCase();
    if (["rascunho", "draft", "pendente", "em_analise", "analise"].includes(s)) return "rascunho";
    if (["inativa", "inativo", "arquivada", "cancelada", "removida"].includes(s)) return "inativa";
    return "publicada";
}

function textoErro(erro, tabela) {
    const m = String(erro?.message || "").toLowerCase();
    if (m.includes("does not exist") || m.includes("schema cache")) return `A tabela ou coluna de "${tabela}" não foi encontrada no Supabase.`;
    if (m.includes("row-level security") || m.includes("permission denied")) return "Sem permissão para ler estes dados.";
    if (m.includes("failed to fetch")) return "Sem conexão com o servidor.";
    return erro?.message || "Erro desconhecido.";
}

// Mesmos nomes de coluna alternativos que o Projetos.js já aceita
function doBanco(p) {
    return {
        id: p.id,
        titulo: p.titulo ?? p.nome ?? "Sem título",
        tipo: p.tipo ?? p.categoria ?? "",
        descricao: p.descricao ?? "",
        status: p.ativa === false ? "inativa" : normalizarStatus(p.status),
        data: String(p.criado_em ?? p.created_at ?? "").slice(0, 10),
        valor: Number(p.preco ?? p.valor ?? 0) || 0,
        area: Number(p.area ?? p.area_total ?? 0) || 0,
        quartos: Number(p.quartos ?? 0) || 0,
        banheiros: Number(p.banheiros ?? 0) || 0,
        vagas: Number(p.vagas ?? p.vagas_garagem ?? 0) || 0,
        estilo: p.estilo ?? "",
        foto: p.foto_url ?? p.imagem_url ?? p.capa_url ?? p.foto ?? "",
        distribuicao: p.distribuicao ?? "",
        destaques: lista(p.destaques)
    };
}

/* ---------- Planta ---------- */

function preencher(p) {
    const st = STATUS[p.status];
    document.title = p.titulo + " - Meu projeto";
    $("dpTitulo").textContent = p.titulo;
    $("dpDescricao").textContent = p.descricao;
    $("dpSobre").textContent = p.descricao || "Esta planta ainda não tem descrição.";
    $("dpValor").textContent = p.valor ? moeda(p.valor) : "";
    $("dpStatus").textContent = st.rotulo;
    $("dpStatus").classList.add(st.classe);
    $("pubStatus").textContent = st.rotulo;
    $("pubData").textContent = p.data ? dataBR(p.data) : "Não informada";
    $("btnEditar").href = PAGINA_EDITAR + "?id=" + encodeURIComponent(p.id);

    if (p.tipo) { $("dpTipo").textContent = p.tipo; $("dpTipo").hidden = false; }
    if (p.foto) {
        $("dpImagem").src = p.foto;
        $("dpImagem").hidden = false;
        $("dpSemImagem").hidden = true;
        $("dpImagem").onerror = () => { $("dpImagem").hidden = true; $("dpSemImagem").hidden = false; };
    }

    [["Área construída", p.area ? p.area + " m²" : ""], ["Quartos", p.quartos], ["Vagas de garagem", p.vagas],
     ["Estilo", p.estilo], ["Banheiros", p.banheiros]].forEach(([rotulo, valor]) => {
        if (!valor) return;
        const li = criar("li");
        li.append(criar("span", "", rotulo), criar("strong", "", String(valor)));
        $("dpInfo").append(li);
    });

    if (p.distribuicao) {
        $("dpDistribuicao").append(criar("h3", "", "Distribuição dos ambientes"), criar("p", "", p.distribuicao));
        $("dpDistribuicao").hidden = false;
    }

    const destaques = p.destaques.length ? p.destaques : [
        p.quartos && p.quartos + (p.quartos === 1 ? " quarto" : " quartos"),
        p.banheiros && p.banheiros + (p.banheiros === 1 ? " banheiro" : " banheiros"),
        p.vagas && p.vagas + (p.vagas === 1 ? " vaga de garagem" : " vagas de garagem")
    ].filter(Boolean);
    if (destaques.length) destaques.forEach((t) => $("dpDestaques").append(criar("li", "", t)));
    else $("dpDestaques").append(criar("li", "dp-vazio", "Nenhum destaque informado."));
}

/* ---------- Avaliações e comentários recebidos ---------- */

async function carregarAvaliacoes() {
    const box = $("dpAvaliacoes");
    box.replaceChildren();
    try {
        const { data, error } = await supabase.from(TABELA_AVALIACOES).select("*").eq(COLUNA_PLANTA, id);
        if (error) throw error;
        if (!data?.length) {
            $("pubAval").textContent = "Nenhuma ainda";
            box.append(criar("p", "dp-vazio", "Ainda não há avaliações para este projeto."));
            return;
        }
        const media = data.reduce((s, a) => s + Number(a.nota || 0), 0) / data.length;
        $("pubAval").textContent = `★ ${media.toFixed(1).replace(".", ",")} (${data.length})`;
        data.slice(0, 5).forEach((a) => {
            const item = criar("div", "dp-item");
            item.append(criar("strong", "", `${a.autor ?? a.nome ?? "Cliente"} · ${"★".repeat(Math.round(a.nota || 0))}`));
            const texto = a.comentario ?? a.texto;
            if (texto) item.append(criar("small", "", texto));
            box.append(item);
        });
    } catch (erro) {
        console.error("[Avaliações]", erro);
        $("pubAval").textContent = "—";
        box.append(criar("p", "dp-vazio", "Não foi possível carregar as avaliações agora. " + textoErro(erro, TABELA_AVALIACOES)));
    }
}

async function carregarComentarios() {
    const box = $("dpListaComentarios");
    box.replaceChildren();
    try {
        const { data, error } = await supabase.from(TABELA_COMENTARIOS).select("*").eq(COLUNA_PLANTA, id);
        if (error) throw error;
        const itens = (data || []).sort((a, b) => String(b.criado_em ?? b.created_at ?? "").localeCompare(String(a.criado_em ?? a.created_at ?? "")));
        $("qtdComentarios").textContent = itens.length;
        $("pubCom").textContent = itens.length;
        if (!itens.length) { box.append(criar("p", "dp-vazio", "Ainda não há comentários neste projeto.")); return; }

        itens.forEach((c) => {
            const item = criar("div", "dp-item");
            item.append(criar("strong", "", c.autor ?? c.nome ?? "Visitante"));
            const quando = dataBR(c.criado_em ?? c.created_at);
            if (quando) item.append(criar("small", "", quando));
            item.append(criar("span", "", c.texto ?? c.comentario ?? ""));
            box.append(item);
        });
    } catch (erro) {
        console.error("[Comentários]", erro);
        $("pubCom").textContent = "—";
        box.append(criar("p", "dp-vazio", "Não foi possível carregar os comentários agora. " + textoErro(erro, TABELA_COMENTARIOS)));
    }
}

/* ---------- Início: só o dono entra ---------- */

function bloquear(mensagem, link) {
    const estado = $("dpEstado");
    estado.replaceChildren(document.createTextNode(mensagem + " "));
    if (link) estado.append(Object.assign(criar("a", "", link.texto), { href: link.href }));
    estado.hidden = false;
}

async function iniciar() {
    const voltar = { texto: "Voltar para Projetos", href: PAGINA_LISTA };
    if (!id) { bloquear('O endereço não informa qual projeto abrir. Volte para Projetos e clique em "Ver detalhes".', voltar); return; }

    try {
        const { data: { session }, error: erroSessao } = await supabase.auth.getSession();
        if (erroSessao) throw erroSessao;
        if (!session) {
            bloquear("Esta página é só para o profissional que criou o projeto. Entre na sua conta para continuar.",
                { texto: "Ir para o login", href: PAGINA_LOGIN });
            return;
        }

        // Filtra pelo dono: planta de outra pessoa volta vazia, igual a uma planta que não existe
        const { data, error } = await supabase.from(TABELA).select("*")
            .eq("id", id).eq(COLUNA_DONO, session.user.id).maybeSingle();
        if (error) throw error;
        if (!data) { bloquear("Projeto não encontrado ou você não tem acesso a ele.", voltar); return; }

        $("dpConteudo").hidden = false;
        preencher(doBanco(data));
        carregarAvaliacoes();
        carregarComentarios();
    } catch (erro) {
        console.error("[Detalhe do projeto]", erro);
        bloquear("Não foi possível abrir o projeto. " + textoErro(erro, TABELA), voltar);
    }
}

iniciar();

/* ---------- SQL de segurança (rode no SQL Editor do Supabase) ----------
   Esconder a tela no navegador não basta: quem entende de JavaScript pode
   consultar a tabela direto. Esta regra faz o próprio banco bloquear.

   alter table plantas enable row level security;

   create policy "dono ve suas plantas" on plantas
     for select using (auth.uid() = profissional_id);

   -- Se a página pública de plantas precisa mostrar as publicadas para todos,
   -- crie uma segunda regra só para elas:
   create policy "todos veem plantas publicadas" on plantas
     for select using (status = 'publicada');
------------------------------------------------------------------------- */