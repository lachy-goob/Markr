import { NextFunction, Request, RequestHandler, Response } from "express";
import { importAndIngestXmlResults } from "../services/importTestResults.service";

export const importResultsController: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.headers["content-type"] !== "text/xml+markr") {
      res
        .status(415)
        .json({ message: "Unsupported Media Type. Expected text/xml+marker " });
      return;
    }

    if (!req.body || req.body.length === 0) {
      res.status(400).json({ message: "Request Body is Empty!" });
      return;
    }

    const xmlData = req.body.toString();

    const importCount = await importAndIngestXmlResults(xmlData);

    res.status(202).send(`Successfully processed ${importCount} results`);
    return;
  } catch (error) {
    console.error("Error importing test results:", error);
    next(error);
    return;
  }
};
