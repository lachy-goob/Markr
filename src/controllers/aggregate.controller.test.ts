import request from "supertest";
import express, { Express, Request, Response, NextFunction } from "express";
import { aggregateResultsController } from "../controllers/aggregate.controller";
import * as testResultService from "../services/testResult.service";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock the service
vi.mock("../services/testResult.service");

//Creating a minimal express App to test.

const app: Express = express();
app.use(express.json());
app.get("/results/:testId/aggregate", aggregateResultsController);

//Mock Implementation of GlobalErrorHandler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({ message: "Internal Server Error from test" });
});

describe("GET /results/:testId/aggregate", () => {
  afterEach(() => {
    vi.resetAllMocks(); // Clear mocks after each test
  });

  //The normal route is results/:testId/aggregate
  //If no testId is shown, we want ERR 404.
  it("should return 404 if testId is missing", async () => {
    const response = await request(app).get("/results//aggregate");
    expect(response.status).toBe(404);
  });

  //If valid, return a valid response
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

  //If no tests are found with a valid testId, return 404.
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
});
