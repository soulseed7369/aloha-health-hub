import { Link } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { JsonLd } from "@/components/JsonLd";
import { GUIDES, getPublishedGuides } from "@/lib/guides";

const PAGE_TITLE = "Hawaiʻi Wellness Guides";
const PAGE_DESC =
  "A field journal of holistic healing across the Hawaiian Islands — from traditional Hawaiian healing to modern somatic practice.";

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://hawaiiwellness.net" },
    { "@type": "ListItem", position: 2, name: "Guides", item: "https://hawaiiwellness.net/guides" },
  ],
};

// ── Editorial styles inlined — these are page-specific and don't fit
// cleanly into Tailwind utilities (drop cap, italic placeholder, hairline rules).
const editorialCss = `
  .hub-display {
    font-family: 'Playfair Display', Georgia, serif;
    font-weight: 500;
    font-size: clamp(42px, 6.5vw, 96px);
    line-height: 0.94;
    letter-spacing: -0.022em;
  }
  .hub-display em { font-style: italic; font-weight: 400; color: hsl(15, 65%, 42%); }
  .hub-tagline { font-family: 'Playfair Display', serif; font-style: italic; }

  .hub-headline {
    font-family: 'Playfair Display', serif;
    font-weight: 500;
    font-size: clamp(22px, 2.8vw, 32px);
    line-height: 1.35;
    letter-spacing: -0.006em;
  }
  .hub-headline em { font-style: italic; color: hsl(15, 65%, 42%); font-weight: 500; }

  .hub-feature-title {
    font-family: 'Playfair Display', serif;
    font-weight: 500;
    font-size: clamp(40px, 4.6vw, 64px);
    line-height: 1.02;
    letter-spacing: -0.018em;
  }

  .hub-deck {
    font-family: 'Playfair Display', serif;
    font-size: 21px;
    line-height: 1.5;
    font-style: italic;
    font-weight: 400;
  }

  .hub-body::first-letter {
    font-family: 'Playfair Display', serif;
    font-size: 64px;
    float: left;
    line-height: 0.85;
    padding: 8px 10px 0 0;
    color: hsl(15, 65%, 42%);
    font-weight: 500;
  }

  .hub-stat-num {
    font-family: 'Playfair Display', serif;
    font-size: 32px;
    font-weight: 500;
  }

  .hub-vol-label {
    font-family: 'Playfair Display', serif;
    font-style: italic;
    font-weight: 500;
  }

  .hub-upcoming-no {
    font-family: 'Playfair Display', serif;
    font-style: italic;
    font-weight: 500;
    font-size: 38px;
  }

  .hub-upcoming-title {
    font-family: 'Playfair Display', serif;
    font-weight: 500;
    font-size: 28px;
    line-height: 1.15;
  }

  .hub-subscribe-input {
    font-family: 'Playfair Display', serif;
    font-style: italic;
    font-size: 19px;
  }
  .hub-subscribe-input::placeholder {
    color: hsl(35, 12%, 55%);
    font-style: italic;
  }

  .hub-closing-h {
    font-family: 'Playfair Display', serif;
    font-weight: 500;
    font-size: clamp(36px, 5vw, 56px);
    line-height: 1.1;
    letter-spacing: -0.015em;
  }
  .hub-closing-h em { font-style: italic; color: hsl(15, 65%, 42%); }

  .hub-subscribe-h, .hub-upcoming-h {
    font-family: 'Playfair Display', serif;
    font-weight: 500;
    font-size: clamp(32px, 4vw, 48px);
    line-height: 1.1;
    letter-spacing: -0.012em;
  }
  .hub-subscribe-h em, .hub-upcoming-h em { font-style: italic; color: hsl(15, 65%, 42%); }
`;

export default function GuidesHub() {
  usePageMeta(PAGE_TITLE, PAGE_DESC, "https://hawaiiwellness.net/og-wellness-modalities.jpg");

  const published = getPublishedGuides();
  const featured = published[0]; // Currently we feature the first published guide
  const upcoming = GUIDES.filter((g) => !g.published);

  return (
    <>
      <JsonLd id="guides-breadcrumb" data={breadcrumbSchema} />
      <style dangerouslySetInnerHTML={{ __html: editorialCss }} />

      {/* ── Title block ────────────────────────────────────────────────────── */}
      <header className="border-b border-border bg-background px-6 py-14 text-center sm:py-20">
        <h1 className="hub-display text-foreground">
          Hawaiʻi Wellness
          <br />
          <em>Guides</em>
        </h1>
        <p className="hub-tagline mt-7 text-[15px] text-muted-foreground">
          Your companion to holistic healing across the islands.
        </p>
      </header>

      {/* ── Hero photograph ─────────────────────────────────────────────────── */}
      <div
        className="relative w-full"
        style={{
          height: "min(78vh, 820px)",
          minHeight: 480,
          backgroundImage: "url('/complete-health-modalities-guide.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-start justify-between gap-3 p-6 sm:flex-row sm:items-end sm:p-10"
          style={{ background: "linear-gradient(to top, rgba(20,16,10,0.75), transparent 80%)" }}
        >
          <div className="hub-tagline max-w-xl text-base leading-snug text-white/90 sm:text-lg">
            "There is healing in the mountains, the rivers, the ocean — if you know how to listen."
          </div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-white/85">
            Pololū Valley · Big Island
          </div>
        </div>
      </div>

      {/* ── Dept intro ──────────────────────────────────────────────────────── */}
      <section className="px-6 pt-24 pb-12 text-center">
        <div className="mx-auto max-w-[760px]">
          <h2 className="hub-headline text-foreground">
            From traditional Hawaiian healing to modern somatic practice, our guides are a living reference to what it means to care for the body, mind, and spirit in Hawaiʻi.
          </h2>
        </div>
      </section>

      {/* ── Featured volume ─────────────────────────────────────────────────── */}
      {featured && (
        <section className="px-6 pt-20 pb-28">
          <div className="mx-auto max-w-[1240px]">
            <div className="border-t-2 border-foreground pt-9 pb-16">
              {/* Meta bar */}
              <div className="mb-14 flex items-baseline justify-between border-b border-border pb-8 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                <div>The Featured Guide</div>
                <div className="hub-vol-label text-[22px] normal-case tracking-normal text-foreground">
                  Wellness Modalities
                </div>
                <div>Hawaiʻi</div>
              </div>

              {/* Image + content */}
              <div className="grid items-stretch gap-12 md:grid-cols-[1fr_1.1fr] md:gap-16">
                <img
                  src="/complete-health-modalities-guide2-titled.jpg"
                  alt={featured.coverAlt}
                  className="block h-full w-full object-cover object-center shadow-[0_30px_80px_-30px_rgba(20,16,10,0.3)]"
                />
                <div className="md:pr-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
                    The Complete Guide
                  </div>
                  <h3 className="hub-feature-title mt-5 text-foreground">
                    Wellness Modalities in Hawaiʻi
                  </h3>
                  <p className="hub-deck mt-6 text-muted-foreground">
                    Forty-four practices, nine traditions, and the Hawaiian wisdom that shapes them all.
                  </p>
                  <p className="hub-body mt-9 text-[17px] leading-[1.7] text-muted-foreground">
                    {featured.teaser} From lomilomi and lāʻau lapaʻau to acupuncture, somatic experiencing, and breathwork — this is the most comprehensive guide to holistic wellness in Hawaiʻi. Each modality is explained in plain language: what it is, what it helps with, what to expect from your first session, and how to find a trusted practitioner across all four major islands.
                  </p>

                  {/* Stats */}
                  <div className="my-9 flex gap-10 border-y border-border py-6">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      <span className="hub-stat-num mb-1 block text-foreground">44</span>
                      Modalities
                    </div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      <span className="hub-stat-num mb-1 block text-foreground">9</span>
                      Categories
                    </div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      <span className="hub-stat-num mb-1 block text-foreground">4</span>
                      Islands
                    </div>
                  </div>

                  <Link
                    to={`/guides/${featured.slug}`}
                    className="inline-flex items-center gap-3.5 bg-foreground px-8 py-[18px] text-[12px] font-semibold uppercase tracking-[0.22em] text-background transition-colors hover:bg-primary"
                  >
                    Read the Guide
                    <span className="text-base">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Also in the Library ─────────────────────────────────────────────── */}
      {upcoming.length > 0 && (
        <section className="border-y border-border bg-muted/40 px-6 py-24">
          <div className="mx-auto max-w-[1240px]">
            <div className="mb-16 text-center">
              <div className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                More to Come
              </div>
              <h2 className="hub-upcoming-h mt-4 text-foreground">
                Also in the <em>Library</em>
              </h2>
            </div>
            <div className="mx-auto max-w-[880px]">
              {upcoming.map((g, i) => (
                <div
                  key={g.slug}
                  className={`grid grid-cols-[60px_1fr] items-center gap-6 border-t border-[hsl(35,18%,72%)] py-9 sm:grid-cols-[100px_1fr_160px] sm:gap-10 ${
                    i === upcoming.length - 1 ? "border-b" : ""
                  }`}
                >
                  <div className="hub-upcoming-no text-muted-foreground">—</div>
                  <div>
                    <h3 className="hub-upcoming-title text-foreground">{g.title}</h3>
                    <p className="mt-2.5 text-[16px] leading-[1.5] text-muted-foreground">
                      {g.teaser}
                    </p>
                  </div>
                  <div className="col-start-2 text-left text-[11px] uppercase tracking-[0.22em] text-muted-foreground sm:col-start-3 sm:text-right">
                    In Progress
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Subscribe ───────────────────────────────────────────────────────── */}
      <section className="border-b border-border px-6 py-28 text-center">
        <div className="mx-auto max-w-[760px]">
          <div className="mx-auto mb-7 h-px w-[60px] bg-[hsl(35,18%,72%)]" />
          <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-primary">
            Stay in the Loop
          </div>
          <h2 className="hub-subscribe-h mt-5 text-foreground">
            Be the first to read <em>each new guide</em>.
          </h2>
          <p className="mx-auto mt-6 max-w-[540px] text-[17px] leading-[1.6] text-muted-foreground">
            Occasional dispatches on holistic wellness in Hawaiʻi — new guides, featured practitioners, and stories from across the islands. No spam, ever.
          </p>
          <form
            className="mx-auto mt-10 flex max-w-[520px] border-b border-foreground"
            onSubmit={(e) => {
              e.preventDefault();
              // TODO: wire to newsletter provider
            }}
          >
            <input
              type="email"
              required
              placeholder="your@email.com"
              aria-label="Email address"
              className="hub-subscribe-input flex-1 border-0 bg-transparent px-1 py-[18px] text-foreground outline-none"
            />
            <button
              type="submit"
              className="border-0 bg-transparent px-2 py-[18px] text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary"
            >
              Subscribe →
            </button>
          </form>
          <div className="mt-5 text-[12px] text-muted-foreground">Unsubscribe anytime.</div>
        </div>
      </section>

      {/* ── Closing CTA ─────────────────────────────────────────────────────── */}
      <section className="px-6 py-32 text-center">
        <div className="mx-auto max-w-[760px]">
          <div className="mx-auto mb-8 h-px w-[60px] bg-[hsl(35,18%,72%)]" />
          <h2 className="hub-closing-h mx-auto max-w-[720px] text-foreground">
            Or skip the reading and <em>find your practitioner</em>.
          </h2>
          <p className="mx-auto mt-6 max-w-[560px] text-[18px] text-muted-foreground">
            Browse vetted holistic wellness practitioners, centers, and retreats across the Hawaiian Islands.
          </p>
          <Link
            to="/directory"
            className="mt-9 inline-flex items-center gap-3.5 border border-foreground bg-transparent px-9 py-[18px] text-[12px] font-semibold uppercase tracking-[0.22em] text-foreground transition-colors hover:bg-foreground hover:text-background"
          >
            Open the Directory
            <span className="text-base">→</span>
          </Link>
        </div>
      </section>
    </>
  );
}
