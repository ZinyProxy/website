/** Central site config — CTAs point to the external dashboard (Laravel app). */
export const DASHBOARD = {
  register: import.meta.env.DASHBOARD_REGISTER_URL || 'https://dashboard.ziny.io/register',
  login: import.meta.env.DASHBOARD_LOGIN_URL || 'https://dashboard.ziny.io/login',
  google: 'https://dashboard.ziny.io/auth/google',
};

export const NAV = [
  { label: 'Residential', href: '/residential-proxy/' },
  { label: 'Mobile', href: '/mobile-proxy/' },
  { label: 'ISP', href: '/isp-proxy/' },
  { label: 'Datacenter', href: '/datacenter-proxy/' },
  { label: 'Use Cases', href: '/use-cases/' },
  { label: 'Pricing', href: '/pricing/' },
  { label: 'Blog', href: '/blog/' },
];

export const FOOTER = [
  {
    title: 'Products',
    links: [
      { label: 'Residential Proxies', href: '/residential-proxy/' },
      { label: 'Mobile Proxies', href: '/mobile-proxy/' },
      { label: 'ISP Proxies', href: '/isp-proxy/' },
      { label: 'Datacenter Proxies', href: '/datacenter-proxy/' },
    ],
  },
  {
    title: 'Use Cases',
    links: [
      { label: 'Web Scraping', href: '/use-cases/web-scraping/' },
      { label: 'Social Media', href: '/use-cases/social-media/' },
      { label: 'Ad Verification', href: '/use-cases/ad-verification/' },
      { label: 'SEO Monitoring', href: '/use-cases/seo-monitoring/' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Contact Us', href: '/contact/' },
      { label: 'FAQ', href: '/faq/' },
      { label: 'Documentation', href: '/docs/' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about/' },
      { label: 'Blog', href: '/blog/' },
      { label: 'Terms', href: '/terms/' },
      { label: 'Privacy', href: '/privacy/' },
    ],
  },
];
