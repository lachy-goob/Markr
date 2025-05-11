import { Request, Response, NextFunction, RequestHandler } from "express";
import { calculateAggregateResults } from "../services/testResult.service";

/**
 * Express request handler for aggregating test results.
 * It expects a `testId` as a URL parameter.
 * It calls the `calculateAggregateResults` service function and responds with
 * the aggregated data or an appropriate error status.
 *
 * @param req - The Express request object, containing `testId` in `req.params`.
 * @param res - The Express response object.
 * @param next - The Express next middleware function, used for error handling.
 */
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
