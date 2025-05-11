import { AppDataSource } from "../data-source";
import * as studentTestResultRepository from "../repository/studentTestResult.repository";
import {
  calculateMean,
  calculateStdDev,
  calculateMin,
  calculateMax,
  calculatePercentile,
} from "../utils/statistics";

/**
 * Interface defining the structure for data used to ingest a single test result.
 */
export interface IngestResultData {
  studentNumber: string;
  testId: string;
  scannedOn: Date;
  firstName: string;
  lastName: string;
  marksAvailable: number;
  marksObtained: number;
}

/**
 * Interface defining the structure for aggregated test results.
 * All results are expressed in percentages
 */
export interface AggregatedTestResults {
  mean: number;
  stddev: number;
  min: number;
  max: number;
  p25: number;
  p50: number;
  p75: number;
  count: number;
}

/**
 * Calculates aggregate statistics for all student test results associated with a given test ID.
 * Statistics are calculated based on percentage scores. If `availableMarks` varies across
 * results for the same `testId`, the maximum `availableMarks` found is used as the denominator
 * for all percentage calculations to ensure consistency.
 *
 * @param testId - The ID of the test for which to calculate aggregate results.
 * @returns A Promise that resolves to an `AggregatedTestResults` object,
 * or `null` if no results are found for the specified `testId`.
 */
export async function calculateAggregateResults(
  testId: string
): Promise<AggregatedTestResults | null> {
  const manager = AppDataSource.manager;

  // Fetch all results for the given testId, sorted by obtainedMarks (ASC).
  // Sorting is important for percentile calculation.
  const results = await studentTestResultRepository.findAllByTestIdSorted(
    manager,
    testId
  );

  if (results.length === 0) {
    console.log(`No results found for test ID: ${testId}`);
    return null;
  }

  // Determine the overall maximum available marks for this test.
  // This handles cases where different entries for the same test might have different `availableMarks`
  const overallTestMarksAvailable = Math.max(
    ...results.map((result) => result.availableMarks)
  );

  // Handle the edge case where available marks are zero.
  // This could indicate data issues
  if (overallTestMarksAvailable === 0 && results.length > 0) {
    console.warn(
      `Test ID ${testId} has zero marks available, but results exist. ` +
        `This might indicate data integrity issues or a non-scorable test. ` +
        `All percentage-based statistics will be 0.`
    );
    // Return zero for all stats if marks available is zero.
    return {
      mean: 0,
      stddev: 0,
      min: 0,
      max: 0,
      p25: 0,
      p50: 0,
      p75: 0,
      count: results.length,
    };
  }

  // Convert obtained marks to percentage scores.
  // These scores are then sorted again to ensure correct percentile calculation.
  const percentageScores = results
    .map((result) => (result.obtainedMarks / overallTestMarksAvailable) * 100)
    .sort((a, b) => a - b);

  const count = results.length;
  const mean = parseFloat(calculateMean(percentageScores).toFixed(1));
  const stddev = parseFloat(calculateStdDev(percentageScores, mean).toFixed(1));
  const min = parseFloat(calculateMin(percentageScores).toFixed(1));
  const max = parseFloat(calculateMax(percentageScores).toFixed(1));
  const p25 = parseFloat(calculatePercentile(percentageScores, 25).toFixed(1));
  const p50 = parseFloat(calculatePercentile(percentageScores, 50).toFixed(1));
  const p75 = parseFloat(calculatePercentile(percentageScores, 75).toFixed(1));

  return {
    mean,
    stddev,
    min,
    max,
    p25,
    p50,
    p75,
    count,
  };
}
