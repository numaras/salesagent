/**
 * Delivery simulation (core/shared).
 * Adapters must not depend on Admin; delivery simulation for mock/test lives here or in adapter.
 * Mock adapter implements its own in-memory delivery; this module provides types/shared helpers
 * if multiple adapters need a common simulation strategy later.
 */

export interface DeliverySnapshot {
  impressions: number;
  spend: number;
  /** Optional per-package breakdown */
  packages?: { package_id: string; impressions: number; spend: number }[];
}

export interface DeliverySimulator {
  getDelivery(mediaBuyId: string, today: Date): DeliverySnapshot | undefined;
}
