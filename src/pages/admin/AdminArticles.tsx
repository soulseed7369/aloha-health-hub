/**
 * AdminArticles — full CRUD UI for the articles / news section.
 * Mounted as a tab inside AdminPanel.
 */
import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2, Upload, X, Star } from 'lucide-react';
import { RichTextEditor } from '@/components/RichTextEditor';
import {
  useAllArticles,
  useInsertArticle,
  useUpdateArticle,
  useDeleteArticle,
  uploadArticleImage,
} from '@/hooks/useAdmin';
import type { ArticleRow } from '@/types/database';

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ── Article categories (must match Articles.tsx ARTICLE_CATEGORIES) ──────────

const ARTICLE_CATEGORIES = [
  'Guides',
  'Healing Traditions',
  'Community',
  'Island Life',
  'Practitioners',
] as const;

// ── Blank form ────────────────────────────────────────────────────────────────

const BLANK_FORM = {
  title: '',
  slug: '',
  author: "Hawai'i Wellness",
  excerpt: '',
  categories: [] as string[],  // multi-select from ARTICLE_CATEGORIES
  extraTags: '',               // comma-separated free-form tags
  island: 'big_island',
  featured: false,
  status: 'draft' as 'draft' | 'published',
  body: '',
  cover_image_url: null as string | null,
  published_at: '' as string,  // ISO string or '' for immediate
};

type FormState = typeof BLANK_FORM;

// ── Form component (shared between Add and Edit dialogs) ──────────────────────

function ArticleForm({
  initial,
  onSubmit,
  isPending,
  submitLabel,
}: {
  initial: FormState;
  onSubmit: (f: FormState) => void;
  isPending: boolean;
  submitLabel: string;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [coverPreview, setCoverPreview] = useState<string | null>(initial.cover_image_url);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (field: string, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }));

  // Auto-generate slug from title (only when slug is still "auto")
  const [slugEdited, setSlugEdited] = useState(!!initial.slug);
  const handleTitleChange = (v: string) => {
    set('title', v);
    if (!slugEdited) set('slug', slugify(v));
  };

  const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const url = await uploadArticleImage(file);
      set('cover_image_url', url);
    } catch {
      toast.error('Cover image upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      onSubmit={e => { e.preventDefault(); onSubmit(form); }}
      className="space-y-4"
    >
      {/* Cover image */}
      <div>
        <Label>Cover Image</Label>
        <div className="mt-2 flex items-start gap-3">
          {coverPreview ? (
            <div className="relative">
              <img
                src={coverPreview}
                alt="Cover"
                className="h-28 w-44 rounded-lg object-cover border"
              />
              <button
                type="button"
                onClick={() => { setCoverPreview(null); set('cover_image_url', null); }}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="h-28 w-44 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
              <Upload className="w-6 h-6 text-gray-400" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Uploading…</> : 'Choose Image'}
            </Button>
            <p className="text-xs text-gray-500">Recommended: 1200 × 630 px</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFile} />
        </div>
      </div>

      {/* Title */}
      <div>
        <Label htmlFor="art-title">Title *</Label>
        <Input
          id="art-title"
          value={form.title}
          onChange={e => handleTitleChange(e.target.value)}
          placeholder="Article title"
          required
        />
      </div>

      {/* Slug */}
      <div>
        <Label htmlFor="art-slug">Slug</Label>
        <Input
          id="art-slug"
          value={form.slug}
          onChange={e => { setSlugEdited(true); set('slug', e.target.value); }}
          placeholder="auto-generated-from-title"
        />
        <p className="text-xs text-gray-500 mt-1">URL: /articles/{form.slug || '…'}</p>
      </div>

      {/* Author */}
      <div>
        <Label htmlFor="art-author">Author</Label>
        <Input
          id="art-author"
          value={form.author}
          onChange={e => set('author', e.target.value)}
          placeholder="Author name"
        />
      </div>

      {/* Excerpt */}
      <div>
        <Label htmlFor="art-excerpt">Excerpt</Label>
        <Textarea
          id="art-excerpt"
          rows={2}
          value={form.excerpt}
          onChange={e => set('excerpt', e.target.value)}
          placeholder="One or two sentences summarizing the article…"
        />
      </div>

      {/* Categories (multi-select checkboxes) */}
      <div>
        <Label>Categories</Label>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {ARTICLE_CATEGORIES.map(cat => {
            const isSelected = form.categories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  const next = isSelected
                    ? form.categories.filter(c => c !== cat)
                    : [...form.categories, cat];
                  set('categories', next);
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                }`}
              >
                {isSelected && <span className="mr-1">✓</span>}
                {cat}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-1">Select one or more. These control filtering on the blog page.</p>
      </div>

      {/* Extra tags + Island */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="art-extra-tags">Additional Tags</Label>
          <Input
            id="art-extra-tags"
            value={form.extraTags}
            onChange={e => set('extraTags', e.target.value)}
            placeholder="e.g. Big Island, Retreats, Breathwork"
          />
          <p className="text-xs text-gray-500 mt-0.5">Optional. Comma-separated free-form tags.</p>
        </div>
        <div>
          <Label>Island</Label>
          <Select value={form.island} onValueChange={v => set('island', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Islands</SelectItem>
              <SelectItem value="big_island">Big Island</SelectItem>
              <SelectItem value="oahu">Oahu</SelectItem>
              <SelectItem value="maui">Maui</SelectItem>
              <SelectItem value="kauai">Kauai</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Featured + Status */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label htmlFor="art-featured" className="cursor-pointer">Featured article</Label>
          <Switch
            id="art-featured"
            checked={form.featured}
            onCheckedChange={v => set('featured', v)}
          />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => set('status', v as 'draft' | 'published')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Publish date (schedule) */}
      {form.status === 'published' && (
        <div>
          <Label htmlFor="art-published-at">Publish Date</Label>
          <Input
            id="art-published-at"
            type="datetime-local"
            value={form.published_at}
            onChange={e => set('published_at', e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            {form.published_at && new Date(form.published_at) > new Date()
              ? `Scheduled — will appear on ${new Date(form.published_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`
              : 'Leave empty for immediate. Set a future date to schedule.'}
          </p>
        </div>
      )}

      {/* Body */}
      <div>
        <Label>Body</Label>
        <div className="mt-1">
          <RichTextEditor
            content={form.body}
            onChange={v => set('body', v)}
            placeholder="Write your article here…"
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isPending || uploading}>
        {isPending
          ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
          : submitLabel}
      </Button>
    </form>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AdminArticles() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<ArticleRow | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'category'>('newest');

  const { data: rawArticles = [], isLoading } = useAllArticles({ search: searchInput, status: statusFilter });

  const articles = [...rawArticles].sort((a, b) => {
    if (sortOrder === 'oldest') {
      return (a.published_at ? new Date(a.published_at).getTime() : 0) - (b.published_at ? new Date(b.published_at).getTime() : 0);
    }
    if (sortOrder === 'category') {
      return (a.tags?.[0] ?? '').localeCompare(b.tags?.[0] ?? '');
    }
    // newest (default)
    return (b.published_at ? new Date(b.published_at).getTime() : 0) - (a.published_at ? new Date(a.published_at).getTime() : 0);
  });
  const insertArticle = useInsertArticle();
  const updateArticle = useUpdateArticle();
  const deleteArticle = useDeleteArticle();

  const handleAdd = async (form: FormState) => {
    const extra = form.extraTags.split(',').map(t => t.trim()).filter(Boolean);
    const tags = [...form.categories, ...extra];
    try {
      const publishedAt = form.status === 'published'
        ? (form.published_at ? new Date(form.published_at).toISOString() : new Date().toISOString())
        : null;
      await insertArticle.mutateAsync({
        slug: form.slug || slugify(form.title),
        title: form.title,
        excerpt: form.excerpt || null,
        body: form.body || null,
        cover_image_url: form.cover_image_url,
        island: form.island === 'all' ? null : form.island,
        tags,
        featured: form.featured,
        author: form.author || null,
        published_at: publishedAt,
        status: form.status,
      });
      toast.success('Article created');
      setIsAddOpen(false);
    } catch (e: unknown) {
      toast.error(`Failed to create: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleEdit = async (form: FormState) => {
    if (!editingArticle) return;
    const extra = form.extraTags.split(',').map(t => t.trim()).filter(Boolean);
    const tags = [...form.categories, ...extra];
    try {
      await updateArticle.mutateAsync({
        id: editingArticle.id,
        payload: {
          slug: form.slug || slugify(form.title),
          title: form.title,
          excerpt: form.excerpt || null,
          body: form.body || null,
          cover_image_url: form.cover_image_url,
          island: form.island === 'all' ? null : form.island,
          tags,
          featured: form.featured,
          author: form.author || null,
          published_at:
            form.status === 'published'
              ? (form.published_at ? new Date(form.published_at).toISOString() : editingArticle.published_at || new Date().toISOString())
              : null,
          status: form.status,
        },
      });
      toast.success('Article saved');
      setEditingArticle(null);
    } catch (e: unknown) {
      toast.error(`Failed to save: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await deleteArticle.mutateAsync(id);
      toast.success('Article deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleTogglePublish = async (article: ArticleRow) => {
    const newStatus = article.status === 'published' ? 'draft' : 'published';
    try {
      await updateArticle.mutateAsync({
        id: article.id,
        payload: {
          status: newStatus,
          published_at: newStatus === 'published' ? new Date().toISOString() : null,
        },
      });
      toast.success(newStatus === 'published' ? 'Published' : 'Moved to draft');
    } catch {
      toast.error('Update failed');
    }
  };

  // Map ArticleRow → ArticleForm initial state
  // Convert ISO timestamp to datetime-local format (YYYY-MM-DDTHH:MM) in local timezone
  const isoToLocal = (iso: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const rowToForm = (row: ArticleRow): FormState => {
    const allTags = row.tags || [];
    const knownCategories = ARTICLE_CATEGORIES as readonly string[];
    const categories = allTags.filter(t => knownCategories.includes(t));
    const extraTags = allTags.filter(t => !knownCategories.includes(t)).join(', ');
    return {
      title: row.title,
      slug: row.slug,
      author: row.author || "Hawai'i Wellness",
      excerpt: row.excerpt || '',
      categories,
      extraTags,
      island: row.island || 'big_island',
      featured: row.featured,
      status: row.status === 'published' ? 'published' : 'draft',
      body: row.body || '',
      cover_image_url: row.cover_image_url,
      published_at: isoToLocal(row.published_at),
    };
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Articles &amp; News</h2>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Article</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Article</DialogTitle></DialogHeader>
            <ArticleForm
              initial={BLANK_FORM}
              onSubmit={handleAdd}
              isPending={insertArticle.isPending}
              submitLabel="Create Article"
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          placeholder="Search by title…"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="flex-1 max-w-xs"
        />
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortOrder} onValueChange={v => setSortOrder(v as typeof sortOrder)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="category">By category</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Article list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : articles.length === 0 ? (
        <p className="text-center text-gray-500 py-12">No articles found. Create your first one!</p>
      ) : (
        <div className="space-y-3">
          {articles.map(article => (
            <Card key={article.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {article.cover_image_url && (
                    <img
                      src={article.cover_image_url}
                      alt=""
                      className="w-20 h-14 object-cover rounded-md flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{article.title}</h3>
                      {article.featured && (
                        <Badge variant="default" className="text-xs bg-amber-500">
                          <Star className="h-3 w-3 mr-1" />Featured
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {article.author || "Hawai'i Wellness"} · {article.published_at ? formatDate(article.published_at) : 'Unpublished'}
                    </p>
                    {article.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {article.tags
                          .filter(t => (ARTICLE_CATEGORIES as readonly string[]).includes(t))
                          .map(t => (
                            <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">{t}</Badge>
                          ))}
                      </div>
                    )}
                    {article.excerpt && (
                      <p className="text-sm text-gray-600 line-clamp-1 mt-0.5">{article.excerpt}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Badge variant={article.status === 'published' ? 'default' : 'secondary'} className="text-xs">
                      {article.status === 'published' && article.published_at && new Date(article.published_at) > new Date()
                        ? 'scheduled'
                        : article.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingArticle(article)}
                    >
                      <Pencil className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title={article.status === 'published' ? 'Move to Draft' : 'Publish'}
                      onClick={() => handleTogglePublish(article)}
                    >
                      {article.status === 'published'
                        ? <EyeOff className="h-4 w-4" />
                        : <Eye className="h-4 w-4 text-green-600" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(article.id, article.title)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editingArticle} onOpenChange={open => !open && setEditingArticle(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Article</DialogTitle></DialogHeader>
          {editingArticle && (
            <ArticleForm
              initial={rowToForm(editingArticle)}
              onSubmit={handleEdit}
              isPending={updateArticle.isPending}
              submitLabel="Save Changes"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
