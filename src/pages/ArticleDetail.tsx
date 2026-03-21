import { useParams, Link } from 'react-router-dom';
// useState removed — no longer needed after ShareButtons extraction
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { OptimizedImage } from '@/components/OptimizedImage';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ArrowLeft } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useArticleBySlug } from '@/hooks/useArticles';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useRelatedPractitioners } from '@/hooks/useRelatedPractitioners';
import { ProviderCard } from '@/components/ProviderCard';
import { ShareButtons } from '@/components/ShareButtons';
import { JsonLd } from '@/components/JsonLd';
import { SITE_URL, SITE_NAME } from '@/lib/siteConfig';

// Inline ShareButtons removed — using shared ShareButtons component

export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: article, isLoading, isError } = useArticleBySlug(slug ?? '');
  const { data: relatedPractitioners = [] } = useRelatedPractitioners(
    article?.category ? [article.category] : [],
    undefined,
  );

  // ── Per-page meta (title, description, canonical) ─────────────────────
  usePageMeta(
    article ? article.title : 'Wellness Article',
    article ? (article.excerpt ?? `Read ${article.title} on ${SITE_NAME}.`) : undefined,
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Skeleton className="mb-4 h-6 w-24" />
        <Skeleton className="mb-6 h-10 w-3/4" />
        <Skeleton className="mb-4 h-64 w-full rounded-xl" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
    );
  }

  if (isError || !article) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="mb-3 text-2xl font-bold">Article not found</h1>
        <p className="mb-6 text-muted-foreground">
          This article may have been removed or the link is incorrect.
        </p>
        <Button asChild variant="outline">
          <Link to="/articles">← Back to Articles</Link>
        </Button>
      </div>
    );
  }

  const articleUrl = `${SITE_URL}/articles/${slug}`;

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt ?? undefined,
    image: article.image ?? undefined,
    author: { '@type': 'Person', name: article.author },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    datePublished: article.date ?? undefined,
    url: articleUrl,
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Articles', item: `${SITE_URL}/articles` },
      { '@type': 'ListItem', position: 3, name: article.title, item: articleUrl },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
        <JsonLd id="article-schema" data={articleSchema} />
        <JsonLd id="article-breadcrumb" data={breadcrumbSchema} />

        {/* Breadcrumb nav */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/articles">Articles</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="max-w-[200px] truncate">{article.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Category badge */}
        <Badge variant="secondary" className="mb-4">
          {article.category}
        </Badge>

        {/* Title */}
        <h1 className="mb-4 font-display text-3xl font-bold leading-tight md:text-4xl">
          {article.title}
        </h1>

        {/* Meta */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>By {article.author}</span>
            {article.date && (
              <>
                <span aria-hidden="true">·</span>
                <time>{article.date}</time>
              </>
            )}
          </div>
          <ShareButtons title={article.title} />
        </div>

        {/* Cover image */}
        {article.image && (
          <div className="mb-8 overflow-hidden rounded-xl">
            <OptimizedImage
              src={article.image}
              alt={`Cover image for ${article.title}`}
              width={1000}
              height={480}
              className="w-full object-cover max-h-[480px]"
              loading="eager"
              fetchPriority="high"
            />
          </div>
        )}

        {/* Body */}
        {article.body ? (
          <div
            className="prose prose-stone max-w-none"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.body) }}
          />
        ) : (
          /* Fallback: show excerpt if no body */
          <p className="text-lg leading-relaxed text-foreground/90">{article.excerpt}</p>
        )}

        {/* Footer nav */}
        <div className="mt-16 border-t pt-8 flex flex-wrap items-center justify-between gap-4">
          <Button asChild variant="outline">
            <Link to="/articles">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Articles
            </Link>
          </Button>
          <ShareButtons title={article.title} />
        </div>

        {/* Practitioners in this tradition */}
        {relatedPractitioners.length > 0 && (
          <section className="mt-12 border-t border-border pt-8">
            <h2 className="mb-4 text-xl font-semibold">Practitioners in this tradition</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {relatedPractitioners.map(p => (
                <ProviderCard key={p.id} provider={p} />
              ))}
            </div>
          </section>
        )}
    </div>
  );
}
