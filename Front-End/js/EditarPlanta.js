/* editarPlanta.js
   Abre com: editarPlanta.html?id=<id da planta>
   Lê e atualiza a tabela "plantas" direto no Supabase (como o DetalheProjeto.js).
   Só o profissional dono da planta consegue carregar e salvar. */
import { supabase } from "./lib/supabaseClient.js";

const TABELA = "plantas";
const COLUNA_DONO = "profissional_id";

const PAGINA_LOGIN = "./Login.html";
const PAGINA_LISTA = "./Projetos.html";

// Nomes possíveis de cada coluna (o script usa o que existir na sua tabela)
const COLUNAS = {
    titulo: ["titulo", "nome"],
    descricao: ["descricao"],
    categoria: ["categoria", "tipo"],
    estilo: ["estilo"],
    quartos: ["quartos"],
    banheiros: ["banheiros"],
    garagem: ["vagas", "vagas_garagem", "garagem"],
    area: ["area", "area_total"],
    preco: ["preco", "valor"],
    imagem: ["foto_url", "imagem_url", "capa_url", "foto", "imagem"],
    destaques: ["destaques"],
    distribuicao: ["distribuicao", "distribuicao_ambientes", "distribuicaoAmbientes"]
};

const $ = (id) => document.getElementById(id);

const formulario = $("formEditarPlanta");
const estado = $("estadoEdicao");
const listaDestaques = $("listaDestaques");
const campoDestaque = $("destaquesPersonalizados");
const campoPreco = $("preco");

const PRECO_MAXIMO = 999999999.99;
const AREA_MAXIMA = 100000;
const TIPOS_IMAGEM = ["image/jpeg", "image/pjpeg", "image/png", "image/webp"];
const EXTENSOES_IMAGEM = /\.(jpe?g|jfif|png|webp)$/i;
const LARGURA_MAXIMA_IMAGEM = 1600;
const QUALIDADE_JPEG = 0.85;

const idPlanta = new URLSearchParams(location.search).get("id");

let linhaAtual = null;   // linha da tabela como veio do banco
let usuarioId = null;

/* =========================================================
   Colunas
========================================================= */

// Coluna que tem valor; se nenhuma tiver, a primeira que existe na linha
function chave(linha, nomes) {
    const comValor = nomes.find((n) => n in linha && linha[n] != null && linha[n] !== "");
    return comValor || nomes.find((n) => n in linha) || null;
}

function ler(linha, campo) {
    const k = chave(linha, COLUNAS[campo]);
    return k ? linha[k] : undefined;
}

function listaDe(valor) {
    return Array.isArray(valor)
        ? valor.map(String)
        : String(valor ?? "").split(/\r?\n|,/).map((t) => t.trim()).filter(Boolean);
}

/* =========================================================
   Utilidades
========================================================= */

function formatarMoeda(texto) {
    const digitos = String(texto).replace(/\D/g, "").slice(0, 11);
    if (!digitos) return "";
    return "R$ " + (Number(digitos) / 100).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function lerPreco(texto) {
    const digitos = String(texto).replace(/\D/g, "");
    return digitos ? Number(digitos) / 100 : NaN;
}

function urlDoProjeto() {
    return idPlanta
        ? `./DetalheProjeto.html?id=${encodeURIComponent(idPlanta)}`
        : PAGINA_LISTA;
}

function mostrarEstado(mensagem, erro, link) {
    estado.replaceChildren(document.createTextNode(mensagem + " "));
    if (link) {
        const a = document.createElement("a");
        a.href = link.href;
        a.textContent = link.texto;
        estado.append(a);
    }
    estado.classList.toggle("erro", Boolean(erro));
    estado.hidden = false;
}

function textoErro(erro) {
    const m = String(erro?.message || "");
    const baixo = m.toLowerCase();
    if (baixo.includes("row-level security") || baixo.includes("permission denied")) {
        return "Sem permissão para alterar esta planta (veja a regra de update no Supabase). " + m;
    }
    if (baixo.includes("failed to fetch")) return "Sem conexão com o servidor.";
    return m || "Erro desconhecido.";
}

/* =========================================================
   Pop-up
========================================================= */

function injetarEstilosPopup() {
    if (document.getElementById("popup-estilos")) return;

    const estilo = document.createElement("style");
    estilo.id = "popup-estilos";
    estilo.textContent = `
.popup-fundo{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.65);backdrop-filter:blur(2px);animation:popup-fade .18s ease}
.popup-caixa{width:100%;max-width:400px;background:#161616;color:#f2f2f2;border:1px solid #d4af6a;border-radius:16px;padding:28px 24px 22px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.6);animation:popup-subir .2s ease;font-family:inherit}
.popup-icone{width:56px;height:56px;margin:0 auto 14px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700}
.popup-sucesso{background:rgba(212,175,106,.15);color:#d4af6a;border:2px solid #d4af6a}
.popup-erro{background:rgba(248,113,113,.15);color:#f87171;border:2px solid #f87171}
.popup-caixa h3{margin:0 0 8px;font-size:20px;color:#fff}
.popup-caixa p{margin:0 0 22px;font-size:15px;line-height:1.5;color:#cfcfcf;white-space:pre-line;overflow-wrap:anywhere}
.popup-acoes{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.popup-botao{flex:1 1 140px;padding:11px 18px;border-radius:10px;border:1px solid #d4af6a;background:transparent;color:#d4af6a;font-weight:600;font-size:15px;cursor:pointer}
.popup-botao.principal{background:linear-gradient(135deg,#e6c47f,#c9972e);color:#1a1200;border-color:transparent}
.popup-botao:focus-visible{outline:2px solid #fff;outline-offset:2px}
@keyframes popup-fade{from{opacity:0}to{opacity:1}}
@keyframes popup-subir{from{transform:translateY(12px);opacity:0}to{transform:none;opacity:1}}
`;
    document.head.appendChild(estilo);
}

function mostrarPopup(opcoes) {
    const tipo = opcoes.tipo || "sucesso";
    const botoes = opcoes.botoes || [{ texto: "OK", principal: true }];

    injetarEstilosPopup();
    document.querySelector(".popup-fundo")?.remove();

    const anterior = document.activeElement;

    const fundo = document.createElement("div");
    fundo.className = "popup-fundo";

    const caixa = document.createElement("div");
    caixa.className = "popup-caixa";
    caixa.setAttribute("role", tipo === "erro" ? "alertdialog" : "dialog");
    caixa.setAttribute("aria-modal", "true");
    caixa.setAttribute("aria-labelledby", "popup-titulo");

    const icone = document.createElement("div");
    icone.className = `popup-icone popup-${tipo}`;
    icone.setAttribute("aria-hidden", "true");
    icone.textContent = tipo === "sucesso" ? "✓" : "!";

    const titulo = document.createElement("h3");
    titulo.id = "popup-titulo";
    titulo.textContent = opcoes.titulo || "";

    const texto = document.createElement("p");
    texto.textContent = opcoes.mensagem || "";

    const acoes = document.createElement("div");
    acoes.className = "popup-acoes";

    function fechar() {
        document.removeEventListener("keydown", aoTeclar);
        fundo.remove();
        if (anterior && anterior.focus) anterior.focus();
    }

    function aoTeclar(evento) {
        if (evento.key === "Escape") fechar();
    }

    let principal = null;

    botoes.forEach(function (config) {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "popup-botao" + (config.principal ? " principal" : "");
        botao.textContent = config.texto;
        botao.addEventListener("click", function () {
            fechar();
            if (config.aoClicar) config.aoClicar();
        });
        if (config.principal) principal = botao;
        acoes.appendChild(botao);
    });

    fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(); });
    document.addEventListener("keydown", aoTeclar);

    caixa.append(icone, titulo, texto, acoes);
    fundo.appendChild(caixa);
    document.body.appendChild(fundo);

    (principal || acoes.querySelector("button"))?.focus();
}

function avisar(mensagem) {
    mostrarPopup({ tipo: "erro", titulo: "Atenção", mensagem });
}

/* =========================================================
   Destaques
========================================================= */

function obterDestaquesAtuais() {
    return Array.from(listaDestaques.querySelectorAll(".chip")).map((c) => c.dataset.valor);
}

function adicionarDestaque(texto) {
    const valor = String(texto).trim();
    if (!valor) return;

    if (obterDestaquesAtuais().some((i) => i.toLowerCase() === valor.toLowerCase())) return;

    const chip = document.createElement("span");
    chip.className = "chip";
    chip.dataset.valor = valor;

    const rotulo = document.createElement("span");
    rotulo.textContent = valor;

    const remover = document.createElement("button");
    remover.type = "button";
    remover.textContent = "×";
    remover.setAttribute("aria-label", `Remover ${valor}`);
    remover.addEventListener("click", () => chip.remove());

    chip.append(rotulo, remover);
    listaDestaques.appendChild(chip);
}

function adicionarDoCampo() {
    campoDestaque.value.split(",").forEach(adicionarDestaque);
    campoDestaque.value = "";
}

/* =========================================================
   Imagem
========================================================= */

function imagemValida(arquivo) {
    return TIPOS_IMAGEM.includes(arquivo.type) || EXTENSOES_IMAGEM.test(arquivo.name);
}

function lerArquivo(arquivo) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(leitor.result);
        leitor.onerror = () => reject(new Error("Não foi possível ler a imagem."));
        leitor.readAsDataURL(arquivo);
    });
}

// Reduz para no máx. 1600 px e converte para JPEG; se falhar, usa a original
async function lerImagem(arquivo) {
    const original = await lerArquivo(arquivo);

    try {
        const imagem = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = original;
        });

        const escala = Math.min(1, LARGURA_MAXIMA_IMAGEM / imagem.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(imagem.width * escala);
        canvas.height = Math.round(imagem.height * escala);

        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imagem, 0, 0, canvas.width, canvas.height);

        const reduzida = canvas.toDataURL("image/jpeg", QUALIDADE_JPEG);
        return reduzida.length < original.length ? reduzida : original;
    } catch {
        return original;
    }
}

/* =========================================================
   Preencher o formulário
========================================================= */

function definirValor(id, valor) {
    if (valor !== undefined && valor !== null) $(id).value = valor;
}

function preencherFormulario(linha) {
    definirValor("titulo", ler(linha, "titulo"));
    definirValor("descricao", ler(linha, "descricao"));
    definirValor("estilo", ler(linha, "estilo"));
    definirValor("categoria", ler(linha, "categoria"));
    definirValor("distribuicaoAmbientes", ler(linha, "distribuicao"));
    definirValor("quartos", ler(linha, "quartos"));
    definirValor("banheiros", ler(linha, "banheiros"));
    definirValor("garagem", ler(linha, "garagem"));
    definirValor("area", ler(linha, "area"));

    const preco = Number(ler(linha, "preco"));
    if (Number.isFinite(preco) && preco > 0) {
        campoPreco.value = formatarMoeda(String(Math.round(preco * 100)));
    }

    listaDestaques.replaceChildren();
    listaDe(ler(linha, "destaques")).forEach(adicionarDestaque);

    const foto = ler(linha, "imagem");
    if (foto) {
        $("previaImagem").src = foto;
        $("blocoImagemAtual").hidden = false;
    }

    $("botaoCancelar").href = urlDoProjeto();
}

/* =========================================================
   Início: só o dono entra
========================================================= */

async function iniciar() {
    const voltar = { texto: "Voltar para Projetos", href: PAGINA_LISTA };

    if (!idPlanta) {
        mostrarEstado("Nenhuma planta foi indicada para edição.", true, voltar);
        return;
    }

    try {
        const { data: { session }, error: erroSessao } = await supabase.auth.getSession();
        if (erroSessao) throw erroSessao;

        if (!session) {
            mostrarEstado("Entre na sua conta para editar a planta.", true,
                { texto: "Ir para o login", href: PAGINA_LOGIN });
            return;
        }

        usuarioId = session.user.id;

        const { data, error } = await supabase.from(TABELA).select("*")
            .eq("id", idPlanta).eq(COLUNA_DONO, usuarioId).maybeSingle();
        if (error) throw error;

        if (!data) {
            mostrarEstado("Projeto não encontrado ou você não tem acesso a ele.", true, voltar);
            return;
        }

        linhaAtual = data;
    } catch (erro) {
        console.error("[Editar planta]", erro);
        mostrarEstado("Não foi possível abrir a planta. " + textoErro(erro), true, voltar);
        return;
    }

    preencherFormulario(linhaAtual);

    estado.hidden = true;
    formulario.hidden = false;

    campoPreco.addEventListener("input", () => {
        campoPreco.value = formatarMoeda(campoPreco.value);
    });

    $("imagem").addEventListener("change", (evento) => {
        const arquivo = evento.target.files[0];
        const previa = $("previaImagem");
        const legenda = $("legendaImagem");
        const fotoAtual = ler(linhaAtual, "imagem");

        if (arquivo && imagemValida(arquivo)) {
            previa.src = URL.createObjectURL(arquivo);
            legenda.textContent = "Nova imagem";
            $("blocoImagemAtual").hidden = false;
        } else if (fotoAtual) {
            previa.src = fotoAtual;
            legenda.textContent = "Imagem atual";
        }
    });

    $("botaoAdicionarDestaque").addEventListener("click", () => {
        adicionarDoCampo();
        campoDestaque.focus();
    });

    campoDestaque.addEventListener("keydown", (evento) => {
        if (evento.key === "Enter") {
            evento.preventDefault();
            adicionarDoCampo();
        }
    });

    formulario.addEventListener("submit", salvar);
}

/* =========================================================
   Salvar
========================================================= */

async function salvar(evento) {
    evento.preventDefault();

    const valorCampo = (id) => $(id).value.trim();

    adicionarDoCampo();

    const titulo = valorCampo("titulo");
    const descricao = valorCampo("descricao");
    const categoria = valorCampo("categoria");
    const estilo = valorCampo("estilo");
    const distribuicao = valorCampo("distribuicaoAmbientes");

    const quartosTexto = valorCampo("quartos");
    const banheirosTexto = valorCampo("banheiros");
    const garagemTexto = valorCampo("garagem");
    const areaTexto = valorCampo("area");
    const precoTexto = valorCampo("preco");

    const arquivo = $("imagem").files[0];
    const destaques = obterDestaquesAtuais();

    if (!titulo || !descricao || !categoria || !quartosTexto ||
        !banheirosTexto || !garagemTexto || !areaTexto || !precoTexto) {
        avisar("Preencha todos os campos obrigatórios.");
        return;
    }

    const quartos = Number(quartosTexto);
    const banheiros = Number(banheirosTexto);
    const garagem = Number(garagemTexto);
    const area = Number(areaTexto);
    const preco = lerPreco(precoTexto);

    if (![quartos, banheiros, garagem].every((n) => Number.isInteger(n) && n >= 0)) {
        avisar("Quartos, banheiros e vagas na garagem devem ser números inteiros (podem ser zero).");
        return;
    }

    if (!Number.isFinite(area) || area <= 0 || area > AREA_MAXIMA) {
        avisar(`A área deve ser maior que zero e ter no máximo ${AREA_MAXIMA.toLocaleString("pt-BR")} m².`);
        return;
    }

    if (!Number.isFinite(preco) || preco <= 0 || preco > PRECO_MAXIMO) {
        avisar(`O preço deve ser maior que zero e ter no máximo R$ ${PRECO_MAXIMO.toLocaleString("pt-BR")}.`);
        return;
    }

    if (arquivo) {
        if (!imagemValida(arquivo)) {
            avisar("A imagem deve ser JPEG (.jpg, .jpeg, .jfif), PNG ou WebP.");
            return;
        }
        if (arquivo.size > 5 * 1024 * 1024) {
            avisar("A imagem deve ter no máximo 5 MB.");
            return;
        }
    }

    const botao = $("botaoSalvar");
    const textoOriginal = botao.textContent;

    try {
        botao.disabled = true;
        botao.textContent = "Salvando...";

        // Só envia colunas que existem na linha da tabela
        const mudancas = {};
        const definir = (campo, valor) => {
            const k = chave(linhaAtual, COLUNAS[campo]);
            if (k) mudancas[k] = valor;
        };

        definir("titulo", titulo);
        definir("descricao", descricao);
        definir("categoria", categoria);
        definir("estilo", estilo || null);
        definir("quartos", quartos);
        definir("banheiros", banheiros);
        definir("garagem", garagem);
        definir("area", area);
        definir("preco", preco);
        definir("distribuicao", distribuicao || null);

        const kDestaques = chave(linhaAtual, COLUNAS.destaques);
        if (kDestaques) {
            // texto continua texto; lista (ou vazio) vai como lista
            mudancas[kDestaques] = typeof linhaAtual[kDestaques] === "string"
                ? destaques.join("\n")
                : destaques;
        }

        // Sem arquivo novo, a imagem atual não é tocada
        if (arquivo) {
            const kImagem = chave(linhaAtual, COLUNAS.imagem);
            if (kImagem) mudancas[kImagem] = await lerImagem(arquivo);
        }

        console.log("[Editar planta] colunas enviadas:", Object.keys(mudancas));

        const { data, error } = await supabase.from(TABELA)
            .update(mudancas)
            .eq("id", idPlanta).eq(COLUNA_DONO, usuarioId)
            .select();

        if (error) throw error;

        if (!data || !data.length) {
            throw new Error(
                "Nenhuma linha foi atualizada. Provavelmente falta a regra de UPDATE da tabela no Supabase (veja o SQL no fim do arquivo)."
            );
        }

        linhaAtual = data[0];

        mostrarPopup({
            tipo: "sucesso",
            titulo: "Planta atualizada!",
            mensagem: "As alterações já estão no site.",
            botoes: [
                { texto: "Continuar editando", principal: false },
                { texto: "Ver projeto", principal: true, aoClicar: () => { location.href = urlDoProjeto(); } }
            ]
        });
    } catch (erro) {
        console.error("[Editar planta]", erro);
        mostrarPopup({
            tipo: "erro",
            titulo: "Não foi possível salvar",
            mensagem: textoErro(erro)
        });
    } finally {
        botao.disabled = false;
        botao.textContent = textoOriginal;
    }
}

iniciar();

/* ---------- SQL (rode no SQL Editor do Supabase) ----------
   Sem esta regra o Supabase aceita a requisição mas não altera nada.

   create policy "dono edita suas plantas" on plantas
     for update using (auth.uid() = profissional_id)
     with check (auth.uid() = profissional_id);
------------------------------------------------------------ */