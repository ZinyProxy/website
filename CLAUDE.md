# Claude Code Instructions for Ziny Headless Project

## Communication Style with Val
- Short answers, direct, no hedging
- Use tables for comparisons
- One step at a time, wait for confirmation before next step
- Tell Val when you're going to do something destructive (delete, overwrite)
- Acknowledge mistakes plainly, fix them, move on
- Match Val's casual tone

## Project Working Rules
1. ALWAYS read MEMORY.md and PROJECT_PLAN.md at start of every session
2. Update MEMORY.md when significant decisions are made
3. Mark completed items in PROJECT_PLAN.md with [x]
4. NEVER touch production ziny.io files — this project is isolated
5. NEVER deploy without explicit Val approval
6. Test locally before pushing to staging
7. Commit to git after every meaningful chunk of work
8. If a step is unclear, ask Val ONE clarifying question — don't guess

## Stack Constraints
- Astro 6.x (latest stable, installed 6.3.3), TypeScript strict, no React unless necessary for interactive widgets
- Hosting: hosting.com cPanel static (Val decision 2026-05-18, overrides earlier Cloudflare Pages plan); DNS/CDN via Cloudflare; 301s via .htaccess
- WordPress REST API for content (no GraphQL plugin, use built-in /wp-json/)
- No client-side JS unless absolutely required — static HTML first
- Tailwind CSS for styling (utility-first, matches current Elementor design vibe)
- Astro Image component for all images
- @astrojs/sitemap for sitemap.xml
- @astrojs/rss for blog RSS feed

## URL Preservation Rules (NON-NEGOTIABLE)
Every existing public URL on ziny.io must resolve correctly on the new site.
The handoff doc lists 81 blog articles + 59 marketing pages = 149 URLs.
Before deploying anything to production:
- Generate a list of all current URLs (crawl sitemap_index.xml)
- Generate list of new URLs the Astro build will produce
- Diff them — every old URL must appear in new URLs OR have an explicit 301

## Image Strategy
- Use existing WP-hosted images via WP REST API featured_media field
- Astro fetches at build time, optimizes to AVIF/WebP, serves from CF
- For hero graphics (Z logo, globe): download from current site, save to /public/, use Astro Image
- DO NOT use D3.js spinning globe — replace with static globe image
- All images need explicit width/height to prevent CLS

## SEO Preservation
- Import Yoast yoast_head_json from WP REST API for every post/page
- Inject as <title>, <meta name="description">, OG tags, Twitter tags
- Preserve schema.org JSON-LD from Yoast output
- Generate sitemap.xml matching exact URL structure of current sitemap_index.xml

## Forms / CTAs
- "Get Started" → https://dashboard.ziny.io/register
- "Login" → https://dashboard.ziny.io/login
- "Sign up with Google" → https://dashboard.ziny.io/auth/google
- Contact form → write a Cloudflare Worker (we'll address in Phase 6)
- Chatbot → existing YourGPT widget script tag

## Build & Deploy Commands
- Dev server: `npm run dev` (localhost:4321)
- Build: `npm run build`
- Preview build: `npm run preview`
- Deploy: push to GitHub, cPanel Git Version Control pulls + runs .cpanel.yml to publish ./dist to the testing URL docroot

## Git Workflow
- main branch = staging
- production branch = production cutover only
- Commit messages: clear, present tense, "Add hero section component"
- Push to GitHub after every working session