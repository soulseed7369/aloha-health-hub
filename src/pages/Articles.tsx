import { ArticleCard } from "@/components/ArticleCard";
import { mockArticles } from "@/data/mockData";

const Articles = () => {
  const [featured, ...rest] = mockArticles;

  return (
    <main className="container py-10">
      <h1 className="mb-8 font-display text-3xl font-bold md:text-4xl">
        The Big Island Health Scene
      </h1>

      {/* Featured Article */}
      <section className="mb-12">
        <ArticleCard article={featured} featured />
      </section>

      {/* Article Grid */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </section>
    </main>
  );
};

export default Articles;
