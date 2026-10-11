# Ziny Proxy — What to Pivot To and What to Market (v3, Oct 2026)

Researched 2026-10-11 across 10 research tracks, ~500 web queries (competitors, customer voice, demand pockets, conquest tactics, breakout product plays, adjacent bundles, geo/vertical markets, Firecrawl/Crawl4AI, automation). Sandbox could not fetch most proxy sites directly; facts come from search-indexed pages, review sites, SEC filings and news. "Unverified" = single or self-interested source.

---

## 0. The answer in one paragraph

Stop being a GB shop. Selling residential gigabytes is a commodity war Ziny cannot win: Rayobyte launched $0.01/GB bulk resi in Sep 2026, Evomi is at $0.49, DataImpulse at $1, and Ziny is a reseller of someone else's pool. Pivot to **"account-grade infrastructure for operators"**: sell IPs that hold logins (per IP, per line, per seat), bundled with the phone and the browser, with a clean-IP guarantee, to the agencies, affiliates and multi-account operators the big brands just banned. Then take that exact product to two markets where no English brand sells in local currency: Brazil and Canada. That is the pivot. The rest of this document is the evidence and the product spec.

---

## 1. Why GB is a dead end (and why operators are the opening)

| Fact | Source |
|---|---|
| Rayobyte "Scale Residential" at $0.0095–0.015/GB (Sep 24 2026, no targeting, KYC'd businesses). Evomi $0.49/GB. DataImpulse $1 flat. Price floor at the commodity end is collapsing. | [Proxyway](https://proxyway.com/research/proxy-market-research-2026), [Evomi review](https://proxyway.com/reviews/evomi-review) |
| Bright Data: residential only for registered companies with human-reviewed KYC since 7 Jul 2026; **"social media and eCommerce account management are not supported use cases as of April 1, 2026"**; mobile closed to new customers. SOAX mandatory KYC/KYB since Jun 2026. Oxylabs hid PAYG. | [BD docs](https://docs.brightdata.com/proxy-networks/residential/network-access), [BD BitBrowser page](https://docs.brightdata.com/integrations/bitbrowser) |
| IPIDEA family (922, PIA S5, ABC, Luna, IP2World…) lost ~99.9% of IPs Jan 2026; NetNut seized Jul 2026 (now netnut.ai, contact-sales, enterprise AI pivot). These were the per-IP, unlimited, no-KYC brands operators used. Millions of devices, 13 brands, orphaned. | [THN](https://thehackernews.com/2026/01/google-disrupts-ipidea-one-of-worlds.html), [Krebs](https://krebsonsecurity.com/2026/07/fbi-seizes-netnut-proxy-platform-popa-botnet/) |
| TikTok Shop US GMV +103% YoY to $11.8B in H1 2026; 5,700 stores over $1M (8x YoY). Agencies run 10–200 accounts each, every account needs a sticky IP + a phone. | [Momentum](https://thelowdown.momentum.asia/tiktok-shop-on-track-to-surpass-us100-billion-gmv-globally-in-2026/) |
| What operators actually pay for: NodeMaven's reviews praise "clean IPs + sticky sessions" and complain only about price. Seamless Proxies charges +15% for IPQS/Scamalytics zero-score IPs. Vendors admit 30-min rotation "logs you out / triggers verification" on FB/TikTok/IG. | [NodeMaven TP](https://trustpilot.com/review/nodemaven.com), [proxyvero](https://proxyvero.com/providers/nodemaven/review) |
| Ziny's own testimonials and G2 reviews: multi-account agencies, Google Ads logins, SMM, sneaker. Partners: 8 antidetect browsers + CloakingHouse + TGhunter. **This is already who buys from Ziny.** | ziny.io homepage |

The giants fired this customer. The cheap brands sell rotating GB that breaks logins. The botnet brands died. Nobody trustworthy is building for the operator.

---

## 2. THE PIVOT: three product lines, sold per IP / per line / per seat, never per GB

### Product 1 — "Account-Grade IPs" (the core)
- **What:** residential IPs with 24h–7-day sticky sessions, plus static ISP, sold **per IP per month**, every IP fraud-scored at generation (Scamalytics/IPQS), auto-replaced if it scores above threshold, refund if it fails. Marketed as "IPs that hold accounts", not "proxies".
- **Price:** $4–6/IP-month sticky residential, $2–3.50/IP ISP (already have), premium "verified-zero-score" tier +20%.
- **Why it beats competitors:** IPRoyal and NodeMaven prove operators pay above $3/GB for sticky + clean. NodeMaven only holds ~60% of sessions past 15 min in Proxyway's test, and users call it expensive. Big brands won't touch the use case. Clones (pia5proxy, 922proxys5) sell at $0.05/IP but nobody trusts them.
- **What Ziny builds:** Laravel middleware that scores each generated IP via Scamalytics API (~$25 per 25k lookups) or IPQS (~$99/mo) and swaps flagged ones. Cheapest real differentiator a reseller can own. Claude Code can build it.
- **Gate:** verify the upstream exposes session TTL ≥ 24h and static-resi allocation. If it doesn't, this product needs a second upstream (Webshare static resi $0.23–0.90/IP in, IPRoyal, Byteful). Check this first, before anything else.
- **Also captures:** the orphaned S5 per-IP buyers. "PIA S5 alternative" / "922 alternative" pages are ranking now; a per-IP SOCKS5 product with a browser extension is what they're searching for.

### Product 2 — "Agency Stack" bundles (mobile line + cloud phone + SOP)
- **What:** dedicated or sticky mobile proxy ports per GEO + GeeLark (or DuoPlus budget) cloud phone + a written "1 phone : 1 IP : 1 account" SOP + 30-min onboarding. Tiers: Starter 5 phones, Agency 25, Scale 100.
- **Price:** Starter ~$149/mo for 5 mobile ports with partner-coupon phones; Phase 2 all-in $49/phone if GeeLark grants credit resale (unverified, ask them).
- **Why it beats competitors:** Multilogin started bundling proxies + cloud-phone minutes in 2026, proving buyers want one invoice. GeeLark does not sell proxies and pays proxy partners **10% rev share for up to 24 months** ([GeeLark partner program](https://www.geelark.com/blog/geelark-partner-program/)). Pure-proxy sellers can't sell the SOP and onboarding. Ziny is already a GeeLark partner with a setup guide live.
- **Geo lead:** US/UK/CA plus PH/TH/BR mobile lines, where Western vendors don't go and the Chinese vendors just died.
- **Risk:** TikTok cracks down on cloud phones; GeeLark launches own proxies. Mitigate with DuoPlus as second phone partner.

### Product 3 — Reseller / white-label tier
- **What:** sub-user API, GB/IP allocation, branded dashboard, Whop listing template + Telegram bot template, reseller rate card. Prepaid deposits $100–2,000.
- **Price:** residential $1.50–2.00/GB wholesale, ISP/mobile per port at 20–30% off; resellers sell at $3–5.
- **Why:** NetNut was "incredibly common among resellers" and absorbed IPIDEA's displaced reseller demand, then got seized. Micro-sellers on Whop/Discord/Telegram/BHW lost their upstream twice in 2026. Only DataImpulse ($1/GB, $50 min) and VoidMob run real programs. Ziny already has a Whop community (416 members) and a Laravel dashboard with users.
- **Gate:** margin test. Ziny is itself a reseller; wholesale only works if Ziny's cost is at or under ~$1.2/GB. Mandatory reseller KYC + usage caps or the Synthient "HIGH RISK" label gets worse.

### Outcome product (secondary, highest margin): "Price Watch" under the Get Data Guarantee
- $299/mo = 500 SKUs across Amazon/Walmart/Shopify, daily, CSV/Sheets/webhook, results-or-refund. $799/mo = 2,500 SKUs hourly + Slack + invoices. "Hire a Developer" becomes the $2–5k custom-scraper upsell.
- Economics: ~$150/mo in compute via Apify actor at $0.01/check or Ziny's own proxies + Scrappey; ~60–70% gross margin vs 30–40% on GB (unverified estimate). Hole in the market between Prisync ($99–299) and Bright Data datasets ($2,000+ floor).
- Why secondary: support load on a solo founder. Do it after Products 1–2 are live.

---

## 3. WHERE to sell it: two markets nobody English owns

### Brazil (strongest demand/competition ratio found)
- Dense local sellers all priced in BRL via PIX (GTI R$40/mo resi, R$200/mo 4G; Shieldprox R$890/mo 4G; RH7 R$4.90–25/GB). None has a global catalogue; most are small, mobile-heavy, often DC-dressed-as-resi. Foreign card purchases cost extra (IOF + FX). Sept 2026 press on rising demand from paid-traffic agencies and WhatsApp automation. [RH7 guide](https://rh7proxys.com/blog/quanto-custa-proxy-residencial-brasil-2026), [press](https://www.amambainoticias.com.br/2026/09/16/proxy-br-o-crescimento-silencioso-de-uma-tecnologia-essencial-para-negocios-brasileiros/)
- Bright Data has a PT interface; Decodo/IPRoyal are English-only (unverified). Only HydraProxy lists PIX. Nobody big bills in BRL.
- **Offer:** `ziny.io/pt-br` (Astro i18n), PIX via Mercado Pago/EBANX, BRL pricing, WhatsApp support hours, Account-Grade IPs + BR 4G lines at R$199–249/mo, 50% affiliate pushed to BR traffic-manager influencers. Target: gestores de tráfego, WhatsApp-automation SaaS, afiliados.

### Canada (home turf, zero competition)
- No Canadian-registered proxy brand exists. CA ISP IPs are sold only by Rayobyte and ProxyEmpire (Bell/Rogers/Telus). Nobody offers CAD pricing, GST/HST invoices, Interac, PIPEDA statement.
- **Offer:** "The Canadian proxy company": Canadian ISP pack 10 static CA IPs CAD $35/mo, CA residential CAD $4/GB, CAD invoicing, Interac. Target: SEO agencies (local SERP), Shopify/Amazon.ca sellers, Canadian ad agencies, universities. **Exclude ticketing in the AUP**: Ontario Bill 97 (Apr 2026) and Quebec law make it toxic.

### Third test: PH/TH TikTok Shop agencies
- English site is fine. Add GCash/Maya/PromptPay via Xendit, USDT. "One store = one IP" sticky plan $25/mo per 3 GB in PH/TH/ID/MY/VN. These buyers were served by Chinese brands that died in January.

Avoid: Vietnam (huge but $9/mo price floor, entrenched locals), India (UPI, low ARPU), Nigeria/Kenya (fraud-adjacent), Turkey (saturated), Russia/CIS (sanctions, payments).

---

## 4. HOW to get eyes on it (go-to-market, from the earlier tracks)

1. **Own the switching moment.** `/alternatives/{brand}` + `/migrate-from/{brand}` for the dead brands (NetNut, 922, PIA S5, Luna, IP2World, PYProxy, ABC) and the angriest live ones (Proxy-Cheap TP 2.8, Thordata rating suspended, 9Proxy weeks of outages, IPRoyal 2,640 reviews at 3.6, Oxylabs/BD KYC refugees). Real migration walkthroughs. Balance-match offer ("upload your dead invoice, we credit up to X GB"), which nobody is doing. Every 2026 winner (Decodo, IPRoyal, ProxyScrape, NodeMaven, DataImpulse) built these directories.
2. **Get into the point of purchase.** AdsPower Partner Center (form, no fee, 3-day reply), Octo Proxy Shop, Hidemyacc Proxy Store (100+ partner codes), GoLogin `/proxies/` directory, Dolphin Anty integrated providers, mutual listings with Kameleo/Undetectable/MoreLogin/Linken Sphere and the 8 browsers Ziny already has guides for. ScrapeOps proxy aggregator (small names are in; email them). GeeLark partner program (10% rev share).
3. **Remove the frictions the giants added:** no KYC before purchase (light KYC above ~$500/mo, say so), crypto, non-expiring traffic, $5–10 PAYG minimum, 24h chat refunds. These are policy changes, not builds.
4. **Funnel:** no-card free tier (Webshare's is the only proven traffic engine, 2.4–3.8M visits/mo), Trustpilot opened + G2 velocity, affiliate made 50% **recurring** (Decodo standard), pushed to affmaven/afftank lists and the 2026 swarm of affiliate review sites.
5. **Fix the claim gap:** either publish the real sourcing story or drop "30M+ verified consented IPs" and "4.9 on SourceForge". Synthient labels Ziny "HIGH RISK reseller, ~126k IPs visible". Replace the claim with proof: the per-IP fraud score from Product 1 shown live on the pricing page, plus a weekly public clean-score test vs 6 competitors.

---

## 5. What NOT to do

- Compete on $/GB. Unwinnable (Rayobyte $0.01, Evomi $0.49, DataImpulse $1).
- Resell or rewrap Firecrawl/Crawl4AI. 20+ AI-scraping APIs, request price floor $0.08–0.20/1k is below raw proxy cost, Firecrawl AGPL, Oxylabs bought ScrapingBee. Integrate only (BYO-proxy docs, Scrapling sponsorship $300/mo, Firecrawl affiliate card in dashboard).
- "Proxies for AI agents" as a bet. DoubleData: the demand "did not hold up" outside enterprise labs.
- Unlimited-bandwidth residential (survivors price it at $70+/day cost), own Canadian SIM farm (capex, carrier TOS), VCC/SMS verification (fraud-adjacent, kills Stripe), aged accounts (60–90% ban rates), ticketing (BOTS Act, ON Bill 97), DePIN content, torrent/porn unblock spend, SERP white-label, brand-bid Google Ads.

---

## 6. Order of operations

1. **Gate check (days):** does the upstream give ≥24h sticky and static-resi per IP? What is Ziny's true cost/GB and per IP? GeeLark credit-resale terms? This decides Products 1–3.
2. **Product 1 live (2–3 weeks):** fraud-score middleware in the Laravel dashboard, per-IP pricing page, "Account-Grade IPs" positioning replaces "Clean & Private Proxies" as the homepage headline.
3. **Product 2 live (2 weeks, mostly writing + partner emails):** Agency Stack tiers, GeeLark/DuoPlus coupons, SOP, onboarding call booking.
4. **Go-to-market 1–3 (parallel, 2 weeks, Claude Code):** conquest directory, partner-center applications, policy switch.
5. **Brazil (4–6 weeks):** PT-BR site, PIX, BRL pricing, BR affiliates. Canada pack in parallel (1 week, it's pricing + a page).
6. **Reseller tier and Price Watch:** after margin check and once Products 1–2 have 30 days of data.

---

## 7. Claude automation for the pivot

No connectors installed on the claude.ai org yet. ~$140–180/mo on top of the Claude plan.

| Job | Access | Human in loop? |
|---|---|---|
| Fraud-score middleware, per-IP pricing, sub-user API, PT-BR i18n, conquest pages | Claude Code on the website repo + the dashboard repo (add it to this session) | Val reviews |
| Weekly public clean-score test, works-on status page | Claude Code Routine runs script, commits results | No |
| Partner applications, GeeLark/DuoPlus/antidetect/ScrapeOps emails, BR influencer and affiliate recruiting | Smartlead Pro (official MCP) or Instantly, 3 warmed domains, $94/mo | Val approves batches |
| Content repurpose blog → X / LinkedIn / Telegram / PT-BR | Routines + WordPress MCP + Postiz (self-host, MCP) or Metricool free; X API ~$10/mo | No |
| Complaint-thread replies (Reddit/BHW/Telegram of dead brands) | Claude drafts, Val posts | Always |
| Trustpilot invites, G2, partner forms without API | Claude in Chrome recurring tasks | Semi |
| SEO gap reports | Google Search Console MCP | No |
| OSS docs PRs (Firecrawl/Crawl4AI/Crawlee), Scrapling sponsorship | GitHub MCP | No |

Hard rule: no auto-replies/DMs to strangers on X, LinkedIn or Reddit (2026 enforcement is real). Claude drafts, a human sends.

---

## Appendix A — Verified status of the 2026 takedowns (corrects v1)

| Brand | Oct 2026 status |
|---|---|
| NetNut | Live at netnut.ai, contact-sales only, enterprise AI pivot; no proof of small-customer onboarding; Alarum cut ~1/3 staff, class action pending. |
| 922Proxy | Dead; three clone "successor" sites, unverified. |
| ABCproxy | Domain alive, dormant, Trustpilot 2.5. |
| LunaProxy, PIA S5, 360, Cherry, Tab | Dead. |
| PYProxy, IP2World | Domains relaunched Aug–Sep 2026 by unverified new owners at "$0.19/GB", old balances not honoured. |
| 9Proxy | Alive, multi-week outages Aug–Sep 2026. |

## Appendix B — Competitor placement grid

| | Low trust / flagged | Mid trust | High trust / brand |
|---|---|---|---|
| Premium ($6–8+) | NetNut (impaired) | Massive | Bright Data, Oxylabs |
| Mid ($2.50–5) | 9Proxy, LightningProxies | SOAX, IPRoyal, Proxy-Seller, ProxyEmpire, NodeMaven, Byteful, **Ziny** | Decodo |
| Budget (<$2.50) | Thordata, Proxy-Cheap, Smartproxy.org, PY/IP2 relaunches | DataImpulse, Evomi, HProxy, Webshare, Floppydata, Proxywing | — |

## Appendix C — Breakout plays that worked (growth per dollar)

1. DataImpulse: $1 flat, non-expiring. Semrush 1.01M → 1.16M visits Dec 2025 → Feb 2026, Proxyway "Most Flexible 2026".
2. IPRoyal: non-expiring + 7-day sticky. ~50% more revenue, doubled headcount 2024 (Proxyway).
3. Evomi: $0.49 shock. "Best Value 2026", but <100k US IPs.
4. Byteful: latency + free team accounts (Oct 2026). "Newcomer 2026", 1,700+ customers (vendor).
5. The S5 per-IP unlimited model: 13 brands, millions of devices, now orphaned. Proof of demand, not a brand to copy.

Unverified items to confirm before anything customer-facing: upstream session TTL and cost; GeeLark credit-resale rights; netnut.ai onboarding status; Bright Data mobile exit (third-party sourced); BR local price points; all traffic estimates.
