document.addEventListener("DOMContentLoaded", () => {
    // ============================================================
    // ELEMENTOS DA PÁGINA
    // ============================================================

    const nomeUsuario = document.querySelector(".dados-usuario h2");
    const emailUsuario = document.querySelector(".dados-usuario > p");

    const informacoes = document.querySelectorAll(".card-informacoes .item");

    const botaoEditar = document.querySelector(".editar-perfil");

    if (!nomeUsuario || !emailUsuario) {
        console.error("Elementos do perfil do usuário não foram encontrados.");
        return;
    }

    // ============================================================
    // RECUPERAR USUÁRIO LOGADO
    // ============================================================

    function obterUsuarioLogado() {
        const chavesPossiveis = [
            "usuarioLogado",
            "usuario",
            "user",
            "usuarioAtual"
        ];

        for (const chave of chavesPossiveis) {
            const dados = localStorage.getItem(chave);

            if (!dados) {
                continue;
            }

            try {
                const usuario = JSON.parse(dados);

                if (usuario && typeof usuario === "object") {
                    return usuario;
                }
            } catch (erro) {
                console.warn(`Não foi possível ler o usuário salvo em "${chave}".`);
            }
        }

        return null;
    }

    const usuario = obterUsuarioLogado();

    // ============================================================
    // SE NÃO EXISTIR USUÁRIO LOGADO
    // ============================================================

    if (!usuario) {
        nomeUsuario.textContent = "Usuário não identificado";
        emailUsuario.textContent = "Faça login para acessar seu perfil.";

        if (botaoEditar) {
            botaoEditar.disabled = true;
        }

        mostrarAvisoLogin();

        return;
    }

    // ============================================================
    // PREENCHER DADOS DO USUÁRIO
    // ============================================================

    const nome = usuario.nome || "Usuário";
    const email = usuario.email || "E-mail não informado";

    nomeUsuario.textContent = nome;
    emailUsuario.textContent = email;

    preencherInformacoesPessoais(nome, email);

    preencherDataMembro(usuario);

    // ============================================================
    // INFORMAÇÕES PESSOAIS
    // ============================================================

    function preencherInformacoesPessoais(nomeCompleto, email) {
        informacoes.forEach((item) => {
            const titulo = item.querySelector(".item-text span");
            const valor = item.querySelector(".item-text strong");

            if (!titulo || !valor) {
                return;
            }

            const textoTitulo = titulo.textContent.trim().toLowerCase();

            if (textoTitulo === "nome completo") {
                valor.textContent = nomeCompleto;
            }

            if (textoTitulo === "e-mail") {
                valor.textContent = email;
            }

            /*
             * CPF, telefone, data de nascimento e senha
             * não são alterados aqui porque essas informações
             * não existem atualmente na tabela tb_usuarios.
             */
        });
    }

    // ============================================================
    // DATA DE MEMBRO
    // ============================================================

    function preencherDataMembro(usuario) {
        const elementoMembro = document.querySelector(".membro-desde p");

        if (!elementoMembro) {
            return;
        }

        /*
         * Se futuramente o backend retornar enviado_em,
         * utilizaremos essa data.
         */

        if (usuario.enviado_em) {
            const data = new Date(usuario.enviado_em);

            if (!Number.isNaN(data.getTime())) {
                const dataFormatada = data.toLocaleDateString("pt-BR", {
                    month: "long",
                    year: "numeric"
                });

                elementoMembro.textContent =
                    `Membro desde: ${capitalizarPrimeiraLetra(dataFormatada)}`;

                return;
            }
        }

        // Caso a informação ainda não esteja disponível
        elementoMembro.textContent = "Membro desde: Data não informada";
    }

    // ============================================================
    // CAPITALIZAR PRIMEIRA LETRA
    // ============================================================

    function capitalizarPrimeiraLetra(texto) {
        if (!texto) {
            return texto;
        }

        return texto.charAt(0).toUpperCase() + texto.slice(1);
    }

    // ============================================================
    // BOTÃO EDITAR PERFIL
    // ============================================================

    if (botaoEditar) {
        botaoEditar.addEventListener("click", () => {
            ativarEdicaoPerfil();
        });
    }

    function ativarEdicaoPerfil() {
        const nomeAtual = nomeUsuario.textContent;
        const emailAtual = emailUsuario.textContent;

        const novoNome = prompt(
            "Digite seu novo nome:",
            nomeAtual
        );

        if (novoNome === null) {
            return;
        }

        const nomeFormatado = novoNome.trim();

        if (nomeFormatado.length < 2) {
            alert("O nome deve possuir pelo menos 2 caracteres.");
            return;
        }

        if (nomeFormatado.length > 150) {
            alert("O nome deve possuir no máximo 150 caracteres.");
            return;
        }

        const novoEmail = prompt(
            "Digite seu novo e-mail:",
            emailAtual
        );

        if (novoEmail === null) {
            return;
        }

        const emailFormatado = novoEmail.trim().toLowerCase();

        if (!validarEmail(emailFormatado)) {
            alert("Informe um e-mail válido.");
            return;
        }

        /*
         * Atualiza a informação exibida na página.
         */
        nomeUsuario.textContent = nomeFormatado;
        emailUsuario.textContent = emailFormatado;

        preencherInformacoesPessoais(
            nomeFormatado,
            emailFormatado
        );

        /*
         * Atualiza os dados armazenados localmente.
         *
         * IMPORTANTE:
         * Isso não altera o MySQL.
         * A atualização definitiva no banco será feita quando
         * criarmos a rota de edição de usuário no Back-End.
         */
        const usuarioAtualizado = {
            ...usuario,
            nome: nomeFormatado,
            email: emailFormatado
        };

        localStorage.setItem(
            "usuarioLogado",
            JSON.stringify(usuarioAtualizado)
        );

        mostrarMensagem(
            "Perfil atualizado nesta sessão."
        );
    }

    // ============================================================
    // VALIDAR E-MAIL
    // ============================================================

    function validarEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // ============================================================
    // MENSAGEM DE AVISO DE LOGIN
    // ============================================================

    function mostrarAvisoLogin() {
        const conteudo = document.querySelector(".conteudo");

        if (!conteudo) {
            return;
        }

        const aviso = document.createElement("div");

        aviso.className = "aviso-login";

        aviso.innerHTML = `
            <p>Você precisa estar logado para visualizar seus dados.</p>
            <a href="../pages/login.html">Ir para o login</a>
        `;

        conteudo.prepend(aviso);
    }

    // ============================================================
    // MENSAGEM DE SUCESSO
    // ============================================================

    function mostrarMensagem(texto) {
        let mensagem = document.querySelector(".mensagem-perfil");

        if (!mensagem) {
            mensagem = document.createElement("div");
            mensagem.className = "mensagem-perfil";

            const conteudo = document.querySelector(".conteudo");

            if (conteudo) {
                conteudo.prepend(mensagem);
            }
        }

        mensagem.textContent = texto;

        setTimeout(() => {
            mensagem.remove();
        }, 4000);
    }

    // ============================================================
    // SAIR DA CONTA
    // ============================================================

    const links = document.querySelectorAll(".menu-lateral a");

    links.forEach((link) => {
        const texto = link.textContent.trim().toLowerCase();

        if (texto === "sair") {
            link.addEventListener("click", (event) => {
                event.preventDefault();

                const confirmar = confirm(
                    "Deseja realmente sair da sua conta?"
                );

                if (!confirmar) {
                    return;
                }

                /*
                 * Remove os dados da sessão local.
                 */
                localStorage.removeItem("usuarioLogado");
                localStorage.removeItem("usuario");
                localStorage.removeItem("user");
                localStorage.removeItem("usuarioAtual");

                /*
                 * Volta para a página inicial.
                 */
                window.location.href = "../index.html";
            });
        }
    });

    // ============================================================
    // ATUALIZAÇÃO DO CONTADOR DE ATIVIDADES
    // ============================================================

    /*
     * Os cards abaixo ainda possuem valores estáticos no HTML:
     *
     * Projetos Salvos
     * Profissionais Favoritos
     * Pedidos Realizados
     *
     * Eles serão ligados às respectivas funcionalidades quando
     * essas páginas e estruturas forem implementadas.
     */

    console.log("perfilUsuario.js carregado com sucesso.");
});