/* =========================================================
   PERFIL DO PROFISSIONAL (página pública, ?id=...)

   Precisa de:  ../css/mensagens.css  e  ../js/mensagens.js
   (mensagens.js deve ser carregado ANTES deste arquivo)
========================================================= */

const parametros = new URLSearchParams(window.location.search);
const id = Number(parametros.get("id"));

const areaPerfil = document.querySelector(".perfil-profissional");

// Garantia: se o mensagens.js não foi carregado, cria uma versão mínima aqui
// (os estilos continuam vindo do mensagens.css)
if (!window.Mensagem) {

    window.Mensagem = {

        mostrar(container, tipo, texto, opcoes = {}) {

            const card = document.createElement("div");

            card.className = `card-mensagem card-${tipo}`;
            card.dataset.grupo = opcoes.grupo || "padrao";
            card.setAttribute("role", tipo === "erro" ? "alert" : "status");

            const conteudo = document.createElement("span");

            conteudo.textContent = texto;

            if (opcoes.link) {
                const link = document.createElement("a");

                link.href = opcoes.link.href;
                link.textContent = opcoes.link.texto;

                conteudo.append(" ", link);
            }

            card.append(conteudo);
            container.append(card);

            return card;
        },

        limpar(container, grupo = "padrao") {
            container?.querySelectorAll(`.card-mensagem[data-grupo="${grupo}"]`)
                .forEach(card => card.remove());
        }
    };
}

// Troca todo o conteúdo da área por um card de erro
function mostrarErroPerfil(texto) {

    if (!areaPerfil) {
        console.error("Área .perfil-profissional não encontrada.");
        return;
    }

    areaPerfil.replaceChildren();

    window.Mensagem?.mostrar(areaPerfil, "erro", texto, {
        grupo: "profissional",
        link: {
            texto: "Voltar para os profissionais",
            href: "./Profissionais.html"
        }
    });
}

if (!parametros.get("id") || Number.isNaN(id)) {

    mostrarErroPerfil("Profissional não encontrado.");

} else {

    fetch("../data/profissionais.json")
        .then(resposta => {

            if (!resposta.ok) {
                throw new Error(`Falha ao ler profissionais.json (${resposta.status})`);
            }

            return resposta.json();
        })
        .then(profissionais => {

            const profissional = profissionais.find(p => p.id === id);

            if (!profissional) {

                mostrarErroPerfil("Profissional não encontrado.");

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

            mostrarErroPerfil(
                "Não foi possível carregar as informações do profissional. Tente novamente mais tarde."
            );

        });

}