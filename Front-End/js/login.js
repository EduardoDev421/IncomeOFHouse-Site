document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector(".FormLogin");
    const email = document.getElementById("email");
    const senha = document.getElementById("senha");
    const lembrar = document.getElementById("lembrar");
    const botoesSociais = document.querySelectorAll(".BotaoSocial");

    if (!form || !email || !senha || !lembrar) {
        console.error("Formulário de login não encontrado.");
        return;
    }

    const EMAIL_KEY = "incomeOfHouses_email";

    function criarMensagem(campo, mensagem) {
        const antiga = campo.parentElement.querySelector(".erro-login");
        if (antiga) antiga.remove();

        const erro = document.createElement("small");
        erro.className = "erro-login";
        erro.textContent = mensagem;
        erro.style.cssText = `
            display:block;
            margin-top:6px;
            color:#e74c3c;
            font-size:13px;
        `;

        campo.parentElement.appendChild(erro);
        campo.setAttribute("aria-invalid", "true");
    }

    function limparMensagens() {
        form.querySelectorAll(".erro-login").forEach(el => el.remove());
        [email, senha].forEach(campo => campo.removeAttribute("aria-invalid"));
    }

    function emailValido(valor) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
    }

    const emailSalvo = localStorage.getItem(EMAIL_KEY);

    if (emailSalvo) {
        email.value = emailSalvo;
        lembrar.checked = true;
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        limparMensagens();

        const emailValor = email.value.trim();
        const senhaValor = senha.value;

        let valido = true;

        if (!emailValor) {
            criarMensagem(email, "Digite seu e-mail.");
            valido = false;
        } else if (!emailValido(emailValor)) {
            criarMensagem(email, "Digite um e-mail válido.");
            valido = false;
        }

        if (!senhaValor) {
            criarMensagem(senha, "Digite sua senha.");
            valido = false;
        } else if (senhaValor.length < 6) {
            criarMensagem(senha, "A senha deve ter pelo menos 6 caracteres.");
            valido = false;
        }

        if (!valido) return;

        if (lembrar.checked) {
            localStorage.setItem(EMAIL_KEY, emailValor);
        } else {
            localStorage.removeItem(EMAIL_KEY);
        }

        // O projeto ainda não possui uma rota de login no Back-End.
        // Portanto, aqui fazemos somente a validação do formulário.
        mostrarSucesso("Dados válidos! A autenticação com o servidor ainda precisa ser conectada.");
    });

    function mostrarSucesso(mensagem) {
        const antigo = form.querySelector(".sucesso-login");
        if (antigo) antigo.remove();

        const sucesso = document.createElement("div");
        sucesso.className = "sucesso-login";
        sucesso.textContent = mensagem;
        sucesso.style.cssText = `
            margin-top:15px;
            padding:12px;
            border-radius:8px;
            background:#e8f5e9;
            color:#2e7d32;
            font-size:14px;
            line-height:1.4;
        `;

        form.appendChild(sucesso);
    }

    botoesSociais.forEach(botao => {
        botao.addEventListener("click", () => {
            const provedor = botao.textContent.trim();
            mostrarSucesso(`${provedor}: integração ainda não configurada.`);
        });
    });
});
