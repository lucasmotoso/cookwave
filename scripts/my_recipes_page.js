// scripts/my_recipes_page.js — “Minhas Receitas” com busca, filtro, ordenação, visualização e limpar tudo
const $ = (s, r=document)=>r.querySelector(s);

const grid = $("#mine-grid");
const emptyMsg = $("#mine-empty");
const countBadge = $("#mine-count");
const chipsWrap = $("#mine-cats");
const searchForm = $("#mine-search");
const searchInput = $("#mine-q");
const sortSelect = $("#mine-sort");
const btnComfy = $("#mine-view-comfy");
const btnCompact = $("#mine-view-compact");
const btnClear = $("#mine-clear");

// estado
const STATE = {
  q: "",
  sort: localStorage.getItem("cw_mine_sort") || "name",
  cat: null,
  view: localStorage.getItem("cw_mine_view") || "comfy",
};

// helpers
function debounce(fn, ms=400){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }
function normalize(s){ return (s||"").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, ""); }

function toMeal(rec){
  return window.UserRecipes.toMealObject(rec);
}

function cardTemplate(meal){
  const fav = window.Favs?.has(meal.idMeal);
  return `
    <article class="recipe-card">
      <button class="card-fav" data-fav-id="${meal.idMeal}" aria-pressed="${fav ? "true" : "false"}" title="${fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}">
        <i class="${fav ? "fa-solid" : "fa-regular"} fa-heart"></i>
      </button>
      <img src="${meal.strMealThumb || ""}" alt="${meal.strMeal}" class="recipe-image" />
      <div class="recipe-info">
        <h3>${meal.strMeal}</h3>
        <p>${meal.strCategory || "—"} • ${meal.strArea || "—"}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="recipe-button" data-open-id="${meal.idMeal}">Ver</button>
          <button class="pill ghost" data-del-id="${meal.idMeal}">Excluir</button>
        </div>
      </div>
    </article>`;
}

function updateCount(n){ countBadge && (countBadge.textContent = n); }

function rawList(){
  return (window.UserRecipes?.all() || []).map(toMeal);
}

function renderChips(meals){
  const cats = [...new Set(meals.map(m => m.strCategory).filter(Boolean))].sort();
  chipsWrap.innerHTML = [
    `<button class="pill ${!STATE.cat ? "active" : ""}" data-cat="">Todas</button>`,
    ...cats.map(c => `<button class="pill ${STATE.cat===c?"active":""}" data-cat="${c}">${c}</button>`)
  ].join("");
}

function applyFilters(meals){
  let arr = [...meals];

  if (STATE.q){
    const q = normalize(STATE.q);
    arr = arr.filter(m => normalize(m.strMeal).includes(q));
  }
  if (STATE.cat){
    arr = arr.filter(m => m.strCategory === STATE.cat);
  }

  switch (STATE.sort){
    case "name":      arr.sort((a,b)=> a.strMeal.localeCompare(b.strMeal)); break;
    case "name_desc": arr.sort((a,b)=> b.strMeal.localeCompare(a.strMeal)); break;
    case "category":  arr.sort((a,b)=> `${a.strCategory||""}${a.strMeal}`.localeCompare(`${b.strCategory||""}${b.strMeal}`)); break;
    case "area":      arr.sort((a,b)=> `${a.strArea||""}${a.strMeal}`.localeCompare(`${b.strArea||""}${b.strMeal}`)); break;
  }
  return arr;
}

function render(){
  const base = rawList();
  updateCount(base.length);

  if (!base.length){
    chipsWrap.innerHTML = "";
    grid.innerHTML = "";
    emptyMsg.hidden = false;
    return;
  }

  emptyMsg.hidden = true;
  renderChips(base);
  const filtered = applyFilters(base);

  grid.classList.toggle("compact", STATE.view === "compact");
  grid.innerHTML = filtered.map(cardTemplate).join("");
}

function bindDelegations(){
  // abrir modal
  document.addEventListener("click", (e)=>{
    const btn = e.target.closest("[data-open-id]");
    if (!btn) return;
    const idMeal = btn.getAttribute("data-open-id"); // "local-<id>"
    const recId = idMeal.replace(/^local-/, "");
    const meal = window.UserRecipes.toMealObject(window.UserRecipes.get(recId));
    if (!meal) return;
    if (window.CookWaveModal?.open) window.CookWaveModal.open(meal);
    else if (window.openModal) window.openModal(meal);
  });

  // excluir
  document.addEventListener("click", (e)=>{
    const btn = e.target.closest("[data-del-id]");
    if (!btn) return;
    const idMeal = btn.getAttribute("data-del-id");
    const recId = idMeal.replace(/^local-/, "");
    if (confirm("Excluir esta receita?")){
      window.UserRecipes.remove(recId);
      render();
    }
  });

  // favoritar
  document.addEventListener("click", (e)=>{
    const favBtn = e.target.closest(".card-fav[data-fav-id]");
    if (!favBtn) return;
    const id = favBtn.getAttribute("data-fav-id");
    const now = window.Favs?.toggle(id);
    favBtn.setAttribute("aria-pressed", now ? "true" : "false");
    const i = favBtn.querySelector("i"); if (i) i.className = `${now ? "fa-solid" : "fa-regular"} fa-heart`;
  });

  // chips de categoria
  chipsWrap.addEventListener("click", (e)=>{
    const chip = e.target.closest(".pill[data-cat]");
    if (!chip) return;
    STATE.cat = chip.getAttribute("data-cat") || null;
    chipsWrap.querySelectorAll(".pill").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    render();
  });

  // busca
  const deb = debounce((v)=>{ STATE.q = v; render(); }, 300);
  searchForm?.addEventListener("submit", (e)=>{ e.preventDefault(); STATE.q = searchInput.value; render(); });
  searchInput?.addEventListener("input", (e)=> deb(e.target.value));

  // ordenação
  sortSelect.value = STATE.sort;
  sortSelect.addEventListener("change", ()=>{
    STATE.sort = sortSelect.value;
    localStorage.setItem("cw_mine_sort", STATE.sort);
    render();
  });

  // visualização
  btnComfy.addEventListener("click", ()=>{
    STATE.view = "comfy"; localStorage.setItem("cw_mine_view", STATE.view);
    btnComfy.setAttribute("aria-pressed","true"); btnCompact.setAttribute("aria-pressed","false");
    render();
  });
  btnCompact.addEventListener("click", ()=>{
    STATE.view = "compact"; localStorage.setItem("cw_mine_view", STATE.view);
    btnComfy.setAttribute("aria-pressed","false"); btnCompact.setAttribute("aria-pressed","true");
    render();
  });
  // aplica estado inicial
  if (STATE.view === "compact") btnCompact.click(); else btnComfy.click();

  // limpar tudo
  btnClear.addEventListener("click", ()=>{
    if (confirm("Remover todas as suas receitas locais?")){
      window.UserRecipes?.clear();
      render();
    }
  });

  // re-render em mudanças externas
  document.addEventListener("userRecipe:changed", render);
  document.addEventListener("fav:changed", render);
}

document.addEventListener("DOMContentLoaded", ()=>{
  bindDelegations();
  render();
});
