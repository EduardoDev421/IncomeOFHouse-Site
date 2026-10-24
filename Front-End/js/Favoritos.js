/* Favoritos.js
   Favoritos guardados só neste navegador (localStorage).
   Compartilhado por plantas.js e detalhePlanta.js, para a lista e a
   página de detalhes mostrarem sempre o mesmo estado.
   Carregue ANTES de plantas.js e detalhePlanta.js. */

(function () {
    const CHAVE = "plantasFavoritas";

    function ler() {
        try {
            const lista = JSON.parse(localStorage.getItem(CHAVE));
            return Array.isArray(lista) ? lista.map(String) : [];
        } catch {
            return [];
        }
    }

    function salvar(lista) {
        try {
            localStorage.setItem(CHAVE, JSON.stringify(lista));
        } catch {
            /* sem armazenamento disponível (modo privado, etc.) */
        }
    }

    function eFavorito(id) {
        return ler().includes(String(id));
    }

    // Alterna o favorito e devolve o novo estado (true = favoritado).
    function alternar(id) {
        const chave = String(id);
        const lista = ler();
        const posicao = lista.indexOf(chave);

        if (posicao >= 0) {
            lista.splice(posicao, 1);
        } else {
            lista.push(chave);
        }

        salvar(lista);
        return posicao < 0;
    }

    window.Favoritos = { eFavorito, alternar };
})();
