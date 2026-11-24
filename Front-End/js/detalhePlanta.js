import { supabase } from "./lib/supabaseClient.js";
import { solicitarProjeto } from "./solicitarProjeto.js";

const parametros = new URLSearchParams(window.location.search);
const id = parametros.get("id");
const secaoDetalhes = document.querySelector(".Detalheplanta");

/* =========================================================
   UTILITÁRIOS
========================================================= */

function mostrarErro(mensagem) {
    secaoDetalhes.innerHTML = `
        <div class="NenhumaPlanta">
            <h1>${mensagem}</h1>
            <p>Volte para a lista de plantas e tente novamente.</p>
        </div>
    `;
}

function definirTexto(idElemento, texto) {
    const elemento = document.getElementById(idElemento);
    if (elemento) elemento.textContent = texto;
}

function formatarMoeda(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return "—";
    return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarNumero(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero.toLocaleString("pt-BR") : "—";
}

function criarParagrafo(texto, classe) {
    const p = document.createElement("p");
    if (classe) p.className = classe;
    p.textContent = texto;
    return p;
}

/* =========================================================
   DESTAQUES
========================================================= */

function normalizarDestaques(valor) {
    if (Array.isArray(valor)) return valor;

    if (typeof valor === "string" && valor.trim()) {
        try {
            const convertido = JSON.parse(valor);
            return Array.isArray(convertido) ? convertido : [];
        } catch {
            return valor.split(",");
        }
    }

    return [];
}

function mostrarDestaques(valor) {
    const bloco = document.getElementById("destaquesPlanta");
    if (!bloco) return;

    bloco.replaceChildren();

    const destaques = normalizarDestaques(valor)
        .map((item) => String(item).trim())
        .filter(Boolean);

    if (destaques.length === 0) {
        bloco.appendChild(criarParagrafo("Nenhum destaque informado.", "SemDestaque"));
        return;
    }

    destaques.forEach((destaque) => {
        bloco.appendChild(criarParagrafo(destaque));
    });
}

/* =========================================================
   DISTRIBUIÇÃO DOS AMBIENTES
========================================================= */

function mostrarDistribuicao(texto) {
    const bloco = document.getElementById("blocoDistribuicao");
    const elemento = document.getElementById("distribuicaoPlanta");

    if (!bloco || !elemento) return;

    const conteudo = (texto || "").trim();

    if (!conteudo) {
        bloco.hidden = true;
        return;
    }

    elemento.textContent = conteudo;
    bloco.hidden = false;
}

/* =========================================================
   IMAGEM
========================================================= */

function mostrarImagem(planta) {
    const imagem = document.getElementById("imagemPlanta");
    if (!imagem) return;

    if (planta.imagem) {
        imagem.src = planta.imagem;
    } else {
        imagem.removeAttribute("src");
    }

    imagem.alt = planta.titulo || "Imagem da planta";
}

/* =========================================================
   PROFISSIONAL RESPONSÁVEL E AVALIAÇÕES
========================================================= */

function criar(tag, classe, texto) {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
}

function criarEstrelas(nota) {
    const total = Math.max(0, Math.min(5, Math.round(Number(nota) || 0)));
    const caixa = criar("span", "Estrelas");
    caixa.setAttribute("aria-label", `${total} de 5 estrelas`);

    for (let i = 0; i < 5; i++) {
        caixa.appendChild(criar("span", i < total ? "cheia" : "vazia", "★"));
    }

    return caixa;
}

function criarAvatar(foto, nome) {
    if (foto) {
        const img = criar("img", "Avatar");
        img.src = foto;
        img.alt = nome || "";
        return img;
    }

    const inicial = (nome || "?").trim().charAt(0).toUpperCase();
    return criar("div", "Avatar AvatarInicial", inicial);
}

function formatarNota(nota) {
    return Number(nota).toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    });
}

/* =========================================================
   ADICIONAR PROFISSIONAL AOS CONTATOS
========================================================= */

function criarBotaoAdicionarContato(profissional) {
    const botao = criar("button", "BtnAdicionarContato", "Adicionar aos contatos");
    botao.type = "button";

    botao.addEventListener("click", () => {
        if (!profissional.id) {
            alert("Não foi possível identificar o profissional.");
            return;
        }

        const parametros = new URLSearchParams({
            com: profissional.id,
            nome: profissional.nome
        });

        window.location.href = `./Mensagem.html?${parametros.toString()}`;
    });

    return botao;
}

/* =========================================================
   MOSTRAR PROFISSIONAL
========================================================= */

function mostrarProfissional(profissional) {
    const bloco = document.getElementById("profissionalPlanta");
    if (!bloco) return;

    bloco.replaceChildren();

    if (!profissional || !profissional.nome) {
        bloco.appendChild(criar(
            "p",
            "SemInfo",
            "O profissional responsável por este projeto ainda não foi informado."
        ));

        const verTodos = criar("a", "BtnPerfil", "Ver profissionais →");
        verTodos.href = "./Profissionais.html";
        bloco.appendChild(verTodos);
        return;
    }

    const card = criar("div", "CardProfissional");

    const topo = criar("div", "ProfissionalTopo");
    topo.appendChild(criarAvatar(profissional.foto, profissional.nome));

    const dados = criar("div", "ProfissionalDados");
    dados.appendChild(criar("h3", "", profissional.nome));

    if (profissional.cargo) {
        dados.appendChild(criar("span", "Cargo", profissional.cargo));
    }

    if (profissional.nota !== undefined && profissional.nota !== null) {
        const linha = criar("div", "LinhaNota");
        linha.appendChild(criarEstrelas(profissional.nota));

        const total = profissional.totalAvaliacoes
            ? ` (${profissional.totalAvaliacoes} avaliações)`
            : "";

        linha.appendChild(criar("span", "", `${formatarNota(profissional.nota)}${total}`));
        dados.appendChild(linha);
    }

    topo.appendChild(dados);
    card.appendChild(topo);

    if (profissional.bio) {
        card.appendChild(criar("p", "ProfissionalBio", profissional.bio));
    }

    const acoes = criar("div", "ProfissionalAcoes");

    // "Ver perfil" abre o perfil do profissional responsável pela planta
    const perfil = criar("a", "BtnPerfil", "Ver perfil");
    perfil.href = profissional.id
        ? `./PerfilProfissional.html?id=${encodeURIComponent(profissional.id)}`
        : "./Profissionais.html";

    acoes.appendChild(perfil);
    acoes.appendChild(criarBotaoAdicionarContato(profissional));
    card.appendChild(acoes);

    bloco.appendChild(card);
}

/* =========================================================
   AVALIAÇÕES
========================================================= */

function mostrarAvaliacao(avaliacoes) {
    const bloco = document.getElementById("avaliacaoPlanta");
    if (!bloco) return;

    bloco.replaceChildren();

    const avaliacao = Array.isArray(avaliacoes) ? avaliacoes[0] : null;

    if (!avaliacao) {
        bloco.appendChild(criar("p", "SemInfo", "Este profissional ainda não recebeu avaliações."));
        return;
    }

    const usuario = criar("div", "AvaliacaoUsuario");
    usuario.appendChild(criarAvatar(avaliacao.foto, avaliacao.nome));

    const dados = criar("div");
    dados.appendChild(criar("h4", "", avaliacao.nome || "Cliente"));

    if (avaliacao.data) {
        dados.appendChild(criar("span", "DataAvaliacao", avaliacao.data));
    }

    usuario.appendChild(dados);
    bloco.appendChild(usuario);

    if (avaliacao.nota !== undefined && avaliacao.nota !== null) {
        const linha = criar("div", "LinhaNota");
        linha.appendChild(criarEstrelas(avaliacao.nota));
        linha.appendChild(criar("span", "", formatarNota(avaliacao.nota)));
        bloco.appendChild(linha);
    }

    if (avaliacao.comentario) {
        bloco.appendChild(criar("p", "ComentarioAvaliacao", avaliacao.comentario));
    }
}

/* =========================================================
   FAVORITOS (SUPABASE)
========================================================= */

const PAGINA_LOGIN = "./Login.html";

async function configurarFavorito() {
    const botao = document.getElementById("botaoFavorito");
    if (!botao) return;

    const atualizar = () => {
        const favorito = window.Favoritos ? window.Favoritos.eFavorito(id) : false;
        botao.classList.toggle("ativo", favorito);
        botao.setAttribute("aria-pressed", String(favorito));
        definirTexto("textoFavorito", favorito ? "Salvo nos favoritos" : "Salvar nos favoritos");
    };

    if (!window.Favoritos) {
        console.error("Favoritos.js não foi carregado.");
    } else if (window.Favoritos.pronto) {
        try {
            await window.Favoritos.pronto;
        } catch (erro) {
            console.warn("Favoritos:", erro);
        }
    }

    let aviso = document.getElementById("avisoFavorito");

    if (!aviso) {
        aviso = criar("p", "AvisoFavorito");
        aviso.id = "avisoFavorito";
        aviso.setAttribute("role", "alert");
        aviso.style.cssText = "margin:8px 0 0;font-size:.9rem;color:#f0b4ab";
        botao.parentElement.appendChild(aviso);
    }

    botao.addEventListener("click", async () => {
        aviso.textContent = "";

        if (!window.Favoritos) {
            aviso.textContent = "Os favoritos não carregaram. Confira o caminho de js/Favoritos.js e recarregue.";
            return;
        }

        botao.disabled = true;

        try {
            const resultado = await window.Favoritos.alternar(id);

            if (resultado === null) {
                alert("Entre na sua conta para salvar plantas nos favoritos.");
                window.location.href = PAGINA_LOGIN;
                return;
            }
        } catch (erro) {
            aviso.textContent = erro.message;
        } finally {
            botao.disabled = false;
            atualizar();
        }
    });

    atualizar();
}

/* =========================================================
   SOLICITAR PROJETO (cria o pedido e abre Meus Pedidos)
========================================================= */

function configurarSolicitar(planta, profissionalId) {
    const botao = document.getElementById("botaoSolicitar");
    if (!botao) return;

    botao.addEventListener("click", async () => {
        botao.disabled = true;

        try {
            await solicitarProjeto({ plantaId: id, preco: planta.preco, profissionalId });
        } catch (erro) {
            console.error("[Solicitar]", erro.code, erro.message, erro.details, erro.hint);
            alert(erro.message || "Não foi possível solicitar o projeto.");
            botao.disabled = false;
        }
    });
}

/* =========================================================
   PROFISSIONAL QUE PUBLICOU A PLANTA + AVALIAÇÕES DELE
========================================================= */

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function nomeDaProfissao(valor) {
    if (!valor) return "";
    const pequenas = new Set(["de", "da", "do", "e"]);
    return String(valor)
        .split("-")
        .map((parte, i) => (i > 0 && pequenas.has(parte) ? parte : parte.charAt(0).toUpperCase() + parte.slice(1)))
        .join(" ");
}

function primeiroValor(linha, chaves) {
    const chave = chaves.find((c) => linha && linha[c] !== undefined && linha[c] !== null && linha[c] !== "");
    return chave ? linha[chave] : "";
}

function formatarData(valor) {
    const data = valor ? new Date(valor) : null;
    if (!data || Number.isNaN(data.getTime())) return "";
    return `${MESES_CURTOS[data.getMonth()]} de ${data.getFullYear()}`;
}

// O PlantasStorage pode devolver profissionalId ou profissional_id.
// Se nenhum dos dois vier, lê direto da tabela plantas.
async function descobrirProfissionalId(planta) {
    const direto = planta.profissionalId || planta.profissional_id;
    if (direto) return direto;

    console.warn(
        "[Detalhes] A planta devolvida pelo PlantasStorage veio sem profissionalId/profissional_id. Campos recebidos:",
        Object.keys(planta)
    );

    try {
        const { data, error } = await supabase
            .from("plantas")
            .select("profissional_id")
            .eq("id", id)
            .maybeSingle();
        if (error) throw error;

        if (!data) {
            console.warn("[Detalhes] Nenhuma linha de plantas com id =", id, "(ou a RLS de plantas bloqueou a leitura).");
            return null;
        }

        if (!data.profissional_id) {
            console.warn("[Detalhes] A planta", id, "está com profissional_id vazio no banco.");
            return null;
        }

        return data.profissional_id;
    } catch (erro) {
        console.warn("[Detalhes] profissional_id direto da tabela plantas:", erro?.message || erro);
        return null;
    }
}

async function buscarProfissional(profissionalId) {
    if (!profissionalId) return null;
    try {
        const { data, error } = await supabase
            .from("profissionais")
            .select("*")
            .eq("id", profissionalId)
            .maybeSingle();
        if (error) throw error;

        if (!data) {
            console.warn(
                "[Detalhes] Nenhum registro em profissionais com id =",
                profissionalId,
                "— o id não existe nessa tabela ou a RLS bloqueou a leitura."
            );
            return null;
        }

        return data;
    } catch (erro) {
        console.warn("[Detalhes] profissional:", erro?.message || erro);
        return null;
    }
}

async function buscarAvaliacoes(profissionalId) {
    if (!profissionalId) return [];
    try {
        const { data, error } = await supabase
            .from("avaliacoes")
            .select("*")
            .eq("profissional_id", profissionalId);
        if (error) throw error;
        return (data || []).sort((a, b) => new Date(b.criado_em || 0) - new Date(a.criado_em || 0));
    } catch (erro) {
        console.warn("[Detalhes] avaliações do profissional:", erro?.message || erro);
        return [];
    }
}

function montarProfissional(linha, avaliacoes, profissionalId) {
    if (!linha) return null;

    const nome = primeiroValor(linha, ["nome", "nome_completo", "nome_profissional"]);
    if (!nome) {
        console.warn("[Detalhes] O registro do profissional veio sem nome. Colunas recebidas:", Object.keys(linha));
        return null;
    }

    const notas = avaliacoes
        .map((a) => Number(primeiroValor(a, ["nota", "estrelas", "avaliacao"])))
        .filter((n) => Number.isFinite(n) && n > 0);
    const media = notas.length ? notas.reduce((s, n) => s + n, 0) / notas.length : null;

    const local = [linha.cidade, linha.estado].filter(Boolean).join(", ");
    const cargo = [nomeDaProfissao(linha.profissao), local].filter(Boolean).join(" · ");

    return {
        id: profissionalId,
        nome,
        cargo,
        foto: linha.foto_url || "",
        nota: media,
        totalAvaliacoes: notas.length,
        bio: linha.sobre || linha.portfolio?.sobre || ""
    };
}

function montarAvaliacoes(avaliacoes) {
    return avaliacoes.map((a) => ({
        nome: primeiroValor(a, ["cliente_nome", "nome_cliente", "autor_nome", "nome"]) || "Cliente",
        foto: primeiroValor(a, ["cliente_foto", "foto_url", "foto"]),
        data: formatarData(a.criado_em),
        nota: Number(primeiroValor(a, ["nota", "estrelas", "avaliacao"])) || null,
        comentario: primeiroValor(a, ["comentario", "texto", "descricao", "mensagem"])
    }));
}

function configurarLinks(profissionalId) {
    const comentarios = document.getElementById("linkComentarios");
    if (comentarios && id) comentarios.href = `./Comentarios.html?id=${encodeURIComponent(id)}`;

    const avaliacoes = document.querySelector(".AvaliacaoTopo a");
    if (avaliacoes) {
        avaliacoes.href = profissionalId
            ? `./Profissionais.html?id=${encodeURIComponent(profissionalId)}`
            : "./Profissionais.html";
    }
}

/* =========================================================
   INÍCIO
========================================================= */

async function iniciarDetalhes() {
    if (!id) {
        mostrarErro("Planta não encontrada.");
        return;
    }

    try {
        const planta = await window.PlantasStorage.getPlanta(id);

        const preco = formatarMoeda(planta.preco);

        document.title = `${planta.titulo} - Income of Houses`;

        definirTexto("nomePlanta", planta.titulo);
        definirTexto("categoriaPlanta", planta.categoria || "Planta");
        definirTexto("resumoPlanta", planta.descricao || "");
        definirTexto("precoDestaque", preco);
        definirTexto("areaPlanta", `${formatarNumero(planta.area)} m²`);
        definirTexto("quartosPlanta", formatarNumero(planta.quartos));
        definirTexto("garagemPlanta", formatarNumero(planta.garagem));
        definirTexto("estiloPlanta", planta.estilo || "Não informado");
        definirTexto("banheirosPlanta", formatarNumero(planta.banheiros));
        definirTexto("descricaoPlanta", planta.descricao || "");

        mostrarImagem(planta);
        mostrarDestaques(planta.destaques);
        mostrarDistribuicao(planta.distribuicaoAmbientes);

        const profissionalId = await descobrirProfissionalId(planta);

        const [linhaProfissional, linhasAvaliacoes] = await Promise.all([
            buscarProfissional(profissionalId),
            buscarAvaliacoes(profissionalId)
        ]);

        mostrarProfissional(montarProfissional(linhaProfissional, linhasAvaliacoes, profissionalId));
        mostrarAvaliacao(montarAvaliacoes(linhasAvaliacoes));
        configurarLinks(profissionalId);
        configurarSolicitar(planta, profissionalId);

        await configurarFavorito();

    } catch (erro) {
        console.error("Erro ao carregar os detalhes da planta:", erro);

        mostrarErro(
            erro.message === "Planta não encontrada."
                ? erro.message
                : "Não foi possível carregar os dados da planta."
        );
    }
}

iniciarDetalhes();