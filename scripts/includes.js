// scripts/includes.js (robusto: header/footer e modal com fallback + back-to-top)
(() => {
  const ROOT = document.documentElement;

  /* ===== tema ===== */
  const getSavedTheme = () => {
    try {
      return localStorage.getItem("cw-theme") ||
             localStorage.getItem("cookwave-theme") ||
             localStorage.getItem("theme");
    } catch { return null; }
  };
  const setSavedTheme = (v) => {
    try {
      localStorage.setItem("cw-theme", v);
      localStorage.setItem("cookwave-theme", v);
      localStorage.setItem("theme", v);
    } catch {}
  };
  const applyTheme = (theme) => {
    const next = theme || "dark";
    ROOT.setAttribute("data-theme", next);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", next === "dark" ? "#0e1c24" : "#ffffff");
  };
  const updateThemeIcon = (btn, theme) => {
    const i = btn?.querySelector("i"); if (!i) return;
    i.className = theme === "light" ? "fas fa-sun" : "fas fa-moon";
  };

  /* ===== utils ===== */
  const sleep = (ms) => new Promise((r)=>setTimeout(r,ms));

  async function fetchFirst(urls) {
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) return await res.text();
      } catch {}
    }
    return null;
  }

  async function inject(selector, candidates, fallbackHTML = null) {
    const host = document.querySelector(selector);
    if (!host) return null;
    const html = await fetchFirst(candidates);
    if (html != null) {
      host.innerHTML = html;
      return host;
    }
    // fallback inline
    if (fallbackHTML) {
      host.innerHTML = fallbackHTML;
      return host;
    }
    console.warn("[includes] Não foi possível carregar:", candidates.join(", "));
    return null;
  }

  function updateHeaderHeight() {
    const h = document.querySelector(".main-header");
    ROOT.style.setProperty("--header-h", (h ? h.offsetHeight : 64) + "px");
  }

  function bindHeader(scope = document) {
    const header = scope.querySelector(".main-header") || scope;
    const nav =
      header.querySelector("#nav-menu") ||
      header.querySelector("nav.nav-menu") ||
      header.querySelector("nav");
    const menuBtn =
      header.querySelector("#menu-toggle") ||
      header.querySelector(".menu-toggle") ||
      header.querySelector("[data-menu-toggle]");
    const themeBtn =
      header.querySelector("#theme-toggle") ||
      header.querySelector(".theme-toggle") ||
      header.querySelector('[aria-label*="Alternar tema" i]') ||
      header.querySelector('[title*="Alternar tema" i]');

    const initial = getSavedTheme() || "dark";
    applyTheme(initial);
    updateThemeIcon(themeBtn, initial);
    themeBtn?.addEventListener("click", () => {
      const curr = ROOT.getAttribute("data-theme") || "dark";
      const next = curr === "dark" ? "light" : "dark";
      applyTheme(next); setSavedTheme(next); updateThemeIcon(themeBtn, next);
    });

    function closeNav(){
      if (!nav) return;
      nav.classList.remove("active");
      nav.hidden = window.innerWidth < 900;
      menuBtn?.setAttribute("aria-expanded","false");
    }
    function openNav(){
      if (!nav) return;
      nav.hidden = false;
      nav.classList.add("active");
      menuBtn?.setAttribute("aria-expanded","true");
    }
    function toggleNav(){ nav?.classList.contains("active") ? closeNav() : openNav(); }

    if (nav) {
      nav.hidden = window.innerWidth < 900;
      if (window.innerWidth >= 900) nav.classList.add("active");
    }
    menuBtn?.addEventListener("click", toggleNav);
    document.addEventListener("click", (e)=>{
      if (!nav || window.innerWidth >= 900 || !nav.classList.contains("active")) return;
      const inside = e.target.closest("#nav-menu, .nav-menu, #menu-toggle, .menu-toggle, [data-menu-toggle]");
      if (!inside) closeNav();
    });
    window.addEventListener("resize", () => {
      if (!nav) return;
      if (window.innerWidth >= 900) { nav.hidden = false; nav.classList.add("active"); }
      else { nav.classList.remove("active"); nav.hidden = true; }
      updateHeaderHeight();
    });
    document.addEventListener("keydown", (e)=>{ if (e.key === "Escape") closeNav(); });

    requestAnimationFrame(updateHeaderHeight);
    setTimeout(updateHeaderHeight, 50);
  }

  function resolveModalReady() {
    if (!window.__modalReady) {
      let resolve;
      window.__modalReady = new Promise((r)=> (resolve = r));
      window.__modalReady._resolve = resolve;
    }
    setTimeout(()=> window.__modalReady?._resolve?.(), 0);
  }

  const FALLBACK_MODAL = `
  <div class="modal-overlay" aria-hidden="true" style="display:none">
    <div id="recipe-modal" class="modal">
      <button class="modal-close" aria-label="Fechar">&times;</button>
      <div class="modal-body">
        <img id="modal-recipe-thumb" alt="" />
        <h3 id="modal-recipe-title" tabindex="-1"></h3>
        <p id="modal-recipe-category" class="muted"></p>
        <ul id="modal-recipe-ingredients"></ul>
        <div class="modal-actions">
          <a id="modal-open-page" class="btn-primary" href="#">Ver na página</a>
          <a id="modal-recipe-link" class="btn-ghost" href="#" target="_blank" rel="noopener">Ver fonte / vídeo</a>
          <button id="modal-fav-btn" class="btn-ghost" aria-pressed="false" aria-label="Adicionar aos favoritos">
            <i class="fa-regular fa-heart" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </div>
  </div>`;

  document.addEventListener("DOMContentLoaded", async () => {
    // header
    const headerHost = await inject("#header-placeholder",
      ["header.html","components/header.html","partials/header.html","includes/header.html"]
    );
    if (headerHost) bindHeader(headerHost);

    // footer
    await inject("#footer-placeholder",
      ["footer.html","components/footer.html","partials/footer.html","includes/footer.html"]
    );

    // modal (com fallback inline)
    const modalHost = await inject("#modal-placeholder",
      ["modal.html","components/modal.html","partials/modal.html","includes/modal.html"],
      FALLBACK_MODAL
    );
    if (modalHost) {
      try { window.CookWaveModal?.setup?.(); } catch {}
      document.dispatchEvent(new Event("modal:injected"));
      resolveModalReady();
    }

    await sleep(10);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute(
      "content",
      (ROOT.getAttribute("data-theme") === "dark") ? "#0e1c24" : "#ffffff"
    );

    /* === Back to Top (autossuficiente com estilo inline + adaptação ao tema) === */
    let backBtn = document.getElementById("back-to-top");
    if (!backBtn) {
      backBtn = document.createElement("button");
      backBtn.id = "back-to-top";
      backBtn.type = "button";
      backBtn.setAttribute("aria-label", "Voltar ao topo");
      backBtn.setAttribute("title", "Voltar ao topo");
      backBtn.innerHTML = '<i class="fa-solid fa-arrow-up" aria-hidden="true"></i>';

      // Estilo base inline (independe do CSS externo)
      Object.assign(backBtn.style, {
        position: "fixed",
        right: "16px",
        bottom: "16px",
        width: "44px",
        height: "44px",
        display: "grid",
        placeItems: "center",
        borderRadius: "999px",
        border: "1px solid #e2e8f0",
        background: "#ffffffd9",
        color: "#e86a3a",
        boxShadow: "0 8px 24px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.2)",
        cursor: "pointer",
        zIndex: "10000",
        transition: "opacity .2s, transform .2s",
        opacity: "0",
        transform: "translateY(10px) scale(.9)",
        pointerEvents: "none"
      });

      // Fallback se não houver FA
      if (!backBtn.querySelector("i")) backBtn.textContent = "↑";

      document.body.appendChild(backBtn);
    }

    // Tema dinâmico (sugestão 2)
    const applyBtnTheme = () => {
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      backBtn.style.background = dark ? "#0f1d24e6" : "#ffffffd9";
      backBtn.style.border = dark ? "1px solid #21313a" : "1px solid #e2e8f0";
      backBtn.style.color = dark ? "#ff8a4c" : "#e86a3a";
    };
    applyBtnTheme();
    const themeObs = new MutationObserver(applyBtnTheme);
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    // Mostra/esconde (sugestão 1 — controle inline)
    function showBack(visible) {
      if (visible) {
        backBtn.style.opacity = "1";
        backBtn.style.transform = "translateY(0)";
        backBtn.style.pointerEvents = "auto";
      } else {
        backBtn.style.opacity = "0";
        backBtn.style.transform = "translateY(10px) scale(.9)";
        backBtn.style.pointerEvents = "none";
      }
    }
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      showBack(y > 600);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    backBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      backBtn.blur();
    });

    // Atalho opcional: Alt + ↑ ou tecla Home
    document.addEventListener("keydown", (e) => {
      if ((e.altKey && e.key === "ArrowUp") || e.key === "Home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  });
})();
