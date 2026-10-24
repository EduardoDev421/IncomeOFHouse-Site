if (typeof Conta !== "undefined") Conta.renderMenu("enderecos");

const $ = (id) => document.getElementById(id);

const esc = (t) =>
    String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Dados de exemplo (trocar por dados reais da API/banco depois)
let enderecos = [
    { id: 1, apelido: "Casa", cep: "70000-000", rua: "Rua das Palmeiras", numero: "120", complemento: "Apto 301", bairro: "Asa Norte", cidade: "Brasília", uf: "DF", principal: true },
    { id: 2, apelido: "Trabalho", cep: "70070-100", rua: "Avenida Central", numero: "55", complemento: "Sala 12", bairro: "Setor Comercial", cidade: "Brasília", uf: "DF", principal: false }
];

let proximoId = 10;
let editandoId = null;

const modal = $("modal");
const form = $("form");

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
            <p class="sec">${esc(e.cidade)} - ${esc(e.uf)} · CEP ${esc(e.cep)}</p>
            <div class="acoes">
                ${e.principal ? "" : '<button data-acao="principal">Definir como principal</button>'}
                <button data-acao="editar">Editar</button>
                <button class="excluir" data-acao="excluir">Excluir</button>
            </div>
        </article>`;
}

function render() {
    const ordenados = [...enderecos].sort((a, b) => Number(b.principal) - Number(a.principal));

    $("resumo").innerHTML = enderecos.length
        ? `<strong>${enderecos.length}</strong> endereço${enderecos.length > 1 ? "s" : ""} salvo${enderecos.length > 1 ? "s" : ""}`
        : "";

    $("lista").innerHTML = ordenados.length
        ? ordenados.map(renderCard).join("") +
          '<button class="novo-card" id="cardNovo"><span>+</span>Adicionar novo endereço</button>'
        : '<div class="vazio">Você ainda não tem endereços salvos.<br>Adicione o primeiro para agilizar seus pedidos e agendamentos.</div>';
}

/* ---------- Modal ---------- */
function abrirModal(endereco) {
    form.reset();
    $("erro").textContent = "";
    form.querySelectorAll(".invalido").forEach((i) => i.classList.remove("invalido"));
    editandoId = endereco ? endereco.id : null;
    $("modalTitulo").textContent = endereco ? "Editar endereço" : "Novo endereço";

    if (endereco) {
        Object.entries(endereco).forEach(([k, v]) => {
            const campo = form.elements[k];
            if (!campo) return;
            if (campo.type === "checkbox") campo.checked = v;
            else campo.value = v;
        });
    } else if (!enderecos.length) {
        form.elements.principal.checked = true;
    }
    modal.showModal();
}

$("btnNovo").onclick = () => abrirModal();
$("btnCancelar").onclick = () => modal.close();

/* ---------- Lista: ações dos cards ---------- */
$("lista").addEventListener("click", (ev) => {
    if (ev.target.closest("#cardNovo")) return abrirModal();

    const botao = ev.target.closest("[data-acao]");
    if (!botao) return;

    const id = Number(botao.closest(".end-card").dataset.id);
    const endereco = enderecos.find((e) => e.id === id);

    if (botao.dataset.acao === "editar") return abrirModal(endereco);

    if (botao.dataset.acao === "principal") {
        enderecos.forEach((e) => (e.principal = e.id === id));
    }

    if (botao.dataset.acao === "excluir") {
        if (!confirm(`Excluir o endereço "${endereco.apelido}"?`)) return;
        enderecos = enderecos.filter((e) => e.id !== id);
        if (endereco.principal && enderecos.length) enderecos[0].principal = true;
    }
    render();
});

/* ---------- Formulário ---------- */
// Máscara do CEP e preenchimento automático (ViaCEP). Se a consulta falhar, o usuário preenche à mão.
form.elements.cep.addEventListener("input", async (ev) => {
    let n = ev.target.value.replace(/\D/g, "").slice(0, 8);
    ev.target.value = n.length > 5 ? `${n.slice(0, 5)}-${n.slice(5)}` : n;

    if (n.length !== 8) return;
    try {
        const r = await fetch(`https://viacep.com.br/ws/${n}/json/`);
        const d = await r.json();
        if (d.erro) return;
        if (!form.elements.rua.value) form.elements.rua.value = d.logradouro || "";
        if (!form.elements.bairro.value) form.elements.bairro.value = d.bairro || "";
        if (!form.elements.cidade.value) form.elements.cidade.value = d.localidade || "";
        if (!form.elements.uf.value) form.elements.uf.value = d.uf || "";
    } catch (_) { /* sem internet ou bloqueado: segue manual */ }
});

form.elements.uf.addEventListener("input", (ev) => {
    ev.target.value = ev.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase();
});

form.addEventListener("submit", (ev) => {
    ev.preventDefault();

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
        apelido: f("apelido"), cep: f("cep"), rua: f("rua"), numero: f("numero"),
        complemento: f("complemento"), bairro: f("bairro"), cidade: f("cidade"),
        uf: f("uf").toUpperCase(), principal: form.elements.principal.checked
    };

    if (dados.principal) enderecos.forEach((e) => (e.principal = false));

    if (editandoId) {
        enderecos = enderecos.map((e) => (e.id === editandoId ? { ...e, ...dados } : e));
    } else {
        enderecos.push({ id: proximoId++, ...dados });
    }

    // garante sempre um endereço principal
    if (enderecos.length && !enderecos.some((e) => e.principal)) enderecos[0].principal = true;

    modal.close();
    render();
});

render();