export interface DefaultProduct {
  product_id: string;
  name: string;
  description: string;
  format_ids: string[];
  delivery_type: string;
  pricing_options: { pricing_model: string; rate: number; currency: string }[];
}

const DEFAULT_PRODUCTS: DefaultProduct[] = [
  {
    product_id: "default_display_banner",
    name: "Display Banner",
    description: "Standard display banner advertising",
    format_ids: ["banner_300x250", "banner_728x90", "banner_160x600"],
    delivery_type: "standard",
    pricing_options: [{ pricing_model: "cpm", rate: 5.0, currency: "USD" }],
  },
  {
    product_id: "default_video_preroll",
    name: "Video Pre-roll",
    description: "Pre-roll video advertising",
    format_ids: ["video_preroll_15s", "video_preroll_30s"],
    delivery_type: "standard",
    pricing_options: [{ pricing_model: "cpm", rate: 15.0, currency: "USD" }],
  },
  {
    product_id: "default_native_content",
    name: "Native Content",
    description: "Native content advertising",
    format_ids: ["native_feed", "native_content_rec"],
    delivery_type: "standard",
    pricing_options: [{ pricing_model: "cpm", rate: 8.0, currency: "USD" }],
  },
];

export async function getDefaultProducts(): Promise<DefaultProduct[]> {
  return DEFAULT_PRODUCTS;
}
