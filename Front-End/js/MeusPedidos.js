import { supabase } from "./lib/supabaseClient.js";

// Cria o pedido de uma planta (ou reaproveita o pendente que já existe)
export async function criarPedido(plantaId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { erro: "login" };
    const usuarioId = session.user.id;

    const { data: planta, error: e1 } = await supabase
        .from("plantas").select("*").eq("id", plantaId).single();
    if (e1) throw e1;
    const preco = Number(planta.preco) || 0;

    // Já existe pedido pendente dessa planta? Usa ele em vez de criar outro.
    const { data: pend } = await supabase.from("pedidos").select("id")
        .eq("usuario_id", usuarioId).eq("status", "aguardando_pagamento");
    if (pend?.length) {
        const { data: it } = await supabase.from("itens_pedido").select("pedido_id")
            .eq("planta_id", plantaId).in("pedido_id", pend.map((p) => p.id)).limit(1);
        if (it?.length) return { id: it[0].pedido_id };
    }

    const { data: pedido, error: e2 } = await supabase.from("pedidos")
        .insert({ usuario_id: usuarioId, status: "aguardando_pagamento", total: preco })
        .select("id").single();
    if (e2) throw e2;

    const { error: e3 } = await supabase.from("itens_pedido").insert({
        pedido_id: pedido.id,
        planta_id: plantaId,
        profissional_id: planta.profissional_id,
        preco_unitario: preco,
        quantidade: 1
    });
    if (e3) {
        await supabase.from("pedidos").delete().eq("id", pedido.id);
        throw e3;
    }
    return { id: pedido.id };
}

const comTimeout = (promessa, ms, msg) =>
    Promise.race([promessa, new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms))]);

async function iniciar() {
    try {
        console.log("[Pedidos] iniciando...");
        const { data: { session }, error } = await comTimeout(
            supabase.auth.getSession(), 8000, "getSession demorou demais"
        );
        if (error) throw error;

        if (!session) {
            avisoLista("Você precisa entrar na sua conta para ver seus pedidos.", true);
            return;
        }

        usuarioId = session.user.id;
        console.log("[Pedidos] usuário:", usuarioId);
        await comTimeout(carregar(), 15000, "A consulta de pedidos demorou demais");
        console.log("[Pedidos] carregado:", pedidos.length, "pedido(s)");
    } catch (erro) {
        console.error("[Pedidos]", erro);
        avisoLista(textoErro(erro));
    }
}

iniciar();