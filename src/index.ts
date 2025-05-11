import { AppDataSource } from "./data-source";
//import { aggregateResultsController } from "./controllers/results.controller";
import express from "express";
import { globalErrorHandler } from "./middleware/errorHandler";

AppDataSource.initialize()
  .then(async () => {
    console.log("Data Source has been initialized!");
    const app = express();
    app.use(express.json());

    app.get("/", (req, res) => {
      res.json({ message: "Hello World!" });
    });

    //app.post("/import", postResultsController); //Not implemented yet.
    //app.get("/results/:testId/aggregate", aggregateResultsController); //Not implemented yet

    app.use(globalErrorHandler);

    app.listen(4567, () => {
      console.log("Server is running on Port 4567");
    });
  })
  .catch((error) => {
    console.error("Error during Data Source initialization", error);
    process.exit(1);
  });
