/**
 * TypeScript types mirroring the Supabase database schema.
 * Sprint 1 migration: supabase/migrations/20260225000000_initial_schema.sql
 *
 * These are the RAW database row types. Use src/lib/adapters.ts to
 * convert them to the component-friendly shapes expected by UI cards.
 */

// ─── Row types (SELECT results) ───────────────────────────────────────────────

// ─── Shared price-mode type ───────────────────────────────────────────────────

export type PriceMode = 'fixed' | 'range' | 'sliding' | 'contact' | 'free';

// ─── Offerings (retreats, workshops, immersions, mentorship, ceremonies) ──────

export interface OfferingRow {
  id: string;
  practitioner_id: string;
  title: string;
  description: string | null;
  offering_type: 'retreat' | 'workshop' | 'immersion' | 'mentorship' | 'ceremony' | 'event';
  price_mode: PriceMode;
  price_fixed: number | null;
  price_min: number | null;
  price_max: number | null;
  image_url: string | null;
  start_date: string | null;    // ISO date "YYYY-MM-DD", null = evergreen/ongoing
  end_date: string | null;
  location: string | null;
  registration_url: string | null;
  max_spots: number | null;     // null = unlimited
  spots_booked: number;
  sort_order: number;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}

export type OfferingInsert = Omit<OfferingRow, 'id' | 'created_at' | 'updated_at'>;

// ─── Classes (recurring sessions) ────────────────────────────────────────────

export interface ClassRow {
  id: string;
  practitioner_id: string;
  title: string;
  description: string | null;
  price_mode: PriceMode;
  price_fixed: number | null;
  price_min: number | null;
  price_max: number | null;
  duration_minutes: number | null;
  day_of_week: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' | null;
  start_time: string | null;    // "HH:mm:ss" from Postgres time
  location: string | null;
  registration_url: string | null;
  max_spots: number | null;
  spots_booked: number;
  sort_order: number;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}

export type ClassInsert = Omit<ClassRow, 'id' | 'created_at' | 'updated_at'>;

// ─── Practitioner testimonials (provider-curated quotes) ─────────────────────

export interface PractitionerTestimonialRow {
  id: string;
  practitioner_id: string;
  author: string;
  text: string;
  author_location: string | null;
  testimonial_date: string | null;  // ISO date
  linked_type: 'offering' | 'class' | null;
  linked_id: string | null;
  sort_order: number;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}

export type PractitionerTestimonialInsert = Omit<PractitionerTestimonialRow, 'id' | 'created_at' | 'updated_at'>;

// ─── Row types (SELECT results) ───────────────────────────────────────────────

export interface PractitionerRow {
  id: string;
  owner_id: string | null;
  name: string;
  // Sprint 2 — Practitioner-First split-name fields (null until backfilled)
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  slug: string | null;
  years_experience: number | null;
  lineage_or_training: string | null;
  business_id: string | null;    // FK → centers.id (linked center record)
  business_name: string | null;  // free-text business name (not a center record)
  modalities: string[];
  bio: string | null;
  what_to_expect: string | null;
  island: string;
  region: string | null;
  city: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  external_booking_url: string | null;
  booking_label: string | null;
  accepts_new_clients: boolean;
  avatar_url: string | null;
  status: 'draft' | 'pending_review' | 'published' | 'archived';
  tier: 'free' | 'premium' | 'featured';
  email_verified_at: string | null;
  phone_verified_at: string | null;
  created_at: string;
  updated_at: string;
  center_id: string | null;
  session_type: 'in_person' | 'online' | 'both';
  is_featured: boolean;
  social_links: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    x?: string;
    substack?: string;
  };
  testimonials: Array<{
    author: string;
    text: string;
    date: string;
  }>;
  working_hours: {
    mon?: { open: string; close: string } | null;
    tue?: { open: string; close: string } | null;
    wed?: { open: string; close: string } | null;
    thu?: { open: string; close: string } | null;
    fri?: { open: string; close: string } | null;
    sat?: { open: string; close: string } | null;
    sun?: { open: string; close: string } | null;
  };
  retreat_links: string[];
  response_time: string | null;  // e.g. 'within_hours' | 'within_day' | 'within_2_3_days' | 'within_week'
  // Offerings & Events feature (migration 20260317000001)
  show_phone: boolean;
  show_email: boolean;
  booking_enabled: boolean;
  messaging_enabled: boolean;
  discovery_call_enabled: boolean;
  discovery_call_url: string | null;
}

export interface CenterRow {
  id: string;
  owner_id: string | null;
  name: string;
  // Sprint 2 — Practitioner-First additions (null until backfilled)
  slug: string | null;
  logo: string | null;
  center_type: 'spa' | 'wellness_center' | 'clinic' | 'retreat_center' | 'yoga_studio' | 'fitness_center';
  description: string | null;
  island: string;
  region: string | null;
  city: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  external_website_url: string | null;
  avatar_url: string | null;
  photos: string[];
  modalities: string[];
  amenities: string[];             // Sprint 2 — added by 20260317000002_centers_sprint1.sql
  status: 'draft' | 'pending_review' | 'published' | 'archived';
  tier: 'free' | 'premium' | 'featured';
  email_verified_at: string | null;
  phone_verified_at: string | null;
  created_at: string;
  updated_at: string;
  session_type: 'in_person' | 'online' | 'both';
  is_featured: boolean;
  social_links: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    x?: string;
    substack?: string;
  };
  testimonials: Array<{
    author: string;
    text: string;
    date: string;
  }>;
  working_hours: {
    mon?: { open: string; close: string } | null;
    tue?: { open: string; close: string } | null;
    wed?: { open: string; close: string } | null;
    thu?: { open: string; close: string } | null;
    fri?: { open: string; close: string } | null;
    sat?: { open: string; close: string } | null;
    sun?: { open: string; close: string } | null;
  };
}

export interface RetreatRow {
  id: string;
  owner_id: string | null;
  title: string;
  venue_name: string | null;
  island: string;
  region: string | null;
  city: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  start_date: string; // ISO date "YYYY-MM-DD"
  end_date: string;   // ISO date "YYYY-MM-DD"
  starting_price: number | null;
  description: string | null;
  cover_image_url: string | null;
  registration_url: string | null;
  status: 'draft' | 'published' | 'archived';
  tier: 'free' | 'premium' | 'featured';
  created_at: string;
  updated_at: string;
}

export interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;           // Rich HTML from Tiptap
  cover_image_url: string | null;
  island: string | null;
  tags: string[];
  featured: boolean;
  author: string | null;         // Sprint 3 — added by migration 20260304000002
  published_at: string | null;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

// ─── Insert types (for dashboard CRUD — Sprint 3) ────────────────────────────

export type PractitionerInsert = Omit<PractitionerRow, 'id' | 'created_at' | 'updated_at'>;
export type CenterInsert = Omit<CenterRow, 'id' | 'created_at' | 'updated_at'>;

// ─── CenterLocation ───────────────────────────────────────────────────────────

export type WorkingHours = {
  mon?: { open: string; close: string } | null;
  tue?: { open: string; close: string } | null;
  wed?: { open: string; close: string } | null;
  thu?: { open: string; close: string } | null;
  fri?: { open: string; close: string } | null;
  sat?: { open: string; close: string } | null;
  sun?: { open: string; close: string } | null;
};

export interface CenterLocationRow {
  id: string;
  center_id: string;
  name: string | null;        // e.g. "Kailua-Kona Branch", "Waikiki Studio"
  is_primary: boolean;
  island: string;
  city: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  email: string | null;
  working_hours: WorkingHours;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type CenterLocationInsert = Omit<CenterLocationRow, 'id' | 'created_at' | 'updated_at'>;

export type RetreatInsert = Omit<RetreatRow, 'id' | 'created_at' | 'updated_at'>;
export type ArticleInsert = Omit<ArticleRow, 'id' | 'created_at' | 'updated_at'>;

// ─── User profiles (billing tier + subscription + account type) ─────────────

export interface UserProfileRow {
  id: string;
  tier: 'free' | 'premium' | 'featured';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;    // 'active' | 'past_due' | 'canceled' | 'trialing'
  subscription_period_end: string | null; // ISO timestamp when period ends
  stripe_price_id: string | null;
  account_type: 'practitioner' | 'center';
  created_at: string;
  updated_at: string;
}

export type UserProfileInsert = Omit<UserProfileRow, 'id' | 'created_at' | 'updated_at'>;

// ─── Supabase Database generic type (used by createClient<Database>) ─────────

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfileRow;
        Insert: UserProfileInsert;
        Update: Partial<UserProfileInsert>;
      };
      practitioners: {
        Row: PractitionerRow;
        Insert: PractitionerInsert;
        Update: Partial<PractitionerInsert>;
      };
      centers: {
        Row: CenterRow;
        Insert: CenterInsert;
        Update: Partial<CenterInsert>;
      };
      retreats: {
        Row: RetreatRow;
        Insert: RetreatInsert;
        Update: Partial<RetreatInsert>;
      };
      articles: {
        Row: ArticleRow;
        Insert: ArticleInsert;
        Update: Partial<ArticleInsert>;
      };
      offerings: {
        Row: OfferingRow;
        Insert: OfferingInsert;
        Update: Partial<OfferingInsert>;
      };
      classes: {
        Row: ClassRow;
        Insert: ClassInsert;
        Update: Partial<ClassInsert>;
      };
      practitioner_testimonials: {
        Row: PractitionerTestimonialRow;
        Insert: PractitionerTestimonialInsert;
        Update: Partial<PractitionerTestimonialInsert>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
