import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Facebook, Twitter, Link2, Check } from 'lucide-react';
import { useArticleBySlug } from '@/hooks/useArticles';

function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const url = window.location.href;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const xUrl  = `https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Share:</span>
      <a
        href={fbUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Facebook"
        className="inline-flex items-center justify-center rounded-full bg-[#1877F2] p-2 text-white hover:bg-[#1877F2]/90 transition-colors"
      >
        <Facebook className="h-4 w-4" />
      </a>
      <a
        href={xUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X"
        className="inline-flex items-center justify-center rounded-full bg-black p-2 text-white hover:bg-black/80 transition-colors"
      >
        <Twitter className="h-4 w-4" />
      </a>
      <button
        onClick={handleCopy}
        aria-label="Copy link"
        className="inline-flex items-center justify-center rounded-full bg-muted p-2 text-muted-foreground hover:bg-muted/70 transition-colors"
      >
        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Link2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: article, isLoading, isError } = useArticleBySlug(slug ?? '');

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Back link */}
        <Link
          to="/articles"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Articles
        </Link>

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
            <img
              src={article.image}
              alt={`Cover image for ${article.title}`}
              className="w-full object-cover max-h-[480px]"
            />
          </div>
        )}

        {/* Body */}
        {article.body ? (
          <div
            className="prose prose-stone max-w-none"
            dangerouslySetInnerHTML={{ __html: article.body }}
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
    </div>
  );
}
