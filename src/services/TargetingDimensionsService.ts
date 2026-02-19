const DIMENSIONS_BY_ADAPTER: Record<string, string[]> = {
  mock: ["geo_countries", "geo_regions", "nielsen_dma", "us_zip"],
  kevel: ["geo_countries", "geo_regions"],
  gam: ["geo_countries", "geo_regions", "nielsen_dma", "us_zip"],
  triton: ["geo_countries"],
  broadstreet: ["geo_countries", "geo_regions", "nielsen_dma"],
};

export async function getTargetingDimensions(
  adapterType: string
): Promise<string[]> {
  return DIMENSIONS_BY_ADAPTER[adapterType.toLowerCase()] ?? ["geo_countries"];
}
