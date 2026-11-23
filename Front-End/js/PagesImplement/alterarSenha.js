// Front-End/js/alterarSenha.js
import { supabase } from "../lib/supabaseClient.js";

const camposSenha = document.querySelectorAll('.form-side input[type="password"]');
const botaoAlterar = document.querySelector(".btn-submit");
const segmentosForca = document.querySelectorAll(".strength-bar .seg");
const textoForca = document.querySelector(".strength-label");

let sessaoUser = null;

if (camposSenha.length < 3 || !botaoAlterar) {
    console.error("[AlterarSenha] Campos ou botão não encontrados na página.");
} else {
    iniciar();
}

function iniciar() {
    const [senhaAtual, novaSenha, confirmarSenha] = camposSenha;

    /* ---------- Mensagens ---------- */
    let mensagemStatus = document.querySelector(".mensagem-alterar-senha");
    if (!mensagemStatus) {
        mensagemStatus = document.createElement("div");
        mensagemStatus.className = "mensagem-alterar-senha";
        const formSide = document.querySelector(".form-side");
        formSide?.insertBefore(mensagemStatus, formSide.firstChild);
    }

    const mostrarMensagem = (texto, tipo) => {
        mensagemStatus.textContent = texto;
        mensagemStatus.className = `mensagem-alterar-senha ${tipo}`;
    };

    const limparMensagem = () => {
        mensagemStatus.textContent = "";
        mensagemStatus.className = "mensagem-alterar-senha";
    };

    /* ---------- Força da senha ---------- */
    function analisarForcaSenha(senha) {
        let pontos = 0;
        if (senha.length >= 8) pontos++;
        if (/[a-z]/.test(senha)) pontos++;
        if (/[A-Z]/.test(senha)) pontos++;
        if (/[0-9]/.test(senha)) pontos++;
        if (/[^A-Za-z0-9]/.test(senha)) pontos++;
        if (senha.length >= 12) pontos++;

        if (pontos <= 2) return { nivel: "fraca", quantidade: 1, texto: "Força da senha: fraca" };
        if (pontos <= 4) return { nivel: "media", quantidade: 2, texto: "Força da senha: média" };
        return { nivel: "forte", quantidade: 3, texto: "Força da senha: forte" };
    }

    function atualizarForcaSenha() {
        const senha = novaSenha.value;

        segmentosForca.forEach((seg) => seg.classList.remove("filled", "forca-fraca", "forca-media", "forca-forte"));

        if (!senha) {
            if (textoForca) textoForca.textContent = "Força da senha";
            return;
        }

        const r = analisarForcaSenha(senha);
        for (let i = 0; i < r.quantidade; i++) {
            segmentosForca[i]?.classList.add("filled", `forca-${r.nivel}`);
        }
        if (textoForca) textoForca.textContent = r.texto;
    }

    const senhaValida = (s) =>
        s.length >= 8 && /[a-z]/.test(s) && /[A-Z]/.test(s) && /[0-9]/.test(s) && /[^A-Za-z0-9]/.test(s);

    novaSenha.addEventListener("input", atualizarForcaSenha);
    camposSenha.forEach((campo) => campo.addEventListener("input", limparMensagem));

    /* ---------- Mostrar / ocultar senha ---------- */
    document.querySelectorAll(".eye-ic").forEach((olho, indice) => {
        const campo = camposSenha[indice];
        if (!campo) return;

        olho.style.cursor = "pointer";
        olho.style.opacity = "0.6";
        olho.setAttribute("role", "button");
        olho.setAttribute("aria-label", "Mostrar senha");
        olho.tabIndex = 0;

        const alternar = () => {
            const mostrar = campo.type === "password";
            campo.type = mostrar ? "text" : "password";
            olho.style.opacity = mostrar ? "1" : "0.6";
            olho.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
        };

        olho.addEventListener("click", alternar);
        olho.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                alternar();
            }
        });
    });

    /* ---------- Erros do Supabase em português ---------- */
    function textoErro(erro) {
        const m = String(erro?.message || "").toLowerCase();
        const codigo = erro?.code || "";

        if (codigo === "same_password" || m.includes("different from the old password"))
            return "A nova senha deve ser diferente da senha atual.";
        if (codigo === "weak_password" || m.includes("weak"))
            return "A nova senha é fraca demais. Use letras, números e símbolos.";
        if (codigo === "over_request_rate_limit" || m.includes("rate limit"))
            return "Muitas tentativas. Aguarde um pouco e tente novamente.";
        if (m.includes("failed to fetch"))
            return "Sem conexão com o servidor. Tente novamente.";
        return erro?.message || "Ocorreu um erro ao alterar a senha.";
    }

    const senhaAtualIncorreta = (erro) =>
        erro?.code === "invalid_credentials" || /invalid login credentials/i.test(erro?.message || "");

    /* ---------- Envio ---------- */
    async function enviar(evento) {
        evento?.preventDefault();
        limparMensagem();

        const atual = senhaAtual.value;
        const nova = novaSenha.value;
        const confirmar = confirmarSenha.value;

        const recusar = (texto, campo) => {
            mostrarMensagem(texto, "erro");
            campo?.focus();
        };

        if (!sessaoUser?.email) return recusar("Não foi possível identificar o usuário. Faça login novamente.");
        if (!atual) return recusar("Digite sua senha atual.", senhaAtual);
        if (!nova) return recusar("Digite sua nova senha.", novaSenha);
        if (nova.length < 8) return recusar("A nova senha deve possuir pelo menos 8 caracteres.", novaSenha);
        if (!senhaValida(nova))
            return recusar("A nova senha deve conter letras maiúsculas, minúsculas, números e símbolos.", novaSenha);
        if (!confirmar) return recusar("Confirme sua nova senha.", confirmarSenha);
        if (nova !== confirmar) return recusar("A confirmação da senha não corresponde à nova senha.", confirmarSenha);
        if (atual === nova) return recusar("A nova senha deve ser diferente da senha atual.", novaSenha);

        const textoOriginal = botaoAlterar.textContent;
        botaoAlterar.disabled = true;
        botaoAlterar.textContent = "Alterando senha...";

        try {
            // 1) confirma a senha atual (também renova a sessão, exigência do Supabase para trocar senha)
            const { error: erroLogin } = await supabase.auth.signInWithPassword({
                email: sessaoUser.email,
                password: atual
            });
            if (erroLogin) {
                if (senhaAtualIncorreta(erroLogin)) return recusar("Senha atual incorreta.", senhaAtual);
                throw erroLogin;
            }

            // 2) troca a senha
            const { error } = await supabase.auth.updateUser({ password: nova });
            if (error) throw error;

            // 3) encerra as outras sessões (outros dispositivos), mantendo esta
            try {
                await supabase.auth.signOut({ scope: "others" });
            } catch (e) {
                console.warn("[AlterarSenha] Não foi possível encerrar as outras sessões:", e);
            }

            mostrarMensagem("Senha alterada com sucesso!", "sucesso");
            camposSenha.forEach((c) => { c.value = ""; });
            atualizarForcaSenha();
        } catch (erro) {
            console.error("[AlterarSenha]", erro);
            mostrarMensagem(textoErro(erro), "erro");
        } finally {
            botaoAlterar.disabled = !sessaoUser;
            botaoAlterar.textContent = textoOriginal;
        }
    }

    botaoAlterar.addEventListener("click", enviar);
    camposSenha.forEach((campo) =>
        campo.addEventListener("keydown", (e) => {
            if (e.key === "Enter") enviar(e);
        })
    );

    /* ---------- Sair ---------- */
    document.querySelectorAll(".menu-lateral a").forEach((link) => {
        const ehSair = link.querySelector('img[src*="IconeSair"]') || link.textContent.trim().toLowerCase() === "sair";
        if (!ehSair) return;

        link.addEventListener("click", async (e) => {
            e.preventDefault();
            if (!confirm("Deseja realmente sair da sua conta?")) return;
            try {
                await supabase.auth.signOut();
            } catch (erro) {
                console.error("[AlterarSenha] Erro ao sair:", erro);
            }
            window.location.replace("../../index.html");
        });
    });

    /* ---------- Sessão ---------- */
    (async () => {
        atualizarForcaSenha();

        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
            botaoAlterar.disabled = true;
            mostrarMensagem("Você precisa entrar na sua conta para alterar a senha.", "erro");
            return;
        }
        sessaoUser = session.user;
    })();
}