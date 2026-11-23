// Front-End/js/perfilUsuario.js
import { supabase } from "./lib/supabaseClient.js";
import { buscarContadores, buscarAtividades } from "./services/PerfilServices.js";
import { ligarHistorico } from "./HistoricoUsuario.js";

const TABELA = "usuarios";
const COLUNA_ID = "id";
const BUCKET_FOTOS = "avatars";
const LIMITE_FOTO = 2 * 1024 * 1024;
const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"];
const PAGINA_LOGIN = "./Login.html"; // use o nome exato do arquivo na pasta pages
const ICONE_USUARIO =
  '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<circle cx="12" cy="8" r="4"></circle>' +
    '<path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"></path>' +
  "</svg>";

const nomeUsuario = document.querySelector(".dados-usuario h2");
const emailUsuario = document.querySelector(".dados-usuario > p");
const informacoes = document.querySelectorAll(".card-informacoes .item");
const botaoEditar = document.querySelector(".editar-perfil");

let sessaoUser = null;
let usuarioAtual = null;
let motivoBloqueio = "";
let janela = null;
let fotoNova = null;
let removerFoto = false;
let urlPrevia = null;

if (!nomeUsuario || !emailUsuario) {
  console.error("[Perfil] Elementos do perfil não encontrados.");
  liberarPagina();
} else {
  iniciar();
}

// A página começa escondida (classe "carregando" no <head>) para não piscar
// campos vazios; ela é liberada quando a sessão e o perfil foram verificados.
function liberarPagina() {
  document.documentElement.classList.remove("carregando");
}

/* ---------- MENSAGENS ---------- */
function exibir(container, tipo, texto, opcoes = {}) {
  if (!container) return;
  if (window.Mensagem?.mostrar) return window.Mensagem.mostrar(container, tipo, texto, opcoes);

  const grupo = opcoes.grupo || "padrao";
  container.querySelectorAll(`.card-mensagem[data-grupo="${grupo}"]`).forEach(c => c.remove());

  const card = document.createElement("div");
  card.className = `card-mensagem card-${tipo}` + (opcoes.topo ? " card-topo" : "");
  card.dataset.grupo = grupo;
  card.setAttribute("role", tipo === "erro" ? "alert" : "status");

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

function limparMensagens(container, grupo) {
  if (window.Mensagem?.limpar) return window.Mensagem.limpar(container, grupo);
  container?.querySelectorAll(`.card-mensagem[data-grupo="${grupo}"]`).forEach(c => c.remove());
}

function mostrarAviso(texto, comLinkLogin = true) {
  exibir(document.querySelector(".conteudo"), "erro", texto, {
    grupo: "perfil",
    posicao: "inicio",
    topo: true,
    link: comLinkLogin ? { texto: "Ir para o login", href: PAGINA_LOGIN } : undefined
  });
}

function mostrarSucesso(texto) {
  exibir(document.querySelector(".conteudo"), "sucesso", texto, {
    grupo: "perfil",
    posicao: "inicio",
    topo: true,
    tempo: 5000
  });
}

/* ---------- INICIAR ---------- */
async function iniciar() {
  ligarBotaoEditar();
  ligarSair();

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;

    if (!session) {
      motivoBloqueio = "Você precisa entrar na sua conta para ver e editar o perfil.";
      mostrarAviso(motivoBloqueio);
      return;
    }

    sessaoUser = session.user;
    usuarioAtual = await buscarUsuario(sessaoUser);
    renderizar(usuarioAtual);
    carregarResumo(sessaoUser.id);
    // Histórico de atividades (pop-up) vive em HistoricoUsuario.js
    ligarHistorico(sessaoUser.id, () => carregarResumo(sessaoUser.id));
  } catch (erro) {
    console.error("[Perfil]", erro);
    motivoBloqueio = erro.message || "Não foi possível carregar o perfil.";
    mostrarAviso(motivoBloqueio);
  } finally {
    liberarPagina();
  }
}

async function buscarUsuario(user) {
  const { data, error } = await supabase
    .from(TABELA)
    .select("*")
    .eq(COLUNA_ID, user.id)
    .maybeSingle();
  if (error) throw error;

  return data || {
    nome: user.user_metadata?.nome || user.user_metadata?.full_name || "",
    email: user.email,
    criado_em: user.created_at,
    _semLinha: true
  };
}

/* ---------- CONTADORES E ATIVIDADES RECENTES (card da página) ---------- */
async function carregarResumo(userId) {
  try {
    const [contadores, atividades] = await Promise.all([
      buscarContadores(userId),
      buscarAtividades(userId)
    ]);
    definirTexto("contadorProjetosSalvos", contadores.projetos);
    definirTexto("contadorProfissionaisFavoritos", contadores.profissionais);
    definirTexto("contadorPedidos", contadores.pedidos);
    renderizarAtividades(atividades);
  } catch (erro) {
    console.error("[Perfil] Resumo:", erro);
  }
}

function definirTexto(id, valor) {
  const el = document.getElementById(id);
  if (el) el.textContent = valor;
}

function renderizarAtividades(lista) {
  const vazio = document.querySelector(".Atividades .sem-atividades");
  const ul = document.querySelector(".lista-atividades");
  if (!ul) return;

  ul.replaceChildren();
  if (vazio) vazio.style.display = lista.length ? "none" : "";

  for (const atividade of lista) {
    const li = document.createElement("li");
    const data = new Date(atividade.data);
    const dataTexto = Number.isNaN(data.getTime()) ? "" : ` · ${data.toLocaleDateString("pt-BR")}`;
    li.textContent = `${atividade.texto}${dataTexto}`;
    ul.append(li);
  }
}

/* ---------- BOTÃO EDITAR ---------- */
function ligarBotaoEditar() {
  botaoEditar?.addEventListener("click", () => {
    if (!usuarioAtual || usuarioAtual._semLinha) {
      const texto = usuarioAtual
        ? "Não encontramos seu cadastro na tabela de usuários, por isso não é possível editar."
        : motivoBloqueio || "Não foi possível carregar o perfil.";
      mostrarAviso(texto, !usuarioAtual);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    abrirEdicao();
  });
}

/* ---------- MOSTRAR DADOS ---------- */
function mostrarFoto(url) {
  const img = document.getElementById("fotoPerfil");
  const icone = document.getElementById("fotoIcone");
  if (!img || !icone) return;

  if (url) {
    img.onerror = () => mostrarFoto(null);
    img.src = url;
    img.hidden = false;
    icone.hidden = true;
  } else {
    img.onerror = null;
    img.removeAttribute("src");
    img.hidden = true;
    icone.hidden = false;
  }
}

function renderizar(usuario) {
  mostrarFoto(usuario.foto_url);
  nomeUsuario.textContent = usuario.nome || "Usuário";
  emailUsuario.textContent = usuario.email || "E-mail não informado";

  informacoes.forEach(item => {
    const span = item.querySelector(".item-text span");
    const valor = item.querySelector(".item-text strong");
    const titulo = span?.dataset.original || span?.textContent.trim().toLowerCase();
    if (!valor || !titulo) return;

    if (titulo === "nome completo") valor.textContent = usuario.nome || "Não informado";
    if (titulo === "e-mail") valor.textContent = usuario.email || "Não informado";
    if (titulo === "cpf") valor.textContent = formatarCPF(usuario.cpf) || "Não informado";
    if (titulo === "telefone") valor.textContent = formatarTelefone(usuario.telefone) || "Não informado";
    if (titulo === "data de nascimento") valor.textContent = formatarData(usuario.data_nascimento) || "Não informado";
    if (titulo === "senha") valor.textContent = "••••••••••";
  });

  const membro = document.querySelector(".membro-desde p");
  if (membro) {
    const data = usuario.criado_em ? new Date(usuario.criado_em) : null;
    membro.textContent = data && !Number.isNaN(data.getTime())
      ? `Membro desde: ${data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`
      : "Membro desde: data não informada";
  }
}

/* ---------- JANELA DE EDIÇÃO ---------- */
function criarJanela() {
  janela = document.createElement("div");
  janela.className = "edicao-modal";
  janela.hidden = true;
  janela.innerHTML =
    '<form class="edicao-caixa" novalidate>' +
      '<div class="edicao-topo">' +
        "<h3>Editar Perfil</h3>" +
        '<button type="button" class="edicao-fechar" aria-label="Fechar">✕</button>' +
      "</div>" +
      '<div class="edicao-corpo">' +
        '<div class="edicao-foto">' +
          '<div class="edicao-foto-previa">' +
            '<img alt="Prévia da foto" hidden>' +
            '<span class="edicao-foto-sem">' + ICONE_USUARIO + "</span>" +
          "</div>" +
          '<div class="edicao-foto-acoes">' +
            '<label class="edicao-foto-botao">Escolher foto<input type="file" name="foto" accept="image/jpeg,image/png,image/webp" hidden></label>' +
            '<button type="button" class="edicao-foto-remover" hidden>Remover foto</button>' +
          "</div>" +
        "</div>" +
        '<label>Nome completo<input type="text" name="nome" maxlength="150" autocomplete="name"></label>' +
        '<label>E-mail<input type="email" name="email" maxlength="254" autocomplete="email"></label>' +
        '<label>Telefone<input type="text" name="telefone" inputmode="numeric" placeholder="(00) 00000-0000" maxlength="15" autocomplete="tel"></label>' +
        '<label>CPF<input type="text" name="cpf" inputmode="numeric" placeholder="000.000.000-00" maxlength="14"></label>' +
        '<label>Data de nascimento<input type="date" name="dataNascimento"></label>' +
        '<div class="edicao-mensagens"></div>' +
      "</div>" +
      '<div class="edicao-rodape">' +
        '<button type="button" class="edicao-cancelar">Cancelar</button>' +
        '<button type="submit" class="edicao-salvar">Salvar alterações</button>' +
      "</div>" +
    "</form>";
  document.body.appendChild(janela);

  const form = janela.querySelector("form");
  form.elements.telefone.addEventListener("input", e => { e.target.value = formatarTelefone(e.target.value); });
  form.elements.cpf.addEventListener("input", e => { e.target.value = formatarCPF(e.target.value); });
  form.addEventListener("input", e => e.target.classList?.remove("campo-invalido"));

  janela.addEventListener("click", e => {
    if (e.target === janela || e.target.closest(".edicao-fechar, .edicao-cancelar")) fecharEdicao();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !janela.hidden) fecharEdicao();
  });
  form.elements.foto.addEventListener("change", escolherFoto);
  janela.querySelector(".edicao-foto-remover").addEventListener("click", removerFotoEscolhida);
  form.addEventListener("submit", salvarEdicao);
}

function limparErroEdicao() {
  if (!janela) return;
  limparMensagens(janela.querySelector(".edicao-mensagens"), "edicao");
  janela.querySelectorAll(".campo-invalido").forEach(c => c.classList.remove("campo-invalido"));
}

function mostrarErroEdicao(texto, campo = null) {
  limparErroEdicao();
  exibir(janela.querySelector(".edicao-mensagens"), "erro", texto, { grupo: "edicao" });
  if (campo) {
    campo.classList.add("campo-invalido");
    campo.focus();
  }
}

function abrirEdicao() {
  if (!janela) criarJanela();
  const f = janela.querySelector("form").elements;

  f.nome.value = usuarioAtual.nome || "";
  f.email.value = usuarioAtual.email || "";
  f.telefone.value = formatarTelefone(usuarioAtual.telefone);
  f.cpf.value = formatarCPF(usuarioAtual.cpf);
  f.dataNascimento.value = dataParaInput(usuarioAtual.data_nascimento);

  liberarPrevia();
  fotoNova = null;
  removerFoto = false;
  f.foto.value = "";
  atualizarPrevia(usuarioAtual.foto_url || null);

  limparErroEdicao();
  janela.hidden = false;
  document.body.style.overflow = "hidden";
  f.nome.focus();
}

function fecharEdicao() {
  janela.hidden = true;
  document.body.style.overflow = "";
  liberarPrevia();
}

function atualizarPrevia(url) {
  const previa = janela.querySelector(".edicao-foto-previa");
  const img = previa.querySelector("img");
  const sem = previa.querySelector(".edicao-foto-sem");
  const remover = janela.querySelector(".edicao-foto-remover");

  if (url) {
    img.src = url;
    img.hidden = false;
    sem.hidden = true;
    remover.hidden = false;
  } else {
    img.removeAttribute("src");
    img.hidden = true;
    sem.hidden = false;
    remover.hidden = true;
  }
}

function liberarPrevia() {
  if (urlPrevia) {
    URL.revokeObjectURL(urlPrevia);
    urlPrevia = null;
  }
}

function escolherFoto(evento) {
  const entrada = evento.target;
  const arquivo = entrada.files?.[0];
  if (!arquivo) return;

  if (!TIPOS_FOTO.includes(arquivo.type)) {
    entrada.value = "";
    mostrarErroEdicao("Use uma imagem JPG, PNG ou WEBP.");
    return;
  }
  if (arquivo.size > LIMITE_FOTO) {
    entrada.value = "";
    mostrarErroEdicao("A foto deve ter no máximo 2 MB.");
    return;
  }

  limparErroEdicao();
  liberarPrevia();
  fotoNova = arquivo;
  removerFoto = false;
  urlPrevia = URL.createObjectURL(arquivo);
  atualizarPrevia(urlPrevia);
}

function removerFotoEscolhida() {
  liberarPrevia();
  fotoNova = null;
  removerFoto = Boolean(usuarioAtual?.foto_url);
  janela.querySelector('input[name="foto"]').value = "";
  atualizarPrevia(null);
}

async function enviarFoto(arquivo) {
  const caminho = `${sessaoUser.id}/avatar`;
  const { error } = await supabase.storage
    .from(BUCKET_FOTOS)
    .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type, cacheControl: "3600" });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(caminho);
  return `${data.publicUrl}?v=${Date.now()}`;
}

async function apagarFoto() {
  const { error } = await supabase.storage
    .from(BUCKET_FOTOS)
    .remove([`${sessaoUser.id}/avatar`]);
  if (error) throw error;
}

function textoErro(erro) {
  const m = String(erro?.message || "").toLowerCase();
  if (m.includes("bucket not found")) return "O armazenamento de fotos ainda não foi criado no Supabase.";
  if (m.includes("foto_url")) return "A coluna foto_url ainda não existe na tabela usuarios.";
  if (m.includes("row-level security") || m.includes("not authorized") || m.includes("permission denied"))
    return "Sem permissão para salvar a foto ou os dados.";
  if (m.includes("failed to fetch")) return "Sem conexão com o servidor. Tente novamente.";
  return erro?.message || "Erro ao salvar as alterações.";
}

async function salvarEdicao(evento) {
  evento.preventDefault();
  const f = janela.querySelector("form").elements;
  const botaoSalvar = janela.querySelector(".edicao-salvar");

  const dados = {
    nome: f.nome.value.trim(),
    email: f.email.value.trim(),
    telefone: f.telefone.value.replace(/\D/g, ""),
    cpf: f.cpf.value.replace(/\D/g, ""),
    dataNascimento: f.dataNascimento.value
  };

  let problema = "";
  let campoProblema = null;

  if (dados.nome.length < 3 || dados.nome.length > 150) {
    problema = "O nome deve ter entre 3 e 150 caracteres.";
    campoProblema = f.nome;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) {
    problema = "Informe um e-mail válido.";
    campoProblema = f.email;
  } else if (dados.telefone && ![10, 11].includes(dados.telefone.length)) {
    problema = "Informe um telefone válido com DDD.";
    campoProblema = f.telefone;
  } else if (dados.cpf && dados.cpf.length !== 11) {
    problema = "O CPF deve ter 11 números.";
    campoProblema = f.cpf;
  } else if (dados.dataNascimento && dados.dataNascimento > new Date().toISOString().slice(0, 10)) {
    problema = "A data de nascimento não pode ser no futuro.";
    campoProblema = f.dataNascimento;
  }

  if (problema) {
    mostrarErroEdicao(problema, campoProblema);
    return;
  }

  limparErroEdicao();
  botaoSalvar.disabled = true;
  botaoSalvar.textContent = "Salvando...";

  try {
    const alteracoes = {
      nome: dados.nome,
      telefone: dados.telefone || null,
      cpf: dados.cpf || null,
      data_nascimento: dados.dataNascimento || null
    };

    if (fotoNova) {
      alteracoes.foto_url = await enviarFoto(fotoNova);
    } else if (removerFoto) {
      await apagarFoto();
      alteracoes.foto_url = null;
    }

    const resposta = await supabase
      .from(TABELA)
      .update(alteracoes)
      .eq(COLUNA_ID, sessaoUser.id)
      .select()
      .maybeSingle();

    if (resposta.error) throw resposta.error;
    if (!resposta.data) throw new Error("Não foi possível salvar as alterações.");

    usuarioAtual = resposta.data;

    let aviso = "Perfil atualizado com sucesso.";
    if (dados.email.toLowerCase() !== (sessaoUser.email || "").toLowerCase()) {
      const { error } = await supabase.auth.updateUser({ email: dados.email });
      if (error) throw error;
      aviso = "Perfil atualizado. Enviamos um link de confirmação para o novo e-mail.";
    }

    renderizar(usuarioAtual);
    fecharEdicao();
    mostrarSucesso(aviso);
  } catch (erro) {
    console.error("[Perfil]", erro);
    mostrarErroEdicao(textoErro(erro));
  } finally {
    botaoSalvar.disabled = false;
    botaoSalvar.textContent = "Salvar alterações";
  }
}

/* ---------- FORMATAÇÃO ---------- */
function formatarCPF(valor) {
  const n = String(valor || "").replace(/\D/g, "").slice(0, 11);
  return n
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatarTelefone(valor) {
  const n = String(valor || "").replace(/\D/g, "").slice(0, 11);
  if (n.length > 10) return n.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
  if (n.length > 6) return n.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
  if (n.length > 2) return n.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  return n;
}

function formatarData(valor) {
  if (!valor) return "";
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? "" : data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function dataParaInput(valor) {
  if (!valor) return "";
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? "" : data.toISOString().slice(0, 10);
}

/* ---------- SAIR ---------- */
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
      window.location.replace("../index.html");
    });
  });
}