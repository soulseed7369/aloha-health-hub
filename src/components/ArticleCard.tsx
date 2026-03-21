import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OptimizedImage } from "@/components/OptimizedImage";
import type { Article } from "@/data/mockData";
import { Link } from "react-router-dom";

interface ArticleCardProps {
  article: Article;
  featured?: boolean;
}

export function ArticleCard({ article, featured = false }: ArticleCardProps) {
  if (featured) {
    return (
      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-2">
          <div className="aspect-video overflow-hidden md:aspect-auto md:min-h-[300px]">
            <OptimizedImage
              src={article.image}
              alt={`Cover image for ${article.title}`}
              width={600}
              height={400}
              className="h-full w-full object-cover"
              loading="lazy"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          <CardContent className="flex flex-col justify-center p-6 md:p-10">
            <Badge variant="secondary" className="mb-3 w-fit">{article.category}</Badge>
            <h2 className="mb-3 font-display text-2xl font-bold leading-tight md:text-3xl">
              {article.title}
            </h2>
            <p className="mb-4 text-muted-foreground">{article.excerpt}</p>
            <div className="mb-4 text-sm text-muted-foreground">
              <span>By {article.author}</span>
              <span aria-hidden="true"> · </span>
              <time>{article.date}</time>
            </div>
            <Link
              to={`/articles/${article.slug}`}
              className="font-medium text-primary hover:underline"
              aria-label={`Read full article: ${article.title}`}
            >
              Read More →
            </Link>
          </CardContent>
        </div>
      </Card>
    );
  }

  return (
    <Link to={`/articles/${article.slug}`} className="block group">
      <Card className="overflow-hidden transition-shadow hover:shadow-lg">
        <div className="aspect-video overflow-hidden">
          <OptimizedImage
            src={article.image}
            alt={`Cover image for ${article.title}`}
            width={600}
            height={337}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
        <CardContent className="p-5">
          <Badge variant="secondary" className="mb-2">{article.category}</Badge>
          <h3 className="mb-2 font-display text-lg font-semibold leading-tight group-hover:text-primary transition-colors">
            {article.title}
          </h3>
          <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{article.excerpt}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{article.author}</span>
            <time>{article.date}</time>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
