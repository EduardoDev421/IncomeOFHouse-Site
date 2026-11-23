import { supabase } from "./lib/supabaseClient.js";

// ============================================================
// CONFIGURAÇÕES DO USUÁRIO (Supabase: tabela configuracoes_usuario)
// ============================================================

const TABELA = "configuracoes_usuario";

// Elementos
const tema = document.querySelector("#tema");
const idioma = document.querySelector("#idioma");
const moeda = document.querySelector("#moeda");
const toggles = document.querySelectorAll('.notificações input[type="checkbox"]');
const secoesSeguranca = document.querySelectorAll(".seguranças");
const secoesPrivacidade = document.querySelectorAll(".privacidades");
const secoesAjuda = document.querySelectorAll(".CentralAjudas, .CentralAjudaU");

// Valores padrão (usados enquanto o usuário não salvou nada)
const configuracoesPadrao = {
    notificacoesEmail: true,
    notificacoesPush: true,
    novidades: true,
    tema: "escuro",
    idioma: "pt-br",
    moeda: "BRL",
    visibilidadePerfil: "publico" // "publico" | "privado"
};

// camelCase (JS) <-> snake_case (banco)
const COLUNAS = {
    notificacoesEmail: "notificacoes_email",
    notificacoesPush: "notificacoes_push",
    novidades: "novidades",
    tema: "tema",
    idioma: "idioma",
    moeda: "moeda",
    visibilidadePerfil: "visibilidade_perfil"
};

const deLinha = (linha) =>
    Object.fromEntries(Object.entries(COLUNAS).map(([js, col]) => [js, linha[col]]));

const paraLinha = (config) =>
    Object.fromEntries(Object.entries(COLUNAS).map(([js, col]) => [col, config[js]]));

let configuracoes = { ...configuracoesPadrao };
let usuarioId = null;

const textoErro = (error) => error?.message || "Ocorreu um erro inesperado.";

// ============================================================
// SUPABASE
// ============================================================

async function carregarConfiguracoes() {
    const { data, error } = await supabase
        .from(TABELA)
        .select("*")
        .eq("usuario_id", usuarioId)
        .maybeSingle();

    if (error) {
        mostrarMensagem(textoErro(error));
        return;
    }
    if (data) configuracoes = { ...configuracoesPadrao, ...deLinha(data) };
}

// Salva a alteração; se falhar, volta ao valor anterior e avisa.
async function salvar(alteracao) {
    const anterior = { ...configuracoes };
    configuracoes = { ...configuracoes, ...alteracao };

    const { error } = await supabase
        .from(TABELA)
        .upsert({ usuario_id: usuarioId, ...paraLinha(configuracoes) }, { onConflict: "usuario_id" });

    if (error) {
        configuracoes = anterior;
        aplicarConfiguracoes();
        mostrarMensagem(textoErro(error));
        return false;
    }
    return true;
}

// ============================================================
// MENSAGEM TEMPORÁRIA
// ============================================================

function mostrarMensagem(texto) {
    document.querySelector(".mensagem-configuracao")?.remove();

    const mensagem = document.createElement("div");
    mensagem.className = "mensagem-configuracao";
    mensagem.textContent = texto;
    document.body.appendChild(mensagem);

    setTimeout(() => {
        mensagem.classList.add("saindo");
        setTimeout(() => mensagem.remove(), 300);
    }, 3000);
}

// ============================================================
// TEMA
// ============================================================

function aplicarTema() {
    document.body.classList.remove("tema-claro", "tema-escuro");
    document.body.classList.add(configuracoes.tema === "claro" ? "tema-claro" : "tema-escuro");
}

// ============================================================
// VISIBILIDADE DO PERFIL (modal de escolha)
// ============================================================

const OPCOES_VISIBILIDADE = {
    publico: {
        titulo: "Público",
        descricao: "Profissionais e outros usuários podem ver seu perfil.",
        resumo: "Seu perfil é público"
    },
    privado: {
        titulo: "Privado",
        descricao: "Ninguém pode ver seu perfil. Só você tem acesso.",
        resumo: "Seu perfil é privado"
    }
};

function atualizarResumoVisibilidade() {
    const item = Array.from(secoesPrivacidade).find((secao) => {
        const h3 = secao.querySelector("h3");
        return h3 && h3.textContent.trim().toLowerCase() === "quem pode ver seu perfil";
    });
    if (!item) return;

    const p = item.querySelector("p");
    const opcao = OPCOES_VISIBILIDADE[configuracoes.visibilidadePerfil];
    if (p && opcao) p.textContent = opcao.resumo;
}

function abrirModalVisibilidade() {
    if (document.querySelector(".modal-visibilidade")) return;

    const overlay = document.createElement("div");
    overlay.className = "modal-visibilidade";

    const opcoesHTML = Object.entries(OPCOES_VISIBILIDADE)
        .map(([valor, opcao]) => `
            <label class="opcao-visibilidade">
                <input type="radio" name="visibilidade" value="${valor}"
                    ${configuracoes.visibilidadePerfil === valor ? "checked" : ""}>
                <span class="opcao-visibilidade-texto">
                    <strong>${opcao.titulo}</strong>
                    <small>${opcao.descricao}</small>
                </span>
            </label>
        `).join("");

    overlay.innerHTML = `
        <div class="modal-visibilidade-caixa" role="dialog" aria-modal="true"
             aria-labelledby="tituloVisibilidade">
            <h3 id="tituloVisibilidade">Quem pode ver seu perfil</h3>
            <p>Escolha se outras pessoas podem ou não ver o seu perfil.</p>
            <div class="opcoes-visibilidade">${opcoesHTML}</div>
            <div class="modal-visibilidade-botoes">
                <button type="button" class="btn-cancelar">Cancelar</button>
                <button type="button" class="btn-salvar">Salvar</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    function fechar() {
        document.removeEventListener("keydown", aoPressionarTecla);
        overlay.remove();
    }
    function aoPressionarTecla(evento) {
        if (evento.key === "Escape") fechar();
    }

    document.addEventListener("keydown", aoPressionarTecla);
    overlay.addEventListener("click", (evento) => { if (evento.target === overlay) fechar(); });
    overlay.querySelector(".btn-cancelar").addEventListener("click", fechar);

    overlay.querySelector(".btn-salvar").addEventListener("click", async (evento) => {
        const escolhida = overlay.querySelector('input[name="visibilidade"]:checked');
        if (!escolhida) return fechar();

        evento.currentTarget.disabled = true;
        const ok = await salvar({ visibilidadePerfil: escolhida.value });
        if (ok) {
            atualizarResumoVisibilidade();
            mostrarMensagem(escolhida.value === "publico"
                ? "Seu perfil agora é público."
                : "Seu perfil agora é privado.");
        }
        fechar();
    });
}

// ============================================================
// EXCLUSÃO DA CONTA
// ============================================================

async function confirmarExclusaoConta() {
    if (!confirm("Tem certeza que deseja excluir sua conta?")) return;
    if (!confirm("Essa ação é permanente. Deseja realmente continuar?")) return;

    const { error } = await supabase.rpc("excluir_minha_conta");
    if (error) {
        mostrarMensagem(textoErro(error));
        return;
    }

    await supabase.auth.signOut();
    window.location.href = "../index.html";
}

// ============================================================
// APLICAR CONFIGURAÇÕES NA TELA
// ============================================================

function aplicarConfiguracoes() {
    if (toggles[0]) toggles[0].checked = configuracoes.notificacoesEmail;
    if (toggles[1]) toggles[1].checked = configuracoes.notificacoesPush;
    if (toggles[2]) toggles[2].checked = configuracoes.novidades;

    if (tema) tema.value = configuracoes.tema === "claro" ? "claro" : "escuro";
    aplicarTema();

    if (idioma && Array.from(idioma.options).some((o) => o.value === configuracoes.idioma)) {
        idioma.value = configuracoes.idioma;
    }
    if (moeda && Array.from(moeda.options).some((o) => o.value === configuracoes.moeda)) {
        moeda.value = configuracoes.moeda;
    }

    atualizarResumoVisibilidade();
}

// ============================================================
// EVENTOS
// ============================================================

const NOTIFICACOES = [
    { chave: "notificacoesEmail", on: "Notificações por e-mail ativadas.", off: "Notificações por e-mail desativadas." },
    { chave: "notificacoesPush", on: "Notificações Push ativadas.", off: "Notificações Push desativadas." },
    { chave: "novidades", on: "Novidades e atualizações ativadas.", off: "Novidades e atualizações desativadas." }
];

NOTIFICACOES.forEach((notificacao, indice) => {
    const input = toggles[indice];
    if (!input) return;

    input.addEventListener("change", async () => {
        const ok = await salvar({ [notificacao.chave]: input.checked });
        if (ok) mostrarMensagem(input.checked ? notificacao.on : notificacao.off);
    });
});

tema?.addEventListener("change", async () => {
    const ok = await salvar({ tema: tema.value === "claro" ? "claro" : "escuro" });
    if (!ok) return;
    aplicarTema();
    mostrarMensagem(`Tema ${configuracoes.tema} selecionado.`);
});

idioma?.addEventListener("change", async () => {
    const ok = await salvar({ idioma: idioma.value });
    if (ok) mostrarMensagem(`Idioma selecionado: ${idioma.options[idioma.selectedIndex].text}.`);
});

moeda?.addEventListener("change", async () => {
    const ok = await salvar({ moeda: moeda.value });
    if (ok) mostrarMensagem(`Moeda selecionada: ${moeda.options[moeda.selectedIndex].text}.`);
});

// Itens sem link (os que têm <a href> navegam sozinhos)
const ACOES = {
    "quem pode ver seu perfil": abrirModalVisibilidade,
    "excluir conta": confirmarExclusaoConta
};

[...secoesSeguranca, ...secoesPrivacidade, ...secoesAjuda].forEach((item) => {
    if (item.querySelector("a[href]")) return;

    const titulo = item.querySelector("h3");
    if (!titulo) return;

    const acao = ACOES[titulo.textContent.trim().toLowerCase()];
    if (!acao) return;

    item.style.cursor = "pointer";
    item.addEventListener("click", acao);
});

// Sair da conta
document.querySelectorAll(".menu-lateral a").forEach((link) => {
    if (link.textContent.trim().toLowerCase() !== "sair") return;

    link.addEventListener("click", async (evento) => {
        evento.preventDefault();
        if (!confirm("Deseja realmente sair da sua conta?")) return;

        const { error } = await supabase.auth.signOut();
        if (error) {
            mostrarMensagem(textoErro(error));
            return;
        }
        window.location.href = "../index.html";
    });
});

// ============================================================
// INICIALIZAÇÃO
// ============================================================

async function iniciar() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = "./login.html";
        return;
    }
    usuarioId = session.user.id;

    await carregarConfiguracoes();
    aplicarConfiguracoes();
}

iniciar();