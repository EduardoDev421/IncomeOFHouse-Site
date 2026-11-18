document.addEventListener("DOMContentLoaded", () => {
    const formulario = document.querySelector(".formCadastro");

    if (!formulario) return;

    const nome = document.getElementById("nomeCadastro");
    const email = document.getElementById("emailCadastro");
    const cpf = document.getElementById("cpfCadastro");
    const telefone = document.getElementById("telefoneCadastro");
    const dataNascimento = document.getElementById("datanascCadastro");
    const senha = document.getElementById("senhaCadastro");
    const confirmarSenha = document.getElementById("confirmaSenha");
    const botao = formulario.querySelector('[type="submit"]');

    // Desliga o balão do navegador para usar o card vermelho
    formulario.noValidate = true;

    const campos = [nome, email, cpf, telefone, dataNascimento, senha, confirmarSenha];

    function limparMensagens() {
        formulario.querySelectorAll(".mensagem-cadastro").forEach(
            elemento => elemento.remove()
        );
        campos.forEach(campo => campo.classList.remove("campo-invalido"));
    }

    function mostrarMensagem(texto, sucesso = false) {
        formulario.querySelectorAll(".mensagem-cadastro").forEach(
            elemento => elemento.remove()
        );

        const mensagem = document.createElement("div");
        mensagem.className = `mensagem-cadastro card-mensagem ${sucesso ? "card-sucesso" : "card-erro"}`;
        mensagem.setAttribute("role", sucesso ? "status" : "alert");
        mensagem.textContent = texto;

        // Logo abaixo do botão "Cadastrar" (antes ficava no fim do formulário)
        botao.insertAdjacentElement("afterend", mensagem);
    }

    function erroNoCampo(campo, texto) {
        mostrarMensagem(texto);
        campo.classList.add("campo-invalido");
        campo.focus();
    }

    // Some o destaque vermelho quando a pessoa volta a digitar
    campos.forEach(campo => {
        campo.addEventListener("input", () => campo.classList.remove("campo-invalido"));
    });

    function cpfValido(valor) {
        const numero = valor.replace(/\D/g, "");

        if (numero.length !== 11 || /^(\d)\1{10}$/.test(numero)) {
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

    cpf.addEventListener("input", () => {
        let valor = cpf.value.replace(/\D/g, "").slice(0, 11);

        valor = valor.replace(/^(\d{3})(\d)/, "$1.$2");
        valor = valor.replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3");
        valor = valor.replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");

        cpf.value = valor;
    });

    telefone.addEventListener("input", () => {
        let valor = telefone.value.replace(/\D/g, "").slice(0, 11);

        if (valor.length > 10) {
            valor = valor.replace(/^(\d{2})(\d{5})(\d{1,4}).*/, "($1) $2-$3");
        } else if (valor.length > 6) {
            valor = valor.replace(/^(\d{2})(\d{4})(\d{1,4}).*/, "($1) $2-$3");
        } else if (valor.length > 2) {
            valor = valor.replace(/^(\d{2})(\d+)/, "($1) $2");
        }

        telefone.value = valor;
    });

    formulario.addEventListener("submit", async evento => {
        evento.preventDefault();
        limparMensagens();

        const nomeValor = nome.value.trim();
        const emailValor = email.value.trim();
        const cpfValor = cpf.value;
        const telefoneValor = telefone.value.replace(/\D/g, "");
        const dataValor = dataNascimento.value;
        const senhaValor = senha.value;

        if (nomeValor.length < 3) {
            erroNoCampo(nome, "Informe seu nome completo.");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValor)) {
            erroNoCampo(email, "Informe um e-mail válido.");
            return;
        }

        if (!cpfValido(cpfValor)) {
            erroNoCampo(cpf, "Informe um CPF válido.");
            return;
        }

        if (![10, 11].includes(telefoneValor.length)) {
            erroNoCampo(telefone, "Informe um telefone válido.");
            return;
        }

        if (!dataValor || dataValor > new Date().toISOString().slice(0, 10)) {
            erroNoCampo(dataNascimento, "Informe uma data de nascimento válida.");
            return;
        }

        if (senhaValor.length < 6) {
            erroNoCampo(senha, "A senha precisa ter pelo menos 6 caracteres.");
            return;
        }

        if (senhaValor !== confirmarSenha.value) {
            erroNoCampo(confirmarSenha, "As senhas não coincidem.");
            return;
        }

        try {
            botao.disabled = true;
            botao.textContent = "Cadastrando...";

            const resposta = await fetch("http://localhost:3000/api/usuarios", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    nome: nomeValor,
                    email: emailValor,
                    senha: senhaValor
                })
            });

            const dados = await resposta.json().catch(() => ({}));

            if (!resposta.ok) {
                throw new Error(dados.erro || "Não foi possível realizar o cadastro.");
            }

            formulario.reset();

            mostrarMensagem(
                "Cadastro realizado com sucesso! Você já pode entrar na sua conta.",
                true
            );
        } catch (erro) {
            if (erro instanceof TypeError) {
                mostrarMensagem(
                    "Não foi possível conectar ao servidor. Confira se o Back-End está iniciado."
                );
            } else {
                mostrarMensagem(erro.message);
            }
        } finally {
            botao.disabled = false;
            botao.textContent = "Cadastrar";
        }
    });
});