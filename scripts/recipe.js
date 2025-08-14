// scripts/recipe.js — renderiza a receita completa (PT-BR) na página receita.html
const API = "https://www.themealdb.com/api/json/v1/1";

/* ---------- utils ---------- */
const $ = (s, r = document) => r.querySelector(s);

function getParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}
const hasFavs = () => typeof window.Favs !== "undefined";
const isFav = (id) => hasFavs() && window.Favs.has(String(id));

function toEmbed(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube")) {
      const id =
        u.searchParams.get("v") ||
        (u.pathname.startsWith("/shorts/") ? u.pathname.split("/")[2] : "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

function ingredientsList(meal) {
  const items = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`];
    const mea = meal[`strMeasure${i}`];
    if (ing && ing.trim()) items.push(mea ? `${ing} — ${mea}` : ing);
  }
  return items;
}

/* ---------- view ---------- */
function skeletonHTML() {
  return `
    <div class="recipe-skeleton">
      <div class="skel skel-img"></div>
      <div class="skel skel-title"></div>
      <div class="skel skel-sub"></div>
      <div class="skel skel-block"></div>
    </div>`;
}

function sectionHTML(meal, fav = false) {
  const tags = (meal.strTags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const ings = ingredientsList(meal).map((li) => `<li>${li}</li>`).join("");
  const embed = toEmbed(meal.strYoutube);

  const srcLink =
    meal.strSource || meal.strYoutube
      ? `<a class="recipe-link" href="${meal.strSource || meal.strYoutube}" target="_blank" rel="noopener">Ver fonte / vídeo</a>`
      : "";

  const favBtn = `
    <button id="page-fav-btn" class="recipe-link" type="button"
            aria-pressed="${fav ? "true" : "false"}"
            title="${fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}">
      <i class="${fav ? "fa-solid" : "fa-regular"} fa-heart" aria-hidden="true"></i>
      <span style="margin-left:.4rem">${fav ? "Salvo" : "Favoritar"}</span>
    </button>`;

  return `
    <header class="recipe-head">
      <img class="recipe-cover" src="${meal.strMealThumb || ""}" alt="${meal.strMeal || "Receita"}" />
      <div class="recipe-meta">
        <div>
          <h1 class="recipe-title">${meal.strMeal || ""}</h1>
          <p class="recipe-sub">${meal.strCategory || "—"} • ${meal.strArea || "—"}</p>
          ${tags.length ? `<ul class="recipe-tags">${tags.map((t) => `<li>#${t}</li>`).join("")}</ul>` : ""}
        </div>
        <div class="recipe-actions">
          <a class="btn-primary" href="index.html">← Voltar</a>
          ${srcLink}
          ${favBtn}
        </div>
      </div>
    </header>

    <section class="recipe-body">
      <div class="recipe-col">
        <h2>Ingredientes</h2>
        <ul class="recipe-ingredients">${ings}</ul>
      </div>
      <div class="recipe-col">
        <h2>Preparo</h2>
        <div class="recipe-instructions">
          ${(meal.strInstructions || "")
            .split(/\r?\n/)
            .filter((l) => l.trim())
            .map((p) => `<p>${p}</p>`)
            .join("")}
        </div>
        ${
          embed
            ? `<div class="recipe-video">
                 <iframe src="${embed}" title="Vídeo da receita" loading="lazy" allowfullscreen></iframe>
               </div>`
            : ""
        }
      </div>
    </section>
  `;
}

function renderNotFound(mount, msg = "Receita não encontrada") {
  mount.innerHTML = `
    <div class="recipe-empty">
      <h1>${msg}</h1>
      <p>Tente voltar e abrir novamente a partir da página inicial.</p>
      <a class="btn-primary" href="index.html">Voltar</a>
    </div>`;
}

/* botão de favoritos da página */
function bindFavToggle(currentId) {
  const btn = $("#page-fav-btn");
  if (!btn || !hasFavs()) return;

  const sync = () => {
    const now = isFav(currentId);
    btn.setAttribute("aria-pressed", now ? "true" : "false");
    btn.title = now ? "Remover dos favoritos" : "Adicionar aos favoritos";
    const i = btn.querySelector("i");
    if (i) i.className = `${now ? "fa-solid" : "fa-regular"} fa-heart`;
    const span = btn.querySelector("span");
    if (span) span.textContent = now ? "Salvo" : "Favoritar";
  };

  btn.onclick = () => {
    window.Favs.toggle(currentId);
    sync();
  };

  document.addEventListener("fav:changed", (e) => {
    const changedId = e?.detail?.id;
    if (!changedId || String(changedId) === String(currentId)) sync();
  });

  sync();
}

/* ---------- data ---------- */
async function fetchMealById(id) {
  const res = await fetch(`${API}/lookup.php?i=${encodeURIComponent(id)}`, { cache: "no-store" });
  const data = await res.json();
  return data?.meals?.[0] || null;
}

/* ---------- main render ---------- */
async function render() {
  let mount = $("#recipe-view");
  if (!mount) {
    const main = $("#main-content") || document.body;
    mount = document.createElement("article");
    mount.id = "recipe-view";
    main.appendChild(mount);
  }
  mount.innerHTML = skeletonHTML();

  const id = getParam("id");
  if (!id) return renderNotFound(mount);

  if (id.startsWith("local-") && window.UserRecipes) {
    const recId = id.replace(/^local-/, "");
    const rec = window.UserRecipes.get(recId);
    const meal = window.UserRecipes.toMealObject(rec);
    if (meal) {
      try { await window.Translator?.mealToPT(meal, { full:true }); } catch {}
      mount.innerHTML = sectionHTML(meal, isFav(meal.idMeal));
      bindFavToggle(meal.idMeal);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    return renderNotFound(mount);
  }

  try {
    const meal = await fetchMealById(id);
    if (!meal) return renderNotFound(mount);
    try { await window.Translator?.mealToPT(meal, { full:true }); } catch {}
    mount.innerHTML = sectionHTML(meal, isFav(meal.idMeal));
    bindFavToggle(meal.idMeal);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    console.error("[recipe] erro ao carregar:", err);
    renderNotFound(mount, "Ops… não foi possível carregar esta receita");
  }
}

/* ---------- tema fallback (se header não injetar) ---------- */
function bindLocalThemeToggle() {
  const btn = $("#recipe-theme-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const root = document.documentElement;
    const curr = root.getAttribute("data-theme") || "dark";
    const next = curr === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("cw-theme", next);
      localStorage.setItem("theme", next);
      localStorage.setItem("cookwave-theme", next);
    } catch {}
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindLocalThemeToggle();
  render();
});
