import { AppDataSource } from "./data-source";
import express from "express";
import cors from "cors";

AppDataSource.initialize()
  .then(async () => {
    console.log("Data Source has been initialized!");
    const app = express();
    app.use(express.json());
    app.use(cors());

    app.get("/", (req, res) => {
      res.json({ message: "Hello World!" });
    });

    app.listen(3306, () => {
      console.log("Server is running on Port 3306");
    });
  })
  .catch((error) => {
    console.error("Error during Data Source initialization", error);
    process.exit(1);
  });
