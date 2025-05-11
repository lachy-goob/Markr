import { XMLParser } from "fast-xml-parser";
import { DeepPartial, EntityManager } from "typeorm";
import { AppDataSource } from "../data-source";
import { StudentTestResult } from "../entity/StudentTestResult";
import * as studentTestResultRepository from "../repository/studentTestResult.repository";
interface ProcessedResultFromXml {
  firstName: string;
  lastName: string;
  studentNumber: string;
  testId: string;
  scannedOn: Date;
  marksAvailable: number;
  marksObtained: number;
}

interface TestResultXML {
  "@scanned-on": string;
  "first-name": string;
  "last-name": string;
  "student-number": string;
  "test-id": string;
  "summary-marks": {
    "@available": string;
    "@obtained": string;
  };
}
interface TestResultsXML {
  "mcq-test-results": {
    "mcq-test-result": TestResultXML | TestResultXML[];
  };
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  stopNodes: ["*.answer"],
});

/**
 * Parses XML data, validates it, and ingests student test results.
 * If a result already exists in the database, it's updated only if the new marksObtained is higher.
 * This operation is performed in a transaction.
 * @param xmlData - The raw XML string containing test results.
 * @returns Promise<number> - The number of results created or updated.
 */
export async function importAndIngestXmlResults(
  xmlData: string
): Promise<number> {
  try {
    const parsedXml = parser.parse(xmlData) as TestResultsXML;
    const mcqTestResultsFromXml =
      parsedXml["mcq-test-results"]?.["mcq-test-result"];

    if (!mcqTestResultsFromXml) {
      console.log("No 'mcq-test-result' entries found in XML.");
      return 0;
    }

    const resultsFromXmlArray = Array.isArray(mcqTestResultsFromXml)
      ? mcqTestResultsFromXml
      : [mcqTestResultsFromXml];

    if (resultsFromXmlArray.length === 0) {
      console.log("XML results array is empty after parsing.");
      return 0;
    }

    const processedRecords: ProcessedResultFromXml[] = [];
    for (const xmlRecord of resultsFromXmlArray) {
      const firstName = xmlRecord["first-name"];
      const lastName = xmlRecord["last-name"];
      const studentNumber = xmlRecord["student-number"];
      const testId = xmlRecord["test-id"];
      const scannedOnString = xmlRecord["@scanned-on"];
      const summaryMarksData = xmlRecord["summary-marks"];

      if (
        !firstName ||
        !lastName ||
        !studentNumber ||
        !testId ||
        !scannedOnString ||
        !summaryMarksData ||
        summaryMarksData["@available"] === undefined ||
        summaryMarksData["@obtained"] === undefined
      ) {
        throw new Error(
          `Missing required fields in XML record for student: ${
            studentNumber || "N/A"
          }, test: ${testId || "N/A"}.`
        );
      }

      const scannedOn = new Date(scannedOnString);
      if (isNaN(scannedOn.getTime())) {
        throw new Error(
          `Invalid date format for @scanned-on: '${scannedOnString}' (Student: ${studentNumber}, Test: ${testId})`
        );
      }

      const marksAvailable = parseInt(summaryMarksData["@available"], 10);
      const marksObtained = parseInt(summaryMarksData["@obtained"], 10);

      if (isNaN(marksAvailable) || isNaN(marksObtained)) {
        throw new Error(
          `Invalid marks in XML data for student: ${studentNumber}, test: ${testId}. Available='${summaryMarksData["@available"]}', Obtained='${summaryMarksData["@obtained"]}'.`
        );
      }

      processedRecords.push({
        firstName,
        lastName,
        studentNumber,
        testId,
        scannedOn,
        marksAvailable,
        marksObtained,
      });
    }

    if (processedRecords.length === 0) {
      console.log("No valid records found in XML after validation.");
      return 0;
    }

    // 3. Database Ingestion Logic
    return await AppDataSource.transaction(async (manager: EntityManager) => {
      const studentNumbersToFetch = [
        ...new Set(processedRecords.map((record) => record.studentNumber)),
      ];
      const testIdsToFetch = [
        ...new Set(processedRecords.map((record) => record.testId)),
      ];

      const existingDbResults =
        await studentTestResultRepository.findExistingByStudentNumbersAndTestIds(
          manager,
          studentNumbersToFetch,
          testIdsToFetch
        );

      const existingResultsMap = new Map<string, StudentTestResult>();
      for (const dbResult of existingDbResults) {
        const key = `${dbResult.studentNumber}-${dbResult.testId}`;
        existingResultsMap.set(key, dbResult);
      }

      const entitiesToSave: StudentTestResult[] = [];

      for (const processedRecord of processedRecords) {
        const mapKey = `${processedRecord.studentNumber}-${processedRecord.testId}`;
        const existingEntity = existingResultsMap.get(mapKey);

        if (existingEntity) {
          // Record exists, check if update is needed
          if (processedRecord.marksObtained > existingEntity.obtainedMarks) {
            // Update existing entity instance directly
            existingEntity.scannedOn = processedRecord.scannedOn;
            existingEntity.availableMarks = processedRecord.marksAvailable;
            existingEntity.obtainedMarks = processedRecord.marksObtained;
            existingEntity.firstName = processedRecord.firstName;
            existingEntity.lastName = processedRecord.lastName;
            // Add other fields if they should be updated from ProcessedResultFromXml
            entitiesToSave.push(existingEntity);
          }
        } else {
          // Record is new, create a new entity
          const newResultEntity =
            studentTestResultRepository.createResultEntity(
              manager,
              processedRecord as DeepPartial<StudentTestResult> // Ensure ProcessedResultFromXml aligns with what createResultEntity expects
            );
          entitiesToSave.push(newResultEntity);
        }
      }

      if (entitiesToSave.length > 0) {
        // Assuming saveResults handles both new and updated (managed) entities
        await studentTestResultRepository.saveResults(manager, entitiesToSave);
        console.log(
          `Saved/Updated ${entitiesToSave.length} student test results to the database.`
        );
        return entitiesToSave.length; // Return the count of affected records
      } else {
        console.log(
          "No new or updated results to save based on the provided XML."
        );
        return 0;
      }
    });
  } catch (error) {
    console.error("Error during XML import and ingestion:", error);
    const message = error instanceof Error ? error.message : String(error);
    // This error will be caught by your controller's try/catch and passed to next(error)
    throw new Error("Failed to import and ingest test results: " + message);
  }
}
