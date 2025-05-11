// aggregate.controller.test.ts
import request from "supertest";
import express, { Express, Request, Response, NextFunction } from "express";
import { aggregateResultsController } from "../controllers/aggregate.controller";
import * as testResultService from "../services/testResult.service"; // To mock the service
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock the service
vi.mock("../services/testResult.service");

const app: Express = express();
app.use(express.json());
app.get("/results/:testId/aggregate", aggregateResultsController);
// Add a mock error handler for testing 'next(error)'
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("TEST APP ERROR HANDLER TRIGGERED:", err.message);
  res.status(500).json({ message: "Internal Server Error from test" });
});

describe("GET /results/:testId/aggregate", () => {
  afterEach(() => {
    vi.resetAllMocks(); // Clear mocks after each test
  });

  it("should return 404 if testId is missing", async () => {
    const response = await request(app).get("/results//aggregate");
    expect(response.status).toBe(404);
  });

  it("should return 200 and aggregate results if found", async () => {
    const mockAggregatedResults = {
      mean: 80,
      stddev: 5,
      min: 70,
      max: 90,
      p25: 75,
      p50: 80,
      p75: 85,
      count: 10,
    };
    vi.spyOn(testResultService, "calculateAggregateResults").mockResolvedValue(
      mockAggregatedResults
    );

    const response = await request(app).get("/results/test123/aggregate");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockAggregatedResults);
    expect(testResultService.calculateAggregateResults).toHaveBeenCalledWith(
      "test123"
    );
  });

  it("should return 404 if no results are found for testId", async () => {
    vi.spyOn(testResultService, "calculateAggregateResults").mockResolvedValue(
      null
    );

    const response = await request(app).get("/results/unknownTestId/aggregate");

    expect(response.status).toBe(404);
    expect(response.body.message).toBe(
      "No results found for test ID: unknownTestId"
    );
    expect(testResultService.calculateAggregateResults).toHaveBeenCalledWith(
      "unknownTestId"
    );
  });

  it("should call next with the error if service throws an error", async () => {
    const errorMessage = "Service failure";
    vi.spyOn(testResultService, "calculateAggregateResults").mockRejectedValue(
      new Error(errorMessage)
    );
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const response = await request(app).get("/results/errorTest/aggregate");

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Internal Server Error from test");
    expect(testResultService.calculateAggregateResults).toHaveBeenCalledWith(
      "errorTest"
    );
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
