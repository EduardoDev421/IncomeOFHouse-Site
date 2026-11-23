// Front-End/js/MeusEnderecos.js
// Carregado como módulo: <script type="module" src="../js/MeusEnderecos.js"></script>
import { supabase } from "./lib/supabaseClient.js";

if (typeof Conta !== "undefined") Conta.renderMenu("enderecos");

const TABELA = "enderecos";

const $ = (id) => document.getElementById(id);

const esc = (t) =>
    String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let usuarioId = null;
let enderecos = [];
let editandoId = null;
let salvando = false;
let buscaCepAtual = 0;
let ultimoCepConsultado = "";

const modal = $("modal");
const form = $("form");

/* ---------- Opções de apelido (sugestões do campo "Apelido") ---------- */
const APELIDOS = [
    "Casa",
    "Trabalho",
    "Imóvel de investimento",
    "Apartamento",
    "Casa de praia",
    "Casa de campo",
    "Sítio / Chácara",
    "Terreno",
    "Obra / Construção",
    "Escritório",
    "Loja / Ponto comercial",
    "Casa dos pais",
    "Casa de familiar",
    "Imóvel para aluguel",
    "Outro"
];

$("apelidos").replaceChildren(
    ...APELIDOS.map((nome) => {
        const opcao = document.createElement("option");
        opcao.value = nome;
        return opcao;
    })
);

/* ---------- Utilidades ---------- */
function formatarCep(valor) {
    const n = String(valor || "").replace(/\D/g, "").slice(0, 8);
    return n.length > 5 ? `${n.slice(0, 5)}-${n.slice(5)}` : n;
}

// Traduz os erros do Supabase/Postgres. O texto original (em inglês) fica só no console.
function textoErro(erro) {
    const original = String(erro?.message || "");
    const m = original.toLowerCase();

    // coluna que o banco não conhece: "Could not find the 'rua' column of 'enderecos' in the schema cache"
    const coluna = original.match(/could not find the '([^']+)' column/i);
    if (coluna)
        return `A coluna "${coluna[1]}" não existe na tabela de endereços do Supabase. Ajuste a tabela e tente de novo.`;

    if (erro?.code === "PGRST205" || m.includes("could not find the table") || m.includes("does not exist"))
        return "A tabela de endereços ainda não foi criada no Supabase.";
    if (erro?.code === "23503" || m.includes("foreign key"))
        return "Este endereço está vinculado a um pedido e não pode ser excluído.";
    if (erro?.code === "23502" || m.includes("null value in column"))
        return "Há um campo obrigatório do banco que não foi preenchido.";
    if (erro?.code === "23505" || m.includes("duplicate key"))
        return "Já existe um registro igual a este.";
    if (m.includes("row-level security") || m.includes("permission denied") || m.includes("not authorized"))
        return "Sem permissão para essa operação.";
    if (m.includes("jwt") || m.includes("not authenticated"))
        return "Sua sessão expirou. Entre na sua conta novamente.";
    if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("load failed"))
        return "Sem conexão com o servidor. Tente novamente.";

    return "Não foi possível concluir a operação. Tente novamente.";
}

function avisoLista(texto, comLinkLogin = false) {
    $("resumo").innerHTML = "";
    $("lista").innerHTML =
        `<p class="aviso-js">${esc(texto)}` +
        (comLinkLogin ? ' <a href="./Login.html">Ir para o login</a>' : "") +
        "</p>";
}

/* ---------- Supabase ---------- */
async function carregar() {
    const { data, error } = await supabase
        .from(TABELA)
        .select("*")
        .eq("usuario_id", usuarioId)
        .order("principal", { ascending: false })
        .order("criado_em", { ascending: true });
    if (error) throw error;
    enderecos = data || [];
    render();
}

async function definirPrincipal(id) {
    const { error } = await supabase.rpc("definir_endereco_principal", { p_id: id });
    if (error) throw error;
}

/* ---------- Renderização ---------- */
function renderCard(e) {
    const linha1 = `${esc(e.rua)}, ${esc(e.numero)}${e.complemento ? " - " + esc(e.complemento) : ""}`;

    return `
        <article class="end-card${e.principal ? " principal" : ""}" data-id="${e.id}">
            <div class="end-topo">
                <span class="end-apelido">
                    <span class="icone"><img src="../img/icones/IconeEndereco.svg" alt=""></span>
                    ${esc(e.apelido)}
                </span>
                ${e.principal ? '<span class="badge">Principal</span>' : ""}
            </div>
            <p>${linha1}</p>
            <p class="sec">${esc(e.bairro)}</p>
            <p class="sec">${esc(e.cidade)} - ${esc(e.uf)} · CEP ${esc(formatarCep(e.cep))}</p>
            <div class="acoes">
                ${e.principal ? "" : '<button data-acao="principal">Definir como principal</button>'}
                <button data-acao="editar">Editar</button>
                <button class="excluir" data-acao="excluir">Excluir</button>
            </div>
        </article>`;
}

function render() {
    $("resumo").innerHTML = enderecos.length
        ? `<strong>${enderecos.length}</strong> endereço${enderecos.length > 1 ? "s" : ""} salvo${enderecos.length > 1 ? "s" : ""}`
        : "";

    $("lista").innerHTML = enderecos.length
        ? enderecos.map(renderCard).join("") +
          '<button class="novo-card" id="cardNovo"><span>+</span>Adicionar novo endereço</button>'
        : '<div class="vazio">Você ainda não tem endereços salvos.<br>Adicione o primeiro para agilizar seus pedidos e agendamentos.</div>';
}

/* ---------- Modal ---------- */
function abrirModal(endereco) {
    form.reset();
    $("erro").textContent = "";
    statusCep.textContent = "";
    ultimoCepConsultado = "";
    buscaCepAtual++;
    form.querySelectorAll(".invalido").forEach((i) => i.classList.remove("invalido"));
    editandoId = endereco ? endereco.id : null;
    $("modalTitulo").textContent = endereco ? "Editar endereço" : "Novo endereço";

    if (endereco) {
        ["apelido", "cep", "rua", "numero", "complemento", "bairro", "cidade", "uf"].forEach((k) => {
            form.elements[k].value = k === "cep" ? formatarCep(endereco[k]) : (endereco[k] ?? "");
        });
        form.elements.principal.checked = Boolean(endereco.principal);
    } else if (!enderecos.length) {
        form.elements.principal.checked = true;
    }
    modal.showModal();
}

$("btnNovo").onclick = () => {
    if (!usuarioId) return avisoLista("Você precisa entrar na sua conta para cadastrar endereços.", true);
    abrirModal();
};
$("btnCancelar").onclick = () => modal.close();

/* ---------- Lista: ações dos cards ---------- */
$("lista").addEventListener("click", async (ev) => {
    if (ev.target.closest("#cardNovo")) return abrirModal();

    const botao = ev.target.closest("[data-acao]");
    if (!botao) return;

    const id = Number(botao.closest(".end-card").dataset.id);
    const endereco = enderecos.find((e) => e.id === id);
    if (!endereco) return;

    if (botao.dataset.acao === "editar") return abrirModal(endereco);

    botao.disabled = true;
    try {
        if (botao.dataset.acao === "principal") {
            await definirPrincipal(id);
        }

        if (botao.dataset.acao === "excluir") {
            if (!confirm(`Excluir o endereço "${endereco.apelido}"?`)) {
                botao.disabled = false;
                return;
            }
            const { error } = await supabase
                .from(TABELA)
                .delete()
                .eq("id", id)
                .eq("usuario_id", usuarioId);
            if (error) throw error;

            // se excluiu o principal, o primeiro restante assume
            const restantes = enderecos.filter((e) => e.id !== id);
            if (endereco.principal && restantes.length) await definirPrincipal(restantes[0].id);
        }

        await carregar();
    } catch (erro) {
        console.error("[Endereços]", erro);
        botao.disabled = false;
        alert(textoErro(erro));
    }
});

/* ---------- Formulário ---------- */
// Mensagem de status logo abaixo do campo CEP
const campoCep = form.elements.cep;
const statusCep = document.createElement("small");
statusCep.setAttribute("aria-live", "polite");
statusCep.style.cssText = "display:block;min-height:1.2em;margin-top:4px;font-size:12px;opacity:.85;";
campoCep.closest("label").append(statusCep);

async function buscarJson(url, tempoMs = 6000) {
    const controle = new AbortController();
    const timer = setTimeout(() => controle.abort(), tempoMs);
    try {
        const resposta = await fetch(url, { signal: controle.signal });
        if (!resposta.ok) return null;
        return await resposta.json();
    } finally {
        clearTimeout(timer);
    }
}

// Tenta 3 serviços gratuitos em sequência; o primeiro que achar o CEP vale
async function consultarCep(cep) {
    try {
        const d = await buscarJson(`https://viacep.com.br/ws/${cep}/json/`);
        if (d && !d.erro) {
            return { rua: d.logradouro || "", bairro: d.bairro || "", cidade: d.localidade || "", uf: d.uf || "" };
        }
    } catch (_) { /* tenta o próximo */ }

    try {
        const d = await buscarJson(`https://brasilapi.com.br/api/cep/v2/${cep}`);
        if (d && d.city) {
            return { rua: d.street || "", bairro: d.neighborhood || "", cidade: d.city || "", uf: d.state || "" };
        }
    } catch (_) { /* tenta o próximo */ }

    try {
        const d = await buscarJson(`https://cep.awesomeapi.com.br/json/${cep}`);
        if (d && d.city) {
            return { rua: d.address || "", bairro: d.district || "", cidade: d.city || "", uf: d.state || "" };
        }
    } catch (_) { /* sem resposta: segue manual */ }

    return null;
}

async function preencherPorCep() {
    const n = campoCep.value.replace(/\D/g, "");
    if (n.length !== 8) {
        statusCep.textContent = "";
        ultimoCepConsultado = "";
        return;
    }
    if (n === ultimoCepConsultado) return;
    ultimoCepConsultado = n;

    const busca = ++buscaCepAtual;
    statusCep.textContent = "Buscando endereço...";

    const dados = await consultarCep(n);
    if (busca !== buscaCepAtual) return; // o usuário já mudou o CEP

    if (!dados) {
        ultimoCepConsultado = "";
        statusCep.textContent = "Não encontramos esse CEP. Preencha o endereço manualmente.";
        return;
    }

    Object.entries(dados).forEach(([nome, valor]) => {
        form.elements[nome].value = nome === "uf" ? valor.toUpperCase() : valor;
        form.elements[nome].classList.remove("invalido");
    });

    statusCep.textContent = dados.rua
        ? "Endereço encontrado. Agora é só informar o número."
        : "CEP geral da cidade: informe a rua e o bairro.";

    // leva o cursor para o próximo campo, sem roubar o foco se o usuário já foi para outro
    if (document.activeElement === campoCep) {
        (dados.rua ? form.elements.numero : form.elements.rua).focus();
    }
}

// Máscara do CEP + preenchimento automático ao completar os 8 números
campoCep.addEventListener("input", (ev) => {
    ev.target.value = formatarCep(ev.target.value);
    preencherPorCep();
});
campoCep.addEventListener("blur", preencherPorCep);

form.elements.uf.addEventListener("input", (ev) => {
    ev.target.value = ev.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase();
});

form.addEventListener("input", (ev) => ev.target.classList?.remove("invalido"));

form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (salvando) return;

    if (!usuarioId) {
        $("erro").textContent = "Você precisa entrar na sua conta para salvar endereços.";
        return;
    }

    const obrigatorios = ["apelido", "cep", "numero", "rua", "bairro", "cidade", "uf"];
    let ok = true;

    obrigatorios.forEach((nome) => {
        const campo = form.elements[nome];
        const valor = campo.value.trim();
        const valido = nome === "cep" ? valor.replace(/\D/g, "").length === 8
                     : nome === "uf" ? valor.length === 2
                     : valor.length > 0;
        campo.classList.toggle("invalido", !valido);
        if (!valido) ok = false;
    });

    if (!ok) {
        $("erro").textContent = "Preencha os campos obrigatórios. O CEP precisa ter 8 números e a UF 2 letras.";
        return;
    }

    const f = (n) => form.elements[n].value.trim();
    const dados = {
        apelido: f("apelido"),
        cep: f("cep").replace(/\D/g, ""),
        rua: f("rua"),
        numero: f("numero"),
        complemento: f("complemento") || null,
        bairro: f("bairro"),
        cidade: f("cidade"),
        uf: f("uf").toUpperCase()
    };

    const editando = editandoId ? enderecos.find((e) => e.id === editandoId) : null;
    // sempre existe um principal: o primeiro endereço, ou o que já era principal, continua assim
    const querPrincipal = form.elements.principal.checked || !enderecos.length || Boolean(editando?.principal);
    const jaEraPrincipal = Boolean(editando?.principal);

    const botaoSalvar = form.querySelector('button[type="submit"]');
    salvando = true;
    botaoSalvar.disabled = true;
    botaoSalvar.textContent = "Salvando...";
    $("erro").textContent = "";

    try {
        let id = editandoId;

        if (editandoId) {
            const { error } = await supabase
                .from(TABELA)
                .update({ ...dados, atualizado_em: new Date().toISOString() })
                .eq("id", editandoId)
                .eq("usuario_id", usuarioId);
            if (error) throw error;
        } else {
            const { data, error } = await supabase
                .from(TABELA)
                .insert({ ...dados, usuario_id: usuarioId, principal: false })
                .select("id")
                .single();
            if (error) throw error;
            id = data.id;
        }

        if (querPrincipal && !jaEraPrincipal) await definirPrincipal(id);

        modal.close();
        await carregar();
    } catch (erro) {
        console.error("[Endereços]", erro);
        $("erro").textContent = textoErro(erro);
    } finally {
        salvando = false;
        botaoSalvar.disabled = false;
        botaoSalvar.textContent = "Salvar endereço";
    }
});

/* ---------- Iniciar ---------- */
async function iniciar() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!session) {
            avisoLista("Você precisa entrar na sua conta para ver seus endereços.", true);
            return;
        }

        usuarioId = session.user.id;
        await carregar();
    } catch (erro) {
        console.error("[Endereços]", erro);
        avisoLista(textoErro(erro));
    }
}

iniciar();