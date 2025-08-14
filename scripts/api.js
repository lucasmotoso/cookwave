// scripts/api.js — Home: busca, categorias (pills), Em Alta (carrossel), aleatórias, favoritos e modal
// (adicionada integração segura com Translator/LibreTranslate)
const API = "https://www.themealdb.com/api/json/v1/1";
const $ = (sel, root = document) => root.querySelector(sel);
const html = (s) => s.trim();

/* ====== Inicialização do Tradutor (modo offline/estável) ====== */
// Garante que o tradutor use o dicionário/cachê por padrão (sem rede)
// Se quiser testar o remoto depois: Translator.init({ provider: 'libre' })
try { window.Translator?.init?.({ provider: "dictionary" }); } catch {}

/* ========= TEMPLATES ========= */
function cardTemplate(meal) {
  const fav = window.Favs?.has(meal.idMeal);
  return html(`
    <article class="recipe-card">
      <button class="card-fav" data-fav-id="${meal.idMeal}" aria-pressed="${fav ? "true" : "false"}" title="${fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}">
        <i class="${fav ? "fa-solid" : "fa-regular"} fa-heart"></i>
      </button>
      <img src="${meal.strMealThumb}" alt="${meal.strMeal}" class="recipe-image" />
      <div class="recipe-info">
        <h3>${meal.strMeal}</h3>
        <p>${meal.strCategory || "—"} • ${meal.strArea || "—"}</p>
        <button class="recipe-button" data-action="open" data-id="${meal.idMeal}">
          Ver Receita
        </button>
      </div>
    </article>
  `);
}

// Card compacto para o carrossel “Em Alta”
function cardMiniTemplate(meal) {
  const fav = window.Favs?.has(meal.idMeal);
  return html(`
    <article class="carousel-card">
      <button class="card-fav" data-fav-id="${meal.idMeal}" aria-pressed="${fav ? "true" : "false"}" title="${fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}">
        <i class="${fav ? "fa-solid" : "fa-regular"} fa-heart"></i>
      </button>
      <img src="${meal.strMealThumb}" alt="${meal.strMeal}" loading="lazy"/>
      <div class="recipe-info">
        <h3>${meal.strMeal}</h3>
        <p>${meal.strCategory || "—"}</p>
        <button class="recipe-button" data-action="open" data-id="${meal.idMeal}">
          Ver Receita
        </button>
      </div>
    </article>
  `);
}

/* ========= API helpers ========= */
async function fetchJSON(url) { const r = await fetch(url, { cache: "no-store" }); return r.json(); }
async function getRandomMeals(n = 8) {
  const arr = await Promise.all(Array.from({ length: n }, () => fetchJSON(`${API}/random.php`)));
  return arr.map(d => d?.meals?.[0]).filter(Boolean);
}
async function searchMealsByName(q) { const d = await fetchJSON(`${API}/search.php?s=${encodeURIComponent(q)}`); return d?.meals || []; }
async function fetchCategories() { const d = await fetchJSON(`${API}/categories.php`); return d?.categories || []; }
async function fetchMealsByCategory(cat) { const d = await fetchJSON(`${API}/filter.php?c=${encodeURIComponent(cat)}`); return d?.meals || []; }
async function fetchMealById(id) { const d = await fetchJSON(`${API}/lookup.php?i=${id}`); return d?.meals?.[0] || null; }

/* ========= RENDER: Aleatórias ========= */
const recipeContainer = $("#recipe-list");
async function renderRandomRecipes() {
  if (!recipeContainer) return;
  const meals = await getRandomMeals(8);
  try { await window.Translator?.mealsToPT(meals, { fields: ["strMeal","strCategory","strArea","strInstructions"] }); } catch {}
  recipeContainer.innerHTML = meals.map(cardTemplate).join("");
}

/* ========= BUSCA ========= */
const form = $("#search-form"), input = $("#search-input"), searchGrid = $("#search-results"), searchEmpty = $("#search-empty");
function debounce(fn, ms = 400) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
async function doSearch(q) {
  if (!q?.trim()) { searchGrid.innerHTML = ""; searchEmpty.hidden = true; return; }
  const res = await searchMealsByName(q.trim());
  try { await window.Translator?.mealsToPT(res, { fields: ["strMeal","strCategory","strArea","strInstructions"] }); } catch {}
  if (!res.length) { searchGrid.innerHTML = ""; searchEmpty.hidden = false; return; }
  searchEmpty.hidden = true; searchGrid.innerHTML = res.map(cardTemplate).join("");
}
const debouncedSearch = debounce(doSearch, 400);
function bindSearch() {
  if (!form) return;
  form.addEventListener("submit", (e) => { e.preventDefault(); doSearch(input.value); });
  input?.addEventListener("input", (e) => debouncedSearch(e.target.value));
}

/* ========= CATEGORIAS (pills com rolagem) ========= */
const catStrip = $("#category-strip"), catResults = $("#category-results"), catCurrent = $("#cat-current"), btnLeft = $("#cat-left"), btnRight = $("#cat-right");
async function renderCategories() {
  if (!catStrip) return;
  const cats = await fetchCategories();
  catStrip.innerHTML = cats.map(c => `
    <button class="pill" data-cat="${c.strCategory}" title="${c.strCategory}">
      <img src="${c.strCategoryThumb}" alt="" /><span>${c.strCategory}</span>
    </button>`).join("");

  catStrip.addEventListener("click", async (e) => {
    const pill = e.target.closest(".pill[data-cat]"); if (!pill) return;
    const cat = pill.getAttribute("data-cat");
    await showCategory(cat);
    catStrip.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
  });

  if (cats[0]) { await showCategory(cats[0].strCategory); catStrip.querySelector(".pill")?.classList.add("active"); }
  btnLeft?.addEventListener("click", () => (catStrip.scrollLeft -= 300));
  btnRight?.addEventListener("click", () => (catStrip.scrollLeft += 300));
}
async function showCategory(cat) {
  if (!catResults) return;
  try { catCurrent.hidden = false; catCurrent.textContent = `Categoria: ${await window.Translator?.toPT(cat, { domain: "category" }) || cat}`; } catch { catCurrent.hidden = false; catCurrent.textContent = `Categoria: ${cat}`; }
  const meals = await fetchMealsByCategory(cat);
  try { await window.Translator?.mealsToPT(meals, { fields: ["strMeal"] }); } catch {}
  meals.forEach(m => m.strCategory = cat);
  catResults.innerHTML = meals.map(cardTemplate).join("");
}

/* ========= EM ALTA (carrossel) ========= */
const trendTrack = $("#trending-track");
const trendPrev  = $("#trend-prev");
const trendNext  = $("#trend-next");
const TREND_CATS = ["Beef","Chicken","Dessert","Pasta","Seafood","Vegetarian","Lamb","Pork"];

async function loadTrending(){
  if (!trendTrack) return;
  const picks = [];
  for (const c of TREND_CATS){
    try {
      const d = await fetchJSON(`${API}/filter.php?c=${encodeURIComponent(c)}`);
      const arr = d?.meals || [];
      shuffle(arr).slice(0,2).forEach(m => picks.push(m));
      if (picks.length >= 12) break;
    } catch {}
  }
  shuffle(picks);
  try { await window.Translator?.mealsToPT(picks, { fields: ["strMeal","strCategory"] }); } catch {}
  trendTrack.innerHTML = picks.slice(0,12).map(cardMiniTemplate).join("");
  updateTrendNav();
}
function shuffle(arr){
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function updateTrendNav(){
  if (!trendTrack || !trendPrev || !trendNext) return;
  const maxScroll = Math.max(0, trendTrack.scrollWidth - trendTrack.clientWidth - 4);
  const x = Math.round(trendTrack.scrollLeft);
  trendPrev.disabled = x <= 0;
  trendNext.disabled = x >= maxScroll;
}
// botões do carrossel
trendPrev?.addEventListener("click", ()=> trendTrack?.scrollBy({ left: -trendTrack.clientWidth * 0.9, behavior: "smooth" }));
trendNext?.addEventListener("click", ()=> trendTrack?.scrollBy({ left:  trendTrack.clientWidth * 0.9, behavior: "smooth" }));
trendTrack?.addEventListener("scroll", updateTrendNav, { passive: true });
// drag-to-scroll
let isDown=false, startX=0, startL=0;
trendTrack?.addEventListener("pointerdown", e => { isDown=true; startX=e.clientX; startL=trendTrack.scrollLeft; trendTrack.setPointerCapture(e.pointerId); });
trendTrack?.addEventListener("pointermove", e => { if(!isDown) return; const dx=e.clientX-startX; trendTrack.scrollLeft = startL - dx; });
trendTrack?.addEventListener("pointerup",   ()=> { isDown=false; });
trendTrack?.addEventListener("pointercancel",()=> { isDown=false; });

/* ========= Delegações globais: abrir modal e favoritar ========= */
document.addEventListener("click", async (e) => {
  // Favoritar (coração do card)
  const favBtn = e.target.closest(".card-fav[data-fav-id]");
  if (favBtn) {
    e.preventDefault(); e.stopPropagation();
    const id = favBtn.getAttribute("data-fav-id");
    const now = window.Favs?.toggle(id);
    favBtn.setAttribute("aria-pressed", now ? "true" : "false");
    favBtn.title = now ? "Remover dos favoritos" : "Adicionar aos favoritos";
    const icon = favBtn.querySelector("i");
    if (icon) icon.className = `${now ? "fa-solid" : "fa-regular"} fa-heart`;
    return;
  }

  // Abrir modal (grade + categoria + carrossel) — traduz antes de abrir
  const btn = e.target.closest('.recipe-button[data-action="open"]');
  if (!btn) return;
  try { if (window.__modalReady?.then) await window.__modalReady; } catch {}
  const meal = await fetchMealById(btn.dataset.id);
  if (!meal) return;
  try { await window.Translator?.mealToPT(meal, { full:true }); } catch {}
  if (window.CookWaveModal?.open) window.CookWaveModal.open(meal);
  else if (typeof window.openModal === "function") window.openModal(meal);
});

// Sincroniza corações de TODOS os cards quando um favorito muda
document.addEventListener("fav:changed", (e) => {
  const { id, isFav } = e.detail || {};
  if (!id) return;
  document.querySelectorAll(`.card-fav[data-fav-id="${id}"]`).forEach((el) => {
    el.setAttribute("aria-pressed", isFav ? "true" : "false");
    el.title = isFav ? "Remover dos favoritos" : "Adicionar aos favoritos";
    const i = el.querySelector("i");
    if (i) i.className = `${isFav ? "fa-solid" : "fa-regular"} fa-heart`;
  });
});

/* ========= boot ========= */
document.addEventListener("DOMContentLoaded", async () => {
  // Se quiser testar o serviço remoto depois, descomente:
  // window.Translator?.init({ provider:'libre', endpoint:'https://libretranslate.com/translate' });

  bindSearch();
  await Promise.all([
    renderRandomRecipes(),
    renderCategories(),
    loadTrending()
  ]);
});
