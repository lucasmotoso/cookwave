// scripts/about.js — melhorado + botão com mark do GitHub
// - Filtra forks/arquivados (evita utilitários de teste)
// - Ordena por atividade recente
// - Faz uma única chamada (per_page=100), depois recorta MAX_REPOS
// - Exibe tópicos quando disponíveis
// - Mensagens de erro mais amigáveis
// - Remove skeletons e tem um micro efeito de entrada

const GITHUB_USER = "lucasmotoso";   // <- seu usuário
const MAX_REPOS   = 6;                // quantos mostrar
const EXCLUDE_FORKS = true;           // esconder forks
const EXCLUDE_ARCHIVED = true;        // esconder arquivados

function htmlEscape(str){
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function fetchRepos(){
  const url = `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated`;
  const r = await fetch(url, {
    cache: "no-store",
    headers: {
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });
  if (!r.ok) throw new Error(`GitHub API ${r.status}`);
  const data = await r.json();
  // filtros básicos
  let repos = Array.isArray(data) ? data : [];
  if (EXCLUDE_FORKS) repos = repos.filter(r => !r.fork);
  if (EXCLUDE_ARCHIVED) repos = repos.filter(r => !r.archived);
  // ordena por atividade (pushed_at) e depois por estrelas
  repos.sort((a,b)=>{
    const da = +new Date(b.pushed_at) - +new Date(a.pushed_at);
    if (da !== 0) return da;
    return (b.stargazers_count||0) - (a.stargazers_count||0);
  });
  return repos.slice(0, MAX_REPOS);
}

function topicsChips(topics){
  if (!Array.isArray(topics) || topics.length === 0) return "";
  const chips = topics.slice(0,3).map(t => `<span class="chip">${htmlEscape(t)}</span>`).join("");
  return `<div class="topics">${chips}</div>`;
}

function repoCard(r){
  const name = htmlEscape(r.name);
  const desc = htmlEscape(r.description) || "Projeto no GitHub";
  const lang = r.language ? ` • ${htmlEscape(r.language)}` : "";
  const stars = r.stargazers_count ?? 0;
  const url = r.html_url;
  const updated = new Date(r.pushed_at);
  const when = updated.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

  return `
    <article class="project-card fade-in">
      <h3>${name}</h3>
      <p>${desc}</p>
      <p style="font-size:.9rem;opacity:.8">★ ${stars}${lang} • atualizado em ${when}</p>
      ${topicsChips(r.topics)}
      <a class="btn-gh" href="${url}" target="_blank" rel="noopener">
        <i class="fa-brands fa-github" aria-hidden="true"></i>
        <span>Abrir no GitHub</span>
        <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
      </a>
    </article>
  `;
}

document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("projects-grid");
  if (!grid) return;

  const showError = (msg) => {
    grid.innerHTML = `
      <article class="project-card">
        <h3>Projetos</h3>
        <p>${htmlEscape(msg)}</p>
        <a class="btn-gh" href="https://github.com/${GITHUB_USER}?tab=repositories" target="_blank" rel="noopener">
          <i class="fa-brands fa-github" aria-hidden="true"></i>
          <span>Ver repositórios</span>
          <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
        </a>
      </article>
    `;
  };

  try{
    const repos = await fetchRepos();
    if (!repos.length) {
      showError("Nenhum repositório encontrado.");
      return;
    }
    grid.innerHTML = repos.map(repoCard).join("");
  }catch(e){
    const msg = String(e && e.message ? e.message : e);
    showError("Não foi possível carregar do GitHub agora. " + msg);
  }
});
