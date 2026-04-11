import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Heart, MapPin, Star, Users } from "lucide-react";

const About = () => {
  usePageMeta(
    "About Hawaiʻi Wellness",
    "Learn about Hawaiʻi Wellness — our mission to connect visitors and residents with the finest holistic health practitioners across the Hawaiian Islands.",
  );

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/30 py-20">
        <div className="container max-w-3xl text-center">
          <h1 className="mb-4 font-display text-4xl font-bold md:text-5xl">
            About Hawaiʻi Wellness
          </h1>
          <p className="text-lg text-muted-foreground md:text-xl">
            Connecting visitors and residents with Hawaiʻi's finest holistic health practitioners and wellness centers.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="container max-w-3xl py-16">
        <h2 className="mb-5 font-display text-2xl font-bold">Our Mission</h2>
        <p className="mb-4 leading-relaxed text-muted-foreground">
          Our goal with Hawai'i Wellness is simple: to build the most trusted and comprehensive holistic health directory in Hawai'i.
        </p>
        <p className="mb-4 leading-relaxed text-muted-foreground">
          These islands have long been a place where healing traditions meet. From lomilomi and lāʻau lapaʻau to acupuncture, functional medicine, yoga, somatic therapy, and many other practices, Hawai'i has a deep and diverse culture of healing. Yet finding the right practitioner has often depended on insider knowledge, word of mouth, or years of local connections.
        </p>
        <p className="mb-4 leading-relaxed text-muted-foreground">
          Hawai'i Wellness is here to change that.
        </p>
        <p className="mb-4 leading-relaxed text-muted-foreground">
          We are building a clear, current, and organized directory where people can explore the full spectrum of holistic health across the islands. It is a place where residents can find ongoing care, where visitors can discover meaningful wellness experiences, and where practitioners themselves can become more visible and connected.
        </p>
        <p className="leading-relaxed text-muted-foreground">
          We're live on the Big Island and Maui, and expanding across Oʻahu, Kauaʻi, and beyond — with the goal of becoming the central hub where anyone can discover the people and places dedicated to healing in Hawai'i.
        </p>
      </section>

      {/* Values */}
      <section className="border-y border-border bg-secondary/20 py-16">
        <div className="container">
          <h2 className="mb-10 font-display text-2xl font-bold text-center">Why Hawaiʻi Wellness</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: <MapPin className="h-7 w-7 text-primary" />,
                title: "All Islands",
                desc: "Coverage across every major Hawaiian island — Big Island, Maui, Oʻahu, and Kauaʻi.",
              },
              {
                icon: <Star className="h-7 w-7 text-amber-500" />,
                title: "Curated Quality",
                desc: "Every listing is reviewed for accuracy. Junk listings and duplicates are removed.",
              },
              {
                icon: <Heart className="h-7 w-7 text-rose-500" />,
                title: "Holistic Focus",
                desc: "We specialize in holistic, integrative, and traditional Hawaiian wellness — not conventional medicine directories.",
              },
              {
                icon: <Users className="h-7 w-7 text-teal-500" />,
                title: "Community Built",
                desc: "Practitioners can claim and manage their own listings, keeping the directory fresh and accurate.",
              },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-background shadow-sm">
                  {item.icon}
                </div>
                <h3 className="mb-2 font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For practitioners */}
      <section className="container max-w-3xl py-16">
        <h2 className="mb-5 font-display text-2xl font-bold">For Wellness Practitioners</h2>
        <p className="mb-4 leading-relaxed text-muted-foreground">
          Are you a holistic health practitioner based in Hawaiʻi? Your listing is likely already in our directory — we actively search for and add practitioners across all islands. You can claim your listing to take full control: update your bio, add photos, manage your modalities, and respond to client inquiries.
        </p>
        <p className="mb-8 leading-relaxed text-muted-foreground">
          Premium and Featured tiers give you additional visibility: homepage placement, booking links, testimonials, and social media integration. Upgrade anytime — no long-term contracts.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/list-your-practice">List Your Practice</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/auth">Provider Login</Link>
          </Button>
        </div>
      </section>

      {/* Contact */}
      <section className="bg-primary/5 border-t border-border py-14">
        <div className="container text-center max-w-xl">
          <h2 className="mb-3 font-display text-2xl font-bold">Get in Touch</h2>
          <p className="mb-6 text-muted-foreground">
            Questions, feedback, partnership inquiries, or press? We'd love to hear from you.
          </p>
          <a
            href="mailto:aloha@hawaiiwellness.net"
            className="text-primary font-medium hover:underline text-lg"
          >
            aloha@hawaiiwellness.net
          </a>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button asChild variant="outline">
              <Link to="/directory">Browse Directory</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/help">Help Center</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default About;
