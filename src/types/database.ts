/**
 * TypeScript types mirroring the Supabase database schema.
 * Sprint 1 migration: supabase/migrations/20260225000000_initial_schema.sql
 *
 * These are the RAW database row types. Use src/lib/adapters.ts to
 * convert them to the component-friendly shapes expected by UI cards.
 */

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
export type RetreatInsert = Omit<RetreatRow, 'id' | 'created_at' | 'updated_at'>;
export type ArticleInsert = Omit<ArticleRow, 'id' | 'created_at' | 'updated_at'>;

// ─── Supabase Database generic type (used by createClient<Database>) ─────────

export interface Database {
  public: {
    Tables: {
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
