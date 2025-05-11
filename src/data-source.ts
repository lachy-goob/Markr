import "reflect-metadata";
import { DataSource } from "typeorm";
import { StudentTestResult } from "./entity/StudentTestResult";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST || "db",
  port: parseInt(process.env.DATABASE_PORT || "5432", 10),
  username: process.env.POSTGRES_USER || "markr_user",
  password: process.env.POSTGRES_PASSWORD || "markr_password",
  database: process.env.POSTGRES_DB || "markr_db",
  synchronize:
    process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test",
  logging:
    process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  entities: [StudentTestResult],
  migrations: [],
  subscribers: [],
});
