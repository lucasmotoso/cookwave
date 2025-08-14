// scripts/favorites_page.js — filtros, ordenação, busca, modos de visualização
const API = "https://www.themealdb.com/api/json/v1/1";
const $ = (s, r = document) => r.querySelector(s);

const grid = $("#fav-grid");
const emptyMsg = $("#fav-empty");
const countBadge = $("#fav-count");
const chipsWrap = $("#fav-cats");
const searchForm = $("#fav-search");
const searchInput = $("#fav-q");
const sortSelect = $("#fav-sort");
const btnComfy = $("#fav-view-comfy");
const btnCompact = $("#fav-view-compact");
const btnClear = $("#fav-clear");

// estado simples
const STATE = {
  q: "",
  sort: localStorage.getItem("cw_fav_sort") || "name",
  cat: null,
  view: localStorage.getItem("cw_fav_view") || "comfy",
};

// helpers
function debounce(fn, ms = 400) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
async function fetchMealById(id) { const r = await fetch(`${API}/lookup.php?i=${id}`, { cache: "no-store" }); const d = await r.json(); return d?.meals?.[0] || null; }
function cardTemplate(meal) {
  const fav = window.Favs?.has(meal.idMeal);
  return `
    <article class="recipe-card">
      <button class="card-fav" data-fav-id="${meal.idMeal}" aria-pressed="${fav ? "true" : "false"}" title="${fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}">
        <i class="${fav ? "fa-solid" : "fa-regular"} fa-heart"></i>
      </button>
      <img src="${meal.strMealThumb}" alt="${meal.strMeal}" class="recipe-image" />
      <div class="recipe-info">
        <h3>${meal.strMeal}</h3>
        <p>${meal.strCategory || "—"} • ${meal.strArea || "—"}</p>
        <button class="recipe-button" data-action="open" data-id="${meal.idMeal}">Ver Receita</button>
      </div>
    </article>`;
}

// cache para evitar re-lookups desnecessários
const cache = new Map();
async function loadMeals(ids) {
  const tasks = ids.map(async (id) => {
    if (cache.has(id)) return cache.get(id);
    const m = await fetchMealById(id);
    if (m) cache.set(id, m);
    return m;
  });
  const arr = (await Promise.all(tasks)).filter(Boolean);
  return arr;
}

function normalize(str) { return (str || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, ""); }

function applyFilters(meals) {
  let arr = [...meals];

  if (STATE.q) {
    const q = normalize(STATE.q);
    arr = arr.filter(m => normalize(m.strMeal).includes(q));
  }

  if (STATE.cat) {
    arr = arr.filter(m => m.strCategory === STATE.cat);
  }

  switch (STATE.sort) {
    case "name":       arr.sort((a,b)=>a.strMeal.localeCompare(b.strMeal)); break;
    case "name_desc":  arr.sort((a,b)=>b.strMeal.localeCompare(a.strMeal)); break;
    case "category":   arr.sort((a,b)=>`${a.strCategory||""}${a.strMeal}`.localeCompare(`${b.strCategory||""}${b.strMeal}`)); break;
    case "area":       arr.sort((a,b)=>`${a.strArea||""}${a.strMeal}`.localeCompare(`${b.strArea||""}${b.strMeal}`)); break;
  }
  return arr;
}

function renderChips(meals) {
  const cats = [...new Set(meals.map(m => m.strCategory).filter(Boolean))].sort();
  chipsWrap.innerHTML = [
    `<button class="pill ${!STATE.cat ? "active" : ""}" data-cat="">Todas</button>`,
    ...cats.map(c => `<button class="pill ${STATE.cat===c?"active":""}" data-cat="${c}">${c}</button>`)
  ].join("");
}

function updateCount(n) { if (countBadge) countBadge.textContent = n; }

async function renderFavs() {
  if (!window.Favs) {
    emptyMsg.hidden = false;
    emptyMsg.textContent = "Favoritos indisponível. Verifique se scripts/favorites.js está incluído.";
    grid.innerHTML = "";
    updateCount(0);
    return;
  }

  const ids = window.Favs.list();
  updateCount(ids.length);

  if (!ids.length) {
    grid.innerHTML = "";
    chipsWrap.innerHTML = "";
    emptyMsg.hidden = false;
    emptyMsg.textContent = "Você ainda não favoritou nenhuma receita.";
    return;
  }

  emptyMsg.hidden = true;
  const meals = await loadMeals(ids);
  renderChips(meals);

  const filtered = applyFilters(meals);
  grid.classList.toggle("compact", STATE.view === "compact");
  grid.innerHTML = filtered.map(cardTemplate).join("");
}

function bindDelegations() {
  // Favoritar/desfavoritar
  document.addEventListener("click", (e) => {
    const favBtn = e.target.closest(".card-fav[data-fav-id]");
    if (!favBtn) return;
    e.preventDefault(); e.stopPropagation();

    if (!window.Favs) return;
    const id = favBtn.getAttribute("data-fav-id");
    const now = window.Favs.toggle(id);
    favBtn.setAttribute("aria-pressed", now ? "true" : "false");
    favBtn.title = now ? "Remover dos favoritos" : "Adicionar aos favoritos";
    const i = favBtn.querySelector("i");
    if (i) i.className = `${now ? "fa-solid" : "fa-regular"} fa-heart`;

    if (!now) {
      cache.delete(id);
      renderFavs();
    } else {
      // se adicionou de outra página e veio parar aqui, garante cache
      fetchMealById(id).then(m => { if (m) { cache.set(id, m); renderFavs(); }});
    }
  });

  // Abrir modal
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest('.recipe-button[data-action="open"]');
    if (!btn) return;
    try { if (window.__modalReady?.then) await window.__modalReady; } catch {}
    const id = btn.dataset.id;
    const meal = cache.get(id) || await fetchMealById(id);
    if (!meal) return;
    if (window.CookWaveModal?.open) window.CookWaveModal.open(meal);
    else if (typeof window.openModal === "function") window.openModal(meal);
  });

  // Filtro por categoria (chips)
  chipsWrap.addEventListener("click", (e) => {
    const chip = e.target.closest(".pill[data-cat]");
    if (!chip) return;
    STATE.cat = chip.getAttribute("data-cat") || null;
    chipsWrap.querySelectorAll(".pill").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    renderFavs();
  });

  // Busca
  const deb = debounce((v)=>{ STATE.q = v; renderFavs(); }, 300);
  searchForm?.addEventListener("submit", (e)=>{ e.preventDefault(); STATE.q = searchInput.value; renderFavs(); });
  searchInput?.addEventListener("input", (e)=> deb(e.target.value));

  // Ordenação
  sortSelect.value = STATE.sort;
  sortSelect.addEventListener("change", () => { STATE.sort = sortSelect.value; localStorage.setItem("cw_fav_sort", STATE.sort); renderFavs(); });

  // View
  btnComfy.addEventListener("click", () => {
    STATE.view = "comfy"; localStorage.setItem("cw_fav_view", STATE.view);
    btnComfy.setAttribute("aria-pressed","true"); btnCompact.setAttribute("aria-pressed","false");
    renderFavs();
  });
  btnCompact.addEventListener("click", () => {
    STATE.view = "compact"; localStorage.setItem("cw_fav_view", STATE.view);
    btnComfy.setAttribute("aria-pressed","false"); btnCompact.setAttribute("aria-pressed","true");
    renderFavs();
  });
  // aplica estado inicial de view
  if (STATE.view === "compact") { btnCompact.click(); } else { btnComfy.click(); }

  // Limpar tudo
  btnClear.addEventListener("click", () => {
    if (!window.Favs) return;
    if (confirm("Remover todos os favoritos?")) {
      window.Favs.clear();
      cache.clear();
      renderFavs();
    }
  });

  // Sincronizações cruzadas
  document.addEventListener("fav:changed", renderFavs);
  window.addEventListener("storage", (e) => { if (e.key === "cw_favorites_v1") renderFavs(); });
}

document.addEventListener("DOMContentLoaded", async () => {
  bindDelegations();
  await renderFavs();
});
