import { IslandHome } from "./IslandHome";
import heroImage from "@/assets/hero-homepage.jpg";

const config = {
  island: 'big_island',
  displayName: "Big Island",
  heroImageUrl: heroImage,
  heroTitle: "Find Your Path to Wellness",
  heroSubtitle: "Discover holistic practitioners, retreats & wellness centers on the Big Island",
  pageTitle: "Big Island Wellness Directory – Hawaiʻi Island",
  pageDescription: "Find acupuncture, massage, yoga, reiki & naturopathic practitioners in Kona, Hilo & Waimea. Hawaiʻi Island's largest holistic wellness directory — 500+ practitioners, 34 specialties.",
};

export default function BigIsland() {
  return <IslandHome config={config} />;
}
