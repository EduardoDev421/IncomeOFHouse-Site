/* ================================================= */
/* POP-UPS LEGAIS - Termos de Uso / Política de Privacidade */
/*
   COMO USAR:
   1) No <head>:   <link rel="stylesheet" href="css/Modais/LegalModal.css">
   2) No final do <body>:   <script src="js/LegalModal.js" defer></script>
   3) Em qualquer link/botão:
        <a href="#" data-legal="termos">Termos de Uso</a>
        <a href="#" data-legal="privacidade">Política de Privacidade</a>
   Ou por JavaScript:  LegalModal.abrir('termos');  LegalModal.fechar();

   O conteúdo é lido das páginas termos.html e privacidade.html
   (usa o <article id="legal-article"> delas), então você edita o texto
   em um só lugar.
*/
(function () {
    'use strict';

    /* ---- CONFIGURAÇÃO: ajuste os caminhos conforme sua pasta ---- */
    // Os caminhos são relativos à página que está abrindo o pop-up (ex.: index.html)
    var BASE = document.currentScript ? document.currentScript.src : location.href;

    var DOCUMENTOS = {
        termos: {
            titulo: 'Termos de Uso',
            url: new URL('../../pages/Modais/TermosUso.html', BASE).href
        },
        privacidade: {
            titulo: 'Política de Privacidade',
            url: new URL('../../pages/Modais/PoliticaPrivacidade.html', BASE).href
        }
    };

    var cache = {};            // evita baixar o mesmo documento duas vezes
    var atual = null;          // 'termos' | 'privacidade'
    var ultimoFoco = null;     // elemento que abriu o pop-up
    var el = {};               // referências do DOM

    /* ---------- CONSTRUÇÃO DO POP-UP ---------- */
    function criar() {
        if (el.overlay) return;

        var overlay = document.createElement('div');
        overlay.className = 'lm-overlay';
        overlay.innerHTML =
            '<div class="lm-janela" role="dialog" aria-modal="true" aria-labelledby="lm-titulo">' +
                '<div class="lm-topo">' +
                    '<div>' +
                        '<h2 class="lm-titulo" id="lm-titulo"></h2>' +
                        '<p class="lm-data"></p>' +
                    '</div>' +
                    '<button type="button" class="lm-fechar" aria-label="Fechar">&times;</button>' +
                '</div>' +
                '<div class="lm-abas" role="tablist"></div>' +
                '<div class="lm-corpo" tabindex="0"></div>' +
                '<div class="lm-rodape">' +
                    '<button type="button" class="lm-btn lm-ok">Entendi</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);

        el.overlay = overlay;
        el.janela  = overlay.querySelector('.lm-janela');
        el.titulo  = overlay.querySelector('.lm-titulo');
        el.data    = overlay.querySelector('.lm-data');
        el.abas    = overlay.querySelector('.lm-abas');
        el.corpo   = overlay.querySelector('.lm-corpo');

        // abas
        Object.keys(DOCUMENTOS).forEach(function (chave) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'lm-aba';
            b.setAttribute('role', 'tab');
            b.dataset.doc = chave;
            b.textContent = DOCUMENTOS[chave].titulo;
            el.abas.appendChild(b);
        });

        // eventos
        overlay.addEventListener('mousedown', function (e) {
            if (e.target === overlay) fechar();               // clique fora
        });
        overlay.querySelector('.lm-fechar').addEventListener('click', fechar);
        overlay.querySelector('.lm-ok').addEventListener('click', fechar);

        el.abas.addEventListener('click', function (e) {
            var b = e.target.closest('.lm-aba');
            if (b) mostrar(b.dataset.doc);
        });

        // links internos entre os documentos (ex.: "Política de Privacidade" dentro dos Termos)
        el.corpo.addEventListener('click', function (e) {
            var a = e.target.closest('a');
            if (!a) return;
            var href = (a.getAttribute('href') || '').toLowerCase();
            if (href.indexOf('privacidade') !== -1) { e.preventDefault(); mostrar('privacidade'); }
            else if (href.indexOf('termos') !== -1) { e.preventDefault(); mostrar('termos'); }
        });

        document.addEventListener('keydown', teclado);
    }

    /* ---------- CARREGAR CONTEÚDO ---------- */
    function carregar(chave) {
        if (cache[chave]) return Promise.resolve(cache[chave]);

        return fetch(DOCUMENTOS[chave].url, { credentials: 'same-origin' })
            .then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.text();
            })
            .then(function (html) {
                var doc = new DOMParser().parseFromString(html, 'text/html');
                var artigo = doc.getElementById('legal-article');
                if (!artigo) throw new Error('Conteúdo não encontrado');

                var data = doc.querySelector('.LegalUpdate');
                // não executa nada do documento: só copiamos o conteúdo textual
                artigo.querySelectorAll('script, iframe, object, embed').forEach(function (n) { n.remove(); });

                cache[chave] = {
                    html: artigo.outerHTML,
                    data: data ? data.textContent.trim() : ''
                };
                return cache[chave];
            });
    }

    /* ---------- MOSTRAR UM DOCUMENTO ---------- */
    function mostrar(chave) {
        if (!DOCUMENTOS[chave]) return;
        atual = chave;

        el.titulo.textContent = DOCUMENTOS[chave].titulo;
        el.data.textContent = '';
        el.corpo.scrollTop = 0;

        el.abas.querySelectorAll('.lm-aba').forEach(function (b) {
            var ativa = b.dataset.doc === chave;
            b.classList.toggle('lm-ativa', ativa);
            b.setAttribute('aria-selected', ativa ? 'true' : 'false');
        });

        el.corpo.innerHTML =
            '<div class="lm-estado"><div class="lm-spinner"></div>Carregando…</div>';

        carregar(chave)
            .then(function (conteudo) {
                if (atual !== chave) return;                    // usuário trocou de aba
                el.corpo.innerHTML = conteudo.html;
                el.data.textContent = conteudo.data;
            })
            .catch(function () {
                if (atual !== chave) return;
                el.corpo.innerHTML =
                    '<div class="lm-estado">Não foi possível carregar o documento aqui.<br>' +
                    '<a href="' + DOCUMENTOS[chave].url + '" target="_blank" rel="noopener">' +
                    'Abrir em uma nova aba</a></div>';
            });
    }

    /* ---------- ABRIR / FECHAR ---------- */
    function abrir(chave) {
        criar();
        ultimoFoco = document.activeElement;
        mostrar(chave || 'termos');

        // evita que a página de trás "pule" quando a barra de rolagem some
        var barra = window.innerWidth - document.documentElement.clientWidth;
        if (barra > 0) document.body.style.paddingRight = barra + 'px';
        document.body.classList.add('lm-aberto');
        // força o navegador a registrar o estado inicial antes da animação
        void el.overlay.offsetWidth;
        el.overlay.classList.add('lm-visivel');
        el.janela.querySelector('.lm-fechar').focus();
    }

    function fechar() {
        if (!el.overlay || !el.overlay.classList.contains('lm-visivel')) return;
        el.overlay.classList.remove('lm-visivel');
        document.body.classList.remove('lm-aberto');
        document.body.style.paddingRight = '';
        if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
    }

    /* ---------- TECLADO: ESC fecha, TAB fica dentro do pop-up ---------- */
    function teclado(e) {
        if (!el.overlay || !el.overlay.classList.contains('lm-visivel')) return;

        if (e.key === 'Escape') { e.preventDefault(); fechar(); return; }
        if (e.key !== 'Tab') return;

        var focaveis = el.janela.querySelectorAll(
            'button, a[href], [tabindex="0"]'
        );
        if (!focaveis.length) return;

        var primeiro = focaveis[0];
        var ultimo = focaveis[focaveis.length - 1];

        if (e.shiftKey && document.activeElement === primeiro) {
            e.preventDefault(); ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
            e.preventDefault(); primeiro.focus();
        }
    }

    /* ---------- LIGAR AOS LINKS data-legal ---------- */
    document.addEventListener('click', function (e) {
        var gatilho = e.target.closest('[data-legal]');
        if (!gatilho) return;
        var chave = gatilho.getAttribute('data-legal');
        if (!DOCUMENTOS[chave]) return;
        e.preventDefault();
        abrir(chave);
    });

    // API pública
    window.LegalModal = { abrir: abrir, fechar: fechar };
})();