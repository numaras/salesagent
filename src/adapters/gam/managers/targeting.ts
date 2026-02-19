/**
 * GAM targeting translation — converts AdCP targeting format
 * to GAM-compatible targeting structures.
 */

interface TargetedLocation {
  id: string;
  type: string;
}

interface GeoTargeting {
  targetedLocations: TargetedLocation[];
}

interface GamTargeting {
  geoTargeting?: GeoTargeting;
  customTargeting?: unknown;
}

/**
 * Convert AdCP targeting map to GAM targeting structure.
 * Supported AdCP keys: geo_countries, geo_regions, nielsen_dma, us_zip.
 */
export function translateAdcpToGamTargeting(
  targeting: Record<string, unknown>
): GamTargeting {
  const countries = asStringArray(targeting.geo_countries);
  const regions = asStringArray(targeting.geo_regions);
  const dmas = asStringArray(targeting.nielsen_dma);
  const zips = asStringArray(targeting.us_zip);

  const result: GamTargeting = {};

  const geo = buildGeoTargeting(countries, regions, dmas, zips);
  if (geo.targetedLocations.length > 0) {
    result.geoTargeting = geo;
  }

  return result;
}

/**
 * Build GAM geoTargeting from individual arrays of location identifiers.
 */
export function buildGeoTargeting(
  countries?: string[],
  regions?: string[],
  dmas?: string[],
  zips?: string[]
): GeoTargeting {
  const locations: TargetedLocation[] = [];

  for (const code of countries ?? []) {
    locations.push({ id: code, type: "COUNTRY" });
  }
  for (const code of regions ?? []) {
    locations.push({ id: code, type: "REGION" });
  }
  for (const code of dmas ?? []) {
    locations.push({ id: code, type: "DMA_REGION" });
  }
  for (const code of zips ?? []) {
    locations.push({ id: code, type: "POSTAL_CODE" });
  }

  return { targetedLocations: locations };
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((v): v is string => typeof v === "string");
}
