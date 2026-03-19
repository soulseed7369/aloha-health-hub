import { IslandHome } from "./IslandHome";

const config = {
  island: 'kauai',
  displayName: "Kauai",
  heroImageUrl: "/kauai%20hero.jpg",
  heroTitle: "Find a Wellness Practitioner on Kauai",
  heroSubtitle: "Browse holistic health providers in Hanalei, Kapaa, Poipu & across the Garden Isle",
  pageTitle: "Kauaʻi Holistic Health Practitioners & Centers | Hawaiʻi Wellness",
  pageDescription: "Browse wellness practitioners and holistic healers on the Garden Isle. Serving Lihue, Kapaa, Hanalei, Princeville, Poipu & Koloa.",
};

export default function KauaiHome() {
  return <IslandHome config={config} />;
}
