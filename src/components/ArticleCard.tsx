import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
            <img
              src={article.image}
              alt={article.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
          <CardContent className="flex flex-col justify-center p-6 md:p-10">
            <Badge variant="secondary" className="mb-3 w-fit">{article.category}</Badge>
            <h2 className="mb-3 font-display text-2xl font-bold leading-tight md:text-3xl">
              {article.title}
            </h2>
            <p className="mb-4 text-muted-foreground">{article.excerpt}</p>
            <div className="mb-4 text-sm text-muted-foreground">
              By {article.author} · {article.date}
            </div>
            <Link
              to="#"
              className="font-medium text-primary hover:underline"
            >
              Read More →
            </Link>
          </CardContent>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <div className="aspect-video overflow-hidden">
        <img
          src={article.image}
          alt={article.title}
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          loading="lazy"
        />
      </div>
      <CardContent className="p-5">
        <Badge variant="secondary" className="mb-2">{article.category}</Badge>
        <h3 className="mb-2 font-display text-lg font-semibold leading-tight">
          {article.title}
        </h3>
        <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{article.excerpt}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{article.author}</span>
          <span>{article.date}</span>
        </div>
      </CardContent>
    </Card>
  );
}
