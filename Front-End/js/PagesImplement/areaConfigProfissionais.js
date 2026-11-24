// js/areaConfigProfissionais.js
// Carregado como módulo: <script type="module" src="../../js/areaConfigProfissionais.js"></script>
// Salva no Supabase (tabela configuracoes_profissionais); se não der, guarda neste navegador.
import { supabase } from "./lib/supabaseClient.js";

const TABELA = "configuracoes_profissionais";
const CHAVE_LOCAL = "configProfissionais";

/* ---------- Padrões ---------- */
const PADRAO = {
    tipos: ["Arquiteto", "Engenheiro civil", "Designer de interiores", "Paisagista"],
    preco: { min: 5000, max: 50000 },
    regiao: ["Todas as regiões"],
    contato: ["E-mail", "WhatsApp"],
    interruptores: {
        "notif-recomendados": true, "notif-mensagens": true, "notif-projetos": true, "notif-promocoes": true,
        "aval-exigir": true, "aval-publicas": true, "aval-notificar": true,
        "ver-documentacao": true, "ver-portfolio": true, "ver-certificacoes": true
    }
};

const OPCOES = {
    tipos: {
        titulo: "Tipos de profissionais", tipo: "multi", minimo: 1,
        lista: ["Arquiteto", "Engenheiro civil", "Designer de interiores", "Paisagista", "Empreiteiro", "Eletricista", "Encanador", "Pintor"]
    },
    regiao: {
        titulo: "Região de atuação", tipo: "multi", minimo: 1, exclusiva: "Todas as regiões",
        lista: ["Todas as regiões", "Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"]
    },
    contato: {
        titulo: "Forma de contato preferida", tipo: "multi", minimo: 1,
        lista: ["E-mail", "WhatsApp", "Telefone", "Mensagem na plataforma"]
    },
    preco: { titulo: "Faixa de preço", tipo: "faixa" }
};

/* ---------- Estado ---------- */
let config = structuredClone(PADRAO);
let usuarioId = null;
let editando = null;
let ultimoFoco = null;

const $ = (s, r = document) => r.querySelector(s);
const fundo = $("#modalConfig");
const caixa = fundo?.querySelector(".modal");
const lista = $("#modalLista");
const erroModal = $("#modalErro");
const tituloModal = $("#modalTitulo");

const moeda = (n) => "R$ " + Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 0 });

/* ---------- Aviso ---------- */
let aviso, avisoTimer;
function mostrarAviso(texto, erro = false) {
    if (!aviso) {
        aviso = document.createElement("div");
        aviso.setAttribute("role", "status");
        aviso.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2000;padding:10px 18px;border-radius:10px;font-size:.9rem;background:#141414;border:1px solid #d4a63a;color:#f0ca4c;box-shadow:0 6px 24px #000a";
        document.body.appendChild(aviso);
    }
    aviso.style.borderColor = erro ? "#b5483c" : "#d4a63a";
    aviso.style.color = erro ? "#f0b4ab" : "#f0ca4c";
    aviso.textContent = texto;
    aviso.hidden = false;
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(() => (aviso.hidden = true), 3200);
}

/* ---------- Armazenamento ---------- */
function lerLocal() {
    try { return JSON.parse(localStorage.getItem(CHAVE_LOCAL)); } catch { return null; }
}
function salvarLocal() {
    try { localStorage.setItem(CHAVE_LOCAL, JSON.stringify(config)); } catch { /* sem armazenamento */ }
}

function mesclar(salvo) {
    if (!salvo || typeof salvo !== "object") return;
    for (const k of ["tipos", "regiao", "contato"]) if (Array.isArray(salvo[k]) && salvo[k].length) config[k] = salvo[k];
    if (salvo.preco && Number.isFinite(+salvo.preco.min) && Number.isFinite(+salvo.preco.max)) {
        config.preco = { min: +salvo.preco.min, max: +salvo.preco.max };
    }
    if (salvo.interruptores) config.interruptores = { ...config.interruptores, ...salvo.interruptores };
}

async function carregar() {
    mesclar(lerLocal());
    try {
        const { data: { session } } = await supabase.auth.getSession();
        usuarioId = session?.user?.id || null;
        if (!usuarioId) return;

        const { data, error } = await supabase
            .from(TABELA).select("preferencias").eq("usuario_id", usuarioId).maybeSingle();
        if (error) throw error;
        if (data?.preferencias) mesclar(data.preferencias);
    } catch (erro) {
        console.warn("[Config profissionais] usando dados locais:", erro?.message || erro);
    }
}

async function salvar() {
    salvarLocal();
    if (!usuarioId) {
        mostrarAviso("Salvo neste navegador. Entre na sua conta para sincronizar.");
        return;
    }
    try {
        const { error } = await supabase.from(TABELA).upsert(
            { usuario_id: usuarioId, preferencias: config, atualizado_em: new Date().toISOString() },
            { onConflict: "usuario_id" }
        );
        if (error) throw error;
        mostrarAviso("Configurações salvas.");
    } catch (erro) {
        console.error("[Config profissionais]", erro);
        mostrarAviso("Salvo só neste navegador: " + (erro?.message || "erro ao salvar no servidor."), true);
    }
}

/* ---------- Tela ---------- */
function resumo(chave) {
    if (chave === "preco") return `${moeda(config.preco.min)} — ${moeda(config.preco.max)}`;
    const v = config[chave];
    if (chave === "tipos") return v.length === 1 ? v[0] : `${v.length} selecionados`;
    if (chave === "regiao") return v.includes("Todas as regiões") ? "Todas as regiões" : v.length === 1 ? v[0] : `${v.length} regiões`;
    return v.join(" e ");
}

function atualizarTela() {
    document.querySelectorAll(".seletor[data-config]").forEach((b) => {
        const t = b.querySelector(".seletor-texto");
        if (t) t.textContent = resumo(b.dataset.config);
        b.setAttribute("aria-haspopup", "dialog");
    });
    document.querySelectorAll('input[type="checkbox"][data-config]').forEach((c) => {
        c.checked = !!config.interruptores[c.dataset.config];
    });
}

/* ---------- Modal ---------- */
// Estilo mínimo de reserva (:where tem especificidade zero; o seu CSS sempre vence)
const reserva = document.createElement("style");
reserva.textContent = `
:where(.modal-fundo:not([hidden])){position:fixed;inset:0;z-index:1500;display:grid;place-items:center;background:rgba(0,0,0,.7);padding:16px}
:where(.modal-fundo .modal){background:#141414;border:1px solid #292929;border-radius:14px;padding:22px;width:min(440px,100%);max-height:90vh;overflow:auto;color:#fff}
:where(.modal-lista){display:grid;gap:8px;margin:14px 0}
:where(.modal-opcao){display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #292929;border-radius:10px;cursor:pointer}
:where(.modal-opcao input){accent-color:#d4a63a}
:where(.modal-campo){display:grid;gap:6px}
:where(.modal-campo input){padding:10px;border-radius:8px;border:1px solid #292929;background:#0e0e0e;color:#fff;font:inherit}
:where(.modal-erro){color:#f0b4ab;font-size:.9rem;margin:0 0 8px}
:where(.modal-botoes){display:flex;gap:10px;justify-content:flex-end}
:where(.modal-botoes button){padding:10px 18px;border-radius:10px;border:1px solid #59431f;background:#1d1d1d;color:#fff;cursor:pointer;font:inherit}
:where(.modal-botoes .btn-confirmar){background:#d4a63a;color:#111;border-color:#d4a63a;font-weight:600}
.preco-modal{display:grid;gap:14px}
.preco-campos{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.preco-campo{display:grid;gap:6px;min-width:0}
.preco-rotulo{font-size:.78rem;letter-spacing:.04em;text-transform:uppercase;color:#a89a7a;margin:0}
.preco-input{display:flex;align-items:center;gap:8px;padding:0 12px;border:1px solid #292929;border-radius:10px;background:#0e0e0e;transition:border-color .15s,box-shadow .15s}
.preco-input:focus-within{border-color:#d4a63a;box-shadow:0 0 0 3px rgba(212,166,58,.18)}
.preco-rs{color:#d4a63a;font-weight:600;font-size:.95rem}
.preco-input input{flex:1;min-width:0;width:100%;padding:12px 0;border:0;outline:0;background:transparent;color:#fff;font:inherit;font-size:1.05rem;font-weight:600}
.preco-input input.invalido{color:#f0b4ab}
.preco-chips{display:flex;flex-wrap:wrap;gap:8px}
.preco-chip{padding:8px 12px;border-radius:999px;border:1px solid #59431f;background:#1a1610;color:#e7d9b6;font:inherit;font-size:.85rem;cursor:pointer;transition:background .15s,color .15s}
.preco-chip:hover{background:#29231a}
.preco-chip.ativo{background:#d4a63a;border-color:#d4a63a;color:#111;font-weight:600}
.preco-chip:focus-visible{outline:2px solid #f0ca4c;outline-offset:2px}
.preco-resumo{margin:0;padding:12px;border-radius:10px;background:#29231a;border:1px solid #59431f;color:#f0ca4c;text-align:center;font-weight:700;font-size:1.05rem}
@media (max-width:420px){.preco-campos{grid-template-columns:1fr}}`;
document.head.appendChild(reserva);

/* ---------- Faixa de preço ---------- */
const PREDEFINIDOS = [
    { rotulo: "Até R$ 10 mil", min: 0, max: 10000 },
    { rotulo: "R$ 10 mil – 50 mil", min: 10000, max: 50000 },
    { rotulo: "R$ 50 mil – 100 mil", min: 50000, max: 100000 },
    { rotulo: "Acima de R$ 100 mil", min: 100000, max: 1000000 }
];

const soDigitos = (t) => String(t).replace(/\D/g, "").slice(0, 9);
const formatarNumero = (n) => Number(n).toLocaleString("pt-BR");

function lerValor(input) {
    const d = soDigitos(input.value);
    return d === "" ? null : Number(d);
}

function montarFaixaPreco() {
    const wrap = document.createElement("div");
    wrap.className = "preco-modal";

    const campos = document.createElement("div");
    campos.className = "preco-campos";

    const criarCampo = (id, rotulo, valor) => {
        const l = document.createElement("label");
        l.className = "preco-campo";
        const r = document.createElement("span");
        r.className = "preco-rotulo";
        r.textContent = rotulo;
        const caixa = document.createElement("div");
        caixa.className = "preco-input";
        const rs = document.createElement("span");
        rs.className = "preco-rs";
        rs.textContent = "R$";
        const i = document.createElement("input");
        i.type = "text"; i.id = id; i.inputMode = "numeric"; i.autocomplete = "off";
        i.value = formatarNumero(valor);
        caixa.append(rs, i);
        l.append(r, caixa);
        return l;
    };

    campos.append(criarCampo("precoMin", "Mínimo", config.preco.min), criarCampo("precoMax", "Máximo", config.preco.max));

    const sep = document.createElement("p");
    sep.className = "preco-rotulo preco-atalhos-titulo";
    sep.textContent = "Atalhos";

    const chips = document.createElement("div");
    chips.className = "preco-chips";
    PREDEFINIDOS.forEach((p) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "preco-chip"; b.textContent = p.rotulo;
        b.dataset.min = p.min; b.dataset.max = p.max;
        chips.appendChild(b);
    });

    const resumoP = document.createElement("p");
    resumoP.className = "preco-resumo";
    resumoP.setAttribute("aria-live", "polite");

    wrap.append(campos, sep, chips, resumoP);
    lista.appendChild(wrap);

    const iMin = $("#precoMin"), iMax = $("#precoMax");

    const atualizar = () => {
        const min = lerValor(iMin), max = lerValor(iMax);
        resumoP.textContent = min !== null && max !== null ? `${moeda(min)} — ${moeda(max)}` : "Informe os dois valores";
        chips.querySelectorAll(".preco-chip").forEach((c) =>
            c.classList.toggle("ativo", Number(c.dataset.min) === min && Number(c.dataset.max) === max));
        iMin.classList.toggle("invalido", min !== null && max !== null && min > max);
        iMax.classList.toggle("invalido", min !== null && max !== null && min > max);
    };

    [iMin, iMax].forEach((i) => i.addEventListener("input", () => {
        const d = soDigitos(i.value);
        i.value = d === "" ? "" : formatarNumero(d);
        erroTexto("");
        atualizar();
    }));

    chips.addEventListener("click", (ev) => {
        const c = ev.target.closest(".preco-chip");
        if (!c) return;
        iMin.value = formatarNumero(c.dataset.min);
        iMax.value = formatarNumero(c.dataset.max);
        erroTexto("");
        atualizar();
    });

    atualizar();
}

function erroTexto(t) {
    erroModal.textContent = t || "";
    erroModal.hidden = !t;
}

function abrirModal(chave, gatilho) {
    const def = OPCOES[chave];
    if (!def || !fundo) return;
    editando = chave;
    ultimoFoco = gatilho;
    tituloModal.textContent = def.titulo;
    lista.replaceChildren();
    erroTexto("");

    if (def.tipo === "faixa") {
        montarFaixaPreco();
    } else {
        def.lista.forEach((nome) => {
            const l = document.createElement("label");
            l.className = "modal-opcao";
            const i = document.createElement("input");
            i.type = "checkbox"; i.value = nome; i.checked = config[chave].includes(nome);
            l.append(i, document.createTextNode(nome));
            lista.appendChild(l);
        });
    }

    fundo.hidden = false;
    document.body.style.overflow = "hidden";
    (lista.querySelector("input") || caixa)?.focus();
}

function fecharModal() {
    fundo.hidden = true;
    document.body.style.overflow = "";
    editando = null;
    ultimoFoco?.focus();
}

lista?.addEventListener("change", (ev) => {
    const def = OPCOES[editando];
    if (!def?.exclusiva || ev.target.type !== "checkbox") return;
    const caixas = [...lista.querySelectorAll("input")];
    if (ev.target.value === def.exclusiva && ev.target.checked) {
        caixas.forEach((c) => (c.checked = c.value === def.exclusiva));
    } else if (ev.target.checked) {
        caixas.find((c) => c.value === def.exclusiva).checked = false;
    }
});

function confirmar() {
    const def = OPCOES[editando];
    if (!def) return;

    if (def.tipo === "faixa") {
        const min = lerValor($("#precoMin"));
        const max = lerValor($("#precoMax"));
        if (min === null || max === null) return erroTexto("Informe os dois valores.");
        if (min > max) return erroTexto("O valor mínimo não pode ser maior que o máximo.");
        config.preco = { min, max };
    } else {
        const marcados = [...lista.querySelectorAll("input:checked")].map((c) => c.value);
        if (marcados.length < def.minimo) return erroTexto("Selecione pelo menos uma opção.");
        config[editando] = marcados;
    }

    fecharModal();
    atualizarTela();
    salvar();
}

/* ---------- Eventos ---------- */
document.querySelectorAll(".seletor[data-config]").forEach((b) =>
    b.addEventListener("click", () => abrirModal(b.dataset.config, b)));

document.querySelectorAll('input[type="checkbox"][data-config]').forEach((c) =>
    c.addEventListener("change", () => {
        config.interruptores[c.dataset.config] = c.checked;
        salvar();
    }));

fundo?.querySelector(".btn-confirmar")?.addEventListener("click", confirmar);
fundo?.querySelector(".btn-cancelar")?.addEventListener("click", fecharModal);
fundo?.addEventListener("click", (ev) => { if (ev.target === fundo) fecharModal(); });
document.addEventListener("keydown", (ev) => {
    if (fundo && !fundo.hidden) {
        if (ev.key === "Escape") fecharModal();
        if (ev.key === "Enter" && ev.target.tagName === "INPUT" && (ev.target.type === "number" || ev.target.id === "precoMin" || ev.target.id === "precoMax")) confirmar();
    }
});

/* ---------- Iniciar ---------- */
atualizarTela();
carregar().then(atualizarTela);