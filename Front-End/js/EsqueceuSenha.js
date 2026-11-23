import { esqueciSenha } from "./services/authService.js";
import { ler, aoEnviar, formDaPagina, mostrarMensagem } from "./utils/formUtils.js";

const form = formDaPagina("formEsqueciSenha", "form-esqueci-senha", "recuperar-form");
console.log("form encontrado:", form);

aoEnviar(form, async () => {
  const email = ler(form, ["email", "e-mail"]);
  console.log("email lido:", email);

  const msg = await esqueciSenha(email);
  console.log("resposta:", msg);

  mostrarMensagem(msg, "sucesso");
});