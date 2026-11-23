import { cadastrarProfissional } from "./services/authService.js";
import { ativarOlhosDeSenha } from "./utils/formUtils.js";

const PAGINA_INICIAL = "../index.html";
const PAGINA_LOGIN = "login.html";

document.addEventListener("DOMContentLoaded", () => {

    // CORREÇÃO: utiliza a classe real do formulário no HTML.
    const formulario = document.querySelector(
        ".FormCadastro"
    );

    if (!formulario) {
        console.error("Formulário de cadastro profissional não encontrado.");
        return;
    }

    ativarOlhosDeSenha();

    // Busca os campos pelos IDs reais do HTML.
    const nome = formulario.querySelector("#nome");
    const registro = formulario.querySelector("#RP");
    const email = formulario.querySelector("#email");
    const telefone = formulario.querySelector("#telefone");
    const cpf = formulario.querySelector("#CPF");
    const dataNascimento = formulario.querySelector("#DN");
    const cidade = formulario.querySelector("#Cidade");
    const estado = formulario.querySelector("#SEstado");
    const profissao = formulario.querySelector("#profissao");
    const senha = formulario.querySelector("#Senha");
    const confirmarSenha = formulario.querySelector("#CSenha");

    const botao = formulario.querySelector('[type="submit"]');

    const campos = [
        nome,
        registro,
        email,
        telefone,
        cpf,
        dataNascimento,
        cidade,
        estado,
        profissao,
        senha,
        confirmarSenha
    ];

    // Verifica se todos os campos foram encontrados.
    const campoAusente = campos.find(campo => !campo);

    if (campoAusente || !botao) {
        console.error("Um ou mais campos do cadastro não foram encontrados.");
        return;
    }

    formulario.noValidate = true;

    function limparMensagens() {
        formulario.querySelectorAll(".mensagem-cadastro").forEach(
            elemento => elemento.remove()
        );

        campos.forEach(campo => {
            campo.classList.remove("campo-invalido");
        });
    }

    function mostrarMensagem(texto, sucesso = false, link = null) {
        formulario.querySelectorAll(".mensagem-cadastro").forEach(
            elemento => elemento.remove()
        );

        const mensagem = document.createElement("div");

        mensagem.className =
            `mensagem-cadastro card-mensagem ${
                sucesso ? "card-sucesso" : "card-erro"
            }`;

        mensagem.setAttribute(
            "role",
            sucesso ? "status" : "alert"
        );

        mensagem.textContent = texto;

        if (link) {
            const a = document.createElement("a");
            a.href = link.href;
            a.textContent = link.texto;
            mensagem.append(" ", a);
        }

        botao.insertAdjacentElement("afterend", mensagem);
    }

    function erroNoCampo(campo, texto) {
        mostrarMensagem(texto);

        if (campo) {
            campo.classList.add("campo-invalido");
            campo.focus();
        }
    }

    // Remove o destaque vermelho quando o campo é corrigido.
    campos.forEach(campo => {
        campo.addEventListener("input", () => {
            campo.classList.remove("campo-invalido");
        });

        campo.addEventListener("change", () => {
            campo.classList.remove("campo-invalido");
        });
    });

    // Validação de CPF.
    function cpfValido(valor) {
        const numero = valor.replace(/\D/g, "");

        if (
            numero.length !== 11 ||
            /^(\d)\1{10}$/.test(numero)
        ) {
            return false;
        }

        let soma = 0;

        for (let i = 0; i < 9; i++) {
            soma += Number(numero[i]) * (10 - i);
        }

        let digito = (soma * 10) % 11;
        if (digito === 10) digito = 0;

        if (digito !== Number(numero[9])) return false;

        soma = 0;

        for (let i = 0; i < 10; i++) {
            soma += Number(numero[i]) * (11 - i);
        }

        digito = (soma * 10) % 11;
        if (digito === 10) digito = 0;

        return digito === Number(numero[10]);
    }

    // Máscara do CPF.
    cpf.addEventListener("input", () => {
        let valor = cpf.value.replace(/\D/g, "").slice(0, 11);

        valor = valor.replace(/^(\d{3})(\d)/, "$1.$2");
        valor = valor.replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3");
        valor = valor.replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");

        cpf.value = valor;
    });

    // Máscara do telefone.
    telefone.addEventListener("input", () => {
        let valor = telefone.value.replace(/\D/g, "").slice(0, 11);

        if (valor.length > 10) {
            valor = valor.replace(
                /^(\d{2})(\d{5})(\d{1,4}).*/,
                "($1) $2-$3"
            );
        } else if (valor.length > 6) {
            valor = valor.replace(
                /^(\d{2})(\d{4})(\d{1,4}).*/,
                "($1) $2-$3"
            );
        } else if (valor.length > 2) {
            valor = valor.replace(
                /^(\d{2})(\d+)/,
                "($1) $2"
            );
        }

        telefone.value = valor;
    });

    // Atualiza o nome do documento selecionado.
    const documentos = formulario.querySelector("#documentos");
    const nomeArquivo = document.getElementById("NomeArquivo");

    documentos?.addEventListener("change", () => {
        if (nomeArquivo) {
            nomeArquivo.textContent =
                documentos.files[0]?.name || "Nenhum arquivo escolhido";
        }
    });

    // Data atual no formato local.
    function dataAtual() {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, "0");
        const dia = String(hoje.getDate()).padStart(2, "0");

        return `${ano}-${mes}-${dia}`;
    }

    // Envio do cadastro.
    formulario.addEventListener("submit", async evento => {
        evento.preventDefault();

        limparMensagens();

        const dados = {
            nome: nome.value.trim(),
            registro: registro.value.trim(),
            email: email.value.trim(),
            telefone: telefone.value.replace(/\D/g, ""),
            cpf: cpf.value,
            dataNascimento: dataNascimento.value,
            cidade: cidade.value.trim(),
            estado: estado.value.trim().toUpperCase(),
            profissao: profissao.value,
            senha: senha.value
        };

        // Validações.
        if (dados.nome.length < 3 || dados.nome.length > 150) {
            erroNoCampo(nome, "Informe seu nome completo.");
            return;
        }

        if (dados.registro.length < 2 || dados.registro.length > 80) {
            erroNoCampo(registro, "Informe um registro profissional válido.");
            return;
        }

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email) ||
            dados.email.length > 254
        ) {
            erroNoCampo(email, "Informe um e-mail válido.");
            return;
        }

        if (![10, 11].includes(dados.telefone.length)) {
            erroNoCampo(telefone, "Informe um telefone válido.");
            return;
        }

        if (!cpfValido(dados.cpf)) {
            erroNoCampo(cpf, "Informe um CPF válido.");
            return;
        }

        if (
            !/^\d{4}-\d{2}-\d{2}$/.test(dados.dataNascimento) ||
            dados.dataNascimento > dataAtual()
        ) {
            erroNoCampo(
                dataNascimento,
                "Informe uma data de nascimento válida."
            );
            return;
        }

        if (dados.cidade.length < 2 || dados.cidade.length > 100) {
            erroNoCampo(cidade, "Informe uma cidade válida.");
            return;
        }

        if (!/^[A-Z]{2}$/.test(dados.estado)) {
            erroNoCampo(estado, "Selecione um estado válido.");
            return;
        }

        if (!dados.profissao) {
            erroNoCampo(profissao, "Selecione sua profissão.");
            return;
        }

        if (dados.senha.length < 6) {
            erroNoCampo(senha, "A senha precisa ter pelo menos 6 caracteres.");
            return;
        }

        if (dados.senha !== confirmarSenha.value) {
            erroNoCampo(confirmarSenha, "As senhas não coincidem.");
            return;
        }

        // Evita envios duplicados.
        const textoOriginal = botao.textContent;

        try {
            botao.disabled = true;
            botao.textContent = "Cadastrando...";

            // Envia todos os dados profissionais ao Supabase.
            const resultado = await cadastrarProfissional(dados);

            formulario.reset();

            if (nomeArquivo) {
                nomeArquivo.textContent = "Nenhum arquivo escolhido";
            }

            if (resultado.precisaConfirmarEmail) {
                mostrarMensagem(
                    "Cadastro realizado! Enviamos um e-mail para confirmar sua conta.",
                    true,
                    {
                        texto: "Ir para o login",
                        href: PAGINA_LOGIN
                    }
                );

                setTimeout(() => {
                    window.location.href = PAGINA_INICIAL;
                }, 3000);

            } else {
                mostrarMensagem(
                    "Cadastro profissional realizado com sucesso! Redirecionando...",
                    true
                );

                setTimeout(() => {
                    window.location.href = PAGINA_INICIAL;
                }, 1200);
            }

        } catch (erro) {
            console.error("Erro no cadastro profissional:", erro);

            mostrarMensagem(
                erro.message ||
                "Não foi possível realizar o cadastro. Tente novamente."
            );

        } finally {
            botao.disabled = false;
            botao.textContent = textoOriginal;
        }
    });
});