// scripts/favorites.js
(function () {
  const KEY = "cw_favorites_v1";

  function loadSet() {
    try { return new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); }
    catch { return new Set(); }
  }
  function saveSet(set) {
    try { localStorage.setItem(KEY, JSON.stringify([...set])); } catch {}
  }
  function emit(id, isFav, cleared = false) {
    const detail = { id: id && String(id), isFav: !!isFav, cleared, list: Favs.list() };
    const ev = new CustomEvent("fav:changed", { detail });
    window.dispatchEvent(ev); document.dispatchEvent(ev);
  }

  const Favs = {
    __set: loadSet(),
    list() { return [...this.__set]; },
    has(id) { return this.__set.has(String(id)); },
    is(id) { return this.has(id); }, // alias
    add(id) { id = String(id); if (!this.__set.has(id)) { this.__set.add(id); saveSet(this.__set); emit(id, true); } return true; },
    remove(id) { id = String(id); const ok = this.__set.delete(id); saveSet(this.__set); emit(id, false); return ok; },
    toggle(id) { id = String(id); const now = !this.__set.has(id); now ? this.__set.add(id) : this.__set.delete(id); saveSet(this.__set); emit(id, now); return now; },
    clear() { this.__set = new Set(); saveSet(this.__set); emit(null, false, true); },
  };

  window.Favs = Favs;
})();
