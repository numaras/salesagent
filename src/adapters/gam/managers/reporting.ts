/**
 * Delivery reporting — pull impression/click/spend data from GAM.
 */

import type { GamClientWrapper } from "../client.js";

interface DeliveryReport {
  impressions: number;
  clicks: number;
  spend: number;
}

/**
 * Fetch a delivery report for a given order within a date range.
 * TODO: Use ReportService.runReportJob + getReportDownloadURL.
 */
export async function getDeliveryReport(
  _client: GamClientWrapper,
  _orderId: string,
  _startDate: Date,
  _endDate: Date
): Promise<DeliveryReport> {
  return { impressions: 0, clicks: 0, spend: 0 };
}
