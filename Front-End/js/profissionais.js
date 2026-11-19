document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("CardsProfissionais");
    const mensagem = document.getElementById("mensagemProfissionais");
    const paginacao = document.getElementById("paginacaoProfissionais");
    const filtroProfissao = document.getElementById("profissao");
    const filtroEstado = document.getElementById("estado");
    const filtroExperiencia = document.getElementById("experiencia");
    const filtroAvaliacao = document.getElementById("avaliacao");
    const botaoPesquisar = document.getElementById("btnPesquisar");

    const API_BASE = window.location.port === "3000" ? "" : "http://localhost:3000";
    const API_PROFISSIONAIS = `${API_BASE}/profissionais`;
    const POR_PAGINA = 6;
    let profissionais = [];
    let filtrados = [];
    let paginaAtual = 1;

    function mostrarMensagem(texto) {
        if (mensagem) mensagem.textContent = texto;
    }

    function criarTexto(tag, classe, texto) {
        const elemento = document.createElement(tag);
        if (classe) elemento.className = classe;
        elemento.textContent = texto;
        return elemento;
    }

    function renderizarCards() {
        container.replaceChildren();
        if (!filtrados.length) {
            const vazio = document.createElement("div");
            vazio.className = "NenhumProfissional";
            vazio.append(
                criarTexto("h3", "", "Nenhum profissional encontrado."),
                criarTexto("p", "", "Tente alterar os filtros ou cadastre um profissional.")
            );
            container.appendChild(vazio);
            return;
        }

        const inicio = (paginaAtual - 1) * POR_PAGINA;
        filtrados.slice(inicio, inicio + POR_PAGINA).forEach(profissional => {
            const card = document.createElement("article");
            card.className = "CardProfissional";

            const areaImagem = document.createElement("div");
            areaImagem.className = "ProfissionalImg";
            const avatar = criarTexto("div", "ProfissionalSemFoto", "👤");
            avatar.setAttribute("aria-label", "Foto não cadastrada");
            areaImagem.appendChild(avatar);

            const conteudo = document.createElement("div");
            conteudo.className = "CardProfissionalConteudo";
            conteudo.appendChild(criarTexto("h3", "", profissional.nome || "Profissional"));
            const specs = document.createElement("div");
            specs.className = "CardProfissionalSpecs";
            [
                profissional.profissao,
                [profissional.cidade, profissional.estado].filter(Boolean).join(" - "),
                profissional.registroProfissional ? `Registro: ${profissional.registroProfissional}` : ""
            ].filter(Boolean).forEach(texto => specs.appendChild(criarTexto("span", "", texto)));
            conteudo.appendChild(specs);

            const detalhes = document.createElement("a");
            detalhes.className = "BtnDetalhes";
            detalhes.textContent = "Detalhes";
            detalhes.href = `./DetalhesProfissional.html?id=${encodeURIComponent(profissional.id)}`;
            conteudo.appendChild(detalhes);

            card.append(areaImagem, conteudo);
            container.appendChild(card);
        });
    }

    function renderizarPaginacao() {
        paginacao.replaceChildren();
        const total = Math.ceil(filtrados.length / POR_PAGINA);
        if (total <= 1) return;

        function botao(texto, destino, desabilitado, ativo = false) {
            const el = document.createElement("button");
            el.type = "button";
            el.className = "PaginacaoBtn" + (ativo ? " ativo" : "");
            el.textContent = texto;
            el.disabled = desabilitado;
            el.addEventListener("click", () => {
                paginaAtual = destino;
                renderizarCards();
                renderizarPaginacao();
                container.scrollIntoView({ behavior: "smooth", block: "start" });
            });
            return el;
        }

        paginacao.appendChild(botao("‹", paginaAtual - 1, paginaAtual === 1));
        for (let i = 1; i <= total; i++) {
            paginacao.appendChild(botao(String(i), i, false, i === paginaAtual));
        }
        paginacao.appendChild(botao("›", paginaAtual + 1, paginaAtual === total));
    }

    function aplicarFiltros() {
        const profissao = filtroProfissao?.value || "";
        const estado = filtroEstado?.value || "";
        const experiencia = filtroExperiencia?.value || "";
        // A experiência e as avaliações não fazem parte dos dados coletados no cadastro atual.
        filtrados = profissionais.filter(p =>
            (!profissao || p.profissao === profissao) &&
            (!estado || p.estado === estado) &&
            !experiencia &&
            !(filtroAvaliacao?.value)
        );
        paginaAtual = 1;
        mostrarMensagem(`${filtrados.length} profissional(is) encontrado(s).`);
        renderizarCards();
        renderizarPaginacao();
    }

    async function carregarProfissionais() {
        container.replaceChildren();
        mostrarMensagem("Carregando profissionais...");
        try {
            const resposta = await fetch(API_PROFISSIONAIS);
            const dados = await resposta.json().catch(() => []);
            if (!resposta.ok) throw new Error(dados.erro || `Erro HTTP ${resposta.status}`);
            if (!Array.isArray(dados)) throw new Error("A API não retornou uma lista válida.");
            profissionais = dados;
            aplicarFiltros();
        } catch (erro) {
            console.error("Erro ao carregar profissionais:", erro);
            mostrarMensagem("Não foi possível carregar os profissionais. Verifique se o servidor está rodando.");
            container.replaceChildren();
        }
    }

    [filtroProfissao, filtroEstado, filtroExperiencia, filtroAvaliacao].forEach(filtro => {
        if (filtro) filtro.addEventListener("change", aplicarFiltros);
    });
    if (botaoPesquisar) botaoPesquisar.addEventListener("click", aplicarFiltros);

    carregarProfissionais();
});
