// scripts/modal.js — com botão de Favoritos no modal + auto-setup
(function () {
  let initialized = false;
  let lastFocused = null;
  let currentMealId = null;

  function qs(root, sel) {
    const el = root.querySelector(sel);
    if (!el) console.warn("Elemento não encontrado:", sel);
    return el;
  }

  function fillIngredients(listEl, meal) {
    listEl.innerHTML = "";
    for (let i = 1; i <= 20; i++) {
      const ing = meal[`strIngredient${i}`];
      const mea = meal[`strMeasure${i}`];
      if (ing && ing.trim()) {
        const li = document.createElement("li");
        li.textContent = mea ? `${ing} — ${mea}` : ing;
        listEl.appendChild(li);
      }
    }
  }

  function setup() {
    if (initialized) return;

    const root = document.querySelector("#modal-placeholder");
    if (!root) return console.error("#modal-placeholder não encontrado");

    const overlay  = qs(root, ".modal-overlay");
    const modal    = qs(root, "#recipe-modal");
    const btnX     = qs(root, ".modal-close");
    const imgEl    = qs(root, "#modal-recipe-thumb");
    const titleEl  = qs(root, "#modal-recipe-title");
    const catEl    = qs(root, "#modal-recipe-category");
    const listEl   = qs(root, "#modal-recipe-ingredients");
    const linkEl   = qs(root, "#modal-recipe-link");
    const openPage = qs(root, "#modal-open-page");
    const favBtn   = qs(root, "#modal-fav-btn");

    if (!overlay || !modal) {
      console.error("Estrutura do modal incompleta.");
      return;
    }

    if (titleEl && !titleEl.hasAttribute("tabindex")) titleEl.setAttribute("tabindex", "-1");

    function syncFavBtn() {
      if (!favBtn || !currentMealId || !window.Favs) return;
      const isFav = window.Favs.has(currentMealId);
      favBtn.setAttribute("aria-pressed", isFav ? "true" : "false");
      favBtn.setAttribute("aria-label", isFav ? "Remover dos favoritos" : "Adicionar aos favoritos");
      const icon = favBtn.querySelector("i");
      if (icon) icon.className = `${isFav ? "fa-solid" : "fa-regular"} fa-heart`;
    }

    function open(meal) {
      lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      currentMealId = String(meal.idMeal || "");

      if (imgEl)   { imgEl.src = meal.strMealThumb || ""; imgEl.alt = meal.strMeal || "Imagem da receita"; }
      if (titleEl) { titleEl.textContent = meal.strMeal || ""; }
      if (catEl)   { catEl.textContent   = `${meal.strCategory || "—"} • ${meal.strArea || "—"}`; }
      if (listEl)  { fillIngredients(listEl, meal); }

      if (linkEl) {
        const href = meal.strSource || meal.strYoutube || "";
        linkEl.href = href || "#";
        linkEl.style.display = href ? "inline-flex" : "none";
      }

      if (openPage) {
        openPage.href = `receita.html?id=${meal.idMeal}`;
        openPage.style.display = "inline-flex";
      }

      if (favBtn) {
        syncFavBtn();
        favBtn.onclick = () => {
          try {
            const now = window.Favs?.toggle(currentMealId);
            favBtn.setAttribute("aria-pressed", now ? "true" : "false");
            favBtn.setAttribute("aria-label", now ? "Remover dos favoritos" : "Adicionar aos favoritos");
            const i = favBtn.querySelector("i");
            if (i) i.className = `${now ? "fa-solid" : "fa-regular"} fa-heart`;
          } catch (err) {
            console.warn("Favoritos indisponível:", err);
          }
        };
      }

      overlay.classList.remove("hidden");
      overlay.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");
      setTimeout(() => titleEl?.focus?.(), 0);
    }

    function close() {
      overlay.classList.add("hidden");
      overlay.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
      if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
    }

    btnX && btnX.addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !overlay.classList.contains("hidden")) close(); });

    document.addEventListener("fav:changed", (e) => {
      if (!currentMealId) return;
      const changedId = e?.detail?.id;
      if (!changedId || String(changedId) === String(currentMealId)) syncFavBtn();
    });

    const api = { open, close, setup };
    window.CookWaveModal = Object.assign(window.CookWaveModal || {}, api);
    window.openModal = open;   // retrocompat
    window.closeModal = close; // retrocompat
    window.setupModal = setup;

    initialized = true;
  }

  // auto-setup se o HTML do modal já existir
  document.addEventListener("DOMContentLoaded", () => {
    const host = document.querySelector("#modal-placeholder");
    if (host && host.querySelector(".modal-overlay")) {
      try { setup(); } catch {}
    }
  });
  // auto-setup quando includes.js terminar de injetar o modal
  document.addEventListener("modal:injected", () => {
    try { setup(); } catch {}
  });

  // expõe API básica mesmo antes de setup
  window.CookWaveModal = Object.assign(window.CookWaveModal || {}, { setup });
})();
