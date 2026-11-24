// Front-End/js/iconePerfil.js  (carregar com type="module" em TODAS as páginas que têm o ícone de perfil)
// - Sem sessão: o ícone continua levando ao login.
// - Com sessão: o ícone vira o avatar da pessoa (foto, ou a inicial do nome) e leva ao perfil
//   certo (usuário -> perfilUsuario.html, profissional -> PerfilProfissional.html).
import { supabase, obterSessao, tipoDaConta } from "./services/authService.js";

// Protege as páginas internas. Home, login, cadastro e recuperação continuam públicas.
const paginaAtual = location.pathname.toLowerCase().split("/").pop();
const paginasPublicas = new Set([
  "index.html", "login.html", "cadastro.html",
  "esquecersenha.html", "redefinirsenha.html",
  "termosuso.html", "politicaprivacidade.html"
]);
const ehHome = /\/front-end\/index\.html$/.test(location.pathname.toLowerCase());

if (!ehHome && !paginasPublicas.has(paginaAtual)) {
  document.documentElement.style.visibility = "hidden";
  try {
    const sessaoInicial = await obterSessao();
    if (!sessaoInicial) {
      window.location.replace(new URL("../pages/login.html", import.meta.url).href);
    } else {
      document.documentElement.style.visibility = "";
    }
  } catch (erro) {
    console.error("Falha ao validar a sessão:", erro);
    window.location.replace(new URL("../pages/login.html", import.meta.url).href);
  }
}


// AJUSTE se precisar: seletor do ícone de perfil/login do cabeçalho.
// Se o seu ícone tiver um id ou classe própria, coloque aqui na frente.
const SELETOR_ICONE = [
  "[data-icone-perfil]",
  "#iconePerfil",
  ".icone-perfil",
  ".topo a[href*='login' i]",
  "header a[href*='login' i]",
  ".topo a[href*='perfil' i]",
  "header a[href*='perfil' i]",
].join(", ");

// Caminho até a pasta pages/ a partir da página atual
const PASTA = location.pathname.toLowerCase().includes("/pages/") ? "./" : "pages/";

const PAGINAS = {
  usuario: "perfilUsuario.html",
  profissional: "PerfilProfissional.html",
};

function estiloAvatar() {
  if (document.getElementById("estilo-avatar-perfil")) return;
  const css = document.createElement("style");
  css.id = "estilo-avatar-perfil";
  css.textContent = `
    .avatar-perfil{display:inline-flex;align-items:center;justify-content:center;
      width:40px;height:40px;border-radius:50%;overflow:hidden;
      background:#d4af6a;color:#111;font-weight:700;font-size:18px;
      font-family:inherit;line-height:1;text-transform:uppercase}
    .avatar-perfil img{width:100%;height:100%;object-fit:cover;display:block}
  `;
  document.head.append(css);
}

async function atualizarIcone() {
  const icone = document.querySelector(SELETOR_ICONE);
  if (!icone) return;

  const sessao = await obterSessao();

  if (!sessao) {
    // Deslogado: mantém o ícone de login original
    if (icone.dataset.original) icone.innerHTML = icone.dataset.original;
    delete icone.dataset.logado;
    return;
  }

  const tipo = await tipoDaConta(sessao.user);
  const tabela = tipo === "profissional" ? "profissionais" : "usuarios";

  const { data: perfil } = await supabase
    .from(tabela)
    .select("*")
    .eq("id", sessao.user.id)
    .maybeSingle();

  const nome = perfil?.nome || sessao.user.user_metadata?.nome || sessao.user.email || "?";
  const foto = perfil?.foto_url || null;

  // Guarda o conteúdo original para poder voltar ao ícone de login depois do "Sair"
  if (!icone.dataset.original) icone.dataset.original = icone.innerHTML;

  estiloAvatar();
  const avatar = document.createElement("span");
  avatar.className = "avatar-perfil";
  avatar.title = nome;

  if (foto) {
    const img = document.createElement("img");
    img.src = foto;
    img.alt = nome;
    img.onerror = () => {
      avatar.replaceChildren(document.createTextNode(nome.trim().charAt(0)));
    };
    avatar.append(img);
  } else {
    avatar.textContent = nome.trim().charAt(0);
  }

  icone.replaceChildren(avatar);
  icone.dataset.logado = "true";
  if (icone.tagName === "A") icone.href = PASTA + (PAGINAS[tipo] || PAGINAS.usuario);
}

atualizarIcone().catch((e) => console.error("Erro ao atualizar o ícone de perfil:", e));

// Atualiza na hora quando a pessoa entra ou sai
supabase.auth.onAuthStateChange(() => {
  atualizarIcone().catch((e) => console.error("Erro ao atualizar o ícone de perfil:", e));
});