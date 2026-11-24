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
const PAGINA_EDITAR = "./editarPlanta.html";


/* =========================================================
   APAGAR PLANTA (confirmação + exclusão no Supabase)
========================================================= */

const TABELA_APAGAR = "plantas";
const DONO_APAGAR = "profissional_id";

function injetarEstilosApagar() {
    if (document.getElementById("apagar-estilos")) return;

    const estilo = document.createElement("style");
    estilo.id = "apagar-estilos";
    estilo.textContent = `
.apagar-fundo{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.7);backdrop-filter:blur(2px);animation:apagar-fade .18s ease}
.apagar-caixa{width:100%;max-width:420px;background:#161616;color:#f2f2f2;border:1px solid #6b3a3a;border-radius:16px;padding:28px 24px 22px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.6);animation:apagar-subir .2s ease;font-family:inherit}
.apagar-icone{width:56px;height:56px;margin:0 auto 14px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;background:rgba(248,113,113,.15);color:#f87171;border:2px solid #f87171}
.apagar-caixa h3{margin:0 0 8px;font-size:20px;color:#fff}
.apagar-caixa p{margin:0 0 22px;font-size:15px;line-height:1.5;color:#cfcfcf;overflow-wrap:anywhere}
.apagar-caixa p.apagar-erro{color:#f87171;font-size:14px}
.apagar-acoes{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.apagar-botao{flex:1 1 140px;padding:11px 18px;border-radius:10px;border:1px solid #d4af6a;background:transparent;color:#d4af6a;font-weight:600;font-size:15px;cursor:pointer;font-family:inherit}
.apagar-botao.perigo{background:#c0392b;border-color:#c0392b;color:#fff}
.apagar-botao.perigo:hover:not(:disabled){background:#d9453a}
.apagar-botao:disabled{opacity:.6;cursor:not-allowed}
.apagar-botao:focus-visible{outline:2px solid #fff;outline-offset:2px}
@keyframes apagar-fade{from{opacity:0}to{opacity:1}}
@keyframes apagar-subir{from{transform:translateY(12px);opacity:0}to{transform:none;opacity:1}}
`;
    document.head.appendChild(estilo);
}

function textoErroApagar(erro) {
    const m = String(erro?.message || "");
    const baixo = m.toLowerCase();

    if (erro?.code === "23503" || baixo.includes("foreign key")) {
        return "Esta planta tem avaliações, comentários ou outros registros ligados a ela e o banco não permite apagar. Veja o SQL no fim deste arquivo.";
    }
    if (baixo.includes("row-level security") || baixo.includes("permission denied")) {
        return "Sem permissão para apagar. Falta a regra de DELETE no Supabase (veja o SQL no fim do arquivo).";
    }
    if (baixo.includes("failed to fetch")) return "Sem conexão com o servidor.";
    return m || "Erro desconhecido.";
}

async function excluirPlanta(id) {
    const { data: { session }, error: erroSessao } = await supabase.auth.getSession();
    if (erroSessao) throw erroSessao;
    if (!session) throw new Error("Você precisa entrar na sua conta para apagar a planta.");

    const { data, error } = await supabase.from(TABELA_APAGAR)
        .delete()
        .eq("id", id)
        .eq(DONO_APAGAR, session.user.id)
        .select("id");

    if (error) throw error;

    if (!data || !data.length) {
        throw new Error("Nada foi apagado. A planta não é sua ou falta a regra de DELETE no Supabase (veja o SQL no fim do arquivo).");
    }
}

function apagarPlanta({ id, titulo, aoApagar }) {
    injetarEstilosApagar();
    document.querySelector(".apagar-fundo")?.remove();

    const anterior = document.activeElement;

    const fundo = document.createElement("div");
    fundo.className = "apagar-fundo";

    const caixa = document.createElement("div");
    caixa.className = "apagar-caixa";
    caixa.setAttribute("role", "alertdialog");
    caixa.setAttribute("aria-modal", "true");
    caixa.setAttribute("aria-labelledby", "apagar-titulo");

    const icone = document.createElement("div");
    icone.className = "apagar-icone";
    icone.setAttribute("aria-hidden", "true");
    icone.textContent = "!";

    const h3 = document.createElement("h3");
    h3.id = "apagar-titulo";
    h3.textContent = "Apagar planta?";

    const texto = document.createElement("p");
    texto.textContent = `"${titulo || "Esta planta"}" será apagada de forma permanente, junto com o que estiver ligado a ela. Essa ação não pode ser desfeita.`;

    const acoes = document.createElement("div");
    acoes.className = "apagar-acoes";

    const cancelar = document.createElement("button");
    cancelar.type = "button";
    cancelar.className = "apagar-botao";
    cancelar.textContent = "Cancelar";

    const confirmar = document.createElement("button");
    confirmar.type = "button";
    confirmar.className = "apagar-botao perigo";
    confirmar.textContent = "Apagar";

    acoes.append(cancelar, confirmar);
    caixa.append(icone, h3, texto, acoes);
    fundo.appendChild(caixa);
    document.body.appendChild(fundo);

    let ocupado = false;

    function fechar() {
        document.removeEventListener("keydown", aoTeclar);
        fundo.remove();
        if (anterior && anterior.focus) anterior.focus();
    }

    function aoTeclar(evento) {
        if (evento.key === "Escape" && !ocupado) fechar();
    }

    cancelar.addEventListener("click", fechar);
    fundo.addEventListener("click", (e) => { if (e.target === fundo && !ocupado) fechar(); });
    document.addEventListener("keydown", aoTeclar);

    confirmar.addEventListener("click", async () => {
        ocupado = true;
        confirmar.disabled = true;
        cancelar.disabled = true;
        confirmar.textContent = "Apagando...";
        texto.className = "";

        try {
            await excluirPlanta(id);
            fechar();
            if (aoApagar) aoApagar();
        } catch (erro) {
            console.error("[Apagar planta]", erro);
            ocupado = false;
            confirmar.disabled = false;
            cancelar.disabled = false;
            confirmar.textContent = "Tentar de novo";
            texto.className = "apagar-erro";
            texto.textContent = textoErroApagar(erro);
        }
    });

    cancelar.focus();
}

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

const iniciais = (nome) => {
    const p = String(nome || "?").trim().split(/\s+/).filter(Boolean);
    return ((p[0]?.[0] || "?") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
};

// Linha de avaliação/comentário: avatar com iniciais, nome, nota, data e texto
function itemPessoa(nome, quando, texto, nota) {
    const item = criar("div", "dp-item dp-pessoa");
    const corpo = criar("div", "dp-corpo");
    const cab = criar("div", "dp-cab");
    cab.append(criar("strong", "", nome));
    if (nota) cab.append(criar("span", "dp-nota", "★".repeat(Math.round(nota))));
    if (quando) cab.append(criar("small", "", quando));
    corpo.append(cab);
    if (texto) corpo.append(criar("p", "", texto));
    item.append(criar("span", "dp-avatar", iniciais(nome)), corpo);
    return item;
}

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

    const btnApagar = $("btnApagar");
    if (btnApagar) {
        btnApagar.onclick = () => apagarPlanta({
            id: p.id,
            titulo: p.titulo,
            aoApagar: () => { location.href = PAGINA_LISTA; }
        });
    }

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
            box.append(itemPessoa(a.autor ?? a.nome ?? "Cliente", dataBR(a.criado_em ?? a.created_at), a.comentario ?? a.texto, a.nota));
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
            box.append(itemPessoa(c.autor ?? c.nome ?? "Visitante", dataBR(c.criado_em ?? c.created_at), c.texto ?? c.comentario));
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

        $("dpEstado").hidden = true;
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

/* ---------- SQL (rode no SQL Editor do Supabase) ----------
   1) Permitir que o dono apague a própria planta:

   create policy "dono apaga suas plantas" on plantas
     for delete using (auth.uid() = profissional_id);

   2) Se avaliações/comentários impedirem a exclusão (erro de foreign key),
      faça-os serem apagados junto com a planta:

   alter table avaliacoes
     drop constraint if exists avaliacoes_planta_id_fkey,
     add constraint avaliacoes_planta_id_fkey
       foreign key (planta_id) references plantas(id) on delete cascade;

   alter table comentarios
     drop constraint if exists comentarios_planta_id_fkey,
     add constraint comentarios_planta_id_fkey
       foreign key (planta_id) references plantas(id) on delete cascade;
------------------------------------------------------------ */