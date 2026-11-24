import { supabase } from "./lib/supabaseClient.js";

const TABELA = "profissionais";
const COLUNA_ID = "id";
const PAGINA_LOGIN = "./Login.html";
const PAGINA_USUARIO = "./perfilUsuario.html";
const PAGINA_INICIAL = "../index.html";
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const ESTADOS = [
  ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"], ["BA", "Bahia"],
  ["CE", "Ceará"], ["DF", "Distrito Federal"], ["ES", "Espírito Santo"], ["GO", "Goiás"],
  ["MA", "Maranhão"], ["MT", "Mato Grosso"], ["MS", "Mato Grosso do Sul"], ["MG", "Minas Gerais"],
  ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"], ["PE", "Pernambuco"], ["PI", "Piauí"],
  ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"], ["RS", "Rio Grande do Sul"],
  ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"], ["SP", "São Paulo"],
  ["SE", "Sergipe"], ["TO", "Tocantins"]
];

const nomeProfissional = document.querySelector(".dados-usuario h2");
const botaoEditar = document.querySelector(".editar-perfil");
const paragrafoSobre = document.querySelector(".Sobre .card-corpo p");
let SOBRE_PADRAO = paragrafoSobre ? paragrafoSobre.textContent : "";

// ?id=... na URL = perfil de outro profissional (visualização pública, só leitura)
const idPerfil = new URLSearchParams(window.location.search).get("id");
let modoPublico = false;

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

function mostrarSucesso(texto) {
  exibir(document.querySelector(".conteudo"), "sucesso", texto, {
    grupo: "perfil",
    posicao: "inicio",
    topo: true,
    tempo: 4000
  });
}

async function iniciar() {
  ligarBotaoEditar();
  ligarSair();

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;

    // Abriu o perfil de outro profissional (ex.: "Ver perfil" na página da planta)
    const verOutro = idPerfil && (!session || idPerfil !== session.user.id);

    if (verOutro) {
      modoPublico = true;
      aplicarModoPublico();

      const linha = await buscarPorId(idPerfil);
      if (!linha) {
        mostrarAviso("Profissional não encontrado.", false);
        return;
      }

      profissionalAtual = linha;
      renderizar(linha);
      return;
    }

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
    mostrarAviso(motivoBloqueio, !modoPublico);
  } finally {
    liberarPagina();
  }
}

async function buscarPorId(idProfissional) {
  const { data, error } = await supabase
    .from(TABELA)
    .select("*")
    .eq(COLUNA_ID, idProfissional)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Visualização pública: sem edição, sem menu de gestão e sem dados locais do visitante
function aplicarModoPublico() {
  const esconder = seletor => document.querySelectorAll(seletor).forEach(e => { e.style.display = "none"; });

  esconder(".EditarPerfil");
  esconder(".editar-foto");
  esconder(".menu-lateral");
  esconder(".link-ver");

  // Sem o menu lateral, o conteúdo ocupa a largura inteira da tela
  document.body.classList.add("perfil-publico");
  if (!document.getElementById("estiloPerfilPublico")) {
    const estilo = document.createElement("style");
    estilo.id = "estiloPerfilPublico";
    estilo.textContent = `
      body.perfil-publico .BackGround { padding-left: 0 !important; padding-right: 0 !important; }
      body.perfil-publico .container {
        display: block !important;
        grid-template-columns: 1fr !important;
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
        gap: 0 !important;
      }
      body.perfil-publico .rodape {
        margin-left: 0 !important;
        left: 0 !important;
        width: 100% !important;
        max-width: none !important;
        box-sizing: border-box;
      }
      body.perfil-publico .conteudo {
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
        box-sizing: border-box;
        padding-left: clamp(16px, 4vw, 56px) !important;
        padding-right: clamp(16px, 4vw, 56px) !important;
      }
    `;
    document.head.append(estilo);
  }

  const titulo = document.querySelector(".Inicio h1");
  if (titulo) titulo.textContent = "Perfil do Profissional";
  const subtitulo = document.querySelector(".Inicio p");
  if (subtitulo) subtitulo.textContent = "Conheça as informações e o trabalho deste profissional.";

  SOBRE_PADRAO = "Este profissional ainda não adicionou uma descrição.";
  if (paragrafoSobre) paragrafoSobre.textContent = SOBRE_PADRAO;

  document.querySelectorAll(".card-corpo p.cinza").forEach(p => {
    if (p.textContent.includes("Você ainda não recebeu avaliações")) {
      p.textContent = "Este profissional ainda não recebeu avaliações.";
    }
  });
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

/* ====================================================================
   EDITAR PERFIL
   ==================================================================== */

function ligarBotaoEditar() {
  botaoEditar?.addEventListener("click", () => {
    if (!profissionalAtual || !sessaoUser) {
      mostrarAviso(motivoBloqueio || "Não foi possível carregar o perfil.", true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    abrirEdicao();
  });
}

function normalizarUF(valor) {
  const v = String(valor || "").trim().toLowerCase();
  const achado = ESTADOS.find(([uf, nome]) => uf.toLowerCase() === v || nome.toLowerCase() === v);
  return achado ? achado[0] : "";
}

const ESTILO_INPUT =
  "width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;border:1px solid #3a3a3a;" +
  "background:#0f0f0f;color:#f5f5f5;font:400 14px/1.4 sans-serif;outline:none;";

function campoModal(rotulo, elemento, obrigatorio = false) {
  const caixa = criar("div");
  caixa.style.cssText = "display:flex;flex-direction:column;gap:6px;";
  const label = criar("label", "", rotulo + (obrigatorio ? " *" : ""));
  label.style.cssText = "font:600 13px/1.2 sans-serif;color:#d4d4d4;";
  elemento.style.cssText = ESTILO_INPUT;
  elemento.addEventListener("focus", () => { elemento.style.borderColor = "#e0a526"; });
  elemento.addEventListener("blur", () => { elemento.style.borderColor = "#3a3a3a"; });
  caixa.append(label, elemento);
  return caixa;
}

function abrirEdicao() {
  if (document.getElementById("modalEditarPerfil")) return;
  const p = profissionalAtual;

  // ---------- campos ----------
  const inNome = criar("input");
  inNome.type = "text";
  inNome.maxLength = 100;
  inNome.value = p.nome || "";
  inNome.placeholder = "Seu nome completo";

  const inTelefone = criar("input");
  inTelefone.type = "text";
  inTelefone.placeholder = "(00) 00000-0000";
  inTelefone.value = formatarTelefone(p.telefone);
  inTelefone.addEventListener("input", () => { inTelefone.value = formatarTelefone(inTelefone.value); });

  const inEstado = criar("select");
  const vazio = criar("option", "", "Selecione o estado");
  vazio.value = "";
  inEstado.append(vazio);
  ESTADOS.forEach(([uf, nome]) => {
    const op = criar("option", "", `${uf} - ${nome}`);
    op.value = uf;
    inEstado.append(op);
  });
  inEstado.value = normalizarUF(p.estado);

  const inCidade = criar("input");
  inCidade.type = "text";
  inCidade.maxLength = 80;
  inCidade.placeholder = "Sua cidade";
  inCidade.value = p.cidade || "";

  const inSobre = criar("textarea");
  inSobre.maxLength = 500;
  inSobre.rows = 5;
  inSobre.placeholder = "Conte sobre a sua experiência, especialidades e diferenciais.";
  inSobre.value = p.sobre || objeto(p.portfolio).sobre || "";
  inSobre.style.resize = "vertical";

  const contador = criar("small", "", "");
  contador.style.cssText = "align-self:flex-end;color:#9ca3af;font:400 12px sans-serif;";
  const atualizarContador = () => { contador.textContent = `${inSobre.value.length}/500`; };
  inSobre.addEventListener("input", atualizarContador);

  // ---------- estrutura ----------
  const fundo = criar("div");
  fundo.id = "modalEditarPerfil";
  fundo.style.cssText =
    "position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.65);display:flex;" +
    "align-items:center;justify-content:center;padding:16px;overflow-y:auto;";

  const form = criar("form");
  form.noValidate = true;
  form.setAttribute("role", "dialog");
  form.setAttribute("aria-modal", "true");
  form.setAttribute("aria-label", "Editar perfil");
  form.style.cssText =
    "width:100%;max-width:520px;max-height:100%;overflow-y:auto;background:#171717;color:#f5f5f5;" +
    "border:1px solid #2e2e2e;border-radius:14px;padding:24px;display:flex;flex-direction:column;gap:16px;";

  const titulo = criar("h2", "", "Editar Perfil");
  titulo.style.cssText = "margin:0;font:700 20px/1.2 sans-serif;";
  const sub = criar("p", "", "Atualize suas informações pessoais.");
  sub.style.cssText = "margin:-8px 0 0;color:#9ca3af;font:400 14px/1.4 sans-serif;";

  const linhaLocal = criar("div");
  linhaLocal.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:12px;";
  linhaLocal.append(campoModal("Estado", inEstado), campoModal("Cidade", inCidade));

  const caixaSobre = campoModal("Sobre mim", inSobre);
  caixaSobre.append(contador);

  const erro = criar("div");
  erro.setAttribute("role", "alert");
  erro.style.cssText =
    "display:none;padding:10px 12px;border-radius:8px;background:#f87171;color:#3b0a0a;font:600 13px/1.4 sans-serif;";

  const btnCancelar = criar("button", "", "Cancelar");
  btnCancelar.type = "button";
  btnCancelar.style.cssText =
    "padding:10px 18px;border-radius:8px;border:1px solid #3a3a3a;background:transparent;color:#f5f5f5;" +
    "font:600 14px sans-serif;cursor:pointer;";

  const btnSalvar = criar("button", "", "Salvar alterações");
  btnSalvar.type = "submit";
  btnSalvar.style.cssText =
    "padding:10px 18px;border-radius:8px;border:none;background:#e0a526;color:#1a1200;" +
    "font:700 14px sans-serif;cursor:pointer;";

  const acoes = criar("div");
  acoes.style.cssText = "display:flex;justify-content:flex-end;gap:10px;margin-top:4px;";
  acoes.append(btnCancelar, btnSalvar);

  form.append(
    titulo, sub,
    campoModal("Nome", inNome, true),
    campoModal("Telefone", inTelefone),
    linhaLocal,
    caixaSobre,
    erro, acoes
  );
  fundo.append(form);
  document.body.append(fundo);
  atualizarContador();
  inNome.focus();

  // ---------- fechar ----------
  const fechar = () => {
    document.removeEventListener("keydown", aoTeclar);
    fundo.remove();
  };
  const aoTeclar = e => { if (e.key === "Escape") fechar(); };
  document.addEventListener("keydown", aoTeclar);
  btnCancelar.addEventListener("click", fechar);
  fundo.addEventListener("mousedown", e => { if (e.target === fundo) fechar(); });

  // ---------- salvar ----------
  form.addEventListener("submit", async e => {
    e.preventDefault();
    erro.style.display = "none";

    const nome = inNome.value.trim();
    const telefone = inTelefone.value.replace(/\D/g, "");

    if (nome.length < 2) {
      erro.textContent = "Informe o seu nome.";
      erro.style.display = "block";
      inNome.focus();
      return;
    }
    if (telefone && telefone.length < 10) {
      erro.textContent = "Telefone inválido. Informe o DDD e o número.";
      erro.style.display = "block";
      inTelefone.focus();
      return;
    }

    const dados = {
      nome,
      telefone,
      estado: inEstado.value,
      cidade: inCidade.value.trim(),
      sobre: inSobre.value.trim()
    };

    btnSalvar.disabled = true;
    btnSalvar.textContent = "Salvando...";
    try {
      const ignorados = await salvarPerfil(dados);
      fechar();
      mostrarSucesso(
        ignorados.length
          ? `Perfil atualizado, mas estas colunas não existem na tabela e não foram salvas: ${ignorados.join(", ")}.`
          : "Perfil atualizado com sucesso!"
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("[Perfil] Erro ao salvar:", err);
      erro.textContent = err.message || "Não foi possível salvar as alterações.";
      erro.style.display = "block";
      btnSalvar.disabled = false;
      btnSalvar.textContent = "Salvar alterações";
    }
  });
}

async function salvarPerfil(dados) {
  const envio = { ...dados };
  const ignorados = [];
  let ultimoErro = null;

  // Se o Supabase disser que uma coluna não existe, tenta de novo sem ela
  // ("sobre" passa a ser guardado dentro da coluna "portfolio", que já é lida pelo perfil)
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    const consulta = profissionalAtual._semLinha
      ? supabase.from(TABELA).upsert(
          { [COLUNA_ID]: sessaoUser.id, email: sessaoUser.email, ...envio },
          { onConflict: COLUNA_ID }
        )
      : supabase.from(TABELA).update(envio).eq(COLUNA_ID, sessaoUser.id);

    const { error } = await consulta;
    if (!error) {
      ultimoErro = null;
      break;
    }

    ultimoErro = error;
    const m = /Could not find the '([^']+)' column/.exec(error.message || "");
    if (!m) throw error;

    const coluna = m[1];
    delete envio[coluna];

    if (coluna === "sobre") {
      envio.portfolio = { ...objeto(profissionalAtual.portfolio), sobre: dados.sobre };
    } else if (coluna === "portfolio") {
      ignorados.push("sobre");
    } else {
      ignorados.push(coluna);
    }
  }

  if (ultimoErro) throw ultimoErro;

  profissionalAtual = { ...profissionalAtual, ...envio, _semLinha: false };
  renderizar(profissionalAtual);
  return ignorados;
}

/* ====================================================================
   RENDERIZAÇÃO
   ==================================================================== */

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

  // volta o "Sobre mim" ao texto padrão antes de preencher (caso o texto tenha sido apagado)
  if (paragrafoSobre) {
    paragrafoSobre.textContent = SOBRE_PADRAO;
    paragrafoSobre.classList.add("cinza");
  }

  renderizarConfiguracoes(p, local);

  document.querySelectorAll(".selo-verificado").forEach(s => {
    s.textContent = p.verificado === true ? "Verificado" : "Em análise";
  });

  if (paragrafoSobre && p.sobre) {
    paragrafoSobre.textContent = p.sobre;
    paragrafoSobre.classList.remove("cinza");
  }

  if (p.nome) document.title = `Perfil de ${p.nome}`;
}


/* ---------- Dados vindos da área de Configurações Profissionais ---------- */
const CHAVE_LOCAL = "perfilProfissionalDados";
const DIAS = [["seg", "Segunda-feira"], ["ter", "Terça-feira"], ["qua", "Quarta-feira"], ["qui", "Quinta-feira"], ["sex", "Sexta-feira"], ["sab", "Sábado"], ["dom", "Domingo"]];

function lerLocal() {
  if (modoPublico) return {};
  try { return JSON.parse(localStorage.getItem(CHAVE_LOCAL)) || {}; } catch { return {}; }
}

const lista = (v) => (Array.isArray(v) ? v : []);
const objeto = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

function criar(tag, classe, conteudo) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (conteudo !== undefined) e.textContent = conteudo;
  return e;
}

function linhaInfo(rotulo, valor) {
  const l = criar("div", "info-linha");
  l.append(criar("span", "", rotulo), criar("strong", "", valor));
  return l;
}

function moedaBR(n) {
  return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function tagsDe(textos) {
  const caixa = criar("div", "tags");
  textos.forEach(t => caixa.appendChild(criar("span", "tag", t)));
  return caixa;
}

// Só troca o conteúdo do card quando há dado; senão mantém o texto "ainda não informado"
function preencher(id, nos) {
  const corpo = document.getElementById(id);
  if (corpo && nos.length) corpo.replaceChildren(...nos);
}

function renderizarConfiguracoes(p, local) {
  const loc = lerLocal();

  const port = objeto(p.portfolio);
  const areas = lista(p.areas_atuacao).length ? lista(p.areas_atuacao) : lista(loc.areas).length ? lista(loc.areas) : lista(port.areas);
  if (areas.length) preencher("corpoAreas", [tagsDe(areas.map(String))]);

  const servicos = (lista(p.servicos).length ? lista(p.servicos) : lista(loc.servicos)).filter(s => s && s.nome);
  preencher("corpoServicos", servicos.map(s => linhaInfo(s.nome, s.preco ? `a partir de ${moedaBR(s.preco)}` : "Sob consulta")));

  const disp = Object.keys(objeto(p.disponibilidade)).length ? objeto(p.disponibilidade) : objeto(loc.disponibilidade);
  preencher("corpoDisponibilidade", DIAS
    .filter(([k]) => disp[k]?.ativo)
    .map(([k, nome]) => linhaInfo(nome, `${disp[k].de} – ${disp[k].ate}`)));

  const regioes = lista(p.regioes_atendimento).length ? lista(p.regioes_atendimento) : lista(loc.regioes);
  const todas = [...new Set([local || loc.cidade && [loc.cidade, loc.estado].filter(Boolean).join(", "), ...regioes.map(String)].filter(Boolean))];
  preencher("corpoRegiao", todas.length ? [tagsDe(todas)] : []);

  const orc = Object.keys(objeto(p.orcamento)).length ? objeto(p.orcamento) : objeto(loc.orcamento);
  const linhasOrc = [];
  if (orc.minimo) linhasOrc.push(linhaInfo("Valor mínimo", moedaBR(orc.minimo)));
  if (orc.maximo) linhasOrc.push(linhaInfo("Valor máximo", moedaBR(orc.maximo)));
  if (orc.prazo) linhasOrc.push(linhaInfo("Prazo médio", orc.prazo));
  preencher("corpoOrcamento", linhasOrc);

  renderizarPortfolio(port, p);
}

// Portfólio enviado na página "Meu Portfólio" (salvo na coluna portfolio)
function renderizarPortfolio(port, p) {
  const projetos = lista(port.projetos).filter(x => x && x.titulo);

  if (!p.sobre && port.sobre && paragrafoSobre) {
    paragrafoSobre.textContent = port.sobre;
    paragrafoSobre.classList.remove("cinza");
  }

  const corpo = document.getElementById("corpoPortfolio");
  const aviso = corpo?.querySelector("p.cinza");
  if (!corpo || !aviso || !projetos.length) return;

  const MAX = 4;
  const nos = projetos.slice(0, MAX).map(x => {
    const detalhes = [x.categoria, x.area, x.ano, x.local].filter(Boolean).join(" · ");
    return linhaInfo(x.titulo, detalhes || "—");
  });
  if (projetos.length > MAX) {
    nos.push(criar("p", "cinza", `+ ${projetos.length - MAX} ${projetos.length - MAX === 1 ? "projeto" : "projetos"} no portfólio completo.`));
  }
  aviso.replaceWith(...nos);

  const link = corpo.querySelector(".link-ver");
  if (link) link.textContent = "Ver o portfólio completo";
}

function nomeDaProfissao(valor) {
  if (!valor) return "";
  const pequenas = new Set(["de", "da", "do", "e"]);
  return String(valor)
    .split("-")
    .map((parte, i) => (i > 0 && pequenas.has(parte) ? parte : parte.charAt(0).toUpperCase() + parte.slice(1)))
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