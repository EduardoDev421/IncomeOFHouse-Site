import { supabase } from "./lib/supabaseClient.js";

// ============================================================
// CONFIGURAÇÕES
// ============================================================
const TABELA = "profissionais";
const COLUNA_ID = "id";
const PAGINA_LOGIN = "../Login.html";
const PAGINA_INICIAL = "../../index.html";
const ICONE_LOGO_VAZIO = "../../img/icones/IconeEmpresa.svg";

const TIPOS_EMPRESA = [
  "Construtora", "Incorporadora", "Imobiliária", "Arquitetura", "Engenharia Civil",
  "Engenharia Elétrica", "Engenharia Estrutural", "Design de Interiores", "Paisagismo",
  "Urbanismo", "Topografia", "Reformas e Manutenção", "Marcenaria e Móveis Planejados",
  "Gestão de Obras", "Consultoria e Projetos", "Outros"
];

const ESTADOS = [
  ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"], ["BA", "Bahia"],
  ["CE", "Ceará"], ["DF", "Distrito Federal"], ["ES", "Espírito Santo"], ["GO", "Goiás"],
  ["MA", "Maranhão"], ["MT", "Mato Grosso"], ["MS", "Mato Grosso do Sul"], ["MG", "Minas Gerais"],
  ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"], ["PE", "Pernambuco"], ["PI", "Piauí"],
  ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"], ["RS", "Rio Grande do Sul"],
  ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"], ["SP", "São Paulo"],
  ["SE", "Sergipe"], ["TO", "Tocantins"]
];

// Usado só se a lista de cidades (IBGE) não carregar
const CAPITAIS = {
  AC: "Rio Branco", AL: "Maceió", AP: "Macapá", AM: "Manaus", BA: "Salvador", CE: "Fortaleza",
  DF: "Brasília", ES: "Vitória", GO: "Goiânia", MA: "São Luís", MT: "Cuiabá", MS: "Campo Grande",
  MG: "Belo Horizonte", PA: "Belém", PB: "João Pessoa", PR: "Curitiba", PE: "Recife", PI: "Teresina",
  RJ: "Rio de Janeiro", RN: "Natal", RS: "Porto Alegre", RO: "Porto Velho", RR: "Boa Vista",
  SC: "Florianópolis", SP: "São Paulo", SE: "Aracaju", TO: "Palmas"
};

const PLACEHOLDERS = {
  nomeEmpresa: "Ex.: Silva Construções Ltda.",
  cnpj: "00.000.000/0000-00",
  telefone: "(00) 00000-0000",
  email: "contato@suaempresa.com.br",
  cep: "00000-000",
  logradouro: "Rua, avenida, travessa...",
  numero: "Ex.: 120",
  complemento: "Sala, andar, bloco...",
  bairro: "Ex.: Centro",
  site: "www.suaempresa.com.br",
  redes: "@suaempresa"
};

const cacheCidades = {};

/*
  Nome das colunas na tabela "profissionais".
  - Colunas que já existem no seu perfil: telefone, email, cidade, estado, sobre, foto_url.
  - As que estão como null AINDA NÃO existem na tabela: o campo fica vazio
    e NÃO é salvo. Quando criar a coluna no Supabase, é só colocar o nome aqui.
*/
const COLUNAS = {
  nomeEmpresa: null,   // ex.: "empresa"  (enquanto null, usa o nome do profissional)
  cnpj: null,          // ex.: "cnpj"
  tipoEmpresa: null,   // ex.: "tipo_empresa"
  telefone: "telefone",
  email: "email",
  cep: null,           // ex.: "cep"
  logradouro: null,    // ex.: "logradouro"
  numero: null,        // ex.: "numero"
  complemento: null,   // ex.: "complemento"
  bairro: null,        // ex.: "bairro"
  cidade: "cidade",
  estado: "estado",
  sobre: "sobre",
  logo: "foto_url",
  site: null,          // ex.: "site"
  redes: null          // ex.: "redes_sociais"
};

// Campos que o usuário pode editar e salvar (email fica só de leitura)
const SALVAVEIS = [
  "nomeEmpresa", "cnpj", "tipoEmpresa", "telefone", "cep", "logradouro", "numero",
  "complemento", "bairro", "cidade", "estado", "sobre", "site", "redes"
];

// Texto do <label> de cada campo (sem o asterisco)
const ROTULOS = {
  nomeEmpresa: "Nome da empresa",
  cnpj: "CNPJ",
  tipoEmpresa: "Tipo de empresa",
  telefone: "Telefone",
  email: "E-mail corporativo",
  cep: "CEP",
  logradouro: "Logradouro",
  numero: "Número",
  complemento: "Complemento",
  bairro: "Bairro",
  cidade: "Cidade",
  estado: "Estado",
  site: "Site",
  redes: "Redes sociais"
};

// ============================================================
// ELEMENTOS
// ============================================================
const conteudo = document.querySelector(".conteudo");
const textarea = document.querySelector(".sobre textarea");
const contador = document.querySelector(".contador");
const botaoSalvar = document.querySelector(".acoes .salvar");
const botaoCancelar = document.querySelector(".acoes .cancelar");

let sessaoUser = null;
let profissionalAtual = null;

// ============================================================
// UTILIDADES
// ============================================================
function achar(chave) {
  const alvo = ROTULOS[chave].toLowerCase();
  for (const campo of document.querySelectorAll(".campo")) {
    const label = campo.querySelector("label");
    if (!label) continue;
    const t = label.textContent.replace("*", "").trim().toLowerCase();
    if (t.startsWith(alvo)) return campo.querySelector("input, select");
  }
  return null;
}

function aviso(tipo, texto, tempo = 5000) {
  if (!conteudo) return;
  conteudo.querySelectorAll(".aviso-empresa").forEach(a => a.remove());

  const card = document.createElement("div");
  card.className = "aviso-empresa";
  card.setAttribute("role", tipo === "erro" ? "alert" : "status");
  card.style.cssText =
    "padding:12px 16px;margin-bottom:16px;border-radius:10px;font:600 14px/1.4 sans-serif;" +
    (tipo === "erro" ? "background:#f87171;color:#3b0a0a;" : "background:#86efac;color:#052e16;");
  card.textContent = texto;

  if (tipo === "erro" && texto.includes("entrar")) {
    const a = document.createElement("a");
    a.href = PAGINA_LOGIN;
    a.textContent = "Ir para o login";
    card.append(" ", a);
  }

  conteudo.prepend(card);
  if (tempo) setTimeout(() => card.remove(), tempo);
}

function formatarTelefone(valor) {
  const n = String(valor || "").replace(/\D/g, "").slice(0, 11);
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return n;
}

function formatarCNPJ(valor) {
  const n = String(valor || "").replace(/\D/g, "").slice(0, 14);
  return n
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatarCEP(valor) {
  const n = String(valor || "").replace(/\D/g, "").slice(0, 8);
  return n.length > 5 ? `${n.slice(0, 5)}-${n.slice(5)}` : n;
}

// ============================================================
// LIMPAR FORMULÁRIO (tudo começa vazio)
// ============================================================
function limparFormulario() {
  document.querySelectorAll(".card input[type='text'], .card input[type='email']").forEach(i => {
    i.value = "";
  });

  prepararSelects();

  if (textarea) textarea.value = "";
  atualizarContador();

  // Logo: sem imagem da empresa até existir uma
  const logo = document.querySelector(".logo-area img");
  if (logo) {
    logo.src = ICONE_LOGO_VAZIO;
    logo.alt = "Logo da empresa";
  }

  // Documentos: nenhum enviado ainda
  const docs = document.querySelectorAll(".documentos .documento");
  docs.forEach(d => d.remove());
  const cardDocs = document.querySelector(".documentos");
  if (cardDocs && !cardDocs.querySelector(".sem-documentos")) {
    const p = document.createElement("p");
    p.className = "sem-documentos";
    p.style.cssText = "color:#6b7280;font-size:14px;margin:12px 0;";
    p.textContent = "Nenhum documento enviado ainda.";
    const botao = cardDocs.querySelector(".gerenciar");
    botao ? cardDocs.insertBefore(p, botao) : cardDocs.append(p);
  }
}

function montarSelect(select, itens, placeholder) {
  if (!select) return;
  select.innerHTML = "";
  const vazio = document.createElement("option");
  vazio.value = "";
  vazio.textContent = placeholder;
  select.append(vazio);
  itens.forEach(([valor, rotulo]) => {
    const op = document.createElement("option");
    op.value = valor;
    op.textContent = rotulo;
    select.append(op);
  });
  select.value = "";
}

function prepararSelects() {
  // As opções de tipo e estado ficam no HTML; o JS só preenche se estiverem vazias
  const preparar = (chave, itens, placeholder) => {
    const sel = achar(chave);
    if (!sel) return;
    if (sel.options.length > 1) sel.value = "";
    else montarSelect(sel, itens, placeholder);
  };

  preparar("tipoEmpresa", TIPOS_EMPRESA.map(t => [t, t]), "Selecione o tipo de empresa");
  preparar("estado", ESTADOS.map(([uf, nome]) => [uf, `${uf} - ${nome}`]), "Selecione o estado");
  montarSelect(achar("cidade"), [], "Selecione o estado primeiro");
  const cidade = achar("cidade");
  if (cidade) cidade.disabled = true;

  Object.entries(PLACEHOLDERS).forEach(([chave, texto]) => {
    const el = achar(chave);
    if (el && el.tagName === "INPUT") el.placeholder = texto;
  });
  if (textarea) textarea.placeholder = "Conte um pouco sobre a sua empresa, serviços e diferenciais.";
}

async function carregarCidades(uf) {
  const sel = achar("cidade");
  if (!sel) return;

  if (!uf) {
    montarSelect(sel, [], "Selecione o estado primeiro");
    sel.disabled = true;
    return;
  }

  sel.disabled = true;
  montarSelect(sel, [], "Carregando cidades...");

  let nomes = cacheCidades[uf];
  if (!nomes) {
    try {
      const resp = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
      if (!resp.ok) throw new Error("IBGE indisponível");
      nomes = (await resp.json()).map(m => m.nome);
      cacheCidades[uf] = nomes;
    } catch (erro) {
      console.warn("[DadosEmpresa] Usando lista reduzida de cidades:", erro);
      nomes = [CAPITAIS[uf]].filter(Boolean);
    }
  }

  montarSelect(sel, nomes.map(n => [n, n]), "Selecione a cidade");
  sel.disabled = false;
}

function normalizarUF(valor) {
  const v = String(valor || "").trim().toLowerCase();
  if (!v) return "";
  const achado = ESTADOS.find(([uf, nome]) => uf.toLowerCase() === v || nome.toLowerCase() === v);
  return achado ? achado[0] : "";
}

async function buscarCEP(cep) {
  try {
    const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const d = await resp.json();
    if (d.erro) {
      aviso("erro", "CEP não encontrado.");
      return;
    }
    definir("logradouro", d.logradouro);
    definir("bairro", d.bairro);
    definir("estado", d.uf);
    await carregarCidades(d.uf);
    definir("cidade", d.localidade);
  } catch (erro) {
    console.warn("[DadosEmpresa] Erro ao buscar CEP:", erro);
  }
}

function ligarMascaras() {
  achar("cnpj")?.addEventListener("input", e => { e.target.value = formatarCNPJ(e.target.value); });
  achar("telefone")?.addEventListener("input", e => { e.target.value = formatarTelefone(e.target.value); });
  achar("cep")?.addEventListener("input", e => {
    e.target.value = formatarCEP(e.target.value);
    if (e.target.value.length === 9) buscarCEP(e.target.value.replace("-", ""));
  });
  achar("estado")?.addEventListener("change", e => carregarCidades(e.target.value));
}

function atualizarContador() {
  if (textarea && contador) {
    contador.textContent = `${textarea.value.length}/${textarea.getAttribute("maxlength") || 500}`;
  }
}

// ============================================================
// PREENCHER COM OS DADOS DO PERFIL PROFISSIONAL
// ============================================================
function definir(chave, valor) {
  const el = achar(chave);
  if (!el || valor === undefined || valor === null || valor === "") return;

  if (el.tagName === "SELECT") {
    const existe = Array.from(el.options).some(o => o.value === String(valor) || o.textContent === String(valor));
    if (!existe) {
      const op = document.createElement("option");
      op.value = op.textContent = String(valor);
      el.append(op);
    }
    const op = Array.from(el.options).find(o => o.value === String(valor) || o.textContent === String(valor));
    el.value = op.value;
  } else {
    el.value = valor;
  }
}

function ler(p, chave) {
  const coluna = COLUNAS[chave];
  return coluna ? p[coluna] : undefined;
}

async function preencher(p) {
  definir("nomeEmpresa", ler(p, "nomeEmpresa") || p.nome);
  definir("cnpj", formatarCNPJ(ler(p, "cnpj")));
  definir("tipoEmpresa", ler(p, "tipoEmpresa"));
  definir("telefone", formatarTelefone(ler(p, "telefone")));
  definir("email", ler(p, "email") || p.email);
  definir("cep", formatarCEP(ler(p, "cep")));
  definir("logradouro", ler(p, "logradouro"));
  definir("numero", ler(p, "numero"));
  definir("complemento", ler(p, "complemento"));
  definir("bairro", ler(p, "bairro"));
  const uf = normalizarUF(ler(p, "estado"));
  definir("estado", uf);
  await carregarCidades(uf);
  definir("cidade", ler(p, "cidade"));
  definir("site", ler(p, "site"));
  definir("redes", ler(p, "redes"));

  const sobre = ler(p, "sobre");
  if (textarea && sobre) textarea.value = sobre;
  atualizarContador();

  const urlLogo = ler(p, "logo");
  const logo = document.querySelector(".logo-area img");
  if (logo && urlLogo) {
    logo.onerror = () => {
      logo.onerror = null;
      logo.src = ICONE_LOGO_VAZIO;
    };
    logo.src = urlLogo;
  }
}

// ============================================================
// BUSCAR PROFISSIONAL
// ============================================================
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
    telefone: meta.telefone || "",
    cidade: meta.cidade || "",
    estado: meta.estado || "",
    email: user.email,
    _semLinha: true
  };
}

// ============================================================
// SALVAR
// ============================================================
async function salvar() {
  if (!profissionalAtual || !sessaoUser) {
    aviso("erro", "Você precisa entrar na sua conta para salvar.", 0);
    return;
  }

  const dados = {};
  for (const chave of SALVAVEIS) {
    const coluna = COLUNAS[chave];
    if (!coluna) continue;
    const el = achar(chave);
    if (!el) continue;
    dados[coluna] = chave === "sobre" ? (textarea?.value ?? "") : el.value.trim();
  }

  if (!Object.keys(dados).length) {
    aviso("erro", "Nenhuma coluna está configurada para salvar.");
    return;
  }

  botaoSalvar.disabled = true;
  try {
    const { error } = await supabase
      .from(TABELA)
      .update(dados)
      .eq(COLUNA_ID, sessaoUser.id);
    if (error) throw error;

    profissionalAtual = { ...profissionalAtual, ...dados };
    aviso("sucesso", "Alterações salvas com sucesso!");
  } catch (erro) {
    console.error("[DadosEmpresa] Erro ao salvar:", erro);
    aviso("erro", erro.message || "Não foi possível salvar as alterações.");
  } finally {
    botaoSalvar.disabled = false;
  }
}

function cancelar() {
  limparFormulario();
  if (profissionalAtual) preencher(profissionalAtual);
}

// ============================================================
// SAIR
// ============================================================
function ligarSair() {
  document.querySelectorAll(".menu-lateral a").forEach(link => {
    if (!link.querySelector('img[src*="IconeSair"]')) return;

    link.addEventListener("click", async event => {
      event.preventDefault();
      if (!confirm("Deseja realmente sair da sua conta?")) return;
      try {
        await supabase.auth.signOut();
      } catch (erro) {
        console.error("[DadosEmpresa] Erro ao sair:", erro);
      }
      window.location.replace(PAGINA_INICIAL);
    });
  });
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================
async function iniciar() {
  limparFormulario();
  ligarMascaras();
  ligarSair();

  textarea?.addEventListener("input", atualizarContador);
  botaoSalvar?.addEventListener("click", salvar);
  botaoCancelar?.addEventListener("click", cancelar);

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;

    if (!session) {
      aviso("erro", "Você precisa entrar na sua conta para ver os dados da empresa.", 0);
      return;
    }

    sessaoUser = session.user;
    profissionalAtual = await buscarProfissional(sessaoUser);
    preencher(profissionalAtual);
  } catch (erro) {
    console.error("[DadosEmpresa]", erro);
    aviso("erro", erro.message || "Não foi possível carregar os dados.", 0);
  }
}

iniciar();