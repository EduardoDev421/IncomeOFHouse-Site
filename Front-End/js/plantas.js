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


// Protege o HTML contra textos que venham do banco
function escapar(texto) {
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}


// Aceita "3" (igual a) ou "5+" (5 ou mais)
function correspondeNumero(valor, filtro) {
    if (!filtro) {
        return true;
    }

    if (filtro.endsWith("+")) {
        return Number(valor) >= Number(filtro.slice(0, -1));
    }

    return Number(valor) === Number(filtro);
}


// Aceita "60-100" (de 60 até menos de 100) ou "500-" (500 ou mais)
function correspondeFaixa(valor, filtro) {
    if (!filtro) {
        return true;
    }

    const partes = filtro.split("-");
    const minimo = Number(partes[0]);
    const maximo = partes[1] === "" ? Infinity : Number(partes[1]);

    return Number(valor) >= minimo && Number(valor) < maximo;
}


// 1. Buscar as plantas no backend
async function buscarPlantas() {
    try {
        mensagem.textContent = "Carregando plantas...";

        const resposta = await fetch("http://localhost:3000/plantas");

        if (!resposta.ok) {
            throw new Error("Erro ao buscar plantas.");
        }

        plantas = await resposta.json();

        aplicarFiltros();

    } catch (erro) {
        console.error("Erro ao buscar plantas:", erro);

        mensagem.textContent =
            "Não foi possível carregar as plantas. Tente novamente mais tarde.";

        ListaPlantas.innerHTML = "";
        paginacao.innerHTML = "";
    }
}


// 2. Aplicar os filtros
function aplicarFiltros() {
    const tipo = filtrotipo.value;
    const quartos = filtroquartos.value;
    const garagem = filtrogaragem.value;
    const area = filtroarea.value;
    const estilo = filtroestilo.value;

    plantasFiltradas = plantas.filter(function (planta) {
        const correspondeTipo =
            !tipo || planta.categoria === tipo;

        const correspondeQuartos =
            correspondeNumero(planta.quartos, quartos);

        const correspondeGaragem =
            correspondeNumero(planta.garagem, garagem);

        const correspondeArea =
            correspondeFaixa(planta.area, area);

        const correspondeEstilo =
            !estilo || planta.estilo === estilo;

        return correspondeTipo &&
            correspondeQuartos &&
            correspondeGaragem &&
            correspondeArea &&
            correspondeEstilo;
    });

    paginaAtual = 1;

    mensagem.textContent = "";

    renderizar();
}


// 3. Mostrar as plantas na página
function mostrarPlantas() {
    ListaPlantas.innerHTML = "";

    if (plantasFiltradas.length === 0) {
        ListaPlantas.innerHTML = `
            <div class="NenhumaPlanta">
                <h3>Nenhuma planta encontrada.</h3>
                <p>Verifique os filtros aplicados ou tente novamente.</p>
            </div>
        `;

        return;
    }

    const inicio = (paginaAtual - 1) * PLANTAS_POR_PAGINA;

    const plantasDaPagina = plantasFiltradas.slice(
        inicio,
        inicio + PLANTAS_POR_PAGINA
    );

    plantasDaPagina.forEach(function (planta) {
        const plantaHTML = `
            <article class="CardPlanta">
                <div class="CardPlantaImagem">
                    <img
                        src="${escapar(planta.imagem || "")}"
                        alt="${escapar(planta.titulo || "Planta")}"
                        loading="lazy"
                    >

                    <button
                        class="CardFavorito"
                        type="button"
                        aria-label="Favoritar planta"
                    >
                        <svg viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="1.8">
                            <path d="M12 21s-7.5-4.6-10-9.2C0.3 8 2 4.5 5.6 4A5 5 0 0112 6.5 5 5 0 0118.4 4C22 4.5 23.7 8 22 11.8 19.5 16.4 12 21 12 21z"/>
                        </svg>
                    </button>
                </div>

                <div class="CardPlantaConteudo">
                    <h3>${escapar(planta.titulo || "Planta sem título")}</h3>

                    <div class="CardPlantaSpecs">
                        <span>${Number(planta.quartos) || 0} Quartos</span>
                        <span>${Number(planta.banheiros) || 0} Banheiros</span>
                        <span>${Number(planta.garagem) || 0} Garagens</span>
                    </div>

                    <a
                        href="DetalhesPlanta.html?id=${encodeURIComponent(planta.id)}"
                        class="BtnDetalhes"
                    >
                        Detalhes
                    </a>
                </div>
            </article>
        `;

        ListaPlantas.insertAdjacentHTML("beforeend", plantaHTML);
    });
}


// 4. Criar os botões da paginação
function mostrarPaginacao() {
    const totalPaginas = Math.ceil(
        plantasFiltradas.length / PLANTAS_POR_PAGINA
    );

    if (totalPaginas <= 1) {
        paginacao.innerHTML = "";
        return;
    }

    let html = `
        <button
            class="PaginacaoBtn"
            data-pagina="${paginaAtual - 1}"
            aria-label="Página anterior"
            ${paginaAtual === 1 ? "disabled" : ""}
        >
            ‹
        </button>
    `;

    for (let i = 1; i <= totalPaginas; i++) {
        html += `
            <button
                class="PaginacaoBtn ${i === paginaAtual ? "ativo" : ""}"
                data-pagina="${i}"
                ${i === paginaAtual ? 'aria-current="page"' : ""}
            >
                ${i}
            </button>
        `;
    }

    html += `
        <button
            class="PaginacaoBtn"
            data-pagina="${paginaAtual + 1}"
            aria-label="Próxima página"
            ${paginaAtual === totalPaginas ? "disabled" : ""}
        >
            ›
        </button>
    `;

    paginacao.innerHTML = html;
}


// 5. Atualizar a lista e a paginação
function renderizar() {
    mostrarPlantas();
    mostrarPaginacao();
}


// 6. Evento do botão Pesquisar
btnPesquisar.addEventListener("click", aplicarFiltros);


// 7. Evento dos botões da paginação
paginacao.addEventListener("click", function (event) {
    const botao = event.target.closest("button[data-pagina]");

    if (!botao || botao.disabled) {
        return;
    }

    paginaAtual = Number(botao.dataset.pagina);

    renderizar();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});


// 8. Iniciar a página
buscarPlantas();