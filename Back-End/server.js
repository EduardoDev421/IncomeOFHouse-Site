require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Mantido como no servidor original. Este módulo continua separado.
const mensagens = require("./server/mensagens");

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/+$/, "");
const PASTA_UPLOADS = path.join(__dirname, process.env.UPLOAD_DIR || "uploads");
const PASTA_SITE = path.join(__dirname, "..", "Front-End");
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB) || 5;

let supabaseAuth;
let supabaseAdmin;

const CATEGORIAS = [
    "Casa Térrea", "Sobrado", "Casa Geminada", "Casa de Condomínio",
    "Casa de Campo", "Casa de Praia", "Chácara", "Sítio", "Fazenda",
    "Apartamento", "Kitnet / Studio", "Loft", "Cobertura", "Edícula",
    "Casa de Madeira", "Casa Pré-Fabricada", "Casa Modular", "Loja",
    "Sala Comercial", "Escritório", "Galpão", "Prédio Comercial",
    "Galpão Industrial", "Fábrica", "Centro de Distribuição",
    "Área de Lazer", "Espaço Gourmet", "Salão de Festas",
    "Área de Piscina", "Projeto Residencial", "Projeto Comercial",
    "Projeto Industrial", "Projeto Arquitetônico"
];

fs.mkdirSync(PASTA_UPLOADS, { recursive: true });

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(PASTA_UPLOADS));

// Mantém a montagem do módulo de mensagens que já existia no projeto.
// A migração deste arquivo não altera a implementação interna desse módulo.
app.use(mensagens);

const rota = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

function idValido(id) {
    return /^\d+$/.test(String(id)) && Number(id) > 0;
}

function emailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function salvarImagem(dataUrl) {
    if (typeof dataUrl !== "string") return null;

    const resultado = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!resultado) return null;

    const buffer = Buffer.from(resultado[2], "base64");
    if (!buffer.length || buffer.length > MAX_UPLOAD_MB * 1024 * 1024) return null;

    const extensao = resultado[1] === "jpeg" ? "jpg" : resultado[1];
    const nome = `${crypto.randomUUID()}.${extensao}`;
    fs.writeFileSync(path.join(PASTA_UPLOADS, nome), buffer);

    return `/uploads/${nome}`;
}

function paraSite(planta) {
    return {
        ...planta,
        // "titulo" e "imagem" são aliases de compatibilidade com páginas antigas.
        titulo: planta.nome,
        imagem: planta.imagem_url
            ? (/^https?:\/\//i.test(planta.imagem_url)
                ? planta.imagem_url
                : `${BASE_URL}${planta.imagem_url.startsWith("/") ? "" : "/"}${planta.imagem_url}`)
            : null
    };
}

function erroSupabase(res, erro, mensagemPadrao = "Não foi possível concluir a operação.") {
    console.error("Supabase:", erro);
    if (erro?.code === "23505") {
        return res.status(409).json({ erro: "Já existe um cadastro com esses dados." });
    }
    return res.status(400).json({ erro: erro?.message || mensagemPadrao });
}

// Valida o access_token emitido pelo Supabase Auth.
// req.usuarioId sempre vem do JWT validado, nunca do corpo enviado pelo navegador.
async function autenticar(req, res, next) {
    const cabecalho = req.headers.authorization || "";
    const token = /^Bearer\s+(.+)$/i.exec(cabecalho)?.[1];

    if (!token) {
        return res.status(401).json({ erro: "Faça login para continuar." });
    }

    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (error || !data?.user) {
        return res.status(401).json({ erro: "Sua sessão expirou. Entre novamente." });
    }

    req.usuarioId = data.user.id;
    req.authUser = data.user;
    req.accessToken = token;
    next();
}

async function exigirProfissional(req, res, next) {
    const { data, error } = await supabaseAdmin
        .from("profissionais")
        .select("id")
        .eq("id", req.usuarioId)
        .maybeSingle();

    if (error) return erroSupabase(res, error);
    if (!data) {
        return res.status(403).json({ erro: "Esta operação está disponível apenas para contas profissionais." });
    }
    next();
}

/* =========================
   USUÁRIOS / SUPABASE AUTH
========================= */

// Cadastro de usuário: a senha fica exclusivamente no Supabase Auth.
app.post("/api/usuarios", rota(async (req, res) => {
    const dados = req.body || {};
    const nome = typeof dados.nome === "string" ? dados.nome.trim() : "";
    const email = typeof dados.email === "string" ? dados.email.trim().toLowerCase() : "";
    const senha = typeof dados.senha === "string" ? dados.senha : "";
    const cpf = typeof dados.cpf === "string" ? dados.cpf.replace(/\D/g, "") : null;
    const telefone = typeof dados.telefone === "string" ? dados.telefone.replace(/\D/g, "") : null;
    const dataNascimento = typeof dados.dataNascimento === "string" && dados.dataNascimento.trim()
        ? dados.dataNascimento.trim()
        : null;

    if (nome.length < 3 || nome.length > 150) {
        return res.status(400).json({ erro: "O nome deve ter entre 3 e 150 caracteres." });
    }
    if (!emailValido(email) || email.length > 254) {
        return res.status(400).json({ erro: "Informe um e-mail válido." });
    }
    if (senha.length < 6 || senha.length > 200) {
        return res.status(400).json({ erro: "A senha deve ter entre 6 e 200 caracteres." });
    }
    if (cpf && cpf.length !== 11) {
        return res.status(400).json({ erro: "O CPF deve conter 11 números." });
    }
    if (telefone && ![10, 11].includes(telefone.length)) {
        return res.status(400).json({ erro: "Informe um telefone válido." });
    }
    if (dataNascimento && !/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
        return res.status(400).json({ erro: "A data de nascimento deve estar no formato AAAA-MM-DD." });
    }

    const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
        email,
        password: senha,
        options: { data: { nome, tipo: "usuario" } }
    });

    if (authError) {
        const status = /already registered|already been registered/i.test(authError.message) ? 409 : 400;
        return res.status(status).json({ erro: authError.message });
    }
    if (!authData.user) {
        return res.status(400).json({ erro: "Não foi possível criar a conta." });
    }

    const { data: usuario, error: perfilError } = await supabaseAdmin
        .from("usuarios")
        .insert({
            id: authData.user.id,
            nome,
            email,
            cpf: cpf || null,
            telefone: telefone || null,
            data_nascimento: dataNascimento
        })
        .select("id, nome, email")
        .single();

    if (perfilError) {
        // Evita deixar uma conta Auth sem o perfil correspondente.
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return erroSupabase(res, perfilError, "Não foi possível salvar o perfil do usuário.");
    }

    return res.status(201).json({
        mensagem: authData.session
            ? "Cadastro realizado com sucesso."
            : "Cadastro realizado. Verifique seu e-mail caso a confirmação esteja ativada.",
        token: authData.session?.access_token || null,
        usuario
    });
}));

// Login: o token retornado deve ser enviado nas próximas chamadas como Bearer.
app.post("/api/login", rota(async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const senha = typeof req.body?.senha === "string" ? req.body.senha : "";

    if (!email || !senha) {
        return res.status(400).json({ erro: "Informe o e-mail e a senha." });
    }

    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password: senha });
    if (error || !data.user || !data.session) {
        return res.status(401).json({ erro: "E-mail ou senha incorretos. Verifique também se o e-mail foi confirmado." });
    }

    const { data: usuario } = await supabaseAdmin
        .from("usuarios")
        .select("id, nome, email")
        .eq("id", data.user.id)
        .maybeSingle();

    const { data: profissional } = await supabaseAdmin
        .from("profissionais")
        .select("id, nome, email, profissao")
        .eq("id", data.user.id)
        .maybeSingle();

    const perfil = usuario || profissional;
    if (!perfil) {
        return res.status(403).json({ erro: "A conta não possui um perfil cadastrado no IncomeOFHouse." });
    }

    return res.json({
        mensagem: "Login realizado com sucesso.",
        token: data.session.access_token,
        refreshToken: data.session.refresh_token,
        usuario: perfil,
        tipo: profissional ? "profissional" : "usuario"
    });
}));

app.get("/api/usuarios/me", autenticar, rota(async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from("usuarios")
        .select("id, nome, email, cpf, telefone, data_nascimento, foto_url, criado_em, atualizado_em")
        .eq("id", req.usuarioId)
        .maybeSingle();

    if (error) return erroSupabase(res, error);
    if (!data) return res.status(404).json({ erro: "Perfil de usuário não encontrado." });
    return res.json({ usuario: data });
}));

app.put("/api/usuarios/me", autenticar, rota(async (req, res) => {
    const corpo = req.body || {};
    const nome = typeof corpo.nome === "string" ? corpo.nome.trim() : "";
    const email = typeof corpo.email === "string" ? corpo.email.trim().toLowerCase() : "";
    const cpf = typeof corpo.cpf === "string" ? corpo.cpf.replace(/\D/g, "") : null;
    const telefone = typeof corpo.telefone === "string" ? corpo.telefone.replace(/\D/g, "") : null;
    const dataNascimento = typeof corpo.dataNascimento === "string" && corpo.dataNascimento.trim()
        ? corpo.dataNascimento.trim()
        : null;

    if (nome.length < 3 || nome.length > 150) {
        return res.status(400).json({ erro: "O nome deve ter entre 3 e 150 caracteres." });
    }
    if (!emailValido(email) || email.length > 254) {
        return res.status(400).json({ erro: "Informe um e-mail válido." });
    }
    if (cpf && cpf.length !== 11) {
        return res.status(400).json({ erro: "O CPF deve conter 11 números." });
    }
    if (telefone && ![10, 11].includes(telefone.length)) {
        return res.status(400).json({ erro: "Informe um telefone válido." });
    }
    if (dataNascimento && !/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
        return res.status(400).json({ erro: "A data de nascimento deve estar no formato AAAA-MM-DD." });
    }

    if (email !== req.authUser.email) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(req.usuarioId, { email });
        if (authError) return erroSupabase(res, authError, "Não foi possível atualizar o e-mail.");
    }

    const { data, error } = await supabaseAdmin
        .from("usuarios")
        .update({
            nome,
            email,
            cpf: cpf || null,
            telefone: telefone || null,
            data_nascimento: dataNascimento
        })
        .eq("id", req.usuarioId)
        .select("id, nome, email, cpf, telefone, data_nascimento, foto_url, criado_em, atualizado_em")
        .maybeSingle();

    if (error) return erroSupabase(res, error);
    if (!data) return res.status(404).json({ erro: "Usuário não encontrado." });
    return res.json({ mensagem: "Perfil atualizado.", usuario: data });
}));

app.post("/api/logout", autenticar, (req, res) => {
    // O access token é stateless no servidor. O front-end deve descartar token e refresh token.
    return res.json({ mensagem: "Sessão encerrada. Remova os tokens armazenados no navegador." });
});

/* =========================
   PLANTAS
========================= */

app.get("/plantas", rota(async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from("plantas")
        .select("id, profissional_id, nome, descricao, categoria, preco, imagem_url, ativa, criado_em, atualizado_em")
        .eq("ativa", true)
        .order("id", { ascending: false });

    if (error) return erroSupabase(res, error);
    return res.json((data || []).map(paraSite));
}));

app.get("/plantas/:id", rota(async (req, res) => {
    if (!idValido(req.params.id)) return res.status(400).json({ erro: "Id inválido." });

    const { data, error } = await supabaseAdmin
        .from("plantas")
        .select("id, profissional_id, nome, descricao, categoria, preco, imagem_url, ativa, criado_em, atualizado_em")
        .eq("id", req.params.id)
        .eq("ativa", true)
        .maybeSingle();

    if (error) return erroSupabase(res, error);
    if (!data) return res.status(404).json({ erro: "Planta não encontrada." });
    return res.json(paraSite(data));
}));

// O esquema atual de plantas possui somente nome, descrição, categoria,
// preço, imagem_url, profissional_id e os campos de controle de data/estado.
app.post("/plantas", autenticar, exigirProfissional, rota(async (req, res) => {
    const c = req.body || {};
    const nome = typeof c.nome === "string" ? c.nome.trim()
        : (typeof c.titulo === "string" ? c.titulo.trim() : "");
    const descricao = typeof c.descricao === "string" ? c.descricao.trim() : "";
    const categoria = typeof c.categoria === "string" ? c.categoria.trim() : "";
    const preco = Number(c.preco);

    if (!nome || nome.length > 150) {
        return res.status(400).json({ erro: "Informe um nome de planta com até 150 caracteres." });
    }
    if (!descricao) return res.status(400).json({ erro: "A descrição é obrigatória." });
    if (!CATEGORIAS.includes(categoria)) return res.status(400).json({ erro: "Categoria inválida." });
    if (!Number.isFinite(preco) || preco < 0) return res.status(400).json({ erro: "Informe um preço válido." });

    let imagemUrl = typeof c.imagem_url === "string" ? c.imagem_url.trim() : "";
    let imagemLocal = null;

    if (typeof c.imagem === "string" && c.imagem.startsWith("data:image/")) {
        imagemLocal = salvarImagem(c.imagem);
        if (!imagemLocal) {
            return res.status(400).json({ erro: `Imagem inválida ou maior que ${MAX_UPLOAD_MB}MB.` });
        }
        imagemUrl = imagemLocal;
    }

    if (!imagemUrl) return res.status(400).json({ erro: "Envie uma imagem para a planta." });

    const { data, error } = await supabaseAdmin
        .from("plantas")
        .insert({
            profissional_id: req.usuarioId,
            nome,
            descricao,
            categoria,
            preco,
            imagem_url: imagemUrl,
            ativa: true
        })
        .select("id, profissional_id, nome, descricao, categoria, preco, imagem_url, ativa, criado_em")
        .single();

    if (error) {
        if (imagemLocal) fs.unlink(path.join(PASTA_UPLOADS, path.basename(imagemLocal)), () => {});
        return erroSupabase(res, error, "Não foi possível publicar a planta.");
    }

    return res.status(201).json({
        mensagem: "Planta publicada com sucesso.",
        id: data.id,
        planta: paraSite(data)
    });
}));

/* =========================
   PROFISSIONAIS
========================= */

app.post("/profissionais", rota(async (req, res) => {
    const c = req.body || {};
    const nome = typeof c.nome === "string" ? c.nome.trim() : "";
    const registro = typeof c.registro === "string" ? c.registro.trim()
        : (typeof c.registroProfissional === "string" ? c.registroProfissional.trim() : "");
    const email = typeof c.email === "string" ? c.email.trim().toLowerCase() : "";
    const telefone = typeof c.telefone === "string" ? c.telefone.replace(/\D/g, "") : "";
    const cpf = typeof c.cpf === "string" ? c.cpf.replace(/\D/g, "") : "";
    const dataNascimento = typeof c.dataNascimento === "string" ? c.dataNascimento : null;
    const cidade = typeof c.cidade === "string" ? c.cidade.trim() : "";
    const estado = typeof c.estado === "string" ? c.estado.trim().toUpperCase() : "";
    const profissao = typeof c.profissao === "string" ? c.profissao.trim() : "";
    const senha = typeof c.senha === "string" ? c.senha : "";
    const documentoUrl = typeof c.documento_url === "string" ? c.documento_url.trim()
        : (typeof c.documentoUrl === "string" ? c.documentoUrl.trim() : "");

    if (nome.length < 3 || nome.length > 150) return res.status(400).json({ erro: "O nome deve ter entre 3 e 150 caracteres." });
    if (registro.length < 2 || registro.length > 80) return res.status(400).json({ erro: "Informe um registro profissional válido." });
    if (!emailValido(email) || email.length > 254) return res.status(400).json({ erro: "Informe um e-mail válido." });
    if (![10, 11].includes(telefone.length)) return res.status(400).json({ erro: "Informe um telefone válido." });
    if (cpf.length !== 11) return res.status(400).json({ erro: "O CPF deve conter 11 números." });
    if (!dataNascimento || !/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento) || Number.isNaN(Date.parse(dataNascimento))) {
        return res.status(400).json({ erro: "Informe uma data de nascimento válida." });
    }
    if (cidade.length < 2 || cidade.length > 100) return res.status(400).json({ erro: "Informe uma cidade válida." });
    if (!/^[A-Z]{2}$/.test(estado)) return res.status(400).json({ erro: "Selecione um estado válido." });
    if (!profissao || profissao.length > 100) return res.status(400).json({ erro: "Informe uma profissão válida." });
    if (senha.length < 6 || senha.length > 200) return res.status(400).json({ erro: "A senha deve ter entre 6 e 200 caracteres." });

    const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
        email,
        password: senha,
        options: { data: { nome, tipo: "profissional" } }
    });

    if (authError) {
        const status = /already registered|already been registered/i.test(authError.message) ? 409 : 400;
        return res.status(status).json({ erro: authError.message });
    }
    if (!authData.user) return res.status(400).json({ erro: "Não foi possível criar a conta profissional." });

    const { data: profissional, error: perfilError } = await supabaseAdmin
        .from("profissionais")
        .insert({
            id: authData.user.id,
            nome,
            email,
            cpf,
            telefone,
            data_nascimento: dataNascimento,
            registro,
            profissao,
            cidade,
            estado,
            documento_url: documentoUrl || null
        })
        .select("id, nome, profissao, cidade, estado, registro, verificado")
        .single();

    if (perfilError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return erroSupabase(res, perfilError, "Não foi possível salvar o perfil profissional.");
    }

    return res.status(201).json({
        mensagem: authData.session
            ? "Cadastro profissional realizado com sucesso."
            : "Cadastro profissional realizado. Verifique seu e-mail caso a confirmação esteja ativada.",
        token: authData.session?.access_token || null,
        profissional
    });
}));

app.get("/profissionais", rota(async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from("profissionais")
        .select("id, nome, registro, cidade, estado, profissao, foto_url, verificado, criado_em")
        .order("criado_em", { ascending: false });

    if (error) return erroSupabase(res, error);
    return res.json((data || []).map(p => ({
        ...p,
        registroProfissional: p.registro,
        criadoEm: p.criado_em
    })));
}));

/* =========================
   COMENTÁRIOS
========================= */

app.get("/plantas/:id/comentarios", rota(async (req, res) => {
    const plantaId = req.params.id;
    if (!idValido(plantaId)) return res.status(400).json({ erro: "Id inválido." });

    const limite = Math.min(Math.max(parseInt(req.query.limite, 10) || 20, 1), 50);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const ascending = req.query.ordem === "antigos";

    const { data, error, count } = await supabaseAdmin
        .from("comentarios")
        .select("id, texto, criado_em, usuario_id, usuarios(nome)", { count: "exact" })
        .eq("planta_id", plantaId)
        .order("criado_em", { ascending })
        .range(offset, offset + limite - 1);

    if (error) return erroSupabase(res, error);
    const comentarios = (data || []).map(c => ({
        id: c.id,
        texto: c.texto,
        criadoEm: c.criado_em,
        usuarioId: c.usuario_id,
        autor: c.usuarios?.nome || "Usuário"
    }));

    return res.json({ total: count || 0, comentarios });
}));

app.post("/plantas/:id/comentarios", autenticar, rota(async (req, res) => {
    const plantaId = req.params.id;
    if (!idValido(plantaId)) return res.status(400).json({ erro: "Id inválido." });

    const texto = typeof req.body?.texto === "string" ? req.body.texto.trim() : "";
    if (!texto) return res.status(400).json({ erro: "Escreva um comentário antes de enviar." });
    if (texto.length > 1000) return res.status(400).json({ erro: "O comentário pode ter no máximo 1.000 caracteres." });

    const { data: planta, error: plantaError } = await supabaseAdmin
        .from("plantas")
        .select("id")
        .eq("id", plantaId)
        .eq("ativa", true)
        .maybeSingle();

    if (plantaError) return erroSupabase(res, plantaError);
    if (!planta) return res.status(404).json({ erro: "Planta não encontrada." });

    const { data, error } = await supabaseAdmin
        .from("comentarios")
        .insert({ planta_id: Number(plantaId), usuario_id: req.usuarioId, texto })
        .select("id, texto, criado_em, usuario_id, usuarios(nome)")
        .single();

    if (error) return erroSupabase(res, error);
    return res.status(201).json({
        mensagem: "Comentário publicado.",
        comentario: {
            id: data.id,
            texto: data.texto,
            criadoEm: data.criado_em,
            usuarioId: data.usuario_id,
            autor: data.usuarios?.nome || "Usuário"
        }
    });
}));

app.delete("/comentarios/:id", autenticar, rota(async (req, res) => {
    if (!idValido(req.params.id)) return res.status(400).json({ erro: "Id inválido." });

    const { data, error } = await supabaseAdmin
        .from("comentarios")
        .delete()
        .eq("id", req.params.id)
        .eq("usuario_id", req.usuarioId)
        .select("id")
        .maybeSingle();

    if (error) return erroSupabase(res, error);
    if (!data) return res.status(404).json({ erro: "Comentário não encontrado ou não é seu." });
    return res.json({ mensagem: "Comentário apagado." });
}));

/* =========================
   SITE E TRATAMENTO DE ERROS
========================= */

app.use(express.static(PASTA_SITE));

app.use((erro, req, res, next) => {
    console.error("Erro na API:", erro);
    if (erro.type === "entity.too.large") {
        return res.status(413).json({ erro: "A imagem é grande demais para o servidor." });
    }
    return res.status(500).json({
        erro: "Não foi possível processar a requisição.",
        detalhe: process.env.NODE_ENV === "development" ? erro.message : undefined
    });
});

async function iniciarServidor() {
    const url = process.env.SUPABASE_URL;
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !publishableKey || !secretKey) {
        throw new Error(
            "Configure SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY e SUPABASE_SECRET_KEY no .env do Back-End."
        );
    }

    // Import dinâmico mantém este server.js no padrão CommonJS já usado pelo projeto.
    const { createClient } = await import("@supabase/supabase-js");

    const opcoesAuth = {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    };

    // Cliente público: cadastro, login e validação do access token.
    supabaseAuth = createClient(url, publishableKey, opcoesAuth);

    // Cliente privilegiado, exclusivamente no servidor. Nunca enviar esta chave ao navegador.
    supabaseAdmin = createClient(url, secretKey, opcoesAuth);

    // Teste simples de conexão com a API do Supabase.
    const { error } = await supabaseAdmin.from("usuarios").select("id").limit(1);
    if (error) throw error;

    console.log("Conectado ao Supabase.");
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
        console.log(`Site: http://localhost:${PORT}`);
        console.log(`Mensagens: http://localhost:${PORT}/pages/Mensagem.html`);
    });
}

iniciarServidor().catch((erro) => {
    console.error("Erro ao iniciar o servidor:", erro.message);
    console.error("Confira SUPABASE_URL e SUPABASE_SECRET_KEY no .env.");
    process.exitCode = 1;
});