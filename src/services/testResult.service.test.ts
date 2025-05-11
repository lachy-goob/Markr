import { calculateAggregateResults } from "./testResult.service";
import * as studentTestResultRepository from "../repository/studentTestResult.repository";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  MockInstance,
  vi,
} from "vitest";

//Test suite for teh calculateAggregateResults service function
describe("calculateAggregateResults", () => {
  //Declare a variable to hold the mock instance of findAllByTestId
  let mockFindAllByTestId: MockInstance;

  //Setup and Spy on Mock the Mock Repository Function
  beforeEach(() => {
    mockFindAllByTestId = vi.spyOn(
      studentTestResultRepository,
      "findAllByTestIdSorted"
    );
  });

  //Cleanup: Restore all mocked functions.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return null if no results are found", async () => {
    mockFindAllByTestId.mockResolvedValueOnce([]);
    const result = await calculateAggregateResults("testId");
    expect(result).toBeNull();
  });

  it("should calculate aggregate results correctly", async () => {
    mockFindAllByTestId.mockResolvedValue([
      { obtainedMarks: 8, availableMarks: 10 },
      { obtainedMarks: 9, availableMarks: 10 },
      { obtainedMarks: 7, availableMarks: 10 },
    ]);

    const results = await calculateAggregateResults("test");

    //Note: All these are in percentages
    expect(results).toEqual({
      mean: 80,
      stddev: 8.2,
      min: 70,
      max: 90,
      p25: 75,
      p50: 80,
      p75: 85,
      count: 3,
    });
  });

  it("should handle the case where overallTestMarksAvailable is 0", async () => {
    mockFindAllByTestId.mockResolvedValue([
      { obtainedMarks: 0, availableMarks: 0 },
      { obtainedMarks: 0, availableMarks: 0 },
    ]);

    const result = await calculateAggregateResults("test");
    expect(result).toEqual({
      mean: 0,
      stddev: 0,
      min: 0,
      max: 0,
      p25: 0,
      p50: 0,
      p75: 0,
      count: 2,
    });
  });
});
