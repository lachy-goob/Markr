import { AppDataSource } from "./data-source";
import { importResultsController } from "./controllers/importResults.controller";
import { aggregateResultsController } from "./controllers/aggregate.controller";
import express from "express";
import { globalErrorHandler } from "./middleware/errorHandler";

AppDataSource.initialize()
  .then(async () => {
    console.log("Data Source has been initialized!");
    const app = express();
    app.use(express.json());

    // Middleware to parse XML body
    // Limit of 100mb for XML data
    app.use(express.text({ type: "text/xml+markr", limit: "100mb" }));

    app.get("/", (req, res) => {
      res.json({ message: "Hello World!" });
    });

    app.post("/import", importResultsController);
    app.get("/results/:testId/aggregate", aggregateResultsController);

    app.use(globalErrorHandler);

    app.listen(4567, () => {
      console.log("Server is running on Port 4567");
    });
  })
  .catch((error) => {
    console.error("Error during Data Source initialization", error);
    process.exit(1);
  });
