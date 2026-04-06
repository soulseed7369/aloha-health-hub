'use client';

import Link from 'next/link';
import { useState } from 'react';
import { OptimizedImage } from '@/components/OptimizedImage';
import { Badge } from '@/components/ui/badge';
import type { Article } from '@/data/mockData';

const CANONICAL_CATEGORIES = ['Guides', 'Healing Traditions', 'Community', 'Island Life', 'Practitioners'];

interface ArticlesListClientProps {
  articles: Article[];
}

export default function ArticlesListClient({ articles }: ArticlesListClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Group categories and filter
  const uniqueCategories = Array.from(new Set(articles.map((a) => a.category))).sort();
  const filteredArticles = selectedCategory
    ? articles.filter((a) => a.category === selectedCategory)
    : articles;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Breadcrumbs */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Wellness Articles</span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Wellness Articles
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Explore guides on healing traditions, wellness practices, island life, and practitioner insights.
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-12">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Filter by Category</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                selectedCategory === null
                  ? 'bg-teal-500 text-white'
                  : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
              }`}
            >
              All ({articles.length})
            </button>
            {uniqueCategories.map((category) => {
              const count = articles.filter((a) => a.category === category).length;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-teal-500 text-white'
                      : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {category} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {filteredArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
              <Link
                key={article.id}
                href={`/articles/${article.slug}`}
                className="group flex flex-col h-full focus:outline-none"
              >
                <div className="overflow-hidden rounded-lg bg-slate-100 mb-4 flex-shrink-0 aspect-video">
                  {article.image ? (
                    <OptimizedImage
                      src={article.image}
                      alt={article.title}
                      width={400}
                      height={300}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-400" />
                  )}
                </div>

                <div className="flex-grow flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">{article.category}</Badge>
                    {article.featured && <Badge variant="default">Featured</Badge>}
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-teal-600 transition-colors mb-2 line-clamp-2">
                    {article.title}
                  </h3>

                  <p className="text-slate-600 text-sm mb-4 line-clamp-2 flex-grow">
                    {article.excerpt}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-200">
                    <span>{article.author || 'Hawaiʻi Wellness'}</span>
                    <span>{article.date}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-600 text-lg">No articles found in this category.</p>
          </div>
        )}
      </section>
    </div>
  );
}
