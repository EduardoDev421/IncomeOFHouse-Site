/* =========================================================
   CONTA - identifica se quem está logado é "usuario" ou "profissional"
   e monta o menu lateral certo. Use em TODA página compartilhada
   (Mensagem, Meus Endereços, Configurações...).

   No login, grave o tipo da conta:   Conta.definir("profissional");
   No "Sair":                          Conta.limpar();  (o menu já faz isso)

   Páginas EXCLUSIVAS de um tipo (perfilUsuario, MeusPedidos, PerfilProfissional,
   Projetos...) se declaram sozinhas com um atributo no body + este script:
       <body data-conta="usuario">   ou   <body data-conta="profissional">
   Assim o tipo nunca fica errado, mesmo sem login pronto.

   TESTE sem login: abra a página com ?tipo=profissional ou ?tipo=usuario.
   Vale só para a aba atual (some ao fechar a aba) e NÃO sobrescreve o
   login. Use ?tipo=limpar para desfazer o teste.

   OBS.: isto só muda o que aparece na tela. A permissão de verdade
   precisa ser validada no servidor.
========================================================= */

const Conta = (() => {
    const CHAVE = "tipoConta";          // gravado no login (localStorage)
    const TESTE = "tipoContaTeste";     // só para testes via ?tipo= (sessionStorage)
    const TIPOS = ["usuario", "profissional"];

    const MENUS = {
        usuario: [
            { id: "perfil", texto: "Meu Perfil", href: "perfilUsuario.html", icone: "IconePerfil.svg" },
            { id: "enderecos", texto: "Meus Endereços", href: "MeusEndereços.html", icone: "IconeEndereco.svg" },
            { id: "pedidos", texto: "Meus Pedidos", href: "MeusPedidos.html", icone: "IconeProjetos.svg" },
            { id: "favoritos", texto: "Meus Profissionais Favoritos", href: "MeusProfissionais.html", icone: "IconeEstrela.svg" },
            { id: "salvos", texto: "Projetos Salvos", href: "ProjetosSalvos.html", icone: "IconeSalvos.svg" },
            { id: "agendamentos", texto: "Agendamentos", href: "Agendamentos.html", icone: "IconeData.svg" },
            { id: "mensagem", texto: "Mensagem", href: "Mensagem.html", icone: "IconeMensagem.svg" },
            { id: "config", texto: "Configurações", href: "ConfiguraçõesUsuario.html", icone: "IconeConfiguracao.svg" },
            { id: "sair", texto: "Sair", href: "../index.html", icone: "IconeSair.svg" }
        ],
        profissional: [
            { id: "perfil", texto: "Meu Perfil", href: "PerfilProfissional.html", icone: "IconePerfil.svg" },
            { id: "enderecos", texto: "Meus Endereços", href: "MeusEndereços.html", icone: "IconeEndereco.svg" },
            { id: "portfolio", texto: "Meu Portfolio", href: "MeuPortfolio.html", icone: "iconePortfolio.svg" },
            { id: "plantas", texto: "Publicar Plantas", href: "publicarPlanta.html", icone: "IconePublicarPlantas.svg" },
            { id: "projetos", texto: "Projetos", href: "Projetos.html", icone: "IconeProjetos.svg" },
            { id: "avaliacoes", texto: "Avaliações", href: "Avaliações.html", icone: "IconeEstrela.svg" },
            { id: "agendamentos", texto: "Agendamentos", href: "Agendamentos.html", icone: "IconeData.svg" },
            { id: "mensagem", texto: "Mensagem", href: "Mensagem.html", icone: "IconeMensagem.svg" },
            { id: "config", texto: "Configurações", href: "ConfiguraçõesProfissionais.html", icone: "IconeConfiguracao.svg" },
            { id: "sair", texto: "Sair", href: "../index.html", icone: "IconeSair.svg" }
        ]
    };

    function definir(tipo) {
        if (!TIPOS.includes(tipo)) return;
        try {
            localStorage.setItem(CHAVE, tipo);
            sessionStorage.removeItem(TESTE); // o tipo declarado vale mais que um teste antigo
        } catch (_) { /* storage bloqueado */ }
    }

    function limpar() {
        try { localStorage.removeItem(CHAVE); sessionStorage.removeItem(TESTE); } catch (_) { /* ignora */ }
    }

    function tipo() {
        try {
            const param = new URLSearchParams(location.search).get("tipo");
            if (TIPOS.includes(param)) sessionStorage.setItem(TESTE, param);
            if (param === "limpar") sessionStorage.removeItem(TESTE);

            const teste = sessionStorage.getItem(TESTE);
            if (TIPOS.includes(teste)) return teste;

            const salvo = localStorage.getItem(CHAVE);
            if (TIPOS.includes(salvo)) return salvo;
        } catch (_) { /* storage bloqueado */ }
        return "usuario";
    }

    // Se a conta não for do tipo esperado, manda para a página certa
    function exigir(esperado, destino) {
        if (tipo() !== esperado) location.replace(destino);
    }

    function renderMenu(ativoId) {
        const ul = document.querySelector(".menu-lateral ul");
        if (!ul) return;

        ul.innerHTML = MENUS[tipo()].map((i) => `
            <li${i.id === ativoId ? ' class="ativo"' : ""}>
                <a href="${i.href}"${i.id === ativoId ? ' aria-current="page"' : ""}>
                    <img src="../img/icones/${i.icone}" alt=""><span>${i.texto}</span>
                </a>
            </li>`).join("");

        // "Sair" encerra a sessão local
        const sair = ul.querySelector('a[href="../index.html"]');
        if (sair) sair.addEventListener("click", limpar);
    }

    // Páginas exclusivas de um tipo declaram quem são: <body data-conta="usuario">
    function declarar() {
        const t = document.body && document.body.dataset.conta;
        if (TIPOS.includes(t)) definir(t);
    }
    if (document.body) declarar();
    else document.addEventListener("DOMContentLoaded", declarar);

    return { tipo, definir, limpar, exigir, renderMenu };
})();