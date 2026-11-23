import { supabase } from "./lib/supabaseClient.js";

const STORAGE_KEY = "configuracoesProfissionais";
const TABELA = "configuracoes_usuario";

const PADRAO = {
    novosProjetos: true,
    mensagens: true,
    atualizacoesPedidos: true,
    emailsPromocionais: true,
    visibilidadePerfil: "publico",
    areaAtuacao: "",
    servicosOferecidos: "",
    regiaoAtendimento: "",
    disponibilidade: "",
    valorMinimoProjeto: "",
    descricaoProfissional: "",
    dadosEmpresa: {},
    registroProfissional: {},
    portfolio: [],
    dadosRecebimento: {},
    configuracoesCobranca: {}
};

const COLUNAS = {
    novosProjetos: "notificacoes_push",
    mensagens: "notificacoes_push",
    atualizacoesPedidos: "novidades",
    emailsPromocionais: "notificacoes_email",
    visibilidadePerfil: "visibilidade_perfil"
};

let usuarioId = null;
let configuracoes = carregarLocal();

function carregarLocal() {
    try {
        const dados = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        return dados && typeof dados === "object"
            ? { ...PADRAO, ...dados }
            : { ...PADRAO };
    } catch (erro) {
        console.error("Erro ao ler configurações locais:", erro);
        return { ...PADRAO };
    }
}

function salvarLocal(alteracao = {}) {
    configuracoes = { ...configuracoes, ...alteracao };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(configuracoes));
    } catch (erro) {
        console.error("Erro ao salvar configurações locais:", erro);
    }
}

function traduzirErro(erro) {
    const mensagem = String(erro?.message || "").toLowerCase();
    if (mensagem.includes("does not exist") || mensagem.includes("schema cache") || erro?.code === "PGRST205") {
        return "A tabela de configurações ainda não foi criada no Supabase.";
    }
    if (mensagem.includes("row-level security") || mensagem.includes("permission denied")) {
        return "Você não tem permissão para alterar estas configurações.";
    }
    if (mensagem.includes("jwt") || mensagem.includes("not authenticated") || mensagem.includes("invalid claim")) {
        return "Sua sessão expirou. Entre novamente na sua conta.";
    }
    if (mensagem.includes("failed to fetch") || mensagem.includes("networkerror")) {
        return "Sem conexão com o servidor. Verifique sua internet.";
    }
    if (mensagem.includes("could not find the function") || mensagem.includes("excluir_minha_conta")) {
        return "A exclusão definitiva da conta ainda não foi configurada no servidor.";
    }
    return erro?.message || "Não foi possível concluir a operação.";
}

function mostrarMensagem(texto) {
    document.querySelector(".mensagem-configuracao-profissional")?.remove();

    const mensagem = document.createElement("div");
    mensagem.className = "mensagem-configuracao-profissional";
    mensagem.textContent = texto;
    document.body.appendChild(mensagem);

    window.setTimeout(() => {
        mensagem.classList.add("saindo");
        window.setTimeout(() => mensagem.remove(), 300);
    }, 3000);
}

function valorDaLinha(linha) {
    if (!linha) return;
    configuracoes = {
        ...configuracoes,
        novosProjetos: linha.notificacoes_push === null ? configuracoes.novosProjetos : Boolean(linha.notificacoes_push),
        mensagens: linha.notificacoes_push === null ? configuracoes.mensagens : Boolean(linha.notificacoes_push),
        atualizacoesPedidos: linha.novidades === null ? configuracoes.atualizacoesPedidos : Boolean(linha.novidades),
        emailsPromocionais: linha.notificacoes_email === null ? configuracoes.emailsPromocionais : Boolean(linha.notificacoes_email),
        visibilidadePerfil: linha.visibilidade_perfil === "privado" ? "privado" : "publico"
    };
    salvarLocal();
}

async function carregarConfiguracoes() {
    if (!usuarioId) return;

    try {
        const { data, error } = await supabase
            .from(TABELA)
            .select("notificacoes_push, novidades, notificacoes_email, visibilidade_perfil")
            .eq("usuario_id", usuarioId)
            .maybeSingle();

        if (error) throw error;
        valorDaLinha(data);
    } catch (erro) {
        console.warn("Usando configurações locais:", erro);
    }
}

function linhaParaSalvar() {
    return {
        usuario_id: usuarioId,
        notificacoes_push: configuracoes.novosProjetos && configuracoes.mensagens,
        novidades: configuracoes.atualizacoesPedidos,
        notificacoes_email: configuracoes.emailsPromocionais,
        visibilidade_perfil: configuracoes.visibilidadePerfil
    };
}

async function salvarSupabase(alteracao) {
    if (!usuarioId) {
        mostrarMensagem("Entre na sua conta para salvar as configurações.");
        return false;
    }

    const anterior = { ...configuracoes };
    salvarLocal(alteracao);

    try {
        const { error } = await supabase
            .from(TABELA)
            .upsert(linhaParaSalvar(), { onConflict: "usuario_id" });

        if (error) throw error;
        return true;
    } catch (erro) {
        configuracoes = anterior;
        salvarLocal();
        aplicarConfiguracoes();
        mostrarMensagem(traduzirErro(erro));
        return false;
    }
}

function aplicarConfiguracoes() {
    const switches = document.querySelectorAll('.notificações input[type="checkbox"]');

    const estados = [
        configuracoes.novosProjetos,
        configuracoes.mensagens,
        configuracoes.atualizacoesPedidos,
        configuracoes.emailsPromocionais
    ];

    switches.forEach((input, indice) => {
        input.checked = Boolean(estados[indice]);
    });

    atualizarResumoVisibilidade();
}

function atualizarResumoVisibilidade() {
    const item = Array.from(document.querySelectorAll(".Privacidades")).find((secao) =>
        secao.querySelector("h3")?.textContent.trim().toLowerCase().includes("visibilidade")
    );

    if (!item) return;

    const paragrafo = item.querySelector("p");
    if (paragrafo) {
        paragrafo.textContent = configuracoes.visibilidadePerfil === "privado"
            ? "Seu perfil é privado"
            : "Seu perfil é público";
    }
}

const NOTIFICACOES = [
    { chave: "novosProjetos", texto: "Notificações de novos projetos" },
    { chave: "mensagens", texto: "Notificações de mensagens" },
    { chave: "atualizacoesPedidos", texto: "Atualizações de pedidos" },
    { chave: "emailsPromocionais", texto: "E-mails promocionais" }
];

document.querySelectorAll('.notificações input[type="checkbox"]').forEach((input, indice) => {
    const notificacao = NOTIFICACOES[indice];
    if (!notificacao) return;

    input.checked = Boolean(configuracoes[notificacao.chave]);
    input.addEventListener("change", async () => {
        input.disabled = true;
        const ok = await salvarSupabase({ [notificacao.chave]: input.checked });
        input.disabled = false;

        if (ok) {
            mostrarMensagem(`${notificacao.texto} ${input.checked ? "ativadas" : "desativadas"}.`);
        }
    });
});

function pedirTexto(chave, pergunta, sucesso) {
    const atual = String(configuracoes[chave] || "");
    const valor = window.prompt(pergunta, atual);
    if (valor === null) return;

    salvarLocal({ [chave]: valor.trim() });
    mostrarMensagem(sucesso);
}

function pedirValorMinimo() {
    const valor = window.prompt("Informe o valor mínimo do projeto:", configuracoes.valorMinimoProjeto);
    if (valor === null) return;

    const numero = Number(String(valor).replace(/R\$/gi, "").replace(/\./g, "").replace(",", ".").trim());
    if (!Number.isFinite(numero) || numero < 0) {
        mostrarMensagem("Informe um valor válido.");
        return;
    }

    salvarLocal({ valorMinimoProjeto: numero });
    mostrarMensagem("Valor mínimo de projeto atualizado.");
}

function abrirModalVisibilidade() {
    if (document.querySelector(".modal-visibilidade-profissional")) return;

    const overlay = document.createElement("div");
    overlay.className = "modal-visibilidade-profissional";
    overlay.innerHTML = `
        <div class="modal-visibilidade-caixa" role="dialog" aria-modal="true" aria-labelledby="tituloVisibilidadeProfissional">
            <h3 id="tituloVisibilidadeProfissional">Visibilidade do perfil</h3>
            <p>Escolha quem pode visualizar seu perfil profissional.</p>
            <label class="opcao-visibilidade">
                <input type="radio" name="visibilidadeProfissional" value="publico" ${configuracoes.visibilidadePerfil === "publico" ? "checked" : ""}>
                <span><strong>Público</strong><small>Outros usuários podem ver seu perfil.</small></span>
            </label>
            <label class="opcao-visibilidade">
                <input type="radio" name="visibilidadeProfissional" value="privado" ${configuracoes.visibilidadePerfil === "privado" ? "checked" : ""}>
                <span><strong>Privado</strong><small>Somente você pode ver seu perfil.</small></span>
            </label>
            <div class="modal-visibilidade-botoes">
                <button type="button" class="btn-cancelar">Cancelar</button>
                <button type="button" class="btn-salvar">Salvar</button>
            </div>
        </div>`;

    document.body.appendChild(overlay);

    const fechar = () => overlay.remove();
    overlay.addEventListener("click", (evento) => {
        if (evento.target === overlay) fechar();
    });
    overlay.querySelector(".btn-cancelar").addEventListener("click", fechar);

    overlay.querySelector(".btn-salvar").addEventListener("click", async (evento) => {
        const escolhida = overlay.querySelector('input[name="visibilidadeProfissional"]:checked');
        if (!escolhida) return;

        evento.currentTarget.disabled = true;
        const ok = await salvarSupabase({ visibilidadePerfil: escolhida.value });
        if (ok) {
            atualizarResumoVisibilidade();
            mostrarMensagem(escolhida.value === "publico"
                ? "Seu perfil agora é público."
                : "Seu perfil agora é privado.");
        }
        fechar();
    });
}

async function excluirConta() {
    if (!window.confirm("Tem certeza que deseja excluir sua conta profissional?")) return;
    if (!window.confirm("Essa ação é permanente. Deseja realmente continuar?")) return;

    try {
        const { error } = await supabase.rpc("excluir_minha_conta");
        if (error) throw error;

        localStorage.removeItem(STORAGE_KEY);
        await supabase.auth.signOut();
        window.location.href = "../index.html";
    } catch (erro) {
        mostrarMensagem(traduzirErro(erro));
    }
}

const ACOES = {
    "áreas de atuação": () => pedirTexto("areaAtuacao", "Digite suas principais áreas de atuação:", "Áreas de atuação atualizadas."),
    "serviços oferecidos": () => pedirTexto("servicosOferecidos", "Digite os serviços que você oferece:", "Serviços oferecidos atualizados."),
    "região de atendimento": () => pedirTexto("regiaoAtendimento", "Informe sua região de atendimento:", "Região de atendimento atualizada."),
    "disponibidade": () => pedirTexto("disponibilidade", "Informe seus horários de atendimento:", "Disponibilidade atualizada."),
    "disponibilidade": () => pedirTexto("disponibilidade", "Informe seus horários de atendimento:", "Disponibilidade atualizada."),
    "valor mínimo de projeto": pedirValorMinimo,
    "descrição profissional": () => pedirTexto("descricaoProfissional", "Digite sua descrição profissional:", "Descrição profissional atualizada."),
    "visibilidade do perfil": abrirModalVisibilidade,
    "excluir conta": excluirConta
};

const seletores = document.querySelectorAll(
    ".seguranças, .ConfigProfissionais, .PerfilProfissionais, " +
    ".Financeiros, .Privacidades, .PrivacidadesU, " +
    ".CentralAjudas, .CentralAjudaU"
);

seletores.forEach((item) => {
    const titulo = item.querySelector("h3")?.textContent.trim().toLowerCase();
    const acao = titulo ? ACOES[titulo] : null;
    if (!acao) return;

    item.style.cursor = "pointer";
    item.addEventListener("click", (evento) => {
        if (evento.target.closest("a") && titulo !== "visibilidade do perfil") return;
        if (evento.target.closest("a") && !titulo.startsWith("área")) {
            // Itens profissionais usam ação própria quando não possuem página dedicada.
        }
        evento.preventDefault();
        acao();
    });
});

document.querySelectorAll(".menu-lateral a").forEach((link) => {
    if (link.textContent.trim().toLowerCase() !== "sair") return;

    link.addEventListener("click", async (evento) => {
        evento.preventDefault();
        if (!window.confirm("Deseja realmente sair da sua conta?")) return;

        const { error } = await supabase.auth.signOut();
        if (error) {
            mostrarMensagem(traduzirErro(error));
            return;
        }

        ["usuarioLogado", "usuario", "user", "usuarioAtual", STORAGE_KEY].forEach((chave) => {
            localStorage.removeItem(chave);
        });
        window.location.href = "../index.html";
    });
});

async function iniciar() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!session) {
            window.location.href = "./login.html";
            return;
        }

        usuarioId = session.user.id;
        await carregarConfiguracoes();
        aplicarConfiguracoes();
    } catch (erro) {
        console.error("Erro ao iniciar configurações profissionais:", erro);
        mostrarMensagem(traduzirErro(erro));
    }
}

iniciar();