import { IslandHome } from "./IslandHome";

const config = {
  island: 'kauai',
  displayName: "Kauai",
  heroImageUrl: "/kauai%20hero.jpg",
  heroTitle: "Kauai Wellness Directory",
  heroSubtitle: "Discover holistic practitioners, healing centers & retreats on the Garden Isle",
  pageTitle: "Kauai Wellness Directory – Garden Isle Holistic Health",
  pageDescription: "Find holistic health practitioners, wellness centers, and retreats on Kauai, Hawaii.",
};

export default function KauaiHome() {
  return <IslandHome config={config} />;
}
