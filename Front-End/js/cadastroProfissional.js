document.addEventListener("DOMContentLoaded", () => {

    const formulario = document.querySelector(".FormCadastro");

    if (!formulario) {
        console.error("Formulário de cadastro profissional não encontrado.");
        return;
    }

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

    /*
     * =====================================================
     * FUNÇÕES AUXILIARES
     * =====================================================
     */

    function mostrarErro(campo, mensagem) {

        removerErro(campo);

        campo.classList.add("campo-invalido");

        const erro = document.createElement("small");

        erro.className = "erro-cadastro-profissional";
        erro.textContent = mensagem;

        campo.insertAdjacentElement("afterend", erro);
    }


    function removerErro(campo) {

        campo.classList.remove("campo-invalido");

        const erroExistente =
            campo.parentElement.querySelector(
                ".erro-cadastro-profissional"
            );

        if (erroExistente) {
            erroExistente.remove();
        }
    }


    function limparErros() {

        document
            .querySelectorAll(".erro-cadastro-profissional")
            .forEach(erro => erro.remove());

        document
            .querySelectorAll(".campo-invalido")
            .forEach(campo => {
                campo.classList.remove("campo-invalido");
            });

    }


    function mostrarSucesso(mensagem) {

        const mensagemExistente =
            document.querySelector(".sucesso-cadastro-profissional");

        if (mensagemExistente) {
            mensagemExistente.remove();
        }

        const sucesso = document.createElement("div");

        sucesso.className = "sucesso-cadastro-profissional";
        sucesso.textContent = mensagem;

        formulario.prepend(sucesso);
    }


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

        const arquivo = documentos.files[0];

        nomeArquivo.textContent = arquivo.name;

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

        let formularioValido = true;

        /*
         * NOME
         */

        const nomeValor = nome.value.trim();

        if (nomeValor.length < 3) {

            mostrarErro(
                nome,
                "Informe seu nome completo."
            );

            formularioValido = false;
        }


        /*
         * REGISTRO PROFISSIONAL
         */

        const registroValor = registro.value.trim();

        if (registroValor.length < 2) {

            mostrarErro(
                registro,
                "Informe seu registro profissional."
            );

            formularioValido = false;
        }


        /*
         * E-MAIL
         */

        const emailValor = email.value.trim();

        if (!emailValido(emailValor)) {

            mostrarErro(
                email,
                "Informe um e-mail válido."
            );

            formularioValido = false;
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

            mostrarErro(
                telefone,
                "Informe um telefone válido."
            );

            formularioValido = false;
        }


        /*
         * CPF
         */

        const cpfValor = cpf.value.trim();

        if (!cpfValido(cpfValor)) {

            mostrarErro(
                cpf,
                "Informe um CPF válido."
            );

            formularioValido = false;
        }


        /*
         * DATA DE NASCIMENTO
         */

        if (!dataValida(dataNascimento.value)) {

            mostrarErro(
                dataNascimento,
                "Informe uma data de nascimento válida."
            );

            formularioValido = false;
        }


        /*
         * CIDADE
         */

        if (cidade.value.trim().length < 2) {

            mostrarErro(
                cidade,
                "Informe sua cidade."
            );

            formularioValido = false;
        }


        /*
         * ESTADO
         */

        if (!estado.value) {

            mostrarErro(
                estado,
                "Selecione seu estado."
            );

            formularioValido = false;
        }


        /*
         * PROFISSÃO
         */

        if (!profissao.value) {

            mostrarErro(
                profissao,
                "Selecione sua profissão."
            );

            formularioValido = false;
        }


        /*
         * SENHA
         */

        if (senha.value.length < 6) {

            mostrarErro(
                senha,
                "A senha deve possuir pelo menos 6 caracteres."
            );

            formularioValido = false;
        }


        /*
         * CONFIRMAÇÃO DA SENHA
         */

        if (senha.value !== confirmarSenha.value) {

            mostrarErro(
                confirmarSenha,
                "As senhas não coincidem."
            );

            formularioValido = false;
        }


        /*
         * DOCUMENTO
         */

        if (documentos.files.length === 0) {

            mostrarErro(
                documentos,
                "Selecione um documento."
            );

            formularioValido = false;
        }


        /*
         * SE EXISTIR ALGUM ERRO
         */

        if (!formularioValido) {
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


        mostrarSucesso(
            "Cadastro profissional validado com sucesso!"
        );


        formulario.reset();

        nomeArquivo.textContent =
            "Nenhum arquivo escolhido";

    });

});