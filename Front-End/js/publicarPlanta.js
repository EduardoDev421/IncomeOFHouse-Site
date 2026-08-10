const formulario = document.getElementById("formPublicarPlanta");

formulario.addEventListener("submit", function (evento) {

    evento.preventDefault();

    const titulo = document.getElementById("titulo").value.trim();
    const descricao = document.getElementById("descricao").value.trim();
    const categoria = document.getElementById("categoria").value;
    const quartos = document.getElementById("quartos").value;
    const banheiros = document.getElementById("banheiros").value;
    const garagem = document.getElementById("garagem").value;
    const area = document.getElementById("area").value;
    const preco = document.getElementById("preco").value;
    const imagem = document.getElementById("imagem").files[0];

    if (
        !titulo ||
        !descricao ||
        !categoria ||
        !quartos ||
        !banheiros ||
        !garagem ||
        !area ||
        !preco
    ) {
        alert("Preencha todos os campos obrigatórios.");
        return;
    }

    const novaPlanta = {
        titulo,
        descricao,
        categoria,
        quartos,
        banheiros,
        garagem,
        area,
        preco,
        imagem: imagem ? imagem.name : "Sem imagem"
    };

    console.log("Nova planta:", novaPlanta);

    alert("Planta publicada com sucesso!");

    formulario.reset();

});