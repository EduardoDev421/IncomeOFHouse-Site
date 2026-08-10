const container = document.querySelector(".cards-plantas");
const btnPesquisar = document.getElementById("btnPesquisar");

let plantas = [];

function exibirPlantas(listaPlantas) {

    container.innerHTML = "";

    if (listaPlantas.length === 0) {
        container.innerHTML = `
            <h2>Nenhuma planta encontrada.</h2>
        `;
        return;
    }

    listaPlantas.forEach(planta => {

        const card = document.createElement("article");
        card.classList.add("card");

        card.innerHTML = `
            <img src="${planta.imagem}" alt="${planta.nome}">

            <h2>${planta.nome}</h2>

            <p>
                ${planta.area} •
                ${planta.quartos} Quartos •
                ${planta.banheiros} Banheiros •
                ${planta.garagem}
            </p>

            <a href="DetalhePlanta.html?id=${planta.id}">
                <button>Detalhes</button>
            </a>
        `;

        container.appendChild(card);

    });

}

fetch("../data/plantas.json")
    .then(resposta => resposta.json())
    .then(dados => {

        plantas = dados;

        exibirPlantas(plantas);

    })
    .catch(erro => {

        console.error("Erro ao carregar as plantas:", erro);

        container.innerHTML = `
            <h2>Erro ao carregar as plantas.</h2>
        `;

    });

btnPesquisar.addEventListener("click", () => {

    const tipo = document.getElementById("tipo").value;
    const quartos = document.getElementById("quartos").value;
    const garagem = document.getElementById("garagem").value;
    const estilo = document.getElementById("estilo").value;
    const area = document.getElementById("area").value;

    const resultado = plantas.filter(planta => {

        const filtroTipo =
            tipo === "" || planta.tipo === tipo;

        const filtroQuartos =
            quartos === "" ||
            (quartos === "4" ? planta.quartos >= 4 : planta.quartos == quartos);

        const filtroGaragem =
            garagem === "" || planta.garagem === garagem;

        const filtroEstilo =
            estilo === "" || planta.estilo === estilo;

        const filtroArea =
            area === "" || planta.area === area;

        return (
            filtroTipo &&
            filtroQuartos &&
            filtroGaragem &&
            filtroEstilo &&
            filtroArea
        );

    });

    exibirPlantas(resultado);

});