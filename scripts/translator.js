/* scripts/translator.js — v4
   Padrão: "dictionary" (sem rede, estável).
   Opcional: Translator.init({ provider: "libre" }) para usar LibreTranslate.
   Se o remoto falhar (400/401/403/429/5xx), cai automático para "dictionary".
   NUNCA sobrescreve campos com undefined.
*/
(function () {
  const cfg = {
    provider: "dictionary",                 // <<< padrão estável
    endpoint: "https://libretranslate.com/translate",
    apiKey: null,
    cacheKey: "cw_t_pt_v1",
    delayMs: 800                             // rate-limit simples se usar remoto
  };

  const mem = { cache: new Map(), loaded: false, blockRemote: false, lastCall: 0 };
  const norm  = (s) => (typeof s === "string" ? s.trim() : s);
  const lower = (s) => (s || "").toLowerCase();

  const dict = {
    categories: {
      beef:"Carne bovina", chicken:"Frango", dessert:"Sobremesa", seafood:"Frutos do mar",
      pasta:"Massa", pork:"Carne suína", lamb:"Carne de cordeiro", vegetarian:"Vegetariano",
      vegan:"Vegano", breakfast:"Café da manhã", goat:"Carne de cabra", miscellaneous:"Diversos",
      side:"Acompanhamento", starter:"Entrada"
    },
    areas: {
      american:"Americana", british:"Britânica", canadian:"Canadense", chinese:"Chinesa",
      croatian:"Croata", dutch:"Holandesa", egyptian:"Egípcia", french:"Francesa",
      greek:"Grega", indian:"Indiana", irish:"Irlandesa", italian:"Italiana", jamaican:"Jamaicana",
      japanese:"Japonesa", kenyan:"Queniana", malaysian:"Malaia", mexican:"Mexicana",
      moroccan:"Marroquina", polish:"Polonesa", portuguese:"Portuguesa", russian:"Russa",
      spanish:"Espanhola", thai:"Tailandesa", tunisian:"Tunisiana", turkish:"Turca",
      vietnamese:"Vietnamita", unknown:"—"
    },
    measures: {
      "to taste":"a gosto","pinch":"pitada","dash":"pingo","clove":"dente","cloves":"dentes",
      "slice":"fatia","slices":"fatias","can":"lata","cans":"latas","sprig":"raminho","sprigs":"raminhos",
      "pack":"pacote","packs":"pacotes","large":"grande","small":"pequeno","medium":"médio",
      "tsp":"colher (chá)","teaspoon":"colher (chá)","teaspoons":"colheres (chá)",
      "tbsp":"colher (sopa)","tablespoon":"colher (sopa)","tablespoons":"colheres (sopa)",
      "cup":"xícara","cups":"xícaras","g":"g","kg":"kg","ml":"ml","l":"l","oz":"oz","lb":"lb"
    },
    common: {
      "and":"e","with":"com","or":"ou","in":"em","of":"de","for":"para",
      "fresh":"fresco","ground":"moído","minced":"picado","chopped":"picado",
      "sliced":"fatiado","diced":"em cubos","mix":"misture","stir":"mexa","bake":"asse",
      "fry":"frite","boil":"ferva","grill":"grelhe","serve":"sirva"
    }
  };

  function loadCache(){
    if (mem.loaded) return;
    mem.loaded = true;
    try {
      const raw = localStorage.getItem(cfg.cacheKey);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) mem.cache = new Map(arr);
    } catch {}
  }
  function saveCache(){ try{ localStorage.setItem(cfg.cacheKey, JSON.stringify([...mem.cache])); }catch{} }
  function fromCache(k){ loadCache(); return mem.cache.get(k); }
  function toCache(k,v){ loadCache(); mem.cache.set(k,v); saveCache(); }

  function dictTranslate(text, domain){
    if (!text || typeof text !== "string") return text;
    const t = text.trim();                      // <<< TRIM AQUI
    const lk = lower(t);
    if (domain === "category" && dict.categories[lk]) return dict.categories[lk];
    if (domain === "area" && dict.areas[lk]) return dict.areas[lk];
    if (domain === "measure" && dict.measures[lk]) return dict.measures[lk];

    // substituições simples
    let out = t.replace(/\b([A-Za-z][A-Za-z\-']+)\b/g, (m) => {
      const k = lower(m), tr = dict.common[k];
      if (!tr) return m;
      if (m.toUpperCase() === m) return tr.toUpperCase();
      if (m[0] === m[0].toUpperCase()) return tr[0].toUpperCase()+tr.slice(1);
      return tr;
    });

    // medidas
    out = out.replace(/\b(\d+)\s*cups?\b/gi, "$1 xícaras")
             .replace(/\b(\d+)\s*cup\b/gi, "$1 xícara")
             .replace(/\b(\d+)\s*tbsps?\b/gi, "$1 colheres (sopa)")
             .replace(/\b(\d+)\s*tbsp\b/gi, "$1 colher (sopa)")
             .replace(/\b(\d+)\s*tsps?\b/gi, "$1 colheres (chá)")
             .replace(/\b(\d+)\s*tsp\b/gi, "$1 colher (chá)");
    return out;
  }

  const sleep = (ms) => new Promise((r)=>setTimeout(r,ms));
  async function libreOne(q){
    if (mem.blockRemote) return q;
    const now = Date.now(), delta = now - mem.lastCall;
    if (delta < cfg.delayMs) await sleep(cfg.delayMs - delta);
    mem.lastCall = Date.now();

    const payload = { q, source:"en", target:"pt", format:"text" };
    if (cfg.apiKey) payload.api_key = cfg.apiKey;

    let res;
    try {
      res = await fetch(cfg.endpoint, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(payload)
      });
    } catch {
      mem.blockRemote = true; cfg.provider = "dictionary";
      return q;
    }
    if (!res.ok) { mem.blockRemote = true; cfg.provider = "dictionary"; return q; }

    try {
      const data = await res.json();
      if (data && typeof data === "object" && "translatedText" in data)
        return data.translatedText || q;
    } catch {}
    return q;
  }

  async function toPT(text, { domain } = {}){
    const t = norm(text);
    if (t === null || t === undefined || t === "") return text;

    const hit = fromCache(t); if (hit !== undefined) return hit;

    // dicionário primeiro (com domínio se houver)
    let out = dictTranslate(t, domain);

    // remoto opcional
    if (cfg.provider === "libre" && !mem.blockRemote){
      try { out = await libreOne(t); } catch {}
    }

    if (!out) out = text;
    toCache(t, out);
    return out;
  }

  // aplica sempre com fallback e domínio por campo quando conhecido
  function applyField(value, fieldName){
    if (typeof value !== "string" || value.trim() === "") return value;
    const v = value.trim();
    if (fieldName === "strCategory") {
      const d = dictTranslate(v, "category"); if (d && d !== v) { toCache(v,d); return d; }
    }
    if (fieldName === "strArea") {
      const d = dictTranslate(v, "area"); if (d && d !== v) { toCache(v,d); return d; }
    }
    return fromCache(v) ?? dictTranslate(v) ?? v;
  }

  async function mealsToPT(meals, { fields = ["strMeal","strCategory","strArea"], full = false } = {}){
    if (!Array.isArray(meals) || !meals.length) return meals;

    // preenche cache com dicionário
    const ensureCache = (s, domain) => {
      const k = norm(s); if (!k) return;
      if (fromCache(k) !== undefined) return;
      const d = dictTranslate(k, domain);
      if (d && d !== k) toCache(k, d);
    };

    for (const m of meals){
      fields.forEach(f => {
        if (f === "strCategory") ensureCache(m[f], "category");
        else if (f === "strArea") ensureCache(m[f], "area");
        else ensureCache(m[f], undefined);
      });
      if (full){
        for (let i=1;i<=20;i++){ ensureCache(m["strIngredient"+i]); ensureCache(m["strMeasure"+i], "measure"); }
        ensureCache(m.strInstructions);
      }
    }

    // remoto opcional (string a string)
    if (cfg.provider === "libre" && !mem.blockRemote){
      const pending = new Set();
      const consider = (s) => { const k = norm(s); if (!k) return; if (fromCache(k) === undefined) pending.add(k); };
      meals.forEach(m => {
        fields.forEach(f => consider(m[f]));
        if (full){
          for (let i=1;i<=20;i++){ consider(m["strIngredient"+i]); consider(m["strMeasure"+i]); }
          consider(m.strInstructions);
        }
      });
      for (const k of pending) { const tr = await libreOne(k); toCache(k, tr || k); if (mem.blockRemote) break; }
    }

    // aplica sem nunca escrever undefined
    meals.forEach(m => {
      fields.forEach(f => { m[f] = applyField(m[f], f); });
      if (full){
        for (let i=1;i<=20;i++){
          const ing = m["strIngredient"+i], mea = m["strMeasure"+i];
          if (typeof ing === "string" && ing.trim()) m["strIngredient"+i] = fromCache(ing.trim()) ?? dictTranslate(ing.trim()) ?? ing;
          if (typeof mea === "string" && mea.trim()) m["strMeasure"+i]    = fromCache(mea.trim()) ?? dictTranslate(mea.trim(),"measure") ?? mea;
        }
        if (typeof m.strInstructions === "string" && m.strInstructions.trim())
          m.strInstructions = fromCache(m.strInstructions.trim()) ?? dictTranslate(m.strInstructions.trim()) ?? m.strInstructions;
      }
    });

    return meals;
  }

  window.Translator = {
    init(opts={}){ Object.assign(cfg, opts||{}); },
    toPT,
    mealsToPT,
    mealToPT: async (meal, opts={}) => { if (!meal) return meal; await mealsToPT([meal], { ...opts, full: opts.full ?? true }); return meal; }
  };
})();
