/* =========================================================
   PERGUNTAS FREQUENTES - JS
   - Troca as perguntas ao clicar nas categorias
   - Busca em todas as categorias
   - Botão "Limpar busca"
   - Clique na pergunta abre/fecha a resposta
========================================================= */

(function () {
    "use strict";

    /* ---------- DADOS ---------- */
    // Cada categoria: id, titulo, descricao e lista de perguntas.
    // Para adicionar uma pergunta nova, basta incluir { p: "...", r: "..." }.
    const FAQ = [
        {
            id: "conta",
            titulo: "Conta e Acesso",
            descricao: "Respostas sobre login, cadastro, senha e acesso à plataforma.",
            perguntas: [
                { p: "Como faço para me cadastrar na plataforma?", r: "Clique em \"Cadastre-se\" na página inicial e preencha seus dados. Após a confirmação do e-mail, sua conta estará ativa." },
                { p: "Esqueci minha senha. Como recupero?", r: "Na página de login, clique em \"Esqueceu sua senha?\" e siga as instruções enviadas por e-mail." },
                { p: "Posso ter mais de um dispositivo conectado?", r: "Sim, você pode acessar sua conta em múltiplos dispositivos, mas por segurança recomendamos sair dos dispositivos que não estiver usando." },
                { p: "Como alterar meus dados de perfil?", r: "Acesse a seção \"Meu Perfil\" no menu lateral e clique em \"Editar\" para atualizar suas informações." },
                { p: "Existe um limite de dispositivos conectados?", r: "Não há um limite específico, mas recomendamos manter apenas os dispositivos que você utiliza regularmente." },
                { p: "Minha conta foi bloqueada. O que fazer?", r: "Entre em contato com nosso suporte através da página \"Fale Conosco\" para verificarmos o motivo do bloqueio e orientarmos a liberação." }
            ]
        },
        {
            id: "pagamentos",
            titulo: "Pagamentos",
            descricao: "Respostas sobre valores, formas de pagamento e notas fiscais.",
            perguntas: [
                { p: "Quais formas de pagamento são aceitas?", r: "Aceitamos cartão de crédito, cartão de débito, Pix e boleto bancário. As opções disponíveis aparecem na tela de finalização do pedido." },
                { p: "Posso parcelar minha compra?", r: "Sim. Pagamentos no cartão de crédito podem ser parcelados. O número máximo de parcelas é exibido no momento da compra." },
                { p: "Quando o pagamento via Pix é confirmado?", r: "A confirmação do Pix costuma ser imediata. Caso demore mais do que alguns minutos, entre em contato com o suporte enviando o comprovante." },
                { p: "Como emitir a nota fiscal?", r: "A nota fiscal é enviada para o e-mail cadastrado após a confirmação do pagamento. Você também pode baixá-la em \"Meus Pedidos\"." },
                { p: "Meu pagamento foi recusado. O que fazer?", r: "Verifique os dados do cartão, o limite disponível e se a compra não foi bloqueada pelo seu banco. Se persistir, tente outra forma de pagamento." },
                { p: "É possível solicitar reembolso?", r: "Sim, conforme nossos Termos de Uso. Abra uma solicitação em \"Meus Pedidos\" ou fale com o suporte informando o número do pedido." }
            ]
        },
        {
            id: "projetos",
            titulo: "Projetos e Plantas",
            descricao: "Respostas sobre aquisição, formatos e uso das plantas.",
            perguntas: [
                { p: "Como adquiro uma planta?", r: "Acesse a página \"Plantas\", escolha o projeto desejado e clique em \"Comprar\". Após o pagamento, os arquivos ficam disponíveis em \"Meus Pedidos\"." },
                { p: "Em quais formatos as plantas são entregues?", r: "As plantas são entregues em PDF e, em alguns projetos, também em DWG. Os formatos disponíveis estão descritos na página de cada planta." },
                { p: "Posso salvar plantas para ver depois?", r: "Sim. Clique no ícone de favoritar no projeto e ele ficará salvo na seção \"Projetos Salvos\" do seu perfil." },
                { p: "Posso modificar a planta que comprei?", r: "As plantas podem ser adaptadas por um profissional habilitado. Consulte as condições de uso na página do projeto." },
                { p: "Posso usar a mesma planta em mais de uma obra?", r: "Normalmente a licença é válida para uma única construção. Verifique os detalhes da licença antes da compra." },
                { p: "Por quanto tempo os arquivos ficam disponíveis?", r: "Os arquivos adquiridos permanecem disponíveis na sua conta enquanto ela estiver ativa, e você pode baixá-los novamente quando quiser." }
            ]
        },
        {
            id: "profissionais",
            titulo: "Profissionais",
            descricao: "Respostas sobre contratação e contato com profissionais.",
            perguntas: [
                { p: "Como encontro um profissional?", r: "Acesse a página \"Profissionais\" e use os filtros de especialidade e região para encontrar quem melhor atende o seu projeto." },
                { p: "Como entro em contato com um profissional?", r: "No perfil do profissional, clique em \"Enviar mensagem\" ou \"Agendar\". As conversas ficam salvas em \"Mensagem\"." },
                { p: "Posso favoritar profissionais?", r: "Sim. Clique na estrela no perfil do profissional e ele aparecerá em \"Meus Profissionais Favoritos\"." },
                { p: "A plataforma garante o serviço do profissional?", r: "A plataforma conecta você ao profissional, mas a contratação e a execução do serviço são acordadas diretamente entre as partes." },
                { p: "Como avaliar um profissional?", r: "Após o atendimento, você poderá deixar uma nota e um comentário no perfil do profissional." },
                { p: "Sou profissional. Como faço para me cadastrar?", r: "Entre em contato pela página \"Fale Conosco\" informando sua área de atuação e registro profissional para iniciarmos a análise." }
            ]
        },
        {
            id: "agendamentos",
            titulo: "Agendamentos",
            descricao: "Respostas sobre como agendar e gerenciar seus projetos.",
            perguntas: [
                { p: "Como agendar uma consulta com um profissional?", r: "No perfil do profissional, clique em \"Agendar\", escolha data e horário disponíveis e confirme o agendamento." },
                { p: "Onde vejo meus agendamentos?", r: "Todos os agendamentos ficam na seção \"Agendamentos\" no menu lateral, com status e detalhes de cada um." },
                { p: "Posso reagendar ou cancelar?", r: "Sim. Em \"Agendamentos\", selecione o compromisso e escolha \"Reagendar\" ou \"Cancelar\". Recomendamos fazer isso com antecedência." },
                { p: "Vou receber lembretes do agendamento?", r: "Sim, enviamos lembretes por e-mail antes da data marcada." },
                { p: "O profissional não compareceu. O que fazer?", r: "Entre em contato com o suporte informando o dia, o horário e o nome do profissional para analisarmos o caso." }
            ]
        },
        {
            id: "suporte",
            titulo: "Suporte Técnico",
            descricao: "Respostas sobre problemas técnicos e funcionalidades da plataforma.",
            perguntas: [
                { p: "O site não carrega ou está lento. O que fazer?", r: "Atualize a página, limpe o cache do navegador e verifique sua conexão. Se o problema continuar, tente outro navegador." },
                { p: "Não consigo baixar minha planta.", r: "Verifique se o pagamento foi confirmado em \"Meus Pedidos\". Se estiver confirmado, tente novamente ou use outro navegador." },
                { p: "Não recebi o e-mail de confirmação.", r: "Confira a caixa de spam e lixo eletrônico. Se não encontrar, solicite o reenvio na página de login." },
                { p: "Quais navegadores são compatíveis?", r: "A plataforma funciona nas versões atuais do Chrome, Firefox, Edge e Safari." },
                { p: "Como falar com o suporte?", r: "Acesse a página \"Fale Conosco\" e descreva sua dúvida ou problema. Responderemos pelo e-mail cadastrado." },
                { p: "Encontrei um erro na plataforma. Como reportar?", r: "Use a página \"Fale Conosco\" e informe o que aconteceu, a página onde ocorreu e, se possível, anexe uma captura de tela." }
            ]
        }
    ];

    /* ---------- ELEMENTOS ---------- */
    const listaCategorias = document.querySelectorAll(".categorias .categoria");
    const painel = document.querySelector(".perguntas");
    const campoBusca = document.querySelector(".busca input");
    const botaoLimpar = document.querySelector(".busca button");

    if (!painel || !listaCategorias.length || !campoBusca || !botaoLimpar) {
        console.warn("[FAQ] Elementos não encontrados no HTML (.categoria, .perguntas, .busca input/button).");
        return;
    }

    console.log("[FAQ] Script carregado.");

    // Liga cada link de categoria ao item correspondente do FAQ (pela ordem do HTML)
    // Usa o atributo data-categoria do HTML (se existir); senão, usa a ordem.
    const categorias = Array.from(listaCategorias).map(function (el, i) {
        const achada = FAQ.find(function (f) { return f.id === el.dataset.categoria; });
        return {
            el: el,
            dados: achada || FAQ[i],
            icone: el.querySelector("img") ? el.querySelector("img").getAttribute("src") : ""
        };
    });

    let categoriaAtual = 0;

    /* ---------- UTILIDADES ---------- */
    function escapar(texto) {
        const div = document.createElement("div");
        div.textContent = texto;
        return div.innerHTML;
    }

    // Remove acentos e deixa minúsculo, para a busca ignorar acentuação
    function normalizar(texto) {
        return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }

    const ICONE_PERGUNTA = "../../img/icones/IconePerguntasRespostas.svg";

    function htmlPergunta(item) {
        return (
            '<article class="pergunta">' +
                '<img class="icone" src="' + ICONE_PERGUNTA + '" alt="">' +
                "<div>" +
                    "<strong>" + escapar(item.p) + "</strong>" +
                    "<p>" + escapar(item.r) + "</p>" +
                "</div>" +
                '<span class="seta">></span>' +
            "</article>"
        );
    }

    function htmlTitulo(icone, titulo, descricao) {
        return (
            '<div class="perguntas-titulo">' +
                '<img src="' + icone + '" alt="">' +
                "<div>" +
                    "<h2>" + escapar(titulo) + "</h2>" +
                    "<p>" + escapar(descricao) + "</p>" +
                "</div>" +
            "</div>"
        );
    }

    /* ---------- RENDER ---------- */
    function mostrarCategoria(indice) {
        categoriaAtual = indice;
        const cat = categorias[indice];

        categorias.forEach(function (c, i) {
            c.el.classList.toggle("ativa", i === indice);
        });

        painel.innerHTML =
            htmlTitulo(cat.icone, cat.dados.titulo, cat.dados.descricao) +
            cat.dados.perguntas.map(htmlPergunta).join("");
    }

    function mostrarBusca(termo) {
        const busca = normalizar(termo.trim());
        const resultados = [];

        FAQ.forEach(function (cat) {
            cat.perguntas.forEach(function (item) {
                if (normalizar(item.p).includes(busca) || normalizar(item.r).includes(busca)) {
                    resultados.push(item);
                }
            });
        });

        // Nenhuma categoria fica destacada durante a busca
        categorias.forEach(function (c) { c.el.classList.remove("ativa"); });

        const total = resultados.length;
        const descricao = total === 1 ? "1 resultado encontrado." : total + " resultados encontrados.";
        const iconeBusca = categorias[0].icone;

        let corpo;
        if (total) {
            corpo = resultados.map(htmlPergunta).join("");
        } else {
            corpo = '<div class="sem-resultados">Nenhuma pergunta encontrada para "' +
                escapar(termo.trim()) + '". Tente outra palavra-chave.</div>';
        }

        painel.innerHTML = htmlTitulo(iconeBusca, "Resultados da busca", descricao) + corpo;
    }

    /* ---------- EVENTOS ---------- */
    // Clique nas categorias
    categorias.forEach(function (c, i) {
        c.el.addEventListener("click", function (e) {
            e.preventDefault();
            campoBusca.value = "";
            mostrarCategoria(i);
        });
    });

    // Clique em uma pergunta: abre/fecha a resposta
    painel.addEventListener("click", function (e) {
        const pergunta = e.target.closest(".pergunta");
        if (pergunta) pergunta.classList.toggle("aberta");
    });

    // Digitando na busca
    campoBusca.addEventListener("input", function () {
        if (campoBusca.value.trim() === "") {
            mostrarCategoria(categoriaAtual);
        } else {
            mostrarBusca(campoBusca.value);
        }
    });

    // Botão "Limpar busca"
    botaoLimpar.addEventListener("click", function () {
        campoBusca.value = "";
        mostrarCategoria(categoriaAtual);
        campoBusca.focus();
    });

    /* ---------- INÍCIO ---------- */
    mostrarCategoria(0);
})();