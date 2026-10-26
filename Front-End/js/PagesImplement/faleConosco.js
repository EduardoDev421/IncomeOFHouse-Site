document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("form");

    if (!form) {
        console.error("Formulário de contato não encontrado.");
        return;
    }

    const nome = document.querySelector("#nome");
    const email = document.querySelector("#email");
    const mensagem = document.querySelector("#mensagem");

    // Verifica se os campos necessários existem
    if (!nome || !email || !mensagem) {
        console.error("Um ou mais campos do formulário de contato não foram encontrados.");
        return;
    }

    // Elemento para exibir mensagens ao usuário
    let mensagemStatus = document.querySelector("#mensagemStatus");

    if (!mensagemStatus) {
        mensagemStatus = document.createElement("div");
        mensagemStatus.id = "mensagemStatus";
        mensagemStatus.setAttribute("role", "alert");

        form.appendChild(mensagemStatus);
    }

    function mostrarStatus(texto, tipo) {
        mensagemStatus.textContent = texto;
        mensagemStatus.className = `mensagem-status ${tipo}`;
    }

    function limparStatus() {
        mensagemStatus.textContent = "";
        mensagemStatus.className = "mensagem-status";
    }

    function emailValido(valor) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
    }

    function validarFormulario() {
        const nomeValor = nome.value.trim();
        const emailValor = email.value.trim();
        const mensagemValor = mensagem.value.trim();

        if (nomeValor === "") {
            mostrarStatus("Informe seu nome.", "erro");
            nome.focus();
            return false;
        }

        if (nomeValor.length < 2) {
            mostrarStatus("O nome deve possuir pelo menos 2 caracteres.", "erro");
            nome.focus();
            return false;
        }

        if (nomeValor.length > 150) {
            mostrarStatus("O nome deve possuir no máximo 150 caracteres.", "erro");
            nome.focus();
            return false;
        }

        if (emailValor === "") {
            mostrarStatus("Informe seu e-mail.", "erro");
            email.focus();
            return false;
        }

        if (!emailValido(emailValor)) {
            mostrarStatus("Informe um e-mail válido.", "erro");
            email.focus();
            return false;
        }

        if (mensagemValor === "") {
            mostrarStatus("Digite uma mensagem.", "erro");
            mensagem.focus();
            return false;
        }

        if (mensagemValor.length < 5) {
            mostrarStatus("A mensagem deve possuir pelo menos 5 caracteres.", "erro");
            mensagem.focus();
            return false;
        }

        if (mensagemValor.length > 5000) {
            mostrarStatus("A mensagem deve possuir no máximo 5000 caracteres.", "erro");
            mensagem.focus();
            return false;
        }

        return true;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        limparStatus();

        if (!validarFormulario()) {
            return;
        }

        const dados = {
            nome: nome.value.trim(),
            email: email.value.trim().toLowerCase(),
            mensagem: mensagem.value.trim()
        };

        const botaoEnviar = form.querySelector(
            'button[type="submit"], input[type="submit"]'
        );

        const textoOriginalBotao = botaoEnviar
            ? botaoEnviar.textContent || botaoEnviar.value
            : "";

        try {
            if (botaoEnviar) {
                botaoEnviar.disabled = true;

                if (botaoEnviar.tagName === "INPUT") {
                    botaoEnviar.value = "Enviando...";
                } else {
                    botaoEnviar.textContent = "Enviando...";
                }
            }

            const resposta = await fetch("http://localhost:3000/api/mensagens", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(dados)
            });

            const resultado = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    resultado.erro || "Não foi possível enviar a mensagem."
                );
            }

            mostrarStatus(
                resultado.mensagem || "Mensagem enviada com sucesso!",
                "sucesso"
            );

            form.reset();

        } catch (erro) {
            console.error("Erro ao enviar mensagem:", erro);

            if (erro instanceof TypeError) {
                mostrarStatus(
                    "Não foi possível conectar ao servidor. Verifique se o Back-End está funcionando.",
                    "erro"
                );
            } else {
                mostrarStatus(
                    erro.message || "Ocorreu um erro ao enviar sua mensagem.",
                    "erro"
                );
            }

        } finally {
            if (botaoEnviar) {
                botaoEnviar.disabled = false;

                if (botaoEnviar.tagName === "INPUT") {
                    botaoEnviar.value = textoOriginalBotao;
                } else {
                    botaoEnviar.textContent = textoOriginalBotao;
                }
            }
        }
    });

    // Remove a mensagem de erro quando o usuário começa a corrigir o campo
    nome.addEventListener("input", limparStatus);
    email.addEventListener("input", limparStatus);
    mensagem.addEventListener("input", limparStatus);
}); 