/* =========================================================
   TUTORIAIS - JS da página
   - Cards de destaque e lista por categoria (gerados pelos DADOS abaixo)
   - Vídeos abrem em um player (YouTube ou arquivo .mp4/.webm)
   - Busca de tutoriais
   - Clique nas categorias filtra os tutoriais
   - Botão "Fale Conosco" leva para a página de contato
========================================================= */

(function () {
    "use strict";

    /* =====================================================
       CONFIGURAÇÕES (edite aqui)
    ===================================================== */

    // Página do Fale Conosco (caminho a partir deste HTML)
    const PAGINA_FALE_CONOSCO = "FaleConosco.html";

    // Pasta dos vídeos do projeto (caminho a partir deste HTML).
    // Nos tutoriais basta escrever o nome do arquivo: video: "plataforma.mp4"
    const PASTA_VIDEOS = "../../videos/";

    // Categorias, NA MESMA ORDEM em que aparecem no HTML.
    const CATEGORIAS = [
        { id: "primeiros",  nome: "Primeiros Passos" },
        { id: "plantas",    nome: "Plantas" },
        { id: "pedidos",    nome: "Pedidos" },
        { id: "profissionais", nome: "Profissionais" },
        { id: "config",     nome: "Configurações" },
        { id: "avancados",  nome: "Recursos Avançados" }
    ];

    /* =====================================================
       TUTORIAIS (adicione os seus vídeos aqui)

       categoria : id de uma das categorias acima
       titulo / descricao / duracao : textos do card
       destaque  : true = aparece em "Tutoriais em Destaque"
       video     : link do vídeo. Aceita:
                   - YouTube:  "https://www.youtube.com/watch?v=XXXX"
                               "https://youtu.be/XXXX"
                   - Arquivo do projeto: "plataforma.mp4" (fica em PASTA_VIDEOS)
                   - Deixe "" para mostrar "Vídeo em breve".
       capa      : (opcional) imagem da miniatura, ex: "../../img/capas/plataforma.jpg"
    ===================================================== */
    const TUTORIAIS = [
        // ---- Primeiros Passos (5)
        { categoria: "primeiros", destaque: true, titulo: "Conhecendo a Plataforma", descricao: "Veja como navegar pelo sistema e entender o layout principal.", duracao: "4:32", video: "" },
        { categoria: "primeiros", titulo: "Criando sua Conta", descricao: "Cadastre-se e confirme seu e-mail em poucos passos.", duracao: "3:10", video: "" },
        { categoria: "primeiros", titulo: "Navegando pelo Menu", descricao: "Conheça cada opção do menu lateral e o que ela faz.", duracao: "2:50", video: "" },
        { categoria: "primeiros", titulo: "Entendendo o Painel Principal", descricao: "Saiba onde encontrar cada informação da sua conta.", duracao: "3:20", video: "" },
        { categoria: "primeiros", titulo: "Alterando o Idioma", descricao: "Troque o idioma do site de forma rápida.", duracao: "1:55", video: "" },

        // ---- Plantas (6)
        { categoria: "plantas", destaque: true, titulo: "Como Buscar Plantas", descricao: "Aprenda a encontrar e filtrar plantas de acordo com suas necessidades.", duracao: "3:45", video: "" },
        { categoria: "plantas", titulo: "Usando os Filtros", descricao: "Filtre por quartos, garagem, área e estilo.", duracao: "4:05", video: "" },
        { categoria: "plantas", titulo: "Visualizando Detalhes de uma Planta", descricao: "Veja fotos, ambientes e informações completas.", duracao: "3:30", video: "" },
        { categoria: "plantas", titulo: "Salvando Projetos Favoritos", descricao: "Guarde plantas para consultar depois.", duracao: "2:40", video: "" },
        { categoria: "plantas", titulo: "Baixando uma Planta", descricao: "Como acessar e baixar os arquivos adquiridos.", duracao: "3:15", video: "" },
        { categoria: "plantas", titulo: "Publicando uma Planta", descricao: "Passo a passo para publicar seu projeto na plataforma.", duracao: "5:10", video: "" },

        // ---- Pedidos (4)
        { categoria: "pedidos", destaque: true, titulo: "Como Fazer um Pedido", descricao: "Passo a passo para solicitar um projeto ou serviço de um profissional.", duracao: "5:20", video: "" },
        { categoria: "pedidos", titulo: "Acompanhando seu Pedido", descricao: "Veja o andamento e o histórico das suas solicitações.", duracao: "3:50", video: "" },
        { categoria: "pedidos", titulo: "Formas de Pagamento", descricao: "Conheça as opções de pagamento disponíveis.", duracao: "3:05", video: "" },
        { categoria: "pedidos", titulo: "Cancelando ou Alterando um Pedido", descricao: "Saiba como cancelar ou alterar uma solicitação.", duracao: "2:45", video: "" },

        // ---- Profissionais (4)
        { categoria: "profissionais", titulo: "Encontrando um Profissional", descricao: "Use os filtros para achar o profissional ideal.", duracao: "4:00", video: "" },
        { categoria: "profissionais", titulo: "Favoritando Profissionais", descricao: "Salve profissionais para contatar depois.", duracao: "2:30", video: "" },
        { categoria: "profissionais", titulo: "Enviando Mensagens", descricao: "Converse diretamente com o profissional.", duracao: "3:10", video: "" },
        { categoria: "profissionais", titulo: "Avaliando um Profissional", descricao: "Deixe sua nota e comentário após o atendimento.", duracao: "2:55", video: "" },

        // ---- Configurações (5)
        { categoria: "config", destaque: true, titulo: "Configurando sua Conta", descricao: "Personalize suas preferências, dados pessoais e permissões de acesso.", duracao: "4:18", video: "" },
        { categoria: "config", titulo: "Alterando Dados do Perfil", descricao: "Atualize nome, e-mail e informações pessoais.", duracao: "3:00", video: "" },
        { categoria: "config", titulo: "Gerenciando Endereços", descricao: "Adicione, edite e remova seus endereços.", duracao: "3:25", video: "" },
        { categoria: "config", titulo: "Permissões e Privacidade", descricao: "Controle quem pode ver suas informações.", duracao: "4:10", video: "" },
        { categoria: "config", titulo: "Notificações", descricao: "Escolha como e quando quer ser avisado.", duracao: "2:35", video: "" },

        // ---- Recursos Avançados (3)
        { categoria: "avancados", titulo: "Agendando Atendimentos", descricao: "Marque e gerencie horários com profissionais.", duracao: "4:40", video: "" },
        { categoria: "avancados", titulo: "Organizando Projetos Salvos", descricao: "Mantenha seus projetos favoritos organizados.", duracao: "3:55", video: "" },
        { categoria: "avancados", titulo: "Atalhos e Dicas Avançadas", descricao: "Truques para usar a plataforma mais rápido.", duracao: "3:30", video: "" }
    ];

    /* =====================================================
       ELEMENTOS
    ===================================================== */
    const secDestaques = document.querySelector(".Destaques");
    const gridCards = secDestaques && secDestaques.querySelector(".cards");
    const tituloSecao = secDestaques && secDestaques.querySelector(".TituloDestaques h2");
    const linkSecao = secDestaques && secDestaques.querySelector(".TituloDestaques a");
    const campoBusca = document.querySelector(".pesquisa-topo input");
    const itensCategoria = document.querySelectorAll(".categoria-item");
    const botaoAjuda = document.querySelector(".ajuda-corpo button");

    if (!gridCards || !tituloSecao) {
        console.warn("[Tutoriais] Estrutura do HTML não encontrada (.Destaques .cards).");
        return;
    }

    // Guarda os textos originais do título (para voltar ao normal)
    const TITULO_PADRAO = tituloSecao.textContent;
    const LINK_VER_TODOS = linkSecao ? linkSecao.textContent : "Ver todos →";

    // Estado: "destaques" | "todos" | "categoria" | "busca"
    let modo = "destaques";
    let categoriaAtual = null;

    /* =====================================================
       UTILIDADES
    ===================================================== */
    function escapar(t) {
        const d = document.createElement("div");
        d.textContent = t;
        return d.innerHTML;
    }

    function normalizar(t) {
        return String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }

    function nomeCategoria(id) {
        const c = CATEGORIAS.find(function (x) { return x.id === id; });
        return c ? c.nome : "";
    }

    // Descobre se o link é YouTube, arquivo de vídeo ou outro embed
    function lerVideo(url) {
        if (!url) return null;
        url = String(url).trim();

        const yt = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
        if (yt) {
            return {
                tipo: "youtube",
                id: yt[1],
                embed: "https://www.youtube.com/embed/" + yt[1] + "?autoplay=1&rel=0",
                capa: "https://img.youtube.com/vi/" + yt[1] + "/hqdefault.jpg"
            };
        }
        if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) {
            // Se for só o nome do arquivo, procura dentro de PASTA_VIDEOS
            const completo = /^(https?:)?\/\/|^\.{1,2}\/|^\//.test(url);
            return { tipo: "arquivo", src: completo ? url : PASTA_VIDEOS + url };
        }
        return { tipo: "embed", embed: url };
    }

    /* =====================================================
       CARDS
    ===================================================== */
    function htmlCard(t, indice) {
        const v = lerVideo(t.video);
        const capa = t.capa || (v && v.capa) || "";
        const estiloCapa = capa ? ' style="background-image:url(\'' + escapar(capa) + '\')"' : "";
        return (
            '<article class="tutorial-card" data-indice="' + indice + '">' +
                '<div class="thumb"' + estiloCapa + '><span class="play">▶</span></div>' +
                '<div class="tutorial-info">' +
                    '<span class="categoria">' + escapar(nomeCategoria(t.categoria)) + "</span>" +
                    "<h3>" + escapar(t.titulo) + "</h3>" +
                    "<p>" + escapar(t.descricao) + "</p>" +
                    '<div class="card-footer"><span>◷ ' + escapar(t.duracao) + "</span>" +
                    '<button type="button">Assistir</button></div>' +
                "</div>" +
            "</article>"
        );
    }

    function mostrarLista(lista, titulo, textoLink) {
        tituloSecao.textContent = titulo;

        if (linkSecao) {
            linkSecao.textContent = textoLink;
        }

        if (!lista.length) {
            gridCards.innerHTML = '<div class="sem-resultados">Nenhum tutorial encontrado.</div>';
            return;
        }

        gridCards.innerHTML = lista.map(function (t) {
            return htmlCard(t, TUTORIAIS.indexOf(t));
        }).join("");
    }

    function mostrarDestaques() {
        modo = "destaques";
        categoriaAtual = null;
        marcarCategoria(null);
        mostrarLista(
            TUTORIAIS.filter(function (t) { return t.destaque; }),
            TITULO_PADRAO,
            LINK_VER_TODOS
        );
    }

    function mostrarTodos() {
        modo = "todos";
        categoriaAtual = null;
        marcarCategoria(null);
        mostrarLista(TUTORIAIS, "Todos os Tutoriais", "← Voltar aos destaques");
    }

    function mostrarCategoria(id) {
        modo = "categoria";
        categoriaAtual = id;
        marcarCategoria(id);
        mostrarLista(
            TUTORIAIS.filter(function (t) { return t.categoria === id; }),
            "Tutoriais: " + nomeCategoria(id),
            "← Voltar aos destaques"
        );
    }

    function mostrarBusca(termo) {
        modo = "busca";
        marcarCategoria(null);
        const q = normalizar(termo.trim());
        const lista = TUTORIAIS.filter(function (t) {
            return normalizar(t.titulo + " " + t.descricao + " " + nomeCategoria(t.categoria)).includes(q);
        });
        mostrarLista(
            lista,
            "Resultados da busca (" + lista.length + ")",
            "← Voltar aos destaques"
        );
    }

    /* =====================================================
       CATEGORIAS (lista da direita)
    ===================================================== */
    function idDoItem(el, i) {
        return el.dataset.categoria || (CATEGORIAS[i] && CATEGORIAS[i].id);
    }

    function marcarCategoria(id) {
        itensCategoria.forEach(function (el, i) {
            el.classList.toggle("ativa", id !== null && idDoItem(el, i) === id);
        });
    }

    // Atualiza "N tutoriais" automaticamente
    itensCategoria.forEach(function (el, i) {
        const id = idDoItem(el, i);
        const total = TUTORIAIS.filter(function (t) { return t.categoria === id; }).length;
        const small = el.querySelector("small");
        if (small) small.textContent = total + (total === 1 ? " tutorial" : " tutoriais");

        el.addEventListener("click", function (e) {
            e.preventDefault();
            if (campoBusca) campoBusca.value = "";
            mostrarCategoria(id);
            secDestaques.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });

    /* =====================================================
       LINK "Ver todos →" / "← Voltar aos destaques"
    ===================================================== */
    if (linkSecao) {
        linkSecao.addEventListener("click", function (e) {
            e.preventDefault();
            if (campoBusca) campoBusca.value = "";
            if (modo === "destaques") mostrarTodos();
            else mostrarDestaques();
        });
    }

    /* =====================================================
       BUSCA
    ===================================================== */
    if (campoBusca) {
        campoBusca.addEventListener("input", function () {
            if (campoBusca.value.trim() === "") mostrarDestaques();
            else mostrarBusca(campoBusca.value);
        });
    }

    /* =====================================================
       PLAYER DE VÍDEO (janela)
    ===================================================== */
    const modal = document.createElement("div");
    modal.className = "video-modal";
    modal.hidden = true;
    modal.innerHTML =
        '<div class="video-caixa" role="dialog" aria-modal="true">' +
            '<div class="video-topo">' +
                "<h3></h3>" +
                '<button type="button" class="video-fechar" aria-label="Fechar">✕</button>' +
            "</div>" +
            '<div class="video-corpo"></div>' +
        "</div>";
    document.body.appendChild(modal);

    const modalTitulo = modal.querySelector("h3");
    const modalCorpo = modal.querySelector(".video-corpo");

    function abrirVideo(t) {
        const v = lerVideo(t.video);
        modalTitulo.textContent = t.titulo;

        if (!v) {
            modalCorpo.innerHTML = '<div class="video-aviso">🎬 Vídeo em breve.</div>';
        } else if (v.tipo === "arquivo") {
            modalCorpo.innerHTML = '<video controls autoplay playsinline src="' + escapar(v.src) + '"></video>';
        } else {
            modalCorpo.innerHTML =
                '<iframe src="' + escapar(v.embed) + '" title="' + escapar(t.titulo) + '" ' +
                'allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
        }

        modal.hidden = false;
        document.body.style.overflow = "hidden";
    }

    function fecharVideo() {
        modal.hidden = true;
        modalCorpo.innerHTML = ""; // para o vídeo
        document.body.style.overflow = "";
    }

    modal.addEventListener("click", function (e) {
        if (e.target === modal || e.target.closest(".video-fechar")) fecharVideo();
    });

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !modal.hidden) fecharVideo();
    });

    // Clique em qualquer card (miniatura, título ou botão "Assistir")
    gridCards.addEventListener("click", function (e) {
        const card = e.target.closest(".tutorial-card");
        if (!card) return;
        const t = TUTORIAIS[Number(card.dataset.indice)];
        if (t) abrirVideo(t);
    });

    /* =====================================================
       BOTÃO "Fale Conosco"
    ===================================================== */
    if (botaoAjuda) {
        botaoAjuda.addEventListener("click", function () {
            window.location.href = PAGINA_FALE_CONOSCO;
        });
    }

    /* =====================================================
       INÍCIO
    ===================================================== */
    mostrarDestaques();
    console.log("[Tutoriais] Script carregado.");
})();