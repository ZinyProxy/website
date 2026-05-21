/**
 * Lean client-side restore of the JS-driven bits we stripped from Elementor.
 * Runs on every page; each module no-ops if its selectors aren't present.
 *
 * Loaded via a single <script> tag in [...slug].astro and index.astro.
 * Astro bundles + tree-shakes — final shipped size is a tiny fraction of
 * Elementor's original 28 JS files.
 */
import { geoOrthographic, geoPath, geoGraticule, geoDistance } from 'd3-geo';
import { feature as topoFeature } from 'topojson-client';

// ============================================================================
// Globe — orthographic D3-style spin, exact config copied from ziny.io's globe.js
// ============================================================================
async function initGlobe() {
  const containers = document.querySelectorAll<HTMLElement>('.globe-container');
  if (!containers.length) return;

  const [worldRes, markerRes] = await Promise.all([
    fetch('/ziny-globe/world-110m.json'),
    fetch('/ziny-globe/marker-data.json'),
  ]);
  if (!worldRes.ok || !markerRes.ok) return;
  const world: any = await worldRes.json();
  const markers: { name: string; longitude: number; latitude: number }[] = await markerRes.json();
  const land: any = topoFeature(world, world.objects.countries);

  const SPEED = 0.008;
  const V_TILT = -10;

  for (const el of containers) {
    const width = el.getBoundingClientRect().width || 480;
    const height = 500;
    const SVG = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const projection = geoOrthographic()
      .scale(Math.min(width, height) / 2 - 20)
      .translate([width / 2, height / 2])
      .clipAngle(90);

    const path = geoPath(projection);

    const sphere = document.createElementNS(SVG, 'path');
    sphere.setAttribute('fill', '#b0549e');
    svg.appendChild(sphere);

    const graticule = document.createElementNS(SVG, 'path');
    graticule.setAttribute('fill', 'none');
    graticule.setAttribute('stroke', 'rgba(255,255,255,0.18)');
    graticule.setAttribute('stroke-width', '0.5');
    svg.appendChild(graticule);

    const landPath = document.createElementNS(SVG, 'path');
    landPath.setAttribute('fill', '#08090a');
    landPath.setAttribute('stroke', 'rgba(0,0,0,0.4)');
    landPath.setAttribute('stroke-width', '0.5');
    svg.appendChild(landPath);

    const markerGroup = document.createElementNS(SVG, 'g');
    svg.appendChild(markerGroup);

    const markerNodes = markers.map(() => {
      const g = document.createElementNS(SVG, 'g');
      const img = document.createElementNS(SVG, 'image');
      const size = 30 * (projection.scale() / 300);
      img.setAttribute('href', '/ziny-globe/map.png');
      img.setAttribute('width', String(size));
      img.setAttribute('height', String(size));
      img.setAttribute('x', String(-size / 2));
      img.setAttribute('y', String(-size));
      g.appendChild(img);
      markerGroup.appendChild(g);
      return g;
    });

    el.appendChild(svg);

    const center: [number, number] = [width / 2, height / 2];
    const sphereDatum = { type: 'Sphere' as const };
    const grat = geoGraticule()();

    let start = 0;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      projection.rotate([SPEED * elapsed - 120, V_TILT, 0]);
      sphere.setAttribute('d', path(sphereDatum as any) ?? '');
      graticule.setAttribute('d', path(grat as any) ?? '');
      landPath.setAttribute('d', path(land as any) ?? '');
      const inv = projection.invert!(center)!;
      markers.forEach((m, i) => {
        const pos = projection([m.longitude, m.latitude]);
        const dist = geoDistance([m.longitude, m.latitude], inv);
        if (!pos || dist > 1.57) {
          markerNodes[i].setAttribute('transform', 'translate(-9999,-9999)');
        } else {
          markerNodes[i].setAttribute('transform', `translate(${pos[0]},${pos[1]})`);
        }
      });
      requestAnimationFrame(tick);
    };
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      requestAnimationFrame(tick);
    } else {
      tick(performance.now()); // single frame so the globe still renders
    }
  }
}

// ============================================================================
// Mobile menu — toggle Elementor's nav menu open class
// ============================================================================
function initMobileMenu() {
  document.querySelectorAll<HTMLElement>('.elementor-menu-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      btn.classList.toggle('elementor-active');
      // Elementor renders a sibling `.elementor-nav-menu--dropdown` panel
      const wrap = btn.closest('.elementor-widget-container, .elementor-widget-nav-menu') || document;
      const panel = wrap.querySelector<HTMLElement>('.elementor-nav-menu--dropdown');
      if (panel) panel.classList.toggle('elementor-active');
    });
  });
}

// ============================================================================
// Sticky header — Elementor uses .elementor-sticky-active class on scroll
// ============================================================================
function initStickyHeader() {
  const stickies = document.querySelectorAll<HTMLElement>('[data-settings*="sticky"]');
  if (!stickies.length) return;
  const onScroll = () => {
    const y = window.scrollY;
    stickies.forEach((el) => {
      el.classList.toggle('elementor-sticky--effects', y > 10);
      el.classList.toggle('elementor-sticky-active', y > 10);
    });
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

// ============================================================================
// FAQ accordion (Elementor "nested-accordion" + native <details>)
// Most Elementor accordions actually use native <details>/<summary> which work
// without JS; this handles the n-accordion variant that needs a class toggle.
// ============================================================================
function initAccordion() {
  document
    .querySelectorAll<HTMLElement>('.e-n-accordion-item-title, .elementor-accordion-title, .elementor-tab-title')
    .forEach((title) => {
      title.addEventListener('click', () => {
        const item = title.closest(
          '.e-n-accordion-item, .elementor-accordion-item, .elementor-toggle-item',
        ) as HTMLElement | null;
        if (!item) return;
        const open = item.classList.toggle('elementor-active');
        title.setAttribute('aria-expanded', String(open));
        const content = item.querySelector<HTMLElement>(
          '.elementor-accordion-content, .elementor-tab-content, .e-n-accordion-item-content',
        );
        if (content) content.style.display = open ? '' : 'none';
      });
    });
}

// ============================================================================
// Pricing tabs (Elementor "nested-tabs" + classic tabs)
// ============================================================================
function initTabs() {
  document.querySelectorAll<HTMLElement>('.e-n-tabs').forEach((tabs) => {
    const heads = tabs.querySelectorAll<HTMLElement>('.e-n-tab-title, [role="tab"]');
    const panels = tabs.querySelectorAll<HTMLElement>('.e-n-tabs-content > *, [role="tabpanel"]');
    if (!heads.length || !panels.length) return;
    heads.forEach((h, i) => {
      h.addEventListener('click', () => {
        heads.forEach((x) => { x.classList.remove('e-active'); x.setAttribute('aria-selected', 'false'); });
        panels.forEach((p) => { p.classList.remove('e-active'); p.style.display = 'none'; });
        h.classList.add('e-active');
        h.setAttribute('aria-selected', 'true');
        const panel = panels[i];
        if (panel) { panel.classList.add('e-active'); panel.style.display = ''; }
      });
    });
  });
}

// ============================================================================
// Mega menu (Elementor nested-menu "e-n-menu") — open dropdown panels on
// hover (desktop) / click. Panels are `.e-n-menu-content`, toggled via the
// `.e-n-menu-dropdown-icon` button's aria-controls + aria-expanded.
// ============================================================================
function initMegaMenu() {
  const items = document.querySelectorAll<HTMLElement>('.e-n-menu-item');
  if (!items.length) return;
  const isDesktop = () => window.matchMedia('(min-width: 1025px)').matches;

  items.forEach((item) => {
    const content = item.querySelector<HTMLElement>('.e-n-menu-content');
    const icon = item.querySelector<HTMLElement>('.e-n-menu-dropdown-icon');
    const title = item.querySelector<HTMLElement>('.e-n-menu-title');
    if (!content) return;

    const open = (on: boolean) => {
      // Elementor hides the panel with display:none — force it on.
      content.style.display = on ? 'flex' : '';
      content.style.opacity = on ? '1' : '';
      content.style.visibility = on ? 'visible' : '';
      content.style.pointerEvents = on ? 'auto' : '';
      content.classList.toggle('e-active', on);
      title?.classList.toggle('e-active', on);
      icon?.setAttribute('aria-expanded', String(on));
      content.querySelectorAll<HTMLElement>(':scope > .e-con, :scope > *').forEach((c) => {
        if (on) c.style.display = c.style.display === 'none' ? '' : c.style.display;
      });
    };

    // Desktop: hover the whole item.
    item.addEventListener('mouseenter', () => { if (isDesktop()) open(true); });
    item.addEventListener('mouseleave', () => { if (isDesktop()) open(false); });
    // Touch / click on the icon (or title) toggles.
    [icon, title].forEach((trigger) =>
      trigger?.addEventListener('click', (e) => {
        if (isDesktop()) return;
        e.preventDefault();
        open(icon?.getAttribute('aria-expanded') !== 'true');
      }),
    );
  });
}

// ============================================================================
// Tawk.to chatbot — exact embed from live ziny.io
// ============================================================================
function initChatbot() {
  if ((window as any).Tawk_API) return;
  const w = window as any;
  w.Tawk_API = w.Tawk_API || {};
  w.Tawk_LoadStart = new Date();
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://embed.tawk.to/6a065cc0373/default';
  s.charset = 'UTF-8';
  s.setAttribute('crossorigin', '*');
  document.head.appendChild(s);
}

// ============================================================================
function boot() {
  initGlobe().catch((e) => console.warn('globe init failed', e));
  initMobileMenu();
  initMegaMenu();
  // initStickyHeader();  // disabled — Elementor sticky needs a clean re-impl; revisit
  initAccordion();
  initTabs();
  initChatbot();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
