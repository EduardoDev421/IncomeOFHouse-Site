(async function () {
    const container = document.getElementById("CardsProfissionais");
    const mensagem = document.getElementById("mensagemProfissionais");
    const paginacao = document.getElementById("paginacaoProfissionais");
    const filtroProfissao = document.getElementById("profissao");
    const filtroEstado = document.getElementById("estado");
    const filtroAvaliacao = document.getElementById("avaliacao");
    const botaoPesquisar = document.getElementById("btnPesquisar");

    if (!container || !mensagem || !paginacao) {
        console.error("Verifique os IDs CardsProfissionais, mensagemProfissionais e paginacaoProfissionais no HTML.");
        return;
    }

    const PAGINA_LOGIN = "./Login.html";
    const TABELA_FAVORITOS = "profissionais_favoritos";
    const POR_PAGINA = 6;
    const MAX_TAGS = 3;
    const MAX_SOBRE = 110;

    let supabase;
    try {
        ({ supabase } = await import("./lib/supabaseClient.js"));
    } catch (erro) {
        console.error("Não foi possível importar js/lib/supabaseClient.js:", erro);
        mensagem.textContent = "Não foi possível conectar ao banco de dados. Confira o caminho de js/lib/supabaseClient.js.";
        return;
    }

    let profissionais = [];
    let filtrados = [];
    let paginaAtual = 1;
    let usuarioId = null;
    const favoritos = new Set();
    const notas = new Map();

    const aviso = document.createElement("p");
    aviso.className = "AvisoFavoritoProfissional";
    aviso.setAttribute("role", "alert");
    mensagem.insertAdjacentElement("afterend", aviso);

    const nomesProfissao = new Map(
        [...(filtroProfissao ? filtroProfissao.options : [])]
            .filter((opcao) => opcao.value)
            .map((opcao) => [opcao.value, opcao.textContent.trim()])
    );

    function mostrarMensagem(texto) {
        mensagem.textContent = texto;
    }

    function mostrarAviso(texto) {
        aviso.textContent = texto || "";
    }

    function criar(tag, classe, texto) {
        const elemento = document.createElement(tag);
        if (classe) elemento.className = classe;
        if (texto !== undefined) elemento.textContent = texto;
        return elemento;
    }

    function primeiroValor(linha, chaves) {
        const chave = chaves.find((c) => linha && linha[c] !== undefined && linha[c] !== null && linha[c] !== "");
        return chave ? linha[chave] : "";
    }

    function humanizar(valor) {
        const texto = String(valor).trim();
        if (!texto || /\s/.test(texto) || !/[-_]/.test(texto)) return texto;
        const pequenas = new Set(["de", "da", "do", "e"]);
        return texto
            .split(/[-_]/)
            .map((parte, i) => (i > 0 && pequenas.has(parte) ? parte : parte.charAt(0).toUpperCase() + parte.slice(1)))
            .join(" ");
    }

    function rotuloProfissao(valor) {
        if (!valor) return "";
        return nomesProfissao.get(valor) || humanizar(valor);
    }

    function lista(valor) {
        if (Array.isArray(valor)) {
            return valor
                .filter((item) => typeof item === "string" || typeof item === "number")
                .map((item) => humanizar(item))
                .filter(Boolean);
        }

        if (typeof valor === "string" && valor.trim()) {
            try {
                const convertido = JSON.parse(valor);
                if (Array.isArray(convertido)) return lista(convertido);
            } catch {
            }
            return valor.split(",").map((item) => humanizar(item)).filter(Boolean);
        }

        return [];
    }

    function texto(valor) {
        if (typeof valor === "string") return valor.trim();
        if (typeof valor === "number" && Number.isFinite(valor)) return String(valor);
        return "";
    }

    function formatarOrcamento(valor) {
        let objeto = valor;

        if (typeof objeto === "string" && objeto.trim().startsWith("{")) {
            try {
                objeto = JSON.parse(objeto);
            } catch {
                return "";
            }
        }

        const minimo = Number(objeto && typeof objeto === "object" ? objeto.minimo : NaN);
        if (!Number.isFinite(minimo) || minimo <= 0) return "";

        return `A partir de ${minimo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
    }

    function resumir(valor) {
        const conteudo = texto(valor).replace(/\s+/g, " ");
        if (conteudo.length <= MAX_SOBRE) return conteudo;
        return conteudo.slice(0, MAX_SOBRE).replace(/\s+\S*$/, "") + "…";
    }

    function formatarNota(nota) {
        return nota.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }

    function erroDeTabelaInexistente(erro) {
        const mensagemErro = String(erro?.message || "");
        return erro?.code === "42P01" || erro?.code === "PGRST205" || /does not exist|schema cache/i.test(mensagemErro);
    }

    function mediaDe(id) {
        const dados = notas.get(String(id));
        return dados && dados.total ? dados.soma / dados.total : null;
    }

    function criarEstrelas(media, total) {
        const caixa = criar("div", "CardProfissionalNota");

        if (media === null) {
            caixa.appendChild(criar("small", "", "Sem avaliações"));
            return caixa;
        }

        caixa.appendChild(criar("span", "", "★"));
        caixa.appendChild(criar("strong", "", formatarNota(media)));
        caixa.appendChild(criar("small", "", `(${total} ${total === 1 ? "avaliação" : "avaliações"})`));
        return caixa;
    }

    function criarTags(itens) {
        if (!itens.length) return null;

        const caixa = criar("div", "CardProfissionalTags");
        itens.slice(0, MAX_TAGS).forEach((item) => caixa.appendChild(criar("span", "CardProfissionalTag", item)));

        if (itens.length > MAX_TAGS) {
            caixa.appendChild(criar("span", "CardProfissionalTag", `+${itens.length - MAX_TAGS}`));
        }

        return caixa;
    }

    function criarImagem(profissional) {
        const area = criar("div", "ProfissionalImg");
        const nome = profissional.nome || "Profissional";

        function semFoto() {
            area.classList.add("SemFoto");
            const placeholder = criar("div", "ProfissionalSemFoto", nome.trim().charAt(0).toUpperCase() || "👤");
            placeholder.setAttribute("aria-label", "Foto não cadastrada");
            return placeholder;
        }

        if (profissional.foto_url) {
            const imagem = document.createElement("img");
            imagem.src = profissional.foto_url;
            imagem.alt = `Foto de ${nome}`;
            imagem.loading = "lazy";
            imagem.addEventListener("error", () => {
                const placeholder = semFoto();
                imagem.replaceWith(placeholder);
            }, { once: true });
            area.appendChild(imagem);
        } else {
            area.appendChild(semFoto());
        }

        area.appendChild(criarBotaoFavorito(profissional));
        return area;
    }

    function criarBotaoFavorito(profissional) {
        const botao = criar("button", "CardFavorito");
        botao.type = "button";

        function atualizar() {
            const ativo = favoritos.has(String(profissional.id));
            botao.classList.toggle("ativo", ativo);
            botao.textContent = ativo ? "♥" : "♡";
            botao.setAttribute("aria-pressed", String(ativo));
            botao.setAttribute("aria-label", ativo ? "Remover dos favoritos" : "Salvar nos favoritos");
        }

        botao.addEventListener("click", async () => {
            mostrarAviso("");

            if (!usuarioId) {
                mostrarAviso("Entre na sua conta para salvar profissionais nos favoritos. Redirecionando...");
                setTimeout(() => { window.location.href = PAGINA_LOGIN; }, 1200);
                return;
            }

            botao.disabled = true;
            const chave = String(profissional.id);

            try {
                if (favoritos.has(chave)) {
                    const { error } = await supabase
                        .from(TABELA_FAVORITOS)
                        .delete()
                        .eq("usuario_id", usuarioId)
                        .eq("profissional_id", profissional.id);
                    if (error) throw error;
                    favoritos.delete(chave);
                } else {
                    const { error } = await supabase
                        .from(TABELA_FAVORITOS)
                        .insert({ usuario_id: usuarioId, profissional_id: profissional.id });
                    if (error && error.code !== "23505") throw error;
                    favoritos.add(chave);
                }
            } catch (erro) {
                console.error("Favoritar profissional:", erro);
                mostrarAviso(
                    erroDeTabelaInexistente(erro)
                        ? `A tabela ${TABELA_FAVORITOS} ainda não existe no Supabase. Rode o profissionais_favoritos.sql.`
                        : `Não foi possível atualizar o favorito: ${erro.message || erro}`
                );
            } finally {
                botao.disabled = false;
                atualizar();
            }
        });

        atualizar();
        return botao;
    }

    function criarCard(profissional) {
        const card = criar("article", "CardProfissional");
        const conteudo = criar("div", "CardProfissionalConteudo");

        conteudo.appendChild(criar("h3", "", profissional.nome));

        const dados = notas.get(String(profissional.id));
        conteudo.appendChild(criarEstrelas(mediaDe(profissional.id), dados ? dados.total : 0));

        const specs = criar("div", "CardProfissionalSpecs");
        [
            rotuloProfissao(profissional.profissao),
            [profissional.cidade, profissional.estado].filter(Boolean).join(" - ")
        ]
            .filter(Boolean)
            .forEach((linha) => specs.appendChild(criar("span", "", linha)));
        conteudo.appendChild(specs);

        const sobre = resumir(profissional.sobre || profissional.portfolio?.sobre);
        if (sobre) conteudo.appendChild(criar("p", "CardProfissionalSobre", sobre));

        const etiquetas = [...new Set([...lista(profissional.areas_atuacao), ...lista(profissional.servicos)])];
        const tags = criarTags(etiquetas);
        if (tags) conteudo.appendChild(tags);

        const orcamento = formatarOrcamento(profissional.orcamento);
        if (orcamento) conteudo.appendChild(criar("p", "CardProfissionalOrcamento", orcamento));

        const detalhes = criar("a", "BtnDetalhes", "Detalhes");
        detalhes.href = `./DetalhesProfissional.html?id=${encodeURIComponent(profissional.id)}`;
        conteudo.appendChild(detalhes);

        card.append(criarImagem(profissional), conteudo);
        return card;
    }

    function renderizarCards() {
        container.replaceChildren();

        if (!filtrados.length) {
            const vazio = criar("div", "NenhumProfissional");
            vazio.append(
                criar("h3", "", profissionais.length ? "Nenhum profissional encontrado." : "Ainda não há profissionais cadastrados."),
                criar("p", "", profissionais.length ? "Tente alterar os filtros." : "Volte em breve para conferir os novos profissionais.")
            );
            container.appendChild(vazio);
            return;
        }

        const inicio = (paginaAtual - 1) * POR_PAGINA;
        filtrados.slice(inicio, inicio + POR_PAGINA).forEach((profissional) => {
            container.appendChild(criarCard(profissional));
        });
    }

    function renderizarPaginacao() {
        paginacao.replaceChildren();
        const total = Math.ceil(filtrados.length / POR_PAGINA);
        if (total <= 1) return;

        function botao(rotulo, destino, desabilitado, ativo = false) {
            const el = criar("button", "PaginacaoBtn" + (ativo ? " ativo" : ""), rotulo);
            el.type = "button";
            el.disabled = desabilitado;
            if (ativo) el.setAttribute("aria-current", "page");
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
        const notaMinima = Number(filtroAvaliacao?.value) || 0;

        filtrados = profissionais.filter((p) => {
            if (profissao && p.profissao !== profissao) return false;
            if (estado && p.estado !== estado) return false;
            if (notaMinima) {
                const media = mediaDe(p.id);
                if (media === null || media < notaMinima) return false;
            }
            return true;
        });

        paginaAtual = 1;
        mostrarMensagem(
            profissionais.length
                ? `${filtrados.length} profissional(is) encontrado(s).`
                : "Ainda não há profissionais cadastrados."
        );
        renderizarCards();
        renderizarPaginacao();
    }

    async function carregarNotas() {
        try {
            const { data, error } = await supabase.from("avaliacoes").select("*");
            if (error) throw error;

            (data || []).forEach((linha) => {
                const nota = Number(primeiroValor(linha, ["nota", "estrelas", "avaliacao"]));
                if (!linha.profissional_id || !Number.isFinite(nota) || nota <= 0) return;

                const chave = String(linha.profissional_id);
                const atual = notas.get(chave) || { soma: 0, total: 0 };
                atual.soma += nota;
                atual.total += 1;
                notas.set(chave, atual);
            });
        } catch (erro) {
            console.warn("[Profissionais] avaliações:", erro?.message || erro);
        }
    }

    async function carregarFavoritos() {
        try {
            const { data: sessao } = await supabase.auth.getSession();
            usuarioId = sessao?.session?.user?.id || null;
            if (!usuarioId) return;

            const { data, error } = await supabase
                .from(TABELA_FAVORITOS)
                .select("profissional_id")
                .eq("usuario_id", usuarioId);
            if (error) throw error;

            (data || []).forEach((linha) => favoritos.add(String(linha.profissional_id)));
        } catch (erro) {
            console.warn("[Profissionais] favoritos:", erro?.message || erro);
            if (erroDeTabelaInexistente(erro)) {
                mostrarAviso(`A tabela ${TABELA_FAVORITOS} ainda não existe no Supabase. Rode o profissionais_favoritos.sql.`);
            }
        }
    }

    async function carregarProfissionais() {
        container.replaceChildren();
        paginacao.replaceChildren();
        mostrarMensagem("Carregando profissionais...");

        try {
            const { data, error } = await supabase.from("profissionais").select("*");
            if (error) throw error;

            profissionais = (data || [])
                .filter((p) => p.nome)
                .sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));

            if (!profissionais.length && (data || []).length === 0) {
                console.warn("[Profissionais] A consulta voltou vazia. Se existem profissionais cadastrados, falta uma policy de SELECT em profissionais.");
            }

            await Promise.all([carregarNotas(), carregarFavoritos()]);
            aplicarFiltros();
        } catch (erro) {
            console.error("Erro ao carregar profissionais:", erro);
            mostrarMensagem(`Não foi possível carregar os profissionais. ${erro.message || ""}`.trim());
            container.replaceChildren();
        }
    }

    [filtroProfissao, filtroEstado, filtroAvaliacao].forEach((filtro) => {
        if (filtro) filtro.addEventListener("change", aplicarFiltros);
    });
    if (botaoPesquisar) botaoPesquisar.addEventListener("click", aplicarFiltros);

    carregarProfissionais();
})();