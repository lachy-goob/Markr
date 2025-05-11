import { AppDataSource } from "../data-source";
import { StudentTestResult } from "../entity/StudentTestResult";
import { DeepPartial, EntityManager } from "typeorm";
import * as studentTestResultRepository from "../repository/studentTestResult.repository";
import {
  calculateMean,
  calculateStdDev,
  calculateMin,
  calculateMax,
  calculatePercentile,
} from "../utils/statistics";

export interface IngestResultData {
  studentNumber: string;
  testId: string;
  scannedOn: Date;
  firstName: string;
  lastName: string;
  marksAvailable: number;
  marksObtained: number;
}

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
 * Calculates aggregate statistics for student test results
 * @param testId - The ID of the test
 * @returns Promise<AggregatedTestResults | null> - The aggreagated tests or null if no results found
 */

export async function calculateAggregateResults(
  testId: string
): Promise<AggregatedTestResults | null> {
  const manager = AppDataSource.manager;
  const results = await studentTestResultRepository.findAllByTestIdSorted(
    manager,
    testId
  );
  if (results.length === 0) {
    console.log(`No results found for test ID: ${testId}`);
    return null;
  }

  const overallTestMarksAvailable = Math.max(
    ...results.map((result) => result.availableMarks)
  );

  if (overallTestMarksAvailable === 0 && results.length > 0) {
    console.warn(
      `Test ID ${testId} has zero marks available, but results exist. This might indicate data issues.\n Please check for data integrity`
    );

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

  const percentageScores = results
    .map((results) => (results.obtainedMarks / overallTestMarksAvailable) * 100)
    .sort((a, b) => a - b); //Doubly ensures that percentage scores are sorted for accurate percentiles

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
