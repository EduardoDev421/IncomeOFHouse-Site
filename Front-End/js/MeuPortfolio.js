/* =========================================================
   MEU PORTFÓLIO: envio e análise do arquivo
   Fluxo: vazio -> analisando -> preenchido
   ========================================================= */
(function () {
    'use strict';

    // 'local'    -> lê PDF e Word no próprio navegador (não precisa de servidor)
    // 'servidor' -> envia para server/analisar-portfolio.js (leitura mais precisa; aceita PNG/JPG)
    const MODO = 'local';
    const URL_ANALISE = '/api/portfolio/analisar';
    const TAMANHO_MAX = 10 * 1024 * 1024; // 10 MB
    const EXTENSOES = MODO === 'servidor' ? ['pdf', 'docx', 'png', 'jpg', 'jpeg'] : ['pdf', 'docx'];

    const LIB_PDF = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    const LIB_PDF_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const LIB_WORD = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
    const LIB_PARSER = '../js/portfolioParser.js';

    const $ = (id) => document.getElementById(id);
    const estados = {
        vazio: $('estadoVazio'),
        analisando: $('estadoAnalisando'),
        preenchido: $('estadoPreenchido')
    };

    function mostrar(estado) {
        Object.keys(estados).forEach(function (k) { estados[k].hidden = k !== estado; });
        $('acoesTopo').hidden = estado !== 'preenchido';
    }

    /* ---------- Erros que dizem em qual parte está o problema ---------- */

    class ErroLeitura extends Error {
        constructor(mensagem, detalhes) {
            super(mensagem);
            this.detalhes = detalhes;
        }
    }

    function erroDoArquivo(msg) {
        return new ErroLeitura('Não foi possível ler o arquivo.', { itens: [{ parte: 'Arquivo', estado: 'erro', msg: msg }], projetos: [] });
    }

    /* ---------- Leitura do arquivo ---------- */

    const carregados = {};
    function carregarScript(url) {
        if (!carregados[url]) {
            carregados[url] = new Promise(function (ok, falha) {
                const s = document.createElement('script');
                s.src = url;
                s.onload = ok;
                s.onerror = function () { falha(new Error('Não foi possível carregar a biblioteca de leitura. Verifique sua conexão.')); };
                document.head.append(s);
            });
        }
        return carregados[url];
    }

    async function linhasDoPdf(arquivo) {
        await carregarScript(LIB_PDF);
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = LIB_PDF_WORKER;
        let pdf;
        try {
            pdf = await window.pdfjsLib.getDocument({ data: await arquivo.arrayBuffer() }).promise;
        } catch (e) {
            throw erroDoArquivo(e && e.name === 'PasswordException'
                ? 'O PDF está protegido por senha. Salve uma cópia sem senha e envie de novo.'
                : 'Não foi possível abrir o PDF. Ele pode estar corrompido. Tente exportá-lo novamente.');
        }
        const linhas = [];
        const total = Math.min(pdf.numPages, 60);

        for (let n = 1; n <= total; n++) {
            const pagina = await pdf.getPage(n);
            const conteudo = await pagina.getTextContent();
            const grupos = [];

            conteudo.items.forEach(function (it) {
                if (!it.str) return;
                const y = Math.round(it.transform[5]);
                const tam = Math.abs(it.transform[3]) || it.height || 12;
                let g = grupos.find(function (x) { return Math.abs(x.y - y) <= 2; });
                if (!g) { g = { y: y, itens: [] }; grupos.push(g); }
                g.itens.push({ x: it.transform[4], str: it.str, tam: tam });
            });

            grupos.sort(function (a, b) { return b.y - a.y; });
            grupos.forEach(function (g) {
                g.itens.sort(function (a, b) { return a.x - b.x; });
                const texto = g.itens.map(function (i) { return i.str; }).join('');
                const maior = g.itens.reduce(function (m, i) { return i.str.length > m.str.length ? i : m; }, g.itens[0]);
                linhas.push({ texto: texto, tam: maior.tam });
            });
        }
        return linhas;
    }

    async function linhasDoWord(arquivo) {
        await carregarScript(LIB_WORD);
        let r;
        try {
            r = await window.mammoth.convertToHtml({ arrayBuffer: await arquivo.arrayBuffer() });
        } catch (e) {
            throw erroDoArquivo('Não foi possível abrir o documento Word. Confirme se é um arquivo .docx válido.');
        }
        const doc = new DOMParser().parseFromString(r.value, 'text/html');
        const tamanhos = { H1: 28, H2: 22, H3: 18, H4: 16, H5: 14, H6: 13 };
        const linhas = [];

        doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li').forEach(function (el) {
            const texto = el.textContent.trim();
            if (!texto) return;
            if (tamanhos[el.tagName]) { linhas.push({ texto: texto, tam: tamanhos[el.tagName] }); return; }
            const forte = el.firstElementChild;
            const todoNegrito = forte && forte.tagName === 'STRONG' && el.children.length === 1 &&
                forte.textContent.trim() === texto;
            linhas.push({ texto: texto, tam: 12, negrito: !!todoNegrito });
        });
        return linhas;
    }

    async function analisarArquivo(arquivo, aoMudarEtapa) {
        if (MODO === 'servidor') {
            aoMudarEtapa('Lendo o arquivo inteiro e identificando os projetos...');
            const form = new FormData();
            form.append('arquivo', arquivo);
            const resposta = await fetch(URL_ANALISE, { method: 'POST', body: form });
            if (!resposta.ok) {
                const corpo = await resposta.json().catch(function () { return {}; });
                throw erroDoArquivo(corpo.erro || 'O servidor não conseguiu analisar o arquivo.');
            }
            return resposta.json();
        }

        const ext = arquivo.name.split('.').pop().toLowerCase();
        aoMudarEtapa('Lendo o arquivo...');
        await carregarScript(LIB_PARSER);
        const linhas = ext === 'pdf' ? await linhasDoPdf(arquivo) : await linhasDoWord(arquivo);

        if (linhas.length < 3) {
            throw erroDoArquivo('Não encontramos texto legível. Se o PDF for feito de fotos das páginas, envie uma versão com texto selecionável.');
        }

        aoMudarEtapa('Identificando nome e projetos...');
        return window.PortfolioParser.interpretar(linhas);
    }

    /* ---------- Preenchimento da página ---------- */
    // Tudo é inserido com textContent: o conteúdo vem de um arquivo
    // enviado pelo usuário e nunca deve ser tratado como HTML.

    function criar(tag, classe, conteudo) {
        const el = document.createElement(tag);
        if (classe) el.className = classe;
        if (conteudo) el.textContent = conteudo;
        return el;
    }

    function iniciais(nome) {
        const partes = (nome || '').trim().split(/\s+/).filter(Boolean);
        if (!partes.length) return '?';
        return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
    }

    function marcarFalta(el, falta, textoFalta) {
        el.classList.toggle('faltando', falta);
        if (falta) el.textContent = textoFalta;
    }

    function preencher(d, diag) {
        $('pfAvatar').textContent = iniciais(d.nome);

        $('pfNome').textContent = d.nome;
        marcarFalta($('pfNome'), !d.nome, 'Nome não encontrado no arquivo');

        $('pfProfissao').textContent = d.profissao;
        marcarFalta($('pfProfissao'), !d.profissao, 'Profissão não encontrada no arquivo');

        const selos = $('pfSelos');
        selos.replaceChildren();
        if (d.localizacao) selos.append(criar('span', 'selo', d.localizacao));

        $('pfSobre').textContent = d.sobre;
        marcarFalta($('pfSobre'), !d.sobre, 'A parte "Sobre mim" não foi encontrada no arquivo.');

        const areas = $('pfAreas');
        areas.replaceChildren();
        (d.areas || []).forEach(function (a) { areas.append(criar('span', 'tag', a)); });
        if (!areas.children.length) areas.append(criar('span', 'tag faltando', 'Áreas de atuação não encontradas'));

        renderProjetos(d.projetos || [], diag);
        desenharRelatorio($('relatorio'), 'Confira o que foi lido em cada parte do seu portfólio:', diag);
    }

    // Lista cada parte do portfólio com o que foi encontrado ou o que faltou
    function desenharRelatorio(el, titulo, diag) {
        el.replaceChildren();
        el.append(criar('strong', '', titulo));

        const lista = criar('ul', 'relatorio-lista');
        diag.itens.forEach(function (i) {
            const li = criar('li', 'rel-item rel-' + i.estado);
            li.append(criar('span', 'rel-parte', i.parte));
            li.append(criar('span', 'rel-status', i.estado === 'ok' ? 'Encontrado' : 'Faltando'));
            li.append(criar('span', 'rel-msg', i.msg));
            lista.append(li);
        });
        diag.projetos.forEach(function (p) {
            const li = criar('li', 'rel-item rel-aviso');
            li.append(criar('span', 'rel-parte', 'Projeto'));
            li.append(criar('span', 'rel-status', 'Incompleto'));
            li.append(criar('span', 'rel-msg', '"' + p.titulo + '": faltou ' + p.faltando.join(', ') + '.'));
            lista.append(li);
        });
        el.append(lista);
    }

    function renderProjetos(projetos, diag) {
        const faltas = {};
        diag.projetos.forEach(function (x) { faltas[x.titulo] = x.faltando; });
        const lista = $('listaProjetos');
        const filtros = $('filtros');
        lista.replaceChildren();
        filtros.replaceChildren();

        $('pfQtdProjetos').textContent = projetos.length === 1
            ? '1 projeto encontrado no arquivo.'
            : projetos.length + ' projetos encontrados no arquivo.';

        projetos.forEach(function (p) {
            const card = criar('article', 'projeto');
            card.dataset.categoria = (p.categoria || '').toLowerCase();

            const img = criar('div', 'projeto-img');
            if (p.imagem) {
                const i = document.createElement('img');
                i.src = p.imagem;
                i.alt = p.titulo || 'Projeto';
                img.append(i);
            } else {
                img.append(criar('span', '', 'Sem imagem'));
            }

            const info = criar('div', 'projeto-info');
            info.append(criar('h3', '', p.titulo || 'Projeto sem nome'));
            if (p.categoria) info.append(criar('p', '', p.categoria));
            if (p.descricao) info.append(criar('p', 'projeto-desc', p.descricao));
            const meta = criar('ul', 'projeto-meta');
            [p.area, p.ano, p.local].filter(Boolean).forEach(function (m) { meta.append(criar('li', '', m)); });
            if (meta.children.length) info.append(meta);
            if (faltas[p.titulo]) info.append(criar('p', 'projeto-falta', 'Faltou: ' + faltas[p.titulo].join(', ')));

            card.append(img, info);
            lista.append(card);
        });

        const categorias = Array.from(new Set(projetos.map(function (p) { return p.categoria; }).filter(Boolean)));
        if (categorias.length > 1) {
            [['todos', 'Todos']].concat(categorias.map(function (c) { return [c.toLowerCase(), c]; }))
                .forEach(function (par, i) {
                    const b = criar('button', 'filtro' + (i === 0 ? ' ativo' : ''), par[1]);
                    b.type = 'button';
                    b.dataset.filtro = par[0];
                    b.setAttribute('aria-pressed', i === 0);
                    filtros.append(b);
                });
        }
        $('msgVazio').textContent = 'Nenhum projeto encontrado no arquivo.';
        $('msgVazio').hidden = projetos.length > 0;
    }

    $('filtros').addEventListener('click', function (e) {
        const botao = e.target.closest('.filtro');
        if (!botao) return;
        const filtro = botao.dataset.filtro;
        document.querySelectorAll('#filtros .filtro').forEach(function (b) {
            b.classList.toggle('ativo', b === botao);
            b.setAttribute('aria-pressed', b === botao);
        });
        document.querySelectorAll('#listaProjetos .projeto').forEach(function (p) {
            p.hidden = !(filtro === 'todos' || p.dataset.categoria === filtro);
        });
    });

    /* ---------- Envio do arquivo ---------- */

    function erro(msg) {
        const el = $('erroEnvio');
        el.replaceChildren();
        if (msg) el.append(document.createTextNode(msg));
        el.hidden = !msg;
    }

    function erroDetalhado(titulo, detalhes) {
        const el = $('erroEnvio');
        desenharRelatorio(el, titulo, detalhes);
        el.hidden = false;
    }

    function validar(arquivo) {
        const ext = arquivo.name.split('.').pop().toLowerCase();
        if (EXTENSOES.indexOf(ext) === -1) return MODO === 'servidor' ? 'Formato não aceito. Envie PDF, Word (.docx), PNG ou JPG.' : 'Formato não aceito. Envie PDF ou Word (.docx).';
        if (arquivo.size > TAMANHO_MAX) return 'O arquivo tem mais de 10 MB. Envie um arquivo menor.';
        if (arquivo.size === 0) return 'O arquivo está vazio. Escolha outro arquivo.';
        return '';
    }

    async function processar(arquivo) {
        const problema = validar(arquivo);
        if (problema) { erro(problema); return; }

        erro('');
        $('nomeArquivo').textContent = arquivo.name;
        mostrar('analisando');

        try {
            const dados = await analisarArquivo(arquivo, function (etapa) { $('etapaAnalise').textContent = etapa; });
            await carregarScript(LIB_PARSER);
            const diag = window.PortfolioParser.diagnosticar(dados);

            if (!dados.projetos.length) {
                throw new ErroLeitura('Não encontramos nenhum projeto no arquivo. Veja o que foi lido em cada parte:', diag);
            }
            preencher(dados, diag);
            mostrar('preenchido');
        } catch (e) {
            mostrar('vazio');
            if (e instanceof ErroLeitura) erroDetalhado(e.message, e.detalhes);
            else erro('Algo deu errado ao analisar o arquivo. Tente novamente ou envie outro arquivo.');
        }
    }

    const input = $('inputArquivo');
    const zona = $('dropzone');
    input.setAttribute('accept', EXTENSOES.map(function (e) { return '.' + e; }).join(','));
    zona.querySelector('small').textContent = MODO === 'servidor'
        ? 'PDF, Word (.docx), PNG ou JPG · até 10 MB'
        : 'PDF ou Word (.docx) · até 10 MB';

    input.addEventListener('change', function () {
        if (input.files[0]) processar(input.files[0]);
        input.value = '';
    });

    ['dragenter', 'dragover'].forEach(function (ev) {
        zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.add('arrastando'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
        zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.remove('arrastando'); });
    });
    zona.addEventListener('drop', function (e) {
        if (e.dataTransfer.files[0]) processar(e.dataTransfer.files[0]);
    });

    $('btnTrocar').addEventListener('click', function () { erro(''); mostrar('vazio'); });

    mostrar('vazio');
})();