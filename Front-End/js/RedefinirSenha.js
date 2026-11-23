import { redefinirSenha, obterSessao } from "./services/authService.js";
import { ler, aoEnviar, formDaPagina, mostrarMensagem } from "./utils/formUtils.js";

const form = formDaPagina("formRedefinirSenha", "form-redefinir-senha", "redefinir-form");
const novaSenha = document.getElementById("novaSenha");
const forca = document.getElementById("forcaSenha");
const forcaTexto = document.getElementById("forcaTexto");

const rotulos = ["", "Fraca", "Média", "Boa", "Forte"];

function calcularForca(valor) {
  if (!valor) return 0;
  let pontos = 0;
  if (valor.length >= 6) pontos++;
  if (valor.length >= 10) pontos++;
  if (/[A-Z]/.test(valor) && /[a-z]/.test(valor)) pontos++;
  if (/\d/.test(valor) && /[^A-Za-z0-9]/.test(valor)) pontos++;
  return Math.max(pontos, 1);
}

document.querySelectorAll(".toggle-senha").forEach((botao) => {
  botao.addEventListener("click", () => {
    const input = document.getElementById(botao.dataset.alvo);
    const mostrar = input.type === "password";
    input.type = mostrar ? "text" : "password";
    botao.classList.toggle("visivel", mostrar);
    botao.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
  });
});

novaSenha.addEventListener("input", () => {
  const nivel = calcularForca(novaSenha.value);
  forca.dataset.nivel = nivel;
  forcaTexto.textContent = rotulos[nivel];
});

aoEnviar(form, async () => {
  const sessao = await obterSessao();
  if (!sessao) {
    mostrarMensagem("Link inválido ou expirado. Peça um novo na tela “Esqueci a senha”.", "erro");
    return;
  }

  const senha = ler(form, ["novaSenha", "senha"]);
  const confirmar = ler(form, ["confirmarSenha", "confirmar"]);

  const msg = await redefinirSenha(senha, confirmar);
  mostrarMensagem(msg, "sucesso");

  setTimeout(() => {
    window.location.href = "../pages/login.html";
  }, 2000);
});