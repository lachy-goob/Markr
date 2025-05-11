import { XMLParser } from "fast-xml-parser";
import { EntityManager } from "typeorm";
import { AppDataSource } from "../data-source";
import { StudentTestResult } from "../entity/StudentTestResult";

interface ProcessedResultFromXml {
  firstName: string;
  lastName: string;
  studentNumber: string;
  testId: string;
  scannedOn: Date;
  availableMarks: number;
  obtainedMarks: number;
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

      const availableMarks = parseInt(summaryMarksData["@available"], 10);
      const obtainedMarks = parseInt(summaryMarksData["@obtained"], 10);

      if (isNaN(availableMarks) || isNaN(obtainedMarks)) {
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
        availableMarks,
        obtainedMarks,
      });
    }

    if (processedRecords.length === 0) {
      console.log("No valid records found in XML after validation.");
      return 0;
    }

    let createdCount = 0;
    let updatedCount = 0;

    await AppDataSource.manager.transaction(async (manager: EntityManager) => {
      for (const record of processedRecords) {
        const existingResult = await manager.findOne(StudentTestResult, {
          where: {
            studentNumber: record.studentNumber,
            testId: record.testId,
          },
        });

        if (existingResult) {
          if (record.obtainedMarks > existingResult.obtainedMarks) {
            existingResult.firstName = record.firstName;
            existingResult.lastName = record.lastName;
            existingResult.scannedOn = record.scannedOn;
            existingResult.availableMarks = record.availableMarks;
            existingResult.obtainedMarks = record.obtainedMarks;

            await manager.save(existingResult);
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

          await manager.save(newResult);
          createdCount++;
        }
      }
    });

    console.log(
      `Imported Test Results - Created: ${createdCount}, Updated: ${updatedCount}`
    );
    return createdCount + updatedCount;
  } catch (err) {
    console.error("Error importing test results:", err);
    throw new Error(
      `Failed to import and ingest test results: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}
