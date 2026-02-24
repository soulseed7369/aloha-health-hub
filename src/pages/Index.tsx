import { SearchBar } from "@/components/SearchBar";
import { RetreatCard } from "@/components/RetreatCard";
import { PractitionerCard } from "@/components/PractitionerCard";
import { ArticleCard } from "@/components/ArticleCard";
import { mockRetreats, mockPractitioners, mockArticles } from "@/data/mockData";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

const Index = () => {
  return (
    <main>
      <SearchBar />

      {/* Featured Retreats */}
      <section className="container py-12">
        <h2 className="mb-6 font-display text-2xl font-bold md:text-3xl">
          Featured Retreats & Wellness Centers
        </h2>
        <div className="px-12">
          <Carousel opts={{ align: "start", loop: true }}>
            <CarouselContent>
              {mockRetreats.map((retreat) => (
                <CarouselItem key={retreat.id} className="basis-full sm:basis-1/2 lg:basis-1/3">
                  <RetreatCard retreat={retreat} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </section>

      {/* Top Practitioners */}
      <section className="bg-secondary/30 py-12">
        <div className="container">
          <h2 className="mb-6 font-display text-2xl font-bold md:text-3xl">
            Top-Rated Local Practitioners
          </h2>
          <div className="px-12">
            <Carousel opts={{ align: "start", loop: true }}>
              <CarouselContent>
                {mockPractitioners.map((practitioner) => (
                  <CarouselItem key={practitioner.id} className="basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                    <PractitionerCard practitioner={practitioner} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        </div>
      </section>

      {/* Latest Articles */}
      <section className="container py-12">
        <h2 className="mb-6 font-display text-2xl font-bold md:text-3xl">
          Latest from the Big Island Health Scene
        </h2>
        <div className="px-12">
          <Carousel opts={{ align: "start" }}>
            <CarouselContent>
              {mockArticles.slice(0, 3).map((article) => (
                <CarouselItem key={article.id} className="basis-full sm:basis-1/2 lg:basis-1/3">
                  <ArticleCard article={article} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </section>
    </main>
  );
};

export default Index;
