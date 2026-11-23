// Front-End/js/login.js  (carregar no HTML com type="module")
import { entrar, obterSessao, tipoDaConta } from "./services/authService.js";
import { ler, aoEnviar, formDaPagina, mostrarMensagem, ativarOlhosDeSenha } from "./utils/formUtils.js";

// AJUSTE para as páginas reais de cada perfil.
const DESTINO = {
  usuario: "PerfilUsuario.html",
  profissional: "PerfilProfissional.html",
};

const form = formDaPagina("formLogin", "form-login", "login-form");

ativarOlhosDeSenha(); // olhinho de mostrar/ocultar a senha

// Já está logado? Vai direto para o perfil.
obterSessao().then(async (sessao) => {
  if (sessao) window.location.href = DESTINO[await tipoDaConta(sessao.user)] || DESTINO.usuario;
});

aoEnviar(form, async () => {
  const email = ler(form, ["email", "e-mail"]);
  const senha = ler(form, ["senha", "password"], { aparar: false });
  const { tipo } = await entrar(email, senha);
  mostrarMensagem("Login realizado!", "sucesso");
  window.location.href = DESTINO[tipo] || DESTINO.usuario;
});