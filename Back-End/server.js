
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mysql = require("mysql2/promise");

const app = express();

const PORT = process.env.PORT || 3000;
const BASE_URL = (
    process.env.BASE_URL || `http://localhost:${PORT}`
).replace(/\/+$/, "");

const PASTA_UPLOADS = path.join(
    __dirname,
    process.env.UPLOAD_DIR || "uploads"
);

const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB) || 5;

const CATEGORIAS = [
    "Casa Térrea", "Sobrado", "Casa Geminada",
    "Casa de Condomínio", "Casa de Campo", "Casa de Praia",
    "Chácara", "Sítio", "Fazenda", "Apartamento",
    "Kitnet / Studio", "Loft", "Cobertura", "Edícula",
    "Casa de Madeira", "Casa Pré-Fabricada", "Casa Modular",
    "Loja", "Sala Comercial", "Escritório", "Galpão",
    "Prédio Comercial", "Galpão Industrial", "Fábrica",
    "Centro de Distribuição", "Área de Lazer",
    "Espaço Gourmet", "Salão de Festas", "Área de Piscina",
    "Projeto Residencial", "Projeto Comercial",
    "Projeto Industrial", "Projeto Arquitetônico"
];

const ESTILOS = [
    "Moderno", "Contemporâneo", "Minimalista", "Clássico",
    "Neoclássico", "Colonial", "Rústico", "Industrial",
    "Escandinavo", "Tropical"
];

const CRIAR_TABELA_PLANTAS = `
    CREATE TABLE IF NOT EXISTS plantas (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        titulo VARCHAR(150) NOT NULL,
        descricao TEXT NOT NULL,
        categoria VARCHAR(80) NOT NULL,
        estilo VARCHAR(40) NULL,
        quartos TINYINT UNSIGNED NOT NULL,
        banheiros TINYINT UNSIGNED NOT NULL,
        garagem TINYINT UNSIGNED NOT NULL,
        area DECIMAL(10, 2) NOT NULL,
        preco DECIMAL(12, 2) NOT NULL,
        imagem_url VARCHAR(255) NOT NULL,
        profissional VARCHAR(150) NOT NULL DEFAULT 'Profissional',
        criada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ativa BOOLEAN NOT NULL DEFAULT TRUE,
        INDEX idx_plantas_ativa_id (ativa, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const CRIAR_TABELA_USUARIOS = `
    CREATE TABLE IF NOT EXISTS usuarios (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(150) NOT NULL,
        email VARCHAR(254) NOT NULL,
        senha_hash VARCHAR(255) NOT NULL,
        cpf CHAR(11) NULL,
        telefone VARCHAR(20) NULL,
        data_nascimento DATE NULL,
        criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        ativo BOOLEAN NOT NULL DEFAULT TRUE,
        UNIQUE KEY uq_usuarios_email (email),
        UNIQUE KEY uq_usuarios_cpf (cpf)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const SELECT_PLANTAS = `
    SELECT
        p.id,
        p.titulo,
        p.descricao,
        p.categoria,
        p.estilo,
        p.quartos,
        p.banheiros,
        p.garagem,
        p.area,
        p.preco,
        p.imagem_url AS imagem,
        p.profissional,
        p.criada_em AS criadaEm
    FROM plantas p
    WHERE p.ativa = TRUE
`;

fs.mkdirSync(PASTA_UPLOADS, { recursive: true });

const sessoes = new Map();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    decimalNumbers: true
});

// Hash de senha usando recursos nativos do Node.js (sem armazenar senha em texto puro).
function criarHashSenha(senha) {
    return new Promise((resolve, reject) => {
        const sal = crypto.randomBytes(16).toString("hex");
        crypto.scrypt(senha, sal, 64, (erro, chave) => {
            if (erro) return reject(erro);
            resolve(`${sal}:${chave.toString("hex")}`);
        });
    });
}

function verificarHashSenha(senha, hashArmazenado) {
    return new Promise((resolve, reject) => {
        if (typeof hashArmazenado !== "string" || !hashArmazenado.includes(":")) {
            return resolve(false);
        }
        const [sal, chaveHex] = hashArmazenado.split(":");
        const chaveEsperada = Buffer.from(chaveHex, "hex");
        crypto.scrypt(senha, sal, chaveEsperada.length, (erro, chaveCalculada) => {
            if (erro) return reject(erro);
            if (chaveCalculada.length !== chaveEsperada.length) return resolve(false);
            resolve(crypto.timingSafeEqual(chaveCalculada, chaveEsperada));
        });
    });
}

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(PASTA_UPLOADS));

const rota = (fn) => (req, res, next) => {
    fn(req, res, next).catch(next);
};

function salvarImagem(dataUrl) {
    if (typeof dataUrl !== "string") {
        return null;
    }

    const resultado = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);

    if (!resultado) {
        return null;
    }

    const buffer = Buffer.from(resultado[2], "base64");

    if (buffer.length === 0 || buffer.length > MAX_UPLOAD_MB * 1024 * 1024) {
        return null;
    }

    const extensao = resultado[1] === "jpeg"
        ? "jpg"
        : resultado[1];

    const nome = `${crypto.randomUUID()}.${extensao}`;

    fs.writeFileSync(path.join(PASTA_UPLOADS, nome), buffer);

    return `/uploads/${nome}`;
}

function paraSite(planta) {
    return {
        ...planta,
        imagem: `${BASE_URL}${planta.imagem}`
    };
}

function validarPlanta(c) {
    if (!c || typeof c !== "object" || Array.isArray(c)) {
        return "Os dados da planta são inválidos.";
    }

    for (const campo of ["titulo", "descricao", "categoria"]) {
        if (
            typeof c[campo] !== "string" ||
            c[campo].trim() === ""
        ) {
            return `O campo "${campo}" é obrigatório.`;
        }
    }

    if (c.titulo.trim().length > 150) {
        return "O título pode ter no máximo 150 caracteres.";
    }

    if (!CATEGORIAS.includes(c.categoria.trim())) {
        return "Categoria inválida.";
    }

    if (
        c.estilo != null &&
        c.estilo !== "" &&
        (typeof c.estilo !== "string" || !ESTILOS.includes(c.estilo.trim()))
    ) {
        return "Estilo inválido.";
    }

    for (const campo of ["quartos", "banheiros", "garagem"]) {
        if (
            !Number.isInteger(c[campo]) ||
            c[campo] < 0 ||
            c[campo] > 255
        ) {
            return `O campo "${campo}" precisa ser um número inteiro entre 0 e 255.`;
        }
    }

    if (!Number.isFinite(c.area) || c.area <= 0 || c.area >= 1000000) {
        return 'O campo "area" é inválido.';
    }

    if (!Number.isFinite(c.preco) || c.preco <= 0 || c.preco >= 10000000000) {
        return 'O campo "preco" é inválido.';
    }

    if (
        typeof c.imagem !== "string" ||
        !c.imagem.startsWith("data:image/")
    ) {
        return "Imagem inválida.";
    }

    return null;
}

// Cadastrar usuário
app.post("/api/usuarios", rota(async (req, res) => {
    const dados = req.body;

    if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
        return res.status(400).json({ erro: "Envie os dados do cadastro em JSON." });
    }

    const nome = typeof dados.nome === "string" ? dados.nome.trim() : "";
    const email = typeof dados.email === "string" ? dados.email.trim().toLowerCase() : "";
    const senha = typeof dados.senha === "string" ? dados.senha : "";

    if (nome.length < 3 || nome.length > 150) {
        return res.status(400).json({ erro: "O nome deve ter entre 3 e 150 caracteres." });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        return res.status(400).json({ erro: "Informe um e-mail válido." });
    }

    if (senha.length < 6 || senha.length > 200) {
        return res.status(400).json({ erro: "A senha deve ter entre 6 e 200 caracteres." });
    }

    const cpf = typeof dados.cpf === "string" ? dados.cpf.replace(/\D/g, "") : "";
    const telefone = typeof dados.telefone === "string" ? dados.telefone.replace(/\D/g, "") : "";
    const dataNascimento = typeof dados.dataNascimento === "string" && dados.dataNascimento.trim()
        ? dados.dataNascimento.trim()
        : null;

    if (cpf && cpf.length !== 11) {
        return res.status(400).json({ erro: "O CPF deve conter 11 números." });
    }

    if (telefone && ![10, 11].includes(telefone.length)) {
        return res.status(400).json({ erro: "Informe um telefone válido." });
    }

    if (dataNascimento && !/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
        return res.status(400).json({ erro: "A data de nascimento deve estar no formato AAAA-MM-DD." });
    }

    const senhaHash = await criarHashSenha(senha);

    try {
        const [resultado] = await pool.execute(
            `INSERT INTO usuarios (nome, email, senha_hash, cpf, telefone, data_nascimento)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [nome, email, senhaHash, cpf || null, telefone || null, dataNascimento]
        );

        return res.status(201).json({
            mensagem: "Cadastro realizado com sucesso.",
            usuario: { id: resultado.insertId, nome, email }
        });
    } catch (erroBanco) {
        if (erroBanco.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ erro: "Já existe uma conta com esse e-mail ou CPF." });
        }
        throw erroBanco;
    }
}));


// Entrar na conta
app.post("/api/login", rota(async (req, res) => {
    const email = typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const senha = typeof req.body?.senha === "string" ? req.body.senha : "";

    if (!email || !senha) {
        return res.status(400).json({ erro: "Informe o e-mail e a senha." });
    }

    const [usuarios] = await pool.execute(
        `SELECT id, nome, email, senha_hash, ativo FROM usuarios WHERE email = ? LIMIT 1`,
        [email]
    );

    if (usuarios.length === 0 || !usuarios[0].ativo) {
        return res.status(401).json({ erro: "E-mail ou senha incorretos." });
    }

    const usuario = usuarios[0];
    const senhaCorreta = await verificarHashSenha(senha, usuario.senha_hash);

    if (!senhaCorreta) {
        return res.status(401).json({ erro: "E-mail ou senha incorretos." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    sessoes.set(token, Number(usuario.id));

    return res.json({
        mensagem: "Login realizado com sucesso.",
        token,
        usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email }
    });
}));

function exigirLogin(req, res, next) {
    const cabecalho = req.headers.authorization || "";
    const correspondencia = /^Bearer\s+(.+)$/i.exec(cabecalho);
    const token = correspondencia?.[1];
    const usuarioId = token ? sessoes.get(token) : null;

    if (!usuarioId) {
        return res.status(401).json({ erro: "Sua sessão expirou. Entre novamente." });
    }

    req.usuarioId = usuarioId;
    next();
}

// Consultar os dados do próprio usuário autenticado
app.get("/api/usuarios/me", exigirLogin, rota(async (req, res) => {
    const [linhas] = await pool.execute(
        `SELECT id, nome, email, cpf, telefone, data_nascimento, criado_em
         FROM usuarios WHERE id = ? AND ativo = TRUE LIMIT 1`,
        [req.usuarioId]
    );

    if (!linhas.length) {
        return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    return res.json({ usuario: linhas[0] });
}));

// Atualizar nome e e-mail do próprio usuário autenticado
app.put("/api/usuarios/me", exigirLogin, rota(async (req, res) => {
    const nome = typeof req.body?.nome === "string" ? req.body.nome.trim() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

    if (nome.length < 3 || nome.length > 150) {
        return res.status(400).json({ erro: "O nome deve ter entre 3 e 150 caracteres." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        return res.status(400).json({ erro: "Informe um e-mail válido." });
    }

    try {
        const [resultado] = await pool.execute(
            "UPDATE usuarios SET nome = ?, email = ? WHERE id = ? AND ativo = TRUE",
            [nome, email, req.usuarioId]
        );
        if (!resultado.affectedRows) {
            return res.status(404).json({ erro: "Usuário não encontrado." });
        }
        const [linhas] = await pool.execute(
            `SELECT id, nome, email, cpf, telefone, data_nascimento, criado_em
             FROM usuarios WHERE id = ? LIMIT 1`,
            [req.usuarioId]
        );
        return res.json({ mensagem: "Perfil atualizado no banco de dados.", usuario: linhas[0] });
    } catch (erroBanco) {
        if (erroBanco.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ erro: "Esse e-mail já está cadastrado em outra conta." });
        }
        throw erroBanco;
    }
}));

app.post("/api/logout", exigirLogin, (req, res) => {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    sessoes.delete(token);
    return res.json({ mensagem: "Sessão encerrada." });
});

// Listar plantas
app.get("/plantas", rota(async (req, res) => {
    const [linhas] = await pool.query(
        `${SELECT_PLANTAS} ORDER BY p.id DESC`
    );

    res.json(linhas.map(paraSite));
}));

// Consultar uma planta
app.get("/plantas/:id", rota(async (req, res) => {
    const id = req.params.id;

    if (!/^\d+$/.test(id) || Number(id) <= 0) {
        return res.status(400).json({
            erro: "Id inválido."
        });
    }

    const [linhas] = await pool.query(
        `${SELECT_PLANTAS} AND p.id = ?`,
        [id]
    );

    if (linhas.length === 0) {
        return res.status(404).json({
            erro: "Planta não encontrada."
        });
    }

    res.json(paraSite(linhas[0]));
}));

// Publicar uma planta
app.post("/plantas", rota(async (req, res) => {
    const c = req.body;

    const erro = validarPlanta(c);

    if (erro) {
        return res.status(400).json({ erro });
    }

    const estilo = c.estilo && c.estilo.trim() !== ""
        ? c.estilo.trim()
        : null;

    const caminhoImagem = salvarImagem(c.imagem);

    if (!caminhoImagem) {
        return res.status(400).json({
            erro: `Imagem inválida ou maior que ${MAX_UPLOAD_MB}MB.`
        });
    }

    try {
        const [resultado] = await pool.query(
            `INSERT INTO plantas (
                titulo, descricao, categoria, estilo,
                quartos, banheiros, garagem, area,
                preco, imagem_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                c.titulo.trim(),
                c.descricao.trim(),
                c.categoria.trim(),
                estilo,
                c.quartos,
                c.banheiros,
                c.garagem,
                c.area,
                c.preco,
                caminhoImagem
            ]
        );

        res.status(201).json({
            mensagem: "Planta publicada com sucesso.",
            id: resultado.insertId
        });
    } catch (erroBanco) {
        fs.unlink(
            path.join(PASTA_UPLOADS, path.basename(caminhoImagem)),
            () => {}
        );

        throw erroBanco;
    }
}));

// Tratamento de erros
app.use((erro, req, res, next) => {
    console.error("Erro na API:", erro);

    res.status(500).json({
        erro: "Não foi possível processar a requisição.",
        detalhe: erro.message
    });
});

// Iniciar servidor e criar a tabela
async function iniciarServidor() {
    await pool.query("SELECT 1");
    await pool.query(CRIAR_TABELA_PLANTAS);
    await pool.query(CRIAR_TABELA_USUARIOS);

    console.log(`Conectado ao MySQL: ${process.env.DB_NAME}`);

    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
}

iniciarServidor().catch(async (erro) => {
    console.error("Erro ao iniciar o servidor:", erro.message);
    console.error("Confira as configurações do arquivo .env.");

    await pool.end();
    process.exitCode = 1;
});
