// ── Website Package definitions (Kamaʻāina Rate pricing) ─────────────────────

export interface Package {
  id: 'essentials' | 'standard' | 'pro';
  name: string;
  tagline: string;
  price: number;
  kamaaiaPrice: number;
  features: string[];
  valueCallout: string;
  afterNote: string;
  highlight?: boolean;
  mailto: string;
}

export const PACKAGES: Package[] = [
  {
    id: 'essentials',
    name: 'Essentials',
    tagline: 'Get online',
    price: 599,
    kamaaiaPrice: 499,
    features: [
      'Custom single-page design — everything in one beautiful scroll',
      'Professional copywriting included',
      'Booking integration — whatever system you use, we connect it',
      'Social links — connect your Instagram, Facebook, and more',
      'Contact form',
      'Mobile-first, enterprise-grade security',
      'Linked to your Hawaiʻi Wellness listing',
      '3 months Premium included',
    ],
    valueCallout: '3 mo Premium ($117) + 6 mo hosting ($174) = $291 in included value',
    afterNote: 'After 6 months — $29/mo hosting, or free with an active Premium subscription ($39/mo)',
    mailto: 'mailto:aloha@hawaiiwellness.net?subject=Website%20Bundle%20—%20Essentials',
  },
  {
    id: 'standard',
    name: 'Standard',
    tagline: 'Get found',
    price: 999,
    kamaaiaPrice: 799,
    features: [
      'Starts with a 1-hour design session',
      'Everything in Essentials, plus:',
      'Multi-page structure — About, service pages, Testimonials',
      'Local SEO — show up when someone Googles your modality + location',
      'Google Business Profile setup & optimization',
      'Submitted to Google Search Console, set up for indexing',
      'Blog setup + Substack integration — your voice, your audience, your list',
      '1 month priority support — we\'re on call for minor updates and tweaks',
      '6 months Premium included',
    ],
    valueCallout: '6 mo Premium ($234) + 6 mo hosting ($174) = $408 in included value',
    afterNote: 'After 6 months — $29/mo hosting, or free with an active Premium subscription ($39/mo)',
    highlight: true,
    mailto: 'mailto:aloha@hawaiiwellness.net?subject=Website%20Bundle%20—%20Standard',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Be the obvious choice',
    price: 1499,
    kamaaiaPrice: 1199,
    features: [
      'Starts with a 1-hour design session',
      'Everything in Standard, plus:',
      'Retreat or specialty landing page — a dedicated page for your signature offering',
      'Advanced SEO + AI search optimization — show up in ChatGPT and AI-powered search, not just Google',
      'Google Analytics + Search Console setup',
      '6 months priority support — we\'re on call for minor updates and tweaks',
      '3 months Featured included — top placement in your island\'s directory',
    ],
    valueCallout: '3 mo Featured ($297) + 12 mo hosting ($348) = $645 in included value',
    afterNote: 'After 12 months — $29/mo hosting, or free with an active Featured or Premium subscription',
    mailto: 'mailto:aloha@hawaiiwellness.net?subject=Website%20Bundle%20—%20Pro',
  },
];

// ── What's included with every website ───────────────────────────────────────

export const EVERY_WEBSITE_INCLUDES = [
  'Bespoke custom design (not a template)',
  'Mobile-first responsive design',
  'Professional copywriting included',
  'Social media link integration',
  'Contact form',
  'Enterprise-grade security built in',
  'Linked to your Hawaiʻi Wellness directory profile',
];

// ── Add-on categories ────────────────────────────────────────────────────────

export interface AddOn {
  name: string;
  price: string;
}

export interface AddOnCategory {
  title: string;
  icon: string;
  items: AddOn[];
}

export const ADD_ON_CATEGORIES: AddOnCategory[] = [
  {
    title: 'Content & Design',
    icon: 'Paintbrush',
    items: [
      { name: 'Extra page', price: '$100' },
      { name: 'Copywriting', price: 'Included' },
      { name: 'Gallery section', price: 'Included' },
      { name: 'Logo design', price: '$150–$300' },
    ],
  },
  {
    title: 'Marketing',
    icon: 'TrendingUp',
    items: [
      { name: 'Local SEO boost', price: '$250–$500' },
      { name: 'Google Business Profile optimization', price: '$150' },
      { name: 'Email signup setup', price: '$150–$300' },
      { name: 'Lead magnet setup', price: '$150' },
    ],
  },
  {
    title: 'Functionality',
    icon: 'Puzzle',
    items: [
      { name: 'Booking integration', price: '$100' },
      { name: 'Payments integration', price: '$150' },
      { name: 'Intake form setup', price: '$150–$300' },
      { name: 'Events or workshop page', price: '$150' },
    ],
  },
  {
    title: 'Ongoing Support',
    icon: 'LifeBuoy',
    items: [
      { name: 'Monthly content updates', price: '$50–$150/mo' },
      { name: 'SEO & content support', price: '$99–$299/mo' },
      { name: 'Additional major revision', price: '$149' },
    ],
  },
];

// Kamaʻāina Rate spots
export const KAMAAINA_WEBSITE_SPOTS = 10;

// Legacy exports for compatibility — kept so DashboardHome doesn't break
export interface EarlyBirdStatus {
  eligible: boolean;
  daysRemaining: number;
  hoursRemaining: number;
}

export function getEarlyBirdStatus(_createdAt: string | null | undefined): EarlyBirdStatus {
  return { eligible: false, daysRemaining: 0, hoursRemaining: 0 };
}
