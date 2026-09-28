document.addEventListener("DOMContentLoaded", () => {

    // ============================================================
    // ELEMENTOS
    // ============================================================

    const conteudo = document.querySelector(".conteudo");

    if (!conteudo) {
        console.error("Área de conteúdo da empresa não encontrada.");
        return;
    }

    const cards = conteudo.querySelectorAll(".card");

    if (cards.length < 4) {
        console.error("Estrutura dos cards da empresa não encontrada.");
        return;
    }

    // ============================================================
    // CARD - INFORMAÇÕES BÁSICAS
    // ============================================================

    const cardInformacoes = cards[0];

    const inputsInformacoes =
        cardInformacoes.querySelectorAll("input");

    const selectTipoEmpresa =
        cardInformacoes.querySelector("select");

    const nomeEmpresa =
        inputsInformacoes[0];

    const cnpj =
        inputsInformacoes[1];

    const telefone =
        inputsInformacoes[2];

    const emailCorporativo =
        inputsInformacoes[3];

    // ============================================================
    // CARD - ENDEREÇO
    // ============================================================

    const cardEndereco = cards[1];

    const inputsEndereco =
        cardEndereco.querySelectorAll("input");

    const selectsEndereco =
        cardEndereco.querySelectorAll("select");

    const cep =
        inputsEndereco[0];

    const logradouro =
        inputsEndereco[1];

    const numero =
        inputsEndereco[2];

    const complemento =
        inputsEndereco[3];

    const bairro =
        inputsEndereco[4];

    const cidade =
        selectsEndereco[0];

    const estado =
        selectsEndereco[1];

    // ============================================================
    // CARD - SOBRE A EMPRESA
    // ============================================================

    const cardSobre = cards[2];

    const descricaoEmpresa =
        cardSobre.querySelector("textarea");

    const contador =
        cardSobre.querySelector(".contador");

    // ============================================================
    // CARD - IDENTIDADE VISUAL
    // ============================================================

    const cardIdentidade = cards[3];

    const inputsIdentidade =
        cardIdentidade.querySelectorAll("input");

    const site =
        inputsIdentidade[0];

    const redeSocial =
        inputsIdentidade[1];

    const botaoAlterarLogo =
        cardIdentidade.querySelector(
            ".logo-area button"
        );

    const imagemLogo =
        cardIdentidade.querySelector(
            ".logo-area img"
        );

    const inputLogo =
        document.createElement("input");

    inputLogo.type = "file";
    inputLogo.accept =
        "image/png,image/jpeg,image/webp";
    inputLogo.style.display = "none";

    document.body.appendChild(inputLogo);

    // ============================================================
    // BOTÕES
    // ============================================================

    const botaoCancelar =
        document.querySelector(".cancelar");

    const botaoSalvar =
        document.querySelector(".salvar");

    const botaoGerenciarDocumentos =
        document.querySelector(".gerenciar");

    // ============================================================
    // CHAVE DO LOCALSTORAGE
    // ============================================================

    const CHAVE_EMPRESA =
        "dadosEmpresa";

    // ============================================================
    // DADOS INICIAIS
    // ============================================================

    let dadosOriginais = null;

    // ============================================================
    // FORMATAR CNPJ
    // ============================================================

    function formatarCNPJ(valor) {

        valor = valor
            .replace(/\D/g, "")
            .substring(0, 14);

        valor = valor.replace(
            /^(\d{2})(\d)/,
            "$1.$2"
        );

        valor = valor.replace(
            /^(\d{2})\.(\d{3})(\d)/,
            "$1.$2.$3"
        );

        valor = valor.replace(
            /\.(\d{3})(\d)/,
            ".$1/$2"
        );

        valor = valor.replace(
            /(\d{4})(\d)/,
            "$1-$2"
        );

        return valor;
    }

    // ============================================================
    // FORMATAR TELEFONE
    // ============================================================

    function formatarTelefone(valor) {

        valor = valor
            .replace(/\D/g, "")
            .substring(0, 11);

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

        return valor;
    }

    // ============================================================
    // FORMATAR CEP
    // ============================================================

    function formatarCEP(valor) {

        valor = valor
            .replace(/\D/g, "")
            .substring(0, 8);

        valor = valor.replace(
            /^(\d{5})(\d)/,
            "$1-$2"
        );

        return valor;
    }

    // ============================================================
    // EVENTOS DE MÁSCARA
    // ============================================================

    if (cnpj) {
        cnpj.addEventListener("input", () => {
            cnpj.value = formatarCNPJ(cnpj.value);
        });
    }

    if (telefone) {
        telefone.addEventListener("input", () => {
            telefone.value =
                formatarTelefone(telefone.value);
        });
    }

    if (cep) {
        cep.addEventListener("input", () => {
            cep.value =
                formatarCEP(cep.value);
        });
    }

    // ============================================================
    // CONTADOR DA DESCRIÇÃO
    // ============================================================

    function atualizarContador() {

        if (!descricaoEmpresa || !contador) {
            return;
        }

        const quantidade =
            descricaoEmpresa.value.length;

        contador.textContent =
            `${quantidade}/500`;

        if (quantidade > 500) {

            descricaoEmpresa.value =
                descricaoEmpresa.value.substring(
                    0,
                    500
                );

            contador.textContent = "500/500";
        }
    }

    if (descricaoEmpresa) {

        descricaoEmpresa.maxLength = 500;

        descricaoEmpresa.addEventListener(
            "input",
            atualizarContador
        );

        atualizarContador();
    }

    // ============================================================
    // CAPTURAR DADOS DO FORMULÁRIO
    // ============================================================

    function capturarDados() {

        return {

            informacoes: {
                nomeEmpresa:
                    nomeEmpresa?.value.trim() || "",

                cnpj:
                    cnpj?.value.trim() || "",

                tipoEmpresa:
                    selectTipoEmpresa?.value || "",

                telefone:
                    telefone?.value.trim() || "",

                email:
                    emailCorporativo?.value.trim() || ""
            },

            endereco: {
                cep:
                    cep?.value.trim() || "",

                logradouro:
                    logradouro?.value.trim() || "",

                numero:
                    numero?.value.trim() || "",

                complemento:
                    complemento?.value.trim() || "",

                bairro:
                    bairro?.value.trim() || "",

                cidade:
                    cidade?.value || "",

                estado:
                    estado?.value || ""
            },

            sobre:
                descricaoEmpresa?.value.trim() || "",

            identidade: {
                site:
                    site?.value.trim() || "",

                redeSocial:
                    redeSocial?.value.trim() || "",

                logo:
                    imagemLogo?.src || ""
            }
        };
    }

    // ============================================================
    // VALIDAR DADOS
    // ============================================================

    function validarDados(dados) {

        if (!dados.informacoes.nomeEmpresa) {

            alert(
                "Informe o nome da empresa."
            );

            nomeEmpresa.focus();

            return false;
        }

        if (!dados.informacoes.cnpj) {

            alert(
                "Informe o CNPJ da empresa."
            );

            cnpj.focus();

            return false;
        }

        const cnpjNumeros =
            dados.informacoes.cnpj
                .replace(/\D/g, "");

        if (cnpjNumeros.length !== 14) {

            alert(
                "Informe um CNPJ válido."
            );

            cnpj.focus();

            return false;
        }

        if (!dados.informacoes.telefone) {

            alert(
                "Informe o telefone da empresa."
            );

            telefone.focus();

            return false;
        }

        if (!dados.informacoes.email) {

            alert(
                "Informe o e-mail corporativo."
            );

            emailCorporativo.focus();

            return false;
        }

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                dados.informacoes.email
            )
        ) {

            alert(
                "Informe um e-mail corporativo válido."
            );

            emailCorporativo.focus();

            return false;
        }

        if (!dados.endereco.cep) {

            alert(
                "Informe o CEP."
            );

            cep.focus();

            return false;
        }

        if (!dados.endereco.logradouro) {

            alert(
                "Informe o logradouro."
            );

            logradouro.focus();

            return false;
        }

        if (!dados.endereco.numero) {

            alert(
                "Informe o número do endereço."
            );

            numero.focus();

            return false;
        }

        if (!dados.endereco.bairro) {

            alert(
                "Informe o bairro."
            );

            bairro.focus();

            return false;
        }

        if (!dados.sobre) {

            alert(
                "Informe uma descrição sobre a empresa."
            );

            descricaoEmpresa.focus();

            return false;
        }

        return true;
    }

    // ============================================================
    // SALVAR DADOS
    // ============================================================

    function salvarDados() {

        const dados =
            capturarDados();

        if (!validarDados(dados)) {
            return;
        }

        try {

            localStorage.setItem(
                CHAVE_EMPRESA,
                JSON.stringify(dados)
            );

            dadosOriginais =
                JSON.parse(
                    JSON.stringify(dados)
                );

            alert(
                "Dados da empresa salvos com sucesso!"
            );

        } catch (erro) {

            console.error(
                "Erro ao salvar dados:",
                erro
            );

            alert(
                "Não foi possível salvar os dados da empresa."
            );
        }
    }

    // ============================================================
    // CARREGAR DADOS SALVOS
    // ============================================================

    function carregarDados() {

        const dadosSalvos =
            localStorage.getItem(
                CHAVE_EMPRESA
            );

        if (!dadosSalvos) {

            dadosOriginais =
                capturarDados();

            return;
        }

        try {

            const dados =
                JSON.parse(dadosSalvos);

            // ----------------------------------------------------
            // INFORMAÇÕES
            // ----------------------------------------------------

            if (dados.informacoes) {

                if (nomeEmpresa) {
                    nomeEmpresa.value =
                        dados.informacoes.nomeEmpresa || "";
                }

                if (cnpj) {
                    cnpj.value =
                        dados.informacoes.cnpj || "";
                }

                if (selectTipoEmpresa) {
                    selectTipoEmpresa.value =
                        dados.informacoes.tipoEmpresa || "";
                }

                if (telefone) {
                    telefone.value =
                        dados.informacoes.telefone || "";
                }

                if (emailCorporativo) {
                    emailCorporativo.value =
                        dados.informacoes.email || "";
                }
            }

            // ----------------------------------------------------
            // ENDEREÇO
            // ----------------------------------------------------

            if (dados.endereco) {

                if (cep) {
                    cep.value =
                        dados.endereco.cep || "";
                }

                if (logradouro) {
                    logradouro.value =
                        dados.endereco.logradouro || "";
                }

                if (numero) {
                    numero.value =
                        dados.endereco.numero || "";
                }

                if (complemento) {
                    complemento.value =
                        dados.endereco.complemento || "";
                }

                if (bairro) {
                    bairro.value =
                        dados.endereco.bairro || "";
                }

                if (cidade) {
                    cidade.value =
                        dados.endereco.cidade || "";
                }

                if (estado) {
                    estado.value =
                        dados.endereco.estado || "";
                }
            }

            // ----------------------------------------------------
            // SOBRE
            // ----------------------------------------------------

            if (descricaoEmpresa) {

                descricaoEmpresa.value =
                    dados.sobre || "";
            }

            // ----------------------------------------------------
            // IDENTIDADE VISUAL
            // ----------------------------------------------------

            if (dados.identidade) {

                if (site) {
                    site.value =
                        dados.identidade.site || "";
                }

                if (redeSocial) {
                    redeSocial.value =
                        dados.identidade.redeSocial || "";
                }

                if (
                    imagemLogo &&
                    dados.identidade.logo
                ) {

                    imagemLogo.src =
                        dados.identidade.logo;
                }
            }

            atualizarContador();

            dadosOriginais =
                JSON.parse(
                    JSON.stringify(
                        capturarDados()
                    )
                );

        } catch (erro) {

            console.error(
                "Erro ao carregar dados da empresa:",
                erro
            );

            dadosOriginais =
                capturarDados();
        }
    }

    // ============================================================
    // CANCELAR ALTERAÇÕES
    // ============================================================

    function cancelarAlteracoes() {

        if (!dadosOriginais) {
            return;
        }

        const confirmar =
            confirm(
                "Deseja realmente cancelar as alterações?"
            );

        if (!confirmar) {
            return;
        }

        const dados =
            dadosOriginais;

        // --------------------------------------------------------
        // INFORMAÇÕES
        // --------------------------------------------------------

        if (dados.informacoes) {

            if (nomeEmpresa) {
                nomeEmpresa.value =
                    dados.informacoes.nomeEmpresa;
            }

            if (cnpj) {
                cnpj.value =
                    dados.informacoes.cnpj;
            }

            if (selectTipoEmpresa) {
                selectTipoEmpresa.value =
                    dados.informacoes.tipoEmpresa;
            }

            if (telefone) {
                telefone.value =
                    dados.informacoes.telefone;
            }

            if (emailCorporativo) {
                emailCorporativo.value =
                    dados.informacoes.email;
            }
        }

        // --------------------------------------------------------
        // ENDEREÇO
        // --------------------------------------------------------

        if (dados.endereco) {

            if (cep) {
                cep.value =
                    dados.endereco.cep;
            }

            if (logradouro) {
                logradouro.value =
                    dados.endereco.logradouro;
            }

            if (numero) {
                numero.value =
                    dados.endereco.numero;
            }

            if (complemento) {
                complemento.value =
                    dados.endereco.complemento;
            }

            if (bairro) {
                bairro.value =
                    dados.endereco.bairro;
            }

            if (cidade) {
                cidade.value =
                    dados.endereco.cidade;
            }

            if (estado) {
                estado.value =
                    dados.endereco.estado;
            }
        }

        // --------------------------------------------------------
        // SOBRE
        // --------------------------------------------------------

        if (descricaoEmpresa) {
            descricaoEmpresa.value =
                dados.sobre;
        }

        // --------------------------------------------------------
        // IDENTIDADE
        // --------------------------------------------------------

        if (dados.identidade) {

            if (site) {
                site.value =
                    dados.identidade.site;
            }

            if (redeSocial) {
                redeSocial.value =
                    dados.identidade.redeSocial;
            }

            if (
                imagemLogo &&
                dados.identidade.logo
            ) {

                imagemLogo.src =
                    dados.identidade.logo;
            }
        }

        atualizarContador();

        alert(
            "As alterações foram canceladas."
        );
    }

    // ============================================================
    // ALTERAR LOGO
    // ============================================================

    if (botaoAlterarLogo) {

        botaoAlterarLogo.addEventListener(
            "click",
            () => {

                inputLogo.click();
            }
        );
    }

    // ============================================================
    // SELECIONAR NOVA LOGO
    // ============================================================

    inputLogo.addEventListener(
        "change",
        () => {

            const arquivo =
                inputLogo.files[0];

            if (!arquivo) {
                return;
            }

            if (
                !arquivo.type.startsWith("image/")
            ) {

                alert(
                    "Selecione um arquivo de imagem válido."
                );

                inputLogo.value = "";

                return;
            }

            const tamanhoMaximo =
                2 * 1024 * 1024;

            if (arquivo.size > tamanhoMaximo) {

                alert(
                    "A logo deve possuir no máximo 2 MB."
                );

                inputLogo.value = "";

                return;
            }

            const leitor =
                new FileReader();

            leitor.onload = (evento) => {

                if (imagemLogo) {

                    imagemLogo.src =
                        evento.target.result;
                }
            };

            leitor.readAsDataURL(
                arquivo
            );
        }
    );

    // ============================================================
    // GERENCIAR DOCUMENTOS
    // ============================================================

    if (botaoGerenciarDocumentos) {

        botaoGerenciarDocumentos.addEventListener(
            "click",
            () => {

                alert(
                    "A área de gerenciamento de documentos ainda será integrada ao sistema."
                );
            }
        );
    }

    // ============================================================
    // SALVAR
    // ============================================================

    if (botaoSalvar) {

        botaoSalvar.addEventListener(
            "click",
            salvarDados
        );
    }

    // ============================================================
    // CANCELAR
    // ============================================================

    if (botaoCancelar) {

        botaoCancelar.addEventListener(
            "click",
            cancelarAlteracoes
        );
    }

    // ============================================================
    // LOGOUT
    // ============================================================

    const linkSair =
        document.querySelector(
            ".item-menu.sair"
        );

    if (linkSair) {

        linkSair.addEventListener(
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
                    "../../index.html";
            }
        );
    }

    // ============================================================
    // INICIALIZAÇÃO
    // ============================================================

    carregarDados();

    atualizarContador();

    console.log(
        "dadosEmpresa.js carregado com sucesso."
    );
});