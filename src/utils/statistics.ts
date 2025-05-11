export function calculateMean(data: number[]): number {
  if (data.length === 0) return 0;
  return data.reduce((sum, val) => sum + val, 0) / data.length;
}

export function calculateStdDev(data: number[], mean: number): number {
  if (data.length === 0) return 0;
  const variance =
    data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  return Math.sqrt(variance);
}

export function calculateMin(data: number[]): number {
  if (data.length === 0) return 0;
  return Math.min(...data);
}

export function calculateMax(data: number[]): number {
  if (data.length === 0) return 0;
  return Math.max(...data);
}

export function calculatePercentile(
  sortedData: number[],
  percentile: number
): number {
  if (sortedData.length === 0) return 0;
  if (sortedData.length === 1) return sortedData[0];

  const index = (percentile / 100) * (sortedData.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sortedData[index];
  }

  const weight = index - lower;
  return sortedData[lower] * (1 - weight) + sortedData[upper] * weight;
}
