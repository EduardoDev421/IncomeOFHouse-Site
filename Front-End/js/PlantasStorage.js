/* PlantasStorage.js
   Responsável pela comunicação com a API de plantas.
   Carregue este arquivo ANTES de plantas.js, detalhePlanta.js e publicarPlanta.js.
*/

(function () {
    const API_BASE_URL = (
        window.PLANTAS_API_URL ||
        (
            window.location.protocol === "file:" ||
            ["localhost", "127.0.0.1"].includes(window.location.hostname)
                ? "http://localhost:3000"
                : window.location.origin
        )
    ).replace(/\/+$/, "");

    const API_PLANTAS = `${API_BASE_URL}/plantas`;

    // Lê a resposta e informa o erro retornado pelo servidor.
    async function lerResposta(resposta) {
        const texto = await resposta.text();
        let dados = {};

        if (texto) {
            try {
                dados = JSON.parse(texto);
            } catch {
                dados = {};
            }
        }

        if (!resposta.ok) {
            const mensagem =
                dados.erro ||
                dados.mensagem ||
                (resposta.status === 413
                    ? "A imagem é grande demais para o servidor (HTTP 413)."
                    : `Erro do servidor: HTTP ${resposta.status}`);

            throw new Error(mensagem);
        }

        return dados;
    }

    // fetch que explica melhor quando o servidor está fora do ar.
    async function requisitar(url, opcoes) {
        try {
            return await fetch(url, opcoes);
        } catch {
            throw new Error(
                "Não foi possível conectar ao servidor. Verifique se a API está rodando."
            );
        }
    }

    // Busca todas as plantas publicadas (mais novas primeiro).
    async function getPlantas() {
        const resposta = await requisitar(API_PLANTAS);
        const dados = await lerResposta(resposta);

        const lista = Array.isArray(dados) ? dados : dados.plantas;

        if (!Array.isArray(lista)) {
            throw new Error(
                "O servidor não retornou uma lista válida de plantas."
            );
        }

        // Ordena pelo id (maior = mais nova). Funciona mesmo que o
        // servidor passe a ordenar sozinho com ORDER BY id DESC.
        return [...lista].sort((a, b) => Number(b.id) - Number(a.id));
    }

    // Busca uma planta específica pelo ID.
    async function getPlanta(id) {
        if (!id) {
            throw new Error("O ID da planta não foi informado.");
        }

        const resposta = await requisitar(
            `${API_PLANTAS}/${encodeURIComponent(id)}`
        );

        const dados = await lerResposta(resposta);

        return dados.planta || dados;
    }

    // Envia uma planta para ser salva no MySQL.
    async function salvarPlanta(planta) {
        const resposta = await requisitar(API_PLANTAS, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(planta)
        });

        return lerResposta(resposta);
    }

    // Exclui uma planta do banco de dados.
    async function excluirPlanta(id) {
        if (!id) {
            throw new Error("O ID da planta não foi informado.");
        }

        const resposta = await requisitar(
            `${API_PLANTAS}/${encodeURIComponent(id)}`,
            { method: "DELETE" }
        );

        return lerResposta(resposta);
    }

    window.PlantasStorage = {
        getPlantas,
        getPlanta,
        salvarPlanta,
        excluirPlanta
    };
})();
