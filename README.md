# CookWave 🍳  
**Receitas com vibe retrô — HTML + CSS + JavaScript + TheMealDB**

[![static](https://img.shields.io/badge/build-static%20site-0b8?style=for-the-badge)](#)
[![stack](https://img.shields.io/badge/stack-HTML%20%2F%20CSS%20%2F%20JS-435?style=for-the-badge)](#)
[![pages](https://img.shields.io/badge/deploy-GitHub%20Pages-3b7?style=for-the-badge)](#deploy)
[![a11y](https://img.shields.io/badge/a11y-contrast%20%2B%20keyboard-6a2?style=for-the-badge)](#acessibilidade)
[![license](https://img.shields.io/badge/license-MIT-222?style=for-the-badge)](#licença)

> **CookWave** é um webapp de receitas com estética **Tech/Retrowave**.  
> Usa a **API pública TheMealDB** para listar receitas aleatórias e por categoria, exibe **detalhes em modal** e em **página dedicada**, possui **favoritos (localStorage)**, **modo claro/escuro** persistente, **busca** e páginas auxiliares (Sobre, Favoritos e Minhas Receitas).

---

## 📸 Preview

> Substitua as imagens pelos seus prints (coloque em `docs/`):

| Home (Grid + Busca) | Modal (Detalhes) | Página da Receita |
|---|---|---|
| ![home](docs/preview-home.png) | ![modal](docs/preview-modal.png) | ![receita](docs/preview-receita.png) |

---

## ✨ Principais recursos

- **Receitas aleatórias e por categoria** (TheMealDB).
- **Busca** por nome (client-side) + filtros rápidos.
- **Modal dinâmico** (`modal.html` + `scripts/modal.js`).
- **Página de detalhes** (`receita.html`) com imagem, ingredientes, preparo e vídeo.
- **Favoritos** com armazenamento local (`localStorage`) e listagem em `favoritos.html`.
- **Minhas Receitas (locais)**: criação simples salva apenas no dispositivo.
- **Dark/Light mode** com persistência + **header/footer** carregados via includes.
- **Back-to-top** inteligente e **layout responsivo** (mobile-first).
- Ajustes de **acessibilidade** (contraste, foco, navegação por teclado).

---

## 🧩 Arquitetura & organização

cookwave/
├─ index.html
├─ receita.html
├─ favoritos.html
├─ minhas-receitas.html
├─ sobre.html
├─ assets/
│ ├─ img/ ... (favicons, logos, etc.)
│ └─ cv/ ... (PDF do currículo)
├─ style/
│ ├─ main.css # estilos base/landing
│ ├─ header.css # cabeçalho
│ ├─ footer.css # rodapé
│ └─ about.css # página Sobre (visual TechWave)
├─ scripts/
│ ├─ api.js # integração TheMealDB + cards + busca + categorias
│ ├─ modal.js # carregamento e controle do modal de receitas
│ ├─ recipe.js # renderização de receita.html
│ ├─ favorites.js # utilitários de favoritos (add/remove/localStorage)
│ ├─ favorites_page.js # renderização de favoritos.html
│ ├─ includes.js # carrega header/footer + back-to-top + tema
│ └─ about.js # lista projetos GitHub na página Sobre
└─ README.md


---

## 🚀 Começando (local)

Este é um **site estático** — não precisa de build. Para evitar bloqueios de CORS nos `fetch`, rode com um servidor simples:

### Opção A — VS Code (Live Server)
1. Instale a extensão **Live Server**.  
2. Clique em **Go Live** → acesse `http://127.0.0.1:5500/`.

### Opção B — Python
```bash
# dentro da pasta do projeto
python -m http.server 5500
# abra: http://127.0.0.1:5500/index.html
⚙️ Integrações
TheMealDB

Endpoints públicos para: categorias, aleatórias, detalhes por ID, busca, etc.

Não requer chave para os endpoints básicos usados.

Tradução (opcional)

Suporte opcional ao LibreTranslate (ver scripts/translator.js).

Requer endpoint; recomenda-se uso moderado + cache local.

🧭 Rotas principais

/ → Home (aleatórias, categorias, busca, cards + modal)

/receita.html?id=XXXX → Página de receita

/favoritos.html → Favoritos (localStorage)

/minhas-receitas.html → Receitas criadas localmente

/sobre.html → Perfil, stack, timeline e projetos GitHub

🔐 Acessibilidade & UX

Bom contraste nos dois temas.

Foco visível e navegação por teclado.

Animações suaves e respeito a prefers-reduced-motion.

Responsivo do mobile ao desktop.
🧪 Checklist de teste

 Busca por nome OK

 Modal abre/fecha múltiplas vezes

 Favoritar/desfavoritar reflete em Favoritos

 Página da receita exibe ingredientes/preparo/vídeo

 Tema claro/escuro persiste

 Back to Top aparece em rolagem longa

 Header/footer (includes) carregam em todas as páginas

🛣️ Roadmap

 Busca por ingredientes

 I18n com LibreTranslate + cache

 PWA (manifest, ícones e offline básico)

 A11y automatizado (axe/pa11y)

 Página de categorias dedicada com paginação

🤝 Contribuindo

Faça um fork

Crie uma branch: git checkout -b feat/minha-melhoria

Commit: git commit -m "feat: minha melhoria"

Push: git push origin feat/minha-melhoria

Abra um Pull Request

Padrão de commit sugerido: Conventional Commits (feat:, fix:, docs:, style:, refactor:…).

🙏 Créditos

TheMealDB — API pública de receitas

Font Awesome — ícones

Visual inspirado em Retrowave/Synthwave