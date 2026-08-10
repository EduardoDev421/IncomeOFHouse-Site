const container = document.querySelector(".cards");

fetch("../data/profissionais.json")
    .then(resposta => resposta.json())
    .then(profissionais => {

        profissionais.forEach(profissional => {

            const card = document.createElement("article");
            card.classList.add("card");

            card.innerHTML = `
                <img src="${profissional.imagem}" alt="${profissional.nome}">

                <h2>${profissional.nome}</h2>

                <p>${profissional.profissao}</p>

                <p>${profissional.cidade}</p>

                <p>⭐ ${profissional.avaliacao}</p>

                <a href="DetalheProfissional.html?id=${profissional.id}">
                    <button>Ver Perfil</button>
                </a>
            `;

            container.appendChild(card);

        });

    })
    .catch(erro => {

        console.error("Erro ao carregar os profissionais:", erro);

        container.innerHTML = `
            <h2>Não foi possível carregar os profissionais.</h2>
        `;

    });