import { ArticleCard } from "@/components/ArticleCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useArticles } from "@/hooks/useArticles";
import { usePageMeta } from "@/hooks/usePageMeta";

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
        <section className="mb-12">
          <ArticleCard article={featured} featured />
        </section>
      )}

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
