/* publicarPlanta.js */

const formulario = document.getElementById("formPublicarPlanta");

const listaDestaques = document.getElementById("listaDestaques");
const campoDestaque = document.getElementById("destaquesPersonalizados");
const botaoAdicionarDestaque = document.getElementById(
    "botaoAdicionarDestaque"
);

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
            alert("O serviço de plantas não foi carregado.");
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
            alert("Preencha todos os campos obrigatórios.");
            return;
        }

        const quartos = Number(quartosTexto);
        const banheiros = Number(banheirosTexto);
        const garagem = Number(garagemTexto);
        const area = Number(areaTexto);
        const preco = Number(precoTexto);

        if (
            !Number.isInteger(quartos) ||
            quartos <= 0 ||
            !Number.isInteger(banheiros) ||
            banheiros < 1 ||
            !Number.isInteger(garagem) ||
            garagem < 0 ||
            !Number.isFinite(area) ||
            area <= 0 ||
            !Number.isFinite(preco) ||
            preco <= 0
        ) {
            alert(
                "Confira os números: quartos e banheiros devem ser inteiros positivos; garagem pode ser zero; área e preço devem ser positivos."
            );
            return;
        }

        if (!arquivo) {
            alert("Selecione uma imagem para a planta.");
            return;
        }

        if (
            !["image/jpeg", "image/png", "image/webp"].includes(
                arquivo.type
            )
        ) {
            alert("A imagem deve ser JPEG, PNG ou WebP.");
            return;
        }

        if (arquivo.size > 5 * 1024 * 1024) {
            alert("A imagem deve ter no máximo 5 MB.");
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

            alert("Planta publicada com sucesso!");

            formulario.reset();
            carregarDestaquesPadrao();

        } catch (erro) {
            console.error("Erro ao publicar a planta:", erro);

            alert(
                "Não foi possível publicar a planta.\n" +
                erro.message
            );
        } finally {
            if (botao) {
                botao.disabled = false;
                definirTextoBotao(botao, textoOriginal);
            }
        }
    });
}