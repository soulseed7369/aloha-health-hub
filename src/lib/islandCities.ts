// Shared island/city lookup data.
// Used by Directory (distance sorting, island detection) and SearchBar
// (local resolution of typed cities before falling back to Nominatim).
//
// NOTE: several Hawaiian town names exist on multiple islands (Waimea is on
// Big Island AND Kauai; Kailua is on Oahu while Kailua-Kona is on Big Island).
// Always resolve against the *current* island first when one is known.

export const CITY_COORDS_BY_ISLAND: Record<string, Record<string, { lat: number; lng: number }>> = {
  big_island: {
    'Kailua-Kona': { lat: 19.6400, lng: -155.9969 }, 'Hilo': { lat: 19.7297, lng: -155.0900 },
    'Waimea': { lat: 20.0133, lng: -155.6718 }, 'Pahoa': { lat: 19.4942, lng: -154.9447 },
    'Captain Cook': { lat: 19.4992, lng: -155.9194 }, 'Keaau': { lat: 19.6261, lng: -155.0497 },
    'Holualoa': { lat: 19.6228, lng: -155.9317 }, 'Volcano': { lat: 19.4256, lng: -155.2347 },
    'Waikoloa': { lat: 19.9306, lng: -155.7797 }, 'Hawi': { lat: 20.2428, lng: -155.8330 },
    'Honokaa': { lat: 20.0817, lng: -155.4719 }, 'Ocean View': { lat: 19.1000, lng: -155.7667 },
  },
  maui: {
    'Lahaina': { lat: 20.8783, lng: -156.6825 }, 'Kihei': { lat: 20.7645, lng: -156.4450 },
    'Wailea': { lat: 20.6881, lng: -156.4414 }, 'Kahului': { lat: 20.8893, lng: -156.4729 },
    'Wailuku': { lat: 20.8936, lng: -156.5000 }, 'Makawao': { lat: 20.8564, lng: -156.3100 },
    'Paia': { lat: 20.9108, lng: -156.3703 }, 'Haiku': { lat: 20.9197, lng: -156.3231 },
    'Kula': { lat: 20.7878, lng: -156.3358 }, 'Hana': { lat: 20.7578, lng: -155.9928 },
  },
  oahu: {
    'Honolulu': { lat: 21.3069, lng: -157.8583 }, 'Waikiki': { lat: 21.2793, lng: -157.8294 },
    'Kailua': { lat: 21.4022, lng: -157.7394 }, 'Kaneohe': { lat: 21.4022, lng: -157.8003 },
    'Pearl City': { lat: 21.3972, lng: -157.9756 }, 'Kapolei': { lat: 21.3347, lng: -158.0764 },
    'Haleiwa': { lat: 21.5950, lng: -158.1028 }, 'Mililani': { lat: 21.4511, lng: -158.0147 },
    'Hawaii Kai': { lat: 21.2919, lng: -157.7000 }, 'Manoa': { lat: 21.3094, lng: -157.8019 },
  },
  kauai: {
    'Lihue': { lat: 21.9781, lng: -159.3508 }, 'Kapaa': { lat: 22.0753, lng: -159.3192 },
    'Hanalei': { lat: 22.2039, lng: -159.5017 }, 'Princeville': { lat: 22.2153, lng: -159.4811 },
    'Poipu': { lat: 21.8742, lng: -159.4586 }, 'Koloa': { lat: 21.9056, lng: -159.4656 },
    'Hanapepe': { lat: 21.9092, lng: -159.5950 }, 'Waimea': { lat: 21.9544, lng: -159.6411 },
    'Kilauea': { lat: 22.2128, lng: -159.4028 }, 'Kalaheo': { lat: 21.9244, lng: -159.5281 },
  },
  molokai: {
    'Kaunakakai': { lat: 21.1975, lng: -157.0281 },
  },
};

export const ISLAND_CITIES: Record<string, string[]> = {
  big_island: ['Kailua-Kona', 'Hilo', 'Waimea', 'Pahoa', 'Captain Cook', 'Keaau', 'Holualoa', 'Volcano', 'Waikoloa', 'Hawi', 'Honokaa', 'Ocean View'],
  oahu: ['Honolulu', 'Waikiki', 'Kailua', 'Kaneohe', 'Pearl City', 'Kapolei', 'Haleiwa', 'Mililani', 'Hawaii Kai', 'Manoa'],
  maui: ['Lahaina', 'Kihei', 'Wailea', 'Kahului', 'Wailuku', 'Makawao', 'Paia', 'Haiku', 'Kula', 'Hana'],
  kauai: ['Lihue', 'Kapaa', 'Hanalei', 'Princeville', 'Poipu', 'Koloa', 'Hanapepe', 'Waimea', 'Kilauea'],
  molokai: ['Kaunakakai'],
};

export const ISLAND_DISPLAY_NAMES: Record<string, string> = {
  big_island: 'Big Island',
  maui: 'Maui',
  oahu: 'Oahu',
  kauai: 'Kauai',
  molokai: 'Molokai',
};

/**
 * Resolve a user-typed town/city string against one island's cities.
 * Prefix-matches (case-insensitive) so "kailua" on Oahu returns Kailua, Oahu
 * — not Kailua-Kona on Big Island.
 */
export function findCityOnIsland(
  text: string,
  island: string
): { city: string; lat: number; lng: number } | null {
  const cities = CITY_COORDS_BY_ISLAND[island];
  if (!cities) return null;
  const q = text.trim().toLowerCase();
  if (!q) return null;
  for (const [city, coords] of Object.entries(cities)) {
    const c = city.toLowerCase();
    if (c === q || c.startsWith(q) || q.startsWith(c)) {
      return { city, ...coords };
    }
  }
  return null;
}

/**
 * Resolve a user-typed town/city across all islands. Returns the first match,
 * or null. Prefer `findCityOnIsland` when an island is known — that avoids
 * ambiguous hits like Waimea (Big Island vs Kauai).
 */
export function findCityAnyIsland(
  text: string
): { city: string; island: string; lat: number; lng: number } | null {
  for (const island of Object.keys(CITY_COORDS_BY_ISLAND)) {
    const hit = findCityOnIsland(text, island);
    if (hit) return { ...hit, island };
  }
  return null;
}
