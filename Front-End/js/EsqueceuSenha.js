document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector(".FormSenha");

    if (!form) {
        console.error("Formulário de recuperação de senha não encontrado.");
        return;
    }

    // Pega o campo de e-mail pelo tipo, assim funciona mesmo sem saber o id
    const email = form.querySelector('input[type="email"]') || form.querySelector("input");
    const caixaCampo = form.querySelector(".campo-input");
    const botao = form.querySelector("button");

    if (!email || !botao) {
        console.error("Campo de e-mail ou botão não encontrado no formulário de senha.");
        return;
    }

    // Desliga o balão do navegador ("Preencha este campo") para usar o card vermelho
    form.noValidate = true;

    const API_URL = "http://localhost:3000/api/esqueci-senha";
    const textoOriginalBotao = botao.innerHTML;

    function limparMensagem() {
        form.querySelector(".mensagem-senha")?.remove();
        (caixaCampo || email).classList.remove("campo-invalido");
    }

    function mostrarMensagem(texto, sucesso = false) {
        form.querySelector(".mensagem-senha")?.remove();

        const mensagem = document.createElement("div");
        mensagem.className = `mensagem-senha card-mensagem ${sucesso ? "card-sucesso" : "card-erro"}`;
        mensagem.setAttribute("role", sucesso ? "status" : "alert");
        mensagem.textContent = texto;

        // Logo abaixo do botão, no mesmo padrão do login e do cadastro
        botao.insertAdjacentElement("afterend", mensagem);
    }

    function erroNoCampo(texto) {
        mostrarMensagem(texto);
        (caixaCampo || email).classList.add("campo-invalido");
        email.focus();
    }

    // Some o destaque vermelho quando a pessoa volta a digitar
    email.addEventListener("input", () => {
        (caixaCampo || email).classList.remove("campo-invalido");
    });

    form.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        limparMensagem();

        const emailValor = email.value.trim().toLowerCase();

        if (!emailValor) {
            erroNoCampo("Digite seu e-mail.");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValor)) {
            erroNoCampo("Digite um e-mail válido.");
            return;
        }

        botao.disabled = true;
        botao.textContent = "Enviando...";

        try {
            const resposta = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: emailValor })
            });

            const dados = await resposta.json().catch(() => ({}));

            if (resposta.status === 404 && !dados.erro) {
                throw new Error("A recuperação de senha ainda não está disponível no servidor.");
            }

            if (!resposta.ok) {
                throw new Error(dados.erro || "Não foi possível enviar o e-mail de recuperação. Tente novamente.");
            }

            // Mensagem neutra: não revela se o e-mail existe ou não no sistema
            mostrarMensagem(
                "Se este e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha.",
                true
            );

            form.reset();
        } catch (erro) {
            // TypeError = fetch falhou (servidor fora do ar)
            if (erro instanceof TypeError) {
                mostrarMensagem("Não foi possível conectar ao servidor. Confira se o Back-End está rodando.");
            } else {
                mostrarMensagem(erro.message);
            }
        } finally {
            botao.disabled = false;
            botao.innerHTML = textoOriginalBotao;
        }
    });
});