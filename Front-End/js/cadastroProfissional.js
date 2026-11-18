document.addEventListener("DOMContentLoaded", () => {

    const formulario = document.querySelector(".FormCadastro");

    if (!formulario) {
        console.error("Formulário de cadastro profissional não encontrado.");
        return;
    }

    // Desliga o balão do navegador para usar o card vermelho
    formulario.noValidate = true;

    const nome = document.getElementById("nome");
    const registro = document.getElementById("RP");
    const email = document.getElementById("email");
    const telefone = document.getElementById("telefone");
    const cpf = document.getElementById("CPF");
    const dataNascimento = document.getElementById("DN");
    const cidade = document.getElementById("Cidade");
    const estado = document.getElementById("SEstado");
    const profissao = document.getElementById("profissao");
    const senha = document.getElementById("Senha");
    const confirmarSenha = document.getElementById("CSenha");
    const documentos = document.getElementById("documentos");
    const nomeArquivo = document.getElementById("NomeArquivo");

    const botao =
        formulario.querySelector('button[type="submit"]') ||
        formulario.querySelector("button");

    const todosCampos = [
        nome, registro, email, telefone, cpf, dataNascimento,
        cidade, estado, profissao, senha, confirmarSenha, documentos
    ];

    /*
     * =====================================================
     * MENSAGEM ÚNICA (CARD LOGO ABAIXO DO BOTÃO)
     * =====================================================
     */

    function removerMensagem() {

        formulario
            .querySelectorAll(".mensagem-cadastro-profissional")
            .forEach(card => card.remove());

    }


    function mostrarMensagem(texto, sucesso = false) {

        removerMensagem();

        const card = document.createElement("div");

        card.className =
            "mensagem-cadastro-profissional card-mensagem " +
            (sucesso ? "card-sucesso" : "card-erro");

        card.setAttribute("role", sucesso ? "status" : "alert");
        card.textContent = texto;

        if (botao) {
            botao.insertAdjacentElement("afterend", card);
        } else {
            formulario.appendChild(card);
        }
    }


    // O input de arquivo fica escondido, então o destaque vai na caixa dele
    function alvoDoCampo(campo) {
        return campo.type === "file"
            ? campo.closest(".ArquivoBox") || campo
            : campo;
    }


    function marcarInvalido(campo) {
        alvoDoCampo(campo).classList.add("campo-invalido");
    }


    function limparErros() {

        removerMensagem();

        formulario
            .querySelectorAll(".campo-invalido")
            .forEach(campo => campo.classList.remove("campo-invalido"));

    }


    // Quando a pessoa corrige um campo, o destaque some;
    // se não sobrou nenhum campo com erro, o card também some
    todosCampos.forEach(campo => {

        const evento =
            campo.tagName === "SELECT" || campo.type === "file"
                ? "change"
                : "input";

        campo.addEventListener(evento, () => {

            alvoDoCampo(campo).classList.remove("campo-invalido");

            if (
                !formulario.querySelector(".campo-invalido") &&
                formulario.querySelector(".mensagem-cadastro-profissional.card-erro")
            ) {
                removerMensagem();
            }

        });

    });


    /*
     * =====================================================
     * VALIDAÇÃO DE E-MAIL
     * =====================================================
     */

    function emailValido(valor) {

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);

    }


    /*
     * =====================================================
     * VALIDAÇÃO DE CPF
     * =====================================================
     */

    function cpfValido(valor) {

        const numero = valor.replace(/\D/g, "");

        if (numero.length !== 11) {
            return false;
        }

        if (/^(\d)\1+$/.test(numero)) {
            return false;
        }

        let soma = 0;

        for (let i = 0; i < 9; i++) {
            soma += Number(numero.charAt(i)) * (10 - i);
        }

        let resto = (soma * 10) % 11;

        if (resto === 10) {
            resto = 0;
        }

        if (resto !== Number(numero.charAt(9))) {
            return false;
        }

        soma = 0;

        for (let i = 0; i < 10; i++) {
            soma += Number(numero.charAt(i)) * (11 - i);
        }

        resto = (soma * 10) % 11;

        if (resto === 10) {
            resto = 0;
        }

        return resto === Number(numero.charAt(10));
    }


    /*
     * =====================================================
     * MÁSCARA DE CPF
     * =====================================================
     */

    cpf.addEventListener("input", () => {

        let valor = cpf.value.replace(/\D/g, "");

        valor = valor.substring(0, 11);

        valor = valor.replace(
            /(\d{3})(\d)/,
            "$1.$2"
        );

        valor = valor.replace(
            /(\d{3})(\d)/,
            "$1.$2"
        );

        valor = valor.replace(
            /(\d{3})(\d{1,2})$/,
            "$1-$2"
        );

        cpf.value = valor;

    });


    /*
     * =====================================================
     * MÁSCARA DE TELEFONE
     * =====================================================
     */

    telefone.addEventListener("input", () => {

        let valor = telefone.value.replace(/\D/g, "");

        valor = valor.substring(0, 11);

        if (valor.length <= 10) {

            valor = valor.replace(
                /^(\d{2})(\d)/,
                "($1) $2"
            );

            valor = valor.replace(
                /(\d{4})(\d)/,
                "$1-$2"
            );

        } else {

            valor = valor.replace(
                /^(\d{2})(\d)/,
                "($1) $2"
            );

            valor = valor.replace(
                /(\d{5})(\d)/,
                "$1-$2"
            );

        }

        telefone.value = valor;

    });


    /*
     * =====================================================
     * MOSTRAR NOME DO ARQUIVO
     * =====================================================
     */

    documentos.addEventListener("change", () => {

        if (documentos.files.length === 0) {

            nomeArquivo.textContent =
                "Nenhum arquivo escolhido";

            return;
        }

        nomeArquivo.textContent = documentos.files[0].name;

    });


    /*
     * =====================================================
     * VALIDAÇÃO DA DATA DE NASCIMENTO
     * =====================================================
     */

    function dataValida(data) {

        if (!data) {
            return false;
        }

        const dataSelecionada = new Date(data + "T00:00:00");
        const hoje = new Date();

        hoje.setHours(0, 0, 0, 0);

        return dataSelecionada <= hoje;

    }


    /*
     * =====================================================
     * ENVIO DO FORMULÁRIO
     * =====================================================
     */

    formulario.addEventListener("submit", (evento) => {

        evento.preventDefault();

        limparErros();

        const erros = [];

        function falhar(campo, mensagem) {

            marcarInvalido(campo);

            erros.push({ campo, mensagem });
        }

        /*
         * NOME
         */

        const nomeValor = nome.value.trim();

        if (nomeValor.length < 3) {
            falhar(nome, "Informe seu nome completo.");
        }


        /*
         * REGISTRO PROFISSIONAL
         */

        const registroValor = registro.value.trim();

        if (registroValor.length < 2) {
            falhar(registro, "Informe seu registro profissional.");
        }


        /*
         * E-MAIL
         */

        const emailValor = email.value.trim();

        if (!emailValido(emailValor)) {
            falhar(email, "Informe um e-mail válido.");
        }


        /*
         * TELEFONE
         */

        const telefoneValor =
            telefone.value.replace(/\D/g, "");

        if (
            telefoneValor.length !== 10 &&
            telefoneValor.length !== 11
        ) {
            falhar(telefone, "Informe um telefone válido.");
        }


        /*
         * CPF
         */

        const cpfValor = cpf.value.trim();

        if (!cpfValido(cpfValor)) {
            falhar(cpf, "Informe um CPF válido.");
        }


        /*
         * DATA DE NASCIMENTO
         */

        if (!dataValida(dataNascimento.value)) {
            falhar(
                dataNascimento,
                "Informe uma data de nascimento válida."
            );
        }


        /*
         * CIDADE
         */

        if (cidade.value.trim().length < 2) {
            falhar(cidade, "Informe sua cidade.");
        }


        /*
         * ESTADO
         */

        if (!estado.value) {
            falhar(estado, "Selecione seu estado.");
        }


        /*
         * PROFISSÃO
         */

        if (!profissao.value) {
            falhar(profissao, "Selecione sua profissão.");
        }


        /*
         * SENHA
         */

        if (senha.value.length < 6) {
            falhar(
                senha,
                "A senha deve possuir pelo menos 6 caracteres."
            );
        }


        /*
         * CONFIRMAÇÃO DA SENHA
         */

        if (senha.value !== confirmarSenha.value) {
            falhar(confirmarSenha, "As senhas não coincidem.");
        }


        /*
         * DOCUMENTO
         */

        if (documentos.files.length === 0) {
            falhar(documentos, "Selecione um documento.");
        }


        /*
         * SE EXISTIR ALGUM ERRO
         * Mostra o primeiro problema no card abaixo do botão;
         * os campos com erro ficam com a borda vermelha.
         */

        if (erros.length > 0) {

            let texto = erros[0].mensagem;

            if (erros.length > 1) {

                const restantes = erros.length - 1;

                texto += restantes === 1
                    ? " Mais 1 campo precisa de correção."
                    : ` Mais ${restantes} campos precisam de correção.`;
            }

            mostrarMensagem(texto);

            // Foco sem rolar a tela, para o card continuar visível
            if (erros[0].campo.type !== "file") {
                erros[0].campo.focus({ preventScroll: true });
            }

            return;
        }


        /*
         * DADOS DO CADASTRO
         *
         * Por enquanto os dados são preparados apenas
         * no Front-End porque o server.js do projeto
         * ainda não possui uma rota de cadastro.
         */

        const dadosProfissional = {

            nome: nomeValor,

            registroProfissional:
                registroValor,

            email:
                emailValor,

            telefone:
                telefoneValor,

            cpf:
                cpfValor.replace(/\D/g, ""),

            dataNascimento:
                dataNascimento.value,

            cidade:
                cidade.value.trim(),

            estado:
                estado.value,

            profissao:
                profissao.value,

            senha:
                senha.value,

            documento:
                documentos.files[0].name

        };


        console.log(
            "Dados do cadastro profissional:",
            {
                ...dadosProfissional,
                senha: "[OCULTA]"
            }
        );


        formulario.reset();

        nomeArquivo.textContent =
            "Nenhum arquivo escolhido";

        mostrarMensagem(
            "Cadastro profissional validado com sucesso!",
            true
        );

    });

});