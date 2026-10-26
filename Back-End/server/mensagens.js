/* =========================================================
   Servidor de mensagens (conversa entre usuário e profissional)

   Uso normal (recomendado): este arquivo é montado pelo server.js
       const mensagens = require("./server/mensagens");
       app.use(mensagens);
   Basta rodar:  node server.js
   Abrir:        http://localhost:3000/pages/Mensagem.html

   Uso independente (só para testar as mensagens, sem MySQL):
       node server/mensagens.js
   Nesse modo ele também entrega o site (pasta Front-End).

   - As conversas e os contatos salvos ficam em server/dados/conversas.json
   - As mensagens chegam na hora (Server-Sent Events), em qualquer computador
   - "Online" = a pessoa está com a página de mensagens aberta

   Quando o login souber se a conta é de usuário ou profissional:
       mensagens.usarIdentificacao((req) => ({ tipo: 'usuario', id: '123' }));
   ========================================================= */
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ARQUIVO = path.join(__dirname, 'dados', 'conversas.json');
const PASTA_SITE = path.join(__dirname, '..', '..', 'Front-End'); // Back-End/server -> Front-End
const MAX_TEXTO = 1000;
const MAX_MENSAGENS = 5000;
const OUTRO = { usuario: 'profissional', profissional: 'usuario' };

/* ---------- Armazenamento em arquivo ---------- */
let conversas = [];
try { conversas = JSON.parse(fs.readFileSync(ARQUIVO, 'utf8')); } catch (_) { conversas = []; }
if (!Array.isArray(conversas)) conversas = [];

let gravando = Promise.resolve();
function gravar() {
    const copia = JSON.stringify(conversas);
    gravando = gravando.then(async function () {
        await fs.promises.mkdir(path.dirname(ARQUIVO), { recursive: true });
        await fs.promises.writeFile(ARQUIVO + '.tmp', copia);
        await fs.promises.rename(ARQUIVO + '.tmp', ARQUIVO);
    }).catch(function (e) { console.error('Erro ao gravar as conversas:', e); });
}

/* ---------- Quem está falando ----------
   TROCAR pela sessão do login quando ele existir: hoje o tipo e o id
   vêm do navegador, então qualquer um poderia se passar por outra pessoa. */
function identificarPadrao(req) {
    const src = Object.assign({}, req.query, req.body);
    const tipo = src.tipo;
    const id = String(src.pessoa || '');
    if (typeof tipo !== 'string' || !Object.prototype.hasOwnProperty.call(OUTRO, tipo)) return null;
    if (!/^[\w.\-]{1,64}$/.test(id)) return null;
    return { tipo: tipo, id: id };
}

// Função que diz quem está falando: devolve { tipo, id } ou null.
let identificar = identificarPadrao;
const quemE = (req) => identificar(req);

const nome = (v) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, 80);
const chave = (tipo, id) => tipo + ':' + id;
const participa = (c, eu) => !!c[eu.tipo] && c[eu.tipo].id === eu.id;

/* ---------- Presença e avisos em tempo real ---------- */
const conexoes = new Map(); // "tipo:id" -> Set de respostas SSE abertas

const online = (tipo, id) => (conexoes.get(chave(tipo, id)) || new Set()).size > 0;

function avisar(chaves) {
    chaves.forEach(function (k) {
        (conexoes.get(k) || []).forEach(function (res) { res.write('event: atualizar\ndata: {}\n\n'); });
    });
}

const donosDe = (c) => [chave('usuario', c.usuario.id), chave('profissional', c.profissional.id)];

function contrapartes(eu) {
    const outro = OUTRO[eu.tipo];
    return conversas.filter((c) => participa(c, eu)).map((c) => chave(outro, c[outro].id));
}

function entrar(eu, res) {
    const k = chave(eu.tipo, eu.id);
    if (!conexoes.has(k)) conexoes.set(k, new Set());
    const eraOffline = conexoes.get(k).size === 0;
    conexoes.get(k).add(res);
    if (eraOffline) avisar(contrapartes(eu));
}

function sair(eu, res) {
    const k = chave(eu.tipo, eu.id);
    const set = conexoes.get(k);
    if (!set) return;
    set.delete(res);
    if (!set.size) { conexoes.delete(k); avisar(contrapartes(eu)); }
}

/* ---------- Limite de envio (anti-spam) ---------- */
const envios = new Map();
function limiteOk(k) {
    const agora = Date.now();
    const lista = (envios.get(k) || []).filter((t) => agora - t < 10000);
    if (lista.length >= 20) return false;
    lista.push(agora);
    envios.set(k, lista);
    return true;
}

/* ---------- Rotas ---------- */
const router = express.Router();

// Liberado para qualquer origem só para desenvolvimento. Em produção, restrinja ao seu domínio.
router.use('/api/mensagens', function (req, res, next) {
    res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    });
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});
router.use('/api/mensagens', express.json({ limit: '20kb' }));

const paraCliente = (c, eu) => Object.assign({}, c, { outroOnline: online(OUTRO[eu.tipo], c[OUTRO[eu.tipo]].id) });

function acharConversa(req, res) {
    const eu = quemE(req);
    if (!eu) { res.status(400).json({ erro: 'Identificação inválida.' }); return null; }
    const c = conversas.find((x) => x.id === req.params.id && participa(x, eu));
    if (!c) { res.status(404).json({ erro: 'Conversa não encontrada.' }); return null; }
    return { eu: eu, c: c };
}

function depoisDeMudar(c) {
    gravar();
    avisar(donosDe(c));
}

// Lista as conversas e contatos da pessoa
router.get('/api/mensagens/conversas', function (req, res) {
    const eu = quemE(req);
    if (!eu) return res.status(400).json({ erro: 'Identificação inválida.' });
    res.json(conversas.filter((c) => participa(c, eu)).map((c) => paraCliente(c, eu)));
});

// Cria a conversa entre um usuário e um profissional (ou devolve a que já existe).
// Quem cria já fica com o contato salvo.
router.post('/api/mensagens/conversas', function (req, res) {
    const eu = quemE(req);
    const u = req.body && req.body.usuario;
    const p = req.body && req.body.profissional;
    if (!eu || !u || !p) return res.status(400).json({ erro: 'Dados da conversa inválidos.' });

    const usuario = { id: String(u.id || ''), nome: nome(u.nome) };
    const profissional = { id: String(p.id || ''), nome: nome(p.nome) };
    const idValido = (id) => /^[\w.\-]{1,64}$/.test(id);
    if (!idValido(usuario.id) || !idValido(profissional.id) || !usuario.nome || !profissional.nome) {
        return res.status(400).json({ erro: 'Dados da conversa inválidos.' });
    }

    const novo = { usuario: usuario, profissional: profissional };
    if (!participa(novo, eu)) return res.status(403).json({ erro: 'Você não faz parte desta conversa.' });

    const id = usuario.id + '_' + profissional.id;
    let c = conversas.find((x) => x.id === id);
    if (!c) {
        c = { id: id, usuario: usuario, profissional: profissional, mensagens: [], lido: {}, salvo: {}, criadoEm: Date.now() };
        c.salvo[eu.tipo] = true;
        conversas.push(c);
        depoisDeMudar(c);
    } else {
        c[eu.tipo].nome = novo[eu.tipo].nome; // mantém o próprio nome atualizado
        gravar();
    }
    res.json(paraCliente(c, eu));
});

router.post('/api/mensagens/conversas/:id/mensagens', function (req, res) {
    const r = acharConversa(req, res);
    if (!r) return;
    const texto = typeof req.body.texto === 'string' ? req.body.texto.trim().slice(0, MAX_TEXTO) : '';
    if (!texto) return res.status(400).json({ erro: 'Mensagem vazia.' });
    if (!limiteOk(chave(r.eu.tipo, r.eu.id))) return res.status(429).json({ erro: 'Muitas mensagens seguidas. Espere um instante.' });

    const ts = Date.now();
    r.c.mensagens.push({ id: crypto.randomUUID(), de: r.eu.tipo, texto: texto, ts: ts });
    if (r.c.mensagens.length > MAX_MENSAGENS) r.c.mensagens.splice(0, r.c.mensagens.length - MAX_MENSAGENS);
    r.c.lido[r.eu.tipo] = ts;
    depoisDeMudar(r.c);
    res.json(paraCliente(r.c, r.eu));
});

router.post('/api/mensagens/conversas/:id/lido', function (req, res) {
    const r = acharConversa(req, res);
    if (!r) return;
    r.c.lido[r.eu.tipo] = Date.now();
    depoisDeMudar(r.c);
    res.json(paraCliente(r.c, r.eu));
});

router.post('/api/mensagens/conversas/:id/salvo', function (req, res) {
    const r = acharConversa(req, res);
    if (!r) return;
    r.c.salvo[r.eu.tipo] = req.body.salvo === true;
    gravar();
    avisar([chave(r.eu.tipo, r.eu.id)]); // só atualiza as outras abas da própria pessoa
    res.json(paraCliente(r.c, r.eu));
});

// Canal de avisos em tempo real (e presença online)
router.get('/api/mensagens/eventos', function (req, res) {
    const eu = quemE(req);
    if (!eu) return res.status(400).end();
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.flushHeaders();
    res.write('retry: 3000\n\n');
    entrar(eu, res);
    const bat = setInterval(function () { res.write(': ping\n\n'); }, 25000);
    req.on('close', function () { clearInterval(bat); sair(eu, res); });
});

router.use('/api/mensagens', function (err, req, res, next) {
    res.status(400).json({ erro: 'Requisição inválida.' });
});

router.usarIdentificacao = function (fn) { identificar = fn; return router; };

module.exports = router;

/* ---------- Modo independente ---------- */
if (require.main === module) {
    const app = express();
    const PORTA = process.env.PORT || 3000;
    app.use(router);
    app.use(express.static(PASTA_SITE));
    app.listen(PORTA, () => console.log('Mensagens em http://localhost:' + PORTA + '/pages/Mensagem.html'));
}