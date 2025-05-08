import { Request, Response, NextFunction } from "express";

export const requireMarkrXmlContentType = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.is("text/xml+markr")) {
    next();
  } else {
    res
      .status(415)
      .send("Unsupported Media Type: Content-Type must be text/xml+markr");
  }
};
