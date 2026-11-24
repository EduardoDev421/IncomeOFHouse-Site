/* apagarPlanta.js
   Módulo compartilhado (Projetos e Detalhe do projeto).
   Abre uma confirmação e apaga a planta no Supabase, só se for do profissional logado.

   Uso:
     import { apagarPlanta } from "./apagarPlanta.js";
     apagarPlanta({ id, titulo, aoApagar: () => { ... } });
*/
import { supabase } from "./lib/supabaseClient.js";

const TABELA = "plantas";
const COLUNA_DONO = "profissional_id";

function injetarEstilos() {
    if (document.getElementById("apagar-estilos")) return;

    const estilo = document.createElement("style");
    estilo.id = "apagar-estilos";
    estilo.textContent = `
.apagar-fundo{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.7);backdrop-filter:blur(2px);animation:apagar-fade .18s ease}
.apagar-caixa{width:100%;max-width:420px;background:#161616;color:#f2f2f2;border:1px solid #6b3a3a;border-radius:16px;padding:28px 24px 22px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.6);animation:apagar-subir .2s ease;font-family:inherit}
.apagar-icone{width:56px;height:56px;margin:0 auto 14px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;background:rgba(248,113,113,.15);color:#f87171;border:2px solid #f87171}
.apagar-caixa h3{margin:0 0 8px;font-size:20px;color:#fff}
.apagar-caixa p{margin:0 0 22px;font-size:15px;line-height:1.5;color:#cfcfcf;overflow-wrap:anywhere}
.apagar-caixa p.apagar-erro{color:#f87171;font-size:14px}
.apagar-acoes{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.apagar-botao{flex:1 1 140px;padding:11px 18px;border-radius:10px;border:1px solid #d4af6a;background:transparent;color:#d4af6a;font-weight:600;font-size:15px;cursor:pointer;font-family:inherit}
.apagar-botao.perigo{background:#c0392b;border-color:#c0392b;color:#fff}
.apagar-botao.perigo:hover:not(:disabled){background:#d9453a}
.apagar-botao:disabled{opacity:.6;cursor:not-allowed}
.apagar-botao:focus-visible{outline:2px solid #fff;outline-offset:2px}
@keyframes apagar-fade{from{opacity:0}to{opacity:1}}
@keyframes apagar-subir{from{transform:translateY(12px);opacity:0}to{transform:none;opacity:1}}
`;
    document.head.appendChild(estilo);
}

function textoErro(erro) {
    const m = String(erro?.message || "");
    const baixo = m.toLowerCase();

    if (erro?.code === "23503" || baixo.includes("foreign key")) {
        return "Esta planta tem avaliações, comentários ou outros registros ligados a ela e o banco não permite apagar. Veja o SQL no fim do arquivo apagarPlanta.js.";
    }
    if (baixo.includes("row-level security") || baixo.includes("permission denied")) {
        return "Sem permissão para apagar. Falta a regra de DELETE no Supabase (veja o SQL no fim do arquivo).";
    }
    if (baixo.includes("failed to fetch")) return "Sem conexão com o servidor.";
    return m || "Erro desconhecido.";
}

async function excluir(id) {
    const { data: { session }, error: erroSessao } = await supabase.auth.getSession();
    if (erroSessao) throw erroSessao;
    if (!session) throw new Error("Você precisa entrar na sua conta para apagar a planta.");

    const { data, error } = await supabase.from(TABELA)
        .delete()
        .eq("id", id)
        .eq(COLUNA_DONO, session.user.id)
        .select("id");

    if (error) throw error;

    if (!data || !data.length) {
        throw new Error("Nada foi apagado. A planta não é sua ou falta a regra de DELETE no Supabase (veja o SQL no fim do arquivo).");
    }
}

export function apagarPlanta({ id, titulo, aoApagar }) {
    injetarEstilos();
    document.querySelector(".apagar-fundo")?.remove();

    const anterior = document.activeElement;

    const fundo = document.createElement("div");
    fundo.className = "apagar-fundo";

    const caixa = document.createElement("div");
    caixa.className = "apagar-caixa";
    caixa.setAttribute("role", "alertdialog");
    caixa.setAttribute("aria-modal", "true");
    caixa.setAttribute("aria-labelledby", "apagar-titulo");

    const icone = document.createElement("div");
    icone.className = "apagar-icone";
    icone.setAttribute("aria-hidden", "true");
    icone.textContent = "!";

    const h3 = document.createElement("h3");
    h3.id = "apagar-titulo";
    h3.textContent = "Apagar planta?";

    const texto = document.createElement("p");
    texto.textContent = `"${titulo || "Esta planta"}" será apagada de forma permanente, junto com o que estiver ligado a ela. Essa ação não pode ser desfeita.`;

    const acoes = document.createElement("div");
    acoes.className = "apagar-acoes";

    const cancelar = document.createElement("button");
    cancelar.type = "button";
    cancelar.className = "apagar-botao";
    cancelar.textContent = "Cancelar";

    const confirmar = document.createElement("button");
    confirmar.type = "button";
    confirmar.className = "apagar-botao perigo";
    confirmar.textContent = "Apagar";

    acoes.append(cancelar, confirmar);
    caixa.append(icone, h3, texto, acoes);
    fundo.appendChild(caixa);
    document.body.appendChild(fundo);

    let ocupado = false;

    function fechar() {
        document.removeEventListener("keydown", aoTeclar);
        fundo.remove();
        if (anterior && anterior.focus) anterior.focus();
    }

    function aoTeclar(evento) {
        if (evento.key === "Escape" && !ocupado) fechar();
    }

    cancelar.addEventListener("click", fechar);
    fundo.addEventListener("click", (e) => { if (e.target === fundo && !ocupado) fechar(); });
    document.addEventListener("keydown", aoTeclar);

    confirmar.addEventListener("click", async () => {
        ocupado = true;
        confirmar.disabled = true;
        cancelar.disabled = true;
        confirmar.textContent = "Apagando...";
        texto.className = "";

        try {
            await excluir(id);
            fechar();
            if (aoApagar) aoApagar();
        } catch (erro) {
            console.error("[Apagar planta]", erro);
            ocupado = false;
            confirmar.disabled = false;
            cancelar.disabled = false;
            confirmar.textContent = "Tentar de novo";
            texto.className = "apagar-erro";
            texto.textContent = textoErro(erro);
        }
    });

    cancelar.focus();
}
