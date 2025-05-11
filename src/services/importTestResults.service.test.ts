import { describe, it, expect } from "vitest";
import { importAndIngestXmlResults } from "../services/importTestResults.service";

// Test suite for the importAndIngestXmlResults service function.
describe("importAndIngestXmlResults", () => {
  // Test case for malformed XML input.
  it("should throw an error for completely unparseable XML input (e.g., broken tags)", async () => {
    const malformedXml =
      "<mcq-test-results><mcq-test-result>...this is not closed";
    // The actual fast-xml-parser will throw an error for malformed XML.

    await expect(importAndIngestXmlResults(malformedXml)).rejects.toThrow(
      /^Failed to import and ingest test results:/ // Check if the error message starts with the expected prefix.
    );
  });

  // Test case for XML missing the root application tag.
  it('should throw "No test results found" for XML missing the "mcq-test-results" root tag', async () => {
    const xmlMissingRootApplicationTag =
      "<other-data><value>123</value></other-data>";
    // This XML is valid in structure, but doesn't contain the expected 'mcq-test-results' structure.
    await expect(
      importAndIngestXmlResults(xmlMissingRootApplicationTag)
    ).rejects.toThrow(
      // Expect a specific error message.
      "Failed to import and ingest test results: No test results found"
    );
  });

  // Test case for XML missing an essential data field.
  it('should throw "Missing required fields" for XML missing an essential data field (e.g., student-number)', async () => {
    const xmlMissingStudentNumber = `
<mcq-test-results>
    <mcq-test-result scanned-on="2023-01-15T10:30:00Z">
        <first-name>John</first-name>
        <last-name>Doe</last-name>
        <test-id>T101</test-id>
        <summary-marks available="100" obtained="85" />
    </mcq-test-result>
</mcq-test-results>`;

    // The service's internal validation logic should catch this missing field.
    await expect(
      importAndIngestXmlResults(xmlMissingStudentNumber)
    ).rejects.toThrow(
      "Failed to import and ingest test results: Missing required fields in XML record"
    );
  });

  // Test case for XML with non-integer marks.
  it('should throw "Invalid marks" for XML with non-integer marks', async () => {
    const xmlNonIntegerMarks = `
<mcq-test-results>
    <mcq-test-result scanned-on="2023-01-15T10:30:00Z">
        <first-name>Jane</first-name>
        <last-name>Doe</last-name>
        <student-number>S002</student-number>
        <test-id>T102</test-id>
        <summary-marks available="100" obtained="eighty-five" /> 
    </mcq-test-result>
</mcq-test-results>`;
    // 'parseInt("eighty-five", 10)' results in NaN, which should be caught.
    await expect(importAndIngestXmlResults(xmlNonIntegerMarks)).rejects.toThrow(
      "Failed to import and ingest test results: Invalid marks in XML data for student: S002, test: T102. Available='100', Obtained='eighty-five'."
    );
  });

  // Test case for an empty XML string input.
  it("should throw an error for an empty string XML input", async () => {
    const emptyXmlString = "";
    // The fast-xml-parser typically throws an error for empty input.
    // The service should catch and re-throw this
    await expect(importAndIngestXmlResults(emptyXmlString)).rejects.toThrow(
      /^Failed to import and ingest test results:/
    );
  });

  // Test case for XML with an invalid date format.
  it('should throw "Invalid date format" for XML with an invalid date for scanned-on', async () => {
    const xmlInvalidDate = `
<mcq-test-results>
    <mcq-test-result scanned-on="not-a-date">
        <first-name>Test</first-name>
        <last-name>User</last-name>
        <student-number>S003</student-number>
        <test-id>T103</test-id>
        <summary-marks available="50" obtained="25" />
    </mcq-test-result>
</mcq-test-results>`;
    await expect(importAndIngestXmlResults(xmlInvalidDate)).rejects.toThrow(
      "Failed to import and ingest test results: Invalid date format for @scanned-on: 'not-a-date' (Student: S003, Test: T103)"
    );
  });

  // Test case for XML that is valid but contains no actual <mcq-test-result> entries.
  it('should throw "No results found in test" for XML with "mcq-test-results" but no "mcq-test-result" children', async () => {
    const xmlNoChildResults = `
<mcq-test-results>
</mcq-test-results>`;
    // This structure is valid XML but lacks the data items.
    await expect(importAndIngestXmlResults(xmlNoChildResults)).rejects.toThrow(
      "Failed to import and ingest test results: No test results found"
    );
  });
});
