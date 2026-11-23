// Front-End/js/pagesimplement/DadosPessoais.js
// Dados pessoais da conta LOGADA (usuário ou profissional), direto do Supabase.
// O menu lateral vem do conta.js (um só lugar para os dois tipos de conta).
import { supabase } from "../lib/supabaseClient.js";

const COLUNA_ID = "id";
const TABELA_POR_TIPO = { usuario: "usuarios", profissional: "profissionais" };
// Nomes das colunas (iguais em usuarios e profissionais). Se algum for diferente, ajuste aqui.
const COLUNAS = {
  nome: "nome",
  cpf: "cpf",
  telefone: "telefone",
  dataNascimento: "data_nascimento",
  foto: "foto_url",
  criadoEm: "criado_em"
};
const BUCKET_FOTOS = "avatars";
const LIMITE_FOTO = 2 * 1024 * 1024;
const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"];
const PAGINA_LOGIN = "../Login.html";
const NIVEL_PAGINA = 1; // esta página está em /pages/PagesImplement (1 pasta abaixo de /pages)

const form = document.getElementById("formDadosPessoais");
const campos = form.elements;
const inputFoto = document.getElementById("fotoPerfil");
const previewFoto = document.getElementById("previewFoto");
const btnRemoverFoto = document.getElementById("btnRemoverFoto");
const btnCancelar = document.getElementById("btnCancelar");
const btnSalvar = form.querySelector(".BotaoSalvar");
const areaMensagem = document.getElementById("mensagemDados");
const subtitulo = document.getElementById("subtituloDados");
const dataCriacao = document.getElementById("dataCriacao");
const tipoConta = document.getElementById("tipoConta");
const emailConfirmado = document.getElementById("emailConfirmado");
const menuLateral = document.getElementById("menuLateral");

const temConta = typeof Conta !== "undefined"; // conta.js (script comum, carregado antes)

let sessaoUser = null;
let tipo = null;        // "usuario" | "profissional"
let tabela = null;      // "usuarios" | "profissionais"
let registro = null;    // linha da conta logada
let fotoNova = null;
let removerFoto = false;
let urlPrevia = null;
let tipoDoMenu = null;  // tipo com que o menu está montado agora

btnSalvar.disabled = true; // só libera depois de carregar os dados

/* ---------- MENSAGENS ---------- */
function mostrarMensagem(tipoMsg, texto) {
  areaMensagem.hidden = false;
  if (window.Mensagem?.mostrar) {
    window.Mensagem.mostrar(areaMensagem, tipoMsg, texto, {
      grupo: "dados",
      tempo: tipoMsg === "sucesso" ? 5000 : undefined
    });
  } else {
    areaMensagem.textContent = texto;
    areaMensagem.dataset.tipo = tipoMsg;
    if (tipoMsg === "sucesso") setTimeout(() => { areaMensagem.hidden = true; }, 5000);
  }
  areaMensagem.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function limparMensagem() {
  if (window.Mensagem?.limpar) window.Mensagem.limpar(areaMensagem, "dados");
  else areaMensagem.textContent = "";
  areaMensagem.hidden = true;
  form.querySelectorAll('[aria-invalid="true"]').forEach(c => c.removeAttribute("aria-invalid"));
}

function erroCampo(texto, campo) {
  limparMensagem();
  mostrarMensagem("erro", texto);
  if (campo) {
    campo.setAttribute("aria-invalid", "true");
    campo.focus();
  }
}

function textoErro(erro) {
  const m = String(erro?.message || "").toLowerCase();
  const codigo = String(erro?.code || "");
  if (codigo === "23505" || m.includes("duplicate key")) {
    if (m.includes("cpf")) return "Esse CPF já está cadastrado.";
    return "Já existe um cadastro com esses dados.";
  }
  if (codigo === "PGRST204" || m.includes("could not find the") || (m.includes("column") && m.includes("does not exist")))
    return `Falta uma coluna na tabela ${tabela || ""} (${erro.message}). Ajuste COLUNAS no topo do arquivo ou rode o dados_pessoais.sql.`;
  if (codigo === "email_exists" || m.includes("already been registered")) return "Esse e-mail já está em uso por outra conta.";
  if (codigo === "over_email_send_rate_limit" || m.includes("rate limit"))
    return "Muitos e-mails enviados. Aguarde alguns minutos e tente de novo.";
  if (m.includes("bucket not found")) return "O armazenamento de fotos (bucket avatars) ainda não foi criado no Supabase.";
  if (m.includes("row-level security") || m.includes("permission denied") || m.includes("not authorized"))
    return "Sem permissão para salvar a foto ou os dados.";
  if (m.includes("failed to fetch")) return "Sem conexão com o servidor. Tente novamente.";
  return erro?.message || "Erro ao salvar as alterações.";
}

/* ---------- FORMATAÇÃO E VALIDAÇÃO ---------- */
const soNumeros = (v) => String(v || "").replace(/\D/g, "");
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;

function formatarCPF(valor) {
  const n = soNumeros(valor).slice(0, 11);
  return n
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatarTelefone(valor) {
  const n = soNumeros(valor).slice(0, 11);
  if (n.length > 10) return n.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
  if (n.length > 6) return n.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
  if (n.length > 2) return n.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  return n;
}

function cpfValido(c) {
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  for (const t of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(c[i]) * (t + 1 - i);
    if (((soma * 10) % 11) % 10 !== Number(c[t])) return false;
  }
  return true;
}

function dataParaInput(valor) {
  if (!valor) return "";
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? "" : data.toISOString().slice(0, 10);
}

function formatarDataCriacao(valor) {
  const data = valor ? new Date(valor) : null;
  return data && !Number.isNaN(data.getTime()) ? data.toLocaleDateString("pt-BR") : "Não disponível";
}

/* ---------- MENU LATERAL (vem do conta.js) ---------- */
function montarMenu() {
  if (!temConta) {
    console.warn("[DadosPessoais] conta.js não foi carregado; mantendo o menu do HTML.");
    return;
  }
  Conta.renderMenu("config", NIVEL_PAGINA);
  tipoDoMenu = Conta.tipo();

  // O "Sair" é tratado aqui (confirmação + encerrar sessão no Supabase):
  // troca o link por uma cópia sem o listener do conta.js, que limparia o tipo mesmo se a pessoa cancelar.
  const sair = menuLateral.querySelector('a[data-id="sair"]');
  if (sair) sair.replaceWith(sair.cloneNode(true));
}

function ligarSair() {
  menuLateral.addEventListener("click", async (evento) => {
    const link = evento.target.closest("a");
    if (!link || !link.querySelector('img[src*="IconeSair"]')) return;
    evento.preventDefault();
    if (!confirm("Deseja realmente sair da sua conta?")) return;
    try {
      await supabase.auth.signOut();
    } catch (erro) {
      console.error("[DadosPessoais] sair:", erro);
    }
    if (temConta) Conta.limpar();
    window.location.replace("../../index.html");
  });
}

/* ---------- TIPO DE CONTA ---------- */
async function descobrirTipo(user) {
  const meta = user.user_metadata?.tipo;
  if (meta === "usuario" || meta === "profissional") return meta;
  const { data, error } = await supabase.from("profissionais").select("id").eq(COLUNA_ID, user.id).maybeSingle();
  if (error) console.warn("[DadosPessoais] tipo de conta:", error.message);
  return data ? "profissional" : "usuario";
}

function aplicarTipoNaTela() {
  document.querySelectorAll('[data-somente="profissional"]').forEach(el => {
    el.style.display = tipo === "profissional" ? "" : "none";
  });
  tipoConta.textContent = tipo === "profissional" ? "Profissional" : "Usuário";
  emailConfirmado.textContent = sessaoUser.email_confirmed_at ? "Sim" : "Não";
  // Mostra de qual conta são os dados (ajuda a perceber se está logado na conta errada)
  subtitulo.textContent = `Gerencie as informações pessoais da sua conta (${sessaoUser.email}).`;
}

/* ---------- FOTO ---------- */
function atualizarPrevia(url) {
  if (url) {
    previewFoto.src = url;
    previewFoto.hidden = false;
    btnRemoverFoto.hidden = false;
  } else {
    previewFoto.removeAttribute("src");
    previewFoto.hidden = true;
    btnRemoverFoto.hidden = true;
  }
}

previewFoto.addEventListener("error", () => { previewFoto.hidden = true; });

function liberarPrevia() {
  if (urlPrevia) {
    URL.revokeObjectURL(urlPrevia);
    urlPrevia = null;
  }
}

inputFoto.addEventListener("change", () => {
  const arquivo = inputFoto.files?.[0];
  if (!arquivo) return;

  if (!TIPOS_FOTO.includes(arquivo.type)) {
    inputFoto.value = "";
    return erroCampo("Use uma imagem JPG, PNG ou WEBP.");
  }
  if (arquivo.size > LIMITE_FOTO) {
    inputFoto.value = "";
    return erroCampo("A foto deve ter no máximo 2 MB.");
  }

  limparMensagem();
  liberarPrevia();
  fotoNova = arquivo;
  removerFoto = false;
  urlPrevia = URL.createObjectURL(arquivo);
  atualizarPrevia(urlPrevia);
});

btnRemoverFoto.addEventListener("click", () => {
  liberarPrevia();
  fotoNova = null;
  removerFoto = Boolean(registro?.[COLUNAS.foto]);
  inputFoto.value = "";
  atualizarPrevia(null);
});

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
  const { error } = await supabase.storage.from(BUCKET_FOTOS).remove([`${sessaoUser.id}/avatar`]);
  if (error) throw error;
}

/* ---------- PREENCHER O FORMULÁRIO ---------- */
function preencherFormulario() {
  campos.nomeCompleto.value = registro[COLUNAS.nome] || "";
  campos.cpf.value = formatarCPF(registro[COLUNAS.cpf]);
  campos.dataNascimento.value = dataParaInput(registro[COLUNAS.dataNascimento]);
  campos.email.value = sessaoUser.email || "";
  campos.telefone.value = formatarTelefone(registro[COLUNAS.telefone]);
  dataCriacao.textContent = formatarDataCriacao(registro[COLUNAS.criadoEm] || sessaoUser.created_at);

  liberarPrevia();
  fotoNova = null;
  removerFoto = false;
  inputFoto.value = "";
  atualizarPrevia(registro[COLUNAS.foto] || null);
}

campos.cpf.addEventListener("input", e => { e.target.value = formatarCPF(e.target.value); });
campos.telefone.addEventListener("input", e => { e.target.value = formatarTelefone(e.target.value); });
form.addEventListener("input", e => e.target.removeAttribute?.("aria-invalid"));

btnCancelar.addEventListener("click", () => {
  if (registro) preencherFormulario();
  limparMensagem();
});

/* ---------- SALVAR ---------- */
form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (!registro) return;

  const dados = {
    nome: campos.nomeCompleto.value.trim(),
    cpf: soNumeros(campos.cpf.value),
    dataNascimento: campos.dataNascimento.value,
    email: campos.email.value.trim().toLowerCase(),
    telefone: soNumeros(campos.telefone.value)
  };

  if (dados.nome.length < 3 || dados.nome.length > 150)
    return erroCampo("Informe seu nome completo (mínimo de 3 caracteres).", campos.nomeCompleto);
  if (!cpfValido(dados.cpf))
    return erroCampo("Informe um CPF válido.", campos.cpf);
  if (dados.dataNascimento && dados.dataNascimento > new Date().toISOString().slice(0, 10))
    return erroCampo("A data de nascimento não pode ser no futuro.", campos.dataNascimento);
  if (!emailOk(dados.email))
    return erroCampo("Informe um e-mail válido.", campos.email);
  if (dados.telefone && ![10, 11].includes(dados.telefone.length))
    return erroCampo("Informe um telefone válido com DDD.", campos.telefone);

  limparMensagem();
  btnSalvar.disabled = true;
  btnSalvar.textContent = "Salvando...";

  try {
    const alteracoes = {
      [COLUNAS.nome]: dados.nome,
      [COLUNAS.cpf]: dados.cpf,
      [COLUNAS.telefone]: dados.telefone || null,
      [COLUNAS.dataNascimento]: dados.dataNascimento || null,
      atualizado_em: new Date().toISOString() // o dados_pessoais.sql cria essa coluna em profissionais
    };

    if (fotoNova) {
      alteracoes[COLUNAS.foto] = await enviarFoto(fotoNova);
    } else if (removerFoto) {
      await apagarFoto();
      alteracoes[COLUNAS.foto] = null;
    }

    const { data, error } = await supabase
      .from(tabela)
      .update(alteracoes)
      .eq(COLUNA_ID, sessaoUser.id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error(`Não foi possível salvar. Confira a permissão de edição (RLS) da tabela ${tabela}.`);
    registro = data;

    // O e-mail é do login: troca pelo Supabase Auth, com link de confirmação
    let tipoMsg = "sucesso";
    let aviso = "Dados atualizados com sucesso.";
    if (dados.email !== (sessaoUser.email || "").toLowerCase()) {
      const { error: erroEmail } = await supabase.auth.updateUser({ email: dados.email });
      if (erroEmail) {
        console.error("[DadosPessoais] e-mail:", erroEmail);
        tipoMsg = "erro";
        aviso = `Dados salvos, mas não foi possível trocar o e-mail: ${textoErro(erroEmail)}`;
      } else {
        aviso = "Dados atualizados. Enviamos um link de confirmação para o novo e-mail.";
      }
    }

    preencherFormulario();
    mostrarMensagem(tipoMsg, aviso);
  } catch (erro) {
    console.error("[DadosPessoais]", erro);
    mostrarMensagem("erro", textoErro(erro));
  } finally {
    btnSalvar.disabled = false;
    btnSalvar.textContent = "Salvar alterações";
  }
});

/* ---------- INICIAR ---------- */
ligarSair();
montarMenu(); // já monta com o último tipo conhecido; é corrigido abaixo se estiver diferente

(async function iniciar() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!session) {
      window.location.replace(PAGINA_LOGIN);
      return;
    }
    sessaoUser = session.user;

    // O tipo real vem do banco; o conta.js guarda para as outras páginas
    tipo = await descobrirTipo(sessaoUser);
    tabela = TABELA_POR_TIPO[tipo];
    if (temConta) {
      Conta.definir(tipo);
      if (tipoDoMenu !== tipo) montarMenu();
    }
    aplicarTipoNaTela();

    const { data, error: erroBusca } = await supabase
      .from(tabela)
      .select("*")
      .eq(COLUNA_ID, sessaoUser.id)
      .maybeSingle();
    if (erroBusca) throw erroBusca;

    if (!data) {
      mostrarMensagem("erro", `Não encontramos o cadastro desta conta na tabela ${tabela}, por isso não é possível editar.`);
      return;
    }

    registro = data;
    preencherFormulario();
    btnSalvar.disabled = false;
  } catch (erro) {
    console.error("[DadosPessoais]", erro);
    mostrarMensagem("erro", textoErro(erro));
  }
})();