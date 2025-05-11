import { Request, Response, NextFunction, RequestHandler } from "express";
import { calculateAggregateResults } from "../services/testResult.service";

export const aggregateResultsController: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { testId } = req.params;

  if (!testId) {
    res.status(404).json({ message: "Test ID is required" });
    return;
  }

  try {
    const aggregateResults = await calculateAggregateResults(testId as string); //Ensure testID IS String
    if (!aggregateResults) {
      res
        .status(404)
        .json({ message: `No results found for test ID: ${testId}` });
      return;
    }

    res.json(aggregateResults);
  } catch (error) {
    console.error("Error calculating aggregate results:", error);
    next(error);
  }
};
