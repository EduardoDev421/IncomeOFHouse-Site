/* publicarPlanta.js */

const formulario = document.getElementById("formPublicarPlanta");

const listaDestaques = document.getElementById("listaDestaques");
const campoDestaque = document.getElementById("destaquesPersonalizados");
const botaoAdicionarDestaque = document.getElementById(
    "botaoAdicionarDestaque"
);

const PRECO_MAXIMO = 999999999.99;
const AREA_MAXIMA = 100000;
const TIPOS_IMAGEM = ["image/jpeg", "image/pjpeg", "image/png", "image/webp"];
const EXTENSOES_IMAGEM = /\.(jpe?g|jfif|png|webp)$/i;

const campoPreco = document.getElementById("preco");

// Formata enquanto digita: 35000000 vira "R$ 350.000,00".
function formatarMoeda(texto) {
    const digitos = String(texto).replace(/\D/g, "").slice(0, 11);

    if (!digitos) return "";

    const valor = Number(digitos) / 100;

    return "R$ " + valor.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Converte "R$ 350.000,00" em 350000.
function lerPreco(texto) {
    const digitos = String(texto).replace(/\D/g, "");

    return digitos ? Number(digitos) / 100 : NaN;
}

// Destaques que já aparecem marcados e podem ser removidos.
const destaquesPadrao = [
    "Suíte com closet",
    "Sala e cozinha integradas",
    "Área gourmet",
    "Piscina",
    "Pé-direito duplo",
    "Varanda",
    "Escritório",
    "Lavanderia"
];

// Pop-up do site (substitui o alert do navegador).
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
.popup-caixa p{margin:0 0 22px;font-size:15px;line-height:1.5;color:#cfcfcf;white-space:pre-line}
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

    fundo.addEventListener("click", function (evento) {
        if (evento.target === fundo) fechar();
    });

    document.addEventListener("keydown", aoTeclar);

    caixa.append(icone, titulo, texto, acoes);
    fundo.appendChild(caixa);
    document.body.appendChild(fundo);

    (principal || acoes.querySelector("button"))?.focus();
}

function avisar(mensagem) {
    mostrarPopup({
        tipo: "erro",
        titulo: "Atenção",
        mensagem: mensagem
    });
}

// Obtém os destaques que estão visíveis.
function obterDestaquesAtuais() {
    if (!listaDestaques) return [];

    return Array.from(
        listaDestaques.querySelectorAll(".chip")
    ).map((chip) => chip.dataset.valor);
}

// Cria um destaque com botão para removê-lo.
function adicionarDestaque(texto) {
    if (!listaDestaques) return;

    const valor = texto.trim();

    if (!valor) return;

    const existe = obterDestaquesAtuais().some(
        (item) => item.toLowerCase() === valor.toLowerCase()
    );

    if (existe) return;

    const chip = document.createElement("span");
    chip.className = "chip";
    chip.dataset.valor = valor;

    const rotulo = document.createElement("span");
    rotulo.textContent = valor;

    const remover = document.createElement("button");
    remover.type = "button";
    remover.textContent = "×";
    remover.setAttribute("aria-label", `Remover ${valor}`);

    remover.addEventListener("click", function () {
        chip.remove();
    });

    chip.append(rotulo, remover);
    listaDestaques.appendChild(chip);
}

// Adiciona os destaques digitados, separados por vírgulas.
function adicionarDoCampo() {
    if (!campoDestaque) return;

    campoDestaque.value
        .split(",")
        .forEach(adicionarDestaque);

    campoDestaque.value = "";
}

// Restaura os destaques padrão.
function carregarDestaquesPadrao() {
    if (!listaDestaques) return;

    listaDestaques.replaceChildren();
    destaquesPadrao.forEach(adicionarDestaque);
}

// Aceita JPEG, PNG e WebP (inclui arquivos .jfif, que são JPEG).
function imagemValida(arquivo) {
    return (
        TIPOS_IMAGEM.includes(arquivo.type) ||
        EXTENSOES_IMAGEM.test(arquivo.name)
    );
}

// Lê o arquivo como data URL (Base64).
function lerArquivo(arquivo) {
    return new Promise(function (resolve, reject) {
        const leitor = new FileReader();

        leitor.onload = function () {
            resolve(leitor.result);
        };

        leitor.onerror = function () {
            reject(new Error("Não foi possível ler a imagem."));
        };

        leitor.readAsDataURL(arquivo);
    });
}

const LARGURA_MAXIMA_IMAGEM = 1600;
const QUALIDADE_JPEG = 0.85;

// Reduz a imagem (máx. 1600 px de largura) e converte para JPEG.
// Isso deixa o envio bem mais leve (o Base64 de 5 MB viraria ~6,7 MB).
// Se algo der errado, envia a imagem original.
async function lerImagem(arquivo) {
    const original = await lerArquivo(arquivo);

    try {
        const imagem = await new Promise(function (resolve, reject) {
            const img = new Image();
            img.onload = function () { resolve(img); };
            img.onerror = reject;
            img.src = original;
        });

        const escala = Math.min(1, LARGURA_MAXIMA_IMAGEM / imagem.width);
        const canvas = document.createElement("canvas");

        canvas.width = Math.round(imagem.width * escala);
        canvas.height = Math.round(imagem.height * escala);

        const contexto = canvas.getContext("2d");

        // Fundo branco, para PNG com transparência não ficar preto no JPEG.
        contexto.fillStyle = "#ffffff";
        contexto.fillRect(0, 0, canvas.width, canvas.height);
        contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);

        const reduzida = canvas.toDataURL("image/jpeg", QUALIDADE_JPEG);

        return reduzida.length < original.length ? reduzida : original;
    } catch {
        return original;
    }
}

// Lê o texto do botão (funciona para <button> e <input type="submit">).
function lerTextoBotao(botao) {
    return botao.tagName === "INPUT" ? botao.value : botao.textContent;
}

function definirTextoBotao(botao, texto) {
    if (botao.tagName === "INPUT") {
        botao.value = texto;
    } else {
        botao.textContent = texto;
    }
}

if (!formulario) {
    console.error(
        'Erro: não encontrei o formulário "formPublicarPlanta".'
    );
} else {
    carregarDestaquesPadrao();

    if (campoPreco) {
        campoPreco.addEventListener("input", function () {
            campoPreco.value = formatarMoeda(campoPreco.value);
        });
    }

    if (botaoAdicionarDestaque && campoDestaque) {
        botaoAdicionarDestaque.addEventListener("click", function () {
            adicionarDoCampo();
            campoDestaque.focus();
        });

        // Enter no campo adiciona o destaque em vez de enviar o formulário.
        campoDestaque.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                adicionarDoCampo();
            }
        });
    }

    formulario.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!window.PlantasStorage) {
            avisar("O serviço de plantas não foi carregado.");
            return;
        }

        function valorCampo(id) {
            return document.getElementById(id)?.value.trim() || "";
        }

        const titulo = valorCampo("titulo");
        const descricao = valorCampo("descricao");
        const categoria = valorCampo("categoria");
        const estilo = valorCampo("estilo");
        const distribuicaoAmbientes = valorCampo(
            "distribuicaoAmbientes"
        );

        const quartosTexto = valorCampo("quartos");
        const banheirosTexto = valorCampo("banheiros");
        const garagemTexto = valorCampo("garagem");
        const areaTexto = valorCampo("area");
        const precoTexto = valorCampo("preco");

        const arquivo = document.getElementById("imagem")?.files[0];

        // Confirma qualquer destaque que ainda esteja digitado.
        adicionarDoCampo();

        const destaques = obterDestaquesAtuais();

        // Campos obrigatórios.
        if (
            !titulo ||
            !descricao ||
            !categoria ||
            !quartosTexto ||
            !banheirosTexto ||
            !garagemTexto ||
            !areaTexto ||
            !precoTexto
        ) {
            avisar("Preencha todos os campos obrigatórios.");
            return;
        }

        const quartos = Number(quartosTexto);
        const banheiros = Number(banheirosTexto);
        const garagem = Number(garagemTexto);
        const area = Number(areaTexto);
        const preco = lerPreco(precoTexto);

        if (
            !Number.isInteger(quartos) ||
            quartos < 0 ||
            !Number.isInteger(banheiros) ||
            banheiros < 0 ||
            !Number.isInteger(garagem) ||
            garagem < 0
        ) {
            avisar(
                "Quartos, banheiros e vagas na garagem devem ser números inteiros (podem ser zero)."
            );
            return;
        }

        if (!Number.isFinite(area) || area <= 0 || area > AREA_MAXIMA) {
            avisar(
                `A área deve ser maior que zero e ter no máximo ${AREA_MAXIMA.toLocaleString("pt-BR")} m².`
            );
            return;
        }

        if (!Number.isFinite(preco) || preco <= 0 || preco > PRECO_MAXIMO) {
            avisar(
                `O preço deve ser maior que zero e ter no máximo R$ ${PRECO_MAXIMO.toLocaleString("pt-BR")}.`
            );
            return;
        }

        if (!arquivo) {
            avisar("Selecione uma imagem para a planta.");
            return;
        }

        if (!imagemValida(arquivo)) {
            avisar("A imagem deve ser JPEG (.jpg, .jpeg, .jfif), PNG ou WebP.");
            return;
        }

        if (arquivo.size > 5 * 1024 * 1024) {
            avisar("A imagem deve ter no máximo 5 MB.");
            return;
        }

        const botao = formulario.querySelector(
            'button[type="submit"], input[type="submit"]'
        );

        const textoOriginal = botao ? lerTextoBotao(botao) : "";

        try {
            if (botao) {
                botao.disabled = true;
                definirTextoBotao(botao, "Publicando...");
            }

            const imagem = await lerImagem(arquivo);

            const planta = {
                titulo,
                descricao,
                categoria,
                estilo,
                quartos,
                banheiros,
                garagem,
                area,
                preco,
                imagem,
                destaques,
                distribuicaoAmbientes
            };

            const dados = await window.PlantasStorage.salvarPlanta(planta);

            console.log("Planta publicada:", dados);

            mostrarPopup({
                tipo: "sucesso",
                titulo: "Planta publicada!",
                mensagem: "Sua planta já está disponível no site.",
                botoes: [
                    { texto: "Publicar outra", principal: false },
                    {
                        texto: "Ver minhas plantas",
                        principal: true,
                        aoClicar: function () {
                            window.location.href = "./Projetos.html";
                        }
                    }
                ]
            });

            formulario.reset();
            carregarDestaquesPadrao();

        } catch (erro) {
            console.error("Erro ao publicar a planta:", erro);

            mostrarPopup({
                tipo: "erro",
                titulo: "Não foi possível publicar",
                mensagem: erro.message
            });
        } finally {
            if (botao) {
                botao.disabled = false;
                definirTextoBotao(botao, textoOriginal);
            }
        }
    });
}