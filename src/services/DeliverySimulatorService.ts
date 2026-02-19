export interface DailyDelivery {
  date: string;
  impressions: number;
  spend: number;
}

export interface SimulationResult {
  impressions: number;
  spend: number;
  dailyData: DailyDelivery[];
}

export async function simulateDelivery(
  _mediaBuyId: string,
  days: number
): Promise<SimulationResult> {
  const dailyImpressions = 10_000;
  const cpm = 5.0;
  const dailySpend = (dailyImpressions / 1000) * cpm;
  const dailyData: DailyDelivery[] = [];
  const start = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    const variance = 0.8 + Math.random() * 0.4;
    dailyData.push({
      date: date.toISOString().slice(0, 10),
      impressions: Math.round(dailyImpressions * variance),
      spend: Math.round(dailySpend * variance * 100) / 100,
    });
  }

  const impressions = dailyData.reduce((s, d) => s + d.impressions, 0);
  const spend = Math.round(dailyData.reduce((s, d) => s + d.spend, 0) * 100) / 100;

  return { impressions, spend, dailyData };
}
