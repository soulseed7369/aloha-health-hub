import { createServerSupabaseClient } from '@/lib/supabase-server';
import { practitionerRowToProvider, centerRowToCenter } from '@/lib/adapters';
import type { Provider, Center } from '@/data/mockData';

/**
 * Fetch all practitioners and centers for a given island/modality combo.
 * Returns unpaginated lists sorted by tier (featured/premium first) then name.
 */
export async function getListingsByModality(
  island: string,
  modality: string
): Promise<{
  practitioners: Provider[];
  centers: Center[];
  totalPractitioners: number;
  totalCenters: number;
  citiesServed: string[];
}> {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return {
      practitioners: [],
      centers: [],
      totalPractitioners: 0,
      totalCenters: 0,
      citiesServed: [],
    };
  }

  try {
    // Query practitioners for this island/modality
    const { data: practitioners, error: pErr } = await supabase
      .from('practitioners')
      .select('*')
      .eq('island', island)
      .eq('status', 'published')
      .contains('modalities', [modality])
      .order('tier', { ascending: false })
      .order('name', { ascending: true });

    if (pErr) {
      console.error('Error fetching practitioners:', pErr);
      return {
        practitioners: [],
        centers: [],
        totalPractitioners: 0,
        totalCenters: 0,
        citiesServed: [],
      };
    }

    // Get practitioner count
    const { count: totalPractitioners } = await supabase
      .from('practitioners')
      .select('id', { count: 'exact', head: true })
      .eq('island', island)
      .eq('status', 'published')
      .contains('modalities', [modality]);

    // Query centers for this island/modality
    const { data: centers, error: cErr } = await supabase
      .from('centers')
      .select('*')
      .eq('island', island)
      .eq('status', 'published')
      .contains('modalities', [modality])
      .order('tier', { ascending: false })
      .order('name', { ascending: true });

    if (cErr) {
      console.error('Error fetching centers:', cErr);
      return {
        practitioners: [],
        centers: [],
        totalPractitioners: 0,
        totalCenters: 0,
        citiesServed: [],
      };
    }

    // Get center count
    const { count: totalCenters } = await supabase
      .from('centers')
      .select('id', { count: 'exact', head: true })
      .eq('island', island)
      .eq('status', 'published')
      .contains('modalities', [modality]);

    // Convert to component-friendly shapes
    const practitionersList = (practitioners ?? [])
      .map((row: any) => practitionerRowToProvider(row))
      .filter(Boolean);

    const centersList = (centers ?? [])
      .map((row: any) => centerRowToCenter(row))
      .filter(Boolean);

    // Collect unique cities
    const citiesSet = new Set<string>();
    practitionersList.forEach((p) => {
      if (p.location) citiesSet.add(p.location);
    });
    centersList.forEach((c) => {
      if (c.location) citiesSet.add(c.location);
    });

    return {
      practitioners: practitionersList,
      centers: centersList,
      totalPractitioners: totalPractitioners ?? 0,
      totalCenters: totalCenters ?? 0,
      citiesServed: Array.from(citiesSet).sort(),
    };
  } catch (error) {
    console.error('Error in getListingsByModality:', error);
    return {
      practitioners: [],
      centers: [],
      totalPractitioners: 0,
      totalCenters: 0,
      citiesServed: [],
    };
  }
}
