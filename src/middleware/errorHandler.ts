import { ErrorRequestHandler } from "express";

/**
 * This is utilised to catch all next(errors). A better implementation of this would be a
 * global logger with specific errors thrown, caught and logged for each service/controller.
 * @param err - Error Object
 * @param req - Express Request Object
 * @param res - Express Response Object
 * @param next - Express next Middleware
 */
export const globalErrorHandler: ErrorRequestHandler = (
  err,
  req,
  res,
  next
) => {
  console.error(err.stack || err);
  res.status(500).send({ error: "Internal Server Error" });
};
