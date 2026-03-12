import { IslandHome } from "./IslandHome";

const config = {
  island: 'oahu',
  displayName: "Oahu",
  heroImageUrl: "/oahu%20hero.jpg",
  heroTitle: "Oahu Wellness Directory",
  heroSubtitle: "Find holistic health practitioners, spas & wellness centers on the Gathering Place",
  pageTitle: "Oahu Wellness Directory – Holistic Health on Oahu",
  pageDescription: "Find holistic health practitioners, wellness centers, and retreats on Oahu, Hawaii.",
};

export default function OahuHome() {
  return <IslandHome config={config} />;
}
