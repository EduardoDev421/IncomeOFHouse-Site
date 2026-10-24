/* plantas.js
   Carregue PlantasStorage.js e Favoritos.js ANTES deste arquivo. */

const ListaPlantas = document.getElementById("ListaPlantas");
const mensagem = document.getElementById("mensagemPlantas");
const paginacao = document.getElementById("paginacao");
const btnPesquisar = document.getElementById("btnPesquisar");

const filtrotipo = document.getElementById("filtrotipo");
const filtroquartos = document.getElementById("filtroquartos");
const filtrogaragem = document.getElementById("filtrogaragem");
const filtroarea = document.getElementById("filtroarea");
const filtroestilo = document.getElementById("filtroestilo");

let plantas = [];
let plantasFiltradas = [];
let paginaAtual = 1;

const PLANTAS_POR_PAGINA = 6;

// Permite filtros como 3 ou 5+.
function correspondeNumero(valor, filtro) {
    if (!filtro) return true;

    const numero = Number(valor);

    if (filtro.endsWith("+")) {
        return numero >= Number(filtro.slice(0, -1));
    }

    return numero === Number(filtro);
}

// Permite faixas como 60-100 ou 500-.
function correspondeFaixa(valor, filtro) {
    if (!filtro) return true;

    const partes = filtro.split("-");
    const minimo = Number(partes[0]);
    const maximo = partes[1] === ""
        ? Infinity
        : Number(partes[1]);

    const numero = Number(valor);

    return numero >= minimo && numero < maximo;
}

// Busca as plantas no servidor.
async function buscarPlantas() {
    if (!ListaPlantas || !mensagem || !paginacao) {
        console.error(
            "Verifique os IDs ListaPlantas, mensagemPlantas e paginacao no HTML."
        );
        return;
    }

    if (!window.PlantasStorage) {
        mensagem.textContent =
            "O serviço de plantas não foi carregado.";
        console.error("PlantasStorage.js não foi carregado.");
        return;
    }

    mensagem.textContent = "Carregando plantas...";
    ListaPlantas.replaceChildren();
    paginacao.replaceChildren();

    try {
        plantas = await window.PlantasStorage.getPlantas();

        aplicarFiltros();

    } catch (erro) {
        console.error("Erro ao buscar plantas:", erro);

        mensagem.textContent =
            "Não foi possível carregar as plantas. " +
            erro.message;

        ListaPlantas.replaceChildren();
        paginacao.replaceChildren();
    }
}

// Aplica os filtros selecionados.
function aplicarFiltros() {
    const tipo = filtrotipo?.value || "";
    const quartos = filtroquartos?.value || "";
    const garagem = filtrogaragem?.value || "";
    const area = filtroarea?.value || "";
    const estilo = filtroestilo?.value || "";

    plantasFiltradas = plantas.filter(function (planta) {
        return (
            (!tipo || planta.categoria === tipo) &&
            correspondeNumero(planta.quartos, quartos) &&
            correspondeNumero(planta.garagem, garagem) &&
            correspondeFaixa(planta.area, area) &&
            (!estilo || planta.estilo === estilo)
        );
    });

    paginaAtual = 1;

    if (mensagem) {
        mensagem.textContent = plantasFiltradas.length
            ? `${plantasFiltradas.length} planta(s) encontrada(s).`
            : "Nenhuma planta encontrada. Verifique os filtros.";
    }

    renderizar();
}

// Cria os cards das plantas.
function mostrarPlantas() {
    if (!ListaPlantas) return;

    ListaPlantas.replaceChildren();

    if (plantasFiltradas.length === 0) {
        const vazio = document.createElement("div");
        vazio.className = "NenhumaPlanta";

        const titulo = document.createElement("h3");
        titulo.textContent = "Nenhuma planta encontrada.";

        const texto = document.createElement("p");
        texto.textContent =
            "Verifique os filtros aplicados ou tente novamente.";

        vazio.append(titulo, texto);
        ListaPlantas.appendChild(vazio);

        return;
    }

    const inicio = (paginaAtual - 1) * PLANTAS_POR_PAGINA;

    const plantasDaPagina = plantasFiltradas.slice(
        inicio,
        inicio + PLANTAS_POR_PAGINA
    );

    plantasDaPagina.forEach(function (planta) {
        const card = document.createElement("article");
        card.className = "CardPlanta";

        const areaImagem = document.createElement("div");
        areaImagem.className = "CardPlantaImagem";

        const imagem = document.createElement("img");
        imagem.src = planta.imagem || "";
        imagem.alt = planta.titulo || "Planta";
        imagem.loading = "lazy";

        imagem.addEventListener("error", function () {
            imagem.alt = "Imagem indisponível";
            imagem.removeAttribute("src");
        }, { once: true });

        areaImagem.appendChild(imagem);

        const favorito = document.createElement("button");
        favorito.type = "button";
        favorito.className = "CardFavorito";

        function atualizarFavorito() {
            const ativo = window.Favoritos
                ? window.Favoritos.eFavorito(planta.id)
                : false;

            favorito.classList.toggle("ativo", ativo);
            favorito.textContent = ativo ? "♥" : "♡";
            favorito.setAttribute("aria-pressed", String(ativo));
            favorito.setAttribute(
                "aria-label",
                ativo ? "Remover dos favoritos" : "Salvar nos favoritos"
            );
        }

        favorito.addEventListener("click", function () {
            if (!window.Favoritos) return;
            window.Favoritos.alternar(planta.id);
            atualizarFavorito();
        });

        atualizarFavorito();
        areaImagem.appendChild(favorito);

        const conteudo = document.createElement("div");
        conteudo.className = "CardPlantaConteudo";

        const titulo = document.createElement("h3");
        titulo.textContent = planta.titulo || "Planta sem título";

        // Categoria e estilo como etiquetas
        const tags = document.createElement("div");
        tags.className = "CardPlantaTags";

        [planta.categoria, planta.estilo]
            .filter(Boolean)
            .forEach(function (texto) {
                const tag = document.createElement("span");
                tag.className = "CardPlantaTag";
                tag.textContent = texto;
                tags.appendChild(tag);
            });

        // Quartos, banheiros, garagens e área na mesma linha
        const specs = document.createElement("div");
        specs.className = "CardPlantaSpecs";

        [
            `${Number(planta.quartos) || 0} Quartos`,
            `${Number(planta.banheiros) || 0} Banheiros`,
            `${Number(planta.garagem) || 0} Garagens`,
            `${Number(planta.area) || 0} m²`
        ].forEach(function (texto) {
            const item = document.createElement("span");
            item.textContent = texto;
            specs.appendChild(item);
        });

        const preco = document.createElement("strong");
        preco.className = "CardPlantaPreco";
        preco.textContent = Number(planta.preco || 0).toLocaleString(
            "pt-BR",
            { style: "currency", currency: "BRL" }
        );

        const detalhes = document.createElement("a");
        detalhes.className = "BtnDetalhes";
        detalhes.textContent = "Detalhes";
        detalhes.href =
            `./DetalhesPlanta.html?id=${encodeURIComponent(planta.id)}`;

        conteudo.append(titulo, tags, specs, preco, detalhes);

        card.append(areaImagem, conteudo);
        ListaPlantas.appendChild(card);
    });
}

// Monta os botões da paginação.
function mostrarPaginacao() {
    if (!paginacao) return;

    paginacao.replaceChildren();

    const totalPaginas = Math.ceil(
        plantasFiltradas.length / PLANTAS_POR_PAGINA
    );

    if (totalPaginas <= 1) return;

    function criarBotao(texto, pagina, desabilitado, atual = false) {
        const botao = document.createElement("button");

        botao.type = "button";
        botao.className = "PaginacaoBtn";
        botao.textContent = texto;
        botao.dataset.pagina = pagina;
        botao.disabled = desabilitado;

        if (atual) {
            botao.classList.add("ativo");
            botao.setAttribute("aria-current", "page");
        }

        return botao;
    }

    paginacao.appendChild(
        criarBotao("‹", paginaAtual - 1, paginaAtual === 1)
    );

    for (let i = 1; i <= totalPaginas; i++) {
        paginacao.appendChild(
            criarBotao(String(i), i, false, i === paginaAtual)
        );
    }

    paginacao.appendChild(
        criarBotao(
            "›",
            paginaAtual + 1,
            paginaAtual === totalPaginas
        )
    );
}

// Atualiza os cards e a paginação.
function renderizar() {
    mostrarPlantas();
    mostrarPaginacao();
}

// Evento do botão Pesquisar.
if (btnPesquisar) {
    btnPesquisar.addEventListener("click", aplicarFiltros);
}

// Os filtros também são aplicados assim que o visitante muda uma opção.
[filtrotipo, filtroquartos, filtrogaragem, filtroarea, filtroestilo]
    .forEach(function (filtro) {
        if (filtro) filtro.addEventListener("change", aplicarFiltros);
    });

// Paginação: um único evento para todos os botões.
if (paginacao) {
    paginacao.addEventListener("click", function (event) {
        const botao = event.target.closest("button[data-pagina]");

        if (!botao || botao.disabled) return;

        paginaAtual = Number(botao.dataset.pagina);

        renderizar();

        const topoLista = document.querySelector(".FiltrosCard");

        if (topoLista) {
            topoLista.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });
}

// Inicia a listagem.
buscarPlantas();