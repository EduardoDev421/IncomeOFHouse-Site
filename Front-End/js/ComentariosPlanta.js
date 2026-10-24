/* =========================================================
   ComentariosPlanta.js - resumo dos comentários em DetalhesPlanta.html
   Mostra o total e o comentário mais recente.
   Escrever e ver todos: Comentarios.html?id=...
========================================================= */

(function () {
    "use strict";

    var id = new URLSearchParams(window.location.search).get("id");

    var contagem = document.getElementById("contagemComentarios");
    var link = document.getElementById("linkComentarios");
    var previa = document.getElementById("previaComentario");

    if (!contagem || !link || !previa) return;

    var API_BASE = (
        window.PLANTAS_API_URL ||
        (window.location.protocol === "file:" ||
        ["localhost", "127.0.0.1"].indexOf(window.location.hostname) !== -1
            ? "http://localhost:3000"
            : window.location.origin)
    ).replace(/\/+$/, "");

    if (id) {
        link.href = "./Comentarios.html?id=" + encodeURIComponent(id);
    }

    function mensagem(texto) {
        var p = document.createElement("p");
        p.className = "PreviaVazia";
        p.textContent = texto;
        previa.replaceChildren(p);
    }

    function mostrarUltimo(c) {
        var item = document.createElement("div");
        item.className = "PreviaItem";

        var avatar = document.createElement("div");
        avatar.className = "Avatar AvatarInicial";
        avatar.textContent = (c.autor || "?").charAt(0).toUpperCase();

        var corpo = document.createElement("div");
        corpo.className = "PreviaCorpo";

        var nome = document.createElement("strong");
        nome.textContent = c.autor || "Usuário";

        var texto = document.createElement("p");
        texto.textContent = c.texto;

        corpo.append(nome, texto);
        item.append(avatar, corpo);
        previa.replaceChildren(item);
    }

    async function carregar() {
        if (!id) {
            mensagem("Comentários indisponíveis.");
            return;
        }

        try {
            var resposta = await fetch(
                API_BASE + "/plantas/" + encodeURIComponent(id) + "/comentarios?limite=1"
            );

            if (!resposta.ok) throw new Error("HTTP " + resposta.status);

            var dados = await resposta.json();
            var total = dados.total || 0;

            contagem.textContent = total.toLocaleString("pt-BR");

            if (total > 0 && dados.comentarios && dados.comentarios[0]) {
                mostrarUltimo(dados.comentarios[0]);
                link.textContent = "Ver todos e comentar →";
            } else {
                mensagem("Ainda não há comentários. Seja o primeiro a comentar!");
                link.textContent = "Comentar →";
            }
        } catch (e) {
            mensagem("Não foi possível carregar os comentários agora.");
        }
    }

    carregar();
})();