(function () {
    // Dados de exemplo (troque pelos dados reais/back-end depois)
    var PROJETOS = [
        { id: 1, nome: "Casa Térrea Moderna", profissional: "Carlos Silva", tipo: "Residencial", area: 120, valor: 85000, nota: 4.8, ordem: 6, link: "DetalheProjeto.html" },
        { id: 2, nome: "Sobrado Compacto 3 Quartos", profissional: "Fernanda Lima", tipo: "Residencial", area: 150, valor: 120000, nota: 4.9, ordem: 5, link: "DetalheProjeto.html" },
        { id: 3, nome: "Loja Comercial Centro", profissional: "Juliana Martins", tipo: "Comercial", area: 80, valor: 95000, nota: 4.5, ordem: 4, link: "DetalheProjeto.html" },
        { id: 4, nome: "Reforma de Apartamento", profissional: "Lucas Pereira", tipo: "Reforma", area: 70, valor: 45000, nota: 4.7, ordem: 3, link: "DetalheProjeto.html" },
        { id: 5, nome: "Kitnets para Locação", profissional: "Rafael Costa", tipo: "Residencial", area: 200, valor: 210000, nota: 4.6, ordem: 2, link: "DetalheProjeto.html" },
        { id: 6, nome: "Galpão Comercial", profissional: "Carlos Silva", tipo: "Comercial", area: 300, valor: 320000, nota: 0, ordem: 1, link: "DetalheProjeto.html" }
    ];

    var KEY = "projetosFavoritos";
    var favoritos = carregar();
    var tipoAtual = "todos";

    var grade = document.getElementById("grade");
    var vazio = document.getElementById("semProjetos");
    var contagem = document.getElementById("contagem");
    var busca = document.getElementById("busca");
    var selOrdem = document.getElementById("selOrdem");
    var chips = document.getElementById("chips");

    function carregar() {
        try {
            var salvo = JSON.parse(localStorage.getItem(KEY));
            if (Array.isArray(salvo)) return salvo;
        } catch (e) {}
        return PROJETOS.map(function (p) { return p.id; }); // começa com todos favoritados
    }

    function salvar() {
        try { localStorage.setItem(KEY, JSON.stringify(favoritos)); } catch (e) {}
    }

    function moeda(v) {
        return "R$ " + Number(v).toLocaleString("pt-BR");
    }

    function esc(t) {
        var d = document.createElement("div");
        d.textContent = t;
        return d.innerHTML;
    }

    function atualizarResumo() {
        var lista = PROJETOS.filter(function (p) { return favoritos.indexOf(p.id) !== -1; });
        var soma = lista.reduce(function (s, p) { return s + p.valor; }, 0);
        document.getElementById("resTotal").textContent = lista.length;
        document.getElementById("resRes").textContent = lista.filter(function (p) { return p.tipo === "Residencial"; }).length;
        document.getElementById("resCom").textContent = lista.filter(function (p) { return p.tipo === "Comercial"; }).length;
        document.getElementById("resValor").textContent = lista.length ? moeda(Math.round(soma / lista.length)) : "R$ 0";
    }

    function filtrar() {
        var termo = busca.value.trim().toLowerCase();
        var lista = PROJETOS.filter(function (p) {
            if (favoritos.indexOf(p.id) === -1) return false;
            if (tipoAtual !== "todos" && p.tipo !== tipoAtual) return false;
            if (termo && (p.nome + " " + p.profissional).toLowerCase().indexOf(termo) === -1) return false;
            return true;
        });

        var ordem = selOrdem.value;
        lista.sort(function (a, b) {
            if (ordem === "valor") return b.valor - a.valor;
            if (ordem === "nota") return b.nota - a.nota;
            if (ordem === "nome") return a.nome.localeCompare(b.nome, "pt-BR");
            return b.ordem - a.ordem; // recentes
        });
        return lista;
    }

    function card(p) {
        var nota = p.nota > 0
            ? '<span class="nota">★ ' + p.nota.toFixed(1) + '</span>'
            : '<span class="nota sem">Sem avaliação</span>';

        return '' +
        '<article class="projeto" data-id="' + p.id + '">' +
            '<div class="thumb">' +
                '<button class="btn-remover" aria-label="Remover dos favoritos">' +
                    '<img src="../img/icones/IconeCoracao.svg" alt="">' +
                '</button>' +
                '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8"></path><path d="M5 10v10h14V10"></path><path d="M10 20v-6h4v6"></path></svg>' +
            '</div>' +
            '<div class="corpo">' +
                '<h3>' + esc(p.nome) + '</h3>' +
                '<span class="cliente">Por ' + esc(p.profissional) + '</span>' +
                '<span class="tag">' + esc(p.tipo) + '</span>' +
                '<div class="meta">' +
                    '<div><small>Área</small><span>' + p.area + ' m²</span></div>' +
                    '<div><small>Valor</small><span>' + moeda(p.valor) + '</span></div>' +
                '</div>' +
                '<div class="rodape-card">' + nota +
                    '<a href="' + p.link + '" class="btn-detalhes">Ver Projeto</a>' +
                '</div>' +
            '</div>' +
        '</article>';
    }

    function render() {
        var lista = filtrar();
        grade.innerHTML = lista.map(card).join("");
        vazio.hidden = lista.length > 0;
        grade.hidden = lista.length === 0;
        contagem.textContent = lista.length === 1 ? "1 projeto favorito" : lista.length + " projetos favoritos";
        atualizarResumo();
    }

    // Remover dos favoritos
    grade.addEventListener("click", function (e) {
        var btn = e.target.closest(".btn-remover");
        if (!btn) return;
        var id = Number(btn.closest(".projeto").dataset.id);
        favoritos = favoritos.filter(function (f) { return f !== id; });
        salvar();
        render();
    });

    // Chips de tipo
    chips.addEventListener("click", function (e) {
        var chip = e.target.closest(".chip");
        if (!chip) return;
        chips.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("ativo"); });
        chip.classList.add("ativo");
        tipoAtual = chip.dataset.tipo;
        render();
    });

    busca.addEventListener("input", render);
    selOrdem.addEventListener("change", render);

    render();
})();