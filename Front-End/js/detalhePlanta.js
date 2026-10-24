/* detalhePlanta.js
   Carregue PlantasStorage.js e Favoritos.js ANTES deste arquivo. */

const parametros = new URLSearchParams(window.location.search);
const id = parametros.get("id");
const secaoDetalhes = document.querySelector(".Detalheplanta");

/* =========================================================
   UTILITÁRIOS
========================================================= */

function mostrarErro(mensagem) {
    if (!secaoDetalhes) {
        console.error(mensagem);
        return;
    }

    const caixa = document.createElement("div");
    caixa.className = "NenhumaPlanta";

    const titulo = document.createElement("h1");
    titulo.textContent = mensagem;

    const texto = document.createElement("p");
    texto.textContent = "Volte para a lista de plantas e tente novamente.";

    caixa.append(titulo, texto);
    secaoDetalhes.replaceChildren(caixa);
}

// Escreve um texto no elemento (se ele existir no HTML).
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

function criar(tag, classe, texto) {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
}

function criarParagrafo(texto, classe) {
    return criar("p", classe, texto);
}

/* =========================================================
   DESTAQUES
   (salvos pelo publicarPlanta.js como lista de textos)
========================================================= */

function normalizarDestaques(valor) {
    if (Array.isArray(valor)) {
        return valor;
    }

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
   (o publicarPlanta.js salva uma única imagem em base64)
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
   Campos opcionais que vêm do backend:
   planta.profissional = { id, nome, cargo, foto, nota, totalAvaliacoes, bio }
   planta.avaliacoes   = [{ nome, foto, data, nota, comentario }]
========================================================= */

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

function mostrarProfissional(profissional) {
    const bloco = document.getElementById("profissionalPlanta");

    if (!bloco) return;

    bloco.replaceChildren();

    if (!profissional || !profissional.nome) {
        bloco.appendChild(criar("p", "SemInfo", "O profissional responsável por este projeto ainda não foi informado."));

        const verTodos = criar("a", "BtnPerfil", "Ver profissionais →");
        verTodos.href = "./Profissionais.html";
        bloco.appendChild(verTodos);
        return;
    }

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
    bloco.appendChild(topo);

    if (profissional.bio) {
        bloco.appendChild(criar("p", "ProfissionalBio", profissional.bio));
    }

    const perfil = criar("a", "BtnPerfil", "Ver perfil do profissional →");
    perfil.href = profissional.id
        ? `./Profissionais.html?id=${encodeURIComponent(profissional.id)}`
        : "./Profissionais.html";
    bloco.appendChild(perfil);
}

function mostrarAvaliacao(avaliacoes) {
    const bloco = document.getElementById("avaliacaoPlanta");

    if (!bloco) return;

    bloco.replaceChildren();

    const avaliacao = Array.isArray(avaliacoes) ? avaliacoes[0] : null;

    if (!avaliacao) {
        bloco.appendChild(criar("p", "SemInfo", "Ainda não há avaliações para este projeto."));
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
   FAVORITOS (guardados só neste navegador, via Favoritos.js)
========================================================= */

function configurarFavorito() {
    const botao = document.getElementById("botaoFavorito");

    if (!botao || !window.Favoritos) return;

    const atualizar = () => {
        const favorito = window.Favoritos.eFavorito(id);
        botao.classList.toggle("ativo", favorito);
        botao.setAttribute("aria-pressed", String(favorito));
        definirTexto("textoFavorito", favorito ? "Salvo nos favoritos" : "Salvar nos favoritos");
    };

    botao.addEventListener("click", () => {
        window.Favoritos.alternar(id);
        atualizar();
    });

    atualizar();
}

/* =========================================================
   SOLICITAR PROJETO
   Ainda não existe a tela de solicitação: por enquanto o botão
   leva o visitante até o profissional responsável.
========================================================= */

function configurarSolicitar() {
    const botao = document.getElementById("botaoSolicitar");
    const alvo = document.querySelector(".Profissional");

    if (!botao || !alvo) return;

    botao.addEventListener("click", () => {
        alvo.scrollIntoView({ behavior: "smooth", block: "center" });
    });
}

/* =========================================================
   INÍCIO
========================================================= */

async function iniciarDetalhes() {
    if (!id) {
        mostrarErro("Planta não encontrada.");
        return;
    }

    if (!window.PlantasStorage) {
        console.error("PlantasStorage.js não foi carregado antes do detalhePlanta.js.");
        mostrarErro("O serviço de plantas não foi carregado.");
        return;
    }

    try {
        // CORREÇÃO: getPlanta fica dentro de window.PlantasStorage.
        let planta = await window.PlantasStorage.getPlanta(id);

        // Se a API devolver uma lista com um item, usa o primeiro.
        if (Array.isArray(planta)) {
            planta = planta[0];
        }

        if (!planta) {
            throw new Error("Planta não encontrada.");
        }

        const titulo = planta.titulo || "Planta sem título";

        document.title = `${titulo} - Income of Houses`;

        definirTexto("nomePlanta", titulo);
        definirTexto("categoriaPlanta", planta.categoria || "Planta");
        definirTexto("resumoPlanta", planta.descricao || "");
        definirTexto("precoDestaque", formatarMoeda(planta.preco));
        definirTexto("areaPlanta", `${formatarNumero(planta.area)} m²`);
        definirTexto("quartosPlanta", formatarNumero(planta.quartos));
        definirTexto("garagemPlanta", formatarNumero(planta.garagem));
        definirTexto("estiloPlanta", planta.estilo || "Não informado");
        definirTexto("banheirosPlanta", formatarNumero(planta.banheiros));
        definirTexto("descricaoPlanta", planta.descricao || "");

        mostrarImagem(planta);
        mostrarDestaques(planta.destaques);
        mostrarDistribuicao(planta.distribuicaoAmbientes);
        mostrarProfissional(planta.profissional);
        mostrarAvaliacao(planta.avaliacoes);
        configurarFavorito();
        configurarSolicitar();
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