// Front-End/js/utils/formUtils.js
// Ajudantes de formulário: acham o campo pelo name OU pelo id (várias grafias),
// mostram mensagens (usando o seu mensagensErros.js / window.Mensagem) e travam o botão ao enviar.

let formAtual = null;

export function achar(form, nomes) {
  for (const n of nomes) {
    const el = form.querySelector(`[name="${n}"], [id="${n}"]`);
    if (el) return el;
  }
  return null;
}

export function ler(form, nomes, { aparar = true } = {}) {
  const el = achar(form, nomes);
  if (!el) return "";
  return aparar ? String(el.value).trim() : String(el.value);
}

// tipo: "erro" | "sucesso" | "aviso" | "info"
export function mostrarMensagem(texto, tipo = "erro", opcoes = {}) {
  const container = formAtual || document.querySelector("form");

  // 1) Usa o card do seu mensagensErros.js (window.Mensagem), no topo do formulário
  if (window.Mensagem && container) {
    window.Mensagem.mostrar(container, tipo, texto, { posicao: "inicio", ...opcoes });
    return;
  }

  // 2) Se não tiver, usa um <p id="mensagem">, se existir
  const alvo = document.querySelector("#mensagem, .mensagem, [data-mensagem]");
  if (alvo) {
    alvo.textContent = texto;
    alvo.dataset.tipo = tipo;
    alvo.hidden = false;
    return;
  }

  // 3) Último recurso
  if (tipo === "erro") alert(texto);
}

export function limparMensagem() {
  const container = formAtual || document.querySelector("form");
  if (window.Mensagem && container) window.Mensagem.limpar(container);
  const alvo = document.querySelector("#mensagem, .mensagem, [data-mensagem]");
  if (alvo) { alvo.textContent = ""; alvo.hidden = true; }
}

export function aoEnviar(form, acao) {
  formAtual = form;
  form.setAttribute("novalidate", ""); // as validações e mensagens são feitas pelo JS
  form.addEventListener("submit", async (e) => {
    e.preventDefault();               // impede a página de recarregar
    limparMensagem();
    const botao = form.querySelector('[type="submit"], button:not([type])');
    const textoOriginal = botao?.textContent;
    if (botao) { botao.disabled = true; botao.textContent = "Aguarde..."; }
    try {
      await acao();
    } catch (erro) {
      console.error(erro);
      mostrarMensagem(erro.message || "Algo deu errado. Tente novamente.", "erro");
    } finally {
      if (botao) { botao.disabled = false; botao.textContent = textoOriginal; }
    }
  });
}

export function formDaPagina(...ids) {
  for (const id of ids) { const f = document.getElementById(id); if (f) return f; }
  return document.querySelector("form");
}

/* ---------------------------------------------------------------
   OLHINHO DE SENHA
   ativarOlhosDeSenha() coloca o botão de mostrar/ocultar em todos os
   <input type="password"> da página. O estilo é injetado por aqui mesmo,
   então não precisa de CSS nem de <script> extra no HTML.
---------------------------------------------------------------- */
const ICONE_OLHO =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';

const ICONE_OLHO_RISCADO =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>' +
  '<line x1="1" y1="1" x2="23" y2="23"/></svg>';

const CSS_OLHO = `
.campo-senha { position: relative !important; display: block !important; width: 100% !important; }
.campo-senha > input {
  display: block !important; width: 100% !important; box-sizing: border-box !important;
  padding-right: 48px !important; margin-bottom: 0 !important;
}
/* "all: unset" apaga o estilo que o CSS da página aplica em todo <button> (ex.: .FormLogin button) */
.campo-senha > .botao-olho {
  all: unset !important;
  position: absolute !important; top: 50% !important; right: 12px !important;
  transform: translateY(-50%) !important;
  display: flex !important; align-items: center !important; justify-content: center !important;
  box-sizing: border-box !important; width: 28px !important; height: 28px !important;
  margin: 0 !important; padding: 0 !important; border-radius: 6px !important;
  background: transparent !important; color: rgba(255, 255, 255, 0.55) !important;
  cursor: pointer !important; line-height: 0 !important;
}
.campo-senha > .botao-olho svg { display: block !important; width: 20px !important; height: 20px !important; pointer-events: none !important; }
.campo-senha > .botao-olho:hover,
.campo-senha > .botao-olho:focus-visible {
  color: #d4af6a !important; background: transparent !important;
  transform: translateY(-50%) !important;
}
.campo-senha > .botao-olho:focus-visible { outline: 2px solid #d4af6a !important; outline-offset: 2px !important; }
`;

let contadorOlho = 0;

// Quando o campo vira type="text", o CSS que mira input[type="password"] (ex.: .FormLogin input[type="password"])
// deixa de valer e o campo perde o visual. Para evitar isso, guardamos o visual atual do campo
// e o reaplicamos enquanto a senha estiver visível.
function guardarVisualDoCampo(input) {
  let estilo = document.getElementById("estilo-olho-senha-campos");
  if (!estilo) {
    estilo = document.createElement("style");
    estilo.id = "estilo-olho-senha-campos";
    document.head.appendChild(estilo);
  }

  const cs = getComputedStyle(input);
  const id = `olho${++contadorOlho}`;
  input.setAttribute("data-olho-id", id);

  const propriedades = [
    "height", "min-height", "padding-top", "padding-bottom", "padding-left",
    "background-color", "border-radius", "color", "font-size", "font-family",
    "font-weight", "line-height", "letter-spacing", "outline-style",
  ];
  const declaracoes = propriedades
    .map((p) => [p, cs.getPropertyValue(p)])
    .filter(([, v]) => v)
    .map(([p, v]) => `${p}: ${v} !important;`)
    .join(" ");

  const seletor = `.campo-senha > input[data-olho-id="${id}"].senha-visivel`;
  estilo.textContent +=
    `\n${seletor} { ${declaracoes} border-style: ${cs.borderTopStyle} !important; border-width: ${cs.borderTopWidth} !important; }` +
    `\n${seletor}:not(:focus) { border-color: ${cs.borderTopColor} !important; }`;
}

export function ativarOlhosDeSenha(raiz = document) {
  if (!document.getElementById("estilo-olho-senha")) {
    const estilo = document.createElement("style");
    estilo.id = "estilo-olho-senha";
    estilo.textContent = CSS_OLHO;
    document.head.appendChild(estilo);
  }

  raiz.querySelectorAll('input[type="password"]').forEach((input) => {
    if (input.dataset.olho) return; // já tem olhinho
    input.dataset.olho = "1";

    // A margem de baixo do campo passa para a caixa, para o olhinho ficar centralizado no campo
    const margemBaixo = getComputedStyle(input).marginBottom;
    guardarVisualDoCampo(input);

    const caixa = document.createElement("span");
    caixa.className = "campo-senha";
    caixa.style.marginBottom = margemBaixo;
    input.parentNode.insertBefore(caixa, input);
    caixa.appendChild(input);

    const botao = document.createElement("button");
    botao.type = "button"; // não envia o formulário
    botao.className = "botao-olho";
    botao.title = "Mostrar senha";
    botao.setAttribute("aria-label", "Mostrar senha");
    botao.setAttribute("aria-pressed", "false");
    botao.innerHTML = ICONE_OLHO;
    botao.addEventListener("mousedown", (e) => e.preventDefault()); // mantém o foco no campo

    botao.addEventListener("click", () => {
      const mostrando = input.type === "password";
      input.type = mostrando ? "text" : "password";
      input.classList.toggle("senha-visivel", mostrando);
      botao.innerHTML = mostrando ? ICONE_OLHO_RISCADO : ICONE_OLHO;
      botao.title = mostrando ? "Ocultar senha" : "Mostrar senha";
      botao.setAttribute("aria-label", botao.title);
      botao.setAttribute("aria-pressed", String(mostrando));
      input.focus();
    });

    caixa.appendChild(botao);
  });
}