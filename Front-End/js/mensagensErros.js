/* =========================================================
   MENSAGENS - uso em qualquer página do projeto

   Linke DEPOIS do CSS e ANTES do JS da página:
     <link rel="stylesheet" href="../css/mensagens.css">
     <script src="../js/mensagens.js"></script>

   Tipos: "erro", "sucesso", "aviso", "info"

   Exemplos:
     Mensagem.mostrar(container, "erro", "Algo deu errado.");
     Mensagem.mostrar(container, "sucesso", "Salvo!", { tempo: 4000 });
     Mensagem.mostrar(container, "erro", "Você precisa entrar na sua conta.", {
         link: { texto: "Ir para o login", href: "login.html" },
         posicao: "inicio",
         topo: true
     });
     Mensagem.limpar(container);
========================================================= */

(function () {
    const TIPOS = ["erro", "sucesso", "aviso", "info"];

    function mostrar(container, tipo, texto, opcoes = {}) {
        if (!container) {
            console.error("Mensagem.mostrar: container não encontrado.");
            return null;
        }

        if (!TIPOS.includes(tipo)) {
            tipo = "info";
        }

        // Só existe uma mensagem por grupo em cada container
        const grupo = opcoes.grupo || "padrao";

        container
            .querySelectorAll(`.card-mensagem[data-grupo="${grupo}"]`)
            .forEach(card => card.remove());

        const card = document.createElement("div");

        card.className = `card-mensagem card-${tipo}`;

        if (opcoes.topo) card.classList.add("card-topo");
        if (opcoes.classe) card.classList.add(opcoes.classe);

        card.dataset.grupo = grupo;
        card.setAttribute(
            "role",
            tipo === "erro" || tipo === "aviso" ? "alert" : "status"
        );

        const conteudo = document.createElement("span");

        conteudo.textContent = texto;

        if (opcoes.link) {
            const link = document.createElement("a");

            link.href = opcoes.link.href;
            link.textContent = opcoes.link.texto;

            conteudo.append(" ", link);
        }

        card.append(conteudo);

        if (opcoes.posicao === "inicio") {
            container.prepend(card);
        } else {
            container.append(card);
        }

        // Some sozinho depois de X milissegundos (opcional)
        if (opcoes.tempo) {
            setTimeout(() => card.remove(), opcoes.tempo);
        }

        return card;
    }

    function limpar(container, grupo = "padrao") {
        if (!container) return;

        container
            .querySelectorAll(`.card-mensagem[data-grupo="${grupo}"]`)
            .forEach(card => card.remove());
    }

    window.Mensagem = { mostrar, limpar };
})();