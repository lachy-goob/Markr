import { XMLParser } from "fast-xml-parser";
import { EntityManager } from "typeorm";
import { AppDataSource } from "../data-source";
import { StudentTestResult } from "../entity/StudentTestResult";
import {
  findExistingByStudentTestPairs,
  saveResults,
  StudentTestKeyPair,
} from "../repository/studentTestResult.repository";

/**
 * Defines the structure of a processed test result from XML
 */
interface ProcessedResultFromXml {
  firstName: string;
  lastName: string;
  studentNumber: string;
  testId: string;
  scannedOn: Date;
  availableMarks: number;
  obtainedMarks: number;
}

/**
 * Defines the Structure of the Expected TestResult within Test Results
 * Uses '@' prefix for attributes as per fast-xml-parser configuration.
 */
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
  // Other elements like 'answer' are ignored through parser options.
}

/**
 * Interface defining the root structure of the test results XML.
 */
interface TestResultsXML {
  "mcq-test-results": {
    "mcq-test-result": TestResultXML | TestResultXML[]; //Could be object or array
  };
}

// Configure the XML parser.
const parser = new XMLParser({
  ignoreAttributes: false, // Process attributes.
  attributeNamePrefix: "@", // Prefix attributes with "@".
  parseTagValue: false, // Do not attempt to parse tag values to boolean/numbers automatically.
  parseAttributeValue: false, // Do not attempt to parse attribute values automatically.
  trimValues: true, // Trim whitespace from values.
  stopNodes: ["*.answer"], //Ignores answer tags (and their potential children) as they're not used.
});

/**
 * Parses XML data, validates it, and ingests student test results into the database.
 * If a result for a specific student and test already exists, it's updated only if
 * the new `obtainedMarks` value is higher than the existing one.
 * All database operations are performed within a single transaction to ensure atomicity.
 *
 * @param xmlData - The raw XML string containing the test results.
 * @returns A Promise that resolves to the number of results successfully created or updated.
 * @throws An error if parsing fails, required fields are missing, data is invalid,
 * or if any other issue occurs during processing.
 */
export async function importAndIngestXmlResults(
  xmlData: string
): Promise<number> {
  try {
    // Attempt to parse the XML data.
    const parsedXml = parser.parse(xmlData) as TestResultsXML;

    // Extract the test results. This can be undefined, a single object, or an array.
    const mcqTestResultsFromXml =
      parsedXml["mcq-test-results"]?.["mcq-test-result"];

    // Handle cases where no test results are found in the expected structure.
    if (!mcqTestResultsFromXml) {
      console.log("No 'mcq-test-result' entries found in XML.");
      throw new Error("No test results found");
    }

    // Ensure resultsFromXmlArray is always an array for consistent processing.
    const resultsFromXmlArray = Array.isArray(mcqTestResultsFromXml)
      ? mcqTestResultsFromXml
      : [mcqTestResultsFromXml];

    if (resultsFromXmlArray.length === 0) {
      console.log("XML results array is empty after parsing.");
      throw new Error("No results found in test"); // More specific error than "No test results found"
    }

    const processedRecords: ProcessedResultFromXml[] = [];
    // Iterate over each XML record, validate and transform it.
    for (const xmlRecord of resultsFromXmlArray) {
      // Basic validation for the presence of essential fields.
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
        summaryMarksData["@available"] === undefined || // Check for undefined explicitly
        summaryMarksData["@obtained"] === undefined
      ) {
        // Log details for easier debugging of problematic records.
        console.error("Missing required fields in XML record:", xmlRecord);
        throw new Error("Missing required fields in XML record");
      }

      // Validate and parse date.
      const scannedOn = new Date(scannedOnString);
      if (isNaN(scannedOn.getTime())) {
        throw new Error(
          `Invalid date format for @scanned-on: '${scannedOnString}' (Student: ${studentNumber}, Test: ${testId})`
        );
      }

      // Validate and parse marks.
      const availableMarks = parseInt(summaryMarksData["@available"], 10);
      const obtainedMarks = parseInt(summaryMarksData["@obtained"], 10);

      if (isNaN(availableMarks) || isNaN(obtainedMarks)) {
        throw new Error(
          `Invalid marks in XML data for student: ${studentNumber}, test: ${testId}. Available='${summaryMarksData["@available"]}', Obtained='${summaryMarksData["@obtained"]}'.`
        );
      }

      // Add successfully processed record to the list.
      processedRecords.push({
        firstName,
        lastName,
        studentNumber,
        testId,
        scannedOn,
        availableMarks,
        obtainedMarks,
      });
    }

    const uniqueProcessedRecordsMap = new Map<string, ProcessedResultFromXml>();
    for (const record of processedRecords) {
      const key = `${record.studentNumber}-${record.testId}`;
      const existingRecordInMap = uniqueProcessedRecordsMap.get(key);

      if (existingRecordInMap) {
        if (record.obtainedMarks > existingRecordInMap.obtainedMarks) {
          uniqueProcessedRecordsMap.set(key, record);
        } else if (
          record.obtainedMarks === existingRecordInMap.obtainedMarks &&
          record.availableMarks > existingRecordInMap.availableMarks
        ) {
          uniqueProcessedRecordsMap.set(key, record);
        }
      } else {
        uniqueProcessedRecordsMap.set(key, record);
      }
    }

    const finalProcessedRecords = Array.from(
      uniqueProcessedRecordsMap.values()
    );

    // If, after processing, no valid records were found (e.g., all had errors).
    if (finalProcessedRecords.length === 0) {
      throw new Error(`No valid records found in XML after validation`);
    }

    let createdCount = 0;
    let updatedCount = 0;
    const recordsToSave: StudentTestResult[] = [];

    // Perform database operations within a transaction.
    await AppDataSource.manager.transaction(async (manager: EntityManager) => {
      const recordKeys: StudentTestKeyPair[] = finalProcessedRecords.map(
        (pr) => ({
          studentNumber: pr.studentNumber,
          testId: pr.testId,
        })
      );

      const existingResultsArray = await findExistingByStudentTestPairs(
        manager,
        recordKeys
      );

      const existingResultsMap = new Map<string, StudentTestResult>();
      existingResultsArray.forEach((er) => {
        existingResultsMap.set(`${er.studentNumber}-${er.testId}`, er);
      });

      for (const record of finalProcessedRecords) {
        const mapKey = `${record.studentNumber}-${record.testId}`;
        const existingResult = existingResultsMap.get(mapKey);

        if (existingResult) {
          if (
            record.obtainedMarks > existingResult.obtainedMarks ||
            record.availableMarks > existingResult.availableMarks
          ) {
            existingResult.studentNumber = record.studentNumber;
            existingResult.testId = record.testId;
            existingResult.firstName = record.firstName;
            existingResult.lastName = record.lastName;
            existingResult.scannedOn = record.scannedOn;
            existingResult.availableMarks = record.availableMarks;
            existingResult.obtainedMarks = record.obtainedMarks;
            updatedCount++;
          }
        } else {
          const newResult = manager.create(StudentTestResult, {
            studentNumber: record.studentNumber,
            testId: record.testId,
            firstName: record.firstName,
            lastName: record.lastName,
            scannedOn: record.scannedOn,
            availableMarks: record.availableMarks,
            obtainedMarks: record.obtainedMarks,
          });

          recordsToSave.push(newResult);
          createdCount++;
        }
      }

      if (recordsToSave.length > 0) {
        await saveResults(manager, recordsToSave);
      }
    });

    console.log(
      `Imported Test Results - Created: ${createdCount}, Updated: ${updatedCount}`
    );
    return createdCount + updatedCount; // Return the total number of records affected.
  } catch (err) {
    // Catch any error during the process, log it, and rethrow a more generic answer.
    console.error("Error during XML import and ingestion:", err);
    throw new Error(
      `Failed to import and ingest test results: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}
