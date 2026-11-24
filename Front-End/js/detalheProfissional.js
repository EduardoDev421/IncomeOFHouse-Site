import { supabase } from "./lib/supabaseClient.js";

const id = new URLSearchParams(window.location.search).get("id");
const secaoDetalhes = document.getElementById("detalhesProfissional");

const MAX_AVALIACOES = 3;

/* HELPERS */

const DIAS = [
    ["seg", "Seg"],
    ["ter", "Ter"],
    ["qua", "Qua"],
    ["qui", "Qui"],
    ["sex", "Sex"],
    ["sab", "Sáb"],
    ["dom", "Dom"]
];

function humanizar(valor) {
    const texto = String(valor).trim();
    if (!texto || /\s/.test(texto) || !/[-_]/.test(texto)) return texto;
    const pequenas = new Set(["de", "da", "do", "e"]);
    return texto
        .split(/[-_]/)
        .map((parte, i) => (i > 0 && pequenas.has(parte) ? parte : parte.charAt(0).toUpperCase() + parte.slice(1)))
        .join(" ");
}

function lista(valor) {
    if (Array.isArray(valor)) {
        return valor
            .filter((item) => typeof item === "string" || typeof item === "number")
            .map((item) => humanizar(item))
            .filter(Boolean);
    }

    if (valor && typeof valor === "object") {
        return Object.entries(valor)
            .filter(([, ativo]) => ativo === true)
            .map(([chave]) => humanizar(chave));
    }

    if (typeof valor === "string" && valor.trim()) {
        try {
            const convertido = JSON.parse(valor);
            if (convertido && typeof convertido === "object") return lista(convertido);
        } catch {
        }
        return valor.split(",").map((item) => humanizar(item)).filter(Boolean);
    }

    return [];
}

function lerObjeto(valor) {
    if (valor && typeof valor === "object" && !Array.isArray(valor)) return valor;

    if (typeof valor === "string" && valor.trim().startsWith("{")) {
        try {
            const convertido = JSON.parse(valor);
            return convertido && typeof convertido === "object" ? convertido : null;
        } catch {
            return null;
        }
    }

    return null;
}

function formatarMoeda(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero <= 0) return "";
    return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarNota(nota) {
    return Number(nota).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function nomeProprio(nome) {
    const particulas = new Set(["de", "da", "do", "dos", "das", "e"]);
    return String(nome)
        .trim()
        .split(/\s+/)
        .map((palavra, i) => {
            const minuscula = palavra.toLowerCase();
            if (i > 0 && particulas.has(minuscula)) return minuscula;
            return palavra.charAt(0).toUpperCase() + palavra.slice(1);
        })
        .join(" ");
}

function nomeDaProfissao(valor) {
    return valor ? humanizar(valor) : "";
}

function primeiroValor(linha, chaves) {
    const chave = chaves.find((c) => linha && linha[c] !== undefined && linha[c] !== null && linha[c] !== "");
    return chave ? linha[chave] : "";
}

function nomeDosDias(indices) {
    const nomes = indices.map((i) => DIAS[i][1]);
    if (nomes.length === 1) return nomes[0];
    if (nomes.length === 2) return `${nomes[0]} e ${nomes[1]}`;
    return `${nomes[0]} a ${nomes[nomes.length - 1]}`;
}

function resumirDisponibilidade(valor) {
    const objeto = lerObjeto(valor);
    if (!objeto) return "";

    const ativos = [];
    DIAS.forEach(([chave], indice) => {
        const dia = objeto[chave];
        if (dia && typeof dia === "object" && (dia.ativo === true || dia.ativo === "true")) {
            ativos.push({ indice, de: dia.de || "", ate: dia.ate || "" });
        }
    });

    if (!ativos.length) return "";

    const horarios = new Set(ativos.map((d) => (d.de && d.ate ? `${d.de} às ${d.ate}` : "")));

    const trechos = [];
    let atual = [];
    ativos.forEach((dia) => {
        if (atual.length && dia.indice !== atual[atual.length - 1] + 1) {
            trechos.push(atual);
            atual = [];
        }
        atual.push(dia.indice);
    });
    trechos.push(atual);

    const dias = trechos.map(nomeDosDias).join(", ");

    if (horarios.size === 1) {
        const [horario] = [...horarios];
        return horario ? `${dias} · ${horario}` : dias;
    }

    return ativos
        .map((d) => (d.de && d.ate ? `${DIAS[d.indice][1]} ${d.de}–${d.ate}` : DIAS[d.indice][1]))
        .join(" · ");
}

function tempoRelativo(valor, agora = new Date()) {
    const data = valor ? new Date(valor) : null;
    if (!data || Number.isNaN(data.getTime())) return "";

    const dias = Math.floor((agora - data) / 86400000);
    if (dias < 1) return "Hoje";
    if (dias < 30) return `Há ${dias} ${dias === 1 ? "dia" : "dias"}`;

    const meses = Math.floor(dias / 30);
    if (meses < 12) return `Há ${meses} ${meses === 1 ? "mês" : "meses"}`;

    const anos = Math.floor(dias / 365);
    return `Há ${anos} ${anos === 1 ? "ano" : "anos"}`;
}

/* FIM HELPERS */

function criar(tag, classe, texto) {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
}

function definirTexto(idElemento, texto) {
    const elemento = document.getElementById(idElemento);
    if (elemento) elemento.textContent = texto;
}

function exibir(elemento, visivel) {
    if (elemento) elemento.style.display = visivel ? "" : "none";
}

function preencherBloco(idBloco, texto) {
    const bloco = document.getElementById(idBloco);
    if (!bloco) return;

    const paragrafo = bloco.querySelector("p");
    if (paragrafo) paragrafo.textContent = texto || "";
    exibir(bloco, Boolean(texto));
}

function mostrarErro(mensagem) {
    secaoDetalhes.replaceChildren();

    const caixa = criar("div", "pagina-erro");
    caixa.appendChild(criar("h1", "", mensagem));
    caixa.appendChild(criar("p", "", "Volte para a lista de profissionais e tente novamente."));

    const voltar = criar("a", "ver-avaliacoes", "Ver profissionais");
    voltar.href = "./Profissionais.html";
    caixa.appendChild(voltar);

    secaoDetalhes.appendChild(caixa);
}

function preencherChips(idBloco, itens) {
    const bloco = document.getElementById(idBloco);
    if (!bloco) return;

    const atual = bloco.querySelector("p, .chips");
    if (atual) {
        const chips = criar("div", "chips");
        itens.forEach((item) => chips.appendChild(criar("span", "chip", item)));
        atual.replaceWith(chips);
    }

    exibir(bloco, itens.length > 0);
}

function criarAvatar(foto, nome) {
    if (foto) {
        const img = document.createElement("img");
        img.src = foto;
        img.alt = nome || "";
        return img;
    }

    const inicial = (nome || "?").trim().charAt(0).toUpperCase();
    return criar("div", "avatar-inicial", inicial);
}

function pintarEstrelas(caixa, nota) {
    const total = Math.max(0, Math.min(5, Math.round(Number(nota) || 0)));

    [...caixa.children].forEach((estrela, i) => {
        estrela.classList.toggle("vazia", i >= total);
    });
}

function criarEstrelas(nota) {
    const caixa = criar("div", "estrelas-comentario");

    for (let i = 0; i < 5; i++) {
        caixa.appendChild(criar("span", "", "★"));
    }

    pintarEstrelas(caixa, nota);
    return caixa;
}

/* DADOS */

async function buscarProfissional() {
    try {
        const { data, error } = await supabase
            .from("profissionais")
            .select("*")
            .eq("id", id)
            .maybeSingle();
        if (error) throw error;

        if (!data) {
            console.warn("[DetalhesProfissional] Nenhum profissional com id =", id, "(ou a RLS de profissionais bloqueou a leitura).");
        }

        return data || null;
    } catch (erro) {
        console.warn("[DetalhesProfissional] profissional:", erro?.message || erro);
        return null;
    }
}

async function buscarAvaliacoes() {
    try {
        const { data, error } = await supabase
            .from("avaliacoes")
            .select("*")
            .eq("profissional_id", id);
        if (error) throw error;
        return (data || []).sort((a, b) => new Date(b.criado_em || 0) - new Date(a.criado_em || 0));
    } catch (erro) {
        console.warn("[DetalhesProfissional] avaliações:", erro?.message || erro);
        return [];
    }
}

function notaDe(avaliacao) {
    return Number(primeiroValor(avaliacao, ["nota", "estrelas", "avaliacao"]));
}

/* TELA */

function mostrarFoto(profissional) {
    const imagem = document.getElementById("fotoProfissional");
    if (!imagem) return;

    function semFoto() {
        const placeholder = criar("div", "foto-vazia");
        placeholder.appendChild(criar("span", "foto-vazia-inicial", (profissional.nome || "?").trim().charAt(0).toUpperCase()));
        imagem.replaceWith(placeholder);
    }

    if (!profissional.foto_url) {
        semFoto();
        return;
    }

    imagem.src = profissional.foto_url;
    imagem.alt = `Foto de ${profissional.nome}`;
    imagem.addEventListener("error", semFoto, { once: true });
}

function mostrarNome(nome) {
    const titulo = document.getElementById("nomeProfissional");
    if (!titulo) return;

    const partes = nomeProprio(nome).split(" ");
    const ultimo = partes.pop();

    titulo.replaceChildren();
    if (partes.length) titulo.append(`${partes.join(" ")} `);
    titulo.appendChild(criar("span", "", ultimo));
}

function mostrarNotas(notas) {
    const total = notas.length;
    const media = total ? notas.reduce((soma, n) => soma + n, 0) / total : null;
    const temNota = media !== null;

    const textoTotal = temNota
        ? `${total} ${total === 1 ? "avaliação" : "avaliações"}`
        : "Sem avaliações";

    const bloco = document.getElementById("blocoNota");
    if (bloco) bloco.classList.toggle("sem-nota", !temNota);

    ["notaProfissional", "notaGeral"].forEach((idNota) => {
        const elemento = document.getElementById(idNota);
        exibir(elemento, temNota);
        if (elemento && temNota) elemento.textContent = formatarNota(media);
    });

    definirTexto("totalAvaliacoesProfissional", temNota ? `(${textoTotal})` : textoTotal);
    definirTexto("totalGeral", textoTotal);

    const estrelas = document.getElementById("estrelasGeral");
    if (estrelas) pintarEstrelas(estrelas, media || 0);
}

function mostrarAvaliacoes(avaliacoes) {
    const caixa = document.getElementById("listaAvaliacoes");
    if (!caixa) return;

    caixa.replaceChildren();

    if (!avaliacoes.length) {
        const vazio = criar("div", "sem-avaliacoes");
        vazio.appendChild(criar("span", "sem-avaliacoes-icone", "★"));
        vazio.appendChild(criar("h4", "", "Ainda sem avaliações"));
        vazio.appendChild(criar("p", "", "Este profissional ainda não recebeu avaliações."));
        caixa.appendChild(vazio);
        return;
    }

    avaliacoes.slice(0, MAX_AVALIACOES).forEach((avaliacao) => {
        const nome = primeiroValor(avaliacao, ["cliente_nome", "nome_cliente", "autor_nome", "nome"]) || "Cliente";
        const foto = primeiroValor(avaliacao, ["cliente_foto", "foto_url", "foto"]);
        const comentario = primeiroValor(avaliacao, ["comentario", "texto", "descricao", "mensagem"]);

        const bloco = criar("div", "comentario-destaque");

        const cliente = criar("div", "cliente");
        cliente.appendChild(criarAvatar(foto, nome));

        const info = criar("div", "cliente-info");
        info.appendChild(criar("h4", "", nome));

        const quando = tempoRelativo(avaliacao.criado_em);
        if (quando) info.appendChild(criar("span", "", quando));

        cliente.appendChild(info);
        bloco.appendChild(cliente);

        const nota = notaDe(avaliacao);
        if (Number.isFinite(nota) && nota > 0) bloco.appendChild(criarEstrelas(nota));

        if (comentario) bloco.appendChild(criar("p", "texto-comentario", comentario));

        caixa.appendChild(bloco);
    });
}

function mostrarOrcamento(profissional) {
    const orcamento = lerObjeto(profissional.orcamento) || {};

    preencherBloco("itemInvestimento", formatarMoeda(orcamento.minimo) ? `A partir de ${formatarMoeda(orcamento.minimo)}` : "");

    const prazo = typeof orcamento.prazo === "string" || typeof orcamento.prazo === "number"
        ? String(orcamento.prazo).trim()
        : "";
    preencherBloco("itemPrazo", prazo);

    preencherBloco("itemDisponibilidade", resumirDisponibilidade(profissional.disponibilidade));

    const botao = document.getElementById("botaoOrcamento");
    if (botao) {
        botao.addEventListener("click", () => {
            const parametros = new URLSearchParams({ com: profissional.id, nome: profissional.nome });
            window.location.href = `./Mensagem.html?${parametros.toString()}`;
        });
    }
}

function mostrarProfissional(profissional, avaliacoes) {
    document.title = `${profissional.nome} - Income of Houses`;

    mostrarFoto(profissional);
    mostrarNome(profissional.nome);
    definirTexto("profissaoProfissional", nomeDaProfissao(profissional.profissao));

    const notas = avaliacoes.map(notaDe).filter((n) => Number.isFinite(n) && n > 0);
    mostrarNotas(notas);
    mostrarAvaliacoes(avaliacoes);

    preencherBloco("dadoCidade", [profissional.cidade, profissional.estado].filter(Boolean).join(" - "));
    preencherBloco("dadoRegistro", profissional.registro ? String(profissional.registro) : "");
    preencherChips("dadoAreas", lista(profissional.areas_atuacao));
    preencherChips("dadoServicos", lista(profissional.servicos));
    preencherChips("dadoRegioes", lista(profissional.regioes_atendimento));

    const sobre = String(profissional.sobre || profissional.portfolio?.sobre || "").trim();
    const descricao = document.getElementById("descricaoProfissional");
    if (descricao) descricao.textContent = sobre;
    exibir(descricao, Boolean(sobre));

    mostrarOrcamento(profissional);
}

/* INÍCIO */

async function iniciar() {
    if (!id) {
        mostrarErro("Profissional não encontrado.");
        return;
    }

    try {
        const [profissional, avaliacoes] = await Promise.all([buscarProfissional(), buscarAvaliacoes()]);

        if (!profissional || !profissional.nome) {
            mostrarErro("Profissional não encontrado.");
            return;
        }

        mostrarProfissional(profissional, avaliacoes);
    } catch (erro) {
        console.error("Erro ao carregar o profissional:", erro);
        mostrarErro("Não foi possível carregar os dados do profissional.");
    }
}

iniciar();