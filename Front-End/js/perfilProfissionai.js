const parametros = new URLSearchParams(window.location.search);
const id = Number(parametros.get("id"));

fetch("../data/profissionais.json")
    .then(resposta => resposta.json())
    .then(profissionais => {

        const profissional = profissionais.find(p => p.id === id);

        if (!profissional) {

            document.querySelector(".perfil-profissional").innerHTML = `
                <h2>Profissional não encontrado.</h2>
            `;

            return;
        }

        document.getElementById("imagem").src = profissional.imagem;
        document.getElementById("imagem").alt = profissional.nome;

        document.getElementById("nome").textContent = profissional.nome;
        document.getElementById("profissao").textContent = profissional.profissao;
        document.getElementById("cidade").textContent = profissional.cidade;
        document.getElementById("avaliacao").textContent = `⭐ ${profissional.avaliacao}`;
        document.getElementById("experiencia").textContent = profissional.experiencia;
        document.getElementById("especialidade").textContent = profissional.especialidade;
        document.getElementById("descricao").textContent = profissional.descricao;
        document.getElementById("telefone").textContent = profissional.telefone;
        document.getElementById("email").textContent = profissional.email;

    })
    .catch(erro => {

        console.error("Erro ao carregar o profissional:", erro);

        document.querySelector(".perfil-profissional").innerHTML = `
            <h2>Não foi possível carregar as informações do profissional.</h2>
        `;

    });