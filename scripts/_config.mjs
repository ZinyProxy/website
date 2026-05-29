/**
 * Single source of truth for WordPress origin. Imported by every fetch script.
 *
 * Pre-cutover (current state): WP lives at ziny.io AND cms.ziny.io serves the
 *   same files. cms.ziny.io 301-redirects to ziny.io because WP's siteurl is
 *   still https://ziny.io, but the REST API at cms.ziny.io/wp-json/ responds
 *   directly (no redirect). Both work.
 *
 * Post-cutover: WP only at cms.ziny.io. ziny.io serves our static build from
 *   ~/repositories/website/dist/. Scripts MUST use cms.ziny.io or they break.
 *
 * Setting this to cms.ziny.io now is safe — works pre- and post-cutover.
 */
export const WP_ORIGIN = "https://cms.ziny.io";

/** The public-facing canonical origin (where Google indexes us). Stays ziny.io. */
export const PUBLIC_ORIGIN = "https://ziny.io";

/** Our staging deploy (will be decommissioned post-cutover). */
export const STAGING_ORIGIN = "https://web.ziny.io";
