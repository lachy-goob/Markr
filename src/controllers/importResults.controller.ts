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
        .json({ message: "Unsupported Media Type. Expected text/xml+markr" });
      return;
    }

    if (!req.body || req.body.length === 0) {
      res.status(400).json({ message: "Request Body is Empty!" });
      return;
    }

    const xmlData = req.body.toString();

    const importCount = await importAndIngestXmlResults(xmlData);

    res.status(200).send(`Successfully processed ${importCount} results`);
  } catch (error: unknown) {
    if (error instanceof Error && error.message) {
      if (error.message.startsWith("No results found in test")) {
        res.status(400).json({ message: "No results found in test" });
      } else if (error.message.startsWith("No test results found")) {
        res.status(400).json({ message: "No test results found" });
      } else if (
        error.message.startsWith("Missing required fields in XML record")
      ) {
        res
          .status(400)
          .json({ message: "Missing required fields in XML record" });
      } else if (
        error.message.startsWith(
          "No valid records found in XML after validation"
        )
      ) {
        res
          .status(400)
          .json({ message: "No valid records found in XML after validation" });
      }
    } else {
      next(error);
    }
  }
};
