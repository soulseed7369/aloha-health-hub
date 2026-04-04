import { useState } from "react";
import { ArticleCard } from "@/components/ArticleCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle } from "lucide-react";
import { useArticles } from "@/hooks/useArticles";
import { usePageMeta } from "@/hooks/usePageMeta";
import { supabase } from "@/lib/supabase";

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
        await supabase.from("newsletter_subscribers").upsert({ email: email.trim().toLowerCase() });
      }
    } catch {
      // Silently succeed — never show an error to the user
    } finally {
      setSubmitting(false);
      setSubmitted(true);
      setEmail("");
    }
  };

  return (
    <section className="my-12 rounded-xl border border-border bg-accent/40 px-6 py-8 text-center">
      <h2 className="mb-1 font-display text-xl font-semibold">New articles, straight to your inbox</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Healing traditions, practitioner stories, and wellness guides from across the islands.
      </p>
      {submitted ? (
        <div className="mx-auto flex w-fit items-center gap-2 rounded-md bg-green-50 px-4 py-2 text-sm text-green-700">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          Mahalo! You're on the list.
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-sm gap-2"
        >
          <Input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1"
          />
          <Button type="submit" disabled={submitting} size="icon" aria-label="Subscribe">
            <Mail className="h-4 w-4" />
          </Button>
        </form>
      )}
    </section>
  );
}

const Articles = () => {
  usePageMeta("Explore Wellness on the Islands", "Practitioner stories, healing traditions, and wellness guides from across Hawaiʻi.");
  const { data: articles = [], isLoading } = useArticles();
  const [featured, ...rest] = articles;

  if (isLoading) {
    return (
      <main className="container py-10">
        <h1 className="mb-2 font-display text-3xl font-bold md:text-4xl">Explore Wellness on the Islands</h1>
        <p className="mb-8 text-muted-foreground">Practitioner stories, healing traditions, and wellness guides from across Hawaiʻi.</p>
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
      <p className="mb-8 text-muted-foreground">Practitioner stories, healing traditions, and wellness guides from across Hawaiʻi.</p>

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

      {articles.length === 0 && (
        <p className="py-16 text-center text-muted-foreground">No articles published yet. Check back soon!</p>
      )}
    </main>
  );
};

export default Articles;
