import "reflect-metadata";
import { DataSource } from "typeorm";
import { StudentTestResult } from "./entity/StudentTestResult";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT || "5432", 10),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: process.env.NODE_ENV === "development",
  logging:
    process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  entities: [StudentTestResult],
  migrations: [],
  subscribers: [],
});
