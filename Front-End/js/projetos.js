
import { supabase } from "./lib/supabaseClient.js";

/* =========================================================
   CONFIGURAÇÕES
========================================================= */

const TABELA = "plantas";
const COLUNA_DONO = "profissional_id";
const PAGINA_LOGIN = "./Login.html";

// Página de detalhes do projeto
const PAGINA_DETALHE = "./DetalheProjeto.html";

// Exclusão temporariamente desativada
const EXCLUSAO_ATIVADA = false;


/* =========================================================
   ELEMENTOS
========================================================= */

const $ = (id) => document.getElementById(id);


/* =========================================================
   FUNÇÕES AUXILIARES
========================================================= */

const esc = (t) =>
    String(t ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[c]));

const dataBR = (s) =>
    (s ? s.split("-").reverse().join("/") : "");

const moeda = (n) =>
    Number(n || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });


/* =========================================================
   STATUS DAS PLANTAS
========================================================= */

const STATUS = {
    publicada: {
        rotulo: "Publicada",
        classe: "concluido"
    },

    rascunho: {
        rotulo: "Rascunho",
        classe: "andamento"
    },

    inativa: {
        rotulo: "Inativa",
        classe: "cancelado"
    }
};


function normalizarStatus(valor) {

    const s = String(valor || "publicada").toLowerCase();

    if (
        ["rascunho", "draft", "pendente", "em_analise", "analise"].includes(s)
    ) {
        return "rascunho";
    }

    if (
        ["inativa", "inativo", "arquivada", "cancelada", "removida"].includes(s)
    ) {
        return "inativa";
    }

    return "publicada";
}


/* =========================================================
   ÍCONES
========================================================= */

const ICONE = `
<svg viewBox="0 0 24 24">
    <path d="M5 20V8l7-5 7 5v12"></path>
    <path d="M9 20v-6h6v6"></path>
    <path d="M8 9h1M15 9h1M8 12h1M15 12h1"></path>
</svg>
`;

const ICONE_LIXEIRA = `
<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"></path>
</svg>
`;


/* =========================================================
   DADOS
========================================================= */

let plantas = [];

let filtroStatus = "todos";
let filtroTipo = "todos";
let ordem = "recentes";
let termo = "";


/* =========================================================
   CONVERTER DADOS DO SUPABASE
========================================================= */

function doBanco(p) {

    return {

        id: p.id,

        nome: p.titulo ?? p.nome ?? "Sem título",

        tipo: p.tipo ?? p.categoria ?? "Sem tipo",

        status: p.ativa === false
            ? "inativa"
            : normalizarStatus(p.status),

        data: String(
            p.criado_em ?? p.created_at ?? ""
        ).slice(0, 10),

        valor: Number(
            p.preco ?? p.valor ?? 0
        ) || 0,

        area: Number(
            p.area ?? p.area_total ?? 0
        ) || 0,

        quartos: Number(
            p.quartos ?? 0
        ) || 0,

        banheiros: Number(
            p.banheiros ?? 0
        ) || 0,

        foto:
            p.foto_url ??
            p.imagem_url ??
            p.capa_url ??
            p.foto ??
            ""
    };
}


/* =========================================================
   MENSAGENS
========================================================= */

function mostrarMensagem(html, classe = "aviso-js") {

    $("grade").innerHTML = `
        <p class="${classe}">
            ${html}
        </p>
    `;
}


/* =========================================================
   FILTRAGEM E ORDENAÇÃO
========================================================= */

function filtrados() {

    const lista = plantas.filter((p) => {

        return (

            (
                filtroStatus === "todos" ||
                p.status === filtroStatus
            ) &&

            (
                filtroTipo === "todos" ||
                p.tipo === filtroTipo
            ) &&

            p.nome.toLowerCase().includes(termo)

        );

    });


    const comparadores = {

        recentes: (a, b) =>
            b.data.localeCompare(a.data),

        antigos: (a, b) =>
            a.data.localeCompare(b.data),

        valor: (a, b) =>
            b.valor - a.valor,

        nome: (a, b) =>
            a.nome.localeCompare(b.nome, "pt-BR")

    };

    return lista.sort(comparadores[ordem]);
}


/* =========================================================
   RESUMO DAS PLANTAS
========================================================= */

function renderResumo() {

    const publicadas = plantas.filter(
        (p) => p.status === "publicada"
    );

    $("resTotal").textContent = plantas.length;

    $("resConc").textContent = publicadas.length;

    $("resAnd").textContent = plantas.filter(
        (p) => p.status === "rascunho"
    ).length;

    $("resValor").textContent = moeda(
        publicadas.reduce(
            (s, p) => s + p.valor,
            0
        )
    );
}


/* =========================================================
   TIPOS DE PLANTAS
========================================================= */

function renderTipos() {

    const tipos = [
        ...new Set(plantas.map((p) => p.tipo))
    ].sort();

    const tipoAnterior = filtroTipo;

    $("selTipo").innerHTML =

        '<option value="todos">Todos os tipos</option>' +

        tipos.map((t) => `
            <option value="${esc(t)}">
                ${esc(t)}
            </option>
        `).join("");


    // Preserva o filtro selecionado quando possível
    if (tipos.includes(tipoAnterior)) {

        $("selTipo").value = tipoAnterior;

    } else {

        filtroTipo = "todos";
        $("selTipo").value = "todos";

    }
}


/* =========================================================
   CRIAR CARD DA PLANTA
========================================================= */

function renderCard(p) {

    const st = STATUS[p.status];

    return `

        <article class="projeto">

            <div class="thumb">

                ${
                    p.foto
                        ? `
                            <img
                                src="${esc(p.foto)}"
                                alt="${esc(p.nome)}"
                                onerror="this.remove()"
                            >
                        `
                        : ""
                }

                ${ICONE}

                <span class="status ${st.classe}">
                    ${st.rotulo}
                </span>

            </div>


            <div class="corpo">

                <h3>
                    ${esc(p.nome)}
                </h3>


                <span class="cliente">

                    ${
                        p.data
                            ? `Publicada em ${dataBR(p.data)}`
                            : "Data não informada"
                    }

                </span>


                <span class="tag">
                    ${esc(p.tipo)}
                </span>


                <div class="meta">

                    <div>
                        <small>Área</small>
                        <span>
                            ${p.area ? p.area + " m²" : "—"}
                        </span>
                    </div>

                    <div>
                        <small>Quartos</small>
                        <span>
                            ${p.quartos || "—"}
                        </span>
                    </div>

                    <div>
                        <small>Banheiros</small>
                        <span>
                            ${p.banheiros || "—"}
                        </span>
                    </div>

                    <div>
                        <small>Valor</small>
                        <span>
                            ${p.valor ? moeda(p.valor) : "—"}
                        </span>
                    </div>

                </div>


                <div class="rodape-card">


                    <!--
                        EXCLUSÃO TEMPORARIAMENTE DESATIVADA.
                        O botão não executa nenhuma operação no banco.
                    -->

                    <button
                        type="button"
                        class="btn-apagar"
                        disabled
                        title="Exclusão temporariamente desativada"
                        aria-label="Exclusão temporariamente desativada"
                        style="opacity: 0.45; cursor: not-allowed;"
                    >

                        ${ICONE_LIXEIRA}

                        <span>
                            Apagar indisponível
                        </span>

                    </button>


                    <a
                        href="${PAGINA_DETALHE}?id=${encodeURIComponent(p.id)}"
                        class="btn-detalhes"
                    >
                        Ver detalhes
                    </a>


                </div>

            </div>

        </article>

    `;
}


/* =========================================================
   RENDERIZAR LISTA
========================================================= */

function renderLista() {

    if (!plantas.length) {

        $("contagem").textContent = "";

        mostrarMensagem(
            'Você ainda não publicou nenhuma planta. <a href="./publicarPlanta.html">Publicar planta</a>',
            "vazio"
        );

        return;
    }


    const lista = filtrados();


    $("contagem").textContent =
        `Mostrando ${lista.length} de ${plantas.length} plantas`;


    $("grade").innerHTML = lista.length

        ? lista.map(renderCard).join("")

        : `
            <div class="vazio">
                Nenhuma planta encontrada com esses filtros.
            </div>
        `;
}


/* =========================================================
   RENDERIZAÇÃO GERAL
========================================================= */

function render() {

    renderResumo();

    renderTipos();

    renderLista();
}


/* =========================================================
   TRATAMENTO DE ERROS
========================================================= */

function textoErro(erro) {

    const m = String(
        erro?.message || ""
    ).toLowerCase();


    if (
        m.includes("does not exist") &&
        m.includes(COLUNA_DONO)
    ) {

        return `A coluna ${COLUNA_DONO} não existe na tabela ${TABELA}. Ajuste COLUNA_DONO no topo do Projetos.js.`;

    }


    if (
        m.includes("does not exist") ||
        m.includes("schema cache")
    ) {

        return `A tabela ${TABELA} não foi encontrada no Supabase.`;

    }


    if (
        m.includes("row-level security") ||
        m.includes("permission denied")
    ) {

        return "Sem permissão para ler as plantas.";

    }


    if (m.includes("failed to fetch")) {

        return "Sem conexão com o servidor. Tente novamente.";

    }


    return erro?.message || "Erro ao carregar as plantas.";
}


/* =========================================================
   EVENTOS
========================================================= */

function ligarEventos() {


    // FILTROS POR STATUS

    $("chips").addEventListener("click", (e) => {

        const b = e.target.closest(".chip");

        if (!b) return;


        document.querySelectorAll(".chip").forEach((c) => {

            c.classList.remove("ativo");

        });


        b.classList.add("ativo");

        filtroStatus = b.dataset.status;

        renderLista();

    });


    // FILTRO POR TIPO

    $("selTipo").onchange = (e) => {

        filtroTipo = e.target.value;

        renderLista();

    };


    // ORDENAÇÃO

    $("selOrdem").onchange = (e) => {

        ordem = e.target.value;

        renderLista();

    };


    // PESQUISA

    $("busca").addEventListener("input", (e) => {

        termo = e.target.value.trim().toLowerCase();

        renderLista();

    });


    // =====================================================
    // EXCLUSÃO TEMPORARIAMENTE DESATIVADA
    // =====================================================

    // Nenhum evento de exclusão é registrado.
    // Nenhuma operação DELETE é executada no Supabase.

}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

async function iniciar() {

    ligarEventos();

    mostrarMensagem(
        "Carregando plantas...",
        "vazio"
    );


    try {


        // VERIFICAR SESSÃO

        const {
            data: { session },
            error: erroSessao

        } = await supabase.auth.getSession();


        if (erroSessao) throw erroSessao;


        if (!session) {

            mostrarMensagem(
                `Você precisa entrar na sua conta para ver suas plantas.
                <a href="${PAGINA_LOGIN}">Ir para o login</a>`
            );

            return;
        }


        // BUSCAR PLANTAS DO PROFISSIONAL

        const {
            data,
            error

        } = await supabase

            .from(TABELA)

            .select("*")

            .eq(COLUNA_DONO, session.user.id);


        if (error) throw error;


        // CONVERTER DADOS

        plantas = (data || []).map(doBanco);


        // ATUALIZAR PÁGINA

        render();


    } catch (erro) {

        console.error("[Projetos]", erro);

        mostrarMensagem(
            esc(textoErro(erro))
        );

    }

}


/* =========================================================
   EXECUTAR
========================================================= */

iniciar();
