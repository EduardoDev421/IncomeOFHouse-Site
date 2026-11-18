document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector(".FormLogin");
    const email = document.getElementById("email");
    const senha = document.getElementById("senha");
    const lembrar = document.getElementById("lembrar");
    const botoesSociais = document.querySelectorAll(".BotaoSocial");
    const API_URL = "http://localhost:3000/api/login";

    if (!form || !email || !senha || !lembrar) {
        console.error("Formulário de login não encontrado.");
        return;
    }

    // Desliga o balão do navegador para usar o card vermelho
    form.noValidate = true;

    const EMAIL_KEY = "incomeOfHouses_email";

    function limparMensagem() {
        form.querySelector(".mensagem-login")?.remove();
        email.classList.remove("campo-invalido");
        senha.classList.remove("campo-invalido");
    }

    function mostrarMensagem(mensagem, sucesso = false) {
        form.querySelector(".mensagem-login")?.remove();

        const caixa = document.createElement("div");
        caixa.className = `mensagem-login card-mensagem ${sucesso ? "card-sucesso" : "card-erro"}`;
        caixa.setAttribute("role", sucesso ? "status" : "alert");
        caixa.textContent = mensagem;

        form.appendChild(caixa);
    }

    function erroNoCampo(campo, mensagem) {
        mostrarMensagem(mensagem);
        campo.classList.add("campo-invalido");
        campo.focus();
    }

    // Some o destaque vermelho quando a pessoa volta a digitar
    [email, senha].forEach(campo => {
        campo.addEventListener("input", () => campo.classList.remove("campo-invalido"));
    });

    const emailSalvo = localStorage.getItem(EMAIL_KEY);
    if (emailSalvo) {
        email.value = emailSalvo;
        lembrar.checked = true;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        limparMensagem();

        const emailValor = email.value.trim().toLowerCase();
        const senhaValor = senha.value;

        if (!emailValor || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValor)) {
            erroNoCampo(email, "Digite um e-mail válido.");
            return;
        }
        if (!senhaValor) {
            erroNoCampo(senha, "Digite sua senha.");
            return;
        }

        const botao = form.querySelector('button[type="submit"]');
        if (botao) {
            botao.disabled = true;
            botao.textContent = "Entrando...";
        }

        try {
            const resposta = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: emailValor, senha: senhaValor })
            });
            const dados = await resposta.json().catch(() => ({}));

            if (!resposta.ok) {
                throw new Error(dados.erro || "Não foi possível entrar. Tente novamente.");
            }

            if (lembrar.checked) localStorage.setItem(EMAIL_KEY, emailValor);
            else localStorage.removeItem(EMAIL_KEY);

            // Guarda apenas os dados públicos para personalizar a interface.
            // A senha nunca é armazenada no navegador.
            localStorage.setItem("incomeOfHouses_usuario", JSON.stringify(dados.usuario));
            localStorage.setItem("incomeOfHouses_token", dados.token);

            mostrarMensagem("Login validado com sucesso! Redirecionando...", true);

            // Pequena pausa para a pessoa conseguir ver o card de sucesso
            setTimeout(() => {
                window.location.href = "../index.html";
            }, 900);
        } catch (erro) {
            // TypeError = fetch falhou (servidor fora do ar)
            if (erro instanceof TypeError) {
                mostrarMensagem("Não foi possível conectar ao servidor. Confira se o Back-End está rodando.");
            } else {
                mostrarMensagem(erro.message);
            }
        } finally {
            if (botao) {
                botao.disabled = false;
                botao.textContent = "Entrar";
            }
        }
    });

    botoesSociais.forEach(botao => {
        botao.addEventListener("click", () => {
            mostrarMensagem("O login social ainda não está configurado.");
        });
    });
});