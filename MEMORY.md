# Ziny.io Headless Rebuild - Project Memory

## Project Owner
- Name: Val (Ernest)
- Location: Calgary, Alberta, Canada
- Communication style: Direct, casual, no hedging, short answers
- Technical level: Non-developer but follows clear instructions

## Project Goal
Rebuild ziny.io marketing site as a headless WordPress + Astro static site.
Keep WordPress at a hidden subdomain as the CMS backend.
Serve all public traffic from a fast static frontend.

## Critical Non-Negotiables
1. EVERY existing URL must continue to work — preserve SEO from 81 ranking blog articles
2. Yoast metadata (titles, descriptions, OG tags) must transfer to new site
3. Production ziny.io stays live and unchanged during entire build
4. New site builds on staging URL (e.g. staging.ziny.io or zinynew.pages.dev)
5. DNS cutover only happens after staging is 100% validated

## Current State of ziny.io
- WordPress + Elementor + Elementor Pro
- Hosting.com Managed Linux VPS (Apache, no LiteSpeed)
- Cloudflare free tier + APO ($5/mo) active
- 81 blog articles + 59 marketing pages
- Top traffic blog pages: porn-proxy-access-adult-sites (6,565 clicks), 
  best-pirate-bay-proxy (4,733), 1337x-torret-proxy-list-2025 (2,338)
- Mobile PageSpeed: 44 (Elementor + Spinning Globe = heavy JS)
- LCP failing on mobile, TTFB now good due to APO

## Tech Stack Chosen
- Frontend: Astro 4.x with TypeScript (100% static / SSG output)
- Hosting: hosting.com cPanel static hosting — DECISION OVERRIDES CLAUDE.md
  (CLAUDE.md says Cloudflare Pages; Val explicitly chose cPanel 2026-05-18)
- DNS/CDN: Cloudflare in front of cPanel origin (ziny.io DNS already on CF)
- CMS: Existing WordPress on same hosting.com cPanel (later moved to a CMS subdomain)
- Content fetch: WordPress REST API at /wp-json/wp/v2/
- 301 redirects: .htaccess on cPanel (NOT Cloudflare _redirects)
- Forms/CTAs: Link out to dashboard.ziny.io (separate Laravel app)
- Images: Astro built-in image optimization, served static via cPanel + Cloudflare CDN

## Repo & Deploy
- GitHub: https://github.com/ZinyProxy/website.git (org: ZinyProxy)
- `main` = Astro source (staging). Pushed 2026-05-18.
- Deploy: `npm run deploy` builds + commits `dist/` ON `main` (dist/ is tracked,
  NOT gitignored) + pushes. cPanel Git VC only clones/tracks `main` and its
  branch dropdown won't expose other branches, so the orphan `deploy` branch
  approach was abandoned 2026-05-18. `.cpanel.yml` (on main) copies dist/. to docroot.
- Trade-off accepted: build artifacts live in `main` history (pragmatic for
  cPanel's single-branch Git VC + non-dev operator).
- Testing URL: https://web.ziny.io — LIVE (valid Let's Encrypt SSL via AutoSSL)
- cPanel user: eabuiltc | docroot: /home/eabuiltc/web.ziny.io/
- DNS: web.ziny.io A record added in Cloudflare, grey-cloud, -> origin 209.42.17.217
- REALITY: cPanel Git Version Control checkout/deploy was unreliable on this
  shared plan (cloned but did not populate working tree; .cpanel.yml hook
  appears disabled). Working deploy = build locally then zip-upload dist/
  contents into docroot via cPanel File Manager. Smoother deploy = Phase 7 task.
- Deploy: `npm run deploy`, then cPanel Git VC: Update from Remote -> Deploy HEAD
- `deploy` branch pushed to origin 2026-05-18 (first build)

## Architecture Decisions Locked (2026-05-18)
1. Render mode: 100% static, Astro fetches WP REST at build time
2. Host/deploy target: hosting.com cPanel static (testing URL first, then prod)
3. WP API base during dev/build: https://ziny.io for now;
   switch to CMS subdomain later once WP is moved
4. Deploy mechanism: GitHub repo -> cPanel Git Version Control (.cpanel.yml)
5. WP API actual counts: 80 posts / 61 pages (handoff doc said 81/59 — reconcile in Phase 5)

## Sections of Current ziny.io (Confirmed)
Hero: "Clean & Private Proxies, #1 #1 Performance" + globe graphic + CTAs
Trust strip: Trustpilot + Google ratings
Logo carousel: Octoparse, Firecrawl, DICLOAK, AdsPower, Puppeteer, Crawlee, Outscraper, etc.
Pricing section: Residential / Mobile / ISP / DC tabs with plans
Customer reviews (4 testimonials visible)
Global Proxy Locations (USA, France, Germany, UK, China, Canada, Japan, Australia)
Get Data Guarantee + Use Pre-Configured Proxies sections
Customer Support section with 3 cards
Footer

## URL Preservation Rules (CRITICAL)
- Blog: /best-pirate-bay-proxy/ → must stay exactly /best-pirate-bay-proxy/
- All 81 article URLs preserved
- All landing page URLs preserved
- Trailing slashes preserved as currently configured
- 301 redirects in Cloudflare Pages _redirects file for any unavoidable changes

## Build Phases
- Phase 1: Project setup, environment, WP API connection test (current phase)
- Phase 2: Component library matching current design
- Phase 3: Build homepage and marketing pages (pixel-match current)
- Phase 4: Blog index + single post template + WP API integration
- Phase 5: SEO preservation (sitemap, redirects, schema, Yoast import)
- Phase 6: Staging deployment to cPanel testing URL via GitHub + cPanel Git
- Phase 7: QA pass, validate every URL
- Phase 8: DNS cutover + monitoring

## What I CANNOT Do Directly
- Anthropic's chat-Claude has no access to your machine
- All execution happens through Claude Code on Val's local machine
- Val pastes prompts from chat-Claude into Claude Code
- Claude Code reads/writes files in this folder, runs commands, deploys