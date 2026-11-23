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

    const perfil = criar("a", "BtnPerfil", "Ver perfil");
    perfil.href = profissional.id
        ? `./Profissionais.html?id=${encodeURIComponent(profissional.id)}`
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
        mostrarProfissional(planta.profissional);
        mostrarAvaliacao(planta.avaliacoes);

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
