import { supabase } from "./lib/supabaseClient.js";

const TABELA = "plantas";
const BUCKET = "plantas";

const EXTENSOES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function traduzirErro(erro) {
    const m = String(erro?.message || "").toLowerCase();
    if (m.includes("bucket not found")) return new Error("O armazenamento de imagens ainda não foi criado no Supabase.");
    if (m.includes("row-level security") || m.includes("not authorized") || m.includes("permission denied")) {
        return new Error("Sem permissão para publicar. Apenas contas de profissional podem publicar plantas.");
    }
    if (m.includes("does not exist") || m.includes("schema cache")) return new Error("A tabela plantas ainda não existe no Supabase.");
    if (m.includes("failed to fetch")) return new Error("Sem conexão com o servidor. Tente novamente.");
    if (m.includes("exceeded") || m.includes("too large")) return new Error("A imagem é grande demais.");
    return erro instanceof Error ? erro : new Error(erro?.message || "Erro inesperado.");
}

function normalizar(linha) {
    return {
        id: linha.id,
        profissionalId: linha.profissional_id,
        titulo: linha.nome,
        descricao: linha.descricao,
        categoria: linha.categoria,
        estilo: linha.estilo || "",
        quartos: linha.quartos,
        banheiros: linha.banheiros,
        garagem: linha.garagem,
        area: Number(linha.area),
        preco: Number(linha.preco),
        imagem: linha.imagem_url,
        destaques: linha.destaques || [],
        distribuicaoAmbientes: linha.distribuicao_ambientes || "",
        status: linha.ativa === false ? "inativa" : "publicada",
        criadoEm: linha.criado_em
    };
}

async function enviarImagem(userId, dataUrl) {
    const resposta = await fetch(dataUrl);
    const blob = await resposta.blob();
    const extensao = EXTENSOES[blob.type];
    if (!extensao) throw new Error("A imagem deve ser JPEG, PNG ou WebP.");

    const caminho = `${userId}/${crypto.randomUUID()}.${extensao}`;
    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(caminho, blob, { contentType: blob.type, cacheControl: "3600" });
    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
    return { caminho, url: data.publicUrl };
}

async function salvarPlanta(planta) {
    try {
        const { data: { session }, error: erroSessao } = await supabase.auth.getSession();
        if (erroSessao) throw erroSessao;
        if (!session) throw new Error("Você precisa entrar na sua conta para publicar uma planta.");

        const userId = session.user.id;
        const imagem = await enviarImagem(userId, planta.imagem);

        const { data, error } = await supabase
            .from(TABELA)
            .insert({
                profissional_id: userId,
                nome: planta.titulo,
                descricao: planta.descricao,
                categoria: planta.categoria,
                estilo: planta.estilo || null,
                quartos: planta.quartos,
                banheiros: planta.banheiros,
                garagem: planta.garagem,
                area: planta.area,
                preco: planta.preco,
                imagem_url: imagem.url,
                destaques: planta.destaques || [],
                distribuicao_ambientes: planta.distribuicaoAmbientes || null,
                ativa: true
            })
            .select()
            .single();

        if (error) {
            await supabase.storage.from(BUCKET).remove([imagem.caminho]);
            throw error;
        }

        return normalizar(data);
    } catch (erro) {
        throw traduzirErro(erro);
    }
}

async function listarPlantas(opcoes = {}) {
    try {
        let consulta = supabase
            .from(TABELA)
            .select("*")
            .eq("ativa", true)
            .order("criado_em", { ascending: false });

        if (opcoes.profissionalId) consulta = consulta.eq("profissional_id", opcoes.profissionalId);
        if (opcoes.categoria) consulta = consulta.eq("categoria", opcoes.categoria);
        if (opcoes.limite) consulta = consulta.limit(opcoes.limite);

        const { data, error } = await consulta;
        if (error) throw error;
        return (data || []).map(normalizar);
    } catch (erro) {
        throw traduzirErro(erro);
    }
}

async function buscarPlanta(id) {
    try {
        const { data, error } = await supabase
            .from(TABELA)
            .select("*")
            .eq("id", id)
            .maybeSingle();
        if (error) throw error;
        if (!data) return null;

        const planta = normalizar(data);

        if (data.profissional_id) {
            const { data: profissional, error: erroProfissional } = await supabase
                .from("profissionais")
                .select("id,nome,foto_url,profissao,sobre")
                .eq("id", data.profissional_id)
                .maybeSingle();

            if (!erroProfissional && profissional) {
                planta.profissional = {
                    id: profissional.id,
                    nome: profissional.nome || "Profissional",
                    cargo: profissional.profissao || "",
                    foto: profissional.foto_url || null,
                    bio: profissional.sobre || "",
                    nota: null,
                    totalAvaliacoes: 0
                };
            } else {
                planta.profissional = {
                    id: data.profissional_id,
                    nome: "Profissional",
                    cargo: "",
                    foto: null,
                    bio: "",
                    nota: null,
                    totalAvaliacoes: 0
                };
            }
        }

        return planta;
    } catch (erro) {
        throw traduzirErro(erro);
    }
}

window.PlantasStorage = {
    salvarPlanta,
    listarPlantas,
    buscarPlanta,
    getPlantas: listarPlantas,
    getPlanta: buscarPlanta
};
window.dispatchEvent(new Event("plantasstorage:pronto"));