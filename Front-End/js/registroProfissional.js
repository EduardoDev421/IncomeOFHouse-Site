document.addEventListener("DOMContentLoaded", () => {

    const CHAVE_REGISTRO = "registroProfissional";

    // ============================================================
    // ELEMENTOS
    // ============================================================

    const cards =
        document.querySelectorAll(".conteudo .card");

    const cardFormulario =
        cards[0];

    const cardProfissional =
        cards[1];

    const cardDocumentos =
        cards[2];

    if (!cardFormulario || !cardProfissional || !cardDocumentos) {
        console.error(
            "Estrutura do RegistroProfissional.html não encontrada."
        );
        return;
    }

    // ============================================================
    // CAMPOS — INFORMAÇÕES PESSOAIS
    // ============================================================

    const camposPessoais =
        cardFormulario.querySelectorAll(
            ".campos > label"
        );

    const nomeInput =
        camposPessoais[0]?.querySelector("input");

    const cpfCnpjInput =
        camposPessoais[1]?.querySelector("input");

    const emailInput =
        camposPessoais[2]?.querySelector("input");

    const telefoneInput =
        camposPessoais[3]?.querySelector("input");

    const nascimentoInput =
        camposPessoais[4]?.querySelector("input");

    const tipoProfissional =
        camposPessoais[5]?.querySelector("select");

    // ============================================================
    // CAMPOS — DADOS PROFISSIONAIS
    // ============================================================

    const camposProfissionais =
        cardProfissional.querySelectorAll(
            ".campos > label"
        );

    const registroInput =
        camposProfissionais[0]?.querySelector("input");

    const estadoRegistro =
        camposProfissionais[1]?.querySelector("select");

    const areaAtuacao =
        camposProfissionais[2]?.querySelector("select");

    const experienciaInput =
        camposProfissionais[3]?.querySelector("input");

    const descricaoTextarea =
        camposProfissionais[4]?.querySelector("textarea");

    // ============================================================
    // DOCUMENTOS
    // ============================================================

    const arquivosInput =
        document.getElementById("arquivos");

    const botaoEnviar =
        cardDocumentos.querySelector(
            "button"
        );

    // ============================================================
    // CHAVE DO FORMULÁRIO
    // ============================================================

    const camposObrigatorios = [
        nomeInput,
        cpfCnpjInput,
        emailInput,
        telefoneInput,
        nascimentoInput,
        tipoProfissional,
        registroInput,
        estadoRegistro,
        areaAtuacao,
        experienciaInput,
        descricaoTextarea
    ];

    // ============================================================
    // MENSAGEM
    // ============================================================

    function mostrarMensagem(
        texto,
        tipo = "sucesso"
    ) {

        let mensagem =
            document.querySelector(
                ".mensagem-registro"
            );

        if (!mensagem) {

            mensagem =
                document.createElement(
                    "div"
                );

            mensagem.className =
                "mensagem-registro";

            const titulo =
                document.querySelector(
                    ".titulo"
                );

            if (titulo) {

                titulo.insertAdjacentElement(
                    "afterend",
                    mensagem
                );
            }
        }

        mensagem.textContent =
            texto;

        mensagem.className =
            `mensagem-registro ${tipo}`;

        clearTimeout(
            mensagem.timer
        );

        mensagem.timer =
            setTimeout(() => {

                mensagem.textContent =
                    "";

                mensagem.className =
                    "mensagem-registro";

            }, 4000);
    }

    // ============================================================
    // LIMPAR ERROS
    // ============================================================

    function limparErros() {

        document
            .querySelectorAll(
                ".erro-registro"
            )
            .forEach(
                elemento =>
                    elemento.remove()
            );

        camposObrigatorios.forEach(
            campo => {

                if (campo) {

                    campo.style.borderColor =
                        "";
                }
            }
        );
    }

    // ============================================================
    // MOSTRAR ERRO
    // ============================================================

    function mostrarErro(
        campo,
        mensagem
    ) {

        if (!campo) {
            return;
        }

        campo.style.borderColor =
            "#c94a4a";

        const container =
            campo.closest(
                ".input"
            ) ||
            campo.closest(
                ".textarea"
            ) ||
            campo.parentElement;

        if (!container) {
            return;
        }

        const erro =
            document.createElement(
                "small"
            );

        erro.className =
            "erro-registro";

        erro.textContent =
            mensagem;

        container.insertAdjacentElement(
            "afterend",
            erro
        );
    }

    // ============================================================
    // VALIDAÇÃO DE E-MAIL
    // ============================================================

    function emailValido(email) {

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(email);
    }

    // ============================================================
    // MÁSCARA CPF / CNPJ
    // ============================================================

    function aplicarMascaraCpfCnpj(evento) {

        let valor =
            evento.target.value
                .replace(/\D/g, "");

        if (valor.length <= 11) {

            valor =
                valor
                    .replace(
                        /(\d{3})(\d)/,
                        "$1.$2"
                    )
                    .replace(
                        /(\d{3})(\d)/,
                        "$1.$2"
                    )
                    .replace(
                        /(\d{3})(\d{1,2})$/,
                        "$1-$2"
                    );

        } else {

            valor =
                valor
                    .slice(0, 14)
                    .replace(
                        /^(\d{2})(\d)/,
                        "$1.$2"
                    )
                    .replace(
                        /^(\d{2})\.(\d{3})(\d)/,
                        "$1.$2.$3"
                    )
                    .replace(
                        /\.(\d{3})(\d)/,
                        ".$1/$2"
                    )
                    .replace(
                        /(\d{4})(\d{1,2})$/,
                        "$1-$2"
                    );
        }

        evento.target.value =
            valor;
    }

    // ============================================================
    // MÁSCARA TELEFONE
    // ============================================================

    function aplicarMascaraTelefone(evento) {

        let valor =
            evento.target.value
                .replace(/\D/g, "")
                .slice(0, 11);

        if (valor.length <= 10) {

            valor =
                valor
                    .replace(
                        /^(\d{2})(\d)/,
                        "($1) $2"
                    )
                    .replace(
                        /(\d{4})(\d)/,
                        "$1-$2"
                    );

        } else {

            valor =
                valor
                    .replace(
                        /^(\d{2})(\d)/,
                        "($1) $2"
                    )
                    .replace(
                        /(\d{5})(\d)/,
                        "$1-$2"
                    );
        }

        evento.target.value =
            valor;
    }

    // ============================================================
    // MÁSCARA DATA
    // ============================================================

    function aplicarMascaraData(evento) {

        let valor =
            evento.target.value
                .replace(/\D/g, "")
                .slice(0, 8);

        valor =
            valor
                .replace(
                    /(\d{2})(\d)/,
                    "$1/$2"
                )
                .replace(
                    /(\d{2})(\d)/,
                    "$1/$2"
                );

        evento.target.value =
            valor;
    }

    // ============================================================
    // CONTADOR DA DESCRIÇÃO
    // ============================================================

    function atualizarContador() {

        if (!descricaoTextarea) {
            return;
        }

        let contador =
            descricaoTextarea
                .parentElement
                ?.querySelector(
                    "small"
                );

        if (!contador) {
            return;
        }

        contador.textContent =
            `${descricaoTextarea.value.length}/500`;
    }

    // ============================================================
    // VALIDAR DOCUMENTOS
    // ============================================================

    function validarArquivos() {

        if (!arquivosInput) {
            return true;
        }

        const arquivos =
            Array.from(
                arquivosInput.files
            );

        if (arquivos.length === 0) {

            return false;
        }

        const extensoesPermitidas = [
            "application/pdf",
            "image/jpeg",
            "image/png"
        ];

        for (const arquivo of arquivos) {

            if (
                !extensoesPermitidas.includes(
                    arquivo.type
                )
            ) {

                mostrarMensagem(
                    `O arquivo "${arquivo.name}" possui um formato não permitido.`,
                    "erro"
                );

                return false;
            }

            // Limite de 10 MB por arquivo.
            if (
                arquivo.size >
                10 * 1024 * 1024
            ) {

                mostrarMensagem(
                    `O arquivo "${arquivo.name}" ultrapassa o limite de 10 MB.`,
                    "erro"
                );

                return false;
            }
        }

        return true;
    }

    // ============================================================
    // MOSTRAR ARQUIVOS SELECIONADOS
    // ============================================================

    function mostrarArquivosSelecionados() {

        if (!arquivosInput) {
            return;
        }

        const arquivos =
            Array.from(
                arquivosInput.files
            );

        if (arquivos.length === 0) {
            return;
        }

        let lista =
            document.querySelector(
                ".lista-arquivos-registro"
            );

        if (!lista) {

            lista =
                document.createElement(
                    "div"
                );

            lista.className =
                "lista-arquivos-registro";

            arquivosInput
                .closest(".upload")
                ?.appendChild(
                    lista
                );
        }

        lista.innerHTML = "";

        arquivos.forEach(
            arquivo => {

                const item =
                    document.createElement(
                        "div"
                    );

                item.textContent =
                    `📎 ${arquivo.name}`;

                lista.appendChild(
                    item
                );
            }
        );
    }

    // ============================================================
    // SALVAR REGISTRO
    // ============================================================

    function salvarRegistro() {

        const registro = {

            nome:
                nomeInput.value.trim(),

            cpfCnpj:
                cpfCnpjInput.value.trim(),

            email:
                emailInput.value.trim(),

            telefone:
                telefoneInput.value.trim(),

            nascimento:
                nascimentoInput.value.trim(),

            tipoProfissional:
                tipoProfissional.value,

            registroProfissional:
                registroInput.value.trim(),

            estadoRegistro:
                estadoRegistro.value,

            areaAtuacao:
                areaAtuacao.value,

            experiencia:
                experienciaInput.value.trim(),

            descricao:
                descricaoTextarea.value.trim(),

            documentos:
                arquivosInput
                    ? Array.from(
                        arquivosInput.files
                    ).map(
                        arquivo =>
                            ({
                                nome:
                                    arquivo.name,

                                tipo:
                                    arquivo.type,

                                tamanho:
                                    arquivo.size
                            })
                    )
                    : [],

            status:
                "Em análise",

            atualizadoEm:
                new Date().toISOString()
        };

        localStorage.setItem(
            CHAVE_REGISTRO,
            JSON.stringify(
                registro
            )
        );

        return registro;
    }

    // ============================================================
    // CARREGAR REGISTRO SALVO
    // ============================================================

    function carregarRegistro() {

        const dados =
            localStorage.getItem(
                CHAVE_REGISTRO
            );

        if (!dados) {
            return;
        }

        try {

            const registro =
                JSON.parse(dados);

            if (nomeInput)
                nomeInput.value =
                    registro.nome || "";

            if (cpfCnpjInput)
                cpfCnpjInput.value =
                    registro.cpfCnpj || "";

            if (emailInput)
                emailInput.value =
                    registro.email || "";

            if (telefoneInput)
                telefoneInput.value =
                    registro.telefone || "";

            if (nascimentoInput)
                nascimentoInput.value =
                    registro.nascimento || "";

            if (
                tipoProfissional &&
                registro.tipoProfissional
            ) {

                selecionarOpcao(
                    tipoProfissional,
                    registro.tipoProfissional
                );
            }

            if (registroInput)
                registroInput.value =
                    registro.registroProfissional || "";

            if (
                estadoRegistro &&
                registro.estadoRegistro
            ) {

                selecionarOpcao(
                    estadoRegistro,
                    registro.estadoRegistro
                );
            }

            if (
                areaAtuacao &&
                registro.areaAtuacao
            ) {

                selecionarOpcao(
                    areaAtuacao,
                    registro.areaAtuacao
                );
            }

            if (experienciaInput)
                experienciaInput.value =
                    registro.experiencia || "";

            if (descricaoTextarea)
                descricaoTextarea.value =
                    registro.descricao || "";

            atualizarContador();

        } catch (erro) {

            console.error(
                "Erro ao carregar registro profissional:",
                erro
            );
        }
    }

    // ============================================================
    // SELECIONAR OPTION
    // ============================================================

    function selecionarOpcao(
        select,
        valor
    ) {

        const opcao =
            Array.from(
                select.options
            ).find(
                option =>
                    option.textContent.trim() ===
                    valor
            );

        if (opcao) {

            select.value =
                opcao.value;
        }
    }

    // ============================================================
    // VALIDAÇÃO PRINCIPAL
    // ============================================================

    function validarFormulario() {

        limparErros();

        let valido = true;

        // --------------------------------------------------------
        // NOME
        // --------------------------------------------------------

        if (
            !nomeInput ||
            nomeInput.value.trim().length < 3
        ) {

            mostrarErro(
                nomeInput,
                "Informe seu nome completo."
            );

            valido = false;
        }

        // --------------------------------------------------------
        // CPF / CNPJ
        // --------------------------------------------------------

        const documento =
            cpfCnpjInput
                ?.value
                .replace(/\D/g, "");

        if (
            !documento ||
            (documento.length !== 11 &&
             documento.length !== 14)
        ) {

            mostrarErro(
                cpfCnpjInput,
                "Informe um CPF ou CNPJ válido."
            );

            valido = false;
        }

        // --------------------------------------------------------
        // E-MAIL
        // --------------------------------------------------------

        if (
            !emailInput ||
            !emailValido(
                emailInput.value.trim()
            )
        ) {

            mostrarErro(
                emailInput,
                "Informe um e-mail válido."
            );

            valido = false;
        }

        // --------------------------------------------------------
        // TELEFONE
        // --------------------------------------------------------

        const telefone =
            telefoneInput
                ?.value
                .replace(/\D/g, "");

        if (
            !telefone ||
            (telefone.length !== 10 &&
             telefone.length !== 11)
        ) {

            mostrarErro(
                telefoneInput,
                "Informe um telefone válido."
            );

            valido = false;
        }

        // --------------------------------------------------------
        // DATA
        // --------------------------------------------------------

        if (
            !nascimentoInput ||
            nascimentoInput.value.trim().length !== 10
        ) {

            mostrarErro(
                nascimentoInput,
                "Informe a data corretamente."
            );

            valido = false;
        }

        // --------------------------------------------------------
        // SELECTS
        // --------------------------------------------------------

        const selectsObrigatorios = [
            {
                campo: tipoProfissional,
                mensagem:
                    "Selecione o tipo de profissional."
            },
            {
                campo: estadoRegistro,
                mensagem:
                    "Selecione o estado do registro."
            },
            {
                campo: areaAtuacao,
                mensagem:
                    "Selecione a área de atuação."
            }
        ];

        selectsObrigatorios.forEach(
            item => {

                if (
                    !item.campo ||
                    item.campo.selectedIndex === 0
                ) {

                    mostrarErro(
                        item.campo,
                        item.mensagem
                    );

                    valido = false;
                }
            }
        );

        // --------------------------------------------------------
        // REGISTRO
        // --------------------------------------------------------

        if (
            !registroInput ||
            registroInput.value.trim().length < 2
        ) {

            mostrarErro(
                registroInput,
                "Informe seu registro profissional."
            );

            valido = false;
        }

        // --------------------------------------------------------
        // EXPERIÊNCIA
        // --------------------------------------------------------

        const experiencia =
            Number(
                experienciaInput?.value
            );

        if (
            !experienciaInput ||
            experienciaInput.value === "" ||
            experiencia < 0
        ) {

            mostrarErro(
                experienciaInput,
                "Informe o tempo de experiência."
            );

            valido = false;
        }

        // --------------------------------------------------------
        // DESCRIÇÃO
        // --------------------------------------------------------

        if (
            !descricaoTextarea ||
            descricaoTextarea.value.trim().length < 10
        ) {

            mostrarErro(
                descricaoTextarea,
                "Descreva sua experiência profissional."
            );

            valido = false;
        }

        // --------------------------------------------------------
        // DOCUMENTOS
        // --------------------------------------------------------

        if (
            arquivosInput &&
            arquivosInput.files.length === 0
        ) {

            mostrarMensagem(
                "Selecione pelo menos um documento.",
                "erro"
            );

            valido = false;
        }

        return valido;
    }

    // ============================================================
    // ENVIO DO FORMULÁRIO
    // ============================================================

    if (botaoEnviar) {

        botaoEnviar.addEventListener(
            "click",
            evento => {

                evento.preventDefault();

                if (!validarFormulario()) {

                    mostrarMensagem(
                        "Verifique os campos destacados antes de enviar.",
                        "erro"
                    );

                    return;
                }

                if (!validarArquivos()) {
                    return;
                }

                const registro =
                    salvarRegistro();

                console.log(
                    "Registro profissional:",
                    registro
                );

                mostrarMensagem(
                    "Solicitação enviada com sucesso! Seu cadastro está em análise."
                );

                botaoEnviar.disabled =
                    true;

                botaoEnviar.textContent =
                    "✓ Solicitação enviada";

                setTimeout(
                    () => {

                        botaoEnviar.disabled =
                            false;

                    },
                    3000
                );
            }
        );
    }

    // ============================================================
    // EVENTOS DOS CAMPOS
    // ============================================================

    if (cpfCnpjInput) {

        cpfCnpjInput.addEventListener(
            "input",
            aplicarMascaraCpfCnpj
        );
    }

    if (telefoneInput) {

        telefoneInput.addEventListener(
            "input",
            aplicarMascaraTelefone
        );
    }

    if (nascimentoInput) {

        nascimentoInput.addEventListener(
            "input",
            aplicarMascaraData
        );
    }

    if (descricaoTextarea) {

        descricaoTextarea.addEventListener(
            "input",
            atualizarContador
        );
    }

    if (arquivosInput) {

        arquivosInput.addEventListener(
            "change",
            () => {

                mostrarArquivosSelecionados();

                validarArquivos();
            }
        );
    }

    // ============================================================
    // SAIR
    // ============================================================

    const links =
        document.querySelectorAll(
            ".lateral a"
        );

    links.forEach(link => {

        if (
            link.textContent
                .trim()
                .includes("Sair")
        ) {

            link.addEventListener(
                "click",
                evento => {

                    evento.preventDefault();

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
                        "../pages/Login.html";
                }
            );
        }
    });

    // ============================================================
    // INICIALIZAÇÃO
    // ============================================================

    carregarRegistro();

    atualizarContador();

    console.log(
        "registroProfissional.js carregado com sucesso."
    );
});