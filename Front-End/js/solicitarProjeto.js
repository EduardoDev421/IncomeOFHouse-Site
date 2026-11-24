// Front-End/js/solicitarPedido.js
// Cria (ou reaproveita) o pedido de uma planta, no servidor, e leva o usuário ao pedido.
//
// Uso no botão "Solicitar projeto" (DetalhesPlanta / solicitarProjeto):
//   import { solicitarEIrParaPedido } from "./solicitarPedido.js";
//   botao.addEventListener("click", () => solicitarEIrParaPedido(plantaId, botao));
//
// Fluxo completo do site:
//   plantas.html -> DetalhesPlanta.html?id=  -> [Solicitar projeto]
//   -> DetalhesPedidos.html?id=  -> [Pagar] -> Pagamentos/Checkout.html?pedido=
//   -> PagAprovado.html?pedido=  -> MeusPedidos.html
import { supabase } from "./lib/supabaseClient.js";

const PAGINA_LOGIN = "./Login.html";
const PAGINA_DETALHES_PEDIDO = "./DetalhesPedidos.html";

let emAndamento = null;

export function solicitarPedido(plantaId) {
    // clique duplo: devolve a mesma chamada em vez de abrir outra
    if (emAndamento) { return emAndamento; }

    emAndamento = (async () => {
        const { data, error } = await supabase.rpc("solicitar_pedido", { p_planta_id: plantaId });
        if (error) {
            console.error("[Pedido] solicitar:", error);
            throw new Error(error.message || "Não foi possível criar o pedido.");
        }
        return data; // id do pedido (novo ou o já existente)
    })();

    emAndamento.finally(() => { emAndamento = null; });
    return emAndamento;
}

// Faz tudo: confere o login, cria/reaproveita o pedido e abre os detalhes dele.
export async function solicitarEIrParaPedido(plantaId, botao) {
    if (botao) { botao.disabled = true; }

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert("Entre na sua conta para solicitar o projeto.");
            window.location.href = PAGINA_LOGIN;
            return;
        }

        const pedidoId = await solicitarPedido(plantaId);
        window.location.href = `${PAGINA_DETALHES_PEDIDO}?id=${encodeURIComponent(pedidoId)}`;
    } catch (erro) {
        alert(erro.message || "Não foi possível solicitar o projeto.");
        if (botao) { botao.disabled = false; }
    }
}