import { IslandHome } from "./IslandHome";

const config = {
  island: 'oahu',
  displayName: "Oahu",
  heroImageUrl: "/oahu%20hero.jpg",
  heroTitle: "Find a Wellness Practitioner on Oahu",
  heroSubtitle: "Browse holistic health providers in Honolulu, Kailua, Haleiwa & across the Gathering Place",
  pageTitle: "Oʻahu Wellness Directory — Honolulu, Kailua & More | Hawaiʻi Wellness",
  pageDescription: "Discover holistic health practitioners and wellness centers across Oʻahu. Serving Honolulu, Waikiki, Kailua, Kaneohe & the North Shore.",
};

export default function OahuHome() {
  return <IslandHome config={config} />;
}
