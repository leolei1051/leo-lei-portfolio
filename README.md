# Leo Lei — Data Analyst / Health Data Science Portfolio

A single-file static portfolio for Leo Lei — a data analyst and Master
of Health Data Science student (UNSW). Built with plain HTML + Tailwind CSS
(Play CDN), dark terminal-style, no build step, ready to deploy to Vercel in
one click.

> **Live demo:** https://leo-lei-portfolio.vercel.app/

## Features

- **Responsive** — mobile-first layout with a collapsible nav that closes on navigation.
- **Dark terminal aesthetic** — near-black `#050505` base, monospace micro-labels, stacked display headline, film-grain overlay and a marquee skills ticker.
- **Scroll progress bar** — a thin accent bar tracks reading position.
- **Project cards** — three featured projects with status, ID, tech-stack tags and links.
- **CV download** — a "Download CV" button that serves `assets/Leo_Lei_Resume.pdf`.
- **Accessible & SEO-friendly** — semantic HTML, skip link, ARIA states, Open Graph tags, inline favicon.

## Project structure

```
resume-site/
├── index.html          # the whole site (HTML + inline scripts + Tailwind classes)
├── vercel.json         # { "version": 2 }
├── README.md           # this file
├── .gitignore
└── assets/
    └── Leo_Lei_Resume.pdf   # the resume served by the download button
```

## Adding project links & og:url (after first deploy)

The project cards and `og:url` intentionally ship without links for now (the
GitHub repos don't exist yet). No placeholders block deployment. After your
first deploy, add the live URL to `og:url` in `<head>` and re-add a `GitHub →`
link to each project card once the repos are created.

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
git add index.html vercel.json README.md .gitignore assets/Leo_Lei_Resume.pdf
git status              # confirm only the intended files are staged
git commit -m "feat: initial portfolio site for Leo Lei"

# Create an empty repo on GitHub first (do NOT tick "Add a README")
git remote add origin https://github.com/leolei1051/leo-lei-portfolio.git
git push -u origin main
```

> Note: the legacy print-resume files (`quant.html`, `styles.css`, `styles-quant.css`)
> are ignored via `.gitignore`, so `git add .` is also safe.

## Updating your CV

Replace `assets/Leo_Lei_Resume.pdf` with an updated PDF (keep the same filename),
then commit and push — Vercel redeploys automatically on push.

## Tech stack

- HTML5 (semantic markup)
- [Tailwind CSS](https://tailwindcss.com) via Play CDN
- Vanilla JavaScript (scroll progress + mobile menu)
- [Vercel](https://vercel.com) for hosting

## Roadmap (planned upgrade)

This repo currently ships a static single-file site. A full **Next.js 15** rebuild
is planned with: timeline resume, filterable data-science project gallery, MBTI &
skill radar dashboard, hobby masonry gallery, and a Notion-powered markdown blog
(Tailwind CSS v4, Framer Motion, Recharts, Notion API).

## License

MIT — add a `LICENSE` file to the repo if you want to formalise it.
