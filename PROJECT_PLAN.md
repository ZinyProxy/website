# Ziny Headless Rebuild — Project Plan

## Phase 1: Environment Setup (Day 1-2)
- [x] Install Node.js 20+ (v24.15.0)
- [x] Install Git (2.50.1)
- [x] Initialize Astro project in this folder (Astro 6.3.3, static, strict TS)
- [x] Test WordPress REST API connection to ziny.io (200; 80 posts / 61 pages)
- [x] Add core integrations (Tailwind v4, sitemap, RSS, SEO layout, WP client)
- [x] Verify build pipeline (build green, astro check 0 errors)
- [x] Hosting: hosting.com cPanel static (replaces Cloudflare Pages)
- [x] Create GitHub repo + push (ZinyProxy/website, main)
- [x] LIVE: https://web.ziny.io serving the build, valid Let's Encrypt SSL
- [x] Deploy method: `npm run deploy` (build+push) then zip-upload dist to
      docroot via File Manager. cPanel Git VC checkout was unreliable on this
      shared plan — revisit a smoother deploy in Phase 7.

**PHASE 1 COMPLETE ✅ — pipeline proven end-to-end on web.ziny.io**

## Phase 2: Design System (Week 1)
- [x] Extract color palette from ziny.io (pinks, purples, blacks)
- [x] Identify fonts in use (Prompt headings, Roboto body)
- [x] Build reusable components:
  - [x] Button (primary/secondary/ghost)
  - [x] Pricing card
  - [x] Customer review card
  - [x] Location card
  - [x] Globe graphic (lightweight CSS/SVG, not D3 — Val chose minimal anim)
  - [x] Header / Footer
  - [x] Logo carousel
- [ ] Val visual sign-off on web.ziny.io checkpoint

## Phase 3: Marketing Pages (Week 2-3) — DONE 2026-05-20
Approach pivoted from bespoke components → 1:1 Playwright capture + replay.
- [x] Crawl all 147 unique ziny.io URLs (desktop + mobile + post-JS DOM)
- [x] Generalized build-all-pages.mjs (inlines all external CSS per page, mirrors assets)
- [x] Dynamic [...slug].astro route + index.astro for root
- [x] All 147 pages live on https://web.ziny.io at original URLs
- [x] Val visual 1:1 sign-off: "EXACTLY 1 TO 1 1000%"

## Phase 3.5: Restore JS-driven interactions (NEW — needed for functional parity)
- [ ] Globe: D3 orthographic spin + 20 city markers (assets already mirrored)
- [ ] Swiper carousels (reviews / logo strip / etc.)
- [ ] Pricing tabs (Residential/Mobile/ISP/Datacenter switching)
- [ ] FAQ accordion (if not pure CSS)
- [ ] Mobile menu toggle
- [ ] Sticky header behavior on scroll
- [ ] Tawk.to chatbot script tag
- [ ] Code blocks (Prism + clipboard) on blog posts

## Phase 4: Blog Pipeline (Week 4)
- [ ] Blog index page (lists all posts from WP API)
- [ ] Single blog post template
- [ ] Author page template
- [ ] Category pages (5 categories)
- [ ] Pagination
- [ ] Related posts
- [ ] Pull all 81 articles via WP API at build time

## Phase 5: SEO Preservation (Week 5)
- [ ] Map every existing URL → new URL
- [ ] Generate sitemap.xml matching current structure
- [ ] Import Yoast metadata for every page/post
- [ ] Preserve schema.org markup (Article, Organization, Person)
- [ ] Set up 301 redirects via _redirects file
- [ ] Robots.txt
- [ ] Canonical URLs

## Phase 6: Forms & Dynamic (Week 5)
- [ ] All "Get Started" buttons → dashboard.ziny.io signup
- [ ] "Login" button → dashboard.ziny.io login
- [ ] "Sign up with Google" → dashboard OAuth flow
- [ ] Contact form → Cloudflare Worker or email service
- [ ] YourGPT chatbot widget integration

## Phase 7: Staging (Week 6)
- [ ] Deploy to Cloudflare Pages at zinynew.pages.dev
- [ ] OR set up staging.ziny.io subdomain
- [ ] Connect WP webhook → triggers Pages rebuild on publish
- [ ] Test build pipeline end-to-end

## Phase 8: QA (Week 7)
- [ ] Test every blog URL renders correctly
- [ ] Test every landing page renders correctly
- [ ] Test all CTAs point to correct dashboard URLs
- [ ] Test mobile responsiveness
- [ ] Run PageSpeed on staging — target mobile 90+
- [ ] Test sitemap.xml is valid
- [ ] Verify Yoast metadata transferred
- [ ] Test forms work
- [ ] Get visual sign-off from Val on each major page

## Phase 9: Cutover (Week 8)
- [ ] Move WordPress to cms.ziny.io subdomain
- [ ] Update DNS to point ziny.io → Cloudflare Pages
- [ ] Monitor Search Console for crawl errors
- [ ] Monitor real-user analytics for 2 weeks post-cutover
- [ ] Keep old WP frontend reachable as fallback for 30 days