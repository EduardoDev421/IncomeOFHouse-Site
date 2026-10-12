const formulario = document.getElementById("formPublicarPlanta");

console.log(formulario);
console.log("Java esta funcionando");

// Destaques que já aparecem marcados e podem ser removidos pelo profissional
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
 
const listaDestaques = document.getElementById("listaDestaques");
const campoDestaque = document.getElementById("destaquesPersonalizados");
const botaoAdicionarDestaque = document.getElementById("botaoAdicionarDestaque");
 
// Retorna os destaques que estão na tela no momento
function obterDestaquesAtuais() {
    return Array.from(listaDestaques.querySelectorAll(".chip"))
        .map((chip) => chip.dataset.valor);
}
 
// Cria uma etiqueta de destaque com botão de remover
function adicionarDestaque(texto) {
    const valor = texto.trim();
 
    if (!valor) return;
 
    const jaExiste = obterDestaquesAtuais()
        .some((item) => item.toLowerCase() === valor.toLowerCase());
 
    if (jaExiste) return;
 
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.dataset.valor = valor;
 
    const rotulo = document.createElement("span");
    rotulo.textContent = valor;
 
    const remover = document.createElement("button");
    remover.type = "button";
    remover.textContent = "×";
    remover.setAttribute("aria-label", "Remover " + valor);
    remover.addEventListener("click", function () {
        chip.remove();
    });
 
    chip.append(rotulo, remover);
    listaDestaques.appendChild(chip);
}
 
// Adiciona o que foi digitado no input (aceita vários separados por vírgula)
function adicionarDoCampo() {
    campoDestaque.value
        .split(",")
        .forEach(adicionarDestaque);
 
    campoDestaque.value = "";
}
 
// Recria as etiquetas padrão
function carregarDestaquesPadrao() {
    listaDestaques.innerHTML = "";
    destaquesPadrao.forEach(adicionarDestaque);
}
 
// Converte o arquivo de imagem em data URL (base64), formato que o backend exige
function lerImagem(arquivo) {
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

if (!formulario) {
    console.log("Erro: formulário de publicação não encontrado.");
} else {
    carregarDestaquesPadrao();
 
    botaoAdicionarDestaque.addEventListener("click", function () {
        adicionarDoCampo();
        campoDestaque.focus();
    });
 
    // Enter no input adiciona o destaque em vez de enviar o formulário
    campoDestaque.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            adicionarDoCampo();
        }
    });

    formulario.addEventListener("submit", async function (event) {
        event.preventDefault();

        const obterValor = (id) =>
            document.getElementById(id)?.value.trim() || "";

        // 1. Buscar os campos do formulário
        const titulo = document.getElementById("titulo").value.trim();
        const descricao = document.getElementById("descricao").value.trim();
        const quartos = document.getElementById("quartos").value;
        const area = document.getElementById("area").value;

        // 2. Buscar os demais campos
        const estilo = document.getElementById("estilo")?.value || "";
        const categoria = document.getElementById("categoria")?.value || "";
        const banheiros = document.getElementById("banheiros")?.value || "0";
        const garagem = document.getElementById("garagem")?.value || "0";
        const preco = document.getElementById("preco")?.value || "";
    
        const distribuicaoAmbientes =
            obterValor("distribuicaoAmbientes");

        // A imagem é um ARQUIVO: use .files[0], nunca .value
        const arquivo = document.getElementById("imagem")?.files[0];

        // Se algo foi digitado e não confirmado, adiciona antes de coletar
        adicionarDoCampo();
 
        // Coleta os destaques que estão na tela (padrão + personalizados)
        const destaques = obterDestaquesAtuais();

        // 3. Validar os campos obrigatórios
        if (!titulo || !descricao || !categoria || !quartos || !area || !preco) {
            alert("Por favor, preencha todos os campos obrigatórios.");
            return;
        }

        if (Number(quartos) <= 0 || Number(area) <= 0 || Number(preco) <= 0) {
            alert("Quartos, área e preço devem ser números positivos.");
            return;
        }

        if (
            banheiros === "" ||
            garagem === "" ||
            !Number.isInteger(Number(banheiros)) ||
            !Number.isInteger(Number(garagem)) ||
            Number(banheiros) < 1 ||
            Number(garagem) < 0
        ) {
            alert("Confira a quantidade de banheiros e garagens.");
            return;
        }

        if (!arquivo) {
            alert("Selecione uma imagem.");
            return;
        }

        if (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type)) {
            alert("A imagem deve ser JPEG, PNG ou WebP.");
            return;
        }

        if (arquivo.size > 5 * 1024 * 1024) {
            alert("A imagem deve ter no máximo 5 MB.");
            return;
        }

        // 4. Localizar o botão para evitar envios repetidos
        const botao = formulario.querySelector("button[type='submit']");

        try {
            if (botao) {
                botao.disabled = true;
                botao.textContent = "Publicando...";
            }

            // 5. Ler a imagem e organizar os dados da planta
            const imagem = await lerImagem(arquivo);

            const planta = {
                titulo: titulo,
                descricao: descricao,
                categoria: categoria,
                estilo: estilo,
                quartos: Number(quartos),
                banheiros: Number(banheiros),
                garagem: Number(garagem),
                area: Number(area),
                preco: Number(preco),
                imagem: imagem,
                destaques: destaques,
                distribuicaoAmbientes: distribuicaoAmbientes
            };

            // 6. Enviar a planta para o backend
            const resposta = await fetch("http://localhost:3000/plantas", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(planta)
            });

            // 7. Ler a resposta do backend
            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(dados.erro || "Erro ao publicar planta.");
            }

            // 8. Informar que a publicação deu certo
            alert("Planta publicada com sucesso!");
            console.log("Planta publicada:", dados);

            // 9. Limpar o formulário e restaurar os destaques padrão
            formulario.reset();
            carregarDestaquesPadrao();

        } catch (erro) {
            console.error("Erro ao publicar planta:", erro);

            alert(
                "Não foi possível publicar a planta.\n" +
                erro.message
            );

        } finally {
            // 10. Liberar o botão novamente
            if (botao) {
                botao.disabled = false;
                botao.textContent = "Publicar Planta";
            }
        }
    });
}