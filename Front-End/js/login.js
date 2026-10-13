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

    const EMAIL_KEY = "incomeOfHouses_email";

    function mostrarMensagem(mensagem, sucesso = false) {
        let caixa = form.querySelector(".mensagem-login");
        if (!caixa) {
            caixa = document.createElement("div");
            caixa.className = "mensagem-login";
            caixa.setAttribute("role", "status");
            form.appendChild(caixa);
        }
        caixa.textContent = mensagem;
        caixa.style.cssText = `margin-top:15px;padding:12px;border-radius:8px;font-size:14px;line-height:1.4;background:${sucesso ? "#e8f5e9" : "#fdecea"};color:${sucesso ? "#2e7d32" : "#b42318"};`;
    }

    function limparMensagem() {
        form.querySelector(".mensagem-login")?.remove();
    }

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
            mostrarMensagem("Digite um e-mail válido.");
            return;
        }
        if (!senhaValor) {
            mostrarMensagem("Digite sua senha.");
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
            window.location.href = "../index.html";
        } catch (erro) {
            mostrarMensagem(erro.message || "Não foi possível conectar ao servidor. Confira se o Back-End está rodando.");
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
