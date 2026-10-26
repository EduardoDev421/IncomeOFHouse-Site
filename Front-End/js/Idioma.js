/* =========================================================
   IDIOMA - tradução da página por dicionário

   O HTML continua UM SÓ, escrito em português. Este script troca os
   textos pelo dicionário do idioma escolhido (js/idiomas/<codigo>.js).
   A CHAVE do dicionário é o próprio texto em português:

       "Início": "Home",

   Carregue no FINAL do <body> (depois dos outros scripts da página):
       <script src="../js/Idioma.js"></script>

   O QUE É TRADUZIDO AUTOMATICAMENTE
     - todo texto visível da página (títulos, parágrafos, botões, menus)
     - atributos: placeholder, alt, title, aria-label e label (optgroup)
     - <title> da aba
     - conteúdo adicionado depois por JS (cards, menu lateral...)

   SE UM TEXTO NÃO ESTIVER NO DICIONÁRIO, ele continua em português.

   PARA TEXTOS GERADOS POR JS (mensagens de erro, avisos):
       alert(Idioma.t("Preencha todos os campos."));

   SELETOR  <select id="idioma"> é ligado automaticamente.
   Idiomas: pt-br (padrão, sem arquivo), en, es. Para criar outro,
   copie js/idiomas/en.js, renomeie (fr.js, de.js...) e traduza.

   IMPORTANTE: nas <option> sem atributo value, o script grava o texto
   original em português como value ANTES de traduzir. Assim os seus
   filtros (plantas.js etc.) continuam recebendo o mesmo valor, em
   qualquer idioma.
========================================================= */

const Idioma = (() => {
    const PADRAO = "pt-br";
    const ATRIBUTOS = ["placeholder", "alt", "title", "aria-label", "label"];
    const PULAR = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE"]);

    // endereço da pasta js/idiomas/, relativo a este arquivo
    const PASTA = document.currentScript
        ? new URL("idiomas/", document.currentScript.src).href
        : "idiomas/";

    const origTexto = new WeakMap();   // nó de texto  -> texto original
    const origAttr = new WeakMap();    // elemento     -> { atributo: original }
    let origTitulo = null;
    let atual = PADRAO;

    window.IDIOMAS = window.IDIOMAS || {};

    function norm(s) {
        return s.replace(/\s+/g, " ").trim();
    }

    function guardado() {
        try { return localStorage.getItem("idioma") || PADRAO; } catch (_) { return PADRAO; }
    }

    function dicionario() {
        return atual === PADRAO ? null : (window.IDIOMAS[atual] || null);
    }

    function carregar(codigo) {
        return new Promise((resolver) => {
            if (codigo === PADRAO || window.IDIOMAS[codigo]) return resolver();
            const s = document.createElement("script");
            s.src = PASTA + codigo + ".js";
            s.onload = resolver;
            s.onerror = resolver;   // sem arquivo: fica em português
            document.head.appendChild(s);
        });
    }

    /* ---------- tradução de um nó de texto ---------- */
    function traduzirNoTexto(no, dic) {
        if (!origTexto.has(no)) {
            origTexto.set(no, no.nodeValue);

            // protege o value das <option> antes de qualquer tradução
            const pai = no.parentElement;
            if (pai && pai.tagName === "OPTION" && !pai.hasAttribute("value")) {
                pai.setAttribute("value", norm(no.nodeValue));
            }
        }

        const original = origTexto.get(no);
        const chave = norm(original);
        if (!chave) return;

        const novo = dic ? dic[chave] : undefined;
        if (novo === undefined) {
            if (no.nodeValue !== original) no.nodeValue = original;
            return;
        }
        const ini = original.match(/^\s*/)[0];
        const fim = original.match(/\s*$/)[0];
        no.nodeValue = ini + novo + fim;
    }

    /* ---------- tradução dos atributos de um elemento ---------- */
    function traduzirAtributos(el, dic) {
        ATRIBUTOS.forEach((attr) => {
            if (!el.hasAttribute(attr)) return;

            let guardados = origAttr.get(el);
            if (!guardados) { guardados = {}; origAttr.set(el, guardados); }
            if (!(attr in guardados)) guardados[attr] = el.getAttribute(attr);

            const original = guardados[attr];
            const novo = dic ? dic[norm(original)] : undefined;
            el.setAttribute(attr, novo !== undefined ? novo : original);
        });
    }

    /* ---------- percorre uma parte da página ---------- */
    function traduzir(raiz) {
        const dic = dicionario();
        const base = raiz || document.body;
        if (!base) return;

        if (base.nodeType === 3) {                     // nó de texto solto
            traduzirNoTexto(base, dic);
            return;
        }
        if (base.nodeType !== 1) return;

        if (!PULAR.has(base.tagName)) traduzirAtributos(base, dic);

        const andador = document.createTreeWalker(base, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
        let no;
        while ((no = andador.nextNode())) {
            if (no.nodeType === 3) {
                if (!PULAR.has(no.parentElement.tagName)) traduzirNoTexto(no, dic);
            } else if (!PULAR.has(no.tagName)) {
                traduzirAtributos(no, dic);
            }
        }
    }

    function traduzirTitulo() {
        if (origTitulo === null) origTitulo = document.title;
        const dic = dicionario();
        const novo = dic ? dic[norm(origTitulo)] : undefined;
        document.title = novo !== undefined ? novo : origTitulo;
    }

    /* ---------- API ---------- */
    async function aplicar(codigo) {
        atual = codigo || PADRAO;
        try { localStorage.setItem("idioma", atual); } catch (_) { /* ignora */ }

        await carregar(atual);

        document.documentElement.lang = atual;
        traduzirTitulo();
        traduzir(document.body);

        // preços mudam de formato conforme o idioma
        if (typeof Preferencias !== "undefined") Preferencias.atualizarPrecos();
        document.dispatchEvent(new CustomEvent("idiomachange", { detail: atual }));
    }

    // tradução de textos gerados por JS
    function t(texto) {
        const dic = dicionario();
        const chave = norm(texto);
        return dic && dic[chave] !== undefined ? dic[chave] : texto;
    }

    function get() {
        return atual;
    }

    /* ---------- inicialização ---------- */
    function iniciar() {
        atual = guardado();

        const seletor = document.getElementById("idioma");
        if (seletor) {
            seletor.value = atual;
            seletor.addEventListener("change", () => aplicar(seletor.value));
        }

        aplicar(atual);

        // conteúdo criado depois por JS (cards, menu lateral, avisos)
        new MutationObserver((mutacoes) => {
            if (atual === PADRAO) return;
            mutacoes.forEach((m) => m.addedNodes.forEach((n) => traduzir(n)));
        }).observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
    else iniciar();

    return { aplicar, t, get, traduzir };
})();