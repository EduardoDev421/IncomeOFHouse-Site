
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { promisify } = require("util");
const { pool, testarConexao } = require("./db");

require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

const scryptAsync = promisify(crypto.scrypt);

app.use(cors());
app.use(express.json({ limit: "20kb" }));

// Gera um hash seguro para a senha.
async function gerarHashSenha(senha) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = await scryptAsync(senha, salt, 64);

    return `scrypt:${salt}:${hash.toString("hex")}`;
}

// Compara a senha informada com o hash armazenado.
async function verificarSenha(senha, senhaArmazenada) {
    if (!senhaArmazenada || typeof senhaArmazenada !== "string") {
        return false;
    }

    // Formato atual: scrypt:salt:hash
    if (senhaArmazenada.startsWith("scrypt:")) {
        const partes = senhaArmazenada.split(":");

        if (partes.length !== 3) {
            return false;
        }

        const [, salt, hashSalvo] = partes;

        try {
            const hashCalculado = await scryptAsync(senha, salt, 64);
            const hashOriginal = Buffer.from(hashSalvo, "hex");

            if (hashOriginal.length !== hashCalculado.length) {
                return false;
            }

            return crypto.timingSafeEqual(
                hashCalculado,
                hashOriginal
            );
        } catch {
            return false;
        }
    }

    // Compatibilidade temporária com cadastros antigos em texto.
    // Após login válido, a senha será convertida para hash.
    return senha === senhaArmazenada;
}

// Verifica se os dados são textos válidos.
function textoValido(valor, limite) {
    return (
        typeof valor === "string" &&
        valor.trim().length > 0 &&
        valor.trim().length <= limite
    );
}

// Rota para verificar se o servidor está funcionando.
app.get("/api/status", (req, res) => {
    res.json({
        funcionando: true,
        mensagem: "API do Income of Houses está funcionando."
    });
});

// ======================================================
// CADASTRO DE USUÁRIO
// POST /api/usuarios
// ======================================================

app.post("/api/usuarios", async (req, res) => {
    try {
        const { nome, email, senha } = req.body;

        if (!textoValido(nome, 150)) {
            return res.status(400).json({
                erro: "Informe um nome válido."
            });
        }

        if (
            !textoValido(email, 254) ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ) {
            return res.status(400).json({
                erro: "Informe um e-mail válido."
            });
        }

        if (typeof senha !== "string" || senha.length < 6 || senha.length > 200) {
            return res.status(400).json({
                erro: "A senha deve possuir pelo menos 6 caracteres."
            });
        }

        const emailNormalizado = email.trim().toLowerCase();

        const [usuariosExistentes] = await pool.execute(
            "SELECT id FROM tb_usuarios WHERE LOWER(email) = ? LIMIT 1",
            [emailNormalizado]
        );

        if (usuariosExistentes.length > 0) {
            return res.status(409).json({
                erro: "Este e-mail já está cadastrado."
            });
        }

        const senhaHash = await gerarHashSenha(senha);

        const [resultado] = await pool.execute(
            `INSERT INTO tb_usuarios (nome, email, senha)
             VALUES (?, ?, ?)`,
            [nome.trim(), emailNormalizado, senhaHash]
        );

        return res.status(201).json({
            mensagem: "Cadastro realizado com sucesso.",
            usuario: {
                id: resultado.insertId,
                nome: nome.trim(),
                email: emailNormalizado
            }
        });
    } catch (erro) {
        console.error("Erro no cadastro:", erro.message);

        return res.status(500).json({
            erro: "Não foi possível realizar o cadastro."
        });
    }
});

// ======================================================
// LOGIN
// POST /api/login
// ======================================================

app.post("/api/login", async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (
            !textoValido(email, 254) ||
            typeof senha !== "string" ||
            senha.length === 0
        ) {
            return res.status(400).json({
                erro: "Informe seu e-mail e sua senha."
            });
        }

        const emailNormalizado = email.trim().toLowerCase();

        const [usuarios] = await pool.execute(
            `SELECT id, nome, email, senha
             FROM tb_usuarios
             WHERE LOWER(email) = ?
             LIMIT 1`,
            [emailNormalizado]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({
                erro: "E-mail ou senha inválidos."
            });
        }

        const usuario = usuarios[0];

        const senhaCorreta = await verificarSenha(
            senha,
            usuario.senha
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                erro: "E-mail ou senha inválidos."
            });
        }

        // Converte senhas antigas em texto para hash após login válido.
        if (!usuario.senha.startsWith("scrypt:")) {
            const novoHash = await gerarHashSenha(senha);

            await pool.execute(
                "UPDATE tb_usuarios SET senha = ? WHERE id = ?",
                [novoHash, usuario.id]
            );
        }

        return res.json({
            mensagem: "Login realizado com sucesso.",
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email
            }
        });
    } catch (erro) {
        console.error("Erro no login:", erro.message);

        return res.status(500).json({
            erro: "Não foi possível realizar o login."
        });
    }
});

// ======================================================
// FALE CONOSCO
// POST /api/mensagens
// ======================================================

app.post("/api/mensagens", async (req, res) => {
    try {
        const { nome, email, mensagem } = req.body;

        if (!textoValido(nome, 150)) {
            return res.status(400).json({
                erro: "Informe seu nome."
            });
        }

        if (
            !textoValido(email, 254) ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ) {
            return res.status(400).json({
                erro: "Informe um e-mail válido."
            });
        }

        if (!textoValido(mensagem, 5000)) {
            return res.status(400).json({
                erro: "A mensagem não pode estar vazia e deve ter até 5000 caracteres."
            });
        }

        const [resultado] = await pool.execute(
            `INSERT INTO tb_mensagem (nome, email, mensagem)
             VALUES (?, ?, ?)`,
            [
                nome.trim(),
                email.trim().toLowerCase(),
                mensagem.trim()
            ]
        );

        return res.status(201).json({
            mensagem: "Mensagem enviada com sucesso.",
            id: resultado.insertId
        });
    } catch (erro) {
        console.error("Erro ao salvar mensagem:", erro.message);

        return res.status(500).json({
            erro: "Não foi possível enviar sua mensagem."
        });
    }
});

// Tratamento para rotas que não existem.
app.use((req, res) => {
    res.status(404).json({
        erro: "Rota não encontrada."
    });
});

// Inicia o servidor somente depois de testar a conexão.
async function iniciarServidor() {
    try {
        await testarConexao();

        app.listen(PORT, () => {
            console.log(`Servidor disponível em http://localhost:${PORT}`);
        });
    } catch (erro) {
        console.error(
            "O servidor não foi iniciado. Confira o MySQL e o arquivo .env."
        );

        process.exit(1);
    }
}

iniciarServidor();