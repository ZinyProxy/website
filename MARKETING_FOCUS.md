# Ziny Proxy — Marketing Focus (Oct 2026)

Research date: 2026-10-11. Four tracks: competitor direction, customer voice, Firecrawl/Crawl4AI viability, Claude-driven automation. Sources are linked inline; anything single-source is marked (unverified).

---

## 1. Where Ziny actually sits today

| Signal | Reality |
|---|---|
| Product | Resi $2.20–3.60/GB, mobile $2.60–3.95/GB, ISP ~$2–3.50/IP, DC $0.40–0.70/GB. Mid-tier price, mid-tier claims. |
| Reviews | G2: 77 reviews, 4.5. Whop: 4.8 (17 ratings, 416 members). No Trustpilot profile found. |
| Third-party risk view | [Synthient](https://synthient.com/context/provider/ziny) labels Ziny **"HIGH RISK — reseller of upstream residential pools"**, ~126k IPs visible (site claims 30M+). Savvy buyers check this. |
| Traffic | SEO-driven, but the top pages are porn/torrent "unblock" articles. High volume, near-zero paid conversion. |
| Community | One BHW sales thread, Telegram + Discord links, antidetect-browser partner pages. No YouTube, no Reddit presence. |
| Where the money is on-site | Multi-accounting agencies (TikTok/IG/ads), e-commerce scrapers, sneaker/ISP buyers. Testimonials confirm this. |

Blunt placement: Ziny is a small reseller-tier brand competing on price in the segment the giants just walked away from. That is a real opening, but only if the trust problem is fixed first.

---

## 2. Where the market went (2025–2026)

- **Price floor stabilised, then bounced.** Evomi $0.49/GB, DataImpulse/PacketStream $1 flat. Mid-tier real entry is $3–5/GB (Decodo, SOAX, Webshare, Rayobyte). Coupons were killed in H1 2026 and PAYG was hidden at Oxylabs/SOAX/Massive, raising entry tickets up to 25x. [Proxyway 2026](https://proxyway.com/research/proxy-market-research-2026), [DoubleData Aug 2026](https://doubledata.com/reports/proxy/state-of-proxy-august-2026)
- **Mobile collapsed ~98% YoY** (Rayobyte to $0.50/GB). Ziny's mobile at $2.60–3.95 is now expensive.
- **Giants are exiting the bottom.** Bright Data: residential KYC-gated to registered companies since Jul 2026, mobile closed to new customers Apr 2026. The individual/agency/antidetect buyer is being ceded to IPRoyal, Decodo, Thordata, DataImpulse, Evomi, NodeMaven — and whoever replaces the IPIDEA brands.
- **Trust is the 2026 story.** Google took down IPIDEA (922Proxy, ABC, Luna, PYProxy, IP2World + 8 more) on 28 Jan 2026. FBI seized NetNut domains 2 Jul 2026 (botnet "Popa"). Buyers now ask "where do your IPs come from" and run fraud-score checks before paying. [Google GTIG](https://cloud.google.com/blog/topics/threat-intelligence/disrupting-largest-residential-proxy-network)
- **Everyone big sells an "AI agent" layer now** (MCP servers, unblockers at ~$1/1k, SERP APIs). From the customer side this demand is enterprise-only and flows to Bright Data/Oxylabs. DoubleData says "agentic search as a demand driver did not hold up." Small buyers still want cheap clean IPs and sticky sessions.
- **Crowded low end.** 56 new providers launched 2025–Mar 2026. Price alone is not a position anymore.

---

## 3. What customers actually say (ranked by frequency)

1. "Residential" IPs that are really DC/ISP with 80–93+ fraud scores. **#1 complaint across BHW, Trustpilot, G2.**
2. Unused traffic expiring / balances wiped. Non-expiring GB is the #1 praise for IPRoyal and DataImpulse.
3. Too expensive at small volume; PAYG removed by big players.
4. Refund refusals, crypto non-refundable, surprise auto-charges.
5. KYC demanded *after* payment.
6. Slow or email-only support.
7. Phantom bandwidth usage / geo filters silently doubling cost.
8. Dashboard gaps (no self-serve IP swap, no live stats).

What makes them switch: getting blocked on a specific target (Amazon, TikTok, Cloudflare, Reddit) > discovering fake-resi IPs > balance expiry > price at small volume > support silence > legal exposure of the provider. Community recommendations (BHW, Proxyway, r/webscraping, Apify/ScrapeOps) matter more than YouTube.

Who pays: e-commerce price/stock monitoring (most popular use case), social multi-accounting agencies (steady, churn on bans), AI/LLM data (huge but enterprise). Who to drop: DePIN/airdrop farmers (Grass now penalises proxies, low LTV), streaming/torrent unblockers (never convert, $0.30 grey-market GB undercuts).

---

## 4. THE FOCUS

**Be the honest mid-tier proxy for operators the giants abandoned: agencies, e-commerce scrapers, antidetect multi-accounters. Win them on proof of clean IPs, honest pricing, and integrations — not on AI products.**

Three pillars, in order:

### Pillar 1 — Proof over claims (fix trust first)
- The site says "30M+ verified, consented IPs", "4.9 on SourceForge". Synthient says 126k-IP high-risk reseller. Any BHW buyer finds this in 30 seconds. Either get the sourcing story straight with the upstream (and publish it plainly) or stop making claims that can be disproven.
- Publish a **weekly public "IP Clean Score"**: automated fraud-score tests (IPQS / Scamalytics / Spamhaus) of Ziny pools vs 6 competitors, by country. This directly answers complaint #1, is content nobody small is doing, and Claude can run it on a schedule end-to-end.
- Claim G2 fully, open Trustpilot, automate review invites after purchase. Reviews compound; it's the cheapest trust asset.

### Pillar 2 — Honest pricing as the product
- **Non-expiring traffic + true PAYG with a $5–10 minimum.** This is the single most-praised feature in the market and the giants just removed it. It's a pricing change, not a build.
- Cut mobile toward $1–1.50/GB or stop leading with it.
- No KYC before first purchase; plain refund policy on the pricing page.

### Pillar 3 — Integration-led distribution (ride other people's traffic)
- Docs in every open-source scraper's proxy section: Firecrawl self-host ([issue #2881 literally asks for provider examples](https://github.com/firecrawl/firecrawl/issues/2881)), Crawl4AI, Scrapling, Crawlee, Scrapy. Proxidize already did this for Firecrawl.
- **Sponsor Scrapling** (87k stars, 11 proxy sponsors already, Platinum $300/mo = README top slot). Competitors paying for it is the signal it works.
- Antidetect partner listings inside the apps (Undetectable, ToDetect, mobileproxies.org run partner lists; the existing GeeLark/VMLogin/Xlogin guides become in-app placements).
- Affiliate program: 50% is market standard; make it **recurring** (Decodo does 50% recurring, 60-day cookie) and go recruit YouTube reviewers and BHW sellers for it.

---

## 5. Firecrawl / Crawl4AI verdict: **INTEGRATE ONLY. Do not resell, do not rewrap.**

| Option | Verdict | Why |
|---|---|---|
| Resell Firecrawl | No | Affiliate pays 25% → 15%. Fine as a referral card in the dashboard, not a product. |
| Rewrap Crawl4AI / self-hosted Firecrawl as "Ziny Scrape API" | No | Price floor is $0.08–0.20/1k requests (Evomi, Decodo, ScrapingBee), below Ziny's raw proxy cost. Self-hosted Firecrawl lacks the stealth engine (Proxyway measured Firecrawl Cloud itself at 33.7% success). You'd run a browser farm + CAPTCHA + 24/7 support against 15 funded teams with one non-dev founder. Firecrawl is AGPL (self-host modifications must be published). |
| Ziny MCP server | Optional, listing only | Decodo's MCP does ~138 npm downloads/week. Cheap to ship in a day for Glama/Smithery/PulseMCP discoverability; expect noise-level usage. |
| Be the BYO-proxy in their docs | **Yes** | Every OSS scraper needs proxies and their docs are thin. Sell GB into that gap. |

Saturated? Yes: 20+ "AI-ready scraping APIs" in 2026 roundups vs 3 in 2024, clones of Firecrawl's API exist, Oxylabs bought ScrapingBee, ScraperAPI bought Traject Data, Firecrawl raised ~$80M (round label unverified). Not a fight for a one-person company.

---

## 6. Stop doing / de-prioritise

- Torrent/porn/streaming "unblock" SEO as a growth lever. Keep the URLs (ranking equity), stop investing in them.
- DePIN/airdrop content and pricing.
- Building an unlocker, scrape API, or "AI agent" product.
- Comparison pages against dead brands (922, ABC, Luna) beyond the migration page. Replace with comparisons vs the brands buyers are actually choosing between now: IPRoyal, Decodo, DataImpulse, Evomi, Thordata, NodeMaven.
- Unverifiable claims on the homepage.

---

## 7. Out-of-the-box acquisition moves (cheap, concrete)

1. **Weekly "IP Clean Score" leaderboard** (above). Also becomes an X thread, Telegram post, and a dev.to article every week with zero extra writing.
2. **IPIDEA/NetNut refugee offer**: "Show us your dead 922/ABC/NetNut balance screenshot, we match up to X GB." Turns the already-ranking migration pages into a conversion offer.
3. **Free target-tester tool**: paste a URL, Ziny tests resi/ISP/mobile success on it live (Amazon, TikTok, Cloudflare). Addresses switch trigger #1. ScrapeOps launched a similar tester on Product Hunt Aug 2026 and it worked. Lead magnet + Product Hunt launch in one.
4. **Live "works-on" status page**: public success rates for Amazon / TikTok / Google / Cloudflare / Reddit updated daily. Nobody mid-tier publishes this.
5. **Dashboard referral cards** for Firecrawl and Apify affiliates: earn 15–30% on scrapers instead of building one.
6. **Scrapling Platinum + docs PRs** to Firecrawl/Crawl4AI/Crawlee (Pillar 3).
7. **Recurring 50% affiliate + reviewer recruiting**: Claude finds YouTube/blog reviewers via YouTube Data API, drafts sequences, Val approves sends.
8. **Review flywheel**: post-purchase G2/Trustpilot invite automation.
9. **Antidetect bundle deals**: "Ziny + GeeLark/VMLogin" promo codes co-posted in both Telegram channels.

---

## 8. Claude automation: what to connect, what stays human

Minimal stack, roughly $140–180/mo on top of the Claude plan. No connectors are installed on the claude.ai org yet.

| Job | Tool / access | Cost | Automation level |
|---|---|---|---|
| Content repurpose: blog → X thread, LinkedIn, Telegram, newsletter | Claude Code Routines (scheduled cloud runs) + WordPress MCP (official adapter) | $0 | Full auto draft, Val approves |
| Social posting | Postiz (self-host, has MCP) or Metricool free MCP; X API pay-per-use ~$10/mo | $0–29 | Auto post |
| Telegram channel | Telegram Bot API MCP | $0 | Auto post |
| Weekly IP Clean Score + works-on status | Claude Code Routine runs the test script against Ziny + competitor trial accounts, writes results page, pushes to this repo | $0 + trial GB | Full auto |
| Cold outreach (affiliates, reviewers, antidetect partners) | Smartlead Pro (official MCP) or Instantly; 3 warmed domains | $94 | Claude drafts + sequences, Val approves batches |
| SEO monitoring + gap pages | Google Search Console MCP (community, service account) | $0 | Full auto report, auto-draft pages |
| GitHub docs PRs, Scrapling sponsorship | GitHub MCP (already in this session) | $0–300 | Full auto for PRs |
| Trustpilot invites, G2 claim, BHW thread bumps, Product Hunt | Claude in Chrome (recurring browser tasks) | $0 | Semi-auto, Val's browser open |
| Affiliate tracking | dashboard.ziny.io export, else Rewardful $49 | $0–49 | Monthly auto report |
| Anything without an API | Zapier / Make / n8n MCP bridge | $0–30 | As needed |

Never automate (2026 enforcement is real): auto-replies and DMs to strangers on X (42k AI-reply accounts purged), LinkedIn connection/DM bots (HeyReach banned Mar 2026, keep ≤20 invites/day manually), Reddit posting bots (must be labelled [App] since Mar 2026; aged account, 90% non-promo). Rule: Claude drafts, a human sends anything that talks to a stranger. Anthropic's usage policy forbids spam too.

---

## 9. First three moves

1. Fix the trust gap: settle the sourcing story, align homepage claims, claim G2 + open Trustpilot. (1 week)
2. Switch pricing to non-expiring GB + true PAYG, cut mobile. (pricing change, 1 week)
3. Ship the weekly IP Clean Score page as a Claude Routine and seed Pillar 3 docs PRs + Scrapling sponsorship. (2–3 weeks)

Plan, channels and cadence come after these three are live.
