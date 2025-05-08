import { ErrorRequestHandler } from "express";

export const globalErrorHandler: ErrorRequestHandler = (
  err,
  req,
  res,
  next
) => {
  console.error(err.stack || err);
  res.status(500).send({ error: "Internal Server Error" });
};
