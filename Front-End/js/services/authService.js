// Front-End/js/services/authService.js
// Login, cadastro (usuário e profissional), 2FA e recuperação de senha via Supabase Auth.
// Usa o MESMO cliente de js/lib/supabaseClient.js (evita "Multiple GoTrueClient instances").
// Só a chave pública (publishable) fica no front. A secreta NUNCA entra aqui.
import { supabase } from "../lib/supabaseClient.js";

// Reexporta para as páginas que já importam { supabase } daqui continuarem funcionando.
export { supabase };

// A página RedefinirSenha.html fica na MESMA pasta da página "Esqueceu a senha".
// O endereço é montado a partir da página atual (funciona no Live Server e no GitHub Pages).
// Cadastre esse endereço em Supabase > Authentication > URL Configuration > Redirect URLs.
const PAGINA_REDEFINIR_SENHA = "RedefinirSenha.html";

/* ---------------- validações ---------------- */
const soNumeros = (v) => String(v || "").replace(/\D/g, "");
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;

function cpfOk(v) {
  const c = soNumeros(v);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  for (const t of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(c[i]) * (t + 1 - i);
    if (((soma * 10) % 11) % 10 !== Number(c[t])) return false;
  }
  return true;
}

function validarBase(d) {
  const nome = String(d.nome || "").trim();
  if (nome.length < 3 || nome.length > 150) throw new Error("O nome deve ter entre 3 e 150 caracteres.");
  if (!emailOk(String(d.email || "").trim())) throw new Error("Informe um e-mail válido.");
  if (String(d.senha || "").length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");
  if (!cpfOk(d.cpf)) throw new Error("Informe um CPF válido.");
  if (![10, 11].includes(soNumeros(d.telefone).length)) throw new Error("Informe um telefone válido.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.dataNascimento || "")) throw new Error("Informe a data de nascimento.");
}

function traduzirErro(erro) {
  console.error("Erro do Supabase:", erro); // o texto original fica no console, para depuração

  const codigo = String(erro?.code || "").toLowerCase();
  const m = String(erro?.message || "").toLowerCase();

  const porCodigo = {
    invalid_credentials: "E-mail ou senha incorretos.",
    email_not_confirmed: "Confirme seu e-mail antes de entrar (veja sua caixa de entrada).",
    user_already_exists: "Já existe uma conta com esse e-mail ou CPF.",
    email_exists: "Já existe uma conta com esse e-mail.",
    email_address_invalid: "Não foi possível usar esse e-mail. Confira se está correto ou tente outro.",
    email_address_not_authorized: "Esse e-mail não está autorizado a receber mensagens. Tente outro.",
    weak_password: "A senha é muito fraca. Use pelo menos 6 caracteres.",
    same_password: "A nova senha deve ser diferente da atual.",
    over_email_send_rate_limit: "Muitos e-mails enviados. Aguarde alguns minutos e tente de novo.",
    over_request_rate_limit: "Muitas tentativas. Aguarde um pouco e tente de novo.",
    signup_disabled: "Os cadastros estão temporariamente desativados.",
    validation_failed: "Dados inválidos. Confira os campos e tente de novo.",
    user_not_found: "Conta não encontrada.",
    otp_expired: "O link expirou. Peça um novo.",
    session_expired: "Sua sessão expirou. Entre novamente.",
    session_not_found: "Sua sessão expirou. Entre novamente.",
    refresh_token_not_found: "Sua sessão expirou. Entre novamente.",
    mfa_verification_failed: "Código incorreto ou expirado. Confira e tente de novo.",
    mfa_challenge_expired: "O código expirou. Digite o código atual do aplicativo.",
  };
  if (porCodigo[codigo]) return porCodigo[codigo];

  // Quando o Supabase não manda o código, reconhece pelo texto
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar (veja sua caixa de entrada).";
  // "Database error saving new user" = o gatilho do banco falhou ao criar o perfil
  // (constraint, coluna faltando, etc.). NÃO significa que a conta já existe.
  if (m.includes("database error saving"))
    return "O banco recusou o cadastro ao salvar o perfil. Confira os dados e tente de novo.";
  if (m.includes("already registered") || m.includes("already exists") || m.includes("duplicate"))
    return "Já existe uma conta com esse e-mail ou CPF.";
  if (m.includes("email address") && m.includes("invalid"))
    return "Não foi possível usar esse e-mail. Confira se está correto ou tente outro.";
  if (m.includes("rate limit") || m.includes("too many") || m.includes("seconds"))
    return "Muitas tentativas. Aguarde um pouco e tente de novo.";
  if (m.includes("same password") || m.includes("different from the old"))
    return "A nova senha deve ser diferente da atual.";
  if (m.includes("password") && (m.includes("least") || m.includes("weak") || m.includes("short")))
    return "A senha é muito curta ou fraca. Use pelo menos 6 caracteres.";
  if (m.includes("failed to fetch") || m.includes("network") || m.includes("fetch"))
    return "Sem conexão com o servidor. Confira sua internet e tente de novo.";
  if (m.includes("expired") || m.includes("jwt") || m.includes("token"))
    return "O link ou a sessão expirou. Peça um novo ou entre novamente.";

  // Mensagens que já estão em português (as nossas) passam direto; o resto vira texto genérico.
  const jaEmPortugues = /[áàâãéêíóôõúç]/i.test(erro?.message || "") || /\b(informe|senha|e-mail|cpf|aceite|selecione)\b/i.test(erro?.message || "");
  return jaEmPortugues ? erro.message : "Não foi possível concluir a operação. Tente novamente.";
}

/* ---------------- cadastro ---------------- */
// O perfil (linha em usuarios/profissionais) é criado pelo trigger do banco a partir
// destes metadados. Não grave nas tabelas daqui.
async function criarConta(tipo, d, extra = {}) {
  validarBase(d);
  const { data, error } = await supabase.auth.signUp({
    email: d.email.trim().toLowerCase(),
    password: d.senha,
    options: {
      data: {
        tipo,
        nome: d.nome.trim(),
        cpf: soNumeros(d.cpf),
        telefone: soNumeros(d.telefone),
        data_nascimento: d.dataNascimento,
        ...extra,
      },
    },
  });
  if (error) throw new Error(traduzirErro(error));
  // Com confirmação de e-mail ligada, não há sessão ainda.
  return { precisaConfirmarEmail: !data.session, usuario: data.user };
}

export function cadastrarUsuario(d) {
  return criarConta("usuario", d);
}

export function cadastrarProfissional(d) {
  const cidade = String(d.cidade || "").trim();
  const estado = String(d.estado || "").trim().toUpperCase();
  const registro = String(d.registro || "").trim();
  const profissao = String(d.profissao || "").trim();
  if (registro.length < 2 || registro.length > 80) throw new Error("Informe um registro profissional válido.");
  if (cidade.length < 2 || cidade.length > 100) throw new Error("Informe uma cidade válida.");
  if (!/^[A-Z]{2}$/.test(estado)) throw new Error("Selecione um estado válido.");
  if (!profissao) throw new Error("Selecione uma profissão.");
  return criarConta("profissional", d, { registro, profissao, cidade, estado });
}

/* ---------------- login / sessão ---------------- */
// Retorna:
//  { usuario, tipo }                         -> login completo
//  { precisaSegundaEtapa: true, usuario }    -> conta com 2FA: peça o código e chame verificarSegundaEtapa()
export async function entrar(email, senha) {
  if (!emailOk(String(email || "").trim()) || !senha) throw new Error("Informe o e-mail e a senha.");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: senha,
  });
  if (error) throw new Error(traduzirErro(error));

  const { data: aal, error: erroAal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (erroAal) throw new Error(traduzirErro(erroAal));
  if (aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    return { precisaSegundaEtapa: true, usuario: data.user };
  }

  const tipo = await tipoDaConta(data.user);
  return { usuario: data.user, tipo }; // tipo: "usuario" | "profissional"
}

// Segunda etapa do login: valida o código de 6 dígitos do aplicativo autenticador.
export async function verificarSegundaEtapa(codigo) {
  if (!/^\d{6}$/.test(String(codigo || ""))) throw new Error("Digite o código de 6 dígitos.");
  const { data: fatores, error: e1 } = await supabase.auth.mfa.listFactors();
  if (e1) throw new Error(traduzirErro(e1));
  const fator = fatores.totp[0];
  if (!fator) throw new Error("Nenhum autenticador cadastrado nesta conta.");
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: fator.id, code: String(codigo) });
  if (error) throw new Error(traduzirErro(error));
  return { tipo: await tipoDaConta() };
}

export async function sair() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(traduzirErro(error));
}

export async function obterSessao() {
  const { data } = await supabase.auth.getSession();
  return data.session; // null se não estiver logado
}

/** "usuario" | "profissional" | null */
export async function tipoDaConta(user) {
  const u = user || (await supabase.auth.getUser()).data?.user;
  if (!u) return null;
  const meta = u.user_metadata?.tipo;
  if (meta === "usuario" || meta === "profissional") return meta;
  const { data: p } = await supabase.from("profissionais").select("id").eq("id", u.id).maybeSingle();
  return p ? "profissional" : "usuario";
}

/* ---------------- destino do ícone de perfil / pós-login ---------------- */
const PAGINA_PERFIL = {
  usuario: "perfilUsuario.html",
  profissional: "PerfilProfissional.html",
};
const PAGINA_LOGIN = "login.html";

/**
 * Devolve o endereço certo para o ícone de perfil:
 *  - sem sessão        -> login.html
 *  - conta usuário     -> perfilUsuario.html
 *  - conta profissional-> PerfilProfissional.html
 * `pasta` é o caminho até a pasta pages/ a partir da página atual:
 *  "pages/" no index.html, "./" dentro de pages/.
 */
export async function paginaDoPerfil(pasta = "./") {
  const sessao = await obterSessao();
  if (!sessao) return pasta + PAGINA_LOGIN;
  const tipo = await tipoDaConta(sessao.user);
  return pasta + (PAGINA_PERFIL[tipo] || PAGINA_LOGIN);
}

/**
 * Liga o ícone de perfil: ao clicar, leva ao login ou ao perfil do tipo de conta logada.
 * Ex.: ligarIconePerfil("#iconePerfil", "pages/")
 */
export function ligarIconePerfil(seletor, pasta = "./") {
  const el = document.querySelector(seletor);
  if (!el) return;
  el.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      window.location.href = await paginaDoPerfil(pasta);
    } catch (erro) {
      console.error("Não foi possível abrir o perfil:", erro);
      window.location.href = pasta + PAGINA_LOGIN;
    }
  });
}

/* ---------------- esqueci a senha ---------------- */
// Passo 1 (tela "Esqueci a senha"): envia o e-mail com o link.
export async function esqueciSenha(email) {
  if (!emailOk(String(email || "").trim())) throw new Error("Informe um e-mail válido.");
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: new URL(PAGINA_REDEFINIR_SENHA, window.location.href).href,
  });
  if (error) throw new Error(traduzirErro(error));
  // Mensagem neutra: não revela se o e-mail existe.
  return "Se esse e-mail estiver cadastrado, você receberá um link para redefinir a senha.";
}

// Passo 2 (tela "Redefinir senha", aberta pelo link do e-mail): define a nova senha.
// O Supabase cria uma sessão temporária ao abrir o link; esta função só precisa da nova senha.
export async function redefinirSenha(novaSenha, confirmacao) {
  if (String(novaSenha || "").length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");
  if (novaSenha !== confirmacao) throw new Error("As senhas não conferem.");
  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) throw new Error(traduzirErro(error));
  await supabase.auth.signOut();
  return "Senha alterada. Entre com a nova senha.";
}

/** Chame na tela de redefinição: dispara quando o link do e-mail é aberto. */
export function aoAbrirLinkDeRecuperacao(callback) {
  const { data } = supabase.auth.onAuthStateChange((evento) => {
    if (evento === "PASSWORD_RECOVERY") callback();
  });
  return () => data.subscription.unsubscribe();
}