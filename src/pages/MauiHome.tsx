import { IslandHome } from "./IslandHome";

const config = {
  island: 'maui',
  displayName: "Maui",
  heroImageUrl: "/maui%20hero.jpg",
  heroTitle: "Find a Wellness Practitioner on Maui",
  heroSubtitle: "Browse holistic health providers in Lahaina, Kihei, Makawao & across the Valley Isle",
  pageTitle: "Maui Wellness Practitioners & Holistic Health | Hawaiʻi Wellness",
  pageDescription: "Find massage therapists, yoga instructors, acupuncturists & holistic healers in Lahaina, Kihei, Wailea, Makawao & across Maui. Browse Maui's growing wellness directory.",
};

export default function MauiHome() {
  return <IslandHome config={config} />;
}
