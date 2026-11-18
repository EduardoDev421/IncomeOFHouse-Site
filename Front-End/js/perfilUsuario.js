/* =========================================================
   PERFIL DO USUÁRIO
   - Carrega os dados da conta (API)
   - Editar Perfil: janela com nome, e-mail, telefone, CPF e
     data de nascimento (salva no banco)
   - Sair da conta

   Precisa de:  ../css/mensagens.css  e  ../js/mensagens.js
   (mensagens.js deve ser carregado ANTES deste arquivo)
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    const API_BASE = "http://localhost:3000";
    const CHAVE_TOKEN = "incomeOfHouses_token";
    const CHAVE_USUARIO = "incomeOfHouses_usuario";

    const nomeUsuario = document.querySelector(".dados-usuario h2");
    const emailUsuario = document.querySelector(".dados-usuario > p");
    const informacoes = document.querySelectorAll(".card-informacoes .item");
    const botaoEditar = document.querySelector(".editar-perfil");
    const token = localStorage.getItem(CHAVE_TOKEN);

    if (!nomeUsuario || !emailUsuario) {
        console.error("[Perfil] Elementos do perfil não encontrados.");
        return;
    }

    // Garantia: se o mensagens.js não foi carregado, cria uma versão mínima aqui
    // (os estilos continuam vindo do mensagens.css)
    if (!window.Mensagem) {
        console.warn("[Perfil] mensagens.js não foi carregado; usando a versão interna.");

        window.Mensagem = {
            mostrar(container, tipo, texto, opcoes = {}) {
                const grupo = opcoes.grupo || "padrao";
                this.limpar(container, grupo);

                const card = document.createElement("div");
                card.className = `card-mensagem card-${tipo}` + (opcoes.topo ? " card-topo" : "");
                card.dataset.grupo = grupo;
                card.setAttribute("role", tipo === "erro" ? "alert" : "status");

                const conteudo = document.createElement("span");
                conteudo.textContent = texto;

                if (opcoes.link) {
                    const link = document.createElement("a");
                    link.href = opcoes.link.href;
                    link.textContent = opcoes.link.texto;
                    conteudo.append(" ", link);
                }

                card.append(conteudo);

                if (opcoes.posicao === "inicio") container.prepend(card);
                else container.append(card);

                if (opcoes.tempo) setTimeout(() => card.remove(), opcoes.tempo);
                return card;
            },
            limpar(container, grupo = "padrao") {
                container?.querySelectorAll(`.card-mensagem[data-grupo="${grupo}"]`)
                    .forEach(card => card.remove());
            }
        };
    }

    let usuarioAtual = null;
    // Se não deu para carregar o perfil, guarda o motivo para mostrar ao clicar em Editar
    let motivoBloqueio = "";

    /* ---------- BOTÃO EDITAR (sempre ativo, para explicar o motivo) ---------- */
    if (botaoEditar) {
        botaoEditar.addEventListener("click", () => {
            if (!usuarioAtual) {
                mostrarAviso(motivoBloqueio || "Não foi possível carregar o perfil.");
                window.scrollTo({ top: 0, behavior: "smooth" });
                return;
            }
            abrirEdicao();
        });
    }

    /* ---------- CARREGAR PERFIL ---------- */
    if (!token) {
        motivoBloqueio = "Você precisa entrar na sua conta para ver e editar o perfil.";
        mostrarAviso(motivoBloqueio);
    } else {
        try {
            const resposta = await fetch(`${API_BASE}/api/usuarios/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const dados = await resposta.json().catch(() => ({}));

            if (resposta.status === 401) {
                // Sessão inválida (o servidor guarda as sessões na memória: reiniciar desloga)
                localStorage.removeItem(CHAVE_TOKEN);
                localStorage.removeItem(CHAVE_USUARIO);
                throw new Error("Sua sessão expirou. Entre novamente na sua conta.");
            }
            if (!resposta.ok) throw new Error(dados.erro || "Não foi possível carregar o perfil.");

            usuarioAtual = dados.usuario;
            renderizar(usuarioAtual);
            salvarLocal(usuarioAtual);
        } catch (erro) {
            console.error("[Perfil]", erro);
            motivoBloqueio = erro.name === "TypeError"
                ? `Não foi possível conectar ao servidor (${API_BASE}). Verifique se ele está ligado (node server.js).`
                : (erro.message || "Não foi possível carregar o perfil.");
            mostrarAviso(motivoBloqueio);
        }
    }

    /* ---------- MOSTRAR DADOS ---------- */
    function renderizar(usuario) {
        nomeUsuario.textContent = usuario.nome || "Usuário";
        emailUsuario.textContent = usuario.email || "E-mail não informado";

        informacoes.forEach(item => {
            const titulo = item.querySelector(".item-text span")?.dataset.original
                || item.querySelector(".item-text span")?.textContent.trim().toLowerCase();
            const valor = item.querySelector(".item-text strong");
            if (!valor || !titulo) return;

            if (titulo === "nome completo") valor.textContent = usuario.nome || "Não informado";
            if (titulo === "e-mail") valor.textContent = usuario.email || "Não informado";
            if (titulo === "cpf") valor.textContent = formatarCPF(usuario.cpf) || "Não informado";
            if (titulo === "telefone") valor.textContent = formatarTelefone(usuario.telefone) || "Não informado";
            if (titulo === "data de nascimento") valor.textContent = formatarData(usuario.data_nascimento) || "Não informado";
            if (titulo === "senha") valor.textContent = "••••••••••";
        });

        const membro = document.querySelector(".membro-desde p");
        if (membro) {
            const data = usuario.criado_em ? new Date(usuario.criado_em) : null;
            membro.textContent = data && !Number.isNaN(data.getTime())
                ? `Membro desde: ${data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`
                : "Membro desde: data não informada";
        }
    }

    function salvarLocal(usuario) {
        localStorage.setItem(CHAVE_USUARIO, JSON.stringify({
            id: usuario.id, nome: usuario.nome, email: usuario.email
        }));
    }

    /* ---------- JANELA DE EDIÇÃO ---------- */
    let janela = null;

    function criarJanela() {
        janela = document.createElement("div");
        janela.className = "edicao-modal";
        janela.hidden = true;
        janela.innerHTML =
            '<form class="edicao-caixa" novalidate>' +
                '<div class="edicao-topo">' +
                    "<h3>Editar Perfil</h3>" +
                    '<button type="button" class="edicao-fechar" aria-label="Fechar">✕</button>' +
                "</div>" +
                '<div class="edicao-corpo">' +
                    '<label>Nome completo<input type="text" name="nome" maxlength="150" autocomplete="name"></label>' +
                    '<label>E-mail<input type="email" name="email" maxlength="254" autocomplete="email"></label>' +
                    '<label>Telefone<input type="text" name="telefone" inputmode="numeric" placeholder="(00) 00000-0000" maxlength="15" autocomplete="tel"></label>' +
                    '<label>CPF<input type="text" name="cpf" inputmode="numeric" placeholder="000.000.000-00" maxlength="14"></label>' +
                    '<label>Data de nascimento<input type="date" name="dataNascimento"></label>' +
                    '<div class="edicao-mensagens"></div>' +
                "</div>" +
                '<div class="edicao-rodape">' +
                    '<button type="button" class="edicao-cancelar">Cancelar</button>' +
                    '<button type="submit" class="edicao-salvar">Salvar alterações</button>' +
                "</div>" +
            "</form>";
        document.body.appendChild(janela);

        const form = janela.querySelector("form");

        // Máscaras enquanto digita
        form.elements.telefone.addEventListener("input", e => {
            e.target.value = formatarTelefone(e.target.value);
        });
        form.elements.cpf.addEventListener("input", e => {
            e.target.value = formatarCPF(e.target.value);
        });

        // Tira o destaque vermelho quando a pessoa volta a digitar no campo
        form.addEventListener("input", e => {
            e.target.classList?.remove("campo-invalido");
        });

        janela.addEventListener("click", e => {
            if (e.target === janela || e.target.closest(".edicao-fechar, .edicao-cancelar")) fecharEdicao();
        });
        document.addEventListener("keydown", e => {
            if (e.key === "Escape" && !janela.hidden) fecharEdicao();
        });
        form.addEventListener("submit", salvarEdicao);
    }

    /* ---------- Mensagens dentro da janela de edição ---------- */
    function limparErroEdicao() {
        if (!janela) return;
        window.Mensagem?.limpar(janela.querySelector(".edicao-mensagens"), "edicao");
        janela.querySelectorAll(".campo-invalido").forEach(campo => {
            campo.classList.remove("campo-invalido");
        });
    }

    function mostrarErroEdicao(texto, campo = null) {
        limparErroEdicao();
        window.Mensagem?.mostrar(
            janela.querySelector(".edicao-mensagens"),
            "erro",
            texto,
            { grupo: "edicao" }
        );
        if (campo) {
            campo.classList.add("campo-invalido");
            campo.focus();
        }
    }

    function abrirEdicao() {
        if (!janela) criarJanela();
        const f = janela.querySelector("form").elements;

        f.nome.value = usuarioAtual.nome || "";
        f.email.value = usuarioAtual.email || "";
        f.telefone.value = formatarTelefone(usuarioAtual.telefone);
        f.cpf.value = formatarCPF(usuarioAtual.cpf);
        f.dataNascimento.value = dataParaInput(usuarioAtual.data_nascimento);

        limparErroEdicao();
        janela.hidden = false;
        document.body.style.overflow = "hidden";
        f.nome.focus();
    }

    function fecharEdicao() {
        janela.hidden = true;
        document.body.style.overflow = "";
    }

    async function salvarEdicao(evento) {
        evento.preventDefault();
        const form = janela.querySelector("form");
        const f = form.elements;
        const botaoSalvar = janela.querySelector(".edicao-salvar");

        const dados = {
            nome: f.nome.value.trim(),
            email: f.email.value.trim(),
            telefone: f.telefone.value.replace(/\D/g, ""),
            cpf: f.cpf.value.replace(/\D/g, ""),
            dataNascimento: f.dataNascimento.value
        };

        // Validação no navegador (mostra o primeiro problema encontrado)
        let problema = "";
        let campoProblema = null;

        if (dados.nome.length < 3 || dados.nome.length > 150) {
            problema = "O nome deve ter entre 3 e 150 caracteres.";
            campoProblema = f.nome;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) {
            problema = "Informe um e-mail válido.";
            campoProblema = f.email;
        } else if (dados.telefone && ![10, 11].includes(dados.telefone.length)) {
            problema = "Informe um telefone válido com DDD.";
            campoProblema = f.telefone;
        } else if (dados.cpf && dados.cpf.length !== 11) {
            problema = "O CPF deve ter 11 números.";
            campoProblema = f.cpf;
        } else if (dados.dataNascimento && dados.dataNascimento > new Date().toISOString().slice(0, 10)) {
            problema = "A data de nascimento não pode ser no futuro.";
            campoProblema = f.dataNascimento;
        }

        if (problema) {
            mostrarErroEdicao(problema, campoProblema);
            return;
        }

        limparErroEdicao();
        botaoSalvar.disabled = true;
        botaoSalvar.textContent = "Salvando...";

        try {
            const resposta = await fetch(`${API_BASE}/api/usuarios/me`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(dados)
            });
            const retorno = await resposta.json().catch(() => ({}));

            if (resposta.status === 401) throw new Error("Sua sessão expirou. Entre novamente na sua conta.");
            if (!resposta.ok) throw new Error(retorno.erro || "Não foi possível atualizar o perfil.");

            usuarioAtual = retorno.usuario;
            renderizar(usuarioAtual);
            salvarLocal(usuarioAtual);
            fecharEdicao();
            mostrarMensagem("Perfil atualizado com sucesso.");
        } catch (erro) {
            console.error("[Perfil]", erro);
            mostrarErroEdicao(
                erro.name === "TypeError"
                    ? "Não foi possível conectar ao servidor. Verifique se ele está ligado."
                    : (erro.message || "Erro ao salvar as alterações.")
            );
        } finally {
            botaoSalvar.disabled = false;
            botaoSalvar.textContent = "Salvar alterações";
        }
    }

    /* ---------- FORMATAÇÃO ---------- */
    function formatarCPF(valor) {
        const n = String(valor || "").replace(/\D/g, "").slice(0, 11);
        return n
            .replace(/^(\d{3})(\d)/, "$1.$2")
            .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/\.(\d{3})(\d)/, ".$1-$2");
    }

    function formatarTelefone(valor) {
        const n = String(valor || "").replace(/\D/g, "").slice(0, 11);
        if (n.length > 10) return n.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
        if (n.length > 6) return n.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
        if (n.length > 2) return n.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
        return n;
    }

    function formatarData(valor) {
        if (!valor) return "";
        const data = new Date(valor);
        return Number.isNaN(data.getTime()) ? "" : data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
    }

    function dataParaInput(valor) {
        if (!valor) return "";
        const data = new Date(valor);
        return Number.isNaN(data.getTime()) ? "" : data.toISOString().slice(0, 10);
    }

    /* ---------- AVISOS (card no topo da página) ---------- */
    function mostrarAviso(texto) {
        const conteudo = document.querySelector(".conteudo");
        if (!conteudo) return;

        window.Mensagem?.mostrar(conteudo, "erro", texto, {
            grupo: "perfil",
            posicao: "inicio",
            topo: true,
            link: { texto: "Ir para o login", href: "./Login.html" }
        });
    }

    function mostrarMensagem(texto) {
        const conteudo = document.querySelector(".conteudo");
        if (!conteudo) return;

        // Mesmo grupo do aviso: o card de sucesso substitui o de erro
        window.Mensagem?.mostrar(conteudo, "sucesso", texto, {
            grupo: "perfil",
            posicao: "inicio",
            topo: true,
            tempo: 5000
        });
    }

    /* ---------- SAIR ---------- */
    document.querySelectorAll(".menu-lateral a").forEach(link => {
        if (!/\.\.\/index\.html$/.test(link.getAttribute("href") || "") &&
            link.textContent.trim().toLowerCase() !== "sair") return;
        if (!link.querySelector('img[src*="IconeSair"]') &&
            link.textContent.trim().toLowerCase() !== "sair") return;

        link.addEventListener("click", async event => {
            event.preventDefault();
            if (!confirm("Deseja realmente sair da sua conta?")) return;
            try {
                await fetch(`${API_BASE}/api/logout`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (_) { /* segue mesmo sem servidor */ }
            ["incomeOfHouses_token", "incomeOfHouses_usuario", "usuarioLogado", "usuario", "user", "usuarioAtual"]
                .forEach(c => localStorage.removeItem(c));
            window.location.href = "../index.html";
        });
    });

    console.log("[Perfil] Script carregado.");
});