/* =========================================================
   PREFERENCIAS - tema (escuro/claro) e moeda

   Carregue no <head> de TODAS as páginas (sem defer), para o tema
   certo aparecer desde o primeiro desenho da tela:
       <script src="../js/Preferencias.js"></script>

   TEMA
       Preferencias.aplicarTema("claro");   // ou "escuro"
       Preferencias.tema();                 // tema atual

   MOEDA  (guarde os preços em REAIS e marque o elemento)
       <span data-preco-brl="2500">R$ 2.500,00</span>
       Preferencias.aplicarMoeda("USD");
       Preferencias.formatarMoeda(2500);    // "US$ 450,00" (já convertido)
       Preferencias.atualizarPrecos();      // reaplica (chame após criar cards)
   Cards criados por JS com data-preco-brl são atualizados sozinhos.

   SELETORES  (página de Configurações)
       <select id="tema">    com values "escuro" e "claro"
       <select id="moeda">   com values BRL, USD, EUR...
   São ligados automaticamente, não precisa de mais nenhum código.

   OBS.: fica salvo no navegador (localStorage). Para acompanhar a conta
   em qualquer aparelho, salve também no servidor.
   OBS.: as taxas abaixo são fixas, só para começar. Em produção, busque
   as taxas reais de uma API pelo servidor.
========================================================= */

const Preferencias = (() => {
    const TEMAS = ["escuro", "claro"];

    // 1 BRL = X da moeda
    const TAXAS = { BRL: 1, USD: 0.18, EUR: 0.17, GBP: 0.14, JPY: 27, CAD: 0.25, AUD: 0.28 };

    function get(chave, padrao) {
        try { return localStorage.getItem(chave) || padrao; } catch (_) { return padrao; }
    }

    function set(chave, valor) {
        try { localStorage.setItem(chave, valor); } catch (_) { /* storage bloqueado */ }
    }

    /* ---------------- TEMA ---------------- */

    function tema() {
        const t = get("tema", "escuro");
        return TEMAS.includes(t) ? t : "escuro";
    }

    function aplicarTema(valor) {
        const t = TEMAS.includes(valor) ? valor : "escuro";
        document.documentElement.setAttribute("data-tema", t);
        set("tema", t);
    }

    /* ---------------- MOEDA ---------------- */

    function moeda() {
        const m = get("moeda", "BRL");
        return TAXAS[m] ? m : "BRL";
    }

    function formatarMoeda(valorBRL, codigo) {
        const cod = TAXAS[codigo] ? codigo : moeda();
        const convertido = Number(valorBRL) * TAXAS[cod];
        const idioma = get("idioma", "pt-br");
        try {
            return new Intl.NumberFormat(idioma, { style: "currency", currency: cod }).format(convertido);
        } catch (_) {
            return cod + " " + convertido.toFixed(2);
        }
    }

    function atualizarPrecos(raiz) {
        const base = raiz && raiz.querySelectorAll ? raiz : document;
        base.querySelectorAll("[data-preco-brl]").forEach((el) => {
            const valor = Number(el.dataset.precoBrl);
            if (!Number.isNaN(valor)) el.textContent = formatarMoeda(valor);
        });
    }

    function aplicarMoeda(codigo) {
        if (!TAXAS[codigo]) return;
        set("moeda", codigo);
        atualizarPrecos();
        document.dispatchEvent(new CustomEvent("moedachange", { detail: codigo }));
    }

    /* ---------------- INICIALIZAÇÃO ---------------- */

    // roda já no <head>: evita piscar o tema errado
    aplicarTema(tema());

    function iniciar() {
        // liga os seletores da página de Configurações, se existirem
        const selTema = document.getElementById("tema");
        if (selTema) {
            selTema.value = tema();
            selTema.addEventListener("change", () => aplicarTema(selTema.value));
        }

        const selMoeda = document.getElementById("moeda");
        if (selMoeda) {
            selMoeda.value = moeda();
            selMoeda.addEventListener("change", () => aplicarMoeda(selMoeda.value));
        }

        atualizarPrecos();

        // preços adicionados depois (cards criados por JS)
        new MutationObserver((mutacoes) => {
            mutacoes.forEach((m) => m.addedNodes.forEach((n) => {
                if (n.nodeType !== 1) return;
                if (n.matches && n.matches("[data-preco-brl]")) {
                    const v = Number(n.dataset.precoBrl);
                    if (!Number.isNaN(v)) n.textContent = formatarMoeda(v);
                }
                atualizarPrecos(n);
            }));
        }).observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
    else iniciar();

    // mantém abas abertas sincronizadas
    window.addEventListener("storage", (e) => {
        if (e.key === "tema") document.documentElement.setAttribute("data-tema", tema());
        if (e.key === "moeda") atualizarPrecos();
    });

    return { tema, aplicarTema, moeda, aplicarMoeda, formatarMoeda, atualizarPrecos, get, set };
})();