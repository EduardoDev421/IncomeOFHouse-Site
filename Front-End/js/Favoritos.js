import { supabase } from "./lib/supabaseClient.js";

// Mesma tabela usada por MeusProjetosFavoritos.js
const TABELA = "favoritos";

let usuarioId = null;
let ids = new Set();

async function carregar() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        usuarioId = session?.user?.id || null;
        ids = new Set();
        if (!usuarioId) return;

        const { data, error } = await supabase
            .from(TABELA)
            .select("planta_id")
            .eq("usuario_id", usuarioId)
            .not("planta_id", "is", null);

        if (error) throw error;
        ids = new Set((data || []).map((l) => String(l.planta_id)));
    } catch (erro) {
        console.error("[Favoritos] Não foi possível carregar os favoritos:", erro);
    }
}

const pronto = carregar();

function textoErro(erro) {
    const m = String(erro?.message || "").toLowerCase();
    if (m.includes("does not exist") || m.includes("schema cache") || erro?.code === "PGRST205")
        return "A tabela favoritos ainda não existe no Supabase.";
    if (m.includes("row-level security") || m.includes("permission denied"))
        return "Sem permissão para salvar o favorito.";
    if (m.includes("foreign key"))
        return "Não foi possível favoritar: a tabela favoritos exige uma referência que não existe (" + (erro?.details || erro?.message) + ").";
    if (m.includes("failed to fetch")) return "Sem conexão com o servidor. Tente novamente.";
    return `Erro ao salvar o favorito: ${erro?.message || "desconhecido"}${erro?.code ? " (código " + erro.code + ")" : ""}`;
}

function eFavorito(plantaId) {
    return ids.has(String(plantaId));
}

function listar() {
    return [...ids];
}

async function alternar(plantaId) {
    await pronto;
    if (!usuarioId) return null;

    const chave = String(plantaId);
    const estavaAtivo = ids.has(chave);

    if (estavaAtivo) ids.delete(chave);
    else ids.add(chave);

    try {
        if (estavaAtivo) {
            const { error } = await supabase
                .from(TABELA)
                .delete()
                .eq("usuario_id", usuarioId)
                .eq("planta_id", plantaId);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from(TABELA)
                .insert({ usuario_id: usuarioId, planta_id: plantaId });
            if (error && error.code !== "23505") throw error;
        }
        return !estavaAtivo;
    } catch (erro) {
        if (estavaAtivo) ids.add(chave);
        else ids.delete(chave);
        console.error("[Favoritos]", erro);
        throw new Error(textoErro(erro));
    }
}

window.Favoritos = { pronto, eFavorito, alternar, listar };