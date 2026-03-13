// ── Package definitions ──────────────────────────────────────────────────────

export interface PackageFeature {
  text: string;
}

export interface Package {
  id: 'starter' | 'growth' | 'pro';
  name: string;
  setupFee: number;
  monthlyFee: number;
  features: string[];
  bonus: string;
  bonusTier: 'premium' | 'featured';
  bonusMonths: number;
  bestFor: string;
  cta: string;
  highlight?: boolean; // "Most Popular" badge on Growth card
}

export const PACKAGES: Package[] = [
  {
    id: 'starter',
    name: 'Starter',
    setupFee: 499,
    monthlyFee: 19,
    features: [
      '1-page custom website',
      'Mobile-friendly design',
      'About and services sections',
      'Contact form',
      'Social links',
      'Domain connection',
      'Basic SEO setup',
    ],
    bonus: '1 month Premium Listing on HawaiiWellness.net',
    bonusTier: 'premium',
    bonusMonths: 1,
    bestFor: 'Solo practitioners who want an affordable site that looks polished and credible.',
    cta: 'Get Started',
  },
  {
    id: 'growth',
    name: 'Growth',
    setupFee: 999,
    monthlyFee: 39,
    features: [
      'Up to 5 custom pages',
      'Home, About, Services, Contact + FAQ or Testimonials',
      'Booking link integration',
      'Testimonials section',
      'Basic blog or article capability',
      'Local SEO structure',
      'Domain connection',
      'Basic analytics setup',
    ],
    bonus: '3 months Premium Listing on HawaiiWellness.net',
    bonusTier: 'premium',
    bonusMonths: 3,
    bestFor: 'Established practitioners ready for a more complete website and better conversion.',
    cta: 'Choose Growth',
    highlight: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    setupFee: 1999,
    monthlyFee: 79,
    features: [
      'Up to 8 custom pages',
      'Custom layout and stronger branding',
      'Booking + payments/deposit integration',
      'Intake form integration',
      'Packages, workshops, or offerings pages',
      'Testimonials and social proof sections',
      'Blog, event, or retreat pages',
      'Enhanced SEO structure',
      'Priority support',
    ],
    bonus: '6 months Premium Listing on HawaiiWellness.net',
    bonusTier: 'premium',
    bonusMonths: 6,
    bestFor: 'High-touch practices, retreat businesses, and wellness providers ready for a more advanced site.',
    cta: 'Go Pro',
  },
];

// ── Add-on categories ────────────────────────────────────────────────────────

export interface AddOn {
  name: string;
  price: string;
}

export interface AddOnCategory {
  title: string;
  icon: string; // lucide icon name, used in component
  items: AddOn[];
}

export const ADD_ON_CATEGORIES: AddOnCategory[] = [
  {
    title: 'Content & Design',
    icon: 'Paintbrush',
    items: [
      { name: 'Extra page', price: '$150' },
      { name: 'Copywriting per page', price: '$100–$200' },
      { name: 'Gallery section', price: '$100' },
      { name: 'Logo or brand polish', price: '$150–$400' },
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
      { name: 'Priority edits & support', price: 'Custom' },
    ],
  },
];

// ── Discount logic ────────────────────────────────────────────────────────────

export const EARLY_BIRD_WINDOW_DAYS = 7;
export const EARLY_BIRD_DISCOUNT_PCT = 0.10;
export const BITCOIN_DISCOUNT_PCT = 0.10;

export interface EarlyBirdStatus {
  eligible: boolean;
  daysRemaining: number;
  hoursRemaining: number; // total hours, use % 24 for display
}

/**
 * Determine if a listing's owner qualifies for the early-bird setup discount.
 * The window is 7 days from the listing's created_at timestamp.
 */
export function getEarlyBirdStatus(createdAt: string | null | undefined): EarlyBirdStatus {
  if (!createdAt) return { eligible: false, daysRemaining: 0, hoursRemaining: 0 };

  const deadline = new Date(createdAt).getTime() + EARLY_BIRD_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const msRemaining = deadline - Date.now();

  if (msRemaining <= 0) return { eligible: false, daysRemaining: 0, hoursRemaining: 0 };

  return {
    eligible: true,
    daysRemaining: Math.floor(msRemaining / (24 * 60 * 60 * 1000)),
    hoursRemaining: Math.floor(msRemaining / (60 * 60 * 1000)),
  };
}

/**
 * Calculate discounted setup fee.
 * Discounts stack additively on the setup fee only (monthly is never discounted).
 */
export function calcSetupPrice(
  baseSetup: number,
  earlyBird: boolean,
  bitcoin: boolean,
): { final: number; savings: number; totalPct: number } {
  let totalPct = 0;
  if (earlyBird) totalPct += EARLY_BIRD_DISCOUNT_PCT;
  if (bitcoin) totalPct += BITCOIN_DISCOUNT_PCT;
  const savings = Math.round(baseSetup * totalPct);
  return { final: baseSetup - savings, savings, totalPct };
}
