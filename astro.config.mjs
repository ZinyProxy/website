// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Canonical production URL — used for sitemap, canonical tags, RSS.
  // Stays ziny.io even while testing on a cPanel staging URL.
  site: 'https://ziny.io',

  // 100% static build (Astro fetches WordPress REST at build time).
  output: 'static',

  // URL PRESERVATION (non-negotiable): current WP/Elementor URLs use a
  // trailing slash, e.g. /best-pirate-bay-proxy/ . 'directory' format emits
  // <slug>/index.html so the served URL keeps the trailing slash exactly.
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },

  image: {
    // Allow Astro <Image> to optimize remote WordPress-hosted media.
    domains: ['ziny.io'],
  },
});
