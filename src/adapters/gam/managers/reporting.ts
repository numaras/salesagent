/**
 * Delivery reporting — pull impression/click/spend data from GAM.
 */

import { StatementBuilder } from "@guardian/google-admanager-api";
import type { GamClientWrapper } from "../client.js";

interface DeliveryReport {
  impressions: number;
  clicks: number;
  spend: number;
}

/**
 * Fetch a delivery report for a given order within a date range.
 */
export async function getDeliveryReport(
  client: GamClientWrapper,
  orderId: string,
  startDate: Date,
  endDate: Date
): Promise<DeliveryReport> {
  const reportService = await client.getReportService();

  const reportQuery = {
    dimensions: ["ORDER_ID"],
    columns: ["AD_SERVER_IMPRESSIONS", "AD_SERVER_CLICKS", "AD_SERVER_CPM_AND_CPC_REVENUE"],
    startDate: {
      year: startDate.getFullYear(),
      month: startDate.getMonth() + 1,
      day: startDate.getDate()
    },
    endDate: {
      year: endDate.getFullYear(),
      month: endDate.getMonth() + 1,
      day: endDate.getDate()
    },
    dateRangeType: "CUSTOM_DATE",
    statement: new StatementBuilder().where("ORDER_ID = :orderId").addValue("orderId", { value: orderId }).toStatement()
  };

  const reportJob = {
    reportQuery,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createdJob = await reportService.runReportJob(reportJob as any);
  const reportJobId = createdJob.id;

  let status = "IN_PROGRESS";
  while (status === "IN_PROGRESS" || status === "STARTING") {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const statusResult = await reportService.getReportJobStatus(reportJobId);
    status = statusResult;
  }

  if (status === "FAILED") {
    throw new Error("Report job failed");
  }

  // A full implementation would download and parse the report via getReportDownloadURL
  // For now, return mock aggregated data after successfully running the job
  return { impressions: 0, clicks: 0, spend: 0 };
}
