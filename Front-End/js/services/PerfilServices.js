// Front-End/js/services/PerfilServices.js
// Usa o MESMO cliente do perfilUsuario.js (evita o aviso "Multiple GoTrueClient instances")
import { supabase } from "../lib/supabaseClient.js";

const BUSCA_MAX = 300;

// Nomes das colunas no Supabase.
// favoritos: id, usuario_id, planta_id, profissional_id (criada por favoritos_profissional.sql), criado_em
// pedidos: id, usuario_id, endereco_id, status, total, criado_em, atualizado_em
const COLUNAS = {
  usuario: "usuario_id",           // em favoritos e pedidos
  planta: "planta_id",             // em favoritos
  profissional: "profissional_id", // em favoritos
  data: "criado_em"                // data de criação em favoritos e pedidos
};

async function contar(tabela, userId, filtro) {
  let consulta = supabase
    .from(tabela)
    .select("*", { count: "exact", head: true })
    .eq(COLUNAS.usuario, userId);
  if (filtro) consulta = filtro(consulta);
  const { count, error } = await consulta;
  if (error) throw error;
  return count ?? 0;
}

export async function buscarContadores(userId) {
  const [projetos, profissionais, pedidos] = await Promise.all([
    contar("favoritos", userId, q => q.not(COLUNAS.planta, "is", null)),
    contar("favoritos", userId, q => q.not(COLUNAS.profissional, "is", null)),
    contar("pedidos", userId)
  ]);
  return { projetos, profissionais, pedidos };
}

// Atividades que o usuário já apagou do histórico
async function buscarOcultas(userId) {
  const { data, error } = await supabase
    .from("atividades_ocultas")
    .select("tipo, referencia_id")
    .eq("usuario_id", userId);

  if (error) {
    // Se a tabela ainda não existe, mostra tudo em vez de quebrar a página
    console.warn("[Perfil] atividades_ocultas:", error.message);
    return new Set();
  }
  return new Set(data.map(o => `${o.tipo}:${o.referencia_id}`));
}

// "em_andamento" -> "Em andamento"
function textoStatus(status) {
  const t = String(status || "").replace(/_/g, " ").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}

function tempo(data) {
  const t = new Date(data).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export async function buscarAtividades(userId, limite = 5) {
  const [fav, ped, ocultas] = await Promise.all([
    supabase
      .from("favoritos")
      .select(`id, ${COLUNAS.planta}, ${COLUNAS.profissional}, ${COLUNAS.data}`)
      .eq(COLUNAS.usuario, userId)
      .order(COLUNAS.data, { ascending: false })
      .limit(BUSCA_MAX),
    supabase
      .from("pedidos")
      .select(`id, status, ${COLUNAS.data}`)
      .eq(COLUNAS.usuario, userId)
      .order(COLUNAS.data, { ascending: false })
      .limit(BUSCA_MAX),
    buscarOcultas(userId)
  ]);

  if (fav.error) throw fav.error;
  if (ped.error) throw ped.error;

  return [
    ...fav.data
      .filter(f => f[COLUNAS.planta] || f[COLUNAS.profissional]) // ignora favorito sem destino
      .map(f => ({
        tipo: "favorito",
        id: f.id,
        texto: f[COLUNAS.planta] ? "Você favoritou um projeto" : "Você favoritou um profissional",
        data: f[COLUNAS.data]
      })),
    ...ped.data.map(p => {
      const status = textoStatus(p.status);
      return {
        tipo: "pedido",
        id: p.id,
        texto: status ? `Pedido #${p.id} — ${status}` : `Pedido #${p.id}`,
        data: p[COLUNAS.data]
      };
    })
  ]
    .filter(a => !ocultas.has(`${a.tipo}:${a.id}`))
    .sort((a, b) => tempo(b.data) - tempo(a.data))
    .slice(0, limite);
}

// "Apagar" do histórico = marcar como oculta (favoritos e pedidos continuam intactos)
export async function ocultarAtividades(userId, atividades) {
  if (!atividades.length) return;

  const linhas = atividades.map(a => ({
    usuario_id: userId,
    tipo: a.tipo,
    referencia_id: String(a.id)
  }));

  const { error } = await supabase
    .from("atividades_ocultas")
    .upsert(linhas, { onConflict: "usuario_id,tipo,referencia_id", ignoreDuplicates: true });
  if (error) throw error;
}