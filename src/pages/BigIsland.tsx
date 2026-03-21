import { useMemo } from "react";
import { IslandHome } from "./IslandHome";
import heroImage from "@/assets/hero-homepage.jpg";

const HERO_VARIANTS = [
  { title: "Your Wellness Journey on the Big Island Starts Here", subtitle: "Connect with practitioners and wellness centers across the Big Island" },
  { title: "Discover Healing on the Big Island", subtitle: "Connect with practitioners and wellness centers across the Big Island" },
  { title: "Your Path to Wellness on the Big Island", subtitle: "From Kona to Hilo, find the right healer for your journey" },
];

const baseConfig = {
  island: 'big_island',
  displayName: "Big Island",
  heroImageUrl: heroImage,
  pageTitle: "Big Island Wellness Directory – Hawaiʻi Island",
  pageDescription: "Find acupuncture, massage, yoga, reiki & naturopathic practitioners in Kona, Hilo & Waimea. Hawaiʻi Island's largest holistic wellness directory — 500+ practitioners, 34 specialties.",
  faqItems: [
    {
      question: "What wellness practices are most popular on the Big Island?",
      answer: "The Big Island has a thriving wellness community with practitioners specializing in yoga, massage, lomilomi (traditional Hawaiian massage), acupuncture, and naturopathic medicine. Many island residents and visitors seek these modalities for stress relief, physical recovery, and spiritual growth. The island's natural healing energy and connection to Hawaiian culture make it an ideal destination for holistic wellness practices.",
    },
    {
      question: "What should I expect from a Lomilomi session?",
      answer: "Lomilomi is a traditional Hawaiian healing massage that incorporates spiritual and healing elements. A typical session involves rhythmic, flowing strokes using the practitioner's hands, forearms, and elbows to release tension and restore balance. Sessions usually last 60-90 minutes and leave clients feeling deeply relaxed. Many practitioners begin with a spiritual practice to honor the healing tradition.",
    },
    {
      question: "Are there differences between practitioners in Kona and Hilo?",
      answer: "Both areas have excellent practitioners, but they differ slightly. Kona (west side) draws more tourists and has wellness centers with amenities like spas and retreats. Hilo (east side) has a more local, traditional wellness community with practitioners deeply rooted in Hawaiian healing practices. Choose based on your location and preference for a tourist-friendly or local experience.",
    },
    {
      question: "How much do wellness sessions typically cost on the Big Island?",
      answer: "Prices vary by modality and practitioner experience. Massage and yoga sessions typically range from $60-150 per hour, while specialized services like acupuncture or functional medicine consultations may cost $100-250. Many practitioners offer package discounts for multiple sessions. Always confirm pricing before booking.",
    },
    {
      question: "How do I choose the right wellness practitioner for my needs?",
      answer: "Start by identifying your wellness goal (stress relief, physical healing, spiritual growth, etc.) and the modality that resonates with you. Check practitioner bios, testimonials, and qualifications on our directory. Many offer free phone consultations to discuss your needs. Trust your intuition — a good practitioner-client relationship is essential for healing.",
    },
  ],
};

export default function BigIsland() {
  const hero = useMemo(() => HERO_VARIANTS[Math.floor(Math.random() * HERO_VARIANTS.length)], []);
  const config = { ...baseConfig, heroTitle: hero.title, heroSubtitle: hero.subtitle };
  return <IslandHome config={config} />;
}
