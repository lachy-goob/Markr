/**
 * Calculates the arithmetic mean (average) of an array of numbers.
 * @param data - An array of numbers.
 * @returns The mean of the numbers, or 0 if the array is empty.
 */
export function calculateMean(data: number[]): number {
  if (data.length === 0) return 0;
  return data.reduce((sum, val) => sum + val, 0) / data.length;
}

/**
 * Calculates the standard deviation of an array of numbers.
 * @param data - An array of numbers.
 * @param mean - The pre-calculated mean of the data.
 * @returns The standard deviation, or 0 if the array is empty.
 */
export function calculateStdDev(data: number[], mean: number): number {
  if (data.length === 0) return 0;
  // Calculate variance: the average of the squared differences from the Mean.
  const variance =
    data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  return Math.sqrt(variance);
}

/**
 * Finds the minimum value in an array of numbers.
 * @param data - An array of numbers.
 * @returns The minimum value, or 0 if the array is empty.
 * (Note: Math.min() on an empty array returns Infinity, this function returns 0 for consistency).
 */
export function calculateMin(data: number[]): number {
  if (data.length === 0) return 0;
  return Math.min(...data);
}

/**
 * Finds the maximum value in an array of numbers.
 * @param data - An array of numbers.
 * @returns The maximum value, or 0 if the array is empty.
 * (Note: Math.max() on an empty array returns -Infinity, this function returns 0 for consistency).
 */
export function calculateMax(data: number[]): number {
  if (data.length === 0) return 0;
  return Math.max(...data);
}

/**
 * Calculates a specific percentile of a sorted array of numbers using linear interpolation.
 * @param sortedData - A pre-sorted array of numbers (ascending).
 * @param percentile - The percentile to calculate (e.g., 50 for median).
 * @returns The calculated percentile value, or 0 if the array is empty.
 * Returns the single element if the array has only one.
 */
export function calculatePercentile(
  sortedData: number[],
  percentile: number
): number {
  if (sortedData.length === 0) return 0;
  // If there's only one data point, it represents all percentiles.
  if (sortedData.length === 1) return sortedData[0];

  // Calculate the index for the percentile.
  const index = (percentile / 100) * (sortedData.length - 1);
  const lower = Math.floor(index); // Integer part of the index.
  const upper = Math.ceil(index); // Integer part rounded up.

  // If the index is an integer, the percentile is the value at that index.
  if (lower === upper) {
    return sortedData[index];
  }

  // If the index is not an integer, interpolate between the lower and upper values.
  const weight = index - lower; // Fractional part of the index.
  return sortedData[lower] * (1 - weight) + sortedData[upper] * weight;
}
