import { useState } from "react";
import { ArticleCard } from "@/components/ArticleCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle } from "lucide-react";
import { useArticles } from "@/hooks/useArticles";
import { usePageMeta } from "@/hooks/usePageMeta";
import { supabase } from "@/lib/supabase";

// ── Canonical article categories ─────────────────────────────────────────────
export const ARTICLE_CATEGORIES = [
  "Guides",
  "Healing Traditions",
  "Community",
  "Island Life",
  "Practitioners",
] as const;

// ── Newsletter banner ─────────────────────────────────────────────────────────
function ArticlesNewsletterBanner() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || submitting || submitted) return;
    setSubmitting(true);
    try {
      if (supabase) {
        await supabase
          .from("newsletter_subscribers")
          .upsert({ email: email.trim().toLowerCase() });
      }
    } catch {
      // Silently succeed — never surface an error to the reader
    } finally {
      setSubmitting(false);
      setSubmitted(true);
      setEmail("");
    }
  };

  return (
    <section className="my-10 -mx-8 bg-sand px-8 py-12 text-center sm:-mx-8 sm:px-8 md:-mx-[2rem] md:px-[2rem]">
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Stay Connected
      </p>
      <h2 className="mb-2 font-display text-2xl font-bold">
        New articles, straight to your inbox
      </h2>
      <p className="mx-auto mb-6 max-w-sm text-sm text-muted-foreground">
        Healing traditions, practitioner stories, and wellness guides from across the islands.
      </p>
      {submitted ? (
        <div className="mx-auto inline-flex items-center gap-2 text-sm text-sage">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          Mahalo! You're on the list.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-xs gap-2">
          <Input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 border-border bg-background"
          />
          <Button type="submit" disabled={submitting} aria-label="Subscribe">
            <Mail className="mr-1.5 h-3.5 w-3.5" />
            Subscribe
          </Button>
        </form>
      )}
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
const Articles = () => {
  usePageMeta(
    "Explore Wellness on the Islands",
    "Practitioner stories, healing traditions, and wellness guides from across Hawaiʻi.",
  );
  const { data: articles = [], isLoading } = useArticles();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered =
    activeCategory
      ? articles.filter((a) =>
          a.categories?.includes(activeCategory) || a.category === activeCategory
        )
      : articles;

  const [featured, ...rest] = filtered;

  if (isLoading) {
    return (
      <main className="container py-10">
        <h1 className="mb-2 font-display text-3xl font-bold md:text-4xl">
          Explore Wellness on the Islands
        </h1>
        <p className="mb-8 text-muted-foreground">
          Practitioner stories, healing traditions, and wellness guides from across Hawaiʻi.
        </p>
        <Skeleton className="mb-12 h-64 w-full rounded-xl" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="container py-10">
      <h1 className="mb-2 font-display text-3xl font-bold md:text-4xl">
        Explore Wellness on the Islands
      </h1>
      <p className="mb-6 text-muted-foreground">
        Practitioner stories, healing traditions, and wellness guides from across Hawaiʻi.
      </p>

      {/* Category filter pills */}
      <div className="mb-8 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
            activeCategory === null
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-foreground hover:border-primary/50 hover:text-primary"
          }`}
        >
          All
        </button>
        {ARTICLE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === cat
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:border-primary/50 hover:text-primary"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {featured && (
        <section className="mb-4">
          <ArticleCard article={featured} featured />
        </section>
      )}

      <ArticlesNewsletterBanner />

      {rest.length > 0 && (
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </section>
      )}

      {filtered.length === 0 && (
        <p className="py-16 text-center text-muted-foreground">
          {activeCategory
            ? `No articles in "${activeCategory}" yet. Check back soon!`
            : "No articles published yet. Check back soon!"}
        </p>
      )}
    </main>
  );
};

export default Articles;
