// Front-End/js/services/portfolioService.js
// Salva e carrega o portfólio (dados lidos do currículo) do profissional logado.
// Os dados ficam na tabela public.portfolios (veja o SQL no passo 1).
import { supabase } from "../lib/supabaseClient.js";

// Imagens em base64 muito grandes deixam o banco lento. Acima disso, a imagem é descartada.
const LIMITE_IMAGEM = 200 * 1024; // ~200 KB

const texto = (v, max) => String(v || "").trim().slice(0, max);

// Monta só os campos conhecidos, com tamanho limitado (nada além disso vai para o banco).
function limpar(d) {
  return {
    nome: texto(d.nome, 150),
    profissao: texto(d.profissao, 100),
    localizacao: texto(d.localizacao, 120),
    sobre: texto(d.sobre, 3000),
    areas: (d.areas || []).slice(0, 20).map((a) => texto(a, 80)).filter(Boolean),
    projetos: (d.projetos || []).slice(0, 50).map((p) => {
      let imagem = typeof p.imagem === "string" ? p.imagem : "";
      if (imagem.startsWith("data:") && imagem.length > LIMITE_IMAGEM) imagem = "";
      return {
        titulo: texto(p.titulo, 150),
        categoria: texto(p.categoria, 80),
        descricao: texto(p.descricao, 1500),
        area: texto(p.area, 40),
        ano: texto(p.ano, 10),
        local: texto(p.local, 120),
        imagem,
      };
    }),
  };
}

/** Salva (ou atualiza) o portfólio do profissional logado. */
export async function salvarPortfolio(dados) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) throw new Error("Entre na sua conta para salvar o portfólio.");

  const { error } = await supabase.from("portfolios").upsert({
    profissional_id: user.id,
    dados: limpar(dados),
    atualizado_em: new Date().toISOString(),
  });
  if (error) throw new Error("Não foi possível salvar o portfólio: " + error.message);
}

/**
 * Carrega o portfólio salvo.
 * Sem argumento: o do profissional logado. Com o id: o de qualquer profissional (perfil público).
 * Retorna o objeto { nome, profissao, localizacao, sobre, areas, projetos } ou null.
 */
export async function carregarPortfolio(profissionalId) {
  let id = profissionalId;
  if (!id) {
    const { data: auth } = await supabase.auth.getUser();
    id = auth?.user?.id;
  }
  if (!id) return null;

  const { data, error } = await supabase
    .from("portfolios")
    .select("dados")
    .eq("profissional_id", id)
    .maybeSingle();
  if (error) throw new Error("Não foi possível carregar o portfólio: " + error.message);
  return data ? data.dados : null;
}