# Canonical Locations — Source of Truth

Last updated: 2026-03-15

## Island Enum Values

Only these 5 values are valid for the `island` column:

```
big_island
maui
oahu
kauai
molokai
```

Default: `big_island` (hardcoded fallback in most places — be suspicious of listings with this value, they may not have been explicitly set)

## Cities by Island

### Big Island (big_island)
```
Hilo, Kailua-Kona, Waimea, Captain Cook, Pahoa, Holualoa,
Hawi, Honokaa, Volcano, Waikoloa, Keaau, Ocean View,
Kapaau, Na Alehu, Kealakekua
```

Pipeline config also recognizes: Kamuela (= Waimea), Kurtistown, Papaikou, Mountain View, Pepeekeo, Hakalau, Laupahoehoe, Naalehu

### Maui
```
Kahului, Wailuku, Lahaina, Kihei, Wailea, Hana, Makawao,
Paia, Haiku, Kula, Pukalani, Napili, Kapalua, Kaanapali,
Lanai City
```

### Oahu
```
Honolulu, Waikiki, Kailua, Kaneohe, Pearl City, Aiea,
Mililani, Kapolei, Ewa Beach, Haleiwa, Waipahu, Hawaii Kai,
Manoa, Nuuanu
```

### Kauai
```
Lihue, Kapaa, Hanalei, Princeville, Poipu, Koloa,
Hanapepe, Eleele, Kalaheo, Lawai, Anahola, Kilauea
```

### Molokai
```
Kaunakakai, Hoolehua, Maunaloa, Kualapuu, Halawa
```

## Hawaii Bounding Box (lat/lng validation)

Valid coordinates for Hawaii:
- Latitude:  18.9 to 22.3
- Longitude: -160.3 to -154.7

Per-island approximate centers:
- Big Island: lat ~19.7, lng ~-155.5
- Maui: lat ~20.8, lng ~-156.3
- Oahu: lat ~21.4, lng ~-157.9
- Kauai: lat ~22.0, lng ~-159.4
- Molokai: lat ~21.1, lng ~-157.0

## Where location lists live

| File | Variable | Notes |
|---|---|---|
| `src/pages/dashboard/DashboardProfile.tsx` | `CITIES_BY_ISLAND` | Provider self-edit (primary source) |
| `src/pages/admin/AdminPanel.tsx` | `CITIES` | Admin edit (should match) |
| `src/pages/Directory.tsx` | `ISLAND_CITIES` | Filter sidebar (shorter, for UX) |
| `pipeline/src/config.py` | `ISLAND_TOWN_LISTS` | Pipeline (broader, includes alternates) |
