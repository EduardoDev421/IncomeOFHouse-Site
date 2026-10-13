document.addEventListener("DOMContentLoaded", async () => {
    const API_BASE = "http://localhost:3000";
    const nomeUsuario = document.querySelector(".dados-usuario h2");
    const emailUsuario = document.querySelector(".dados-usuario > p");
    const informacoes = document.querySelectorAll(".card-informacoes .item");
    const botaoEditar = document.querySelector(".editar-perfil");
    const token = localStorage.getItem("incomeOfHouses_token");

    if (!nomeUsuario || !emailUsuario) {
        console.error("Elementos do perfil não encontrados.");
        return;
    }

    if (!token) {
        mostrarAviso("Você precisa entrar na sua conta para ver o perfil.");
        if (botaoEditar) botaoEditar.disabled = true;
        return;
    }

    let usuarioAtual = null;
    try {
        const resposta = await fetch(`${API_BASE}/api/usuarios/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const dados = await resposta.json().catch(() => ({}));
        if (!resposta.ok) throw new Error(dados.erro || "Não foi possível carregar o perfil.");
        usuarioAtual = dados.usuario;
        renderizar(usuarioAtual);
        localStorage.setItem("incomeOfHouses_usuario", JSON.stringify({ id: usuarioAtual.id, nome: usuarioAtual.nome, email: usuarioAtual.email }));
    } catch (erro) {
        mostrarAviso(erro.message || "Não foi possível conectar ao servidor.");
        if (botaoEditar) botaoEditar.disabled = true;
        return;
    }

    function renderizar(usuario) {
        nomeUsuario.textContent = usuario.nome || "Usuário";
        emailUsuario.textContent = usuario.email || "E-mail não informado";
        informacoes.forEach(item => {
            const titulo = item.querySelector(".item-text span")?.textContent.trim().toLowerCase();
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

    if (botaoEditar) botaoEditar.addEventListener("click", editarPerfil);

    async function editarPerfil() {
        const nome = prompt("Digite seu novo nome:", usuarioAtual.nome || "");
        if (nome === null) return;
        const email = prompt("Digite seu novo e-mail:", usuarioAtual.email || "");
        if (email === null) return;
        if (nome.trim().length < 3 || nome.trim().length > 150) {
            alert("O nome deve ter entre 3 e 150 caracteres."); return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            alert("Informe um e-mail válido."); return;
        }
        botaoEditar.disabled = true;
        try {
            const resposta = await fetch(`${API_BASE}/api/usuarios/me`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ nome: nome.trim(), email: email.trim() })
            });
            const dados = await resposta.json().catch(() => ({}));
            if (!resposta.ok) throw new Error(dados.erro || "Não foi possível atualizar o perfil.");
            usuarioAtual = dados.usuario;
            renderizar(usuarioAtual);
            localStorage.setItem("incomeOfHouses_usuario", JSON.stringify({ id: usuarioAtual.id, nome: usuarioAtual.nome, email: usuarioAtual.email }));
            mostrarMensagem("Perfil atualizado e salvo no banco de dados.");
        } catch (erro) {
            alert(erro.message || "Erro ao salvar as alterações.");
        } finally {
            botaoEditar.disabled = false;
        }
    }

    function formatarCPF(valor) {
        const n = String(valor || "").replace(/\D/g, "");
        return n.length === 11 ? n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : n;
    }
    function formatarTelefone(valor) {
        const n = String(valor || "").replace(/\D/g, "");
        if (n.length === 11) return n.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
        if (n.length === 10) return n.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
        return n;
    }
    function formatarData(valor) {
        if (!valor) return "";
        const data = new Date(valor);
        return Number.isNaN(data.getTime()) ? "" : data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
    }
    function mostrarAviso(texto) {
        const conteudo = document.querySelector(".conteudo");
        if (!conteudo) return;
        let aviso = conteudo.querySelector(".aviso-login");
        if (!aviso) { aviso = document.createElement("div"); aviso.className = "aviso-login"; conteudo.prepend(aviso); }
        aviso.textContent = texto + " ";
        const link = document.createElement("a"); link.href = "./Login.html"; link.textContent = "Ir para o login"; aviso.appendChild(link);
    }
    function mostrarMensagem(texto) {
        let mensagem = document.querySelector(".mensagem-perfil");
        if (!mensagem) { mensagem = document.createElement("div"); mensagem.className = "mensagem-perfil"; document.querySelector(".conteudo")?.prepend(mensagem); }
        if (mensagem) mensagem.textContent = texto;
    }

    document.querySelectorAll(".menu-lateral a").forEach(link => {
        if (link.textContent.trim().toLowerCase() !== "sair") return;
        link.addEventListener("click", async event => {
            event.preventDefault();
            if (!confirm("Deseja realmente sair da sua conta?")) return;
            try { await fetch(`${API_BASE}/api/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }); } catch (_) {}
            localStorage.removeItem("incomeOfHouses_token");
            localStorage.removeItem("incomeOfHouses_usuario");
            localStorage.removeItem("usuarioLogado");
            localStorage.removeItem("usuario");
            localStorage.removeItem("user");
            localStorage.removeItem("usuarioAtual");
            window.location.href = "../index.html";
        });
    });
});
