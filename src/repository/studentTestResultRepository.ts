import { EntityManager, In, DeepPartial } from "typeorm";
import { StudentTestResult } from "../entity/StudentTestResult";

/**
 * Interface for the data used to create or update test results.
 */
export type StudentTestResultInputData = DeepPartial<StudentTestResult> & {
  studentNumber: string;
  testId: string;
  marksObtained: number;
  scannedOn: Date;
  firstName: string;
  lastName: string;
  marksAvailable: number;
};

/**
 * Finds existing StudentTestResult entities based on student numbers and test IDs
 * @param manager - TypeORM EntityManager
 * @param studentNumbers - Array of student numbers
 * @param testIds - Array of test IDs
 * @return Promise<StudentTestResult[]> - A list of student test results
 */

export async function findExistingByStudentNumbersAndTestIds(
  manager: EntityManager,
  studentNumbers: string[],
  testIds: string[]
): Promise<StudentTestResult[]> {
  if (studentNumbers.length === 0 || testIds.length === 0) {
    return [];
  }
  return manager.find(StudentTestResult, {
    where: {
      studentNumber: In(studentNumbers),
      testId: In(testIds),
    },
  });
}

/**
 * Retrieves all student test results for a given test ID, ordered by marks obtained
 * @param manager - TypeORM EntityManager
 * @param testId - The ID of the test
 * @returns Promise<StudentTestResult[]> - A list of student test results
 */

export async function findAllByTestIdSorted(
  manager: EntityManager,
  testId: string
): Promise<StudentTestResult[]> {
  return manager.find(StudentTestResult, {
    where: { testId },
    order: { marksObtained: "ASC" },
  });
}

/**
 * Saves multiple StudentTestResult entities to the database
 * @param manager - TypeORM EntityManager
 * @param results - Array of StudentTestResultInputData entities to save
 * @returns Promise<StudentTestResult[]> - The saved student test results
 */

export async function saveResults(
  manager: EntityManager,
  results: StudentTestResult[] // Expects full entity instances
): Promise<StudentTestResult[]> {
  if (results.length === 0) {
    return [];
  }
  return manager.save(StudentTestResult, results);
}

/**
 * Creates a StudentTestResult entity
 * @param manager - TypeORM EntityManager
 * @param data - Data for new Entity
 * @returns Promise<StudentTestResult> - The created student test result
 */
export function createResultEntity(
  manager: EntityManager,
  data: DeepPartial<StudentTestResultInputData>
): StudentTestResult {
  return manager.create(StudentTestResult, data);
}
