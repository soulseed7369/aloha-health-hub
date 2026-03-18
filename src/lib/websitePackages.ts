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
    price: 597,
    kamaaiaPrice: 497,
    features: [
      'Up to 3 pages',
      '1 feedback round during build',
      'Includes 6 months hosting + Premium subscription',
    ],
    valueCallout: 'Includes $468 in hosting & subscription value',
    afterNote: 'After 6 months — hosting included with active Premium ($49/mo), or $29/mo hosting only',
    mailto: 'mailto:aloha@hawaiiwellness.net?subject=Website%20Bundle%20—%20Essentials',
  },
  {
    id: 'standard',
    name: 'Standard',
    tagline: 'Get found',
    price: 997,
    kamaaiaPrice: 897,
    features: [
      'Up to 5 pages',
      'Booking integration (Calendly, Acuity, or similar)',
      'Basic search engine optimization (page titles, descriptions, local markup, Google indexing)',
      '1 feedback round + 1 post-delivery revision',
      'Includes 9 months hosting + Premium subscription',
    ],
    valueCallout: 'Includes $792 in hosting & subscription value',
    afterNote: 'After 9 months — hosting included with active Premium ($49/mo), or $39/mo hosting only',
    highlight: true,
    mailto: 'mailto:aloha@hawaiiwellness.net?subject=Website%20Bundle%20—%20Standard',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Get booked and paid',
    price: 1497,
    kamaaiaPrice: 1397,
    features: [
      'Up to 8 pages',
      'Booking integration',
      'Payment integration (accept payments directly on your site)',
      'Google Business Profile setup and optimization',
      'Advanced search engine optimization (keyword research, image optimization, sitemap, Google indexing)',
      'AI search optimization (structured for AI-powered search results)',
      '1 feedback round + 2 post-delivery revisions',
      'Includes 12 months hosting + Premium subscription',
    ],
    valueCallout: 'Includes $1,176 in hosting & subscription value',
    afterNote: 'After 12 months — hosting included with active Premium ($49/mo), or $49/mo hosting only',
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
