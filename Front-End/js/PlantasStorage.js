// PlantasStorage.js
// Carregue este arquivo ANTES do publicarPlanta.js e do plantas.js.
//
// Configure window.PLANTAS_API_URL antes deste script se o front e a API
// estiverem em domínios diferentes. Em produção, o padrão usa a mesma origem.
const API_BASE_URL = window.PLANTAS_API_URL || (
    window.location.protocol === "file:" ||
    ["localhost", "127.0.0.1"].includes(window.location.hostname)
        ? "http://localhost:3000"
        : window.location.origin
);
const API_PLANTAS = `${API_BASE_URL.replace(/\/+$/, "")}/plantas`;

async function respostaOuErro(resposta) {
    if (resposta.ok) return;

    const conteudo = await resposta.text();
    let detalhe = {};
    try {
        detalhe = JSON.parse(conteudo);
    } catch (erro) {
        console.error("A API retornou uma resposta de erro inválida:", erro);
    }

    throw new Error(detalhe.erro || `O servidor respondeu com status ${resposta.status}.`);
}

// Devolve as plantas salvas no banco, da mais nova para a mais antiga.
async function getPlantas() {
    const resposta = await fetch(API_PLANTAS);
    await respostaOuErro(resposta);

    const dados = await resposta.json();
    if (!Array.isArray(dados)) {
        throw new Error("A API retornou uma lista de plantas inválida.");
    }

    return dados.reverse();
}

async function getPlanta(id) {
    const resposta = await fetch(`${API_PLANTAS}/${encodeURIComponent(id)}`);
    await respostaOuErro(resposta);
    return resposta.json();
}

// Só considera publicação concluída quando a API confirmar a gravação no MySQL.
async function salvarPlanta(planta) {
    const resposta = await fetch(API_PLANTAS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planta),
    });
    await respostaOuErro(resposta);
    return true;
}