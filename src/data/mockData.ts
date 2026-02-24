export interface Retreat {
  id: string;
  name: string;
  image: string;
  location: string;
  type: string;
  rating: number;
  lat: number;
  lng: number;
}

export interface Practitioner {
  id: string;
  name: string;
  image: string;
  modality: string;
  location: string;
  rating: number;
  verified: boolean;
  acceptingClients: boolean;
  lat: number;
  lng: number;
}

export interface Article {
  id: string;
  title: string;
  image: string;
  excerpt: string;
  author: string;
  date: string;
  category: string;
}

export interface Provider {
  id: string;
  name: string;
  image: string;
  type: "practitioner" | "center" | "retreat";
  modality: string;
  location: string;
  rating: number;
  lat: number;
  lng: number;
}

export const mockRetreats: Retreat[] = [
  { id: "r1", name: "Mauna Lani Wellness Retreat", image: "https://images.unsplash.com/photo-1540555700478-4be289fbec6d?w=600&h=400&fit=crop", location: "Kohala Coast", type: "Yoga & Meditation Retreat", rating: 4.9, lat: 19.9382, lng: -155.8608 },
  { id: "r2", name: "Volcano Healing Sanctuary", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop", location: "Volcano Village", type: "Holistic Healing Center", rating: 4.8, lat: 19.4414, lng: -155.2343 },
  { id: "r3", name: "Kona Spirit Center", image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=400&fit=crop", location: "Kailua-Kona", type: "Wellness & Spa Center", rating: 4.7, lat: 19.6400, lng: -155.9969 },
  { id: "r4", name: "Hilo Bay Retreat House", image: "https://images.unsplash.com/photo-1600618528240-fb9fc964b853?w=600&h=400&fit=crop", location: "Hilo", type: "Meditation Retreat", rating: 4.6, lat: 19.7241, lng: -155.0868 },
  { id: "r5", name: "Waipio Jungle Spa", image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&h=400&fit=crop", location: "Waipio Valley", type: "Nature Spa & Retreat", rating: 4.9, lat: 20.1200, lng: -155.5900 },
];

export const mockPractitioners: Practitioner[] = [
  { id: "p1", name: "Dr. Leilani Kamaka", image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&h=300&fit=crop", modality: "Naturopathic Medicine", location: "Kailua-Kona", rating: 4.9, verified: true, acceptingClients: true, lat: 19.6400, lng: -155.9969 },
  { id: "p2", name: "Keoni Makoa", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300&h=300&fit=crop", modality: "Lomilomi Massage", location: "Hilo", rating: 4.8, verified: true, acceptingClients: true, lat: 19.7241, lng: -155.0868 },
  { id: "p3", name: "Maya Chen", image: "https://images.unsplash.com/photo-1594824476967-48c8b964d31f?w=300&h=300&fit=crop", modality: "Acupuncture & TCM", location: "Waimea", rating: 4.7, verified: true, acceptingClients: false, lat: 20.0234, lng: -155.6728 },
  { id: "p4", name: "James Holualoa", image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&h=300&fit=crop", modality: "Chiropractic", location: "Holualoa", rating: 4.6, verified: false, acceptingClients: true, lat: 19.6175, lng: -155.9506 },
  { id: "p5", name: "Ananya Patel", image: "https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?w=300&h=300&fit=crop", modality: "Ayurveda", location: "Captain Cook", rating: 4.9, verified: true, acceptingClients: true, lat: 19.4942, lng: -155.8767 },
  { id: "p6", name: "Kai Nakamura", image: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=300&h=300&fit=crop", modality: "Yoga Therapy", location: "Pahoa", rating: 4.5, verified: false, acceptingClients: true, lat: 19.4928, lng: -154.9467 },
];

export const mockArticles: Article[] = [
  { id: "a1", title: "The Rise of Lomilomi: Honoring Hawaiian Healing Traditions", image: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&h=500&fit=crop", excerpt: "How Big Island practitioners are preserving and evolving the sacred art of traditional Hawaiian massage.", author: "Sarah Kealoha", date: "Feb 18, 2026", category: "Traditions" },
  { id: "a2", title: "Volcanic Hot Springs: Nature's Ultimate Therapy", image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&h=500&fit=crop", excerpt: "Exploring the geothermal wellness opportunities unique to Hawai'i Island's volcanic landscape.", author: "Mike Tanaka", date: "Feb 12, 2026", category: "Wellness" },
  { id: "a3", title: "Plant Medicine on the Big Island: A Practitioner's Guide", image: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&h=500&fit=crop", excerpt: "Local herbalists share their knowledge of native Hawaiian medicinal plants and their modern applications.", author: "Dr. Leilani Kamaka", date: "Feb 5, 2026", category: "Herbalism" },
  { id: "a4", title: "Mindful Living in Paradise: A Wellness Community Grows", image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=500&fit=crop", excerpt: "How the Big Island's wellness community is creating spaces for mindfulness and sustainable living.", author: "Keoni Makoa", date: "Jan 28, 2026", category: "Community" },
  { id: "a5", title: "Ocean Therapy: Healing Through Hawai'i's Waters", image: "https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?w=800&h=500&fit=crop", excerpt: "From surf therapy to underwater meditation, discover how the Pacific Ocean heals body and mind.", author: "Kai Nakamura", date: "Jan 20, 2026", category: "Therapy" },
  { id: "a6", title: "Integrative Medicine Finds a Home in Hilo", image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=500&fit=crop", excerpt: "A new wave of practitioners is blending Western and Eastern medicine on the Big Island's windward side.", author: "Maya Chen", date: "Jan 14, 2026", category: "Medicine" },
];

export const mockProviders: Provider[] = [
  ...mockPractitioners.map(p => ({ id: p.id, name: p.name, image: p.image, type: "practitioner" as const, modality: p.modality, location: p.location, rating: p.rating, lat: p.lat, lng: p.lng })),
  ...mockRetreats.map(r => ({ id: r.id, name: r.name, image: r.image, type: "retreat" as const, modality: r.type, location: r.location, rating: r.rating, lat: r.lat, lng: r.lng })),
  { id: "c1", name: "Big Island Wellness Collective", image: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=600&h=400&fit=crop", type: "center", modality: "Multi-Modality Center", location: "Kailua-Kona", rating: 4.8, lat: 19.6400, lng: -155.9969 },
  { id: "c2", name: "Hamakua Health Hub", image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=400&fit=crop", type: "center", modality: "Integrative Health Center", location: "Honokaa", rating: 4.5, lat: 20.0793, lng: -155.4660 },
];

export const profileData = {
  id: "p1",
  name: "Dr. Leilani Kamaka",
  title: "Naturopathic Physician & Hawaiian Healing Practitioner",
  coverImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=400&fit=crop",
  profileImage: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&h=300&fit=crop",
  verified: true,
  acceptingClients: true,
  location: "Kailua-Kona, Hawai'i",
  address: "75-5660 Palani Rd, Suite 204, Kailua-Kona, HI 96740",
  phone: "(808) 555-0142",
  email: "dr.kamaka@example.com",
  website: "https://example.com",
  lat: 19.6400,
  lng: -155.9969,
  about: "Dr. Leilani Kamaka is a licensed naturopathic physician with over 15 years of experience blending modern integrative medicine with traditional Hawaiian healing practices. Born and raised on the Big Island, she is deeply connected to the 'āina and believes that true wellness comes from harmony between body, mind, and environment. Her practice focuses on chronic disease prevention, hormonal health, and stress management through a combination of clinical nutrition, botanical medicine, lomilomi-informed bodywork, and la'au lapa'au (Hawaiian herbal medicine).",
  services: [
    "Naturopathic Primary Care",
    "La'au Lapa'au (Hawaiian Herbal Medicine)",
    "Clinical Nutrition & Dietary Counseling",
    "Hormonal Health & Bioidentical Therapy",
    "Stress & Anxiety Management",
    "Lomilomi-Informed Bodywork Referrals",
    "Detoxification Programs",
  ],
  gallery: [
    "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop",
  ],
};
