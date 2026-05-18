# Ziny Headless Rebuild — Project Plan

## Phase 1: Environment Setup (Day 1-2)
- [x] Install Node.js 20+ (v24.15.0)
- [x] Install Git (2.50.1)
- [x] Initialize Astro project in this folder (Astro 6.3.3, static, strict TS)
- [x] Test WordPress REST API connection to ziny.io (200; 80 posts / 61 pages)
- [x] Add core integrations (Tailwind v4, sitemap, RSS, SEO layout, WP client)
- [x] Verify build pipeline (build green, astro check 0 errors)
- [~] Hosting decided: hosting.com cPanel static (replaces Cloudflare Pages)
- [ ] Create GitHub repo + push (needs Val: account/repo)
- [ ] Set up cPanel Git deploy to testing URL (needs cPanel details)

## Phase 2: Design System (Week 1)
- [ ] Extract color palette from ziny.io (pinks, purples, blacks)
- [ ] Identify fonts in use
- [ ] Build reusable components:
  - [ ] Button (primary/secondary)
  - [ ] Pricing card
  - [ ] Customer review card
  - [ ] Location card
  - [ ] Globe graphic (static image, not animated D3)
  - [ ] Header / Footer
  - [ ] Logo carousel

## Phase 3: Marketing Pages (Week 2-3)
- [ ] Homepage (hero, pricing tabs, reviews, locations, support, footer)
- [ ] Residential Proxy landing page
- [ ] Mobile Proxy landing page
- [ ] ISP Proxy landing page
- [ ] Datacenter Proxy landing page
- [ ] Use Cases pages (web scraping, social media, ad verification, etc.)
- [ ] Features pages
- [ ] About / Contact / Pricing / FAQ
- [ ] Terms / Privacy

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