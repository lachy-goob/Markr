import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest";
import { Request, Response, NextFunction } from "express";
import { StudentTestResult } from "../entity/StudentTestResult";
import express from "express";
import request from "supertest";
import { importResultsController } from "./importResults.controller";
import { globalErrorHandler } from "../middleware/errorHandler";
import { AppDataSource } from "../data-source";
import { EntityManager } from "typeorm";

const app = express();
app.use(express.text({ type: "text/xml+markr" }));
app.post("/import", importResultsController);
app.use(globalErrorHandler);

describe("Import Results E2E Tests", () => {
  const testTransactionManager: EntityManager = AppDataSource.manager;

  beforeAll(async () => {
    await AppDataSource.initialize();
  });

  afterEach(async () => {
    await testTransactionManager.delete(StudentTestResult, {});
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  it("should successfully import valid XML data", async () => {
    const validXml = `
    <?xml version="1.0" encoding="UTF-8" ?>
    <mcq-test-results>
        <mcq-test-result scanned-on="2017-12-04T12:12:10+11:00">
            <first-name>KJ</first-name>
            <last-name>Alysander</last-name>
            <student-number>002299</student-number>
            <test-id>9863</test-id>
            <answer question="0" marks-available="1" marks-awarded="1">D</answer>
            <answer question="1" marks-available="1" marks-awarded="1">D</answer>
            <answer question="2" marks-available="1" marks-awarded="1">D</answer>
            <answer question="3" marks-available="1" marks-awarded="0">C</answer>
            <answer question="4" marks-available="1" marks-awarded="1">B</answer>
            <answer question="5" marks-available="1" marks-awarded="0">D</answer>
            <answer question="6" marks-available="1" marks-awarded="0">A</answer>
            <answer question="7" marks-available="1" marks-awarded="1">A</answer>
            <answer question="8" marks-available="1" marks-awarded="1">B</answer>
            <answer question="9" marks-available="1" marks-awarded="1">D</answer>
            <answer question="10" marks-available="1" marks-awarded="1">A</answer>
            <answer question="11" marks-available="1" marks-awarded="1">B</answer>
            <answer question="12" marks-available="1" marks-awarded="0">A</answer>
            <answer question="13" marks-available="1" marks-awarded="0">B</answer>
            <answer question="14" marks-available="1" marks-awarded="1">B</answer>
            <answer question="15" marks-available="1" marks-awarded="1">A</answer>
            <answer question="16" marks-available="1" marks-awarded="1">C</answer>
            <answer question="17" marks-available="1" marks-awarded="0">B</answer>
            <answer question="18" marks-available="1" marks-awarded="1">A</answer>
            <answer question="19" marks-available="1" marks-awarded="0">B</answer>
            <summary-marks available="20" obtained="13" />
        </mcq-test-result>
    </mcq-test-results>
        `;

    const response = await request(app)
      .post("/import")
      .set("Content-Type", "text/xml+markr")
      .send(validXml);

    expect(response.status).toBe(200);
    expect(response.text).toBe("Successfully processed 1 results");
  });

  it("should successfully import valid XML data", async () => {
    const validXml = `
    <?xml version="1.0" encoding="UTF-8" ?>
    <mcq-test-results>
        <mcq-test-result scanned-on="2017-12-04T12:12:10+11:00">
            <first-name>KJ</first-name>
            <last-name>Alysander</last-name>
            <student-number>002299</student-number>
            <test-id>9863</test-id>
            <answer question="0" marks-available="1" marks-awarded="1">D</answer>
            <answer question="1" marks-available="1" marks-awarded="1">D</answer>
            <answer question="2" marks-available="1" marks-awarded="1">D</answer>
            <answer question="3" marks-available="1" marks-awarded="0">C</answer>
            <answer question="4" marks-available="1" marks-awarded="1">B</answer>
            <answer question="5" marks-available="1" marks-awarded="0">D</answer>
            <answer question="6" marks-available="1" marks-awarded="0">A</answer>
            <answer question="7" marks-available="1" marks-awarded="1">A</answer>
            <answer question="8" marks-available="1" marks-awarded="1">B</answer>
            <answer question="9" marks-available="1" marks-awarded="1">D</answer>
            <answer question="10" marks-available="1" marks-awarded="1">A</answer>
            <answer question="11" marks-available="1" marks-awarded="1">B</answer>
            <answer question="12" marks-available="1" marks-awarded="0">A</answer>
            <answer question="13" marks-available="1" marks-awarded="0">B</answer>
            <answer question="14" marks-available="1" marks-awarded="1">B</answer>
            <answer question="15" marks-available="1" marks-awarded="1">A</answer>
            <answer question="16" marks-available="1" marks-awarded="1">C</answer>
            <answer question="17" marks-available="1" marks-awarded="0">B</answer>
            <answer question="18" marks-available="1" marks-awarded="1">A</answer>
            <answer question="19" marks-available="1" marks-awarded="0">B</answer>
            <summary-marks available="20" obtained="13" />
        <this is totally meant to be here />
        <this is also meant to be here />
        <how about this>
            <yeah totally />
        </how about this>
        </mcq-test-result>
    </mcq-test-results>
        `;

    const response = await request(app)
      .post("/import")
      .set("Content-Type", "text/xml+markr")
      .send(validXml);

    expect(response.status).toBe(200);
    expect(response.text).toBe("Successfully processed 1 results");
  });

  it("should return an error for invalid XML content type", async () => {
    const response = await request(app)
      .post("/import")
      .set("Content-Type", "application/json")
      .send({ key: "value" });

    expect(response.status).toBe(415);
    expect(response.body.message).toBe(
      "Unsupported Media Type. Expected text/xml+markr"
    );
  });

  it("should return an error for empty request body", async () => {
    const response = await request(app)
      .post("/import")
      .set("Content-Type", "text/xml+markr")
      .send("");

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Request Body is Empty!");
  });
});
