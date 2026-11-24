/* =========================================================
   PortfolioParser: transforma as linhas lidas do PDF/Word
   em { nome, profissao, localizacao, sobre, areas, projetos }
   Cada linha recebida: { texto, tam, negrito? }
   ========================================================= */
(function (global) {
    'use strict';

    var norm = function (s) {
        return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[:\s]+$/, '').trim();
    };

    var SECOES = {
        sobre: ['sobre', 'sobre mim', 'perfil', 'resumo', 'apresentacao'],
        areas: ['areas de atuacao', 'areas', 'especialidades', 'competencias', 'capacitacoes', 'habilidades'],
        projetos: ['projetos', 'portfolio', 'meus projetos', 'projetos realizados', 'trabalhos'],
        outras: ['contato', 'contatos', 'formacao', 'experiencia', 'experiencia profissional', 'educacao', 'idiomas', 'cursos', 'referencias']
    };

    function secaoDe(texto) {
        var n = norm(texto);
        for (var k in SECOES) if (SECOES[k].indexOf(n) !== -1) return k;
        return null;
    }

    function tamanhoCorpo(linhas) {
        var cont = {}, melhor = 12, max = 0;
        linhas.forEach(function (l) {
            var t = Math.round(l.tam || 12);
            cont[t] = (cont[t] || 0) + l.texto.length;
            if (cont[t] > max) { max = cont[t]; melhor = t; }
        });
        return melhor;
    }

    var ehContato = function (t) { return /@|https?:|www\.|\(?\d{2}\)?\s?\d{4,5}[-\s]?\d{4}/.test(t); };
    var RE_LOCAL = /^([A-ZÀ-Ú][\p{L}.' ]+)\s*[,\-–]\s*([A-Z]{2})$/u;

    function nomeOk(t) {
        var p = t.trim().split(/\s+/);
        return t.length <= 60 && !/\d/.test(t) && !ehContato(t) && p.length >= 2 && p.length <= 6 && !secaoDe(t);
    }

    function parseProjetos(ls, corpo, simples) {
        var projetos = [], atual = null;
        ls.forEach(function (l) {
            var t = l.texto.trim();
            if (!t) return;

            var campo = t.match(/^(categoria|tipo|area|área|ano|local|localizacao|localização|cidade)\s*[:\-–]\s*(.+)$/i);
            if (campo && atual) {
                var k = norm(campo[1]), v = campo[2].trim();
                if (k === 'categoria' || k === 'tipo') atual.categoria = v;
                else if (k === 'area') atual.area = v;
                else if (k === 'ano') atual.ano = v;
                else atual.local = v;
                return;
            }

            var titulo = simples
                ? (t.length <= 60 && !/[.!?;,:]$/.test(t) && (!atual || atual.descricao))
                : ((l.tam > corpo * 1.1 || l.negrito) && t.length <= 80);

            if (titulo) {
                atual = { titulo: t, categoria: '', descricao: '', area: '', ano: '', local: '', imagem: '' };
                projetos.push(atual);
            } else if (atual) {
                atual.descricao = (atual.descricao + ' ' + t).trim();
            }
        });

        projetos.forEach(function (p) {
            if (!p.ano) {
                var m = p.descricao.match(/\b(19|20)\d{2}\b/);
                if (m) p.ano = m[0];
            }
        });
        return projetos;
    }

    function interpretar(linhas) {
        var corpo = tamanhoCorpo(linhas);
        var d = { nome: '', profissao: '', localizacao: '', sobre: '', areas: [], projetos: [] };

        var ini = linhas.findIndex(function (l) { return secaoDe(l.texto); });
        if (ini < 0) ini = linhas.length;
        var topo = linhas.slice(0, Math.min(ini, 12));

        // Nome: linha de maior fonte que pareça um nome
        var iNome = -1;
        topo.forEach(function (l, i) {
            if (nomeOk(l.texto) && (iNome < 0 || l.tam > topo[iNome].tam)) iNome = i;
        });
        if (iNome >= 0) d.nome = topo[iNome].texto.trim();

        // Localização e profissão
        linhas.slice(0, 15).some(function (l) {
            var t = l.texto.replace(/^(localiza[cç][aã]o|local|cidade)\s*[:\-–]\s*/i, '').trim();
            if (t.length <= 60 && RE_LOCAL.test(t)) { d.localizacao = t; return true; }
            return false;
        });
        topo.slice(iNome + 1).some(function (l) {
            var t = l.texto.trim();
            if (!t || t.length > 70 || ehContato(t) || t === d.localizacao || RE_LOCAL.test(t)) return false;
            d.profissao = t;
            return true;
        });

        // Seções
        var b = { sobre: [], areas: [], projetos: [] }, atual = null;
        linhas.slice(ini).forEach(function (l) {
            var s = secaoDe(l.texto);
            if (s) { atual = s; return; }
            if (atual && b[atual]) b[atual].push(l);
        });

        d.sobre = b.sobre.map(function (l) { return l.texto.trim(); }).join(' ').trim();

        var vistos = {};
        b.areas.map(function (l) { return l.texto; }).join(';').split(/[;,•·|▪●]+/).forEach(function (a) {
            a = a.replace(/^[\s\-–]+/, '').trim();
            if (a && !vistos[a.toLowerCase()]) { vistos[a.toLowerCase()] = 1; d.areas.push(a); }
        });

        d.projetos = parseProjetos(b.projetos, corpo, false);
        if (!d.projetos.length && b.projetos.length) d.projetos = parseProjetos(b.projetos, corpo, true);
        return d;
    }

    function diagnosticar(d) {
        var item = function (parte, ok, msgOk, msgFalta) {
            return { parte: parte, estado: ok ? 'ok' : 'faltando', msg: ok ? msgOk : msgFalta };
        };
        var projetos = d.projetos || [];
        var itens = [
            item('Nome', !!d.nome, d.nome, 'Não encontramos o nome. Coloque-o no topo do arquivo, em destaque.'),
            item('Profissão', !!d.profissao, d.profissao, 'Não encontramos a profissão. Coloque-a logo abaixo do nome.'),
            item('Localização', !!d.localizacao, d.localizacao, 'Não encontramos a cidade. Use o formato "Cidade, UF".'),
            item('Sobre mim', !!d.sobre, 'Texto encontrado.', 'Crie uma seção com o título "Sobre mim".'),
            item('Áreas de atuação', !!(d.areas && d.areas.length), (d.areas || []).length + ' área(s) encontrada(s).', 'Crie uma seção "Áreas de atuação" separando os itens por vírgula.'),
            item('Projetos', projetos.length > 0, projetos.length + ' projeto(s) encontrado(s).', 'Crie uma seção "Projetos" com o título de cada projeto em destaque.')
        ];

        var incompletos = [];
        projetos.forEach(function (p) {
            var f = [];
            if (!p.descricao) f.push('descrição');
            if (!p.categoria) f.push('categoria');
            if (!p.ano) f.push('ano');
            if (f.length) incompletos.push({ titulo: p.titulo, faltando: f });
        });
        return { itens: itens, projetos: incompletos };
    }

    global.PortfolioParser = { interpretar: interpretar, diagnosticar: diagnosticar };
})(window);