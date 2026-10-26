document.addEventListener("DOMContentLoaded", () => {
    // ============================================================
    // ELEMENTOS DA PÁGINA
    // ============================================================

    const camposSenha = document.querySelectorAll(
        '.form-side input[type="password"]'
    );

    const botaoAlterar = document.querySelector(".btn-submit");

    const barraForca = document.querySelector(".strength-bar");
    const segmentosForca = document.querySelectorAll(
        ".strength-bar .seg"
    );

    const textoForca = document.querySelector(".strength-label");

    if (camposSenha.length < 3) {
        console.error(
            "Os campos de senha não foram encontrados corretamente."
        );
        return;
    }

    if (!botaoAlterar) {
        console.error(
            "Botão de alteração de senha não encontrado."
        );
        return;
    }

    // ============================================================
    // CAMPOS
    // ============================================================

    const senhaAtual = camposSenha[0];
    const novaSenha = camposSenha[1];
    const confirmarSenha = camposSenha[2];

    // ============================================================
    // CRIAR ÁREA DE MENSAGEM
    // ============================================================

    let mensagemStatus = document.querySelector(
        ".mensagem-alterar-senha"
    );

    if (!mensagemStatus) {
        mensagemStatus = document.createElement("div");

        mensagemStatus.className =
            "mensagem-alterar-senha";

        const formSide = document.querySelector(".form-side");

        if (formSide) {
            formSide.insertBefore(
                mensagemStatus,
                formSide.firstChild
            );
        }
    }

    // ============================================================
    // EXIBIR MENSAGEM
    // ============================================================

    function mostrarMensagem(texto, tipo) {
        mensagemStatus.textContent = texto;
        mensagemStatus.className =
            `mensagem-alterar-senha ${tipo}`;
    }

    // ============================================================
    // LIMPAR MENSAGEM
    // ============================================================

    function limparMensagem() {
        mensagemStatus.textContent = "";
        mensagemStatus.className =
            "mensagem-alterar-senha";
    }

    // ============================================================
    // CRITÉRIOS DA SENHA
    // ============================================================

    function analisarForcaSenha(senha) {
        let pontos = 0;

        if (senha.length >= 8) {
            pontos++;
        }

        if (/[a-z]/.test(senha)) {
            pontos++;
        }

        if (/[A-Z]/.test(senha)) {
            pontos++;
        }

        if (/[0-9]/.test(senha)) {
            pontos++;
        }

        if (/[^A-Za-z0-9]/.test(senha)) {
            pontos++;
        }

        if (senha.length >= 12) {
            pontos++;
        }

        if (pontos <= 2) {
            return {
                nivel: "fraca",
                quantidade: 1,
                texto: "Força da senha: fraca"
            };
        }

        if (pontos <= 4) {
            return {
                nivel: "media",
                quantidade: 2,
                texto: "Força da senha: média"
            };
        }

        return {
            nivel: "forte",
            quantidade: 3,
            texto: "Força da senha: forte"
        };
    }

    // ============================================================
    // ATUALIZAR INDICADOR DE FORÇA
    // ============================================================

    function atualizarForcaSenha() {
        const senha = novaSenha.value;

        segmentosForca.forEach((segmento) => {
            segmento.classList.remove(
                "forca-fraca",
                "forca-media",
                "forca-forte"
            );
        });

        if (senha.length === 0) {
            if (textoForca) {
                textoForca.textContent =
                    "Força da senha";
            }

            return;
        }

        const resultado =
            analisarForcaSenha(senha);

        for (
            let i = 0;
            i < resultado.quantidade;
            i++
        ) {
            if (!segmentosForca[i]) {
                continue;
            }

            segmentosForca[i].classList.add(
                `forca-${resultado.nivel}`
            );
        }

        if (textoForca) {
            textoForca.textContent =
                resultado.texto;
        }
    }

    novaSenha.addEventListener(
        "input",
        atualizarForcaSenha
    );

    // ============================================================
    // VALIDAR SENHA
    // ============================================================

    function senhaValida(senha) {
        return (
            senha.length >= 8 &&
            /[a-z]/.test(senha) &&
            /[A-Z]/.test(senha) &&
            /[0-9]/.test(senha) &&
            /[^A-Za-z0-9]/.test(senha)
        );
    }

    // ============================================================
    // BOTÕES DE MOSTRAR/OCULTAR SENHA
    // ============================================================

    const olhos = document.querySelectorAll(
        ".eye-ic"
    );

    olhos.forEach((olho, indice) => {

        if (!camposSenha[indice]) {
            return;
        }

        olho.style.cursor = "pointer";

        olho.addEventListener("click", () => {

            const campo =
                camposSenha[indice];

            if (campo.type === "password") {
                campo.type = "text";
                olho.textContent = "🙈";
            } else {
                campo.type = "password";
                olho.textContent = "👁";
            }

        });
    });

    // ============================================================
    // LIMPAR ERROS AO DIGITAR
    // ============================================================

    camposSenha.forEach((campo) => {

        campo.addEventListener(
            "input",
            () => {
                limparMensagem();
            }
        );

    });

    // ============================================================
    // SUBMIT
    // ============================================================

    botaoAlterar.addEventListener(
        "click",
        async (event) => {

            event.preventDefault();

            limparMensagem();

            const senhaAtualValor =
                senhaAtual.value;

            const novaSenhaValor =
                novaSenha.value;

            const confirmarSenhaValor =
                confirmarSenha.value;

            // ----------------------------------------------------
            // SENHA ATUAL
            // ----------------------------------------------------

            if (senhaAtualValor.length === 0) {

                mostrarMensagem(
                    "Digite sua senha atual.",
                    "erro"
                );

                senhaAtual.focus();

                return;
            }

            // ----------------------------------------------------
            // NOVA SENHA
            // ----------------------------------------------------

            if (novaSenhaValor.length === 0) {

                mostrarMensagem(
                    "Digite sua nova senha.",
                    "erro"
                );

                novaSenha.focus();

                return;
            }

            // ----------------------------------------------------
            // TAMANHO
            // ----------------------------------------------------

            if (novaSenhaValor.length < 8) {

                mostrarMensagem(
                    "A nova senha deve possuir pelo menos 8 caracteres.",
                    "erro"
                );

                novaSenha.focus();

                return;
            }

            // ----------------------------------------------------
            // FORÇA
            // ----------------------------------------------------

            if (!senhaValida(novaSenhaValor)) {

                mostrarMensagem(
                    "A nova senha deve conter letras maiúsculas, minúsculas, números e símbolos.",
                    "erro"
                );

                novaSenha.focus();

                return;
            }

            // ----------------------------------------------------
            // CONFIRMAÇÃO
            // ----------------------------------------------------

            if (confirmarSenhaValor.length === 0) {

                mostrarMensagem(
                    "Confirme sua nova senha.",
                    "erro"
                );

                confirmarSenha.focus();

                return;
            }

            // ----------------------------------------------------
            // SENHAS IGUAIS
            // ----------------------------------------------------

            if (
                novaSenhaValor !==
                confirmarSenhaValor
            ) {

                mostrarMensagem(
                    "A confirmação da senha não corresponde à nova senha.",
                    "erro"
                );

                confirmarSenha.focus();

                return;
            }

            // ----------------------------------------------------
            // NOVA SENHA DIFERENTE DA ATUAL
            // ----------------------------------------------------

            if (
                senhaAtualValor ===
                novaSenhaValor
            ) {

                mostrarMensagem(
                    "A nova senha deve ser diferente da senha atual.",
                    "erro"
                );

                novaSenha.focus();

                return;
            }

            // ----------------------------------------------------
            // USUÁRIO LOGADO
            // ----------------------------------------------------

            const usuario =
                obterUsuarioLogado();

            if (!usuario) {

                mostrarMensagem(
                    "Não foi possível identificar o usuário. Faça login novamente.",
                    "erro"
                );

                return;
            }

            // ----------------------------------------------------
            // ENVIAR AO SERVIDOR
            // ----------------------------------------------------

            const textoOriginal =
                botaoAlterar.textContent;

            try {

                botaoAlterar.disabled = true;

                botaoAlterar.textContent =
                    "Alterando senha...";

                const resposta =
                    await fetch(
                        "http://localhost:3000/api/usuarios/alterar-senha",
                        {
                            method: "PUT",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                id: usuario.id,
                                senhaAtual:
                                    senhaAtualValor,
                                novaSenha:
                                    novaSenhaValor
                            })
                        }
                    );

                let resultado = {};

                try {
                    resultado =
                        await resposta.json();
                } catch (erro) {
                    resultado = {};
                }

                if (!resposta.ok) {

                    throw new Error(
                        resultado.erro ||
                        "Não foi possível alterar a senha."
                    );
                }

                // ------------------------------------------------
                // SUCESSO
                // ------------------------------------------------

                mostrarMensagem(
                    resultado.mensagem ||
                    "Senha alterada com sucesso!",
                    "sucesso"
                );

                senhaAtual.value = "";
                novaSenha.value = "";
                confirmarSenha.value = "";

                atualizarForcaSenha();

            } catch (erro) {

                console.error(
                    "Erro ao alterar senha:",
                    erro
                );

                if (
                    erro instanceof TypeError
                ) {

                    mostrarMensagem(
                        "Não foi possível conectar ao servidor. Verifique se o Back-End está funcionando.",
                        "erro"
                    );

                } else {

                    mostrarMensagem(
                        erro.message ||
                        "Ocorreu um erro ao alterar a senha.",
                        "erro"
                    );
                }

            } finally {

                botaoAlterar.disabled = false;

                botaoAlterar.textContent =
                    textoOriginal;
            }
        }
    );

    // ============================================================
    // RECUPERAR USUÁRIO LOGADO
    // ============================================================

    function obterUsuarioLogado() {

        const chaves = [
            "usuarioLogado",
            "usuario",
            "user",
            "usuarioAtual"
        ];

        for (const chave of chaves) {

            const dados =
                localStorage.getItem(chave);

            if (!dados) {
                continue;
            }

            try {

                const usuario =
                    JSON.parse(dados);

                if (
                    usuario &&
                    typeof usuario === "object" &&
                    usuario.id
                ) {
                    return usuario;
                }

            } catch (erro) {

                console.warn(
                    `Não foi possível ler "${chave}".`
                );

            }
        }

        return null;
    }

    // ============================================================
    // BOTÃO SAIR
    // ============================================================

    const linksMenu =
        document.querySelectorAll(
            ".sidebar a"
        );

    linksMenu.forEach((link) => {

        const texto =
            link.textContent
                .trim()
                .toLowerCase();

        if (texto === "sair") {

            link.addEventListener(
                "click",
                (event) => {

                    event.preventDefault();

                    const confirmar =
                        confirm(
                            "Deseja realmente sair da sua conta?"
                        );

                    if (!confirmar) {
                        return;
                    }

                    localStorage.removeItem(
                        "usuarioLogado"
                    );

                    localStorage.removeItem(
                        "usuario"
                    );

                    localStorage.removeItem(
                        "user"
                    );

                    localStorage.removeItem(
                        "usuarioAtual"
                    );

                    window.location.href =
                        "../login.html";
                }
            );
        }
    });

    // ============================================================
    // INICIALIZAÇÃO
    // ============================================================

    atualizarForcaSenha();

    console.log(
        "alterarSenha.js carregado com sucesso."
    );
});