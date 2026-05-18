/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  /** WordPress REST base, e.g. https://ziny.io/wp-json/wp/v2 */
  readonly WP_API_URL: string;
  /** WordPress site root, e.g. https://ziny.io */
  readonly WP_SITE_URL: string;
  /** Canonical public site URL, e.g. https://ziny.io */
  readonly SITE_URL: string;
  readonly SITE_NAME: string;
  readonly DASHBOARD_URL: string;
  readonly DASHBOARD_LOGIN_URL: string;
  readonly DASHBOARD_REGISTER_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
