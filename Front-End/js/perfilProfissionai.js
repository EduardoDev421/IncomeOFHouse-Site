import { supabase } from "./lib/supabaseClient.js";

const TABELA = "profissionais";
const COLUNA_ID = "id";
const PAGINA_LOGIN = "./Login.html";
const PAGINA_USUARIO = "./perfilUsuario.html";
const PAGINA_INICIAL = "../index.html";
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const nomeProfissional = document.querySelector(".dados-usuario h2");
const botaoEditar = document.querySelector(".editar-perfil");

let sessaoUser = null;
let profissionalAtual = null;
let motivoBloqueio = "";

if (!nomeProfissional) {
  console.error("[Perfil] Elementos do perfil não encontrados.");
  liberarPagina();
} else {
  iniciar();
}

function liberarPagina() {
  document.documentElement.classList.remove("carregando");
}

function exibir(container, tipo, texto, opcoes = {}) {
  if (!container) return;
  if (window.Mensagem?.mostrar) return window.Mensagem.mostrar(container, tipo, texto, opcoes);

  const grupo = opcoes.grupo || "padrao";
  container.querySelectorAll(`.card-mensagem[data-grupo="${grupo}"]`).forEach(c => c.remove());

  const card = document.createElement("div");
  card.className = `card-mensagem card-${tipo}` + (opcoes.topo ? " card-topo" : "");
  card.dataset.grupo = grupo;
  card.setAttribute("role", tipo === "erro" ? "alert" : "status");
  card.style.cssText = "padding:12px 16px;margin-bottom:16px;border-radius:10px;font:600 14px/1.4 sans-serif;" +
    (tipo === "erro" ? "background:#f87171;color:#3b0a0a;" : "background:#86efac;color:#052e16;");

  const conteudo = document.createElement("span");
  conteudo.textContent = texto;
  if (opcoes.link) {
    const a = document.createElement("a");
    a.href = opcoes.link.href;
    a.textContent = opcoes.link.texto;
    conteudo.append(" ", a);
  }
  card.append(conteudo);

  opcoes.posicao === "inicio" ? container.prepend(card) : container.append(card);
  if (opcoes.tempo) setTimeout(() => card.remove(), opcoes.tempo);
  return card;
}

function mostrarAviso(texto, comLinkLogin = true) {
  exibir(document.querySelector(".conteudo"), "erro", texto, {
    grupo: "perfil",
    posicao: "inicio",
    topo: true,
    link: comLinkLogin ? { texto: "Ir para o login", href: PAGINA_LOGIN } : undefined
  });
}

async function iniciar() {
  ligarBotaoEditar();
  ligarSair();

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;

    if (!session) {
      motivoBloqueio = "Você precisa entrar na sua conta para ver o perfil.";
      mostrarAviso(motivoBloqueio);
      return;
    }

    sessaoUser = session.user;
    profissionalAtual = await buscarProfissional(sessaoUser);

    if (profissionalAtual._semLinha && sessaoUser.user_metadata?.tipo !== "profissional") {
      window.location.replace(PAGINA_USUARIO);
      return;
    }

    renderizar(profissionalAtual);

    if (profissionalAtual._semLinha) {
      mostrarAviso("Não encontramos seu cadastro na tabela de profissionais. Mostrando os dados do cadastro da conta.", false);
    }
  } catch (erro) {
    console.error("[Perfil]", erro);
    motivoBloqueio = erro.message || "Não foi possível carregar o perfil.";
    mostrarAviso(motivoBloqueio);
  } finally {
    liberarPagina();
  }
}

async function buscarProfissional(user) {
  const { data, error } = await supabase
    .from(TABELA)
    .select("*")
    .eq(COLUNA_ID, user.id)
    .maybeSingle();
  if (error) throw error;

  const meta = user.user_metadata || {};
  return data || {
    nome: meta.nome || meta.full_name || "",
    profissao: meta.profissao || "",
    cidade: meta.cidade || "",
    estado: meta.estado || "",
    registro: meta.registro || "",
    telefone: meta.telefone || "",
    email: user.email,
    verificado: false,
    criado_em: user.created_at,
    _semLinha: true
  };
}

function ligarBotaoEditar() {
  botaoEditar?.addEventListener("click", () => {
    if (!profissionalAtual) {
      mostrarAviso(motivoBloqueio || "Não foi possível carregar o perfil.", true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    mostrarAviso("A edição do perfil profissional ainda não está disponível.", false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function texto(el, valor) {
  if (el) el.textContent = valor || "—";
}

function setLinha(rotulo, valor) {
  for (const linha of document.querySelectorAll(".info-linha")) {
    const r = linha.querySelector("span");
    if (r && r.textContent.trim() === rotulo) {
      texto(linha.querySelector("strong"), valor);
      return;
    }
  }
}

function mostrarFoto(url) {
  const img = document.querySelector(".foto-placeholder img");
  if (!img) return;
  if (!url) return;

  const original = img.getAttribute("src");
  img.onerror = () => {
    img.onerror = null;
    img.src = original;
    img.classList.remove("foto-real");
  };
  img.src = url;
  img.classList.add("foto-real");
}

function renderizar(p) {
  const local = [p.cidade, p.estado].filter(Boolean).join(", ");

  mostrarFoto(p.foto_url);
  texto(nomeProfissional, p.nome || "Profissional");
  texto(document.querySelector(".dados-usuario .profissao"), nomeDaProfissao(p.profissao));

  const selos = document.querySelectorAll(".selos .selo");
  if (selos[1]) selos[1].textContent = local || "—";

  const contatos = document.querySelectorAll(".contato-rapido .contato-item span");
  texto(contatos[0], p.email);
  texto(contatos[1], formatarTelefone(p.telefone));
  texto(contatos[2], local);

  setLinha("Membro desde", membroDesde(p.criado_em));
  setLinha("Profissão", nomeDaProfissao(p.profissao));
  setLinha("Número", p.registro);
  setLinha("Estado", p.estado);

  const tagRegiao = document.querySelector(".coluna:last-child .tags .tag");
  if (tagRegiao) tagRegiao.textContent = local || "—";

  document.querySelectorAll(".selo-verificado").forEach(s => {
    s.textContent = p.verificado === true ? "Verificado" : "Em análise";
  });

  const sobre = document.querySelector(".Sobre .card-corpo p");
  if (sobre && p.sobre) {
    sobre.textContent = p.sobre;
    sobre.classList.remove("cinza");
  }

  if (p.nome) document.title = `Perfil de ${p.nome}`;
}

function nomeDaProfissao(valor) {
  if (!valor) return "";
  return String(valor)
    .split("-")
    .map(parte => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(" ");
}

function formatarTelefone(valor) {
  const n = String(valor || "").replace(/\D/g, "").slice(0, 11);
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return n;
}

function membroDesde(valor) {
  const data = valor ? new Date(valor) : null;
  if (!data || Number.isNaN(data.getTime())) return "";
  return `${MESES[data.getMonth()]}/${data.getFullYear()}`;
}

function ligarSair() {
  document.querySelectorAll(".menu-lateral a").forEach(link => {
    if (!link.querySelector('img[src*="IconeSair"]')) return;

    link.addEventListener("click", async event => {
      event.preventDefault();
      if (!confirm("Deseja realmente sair da sua conta?")) return;
      try {
        await supabase.auth.signOut();
      } catch (erro) {
        console.error("[Perfil] Erro ao sair:", erro);
      }
      window.location.replace(PAGINA_INICIAL);
    });
  });
}