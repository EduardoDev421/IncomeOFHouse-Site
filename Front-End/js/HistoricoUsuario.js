// Front-End/js/historico.js
// Pop-up "Atividades" (histórico estilo Google) do perfil do usuário.
// Apagar do histórico apenas oculta a linha (tabela atividades_ocultas);
// favoritos e pedidos continuam intactos.
import { buscarAtividades, ocultarAtividades } from "./services/PerfilServices.js";

const LIMITE_HISTORICO = 300;

let userId = null;
let aoAlterar = () => {};
let janelaHist = null;
let atividadesHist = [];

/**
 * Liga o botão "Ver todas as atividades" ao pop-up do histórico.
 * @param {string} idUsuario  id do usuário logado (supabase.auth)
 * @param {Function} callbackAlterou  chamada após excluir/apagar (para atualizar o resumo da página)
 */
export function ligarHistorico(idUsuario, callbackAlterou) {
  userId = idUsuario;
  if (typeof callbackAlterou === "function") aoAlterar = callbackAlterou;

  const botao = document.querySelector(".BtnAtividadesDetalhes a");
  if (!botao || botao.dataset.historico) return;
  botao.dataset.historico = "1";
  botao.addEventListener("click", evento => {
    evento.preventDefault();
    abrirHistorico();
  });
}

function criarJanelaHistorico() {
  janelaHist = document.createElement("div");
  janelaHist.className = "edicao-modal";
  janelaHist.hidden = true;
  janelaHist.innerHTML =
    '<div class="edicao-caixa historico-caixa" role="dialog" aria-modal="true" aria-labelledby="historicoTitulo">' +
      '<div class="edicao-topo">' +
        '<h3 id="historicoTitulo">Atividades</h3>' +
        '<button type="button" class="edicao-fechar" aria-label="Fechar">✕</button>' +
      "</div>" +
      '<div class="historico-barra">' +
        '<span class="historico-total"></span>' +
        '<button type="button" class="historico-apagar-tudo">Apagar tudo</button>' +
      "</div>" +
      '<div class="edicao-corpo historico-corpo">' +
        '<div class="historico-msg" role="alert" hidden></div>' +
        '<div class="historico-lista"></div>' +
        '<p class="historico-vazio" hidden>Nenhuma atividade para mostrar.</p>' +
      "</div>" +
    "</div>";
  document.body.appendChild(janelaHist);

  janelaHist.addEventListener("click", evento => {
    if (evento.target === janelaHist || evento.target.closest(".edicao-fechar")) fecharHistorico();
  });
  document.addEventListener("keydown", evento => {
    if (evento.key === "Escape" && !janelaHist.hidden) fecharHistorico();
  });
  janelaHist.querySelector(".historico-lista").addEventListener("click", evento => {
    const botao = evento.target.closest(".historico-excluir");
    if (botao) excluirAtividade(Number(botao.dataset.indice), botao);
  });
  janelaHist.querySelector(".historico-apagar-tudo").addEventListener("click", apagarHistorico);
}

async function abrirHistorico() {
  if (!janelaHist) criarJanelaHistorico();
  janelaHist.hidden = false;
  document.body.style.overflow = "hidden";
  mensagemHistorico("");

  const lista = janelaHist.querySelector(".historico-lista");
  lista.textContent = "Carregando...";

  try {
    atividadesHist = await buscarAtividades(userId, LIMITE_HISTORICO);
    renderizarHistorico();
  } catch (erro) {
    console.error("[Histórico]", erro);
    lista.textContent = "";
    mensagemHistorico("Não foi possível carregar as atividades.");
  }
}

function fecharHistorico() {
  janelaHist.hidden = true;
  document.body.style.overflow = "";
}

function mensagemHistorico(texto) {
  const msg = janelaHist.querySelector(".historico-msg");
  msg.textContent = texto;
  msg.hidden = !texto;
}

function rotuloDia(data) {
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return "Sem data";

  const inicio = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dias = Math.round((inicio(new Date()) - inicio(d)) / 86400000);

  if (dias === 0) return "Hoje";
  if (dias === 1) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

function horaAtividade(data) {
  const d = new Date(data);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function renderizarHistorico() {
  const lista = janelaHist.querySelector(".historico-lista");
  const vazio = janelaHist.querySelector(".historico-vazio");
  const total = janelaHist.querySelector(".historico-total");
  const botaoApagarTudo = janelaHist.querySelector(".historico-apagar-tudo");

  lista.replaceChildren();
  vazio.hidden = atividadesHist.length > 0;
  botaoApagarTudo.disabled = atividadesHist.length === 0;
  total.textContent = atividadesHist.length
    ? `${atividadesHist.length} ${atividadesHist.length === 1 ? "atividade" : "atividades"}`
    : "";

  let diaAtual = null;
  let grupo = null;

  atividadesHist.forEach((item, indice) => {
    const dia = rotuloDia(item.data);
    if (dia !== diaAtual) {
      diaAtual = dia;
      const titulo = document.createElement("h4");
      titulo.className = "historico-dia";
      titulo.textContent = dia;
      grupo = document.createElement("div");
      grupo.className = "historico-grupo";
      lista.append(titulo, grupo);
    }

    const linha = document.createElement("div");
    linha.className = "historico-item";

    const info = document.createElement("div");
    info.className = "historico-info";
    const texto = document.createElement("span");
    texto.className = "historico-texto";
    texto.textContent = item.texto;
    const horario = document.createElement("small");
    horario.className = "historico-hora";
    horario.textContent = horaAtividade(item.data);
    info.append(texto, horario);

    const excluir = document.createElement("button");
    excluir.type = "button";
    excluir.className = "historico-excluir";
    excluir.dataset.indice = indice;
    excluir.setAttribute("aria-label", "Excluir atividade");
    excluir.textContent = "✕";

    linha.append(info, excluir);
    grupo.append(linha);
  });
}

async function excluirAtividade(indice, botao) {
  const item = atividadesHist[indice];
  if (!item) return;

  botao.disabled = true;
  mensagemHistorico("");
  try {
    await ocultarAtividades(userId, [item]);
    atividadesHist.splice(indice, 1);
    renderizarHistorico();
    aoAlterar();
  } catch (erro) {
    console.error("[Histórico]", erro);
    botao.disabled = false;
    mensagemHistorico("Não foi possível excluir a atividade.");
  }
}

async function apagarHistorico() {
  if (!atividadesHist.length) return;

  const ok = confirm(
    `Apagar ${atividadesHist.length} ${atividadesHist.length === 1 ? "atividade" : "atividades"} do histórico?\n\n` +
    "Seus favoritos e pedidos não serão apagados."
  );
  if (!ok) return;

  const botao = janelaHist.querySelector(".historico-apagar-tudo");
  botao.disabled = true;
  mensagemHistorico("");
  try {
    await ocultarAtividades(userId, atividadesHist);
    atividadesHist = [];
    renderizarHistorico();
    aoAlterar();
  } catch (erro) {
    console.error("[Histórico]", erro);
    botao.disabled = false;
    mensagemHistorico("Não foi possível apagar o histórico.");
  }
}