// scripts/user_recipes.js
(function () {
  const KEY = "cw_user_recipes_v1";

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch { return []; }
  }
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
  }
  function emit(type, payload) {
    const ev = new CustomEvent("userRecipe:changed", { detail: { type, ...payload } });
    document.dispatchEvent(ev); window.dispatchEvent(ev);
  }

  const store = {
    list: load(),
    nextId() { return Date.now().toString(36); },
    all() { return [...this.list]; },
    get(id) { return this.list.find(r => r.id === id) || null; },
    add(recipe) {
      const id = this.nextId();
      const rec = { id, ...recipe };
      this.list.unshift(rec); save(this.list);
      emit("add", { id, recipe: rec });
      return rec;
    },
    update(id, patch) {
      const i = this.list.findIndex(r => r.id === id);
      if (i < 0) return false;
      this.list[i] = { ...this.list[i], ...patch };
      save(this.list); emit("update", { id, recipe: this.list[i] }); return true;
    },
    remove(id) {
      const before = this.list.length;
      this.list = this.list.filter(r => r.id !== id);
      save(this.list); emit("remove", { id }); return this.list.length < before;
    },
    clear() { this.list = []; save(this.list); emit("clear", {}); },

    // Converte para o "shape" do TheMealDB, para usar no modal/recipe.html
    toMealObject(rec) {
      if (!rec) return null;
      const meal = {
        idMeal: `local-${rec.id}`,
        strMeal: rec.name || "Minha receita",
        strCategory: rec.category || "—",
        strArea: rec.area || "—",
        strInstructions: rec.instructions || "",
        strMealThumb: rec.image || rec.imageUrl || "",
        strTags: Array.isArray(rec.tags) ? rec.tags.join(",") : (rec.tags || "")
      };
      // ingredientes → strIngredient1..20 / strMeasure1..20
      (rec.ingredients || []).slice(0, 20).forEach((it, idx) => {
        meal[`strIngredient${idx+1}`] = it.ingredient || "";
        meal[`strMeasure${idx+1}`]    = it.measure || "";
      });
      return meal;
    }
  };

  window.UserRecipes = store;
})();
