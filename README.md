# Leo Lei — Data Analyst / Health Data Science Portfolio

A static portfolio for Leo Lei — a data analyst and Master
of Health Data Science student (UNSW). Built with plain HTML + Tailwind CSS
(Play CDN), dark terminal-style, no build step, ready to deploy to Vercel in
one click.

> **Live demo:** https://leo-lei-portfolio.vercel.app/

## Features

- **"Leo's Court" 3D hero** — a real-time WebGL (Three.js) table-tennis rally between two stylised players, with a static fallback when WebGL2 is unavailable (see below).
- **Direct access** — View Projects, Download CV, GitHub and LinkedIn are reachable without any animation gate.
- **Responsive** — mobile-first layout with a collapsible nav that closes on navigation; no horizontal overflow.
- **Dark terminal aesthetic** — near-black `#050505` base, monospace micro-labels, stacked display headline, film-grain overlay and a marquee skills ticker.
- **Scroll progress bar** — a thin accent bar tracks reading position.
- **Project cards** — two featured projects plus an archived one, each with a generated abstract SVG cover, status, ID and tech-stack tags. Public GitHub links are shown only where a public repo actually exists.
- **Project detail page** — a dedicated write-up for `semiconductor-forecast` (overview, data sources, methodology, results, limitations, links).
- **CV download** — a "Download CV" button that serves `assets/Leo_Lei_Resume.pdf`.
- **Reduced motion & no-JS fallback** — `prefers-reduced-motion` disables animation, and all content renders without JavaScript.
- **Accessible & SEO-friendly** — semantic HTML, skip link, ARIA states, Open Graph tags, inline favicon.

## Leo's Court — 3D interactive hero

The homepage hero is a real-time WebGL (Three.js via CDN ESM, no build step)
table-tennis rally between two stylised players. Notes for maintainers:

- **Characters** — `model-character.js` loads a GLB/GLTF (skinned mesh + bones +
  animation clips) via GLTFLoader + AnimationMixer, attaches a paddle to a named
  hand bone, and exposes the paddle's world position for contact checks. **No 3D
  model asset exists yet**, so the site falls back to fixed upright 2.5D billboard
  sprites (`小胖.png` = blue Fan near-left, `马龙.png` = red/gold Ma far-right) and
  labels the fallback honestly ("3D 模型未接入 · 显示立绘占位"). See the roadmap
  below for the three acceptance tiers and the missing assets.
- **Demo rally** — a scripted ~10 s loop (serve → rally → one winner) on a unified
  timeline in `rally.js`. Ball and characters are pure functions of the phase, so
  pause/slow/replay keep everything in lock-step; the score is a pure function too
  (8:8 → 8:9 → 8:8). With only 2D sprites the "movement" is a restrained whole-sprite
  shift, not a natural swing.
- **Controls** — drag/touch to orbit (limited), Pause / Slow / Reset / Sound
  buttons, keyboard `Space` `S` `R` `M` `Esc`. Sound is synthesised (WebAudio)
  and **off by default**.
- **Fallback** — without WebGL2 (or if Three.js fails to load) the hero
  degrades to a static block; all content and navigation remain reachable.
- **Local preview** — ES modules need HTTP, so use `python -m http.server`
  (opening `index.html` via `file://` shows the static fallback, not the 3D).

## 3D character roadmap (acceptance tiers)

1. **structure-implemented (current)** — model loading / AnimationMixer playback /
   hand-bone attachment / third-person follow camera / paddle world-position query
   are implemented. The page falls back to the sprite cover and labels it honestly.
2. **model-wired** — a real GLB (skeleton + skinning + clips) loads and plays, the
   paddle follows the hand bone, the third-person camera frames the real character.
3. **motion-verified** — shoulder/elbow/wrist pose visibly changes, clothing deforms
   with the bones, the paddle follows the hand, and the paddle's world position
   aligns with the ball-contact points (`?debug=contact`).

**Missing assets:** a rigged + skinned GLB/GLTF (one character first), animation clips
(`idle`, `ready`, `windup`, `swing`, `follow`, `recover` — later `side-step`, `serve`,
`backhand`), the racket-hand bone name (default `mixamorigRightHand`), and optionally a
paddle model. Drop them as `assets/court/fan.glb` / `ma.glb` to switch the site into
model mode.

## Project structure

```
resume-site/
├── index.html          # the homepage (HTML + Tailwind classes)
├── forecast.html       # semiconductor-forecast project detail page
├── vercel.json         # { "version": 2 }
├── README.md           # this file
├── check.sh            # self-check script
├── .gitignore
└── assets/
    ├── site.css        # shared design system (tokens, grain, motion)
    ├── site.js         # shared behaviour (progress bar, menu, reveal)
    ├── court.css       # 3D court hero (HUD, controls, modal, fallback)
    ├── court/          # Three.js modules (main, scene, characters, rally, audio)
    └── Leo_Lei_Resume.pdf   # the resume served by the download button
```

## Adding project GitHub links

The two semiconductor projects (`semiconductor-monitor` and `semiconductor-forecast`)
don't have public GitHub repositories yet, so their cards link to the in-site
detail page or show no link rather than a broken URL. Once the repos exist, add
a `GitHub →` link to each card.

## Local preview

Either open `index.html` directly in a browser, or serve it over HTTP:

```bash
python -m http.server 8000     # then open http://localhost:8000
# or
npx serve .
```

## Deploy to Vercel

### Option A — Import from GitHub (recommended)

1. Push this repository to GitHub (see **Git** below).
2. Go to [vercel.com](https://vercel.com) → **Add New Project**.
3. **Import** your GitHub repository.
4. Set **Framework Preset** to **Other** (leave Build Command and Output Directory empty — this is a pure static site).
5. Click **Deploy**. You'll get a `*.vercel.app` URL.

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel           # preview deploy (walks you through login/link)
vercel --prod    # production deploy
```

No environment variables or build commands are needed.

## Git

```bash
cd "C:/Users/Matebook D16/Desktop/求职_工作/resume-site"

git init -b main        # or: git init && git branch -M main
git add index.html forecast.html vercel.json README.md .gitignore assets/Leo_Lei_Resume.pdf
git status              # confirm only the intended files are staged
git commit -m "feat: initial portfolio site for Leo Lei"

# Create an empty repo on GitHub first (do NOT tick "Add a README")
git remote add origin https://github.com/leolei1051/leo-lei-portfolio.git
git push -u origin main
```

> Note: the legacy print-resume files (`quant.html`, `styles.css`, `styles-quant.css`)
> and the reference art (`assets/court/*.png`, real-person portraits with unknown
> licence) are ignored via `.gitignore`, so `git add .` will not stage them.

## Updating your CV

Replace `assets/Leo_Lei_Resume.pdf` with an updated PDF (keep the same filename),
then commit and push — Vercel redeploys automatically on push.

## Maintenance

**Iterate:** edit `index.html` / `forecast.html` → preview locally
(`python -m http.server 8000`) → commit → push (Vercel auto-redeploys).

**Self-check:** `bash check.sh` verifies files, placeholders, internal links,
key content markers and the resume PDF. Run it before committing.

**Known trade-offs (recorded deliberately):**
- **Tailwind Play CDN** — a runtime dependency (not the production-recommended build),
  chosen for a zero-build, one-file deploy. Revisit (precompile CSS) if offline
  rendering or production strictness becomes a requirement.
- **Shared design system** — custom CSS/JS now live in `assets/site.css` /
  `assets/site.js` and are linked by both pages, but the `tailwind.config` block
  is still duplicated inline in each page (required by the Play CDN load order).

## Tech stack

- HTML5 (semantic markup)
- [Tailwind CSS](https://tailwindcss.com) via Play CDN (utilities) + `assets/site.css` (design system)
- Vanilla JavaScript (`assets/site.js` — scroll progress, mobile menu, scroll-reveal, guarded tilt)
- Inline SVG for generated project covers (no image assets, no fake screenshots)
- [Vercel](https://vercel.com) for hosting

## Roadmap (planned upgrade)

This repo currently ships a static site with a shared CSS/JS design system
(`assets/site.css` + `assets/site.js`). A full **Next.js 15** rebuild
is planned with: timeline resume, filterable data-science project gallery, MBTI &
skill radar dashboard, hobby masonry gallery, and a Notion-powered markdown blog
(Tailwind CSS v4, Framer Motion, Recharts, Notion API).

## License

MIT — add a `LICENSE` file to the repo if you want to formalise it.
